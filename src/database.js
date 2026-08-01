const fs = require('fs');
const path = require('path');
const DatabaseDriver = require('better-sqlite3');

const USER_FIELDS = new Set([
    'coins',
    'gems',
    'bank',
    'daily_streak',
    'daily_claimed_at',
    'last_work_at',
    'last_beg_at',
    'last_crime_at',
    'last_slots_at',
    'xp',
    'level'
]);

class Database {
    constructor(filename) {
        fs.mkdirSync(path.dirname(filename), { recursive: true });

        this.db = new DatabaseDriver(filename);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                coins INTEGER NOT NULL DEFAULT 0,
                gems INTEGER NOT NULL DEFAULT 0,
                bank INTEGER NOT NULL DEFAULT 0,
                daily_streak INTEGER NOT NULL DEFAULT 0,
                daily_claimed_at INTEGER NOT NULL DEFAULT 0,
                last_work_at INTEGER NOT NULL DEFAULT 0,
                last_beg_at INTEGER NOT NULL DEFAULT 0,
                last_crime_at INTEGER NOT NULL DEFAULT 0,
                last_slots_at INTEGER NOT NULL DEFAULT 0,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            );

            CREATE TABLE IF NOT EXISTS inventory (
                user_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, item_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                coins_delta INTEGER NOT NULL DEFAULT 0,
                gems_delta INTEGER NOT NULL DEFAULT 0,
                coins_after INTEGER NOT NULL,
                gems_after INTEGER NOT NULL,
                metadata TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        `);
    }

    ensureUser(userId) {
        this.db.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').run(userId);
    }

    getUser(userId) {
        this.ensureUser(userId);
        return this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    }

    updateUser(userId, fields) {
        this.ensureUser(userId);

        const entries = Object.entries(fields)
            .filter(([key, value]) => USER_FIELDS.has(key) && value !== undefined);

        if (entries.length === 0) {
            return this.getUser(userId);
        }

        const assignments = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const values = { user_id: userId };

        for (const [key, value] of entries) {
            values[key] = value;
        }

        this.db.prepare(`UPDATE users SET ${assignments} WHERE user_id = @user_id`).run(values);
        return this.getUser(userId);
    }

    addCurrency(userId, coinsDelta = 0, gemsDelta = 0, type = 'unknown', metadata = '') {
        this.ensureUser(userId);

        const transaction = this.db.transaction(() => {
            const user = this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
            const coins = user.coins + coinsDelta;
            const gems = user.gems + gemsDelta;

            if (coins < 0 || gems < 0) {
                return false;
            }

            this.db.prepare(`
                UPDATE users
                SET coins = ?, gems = ?
                WHERE user_id = ?
            `).run(coins, gems, userId);

            this.db.prepare(`
                INSERT INTO transactions (
                    user_id,
                    type,
                    coins_delta,
                    gems_delta,
                    coins_after,
                    gems_after,
                    metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(userId, type, coinsDelta, gemsDelta, coins, gems, metadata);

            return true;
        });

        if (!transaction()) {
            return null;
        }

        return this.getUser(userId);
    }

    addItem(userId, itemId, quantity = 1) {
        this.ensureUser(userId);

        this.db.prepare(`
            INSERT INTO inventory (user_id, item_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, item_id)
            DO UPDATE SET quantity = quantity + excluded.quantity
        `).run(userId, itemId, quantity);

        return this.getItemQuantity(userId, itemId);
    }

    removeItem(userId, itemId, quantity = 1) {
        this.ensureUser(userId);

        const transaction = this.db.transaction(() => {
            const item = this.db.prepare(`
                SELECT quantity
                FROM inventory
                WHERE user_id = ? AND item_id = ?
            `).get(userId, itemId);

            if (!item || item.quantity < quantity) {
                return false;
            }

            if (item.quantity === quantity) {
                this.db.prepare(`
                    DELETE FROM inventory
                    WHERE user_id = ? AND item_id = ?
                `).run(userId, itemId);
            } else {
                this.db.prepare(`
                    UPDATE inventory
                    SET quantity = quantity - ?
                    WHERE user_id = ? AND item_id = ?
                `).run(quantity, userId, itemId);
            }

            return true;
        });

        return transaction();
    }

    getItemQuantity(userId, itemId) {
        const item = this.db.prepare(`
            SELECT quantity
            FROM inventory
            WHERE user_id = ? AND item_id = ?
        `).get(userId, itemId);

        return item ? item.quantity : 0;
    }

    getInventory(userId) {
        this.ensureUser(userId);

        return this.db.prepare(`
            SELECT item_id, quantity
            FROM inventory
            WHERE user_id = ? AND quantity > 0
            ORDER BY item_id
        `).all(userId);
    }

    getLeaderboard(limit = 10) {
        return this.db.prepare(`
            SELECT user_id, coins, gems, level, xp
            FROM users
            ORDER BY coins DESC, level DESC
            LIMIT ?
        `).all(limit);
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;