require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const config = require('./src/config');
const Database = require('./src/database');
const Economy = require('./src/economy');
const { commands, handleInteraction } = require('./src/commands');

if (!config.token || !config.clientId) {
    console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const database = new Database(config.databasePath);
const economy = new Economy(database);

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.token);
    const route = config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId);

    await rest.put(route, { body: commands });
    console.log(`Registered ${commands.length} slash commands.`);
}

client.once('ready', async () => {
    console.log(`Bot is ready as ${client.user.tag}`);

    try {
        await registerCommands();
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {
        await handleInteraction(interaction, economy);
    } catch (error) {
        console.error(`Command ${interaction.commandName} failed:`, error);

        const response = {
            content: 'Something went wrong while processing that command.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('SIGINT', () => {
    database.close();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    database.close();
    client.destroy();
    process.exit(0);
});

client.login(config.token).catch(error => {
    console.error('Failed to log in:', error);
    process.exit(1);
});