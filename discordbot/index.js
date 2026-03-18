





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
  maxTokens:      parseInt(process.env.MAX_TOKENS, 10)             || 500,
  maxReplyLength: parseInt(process.env.REPLY_MAX_LENGTH, 10)       || 1900,
  bulkDeleteLimit:parseInt(process.env.BULK_DELETE_LIMIT, 10)      || 100,
  typingCooldown: parseInt(process.env.TYPING_COOLDOWN_MS, 10)     || 3000,
  rateLimitMax:   parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  rateLimitWindow:parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)   || 60_000,
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
  const now = Date.now();
  const userData = rateLimitMap.get(userId) || { count: 0, resetAt: now + CONFIG.rateLimitWindow };

  if (now > userData.resetAt) {
    userData.count = 0;
    userData.resetAt = now + CONFIG.rateLimitWindow;
  }

  userData.count++;
  rateLimitMap.set(userId, userData);
  return userData.count > CONFIG.rateLimitMax;
}

// ─── Groq Client ─────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Static Replies ───────────────────────────────────────────────────────────
const STATIC_REPLIES = new Map([
  ['do you like me', 'i like you too aditya'],
  ['name?',          'Discordbot made by aditya'],
  ['gf?',            'gemini🥰'],
]);

// ─── Groq Handler ─────────────────────────────────────────────────────────────
async function getGroqReply(userMessage) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: CONFIG.maxTokens,
  });
  const text = response.choices?.[0]?.message?.content ?? 'No response received.';
  return text.length > CONFIG.maxReplyLength
    ? text.substring(0, CONFIG.maxReplyLength) + '...'
    : text;
}

// ─── Core Delete Logic (shared by message + slash command) ───────────────────
async function deleteAllMessages(channel) {
  let totalDeleted = 0;
  let deleted;
  do {
    deleted = await channel.bulkDelete(CONFIG.bulkDeleteLimit, true);
    totalDeleted += deleted.size;
  } while (deleted.size >= 2);
  return totalDeleted;
}

// ─── Message Handler ──────────────────────────────────────────────────────────
async function handleMessage(message) {
  // Strip out any bot mention prefix so "reply" usage works cleanly
  // e.g. if someone replies to a bot message and types "delete chat"
  const content = message.content
    .replace(`<@${client.user.id}>`, '')
    .toLowerCase()
    .trim();

  // Static replies — no rate limit needed
  if (STATIC_REPLIES.has(content)) {
    return message.reply(STATIC_REPLIES.get(content));
  }

  // URL shortener stub
  if (message.content.startsWith('create ')) {
    const url = message.content.slice('create '.length).trim();
    if (!url) return message.reply('Please provide a URL after `create`.');
    return message.reply(`Here is your short URL: ${url}`);
  }

  // Delete chat — works whether sent normally OR as a reply to another message
  if (content === 'delete chat') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ You do not have permission to delete messages.');
    }
    try {
      await deleteAllMessages(message.channel);
      const confirm = await message.channel.send('✅ Chat cleared!');
      setTimeout(() => confirm.delete().catch(() => {}), CONFIG.typingCooldown);
    } catch (err) {
      logger.error('bulkDelete failed:', err);
      await message.channel.send('❌ Failed to delete messages.').catch(() => {});
    }
    return;
  }

  // Rate limit check before hitting Groq
  if (isRateLimited(message.author.id)) {
    return message.reply('⏳ You\'re sending too many messages. Please slow down!');
  }

  // AI reply
  try {
    await message.channel.sendTyping();
    const reply = await getGroqReply(message.content);
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
  if (!message.guild) return; // Ignore DMs

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
    await interaction.reply({ content: '🏓 Pong!', ephemeral: true });
    return;
  }

  // ── /delete-chat ───────────────────────────────────────────────────────────
  if (interaction.commandName === 'delete-chat') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ You do not have permission to delete messages.', ephemeral: true });
    }

    // Defer so Discord doesn't time out while we bulk-delete
    await interaction.deferReply({ ephemeral: true });

    try {
      const totalDeleted = await deleteAllMessages(interaction.channel);
      await interaction.editReply(`✅ Chat cleared! Deleted ${totalDeleted} message(s).`);
    } catch (err) {
      logger.error('bulkDelete (slash) failed:', err);
      await interaction.editReply('❌ Failed to delete messages. Make sure I have **Manage Messages** permission.');
    }
    return;
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down...`);
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
