'use strict';
require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

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
        description: 'Ask the Groq AI a question',
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
        description: 'Bulk delete messages (up to 14 days old)',
        default_member_permissions: String(PermissionFlagsBits.ManageMessages),
    },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        const route = GUILD_ID 
            ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) 
            : Routes.applicationCommands(CLIENT_ID);

        console.log(`[INFO] Registering ${commands.length} commands...`);
        await rest.put(route, { body: commands });
        console.log('[SUCCESS] Commands deployed successfully.');
    } catch (error) {
        console.error('[ERROR] Deployment failed:', error);
    }
})();
