require('dotenv').config();

const { REST, Routes } = require('discord.js');
const config = require('./config');
const { commands } = require('./commands');

if (!config.token || !config.clientId) {
    console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);
const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

rest.put(route, { body: commands })
    .then(() => {
        console.log(`Registered ${commands.length} slash commands.`);
    })
    .catch(error => {
        console.error('Failed to register commands:', error);
        process.exit(1);
    });