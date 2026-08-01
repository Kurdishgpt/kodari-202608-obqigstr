# Kodari Economy Bot

Kodari Economy Bot is an OwO-style Discord economy game powered by discord.js v14. It includes persistent SQLite accounts, cooldown-based activities, a shop and inventory, administrator currency controls, transaction auditing, and canvas-generated profile and leaderboard cards.

## Features

- Coins, gems, bank balance, levels, and XP
- Daily rewards with streak bonuses
- Work, beg, crime, and slots activities
- Static shop with buy and sell support
- Persistent item inventories
- Canvas profile cards with Discord avatars
- Canvas leaderboard cards
- Server-side cooldown enforcement
- SQLite transaction history for economy auditing
- Administrator `/give` and `/take` commands

## Setup

1. Install Node.js 18.17 or newer.
2. Create a Discord application and bot in the Discord Developer Portal.
3. Enable the `bot` and `applications.commands` scopes when inviting the bot.
4. Copy `.env.example` to `.env`.
5. Set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`.
6. Optionally set `DISCORD_GUILD_ID` for faster guild-specific command registration.
7. Install dependencies:

```bash
npm install
```

8. Start the bot:

```bash
npm start
```

Commands are registered automatically when the bot becomes ready. Global commands can take time to appear, so use `DISCORD_GUILD_ID` during development.

## Commands

### Economy

- `/balance`
- `/daily`
- `/work`
- `/beg`
- `/crime`
- `/slots`

### Items

- `/shop`
- `/buy`
- `/sell`
- `/inventory`

### Social and utility

- `/profile`
- `/leaderboard`
- `/help`

### Administration

- `/give`
- `/take`

The SQLite database is created automatically at `data/kodari.sqlite` unless `DATABASE_PATH` is configured.

## Discord permissions

The bot needs the `Send Messages`, `Embed Links`, and `Attach Files` permissions. It only requests the `Guilds` gateway intent because all economy commands use slash interactions.