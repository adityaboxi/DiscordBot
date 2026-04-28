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

// --- Helper: URL Shortener ---
async function shortenUrl(longUrl) {
    try {
        new URL(longUrl);
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return res.ok ? await res.text() : null;
    } catch { return null; }
}

// --- Helper: AI Logic ---
async function getGroqReply(userId, content) {
    const history = conversationHistory.get(userId) || [];
    history.push({ role: 'user', content });

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'You are a helpful Discord bot. Be concise.' },
            ...history.slice(-10) // Keep last 10 messages for context
        ],
    });

    const reply = completion.choices[0]?.message?.content || "I'm stuck, try again!";
    history.push({ role: 'assistant', content: reply });
    conversationHistory.set(userId, history.slice(-10));
    return reply;
}

// --- Event: Interaction (Slash Commands) ---
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        await interaction.deferReply();
        const response = await getGroqReply(interaction.user.id, interaction.options.getString('question'));
        await interaction.editReply(response.substring(0, 2000));
    }

    if (interaction.commandName === 'create') {
        await interaction.deferReply();
        const short = await shortenUrl(interaction.options.getString('url'));
        await interaction.editReply(short ? `🔗 ${short}` : "❌ Invalid URL.");
    }

    if (interaction.commandName === 'delete-chat') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'No perms!', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(100, true);
        await interaction.editReply(`✅ Deleted ${deleted.size} messages.`);
    }
});

// --- Event: Message (Prefix Commands) ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') message.reply('Pong!');
    
    if (command === 'ask') {
        const query = args.join(' ');
        if (!query) return message.reply('Ask me something!');
        await message.channel.sendTyping();
        const reply = await getGroqReply(message.author.id, query);
        message.reply(reply.substring(0, 2000));
    }
});

client.once(Events.ClientReady, (c) => console.log(`Ready! Logged in as ${c.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
