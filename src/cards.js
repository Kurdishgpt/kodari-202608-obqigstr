const { createCanvas, loadImage } = require('@napi-rs/canvas');

function roundedRect(context, x, y, width, height, radius) {
    const corner = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + corner, y);
    context.lineTo(x + width - corner, y);
    context.arcTo(x + width, y, x + width, y + corner, corner);
    context.lineTo(x + width, y + height - corner);
    context.arcTo(x + width, y + height, x + width - corner, y + height, corner);
    context.lineTo(x + corner, y + height);
    context.arcTo(x, y + height, x, y + height - corner, corner);
    context.lineTo(x, y + corner);
    context.arcTo(x, y, x + corner, y, corner);
    context.closePath();
}

function drawText(context, text, x, y, size, color, weight = 'normal') {
    context.font = `${weight} ${size}px sans-serif`;
    context.fillStyle = color;
    context.fillText(text, x, y);
}

async function createProfileCard(user, account) {
    const canvas = createCanvas(1000, 430);
    const context = canvas.getContext('2d');

    const background = context.createLinearGradient(0, 0, 1000, 430);
    background.addColorStop(0, '#17152b');
    background.addColorStop(1, '#34205d');
    context.fillStyle = background;
    context.fillRect(0, 0, 1000, 430);

    context.fillStyle = 'rgba(255, 255, 255, 0.04)';
    context.beginPath();
    context.arc(880, 40, 230, 0, Math.PI * 2);
    context.fill();

    roundedRect(context, 38, 38, 924, 354, 24);
    context.fillStyle = 'rgba(8, 7, 20, 0.55)';
    context.fill();

    const avatarX = 100;
    const avatarY = 111;
    const avatarSize = 180;

    context.save();
    context.beginPath();
    context.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    context.clip();

    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
        context.fillStyle = '#7c5cff';
        context.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        drawText(context, user.username.charAt(0).toUpperCase(), avatarX + 65, avatarY + 125, 76, '#ffffff', 'bold');
    }

    context.restore();

    drawText(context, user.username, 330, 105, 42, '#ffffff', 'bold');
    drawText(context, `Level ${account.level}`, 330, 145, 24, '#c7b8ff');

    const progress = Math.min(1, account.xp / Math.max(1, account.level * 100));
    roundedRect(context, 330, 170, 570, 22, 11);
    context.fillStyle = '#4a3d75';
    context.fill();

    roundedRect(context, 330, 170, 570 * progress, 22, 11);
    context.fillStyle = '#a989ff';
    context.fill();

    drawText(
        context,
        `${account.xp}/${account.level * 100} XP`,
        330,
        220,
        18,
        '#d7ceff'
    );

    drawText(context, 'COINS', 330, 275, 16, '#a99bcf', 'bold');
    drawText(context, account.coins.toLocaleString(), 330, 315, 34, '#ffd166', 'bold');

    drawText(context, 'GEMS', 620, 275, 16, '#a99bcf', 'bold');
    drawText(context, account.gems.toLocaleString(), 620, 315, 34, '#7ee7ff', 'bold');

    drawText(context, 'Kodari Economy', 330, 362, 18, '#8f82b9');

    return canvas.toBuffer('image/png');
}

async function createLeaderboardCard(rows, users) {
    const canvas = createCanvas(1000, 700);
    const context = canvas.getContext('2d');

    const background = context.createLinearGradient(0, 0, 1000, 700);
    background.addColorStop(0, '#151426');
    background.addColorStop(1, '#29204c');
    context.fillStyle = background;
    context.fillRect(0, 0, 1000, 700);

    drawText(context, 'KODARI LEADERBOARD', 70, 85, 38, '#ffffff', 'bold');
    drawText(context, 'The richest players in the economy', 72, 120, 20, '#bdb2df');

    const medals = ['🥇', '🥈', '🥉'];

    rows.forEach((row, index) => {
        const y = 160 + index * 48;
        const user = users[index];
        const name = user ? user.username : `User ${row.user_id.slice(-6)}`;

        roundedRect(context, 60, y - 30, 880, 40, 12);
        context.fillStyle = index < 3 ? 'rgba(255, 209, 102, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        context.fill();

        drawText(
            context,
            medals[index] || `#${index + 1}`,
            82,
            y,
            index < 3 ? 22 : 18,
            '#ffffff',
            'bold'
        );
        drawText(context, name.slice(0, 24), 150, y, 20, '#ffffff');
        drawText(context, `Level ${row.level}`, 620, y, 18, '#bdb2df');
        drawText(context, `${row.coins.toLocaleString()} coins`, 760, y, 18, '#ffd166', 'bold');
    });

    drawText(context, 'Use /balance to view your own account', 70, 650, 18, '#9387b7');

    return canvas.toBuffer('image/png');
}

module.exports = {
    createProfileCard,
    createLeaderboardCard
};