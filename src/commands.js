const {
    AttachmentBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const { createLeaderboardCard, createProfileCard } = require('./cards');

const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('View your coin, gem, bank, and level balances.'),
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward and build a streak.'),
    new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work a job for coins.'),
    new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Beg for a small amount of coins.'),
    new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Attempt a risky crime for a large payout.'),
    new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine for 100 coins.'),
    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your item inventory.'),
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View items available in the shop.'),
    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop.')
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('The item ID to buy.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('quantity')
                .setDescription('How many items to buy.')
                .setMinValue(1)
                .setMaxValue(99)
        ),
    new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item from your inventory.')
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('The item ID to sell.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('quantity')
                .setDescription('How many items to sell.')
                .setMinValue(1)
                .setMaxValue(99)
        ),
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a canvas-generated economy profile card.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The player whose profile you want to view.')
        ),
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the richest players on the leaderboard.'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('View the available economy commands.'),
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give currency to a player.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The player receiving the currency.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('coins')
                .setDescription('The number of coins to give.')
                .setMinValue(1)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('gems')
                .setDescription('The number of gems to give.')
                .setMinValue(0)
        ),
    new SlashCommandBuilder()
        .setName('take')
        .setDescription('Remove currency from a player.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The player losing the currency.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('coins')
                .setDescription('The number of coins to remove.')
                .setMinValue(1)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('gems')
                .setDescription('The number of gems to remove.')
                .setMinValue(0)
        )
].map(command => command.toJSON());

function formatDuration(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];

    if (hours > 0) {
        parts.push(`${hours}h`);
    }

    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }

    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.join(' ');
}

function createEmbed(title, description, color = 0x8f6cff) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function cooldownEmbed(result) {
    return createEmbed(
        'Cooldown active',
        `${result.message}\nTry again in **${formatDuration(result.remaining)}**.`,
        0xffa62b
    );
}

async function handleInteraction(interaction, economy) {
    const userId = interaction.user.id;

    switch (interaction.commandName) {
        case 'balance': {
            const account = economy.getAccount(userId);

            await interaction.reply({
                embeds: [
                    createEmbed(
                        `${interaction.user.username}'s Balance`,
                        [
                            `🪙 **Coins:** ${account.coins.toLocaleString()}`,
                            `💎 **Gems:** ${account.gems.toLocaleString()}`,
                            `🏦 **Bank:** ${account.bank.toLocaleString()}`,
                            `⭐ **Level:** ${account.level}`,
                            `✨ **XP:** ${account.xp}/${account.level * 100}`
                        ].join('\n')
                    )
                ]
            });
            break;
        }

        case 'daily': {
            const result = economy.daily(userId);

            if (!result.ok) {
                await interaction.reply({ embeds: [cooldownEmbed(result)] });
                break;
            }

            await interaction.reply({
                embeds: [
                    createEmbed(
                        'Daily reward claimed',
                        `You received **${result.reward.toLocaleString()} coins**.\nYour current streak is **${result.streak} day${result.streak === 1 ? '' : 's'}**.`
                    )
                ]
            });
            break;
        }

        case 'work': {
            const result = economy.work(userId);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed('Work complete', result.message, 0x55d187)
                        : cooldownEmbed(result)
                ]
            });
            break;
        }

        case 'beg': {
            const result = economy.beg(userId);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed('Begging result', result.message, 0x55d187)
                        : cooldownEmbed(result)
                ]
            });
            break;
        }

        case 'crime': {
            const result = economy.crime(userId);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed('Crime result', result.message, result.payout >= 0 ? 0x55d187 : 0xff5d73)
                        : cooldownEmbed(result)
                ]
            });
            break;
        }

        case 'slots': {
            const result = economy.slots(userId);

            if (!result.ok) {
                await interaction.reply({
                    embeds: [
                        result.remaining > 0
                            ? cooldownEmbed(result)
                            : createEmbed('Slots unavailable', result.message, 0xff5d73)
                    ]
                });
                break;
            }

            const outcome = result.netPayout >= 0
                ? `You won **${result.netPayout.toLocaleString()} net coins**.`
                : `You lost **${Math.abs(result.netPayout).toLocaleString()} coins**.`;

            await interaction.reply({
                embeds: [
                    createEmbed(
                        '🎰 Slot machine',
                        `**${result.symbols.join(' | ')}**\n\n${outcome}`,
                        result.netPayout >= 0 ? 0x55d187 : 0xff5d73
                    )
                ]
            });
            break;
        }

        case 'inventory': {
            const inventory = economy.getInventory(userId);

            if (inventory.length === 0) {
                await interaction.reply({
                    embeds: [createEmbed('Inventory', 'Your inventory is empty. Visit `/shop` to buy something.')]
                });
                break;
            }

            const lines = inventory.map(entry => {
                const item = economy.getItem(entry.item_id);
                return `${item ? item.emoji : '📦'} **${item ? item.name : entry.item_id}** ×${entry.quantity}`;
            });

            await interaction.reply({
                embeds: [createEmbed('Inventory', lines.join('\n'))]
            });
            break;
        }

        case 'shop': {
            const lines = economy.items.map(item =>
                `${item.emoji} **${item.name}** — \`${item.id}\`\nBuy: **${item.price.toLocaleString()}** coins · Sell: **${item.sellPrice.toLocaleString()}** coins\n${item.description}`
            );

            await interaction.reply({
                embeds: [
                    createEmbed('Kodari Shop', lines.join('\n\n'), 0x6cb6ff)
                        .setFooter({ text: 'Use /buy item:<id> quantity:<amount> to purchase.' })
                ]
            });
            break;
        }

        case 'buy': {
            const itemId = interaction.options.getString('item').toLowerCase();
            const quantity = interaction.options.getInteger('quantity') || 1;
            const result = economy.buy(userId, itemId, quantity);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed(
                            'Purchase complete',
                            `You bought **${quantity} ${result.item.name}${quantity === 1 ? '' : 's'}** for **${result.total.toLocaleString()} coins**.`,
                            0x55d187
                        )
                        : createEmbed('Purchase failed', result.message, 0xff5d73)
                ]
            });
            break;
        }

        case 'sell': {
            const itemId = interaction.options.getString('item').toLowerCase();
            const quantity = interaction.options.getInteger('quantity') || 1;
            const result = economy.sell(userId, itemId, quantity);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed(
                            'Sale complete',
                            `You sold **${quantity} ${result.item.name}${quantity === 1 ? '' : 's'}** for **${result.total.toLocaleString()} coins**.`,
                            0x55d187
                        )
                        : createEmbed('Sale failed', result.message, 0xff5d73)
                ]
            });
            break;
        }

        case 'profile': {
            await interaction.deferReply();

            const target = interaction.options.getUser('user') || interaction.user;
            const account = economy.getAccount(target.id);
            const image = await createProfileCard(target, account);

            await interaction.editReply({
                files: [new AttachmentBuilder(image, { name: 'profile.png' })]
            });
            break;
        }

        case 'leaderboard': {
            await interaction.deferReply();

            const rows = economy.getLeaderboard(10);
            const users = await Promise.all(
                rows.map(row => interaction.client.users.fetch(row.user_id).catch(() => null))
            );
            const image = await createLeaderboardCard(rows, users);

            await interaction.editReply({
                files: [new AttachmentBuilder(image, { name: 'leaderboard.png' })]
            });
            break;
        }

        case 'help': {
            await interaction.reply({
                embeds: [
                    createEmbed(
                        'Kodari Economy Commands',
                        [
                            '**Economy**',
                            '`/balance` `/daily` `/work` `/beg` `/crime` `/slots`',
                            '',
                            '**Items**',
                            '`/shop` `/buy` `/sell` `/inventory`',
                            '',
                            '**Social**',
                            '`/profile` `/leaderboard`',
                            '',
                            '**Utility**',
                            '`/help`',
                            '',
                            'Administrators can use `/give` and `/take` to manage player currency.'
                        ].join('\n')
                    )
                ]
            });
            break;
        }

        case 'give':
        case 'take': {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: 'You need Administrator permission to use this command.',
                    ephemeral: true
                });
                break;
            }

            const target = interaction.options.getUser('user');
            const coins = interaction.options.getInteger('coins');
            const gems = interaction.options.getInteger('gems') || 0;
            const result = interaction.commandName === 'give'
                ? economy.give(userId, target.id, coins, gems)
                : economy.take(userId, target.id, coins, gems);

            await interaction.reply({
                embeds: [
                    result.ok
                        ? createEmbed(
                            `Currency ${interaction.commandName === 'give' ? 'granted' : 'removed'}`,
                            `${result.message}\nTarget: ${target}`,
                            0x55d187
                        )
                        : createEmbed('Currency update failed', result.message, 0xff5d73)
                ]
            });
            break;
        }

        default:
            await interaction.reply({
                content: 'That command is not implemented.',
                ephemeral: true
            });
    }
}

module.exports = {
    commands,
    handleInteraction
};