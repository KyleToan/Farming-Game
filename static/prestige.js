// prestige.js — rebirth/prestige system
// Depends on: gameState (game.js), formatMoney (game.js), resetGame/saveGame (save.js),
//             renderUpgrades (upgrades.js), updateDisplay (game.js)

const PRESTIGE_EARNINGS_DIVISOR = 1e6;

// How many prestige points are available given current totalEarned (this run)
function getPrestigePointsAvailable() {
    return Math.floor(Math.sqrt(gameState.totalEarned / PRESTIGE_EARNINGS_DIVISOR));
}

/** Total earned needed to have (points+1) points — next threshold. */
function getNextPrestigePointThreshold(currentPoints) {
    return (currentPoints + 1) ** 2 * PRESTIGE_EARNINGS_DIVISOR;
}

function openRebirthModal() {
    const modal = document.getElementById('rebirth-modal');
    const body = document.getElementById('rebirth-modal-body');
    const confirmBtn = document.getElementById('rebirth-modal-confirm');
    if (!modal || !body || !confirmBtn) return;

    const fmt = typeof formatMoney === 'function' ? formatMoney : (x) => '$' + Math.floor(x);
    const te = gameState.totalEarned;
    const points = getPrestigePointsAvailable();
    const nextTh = getNextPrestigePointThreshold(points);
    const remToNext = Math.max(0, nextTh - te);

    let html = '';
    html += '<section class="modal-section"><h3>Requirements</h3>';
    html += '<p>Prestige points come from <strong>total earnings this run</strong> (every dollar you’ve earned since your last rebirth, including what you spent).</p>';
    html += '<p class="modal-formula">points = floor( √( total earned ÷ $1,000,000 ) )</p>';
    html += '<ul class="modal-list">';
    html += '<li><strong>1 point</strong> — need <strong>$1,000,000</strong> total earned</li>';
    html += '<li><strong>2 points</strong> — need <strong>$4,000,000</strong></li>';
    html += '<li><strong>3 points</strong> — need <strong>$9,000,000</strong> (pattern: <strong>n² × $1M</strong> for n points)</li>';
    html += '</ul>';
    html += '<p class="modal-note">You need <strong>at least 1 point</strong> before you can rebirth.</p>';
    html += '</section>';

    html += '<section class="modal-section"><h3>Your progress</h3>';
    html += `<p>Total earned this run: <strong>${fmt(te)}</strong></p>`;
    html += `<p>Prestige points available: <strong>${points}</strong></p>`;

    if (points < 1) {
        const need = PRESTIGE_EARNINGS_DIVISOR;
        const more = Math.max(0, need - te);
        html += `<p class="modal-warning">Earn <strong>${fmt(more)}</strong> more to reach $1,000,000 total and get your <strong>first</strong> prestige point.</p>`;
    } else {
        const bonusPercent = (points * 10).toFixed(0);
        const newMult = (gameState.prestigeMultiplier + points * 0.10).toFixed(2);
        html += `<p>Next rebirth uses <strong>${points}</strong> point(s): <strong>+${bonusPercent}%</strong> effective earnings, prestige multiplier <strong>${newMult}×</strong>.</p>`;
        html += `<p class="modal-muted">Next prestige point unlocks at <strong>${fmt(nextTh)}</strong> total earned (${fmt(remToNext)} to go for an extra point).</p>`;
    }
    html += '</section>';

    html += '<section class="modal-section"><h3>After rebirth</h3>';
    html += '<ul class="modal-list">';
    html += '<li><strong>Resets:</strong> money, passive upgrades, milestones, animals, housing</li>';
    html += '<li><strong>Keeps:</strong> prestige multiplier (permanent) and prestige count</li>';
    html += '</ul></section>';

    body.innerHTML = html;
    confirmBtn.style.display = points >= 1 ? 'inline-block' : 'none';
    modal.hidden = false;
}

function closeRebirthModal() {
    const modal = document.getElementById('rebirth-modal');
    if (modal) modal.hidden = true;
}

// Show/hide and label the header rebirth button
function updateRebirthButton() {
    const btn = document.getElementById('rebirth-btn');
    if (!btn) return;
    const points = getPrestigePointsAvailable();
    btn.style.display = 'inline-flex';
    if (points >= 1) {
        btn.textContent = `✨ Rebirth (${points} pt${points > 1 ? 's' : ''})`;
        btn.classList.add('rebirth-ready');
        btn.title = 'Open rebirth — you have enough prestige points';
    } else {
        btn.textContent = '✨ Rebirth';
        btn.classList.remove('rebirth-ready');
        btn.title = 'Open rebirth — see requirements (need $1M total earned for 1st point)';
    }
}

// Execute prestige reset (called from modal when ready)
function confirmPrestige() {
    const points = getPrestigePointsAvailable();
    if (points < 1) return;

    const bonusPercent = (points * 10).toFixed(0);
    const newMultiplier = (gameState.prestigeMultiplier + points * 0.10).toFixed(2);
    const confirmed = window.confirm(
        `Rebirth now for ${points} prestige point${points > 1 ? 's' : ''}?\n\n` +
        `Gain: +${bonusPercent}% permanent earnings\n` +
        `New prestige multiplier: ${newMultiplier}×\n\n` +
        `Your run will reset (money, upgrades, milestones, animals, housing).`
    );
    if (!confirmed) return;

    closeRebirthModal();

    const newPrestigeCount = gameState.prestigeCount + 1;
    const newPrestigeMultiplier = gameState.prestigeMultiplier + points * 0.10;

    resetGame();

    gameState.prestigeCount = newPrestigeCount;
    gameState.prestigeMultiplier = newPrestigeMultiplier;

    if (typeof recalculatePassiveIncome === 'function') recalculatePassiveIncome();
    saveGame();
    renderUpgrades();
    updateDisplay();
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('rebirth-modal');
    if (modal && !modal.hidden) closeRebirthModal();
});
