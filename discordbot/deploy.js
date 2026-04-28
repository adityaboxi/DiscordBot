'use strict';
require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('[FATAL] Missing DISCORD_TOKEN or CLIENT_ID in .env');
    process.exit(1);
}

const commands = [
    {
        name: 'ping',
        description: 'Check bot latency',
    },
    {
        name: 'ask',
        description: 'Ask the Grok AI a question',
        options: [{
            name: 'question',
            description: 'Your question for the AI',
            type: ApplicationCommandOptionType.String,
            required: true,
        }],
    },
    {
        name: 'create',
        description: 'Shorten a URL using TinyURL',
        options: [{
            name: 'url',
            description: 'The long URL to shorten',
            type: ApplicationCommandOptionType.String,
            required: true,
        }],
    },
    {
        name: 'delete-chat',
        description: 'Bulk delete messages (up to 100, only messages from last 14 days)',
        default_member_permissions: String(PermissionFlagsBits.ManageMessages),
        options: [{
            name: 'amount',
            description: 'Number of messages to delete (1-100)',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 1,
            max_value: 100,
        }],
    },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[INFO] Registering ${commands.length} commands globally...`);
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('[SUCCESS] Commands deployed globally. May take up to 1 hour to appear.');
    } catch (error) {
        console.error('[ERROR] Deployment failed:', error);
    }
})();
