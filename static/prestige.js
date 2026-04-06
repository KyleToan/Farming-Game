// prestige.js — rebirth/prestige system
// Depends on: gameState (game.js), resetGame/saveGame (save.js),
//             renderUpgrades (upgrades.js), updateDisplay (game.js)

// How many prestige points are available given current totalEarned
function getPrestigePointsAvailable() {
    return Math.floor(Math.sqrt(gameState.totalEarned / 1e6));
}

// Show/hide and label the rebirth button based on available points
function updateRebirthButton() {
    const btn = document.getElementById('rebirth-btn');
    const points = getPrestigePointsAvailable();
    if (points >= 1) {
        btn.style.display = 'block';
        btn.textContent = `✨ Rebirth (+${points} point${points > 1 ? 's' : ''})`;
    } else {
        btn.style.display = 'none';
    }
}

// Prompt the player and execute the prestige reset
function confirmPrestige() {
    const points = getPrestigePointsAvailable();
    if (points < 1) return;

    const bonusPercent = (points * 10).toFixed(0);
    const newMultiplier = (gameState.prestigeMultiplier + points * 0.10).toFixed(2);
    const confirmed = window.confirm(
        `Rebirth for ${points} prestige point${points > 1 ? 's' : ''}?\n\n` +
        `Gain: +${bonusPercent}% permanent earnings multiplier\n` +
        `New prestige multiplier: ${newMultiplier}×\n\n` +
        `All money and upgrades reset. Prestige multiplier persists.`
    );
    if (!confirmed) return;

    // Capture values to persist before reset wipes gameState
    const newPrestigeCount      = gameState.prestigeCount + 1;
    const newPrestigeMultiplier = gameState.prestigeMultiplier + points * 0.10;

    // Wipe run state
    resetGame();

    // Restore prestige-persistent values
    gameState.prestigeCount      = newPrestigeCount;
    gameState.prestigeMultiplier = newPrestigeMultiplier;

    saveGame();
    renderUpgrades();
    updateDisplay();
}
