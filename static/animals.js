// animals.js — percentage-based animal bonuses (repeatable purchases, cost scaling)
// Load after upgrades.js; uses gameState (game.js), formatMoney, saveGame, updateDisplay
//
// Per-type multiplier: 1 + (count × baseBonusPercent × milestoneMultiplier)
// milestoneMultiplier reserved for future animal milestones (default 1).

// Barn / housing: total animals cannot exceed capacity. Upgrade housing for more slots.
const HOUSING = {
    baseSlots: 8,
    slotsPerLevel: 6,
    baseCost: 150,
    costScaling: 1.32,
};

/** Refund when selling = this fraction of the price you paid for that individual. */
const ANIMAL_SELL_RATIO = 0.5;

const ANIMALS = [
    { id: 'chicken',   name: 'Chickens',       emoji: '🐔', baseBonusPercent: 0.02,  target: 'click',           baseCost: 25,    costScaling: 1.16 },
    { id: 'cow',       name: 'Cows',           emoji: '🐄', baseBonusPercent: 0.015, target: 'passiveIncome',   baseCost: 120,   costScaling: 1.17 },
    { id: 'sheep',     name: 'Sheep',          emoji: '🐑', baseBonusPercent: 0.01,  target: 'passiveUpgrades', baseCost: 400,   costScaling: 1.18 },
    { id: 'pig',       name: 'Pigs',           emoji: '🐷', baseBonusPercent: 0.005, target: 'global',         baseCost: 900,   costScaling: 1.19 },
    { id: 'bee',       name: 'Bees',           emoji: '🐝', baseBonusPercent: 0.008, target: 'global',          baseCost: 2500,  costScaling: 1.20 },
    { id: 'horse',     name: 'Horses',         emoji: '🐴', baseBonusPercent: 0.01,  target: 'tickSpeed',       baseCost: 8000,  costScaling: 1.21 },
    { id: 'fish',      name: 'Fish Ponds',     emoji: '🐟', baseBonusPercent: 0.02,  target: 'passiveIncome',   baseCost: 25000, costScaling: 1.22 },
    { id: 'exotic',    name: 'Exotic Beasts',  emoji: '🦄', baseBonusPercent: 0.05,  target: 'global',          baseCost: 100000, costScaling: 1.25 },
];

function getAnimalMilestoneMult(animalId) {
    return gameState.animalMilestoneMult?.[animalId] ?? 1;
}

function getAnimalLineMultiplier(animalDef) {
    const count = gameState.ownedAnimals?.[animalDef.id] || 0;
    const m = getAnimalMilestoneMult(animalDef.id);
    return 1 + count * animalDef.baseBonusPercent * m;
}

function getAnimalMultByTarget(target) {
    let mult = 1;
    for (const a of ANIMALS) {
        if (a.target === target) mult *= getAnimalLineMultiplier(a);
    }
    return mult;
}

function getAnimalClickMult() {
    return getAnimalMultByTarget('click');
}

/** Passive $/sec from cows + fish ponds (not sheep; sheep is baked into moneyPerSecond). */
function getAnimalPassiveIncomeMult() {
    return getAnimalMultByTarget('passiveIncome');
}

/** Multiplies passive crop generator output only (applied inside recalculatePassiveIncome). */
function getAnimalPassiveUpgradeMult() {
    return getAnimalMultByTarget('passiveUpgrades');
}

function getAnimalGlobalMult() {
    return getAnimalMultByTarget('global');
}

function getAnimalTickMult() {
    return getAnimalMultByTarget('tickSpeed');
}

function getAnimalCost(animal) {
    const owned = gameState.ownedAnimals?.[animal.id] || 0;
    const scaling = animal.costScaling ?? 1.15;
    const costMult = gameState.costMultiplier ?? 1;
    const raw = animal.baseCost * Math.pow(scaling, owned) * costMult;
    return (typeof window.applyEconomyCost === 'function')
        ? window.applyEconomyCost(raw)
        : Math.max(1, Math.floor(raw * 0.4));
}

function getVisibleAnimals() {
    return ANIMALS.filter((a, i) => {
        if (i === 0) return true;
        const prev = ANIMALS[i - 1];
        return (gameState.ownedAnimals?.[prev.id] || 0) >= 1;
    });
}

/** Price paid when count went from (owned-1) → owned — used for sell refund. */
function getAnimalPurchasePriceAtCount(animal, ownedCount) {
    if (ownedCount <= 0) return 0;
    const scaling = animal.costScaling ?? 1.15;
    const costMult = gameState.costMultiplier ?? 1;
    const raw = animal.baseCost * Math.pow(scaling, ownedCount - 1) * costMult;
    return (typeof window.applyEconomyCost === 'function')
        ? window.applyEconomyCost(raw)
        : Math.max(1, Math.floor(raw * 0.4));
}

function getAnimalSellValue(animal) {
    const owned = gameState.ownedAnimals?.[animal.id] || 0;
    if (owned <= 0) return 0;
    const paid = getAnimalPurchasePriceAtCount(animal, owned);
    return Math.floor(paid * ANIMAL_SELL_RATIO);
}

/**
 * Can't sell the last of a species if you still own any higher-tier animal
 * (same unlock chain as buying).
 */
function canSellAnimal(animalId) {
    const idx = ANIMALS.findIndex(a => a.id === animalId);
    if (idx < 0) return false;
    const c = gameState.ownedAnimals?.[animalId] || 0;
    if (c <= 0) return false;
    for (let j = idx + 1; j < ANIMALS.length; j++) {
        const hid = ANIMALS[j].id;
        if ((gameState.ownedAnimals?.[hid] || 0) > 0 && c <= 1) return false;
    }
    return true;
}

function sellAnimal(animalId) {
    const animal = ANIMALS.find(a => a.id === animalId);
    if (!animal || !canSellAnimal(animalId)) return;
    const refund = getAnimalSellValue(animal);
    if (!gameState.ownedAnimals) gameState.ownedAnimals = {};
    gameState.ownedAnimals[animalId] -= 1;
    if (gameState.ownedAnimals[animalId] <= 0) delete gameState.ownedAnimals[animalId];
    gameState.playerMoney += refund;
    recalculatePassiveIncome();
    saveGame();
    updateDisplay();
}

function buyAnimal(animalId) {
    const animal = ANIMALS.find(a => a.id === animalId);
    if (!animal) return;
    if (isAtAnimalCapacity(gameState)) return;
    const idx = ANIMALS.indexOf(animal);
    if (idx > 0) {
        const prev = ANIMALS[idx - 1];
        if ((gameState.ownedAnimals?.[prev.id] || 0) < 1) return;
    }
    const cost = getAnimalCost(animal);
    if (gameState.playerMoney < cost) return;

    gameState.playerMoney -= cost;
    if (!gameState.ownedAnimals) gameState.ownedAnimals = {};
    gameState.ownedAnimals[animalId] = (gameState.ownedAnimals[animalId] || 0) + 1;
    recalculatePassiveIncome();
    saveGame();
    updateDisplay();
}

function formatAnimalBonusLine(animal) {
    const pct = (animal.baseBonusPercent * 100 * getAnimalMilestoneMult(animal.id)).toFixed(1);
    const line = getAnimalLineMultiplier(animal);
    const totalPct = ((line - 1) * 100).toFixed(1);
    return { pct, totalPct };
}

function getTotalAnimalCount(gs) {
    let total = 0;
    for (const a of ANIMALS) total += (gs.ownedAnimals?.[a.id] || 0);
    return total;
}

function getMaxAnimalSlots(gs) {
    const lvl = gs.animalHousingLevel ?? 0;
    return HOUSING.baseSlots + lvl * HOUSING.slotsPerLevel;
}

/** If save has more animals than capacity (old saves), raise housing until it fits. */
function ensureAnimalHousingFits(gs) {
    let guard = 0;
    while (getTotalAnimalCount(gs) > getMaxAnimalSlots(gs) && guard < 500) {
        gs.animalHousingLevel = (gs.animalHousingLevel || 0) + 1;
        guard++;
    }
}

function getHousingUpgradeCost(gs) {
    const lvl = gs.animalHousingLevel ?? 0;
    const costMult = gs.costMultiplier ?? 1;
    const raw = HOUSING.baseCost * Math.pow(HOUSING.costScaling, lvl) * costMult;
    return (typeof window.applyEconomyCost === 'function')
        ? window.applyEconomyCost(raw)
        : Math.max(1, Math.floor(raw * 0.4));
}

function buyHousing() {
    const cost = getHousingUpgradeCost(gameState);
    if (gameState.playerMoney < cost) return;
    gameState.playerMoney -= cost;
    gameState.animalHousingLevel = (gameState.animalHousingLevel || 0) + 1;
    saveGame();
    updateDisplay();
}

function isAtAnimalCapacity(gs) {
    return getTotalAnimalCount(gs) >= getMaxAnimalSlots(gs);
}

function updateAnimalCapacityHint() {
    const el = document.getElementById('animal-capacity-hint');
    if (!el) return;
    const total = getTotalAnimalCount(gameState);
    const max = getMaxAnimalSlots(gameState);
    el.textContent = `Animal slots: ${total} / ${max}`;
}

function renderAnimalPen() {
    const container = document.getElementById('animal-pen-display');
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('animal-pen-empty');

    const total = getTotalAnimalCount(gameState);
    if (total === 0) {
        container.classList.add('animal-pen-empty');
        container.textContent = 'No animals yet — buy some above.';
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'animal-pen-chips';
    for (const a of ANIMALS) {
        const n = gameState.ownedAnimals?.[a.id] || 0;
        if (n <= 0) continue;
        const row = document.createElement('div');
        row.className = 'animal-pen-row';

        const chip = document.createElement('div');
        chip.className = 'animal-chip';
        chip.title = `${a.name}: ${n}`;
        chip.innerHTML = `<span class="animal-chip-emoji">${a.emoji}</span><span class="animal-chip-count">×${n}</span>`;

        const sellVal = getAnimalSellValue(a);
        const canSell = canSellAnimal(a.id);
        const sellBtn = document.createElement('button');
        sellBtn.type = 'button';
        sellBtn.className = 'animal-sell-btn' + (canSell ? '' : ' animal-sell-btn-disabled');
        sellBtn.textContent = canSell ? `Sell +${formatMoney(sellVal)}` : 'Locked';
        sellBtn.title = canSell
            ? `Sell 1 for ~${Math.round(ANIMAL_SELL_RATIO * 100)}% of its purchase price`
            : 'Sell higher-tier animals first, or you only have 1 and need it for unlocked species';
        if (canSell) {
            sellBtn.onclick = (e) => {
                e.stopPropagation();
                sellAnimal(a.id);
            };
        }

        row.appendChild(chip);
        row.appendChild(sellBtn);
        wrap.appendChild(row);
    }
    container.appendChild(wrap);
}

function renderHousing() {
    const container = document.getElementById('animal-housing-list');
    if (!container) return;
    container.innerHTML = '';

    const lvl = gameState.animalHousingLevel ?? 0;
    const cost = getHousingUpgradeCost(gameState);
    const canAfford = gameState.playerMoney >= cost;
    const nextSlots = getMaxAnimalSlots(gameState) + HOUSING.slotsPerLevel;

    const card = document.createElement('div');
    card.className = 'upgrade-card housing-card ' + (canAfford ? 'can-afford' : 'cant-afford');
    card.onclick = () => buyHousing();
    card.innerHTML = `
        <span class="upgrade-name">🏚️ Expand barn</span>
        <span class="upgrade-level">Lv ${lvl}</span>
        <span class="upgrade-cost">💰 ${formatMoney(cost)}</span>
        <span class="upgrade-rate">+${HOUSING.slotsPerLevel} slots (max ${nextSlots})</span>
    `;
    container.appendChild(card);
}

function renderAnimals() {
    const container = document.getElementById('animal-upgrades-list');
    if (!container) return;
    container.innerHTML = '';

    const atCap = isAtAnimalCapacity(gameState);

    for (const animal of getVisibleAnimals()) {
        const owned = gameState.ownedAnimals?.[animal.id] || 0;
        const cost = getAnimalCost(animal);
        const canAfford = gameState.playerMoney >= cost;
        const { pct, totalPct } = formatAnimalBonusLine(animal);

        const targetLabel = {
            click: 'click',
            passiveIncome: 'passive $/s',
            passiveUpgrades: 'crop buildings',
            global: 'all income',
            tickSpeed: 'passive tick',
        }[animal.target] || animal.target;

        const card = document.createElement('div');
        let cls = 'upgrade-card animal-card ';
        if (atCap) cls += 'at-animal-cap ';
        else cls += (canAfford ? 'can-afford' : 'cant-afford');
        card.className = cls;
        if (!atCap) card.onclick = () => buyAnimal(animal.id);
        else card.onclick = null;

        let extra = '';
        if (atCap) {
            extra = '<span class="upgrade-requirement">Housing full — expand barn below</span>';
        }

        card.innerHTML = `
            <span class="upgrade-name">${animal.emoji} ${animal.name}</span>
            <span class="upgrade-level">×${owned}</span>
            <span class="upgrade-cost">💰 ${formatMoney(cost)}</span>
            <span class="upgrade-rate">+${pct}%/${targetLabel} · Σ +${totalPct}%</span>
            ${extra}
        `;
        container.appendChild(card);
    }

    updateAnimalCapacityHint();
    renderAnimalPen();
    renderHousing();
}
