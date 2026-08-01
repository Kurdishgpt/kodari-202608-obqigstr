const ITEMS = [
    {
        id: 'cookie',
        name: 'Lucky Cookie',
        emoji: '🍪',
        price: 250,
        sellPrice: 100,
        description: 'A snack said to improve your luck.'
    },
    {
        id: 'coffee',
        name: 'Energy Coffee',
        emoji: '☕',
        price: 500,
        sellPrice: 200,
        description: 'Strong enough to wake up a creeper.'
    },
    {
        id: 'crystal',
        name: 'Mystic Crystal',
        emoji: '🔮',
        price: 1500,
        sellPrice: 750,
        description: 'A shimmering fragment of unknown origin.'
    },
    {
        id: 'treasure',
        name: 'Treasure Chest',
        emoji: '🧰',
        price: 5000,
        sellPrice: 2500,
        description: 'Maybe it contains something valuable.'
    },
    {
        id: 'crown',
        name: 'Golden Crown',
        emoji: '👑',
        price: 25000,
        sellPrice: 12500,
        description: 'Proof that you are royalty.'
    }
];

const JOBS = [
    ['mined diamonds for a wealthy villager', 180, 360],
    ['built a mansion out of pure quartz', 220, 440],
    ['delivered suspicious packages across the Nether', 150, 390],
    ['defeated a horde of skeletons', 260, 520],
    ['helped a wandering trader find his llamas', 120, 300],
    ['farmed an entire field before sunset', 140, 320]
];

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣'];

class Economy {
    constructor(database) {
        this.database = database;
    }

    get items() {
        return ITEMS;
    }

    getItem(itemId) {
        return ITEMS.find(item => item.id === itemId);
    }

    getAccount(userId) {
        return this.database.getUser(userId);
    }

    getInventory(userId) {
        return this.database.getInventory(userId);
    }

    getLeaderboard(limit = 10) {
        return this.database.getLeaderboard(limit);
    }

    getCooldown(userId, field, duration) {
        const account = this.database.getUser(userId);
        const elapsed = Date.now() - account[field];
        const remaining = duration - elapsed;

        return remaining > 0 ? remaining : 0;
    }

    addExperience(userId, amount) {
        const account = this.database.getUser(userId);
        let xp = account.xp + amount;
        let level = account.level;

        while (xp >= level * 100) {
            xp -= level * 100;
            level += 1;
        }

        return this.database.updateUser(userId, { xp, level });
    }

    daily(userId) {
        const account = this.database.getUser(userId);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        const remaining = Math.max(0, cooldown - (now - account.daily_claimed_at));

        if (remaining > 0) {
            return {
                ok: false,
                message: 'Your daily reward has already been claimed.',
                remaining
            };
        }

        const streak = now - account.daily_claimed_at <= 48 * 60 * 60 * 1000
            ? account.daily_streak + 1
            : 1;
        const reward = Math.min(5000, 400 + streak * 100);

        this.database.addCurrency(userId, reward, 0, 'daily', `streak:${streak}`);
        this.database.updateUser(userId, {
            daily_streak: streak,
            daily_claimed_at: now
        });
        this.addExperience(userId, 25);

        return {
            ok: true,
            reward,
            streak,
            account: this.database.getUser(userId)
        };
    }

    work(userId) {
        const duration = 30 * 60 * 1000;
        const remaining = this.getCooldown(userId, 'last_work_at', duration);

        if (remaining > 0) {
            return {
                ok: false,
                message: 'You are still recovering from your last job.',
                remaining
            };
        }

        const [job, minimum, maximum] = JOBS[Math.floor(Math.random() * JOBS.length)];
        const payout = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

        this.database.addCurrency(userId, payout, 0, 'work', job);
        this.database.updateUser(userId, { last_work_at: Date.now() });
        this.addExperience(userId, 20);

        return {
            ok: true,
            message: `You ${job} and earned **${payout.toLocaleString()} coins**.`,
            payout,
            remaining: duration
        };
    }

    beg(userId) {
        const duration = 5 * 60 * 1000;
        const remaining = this.getCooldown(userId, 'last_beg_at', duration);

        if (remaining > 0) {
            return {
                ok: false,
                message: 'The townspeople need a break from your begging.',
                remaining
            };
        }

        this.database.updateUser(userId, { last_beg_at: Date.now() });

        if (Math.random() < 0.2) {
            this.addExperience(userId, 5);

            return {
                ok: true,
                message: 'Nobody gave you anything, but at least you tried.',
                payout: 0,
                remaining: duration
            };
        }

        const payout = Math.floor(Math.random() * 61) + 20;
        this.database.addCurrency(userId, payout, 0, 'beg');
        this.addExperience(userId, 5);

        return {
            ok: true,
            message: `A kind stranger gave you **${payout} coins**.`,
            payout,
            remaining: duration
        };
    }

    crime(userId) {
        const duration = 60 * 60 * 1000;
        const remaining = this.getCooldown(userId, 'last_crime_at', duration);

        if (remaining > 0) {
            return {
                ok: false,
                message: 'The guards are still watching you.',
                remaining
            };
        }

        const account = this.database.getUser(userId);
        this.database.updateUser(userId, { last_crime_at: Date.now() });

        if (Math.random() < 0.55) {
            const payout = Math.floor(Math.random() * 501) + 300;
            this.database.addCurrency(userId, payout, 0, 'crime', 'successful');
            this.addExperience(userId, 35);

            return {
                ok: true,
                message: `You got away with the crime and stole **${payout.toLocaleString()} coins**.`,
                payout,
                remaining: duration
            };
        }

        const loss = Math.min(account.coins, Math.floor(Math.random() * 121) + 80);

        if (loss > 0) {
            this.database.addCurrency(userId, -loss, 0, 'crime', 'caught');
        }

        this.addExperience(userId, 10);

        return {
            ok: true,
            message: loss > 0
                ? `You were caught and paid a **${loss.toLocaleString()} coin** fine.`
                : 'You were caught, but you had no coins to pay the fine.',
            payout: -loss,
            remaining: duration
        };
    }

    slots(userId) {
        const duration = 15 * 60 * 1000;
        const remaining = this.getCooldown(userId, 'last_slots_at', duration);

        if (remaining > 0) {
            return {
                ok: false,
                message: 'The slot machine needs a moment to cool down.',
                remaining
            };
        }

        const cost = 100;
        const account = this.database.getUser(userId);

        if (account.coins < cost) {
            return {
                ok: false,
                message: `You need at least **${cost} coins** to play slots.`,
                remaining: 0
            };
        }

        const symbols = [
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
        ];

        let grossPayout = 0;

        if (symbols.every(symbol => symbol === '7️⃣')) {
            grossPayout = 2500;
        } else if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
            grossPayout = 1000;
        } else if (
            symbols[0] === symbols[1] ||
            symbols[1] === symbols[2] ||
            symbols[0] === symbols[2]
        ) {
            grossPayout = 180;
        }

        const netPayout = grossPayout - cost;
        this.database.addCurrency(userId, netPayout, 0, 'slots', symbols.join(' '));
        this.database.updateUser(userId, { last_slots_at: Date.now() });

        return {
            ok: true,
            symbols,
            grossPayout,
            netPayout,
            remaining: duration
        };
    }

    buy(userId, itemId, quantity = 1) {
        const item = this.getItem(itemId);

        if (!item) {
            return {
                ok: false,
                message: 'That item does not exist in the shop.'
            };
        }

        const total = item.price * quantity;
        const account = this.database.addCurrency(
            userId,
            -total,
            0,
            'shop_buy',
            `${item.id}:${quantity}`
        );

        if (!account) {
            return {
                ok: false,
                message: `You need **${total.toLocaleString()} coins** to buy that quantity.`
            };
        }

        this.database.addItem(userId, item.id, quantity);

        return {
            ok: true,
            item,
            quantity,
            total,
            account
        };
    }

    sell(userId, itemId, quantity = 1) {
        const item = this.getItem(itemId);

        if (!item) {
            return {
                ok: false,
                message: 'That item does not exist in the shop.'
            };
        }

        if (!this.database.removeItem(userId, item.id, quantity)) {
            return {
                ok: false,
                message: `You do not have ${quantity} ${item.name}${quantity === 1 ? '' : 's'} to sell.`
            };
        }

        const total = item.sellPrice * quantity;
        const account = this.database.addCurrency(
            userId,
            total,
            0,
            'shop_sell',
            `${item.id}:${quantity}`
        );

        return {
            ok: true,
            item,
            quantity,
            total,
            account
        };
    }

    give(userId, targetId, coins, gems = 0) {
        const account = this.database.addCurrency(
            targetId,
            coins,
            gems,
            'admin_give',
            `by:${userId}`
        );

        return {
            ok: Boolean(account),
            account,
            message: account
                ? `Added ${coins.toLocaleString()} coins and ${gems.toLocaleString()} gems.`
                : 'Unable to add that currency.'
        };
    }

    take(userId, targetId, coins, gems = 0) {
        const account = this.database.addCurrency(
            targetId,
            -coins,
            -gems,
            'admin_take',
            `by:${userId}`
        );

        return {
            ok: Boolean(account),
            account,
            message: account
                ? `Removed ${coins.toLocaleString()} coins and ${gems.toLocaleString()} gems.`
                : 'The target does not have enough currency.'
        };
    }
}

module.exports = Economy;