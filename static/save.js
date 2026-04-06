// save.js — localStorage persistence
// Depends on: gameState (declared in game.js)

const SAVE_KEY = 'farmGameSave';

// Default values — used for safe-merge and fresh resets
const DEFAULT_STATE = {
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

// Serialize gameState to localStorage
function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

// Load saved state into gameState. Missing keys fall back to DEFAULT_STATE values.
function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
        const saved = JSON.parse(raw);
        for (const key of Object.keys(DEFAULT_STATE)) {
            if (key in saved) {
                gameState[key] = saved[key];
            }
        }
    } catch (e) {
        console.warn('Save data corrupt — starting fresh.', e);
    }
}

// Wipe save and reinitialize gameState to defaults (called by prestige.js)
function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    for (const key of Object.keys(DEFAULT_STATE)) {
        gameState[key] = JSON.parse(JSON.stringify(DEFAULT_STATE[key]));
    }
}
