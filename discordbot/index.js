'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, Events, PermissionFlagsBits, Collection } = require('discord.js');
const Groq = require('groq-sdk');

// --- Initialization ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const conversationHistory = new Map();

if (!process.env.GROQ_API_KEY) {
    console.error('[FATAL] Missing GROQ_API_KEY in .env');
    process.exit(1);
}

// --- Helper: URL Shortener ---
async function shortenUrl(longUrl) {
    try {
        new URL(longUrl);
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return res.ok ? await res.text() : null;
    } catch { 
        return null; 
    }
}

// --- Helper: AI Logic ---
async function getGroqReply(userId, content) {
    try {
        const history = conversationHistory.get(userId) || [];
        history.push({ role: 'user', content });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a helpful Discord bot. Be concise.' },
                ...history.slice(-10)
            ],
        });

        const reply = completion.choices[0]?.message?.content || "I'm stuck, try again!";
        history.push({ role: 'assistant', content: reply });
        conversationHistory.set(userId, history.slice(-10));
        return reply;
    } catch (error) {
        console.error('Groq API Error:', error);
        return 'Sorry, I encountered an error. Please try again later.';
    }
}

// --- Event: Interaction (Slash Commands) ---
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Ping command
    if (interaction.commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! Latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
        return;
    }

    // Ask command
    if (interaction.commandName === 'ask') {
        await interaction.deferReply();
        try {
            const response = await getGroqReply(interaction.user.id, interaction.options.getString('question'));
            await interaction.editReply(response.substring(0, 2000));
        } catch (error) {
            console.error('Ask command error:', error);
            await interaction.editReply('❌ An error occurred while processing your request.');
        }
        return;
    }

    // Create (URL shortener) command
    if (interaction.commandName === 'create') {
        await interaction.deferReply();
        try {
            const short = await shortenUrl(interaction.options.getString('url'));
            await interaction.editReply(short ? `🔗 ${short}` : "❌ Invalid URL. Please provide a valid URL including http:// or https://");
        } catch (error) {
            console.error('Create command error:', error);
            await interaction.editReply('❌ An error occurred while shortening the URL.');
        }
        return;
    }

    // Delete-chat command
    if (interaction.commandName === 'delete-chat') {
        // Double-check permissions
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ You need **Manage Messages** permission to use this command!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });
        
        try {
            const amount = interaction.options.getInteger('amount') || 50;
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            if (deleted.size === 0) {
                await interaction.editReply('⚠️ No messages to delete (messages may be older than 14 days).');
            } else {
                await interaction.editReply(`✅ Deleted ${deleted.size} message${deleted.size !== 1 ? 's' : ''}.`);
            }
            
            // Optional: Log to console
            console.log(`[INFO] ${interaction.user.tag} deleted ${deleted.size} messages in #${interaction.channel.name}`);
        } catch (error) {
            console.error('Delete-chat error:', error);
            let errorMessage = '❌ Failed to delete messages.';
            if (error.code === 10008) {
                errorMessage = '❌ Messages are too old to delete (must be less than 14 days old).';
            }
            await interaction.editReply(errorMessage);
        }
        return;
    }
});

// --- Event: Message (Prefix Commands) ---
client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages and non-prefix commands
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Ping command
    if (command === 'ping') {
        await message.reply('🏓 Pong!');
        return;
    }
    
    // Ask command
    if (command === 'ask') {
        const query = args.join(' ');
        if (!query) {
            await message.reply('❓ Please ask me something! Example: `!ask What is AI?`');
            return;
        }
        
        await message.channel.sendTyping();
        try {
            const reply = await getGroqReply(message.author.id, query);
            await message.reply(reply.substring(0, 2000));
        } catch (error) {
            console.error('Ask prefix command error:', error);
            await message.reply('❌ An error occurred while processing your request.');
        }
        return;
    }
    
    // Delete chat command (prefix version to match README)
    if (command === 'delete' && args[0] === 'chat') {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await message.reply('❌ You need **Manage Messages** permission to use this command!');
            return;
        }
        
        try {
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            const deleted = await message.channel.bulkDelete(fetched, true);
            
            const replyMsg = await message.channel.send(`✅ Deleted ${deleted.size} message${deleted.size !== 1 ? 's' : ''}.`);
            setTimeout(() => replyMsg.delete(), 5000);
        } catch (error) {
            console.error('Delete chat prefix error:', error);
            let errorMessage = '❌ Failed to delete messages.';
            if (error.code === 10008) {
                errorMessage = '❌ Messages are too old to delete (must be less than 14 days old).';
            }
            await message.channel.send(errorMessage);
        }
        return;
    }
});

// Simple greeting responses
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    if (content === 'hello' || content === 'hi') {
        await message.reply(`Hello ${message.author.username}! 👋`);
    } else if (content === 'name?') {
        await message.reply(`I'm adiBot! 🤖`);
    }
});

// --- Ready Event ---
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Ready! Logged in as ${c.user.tag}`);
    console.log(`📡 Serving ${c.guilds.cache.size} server(s)`);
    
    // Set bot status
    c.user.setPresence({
        activities: [{ name: '!ask or /help', type: 3 }], // 'Watching' type
        status: 'online'
    });
});

// --- Error Handling ---
client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// --- Login ---
client.login(process.env.DISCORD_TOKEN);
