// game.js — core game loop for Harvest Valley
// Load order: upgrades.js → prestige.js → save.js → game.js

// ── Game state ────────────────────────────────────────────────────────────
const gameState = {
    playerMoney: 0,
    totalEarned: 0,
    totalClickCount: 0,
    moneyPerClick: 1,
    moneyPerSecond: 0,
    productionMultiplier: 1,
    prestigeCount: 0,
    prestigeMultiplier: 1,
    ownedUpgrades: {},
    purchasedMilestones: []
};

// ── Number formatting ─────────────────────────────────────────────────────
function formatMoney(amount) {
    if (amount >= 1e9) return '$' + (amount / 1e9).toFixed(2) + 'B';
    if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(2) + 'M';
    if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(2) + 'K';
    if (amount < 1 && amount > 0) return '$' + amount.toFixed(2);
    return '$' + Math.floor(amount);
}

// ── Harvest click handler ─────────────────────────────────────────────────
function handleHarvest(event) {
    const earned = gameState.moneyPerClick
                 * gameState.productionMultiplier
                 * gameState.prestigeMultiplier;

    gameState.playerMoney    += earned;
    gameState.totalEarned    += earned;
    gameState.totalClickCount += 1;

    // Restart bounce animation
    const btn = document.getElementById('harvest-btn');
    btn.classList.remove('bounce');
    void btn.offsetWidth; // force reflow so animation restarts
    btn.classList.add('bounce');

    // Floating money label
    spawnFloatingText(event.clientX, event.clientY, '+' + formatMoney(earned));

    updateDisplay();
}

// Animate a floating "+$X" label at screen position (x, y)
function spawnFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = (x - 20) + 'px';
    el.style.top  = (y - 30) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ── Passive income tick ───────────────────────────────────────────────────
// Runs every 1000ms. Adds one second of passive income.
function passiveTick() {
    if (gameState.moneyPerSecond === 0) return;
    const earned = gameState.moneyPerSecond
                 * gameState.productionMultiplier
                 * gameState.prestigeMultiplier;
    gameState.playerMoney += earned;
    gameState.totalEarned += earned;
    updateDisplay();
}

// ── Display update ────────────────────────────────────────────────────────
// Re-renders all UI from current gameState. Called after every state change.
function updateDisplay() {
    // Header counters
    document.getElementById('money-counter').textContent = formatMoney(gameState.playerMoney);

    const effectiveMps = gameState.moneyPerSecond
                       * gameState.productionMultiplier
                       * gameState.prestigeMultiplier;
    document.getElementById('income-counter').textContent = formatMoney(effectiveMps) + '/sec';

    // Click value label under harvest button
    const effectiveClick = gameState.moneyPerClick
                         * gameState.productionMultiplier
                         * gameState.prestigeMultiplier;
    document.getElementById('click-value-display').textContent =
        '+' + formatMoney(effectiveClick) + ' / click';

    // Prestige badge in header
    const prestigeDisplay = document.getElementById('prestige-display');
    if (gameState.prestigeCount > 0) {
        prestigeDisplay.style.display = 'inline';
        document.getElementById('prestige-count').textContent = gameState.prestigeCount;
    } else {
        prestigeDisplay.style.display = 'none';
    }

    // Rebirth button visibility (prestige.js)
    updateRebirthButton();

    // Sidebar (upgrades.js)
    renderUpgrades();
}

// ── Page load sequence ────────────────────────────────────────────────────
window.addEventListener('load', () => {
    loadGame();                   // restore state from localStorage
    recalculatePassiveIncome();   // rebuild moneyPerSecond from owned upgrades
    updateDisplay();              // render everything

    setInterval(passiveTick, 1000);   // passive income: every 1 second
    setInterval(saveGame,    10000);  // auto-save: every 10 seconds
});
