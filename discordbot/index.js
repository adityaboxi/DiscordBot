'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');
const Groq = require('groq-sdk');
const express = require('express');

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- CONFIGURATION ---
const CONFIG = {
  maxTokens:       parseInt(process.env.MAX_TOKENS, 10)             || 500,
  maxReplyLength:  parseInt(process.env.REPLY_MAX_LENGTH, 10)       || 1900,
  bulkDeleteLimit: 100, // Discord limit per request
  rateLimitMax:    10,
  rateLimitWindow: 60_000,
};

const STATIC_REPLIES = new Map([
  ['hello', 'ok'],
  ['i4u',   'i love you too🥰'],
  ['name?', 'Discordbot'],
  ['gf?',   'gemini🥰'],
]);

// Helper for slowing down loops to avoid API spam
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logger = {
  info:  (...args) => console.log (`[INFO]  ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
};

// --- RATE LIMITING ---
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

// --- CORE FUNCTIONS ---
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

  // 1. Static Replies
  if (STATIC_REPLIES.has(content)) {
    return await message.reply(STATIC_REPLIES.get(content));
  }

  // 2. Short URL Simulation
  if (content.startsWith('create ')) {
    const url = content.slice(7).trim();
    if (!url) return await message.reply('Please provide a URL.');
    return await message.reply(`Here is your short URL: ${url}`);
  }

  // 3. Delete Chat Logic (The problematic part)
  if (content === 'delete chat') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return await message.reply('❌ You lack `Manage Messages` permissions.');
    }

    try {
      let deletedCount = 0;
      let deleted;

      // Logic: Loop until no more messages can be bulk deleted
      do {
        // filterOld: true is CRITICAL. It ignores messages > 14 days old.
        deleted = await message.channel.bulkDelete(CONFIG.bulkDeleteLimit, true);
        deletedCount += deleted.size;
        
        // Wait 1 second between batches to avoid Discord Rate Limits
        if (deleted.size >= 2) await sleep(1500); 

      } while (deleted.size >= 2);

      const confirm = await message.channel.send(`✅ Cleared ${deletedCount} messages. (Note: Messages older than 14 days cannot be deleted)`);
      
      // Corrected Async Timeout
      setTimeout(async () => {
        try { await confirm.delete(); } catch (e) { /* Already deleted */ }
      }, 5000);

    } catch (err) {
      logger.error('bulkDelete failed:', err);
      await message.channel.send('⚠️ I failed to delete messages. Check my role permissions.');
    }
    return;
  }

  // 4. Rate Limiting check
  if (isRateLimited(message.author.id)) {
    return await message.reply('⚠️ Slow down! You are being rate limited.');
  }

  // 5. AI Groq Response
  try {
    await message.channel.sendTyping();
    const reply = await getGroqReply(message.content);
    await message.reply(reply);
  } catch (err) {
    logger.error('Groq Error:', err);
    await message.reply('I am having trouble thinking right now. Try again later!');
  }
}

// --- SERVER & EVENTS ---
app.get('/', (req, res) => res.send('Bot is active.'));
app.listen(PORT, () => logger.info(`Keep-alive server on port ${PORT}`));

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  await handleMessage(message);
});

client.once(Events.ClientReady, (c) => {
  logger.info(`Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
