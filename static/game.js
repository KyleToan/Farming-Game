// game.js — core game loop for Harvest Valley
// Load order: upgrades.js → prestige.js → save.js → game.js

// ── Game state ────────────────────────────────────────────────────────────
// Single source of truth for all game data. Persisted via save.js.
const gameState = {
    playerMoney: 0,
    totalEarned: 0,
    totalClickCount: 0,    // never resets — used by milestone checks
    moneyPerClick: 1,
    moneyPerSecond: 0,     // recalculated by recalculatePassiveIncome()
    productionMultiplier: 1,
    prestigeCount: 0,
    prestigeMultiplier: 1, // persists across rebirths
    ownedUpgrades: {},
    purchasedMilestones: []
};

// ── Number formatting ─────────────────────────────────────────────────────
function formatMoney(amount) {
    if (amount >= 1e9) return '$' + (amount / 1e9).toFixed(2) + 'B';
    if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(2) + 'M';
    if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(2) + 'K';
    return '$' + Math.floor(amount);
}
