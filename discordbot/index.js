'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');
const { OpenAI } = require('openai');

// --- Validate env vars early ---
const REQUIRED_ENV = ['XAI_API_KEY', 'DISCORD_TOKEN'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`[FATAL] Missing ${key} in .env`);
        process.exit(1);
    }
}

// --- Initialize Grok (xAI) ---
const grok = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// --- Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Cap history per user to avoid unbounded memory growth
const MAX_HISTORY = 20;
const conversationHistory = new Map();

// --- Rate Limiting ---
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX = 20;            // max 20 requests per window
const rateLimitMap = new Map();      // userId -> { count, resetAt }

function isRateLimited(userId) {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (!entry || now > entry.resetAt) {
        // Fresh window
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    if (entry.count >= RATE_LIMIT_MAX) return true;

    entry.count++;
    return false;
}

function getRateLimitCooldown(userId) {
    const entry = rateLimitMap.get(userId);
    if (!entry) return 0;
    return Math.ceil((entry.resetAt - Date.now()) / 1000);
}

// --- Helper: URL Shortener ---
async function shortenUrl(longUrl) {
    try {
        new URL(longUrl); // validate URL format
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return res.ok ? await res.text() : null;
    } catch {
        return null;
    }
}

// --- Helper: AI Logic with Grok ---
async function getGrokReply(userId, content) {
    try {
        const history = conversationHistory.get(userId) || [];
        history.push({ role: 'user', content });

        const completion = await grok.chat.completions.create({
            model: 'grok-beta',
            messages: [
                {
                    role: 'system',
                    content: 'You are adiBot, a friendly and helpful Discord AI assistant. Be concise and use emojis occasionally.',
                },
                ...history.slice(-10),
            ],
            max_tokens: 1000,
        });

        const reply = completion.choices[0]?.message?.content || "Hmm, I'm thinking... try again! 🤔";
        history.push({ role: 'assistant', content: reply });
        conversationHistory.set(userId, history.slice(-MAX_HISTORY));
        return reply;
    } catch (error) {
        console.error('Grok API Error:', error);
        return 'Sorry, I encountered an error. Please try again later! 🔧';
    }
}

// ===== MESSAGE HANDLER =====
client.on(Events.MessageCreate, async (message) => {
    // Ignore bots
    if (message.author.bot) return;

    // Only operate in guild text channels
    if (!message.guild) return;

    const content = message.content.trim();
    const lower = content.toLowerCase();
    console.log(`[DEBUG] Received: "${content}" from ${message.author.username}`);

    // ===== GREETINGS =====
    if (['hello', 'hi', 'hey'].includes(lower)) {
        const greetings = [
            `Hello ${message.author.username}! 👋 How can I help you?`,
            `Hi ${message.author.username}! 👋 Nice to see you!`,
            `Hey ${message.author.username}! 💫 Ready to chat?`,
        ];
        await message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
        return;
    }

    if (lower === 'tell me') {
        await message.reply('I\'d love to tell you! Use `!ask your question` or `/ask` and I\'ll answer 🤖');
        return;
    }

    if (['name?', 'what is your name?', 'who are you?'].includes(lower)) {
        await message.reply('I\'m adiBot! 🤖 Created by adi, powered by Grok AI (xAI)!');
        return;
    }

    if (lower === 'help' || lower === '!help') {
        await message.reply(
            '**📚 adiBot Commands:**\n\n' +
            '**AI Chat:**\n• `!ask <question>` or `/ask` - Ask me anything\n\n' +
            '**Utilities:**\n• `/create <url>` - Shorten a URL\n• `/ping` - Check latency\n\n' +
            '**Moderation:**\n• `!delete chat` or `/delete-chat` - Clear channel\n\n' +
            '**Fun:**\n• `hello`, `hi` - Say hello!\n• `name?` - Learn about me'
        );
        return;
    }

    // ===== PREFIX COMMANDS =====
    if (!content.startsWith('!')) return;

    const args = content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        await message.reply('🏓 Pong! Bot is alive!');
        return;
    }

    if (command === 'ask') {
        const query = args.join(' ');
        if (!query) {
            await message.reply('❓ Ask me something! Example: `!ask What is AI?`');
            return;
        }

        if (isRateLimited(message.author.id)) {
            const secs = getRateLimitCooldown(message.author.id);
            await message.reply(`⏳ Slow down! You're sending too fast. Try again in **${secs}s**.`);
            return;
        }

        try { await message.channel.sendTyping(); } catch (_) {}

        try {
            const reply = await getGrokReply(message.author.id, query);
            if (reply.length <= 2000) {
                await message.reply(reply);
            } else {
                const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            }
        } catch (error) {
            console.error('Ask error:', error);
            await message.reply('❌ Error! Try again.');
        }
        return;
    }

    if ((command === 'delete' && args[0]?.toLowerCase() === 'chat') || command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await message.reply('❌ You need Manage Messages permission!');
            return;
        }

        try {
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            const deleted = await message.channel.bulkDelete(fetched, true);
            const replyMsg = await message.channel.send(`✅ Deleted ${deleted.size} messages!`);
            setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error('Delete error:', error);
            await message.channel.send('❌ Failed to delete messages (must be less than 14 days old).');
        }
        return;
    }
});

// ===== SLASH COMMAND HANDLER =====
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`[DEBUG] Slash command: /${interaction.commandName} from ${interaction.user.username}`);

    if (interaction.commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! Latency: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`);
        return;
    }

    if (interaction.commandName === 'ask') {
        if (isRateLimited(interaction.user.id)) {
            const secs = getRateLimitCooldown(interaction.user.id);
            await interaction.reply({ content: `⏳ Slow down! Try again in **${secs}s**.`, ephemeral: true });
            return;
        }

        await interaction.deferReply();
        try {
            const question = interaction.options.getString('question');
            const response = await getGrokReply(interaction.user.id, question);
            await interaction.editReply(response.substring(0, 2000));
        } catch (error) {
            console.error('Ask slash error:', error);
            await interaction.editReply('❌ Oops! Something went wrong.');
        }
        return;
    }

    if (interaction.commandName === 'create') {
        await interaction.deferReply();
        try {
            const url = interaction.options.getString('url');
            const short = await shortenUrl(url);
            await interaction.editReply(short ? `🔗 Shortened: ${short}` : '❌ Invalid or unsupported URL.');
        } catch (error) {
            console.error('Create slash error:', error);
            await interaction.editReply('❌ Error shortening URL.');
        }
        return;
    }

    if (interaction.commandName === 'delete-chat') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({ content: '❌ No permission!', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        try {
            const amount = interaction.options.getInteger('amount') ?? 50;
            const safeAmount = Math.min(100, Math.max(1, amount));
            const deleted = await interaction.channel.bulkDelete(safeAmount, true);
            await interaction.editReply(`✅ Deleted ${deleted.size} messages.`);
        } catch (error) {
            console.error('Delete-chat slash error:', error);
            await interaction.editReply('❌ Failed to delete messages. They may be older than 14 days.');
        }
        return;
    }
});

// ===== READY EVENT =====
client.once(Events.ClientReady, (c) => {
    console.log(`✅ ${c.user.tag} is ONLINE!`);
    console.log(`📡 Serving ${c.guilds.cache.size} server(s)`);
    console.log(`🤖 Using AI: Grok (xAI)`);
    console.log(`💬 Type "hello" in Discord to test!`);

    c.user.setPresence({
        activities: [{ name: 'Type "hello"', type: 2 }],
        status: 'online',
    });
});

// ===== ERROR HANDLING =====
client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[INFO] Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[INFO] Received SIGTERM, shutting down...');
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
