// upgrades.js — upgrade definitions, purchase logic, and sidebar rendering
// Depends on: gameState, formatMoney (game.js), saveGame (save.js), updateDisplay (game.js)

// ── Passive upgrade definitions ───────────────────────────────────────────
// Repeatable generators. Cost scales by 1.15^owned after each purchase.
const PASSIVE_UPGRADES = [
    { id: 'scarecrow',   name: 'Scarecrow',          emoji: '🪆', baseCost: 15,    baseRate: 0.1  },
    { id: 'tractor',     name: 'Tractor',             emoji: '🚜', baseCost: 100,   baseRate: 1    },
    { id: 'irrigation',  name: 'Irrigation System',   emoji: '💧', baseCost: 500,   baseRate: 5    },
    { id: 'greenhouse',  name: 'Greenhouse',          emoji: '🏡', baseCost: 2000,  baseRate: 20   },
    { id: 'windmill',    name: 'Windmill',            emoji: '🌬️', baseCost: 10000, baseRate: 100  },
];

// ── Milestone upgrade definitions ─────────────────────────────────────────
// One-time purchases. Locked until isUnlocked(gameState) returns true.
const MILESTONE_UPGRADES = [
    {
        id: 'almanac',
        name: "Farmer's Almanac",
        emoji: '📖',
        cost: 50,
        requirementText: '10 total clicks',
        isUnlocked: (gs) => gs.totalClickCount >= 10,
        applyEffect: (gs) => { gs.moneyPerClick += 1; },
        effectText: '+1 base click value',
    },
    {
        id: 'goldenTractor',
        name: 'Golden Tractor',
        emoji: '🥇',
        cost: 5000,
        requirementText: 'Own 10 tractors',
        isUnlocked: (gs) => (gs.ownedUpgrades['tractor'] || 0) >= 10,
        applyEffect: (gs) => { gs.productionMultiplier *= 2; },
        effectText: '2× production',
    },
    {
        id: 'cropWhisperer',
        name: 'Crop Whisperer',
        emoji: '🌽',
        cost: 2500,
        requirementText: '$10,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 10000,
        applyEffect: (gs) => { gs.moneyPerClick *= 3; },
        effectText: '3× click value',
    },
    {
        id: 'harvestFestival',
        name: 'Harvest Festival',
        emoji: '🎪',
        cost: 25000,
        requirementText: 'Own 5 greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 5,
        applyEffect: (gs) => { gs.productionMultiplier *= 2; },
        effectText: '2× passive income',
    },
    {
        id: 'legendaryBarn',
        name: 'Legendary Barn',
        emoji: '🏚️',
        cost: 50000,
        requirementText: '1+ prestige',
        isUnlocked: (gs) => gs.prestigeCount >= 1,
        applyEffect: (gs) => { gs.productionMultiplier *= 1.5; },
        effectText: '1.5× global multiplier',
    },
];

// ── Cost calculation ──────────────────────────────────────────────────────
// Returns the current purchase cost for a passive upgrade
function getUpgradeCost(upgrade) {
    const owned = gameState.ownedUpgrades[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(1.15, owned));
}

// ── Passive income recalculation ──────────────────────────────────────────
// Sums base rates of all owned generators. Call after every upgrade purchase.
function recalculatePassiveIncome() {
    let total = 0;
    for (const upgrade of PASSIVE_UPGRADES) {
        const owned = gameState.ownedUpgrades[upgrade.id] || 0;
        total += upgrade.baseRate * owned;
    }
    gameState.moneyPerSecond = total;
}

// ── Buy a passive upgrade ─────────────────────────────────────────────────
function buyUpgrade(upgradeId) {
    const upgrade = PASSIVE_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    const cost = getUpgradeCost(upgrade);
    if (gameState.playerMoney < cost) return;

    gameState.playerMoney -= cost;
    gameState.ownedUpgrades[upgradeId] = (gameState.ownedUpgrades[upgradeId] || 0) + 1;
    recalculatePassiveIncome();
    saveGame();
    updateDisplay();
}

// ── Buy a milestone upgrade ───────────────────────────────────────────────
function buyMilestone(milestoneId) {
    const milestone = MILESTONE_UPGRADES.find(m => m.id === milestoneId);
    if (!milestone) return;
    if (gameState.purchasedMilestones.includes(milestoneId)) return;
    if (!milestone.isUnlocked(gameState)) return;
    if (gameState.playerMoney < milestone.cost) return;

    gameState.playerMoney -= milestone.cost;
    milestone.applyEffect(gameState);
    gameState.purchasedMilestones.push(milestoneId);
    saveGame();
    updateDisplay();
}

// ── Render sidebar ────────────────────────────────────────────────────────
// Called by updateDisplay(). Re-renders both upgrade sections from scratch.
function renderUpgrades() {
    renderPassiveUpgrades();
    renderMilestones();
}

function renderPassiveUpgrades() {
    const container = document.getElementById('passive-upgrades-list');
    container.innerHTML = '';

    for (const upgrade of PASSIVE_UPGRADES) {
        const owned = gameState.ownedUpgrades[upgrade.id] || 0;
        const cost = getUpgradeCost(upgrade);
        const canAfford = gameState.playerMoney >= cost;

        const card = document.createElement('div');
        card.className = 'upgrade-card ' + (canAfford ? 'can-afford' : 'cant-afford');
        card.onclick = () => buyUpgrade(upgrade.id);
        card.innerHTML = `
            <span class="upgrade-name">${upgrade.emoji} ${upgrade.name}</span>
            <span class="upgrade-level">Lv ${owned}</span>
            <span class="upgrade-cost">💰 ${formatMoney(cost)}</span>
            <span class="upgrade-rate">+${upgrade.baseRate}/s each</span>
        `;
        container.appendChild(card);
    }
}

function renderMilestones() {
    const container = document.getElementById('milestone-upgrades-list');
    container.innerHTML = '';

    for (const milestone of MILESTONE_UPGRADES) {
        const purchased = gameState.purchasedMilestones.includes(milestone.id);
        const unlocked  = milestone.isUnlocked(gameState);
        const canAfford = gameState.playerMoney >= milestone.cost;

        let cardClass = 'upgrade-card';
        if (purchased)       cardClass += ' purchased';
        else if (!unlocked)  cardClass += ' locked';
        else if (!canAfford) cardClass += ' cant-afford';
        else                 cardClass += ' can-afford';

        const card = document.createElement('div');
        card.className = cardClass;
        if (!purchased && unlocked) card.onclick = () => buyMilestone(milestone.id);

        const icon = purchased ? '✅' : (unlocked ? '🔓' : '🔒');
        let bottomRow;
        if (purchased) {
            bottomRow = `<span class="upgrade-effect">${milestone.effectText}</span>`;
        } else if (!unlocked) {
            bottomRow = `<span class="upgrade-requirement">Requires: ${milestone.requirementText}</span>`;
        } else {
            bottomRow = `<span class="upgrade-cost">💰 ${formatMoney(milestone.cost)}</span>`;
        }

        card.innerHTML = `
            <span class="upgrade-name">${icon} ${milestone.emoji} ${milestone.name}</span>
            <span class="upgrade-level">${purchased ? 'Owned' : ''}</span>
            ${bottomRow}
        `;
        container.appendChild(card);
    }
}
