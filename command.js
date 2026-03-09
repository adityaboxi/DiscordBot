

'use strict';
require('dotenv').config();

const { REST, Routes } = require('discord.js');



const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required env variable: ${key}`);
    process.exit(1);
  }
}

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const isGlobal = !GUILD_ID;

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'create',
    description: 'Create a new short URL',
    options: [
      {
        name: 'url',
        description: 'The URL to shorten',
        type: 3,       // STRING type
        required: true,
      },
    ],
  },
];




const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    const route = isGlobal
      ? Routes.applicationCommands(CLIENT_ID)                  // Global: up to 1hr to propagate
      : Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);  // Guild: instant, use for dev

    const scope = isGlobal ? 'global' : `guild [${GUILD_ID}]`;
    console.log(`[INFO] Deploying ${commands.length} command(s) — scope: ${scope}`);

    const data = await rest.put(route, { body: commands });

    console.log(`[INFO] Successfully deployed ${data.length} command(s).`);
  } catch (error) {
    console.error('[ERROR] Failed to deploy commands:', error);
    process.exit(1);
  }
})();
