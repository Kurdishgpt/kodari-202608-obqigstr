const path = require('path');

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || '',
    databasePath: path.resolve(
        process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'kodari.sqlite')
    )
};