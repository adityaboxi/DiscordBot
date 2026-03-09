


'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');
const Groq = require('groq-sdk');

const REQUIRED_ENV = ['DISCORD_TOKEN', 'GROQ_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const CONFIG = {
  maxTokens:      parseInt(process.env.MAX_TOKENS, 10)            || 500,
  maxReplyLength: parseInt(process.env.REPLY_MAX_LENGTH, 10)      || 1900,
  bulkDeleteLimit:parseInt(process.env.BULK_DELETE_LIMIT, 10)     || 100,
  typingCooldown: parseInt(process.env.TYPING_COOLDOWN_MS, 10)    || 3000,
  rateLimitMax:   parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  rateLimitWindow:parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)  || 60_000,
  isProd:         process.env.NODE_ENV === 'production',
};

const logger = {
  info:  (...args) => console.log (`[INFO]  ${new Date().toISOString()}`, ...args),
  warn:  (...args) => console.warn(`[WARN]  ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
};

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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const STATIC_REPLIES = new Map([
  ['do you like me', 'i like you too aditya'],
  ['name?',          'Discordbot made by aditya'],
  ['gf?',            'gemini🥰'],
]);

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

async function handleMessage(message) {
  const content = message.content.toLowerCase().trim();

   if (STATIC_REPLIES.has(content)) {
    return message.reply(STATIC_REPLIES.get(content));
  }

    if (message.content.startsWith('create ')) {
    const url = message.content.slice('create '.length).trim();
    if (!url) return message.reply('Please provide a URL after `create`.');
    return message.reply(`Here is your short URL: ${url}`);
  }

   if (content.toLowercase() === 'delete chat') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply(' You do not have permission to delete messages.');
    }
    try {
      let deleted;
      do {
        deleted = await message.channel.bulkDelete(CONFIG.bulkDeleteLimit, true);
      } while (deleted.size >= 2);
      const confirm = await message.channel.send('Chat cleared!');
      setTimeout(() => confirm.delete().catch(() => {}), CONFIG.typingCooldown);
    } catch (err) {
      logger.error('bulkDelete failed:', err);
      await message.channel.send(' Failed to delete messages.').catch(() => {});
    }
    return;
  }

  
  if (isRateLimited(message.author.id)) {
    return message.reply('⏳ You\'re sending too many messages. Please slow down!');
  }


  try {
    await message.channel.sendTyping();
    const reply = await getGroqReply(message.content);
    await message.reply(reply);
  } catch (err) {
    logger.error('Groq request failed:', err);
    await message.reply(' Sorry, I couldn\'t process that right now. Try again later!');
  }
}

client.once(Events.ClientReady, (c) => {
  logger.info(`Bot online as ${c.user.tag} | Guilds: ${c.guilds.cache.size}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; 

  try {
    await handleMessage(message);
  } catch (err) {
    logger.error('Unhandled error in messageCreate:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: '🏓 Pong!', ephemeral: true });
  }
});


async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down...`);
  client.destroy();
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err); process.exit(1); });

client.login(process.env.DISCORD_TOKEN);
