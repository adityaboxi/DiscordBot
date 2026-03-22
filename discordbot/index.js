




'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');
const Groq = require('groq-sdk');

// ─── Validate Required Env Vars ──────────────────────────────────────────────
const REQUIRED_ENV = ['DISCORD_TOKEN', 'GROQ_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG = {
  prefix:         process.env.BOT_PREFIX                           || '!',
  maxTokens:      parseInt(process.env.MAX_TOKENS, 10)            || 500,
  maxReplyLength: parseInt(process.env.REPLY_MAX_LENGTH, 10)      || 1900,
  bulkDeleteLimit:parseInt(process.env.BULK_DELETE_LIMIT, 10)     || 100,
  confirmMsgTTL:  parseInt(process.env.TYPING_COOLDOWN_MS, 10)    || 3000,
  rateLimitMax:   parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)|| 10,
  rateLimitWindow:parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)  || 60_000,
  isProd:         process.env.NODE_ENV === 'production',
};

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = {
  info:  (...args) => console.log (`[INFO]  ${new Date().toISOString()}`, ...args),
  warn:  (...args) => console.warn(`[WARN]  ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
};

// ─── Rate Limiter (per user) ──────────────────────────────────────────────────
const rateLimitMap = new Map();

function isRateLimited(userId) {
  const now      = Date.now();
  const entry    = rateLimitMap.get(userId) ?? { count: 0, resetAt: now + CONFIG.rateLimitWindow };

  if (now > entry.resetAt) {
    entry.count   = 0;
    entry.resetAt = now + CONFIG.rateLimitWindow;
  }

  entry.count++;
  rateLimitMap.set(userId, entry);
  return entry.count > CONFIG.rateLimitMax;
}

// ─── Groq Client ─────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── In-memory conversation history per user (optional context window) ────────
// Keeps the last N turns so the AI has short-term memory within a session.
const MAX_HISTORY = 10; // pairs (user + assistant)
const conversationHistory = new Map(); // userId → Message[]

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

function pushHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  // Keep only the last MAX_HISTORY messages (each turn = 2 entries)
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2);
}

// ─── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Static Replies ───────────────────────────────────────────────────────────
// Keys are already lowercase; handleMessage normalises input before lookup.
const STATIC_REPLIES = new Map([
  ['do you like me', 'of course! 😊'],
  ['name?',          'I\'m a Discord bot. Use /ping or just chat with me!'],
  ['gf?',            'gemini 🥰'],
]);

// ─── Groq AI Handler ──────────────────────────────────────────────────────────
async function getGroqReply(userId, userMessage) {
  pushHistory(userId, 'user', userMessage);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful, friendly Discord bot. ' +
          'Keep responses concise and suitable for chat. ' +
          'Avoid markdown that Discord cannot render (e.g. LaTeX).',
      },
      ...getHistory(userId),
    ],
    max_tokens: CONFIG.maxTokens,
  });

  const text = response.choices?.[0]?.message?.content ?? 'No response received.';
  const trimmed = text.length > CONFIG.maxReplyLength
    ? text.substring(0, CONFIG.maxReplyLength) + '…'
    : text;

  pushHistory(userId, 'assistant', trimmed);
  return trimmed;
}

// ─── URL Shortener (using tinyurl public API — no key required) ───────────────
async function shortenUrl(longUrl) {
  // Validate URL shape before sending to external service
  try { new URL(longUrl); } catch { return null; }

  const api = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
  const res  = await fetch(api);           // Node 18+ has built-in fetch
  if (!res.ok) throw new Error(`TinyURL returned HTTP ${res.status}`);
  const short = await res.text();
  return short.trim();
}

// ─── Core Delete Logic (shared by message command + slash command) ─────────────
async function deleteAllMessages(channel) {
  let totalDeleted = 0;
  let batch;
  do {
    // bulkDelete only works on messages < 14 days old; filterOld=true skips older ones
    batch          = await channel.bulkDelete(CONFIG.bulkDeleteLimit, true);
    totalDeleted  += batch.size;
  } while (batch.size > 0);
  return totalDeleted;
}

// ─── Message Handler ──────────────────────────────────────────────────────────
async function handleMessage(message) {
  const mentionPrefix = `<@${client.user.id}>`;
  const raw           = message.content.trim();

  // ── Determine whether this message is addressed to the bot ────────────────
  // Accept:  !command …   OR   @BotMention command …
  let content;
  if (raw.startsWith(CONFIG.prefix)) {
    content = raw.slice(CONFIG.prefix.length).trim();
  } else if (raw.startsWith(mentionPrefix)) {
    content = raw.slice(mentionPrefix.length).trim();
  } else {
    // Message is not for the bot — ignore it entirely
    return;
  }

  const lower = content.toLowerCase();

  // ── Static replies ────────────────────────────────────────────────────────
  if (STATIC_REPLIES.has(lower)) {
    return message.reply(STATIC_REPLIES.get(lower));
  }

  // ── !delete chat ──────────────────────────────────────────────────────────
  if (lower === 'delete chat') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ You do not have permission to delete messages.');
    }
    try {
      await deleteAllMessages(message.channel);
      const confirm = await message.channel.send('✅ Chat cleared!');
      setTimeout(() => confirm.delete().catch(() => {}), CONFIG.confirmMsgTTL);
    } catch (err) {
      logger.error('bulkDelete (message) failed:', err);
      await message.channel.send('❌ Failed to delete messages.').catch(() => {});
    }
    return;
  }

  // ── !create <url> — shorten a URL ─────────────────────────────────────────
  if (lower.startsWith('create ')) {
    const url = content.slice('create '.length).trim();
    if (!url) return message.reply('Please provide a URL after `create`. Example: `!create https://example.com`');
    try {
      const short = await shortenUrl(url);
      if (!short) return message.reply('❌ That doesn\'t look like a valid URL.');
      return message.reply(`🔗 Short URL: ${short}`);
    } catch (err) {
      logger.error('URL shortener failed:', err);
      return message.reply('❌ Could not shorten that URL right now. Try again later.');
    }
  }

  // ── Rate-limit check (before the expensive Groq call) ─────────────────────
  if (isRateLimited(message.author.id)) {
    return message.reply('⏳ You\'re sending too many messages. Please slow down!');
  }

  // ── Groq AI reply ──────────────────────────────────────────────────────────
  try {
    await message.channel.sendTyping();
    const reply = await getGroqReply(message.author.id, content);
    await message.reply(reply);
  } catch (err) {
    logger.error('Groq request failed:', err);
    await message.reply('⚠️ Sorry, I couldn\'t process that right now. Try again later!');
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  logger.info(`Bot online as ${c.user.tag} | Guilds: ${c.guilds.cache.size}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild)     return; // Ignore DMs
  try {
    await handleMessage(message);
  } catch (err) {
    logger.error('Unhandled error in messageCreate:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ── /ping ──────────────────────────────────────────────────────────────────
  if (interaction.commandName === 'ping') {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({ content: `🏓 Pong! Latency: **${latency}ms**`, ephemeral: true });
    return;
  }

  // ── /ask <question> ───────────────────────────────────────────────────────
  if (interaction.commandName === 'ask') {
    const question = interaction.options.getString('question');
    if (!question) {
      return interaction.reply({ content: '❌ Please provide a question.', ephemeral: true });
    }
    if (isRateLimited(interaction.user.id)) {
      return interaction.reply({ content: '⏳ You\'re sending too many requests. Slow down!', ephemeral: true });
    }
    await interaction.deferReply();
    try {
      const reply = await getGroqReply(interaction.user.id, question);
      await interaction.editReply(reply);
    } catch (err) {
      logger.error('Groq request (slash) failed:', err);
      await interaction.editReply('⚠️ Could not process your request right now.');
    }
    return;
  }

  // ── /create <url> ─────────────────────────────────────────────────────────
  if (interaction.commandName === 'create') {
    const url = interaction.options.getString('url');
    if (!url) {
      return interaction.reply({ content: '❌ Please provide a valid URL.', ephemeral: true });
    }
    await interaction.deferReply();
    try {
      const short = await shortenUrl(url);
      if (!short) return interaction.editReply('❌ That doesn\'t look like a valid URL.');
      await interaction.editReply(`🔗 Short URL: ${short}`);
    } catch (err) {
      logger.error('URL shortener (slash) failed:', err);
      await interaction.editReply('❌ Could not shorten that URL right now.');
    }
    return;
  }

  // ── /delete-chat ──────────────────────────────────────────────────────────
  if (interaction.commandName === 'delete-chat') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ You do not have permission to delete messages.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const totalDeleted = await deleteAllMessages(interaction.channel);
      await interaction.editReply(`✅ Chat cleared! Deleted **${totalDeleted}** message(s).`);
    } catch (err) {
      logger.error('bulkDelete (slash) failed:', err);
      await interaction.editReply('❌ Failed to delete messages. Make sure I have **Manage Messages** permission.');
    }
    return;
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down…`);
  client.destroy();
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Unhandled Errors ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err); process.exit(1); });

// ─── Launch ───────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
