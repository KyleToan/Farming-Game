# Farming Idle Clicker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Stardew Valley-themed farming idle clicker game served by Flask with click harvesting, passive income, milestone upgrades, and a prestige/rebirth system.

**Architecture:** Flask serves `index.html` via `GET /`; all game logic runs in the browser via `game.js`, `upgrades.js`, `prestige.js`, and `save.js`; state persists in `localStorage`. No API calls — Flask is a static file server.

**Tech Stack:** Python 3 + Flask, vanilla HTML/CSS/JS, Google Fonts (VT323), localStorage

---

## File Map

| File | Responsibility |
|---|---|
| `app.py` | Flask server — one route, serves `index.html` |
| `templates/index.html` | DOM skeleton, script/CSS links |
| `static/style.css` | All styling — Stardew Valley theme, animations |
| `static/save.js` | `saveGame()`, `loadGame()`, `resetGame()`, `DEFAULT_STATE` |
| `static/upgrades.js` | Upgrade data, purchase logic, sidebar rendering |
| `static/prestige.js` | Rebirth calculations, rebirth button, `confirmPrestige()` |
| `static/game.js` | `gameState`, `formatMoney()`, click handler, passive tick, `updateDisplay()`, page load |

Script load order in `index.html`: `upgrades.js` → `prestige.js` → `save.js` → `game.js`

---

## Task 1: Flask Server + Project Structure

**Files:**
- Create: `app.py`
- Create: `requirements.txt`
- Create: `templates/` (directory)
- Create: `static/` (directory)

- [ ] **Step 1: Create folder structure**

```bash
cd "C:/Users/ktoan/OneDrive/Desktop/Farm-Game-main/Farming-Game"
mkdir -p templates static
```

- [ ] **Step 2: Create `requirements.txt`**

```
flask
```

- [ ] **Step 3: Install Flask**

```bash
pip install flask
```

Expected output: `Successfully installed flask-...`

- [ ] **Step 4: Write `app.py`**

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
```

- [ ] **Step 5: Write a minimal Flask test**

Create `test_app.py`:

```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_returns_200(client):
    response = client.get('/')
    assert response.status_code == 200
```

- [ ] **Step 6: Create a placeholder `templates/index.html` so the test passes**

```html
<!DOCTYPE html>
<html><body>ok</body></html>
```

- [ ] **Step 7: Run the test**

```bash
pytest test_app.py -v
```

Expected:
```
test_app.py::test_index_returns_200 PASSED
```

- [ ] **Step 8: Commit**

```bash
git add app.py requirements.txt test_app.py templates/index.html
git commit -m "feat: add Flask server with index route"
```

---

## Task 2: HTML Skeleton

**Files:**
- Modify: `templates/index.html`

- [ ] **Step 1: Replace `templates/index.html` with the full DOM skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Harvest Valley</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>

    <!-- Fixed header: money counter + passive income rate -->
    <header id="header">
        <div id="money-display">💰 <span id="money-counter">$0</span></div>
        <div id="income-display">🌾 <span id="income-counter">$0/sec</span></div>
        <div id="prestige-display" style="display:none">⭐ Prestige: <span id="prestige-count">0</span></div>
    </header>

    <!-- Main game area: harvest panel (left) + shop sidebar (right) -->
    <div id="game-container">

        <!-- Left: harvest button + rebirth button -->
        <div id="harvest-panel">
            <div id="harvest-btn-wrapper">
                <button id="harvest-btn" onclick="handleHarvest(event)">🌾</button>
                <p id="click-value-display">+$1 / click</p>
            </div>
            <button id="rebirth-btn" onclick="confirmPrestige()" style="display:none">
                ✨ Rebirth
            </button>
        </div>

        <!-- Right: scrollable shop sidebar -->
        <div id="shop-sidebar">
            <div class="shop-section">
                <h2 class="shop-title">🚜 Passive Upgrades</h2>
                <div id="passive-upgrades-list"></div>
            </div>
            <hr class="shop-divider">
            <div class="shop-section">
                <h2 class="shop-title">🏆 Milestones</h2>
                <div id="milestone-upgrades-list"></div>
            </div>
        </div>

    </div>

    <!-- Scripts loaded in dependency order -->
    <script src="{{ url_for('static', filename='upgrades.js') }}"></script>
    <script src="{{ url_for('static', filename='prestige.js') }}"></script>
    <script src="{{ url_for('static', filename='save.js') }}"></script>
    <script src="{{ url_for('static', filename='game.js') }}"></script>

</body>
</html>
```

- [ ] **Step 2: Create empty stub files so the page loads without JS errors**

```bash
touch static/upgrades.js static/prestige.js static/save.js static/game.js static/style.css
```

- [ ] **Step 3: Run Flask and verify the page loads**

```bash
python app.py
```

Open `http://localhost:5000`. Expected: blank page, no console errors.

- [ ] **Step 4: Commit**

```bash
git add templates/index.html static/upgrades.js static/prestige.js static/save.js static/game.js static/style.css
git commit -m "feat: add HTML skeleton and empty static file stubs"
```

---

## Task 3: Stardew Valley CSS Theme

**Files:**
- Modify: `static/style.css`

- [ ] **Step 1: Write `static/style.css`**

```css
/* ── Reset + base ──────────────────────────────────── */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'VT323', monospace;
    font-size: 20px;
    background: linear-gradient(160deg, #87ceeb 0%, #b0e0a8 100%);
    min-height: 100vh;
    overflow: hidden;
}

/* ── Fixed header ─────────────────────────────────── */
#header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background-color: #4a7c59;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    color: #f0c040;
    font-size: 28px;
    border-bottom: 4px solid #5c3d1e;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 100;
}

/* ── Game container ───────────────────────────────── */
#game-container {
    display: flex;
    margin-top: 60px;
    height: calc(100vh - 60px);
}

/* ── Harvest panel (left) ─────────────────────────── */
#harvest-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
}

#harvest-btn {
    font-size: 120px;
    background: none;
    border: none;
    cursor: pointer;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
    user-select: none;
    transition: filter 0.1s;
}

#harvest-btn:hover {
    filter: drop-shadow(0 4px 20px rgba(240,192,64,0.6));
}

#harvest-btn.bounce {
    animation: harvest-bounce 0.15s ease;
}

@keyframes harvest-bounce {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.18); }
    100% { transform: scale(1); }
}

#click-value-display {
    font-size: 22px;
    color: #5c3d1e;
    background: #fff8ee;
    padding: 6px 18px;
    border-radius: 10px;
    border: 2px solid #8fbc5a;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* ── Floating +$X text ────────────────────────────── */
.floating-text {
    position: fixed;
    font-family: 'VT323', monospace;
    font-size: 30px;
    color: #f0c040;
    text-shadow: 1px 1px 3px #5c3d1e;
    pointer-events: none;
    animation: float-up 1s ease-out forwards;
    z-index: 999;
}

@keyframes float-up {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-80px); }
}

/* ── Rebirth button ───────────────────────────────── */
#rebirth-btn {
    background: linear-gradient(135deg, #9b59b6, #6c3483);
    color: #f0c040;
    border: 3px solid #f0c040;
    padding: 12px 28px;
    font-family: 'VT323', monospace;
    font-size: 26px;
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: transform 0.15s, background 0.2s;
}

#rebirth-btn:hover {
    background: linear-gradient(135deg, #6c3483, #9b59b6);
    transform: scale(1.06);
}

/* ── Shop sidebar (right) ─────────────────────────── */
#shop-sidebar {
    width: 320px;
    background-color: #fff8ee;
    border-left: 4px solid #5c3d1e;
    overflow-y: auto;
    padding: 14px 12px;
    box-shadow: -3px 0 10px rgba(0,0,0,0.15);
}

.shop-title {
    font-size: 24px;
    color: #4a7c59;
    margin-bottom: 10px;
    border-bottom: 2px solid #8fbc5a;
    padding-bottom: 4px;
}

.shop-divider {
    border: none;
    border-top: 3px dashed #8fbc5a;
    margin: 16px 0;
}

/* ── Upgrade cards ────────────────────────────────── */
.upgrade-card {
    background: #f5f0e8;
    border: 2px solid #8fbc5a;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2px 8px;
    transition: transform 0.1s, background 0.15s, box-shadow 0.15s;
}

.upgrade-card.can-afford:hover {
    background: #e8f5d0;
    border-color: #4a7c59;
    transform: translateX(3px);
    box-shadow: 0 2px 8px rgba(74,124,89,0.25);
}

.upgrade-card.can-afford {
    box-shadow: 0 0 8px rgba(143,188,90,0.4);
}

.upgrade-card.cant-afford {
    opacity: 0.65;
    cursor: not-allowed;
}

.upgrade-card.locked {
    background: #e0d8cc;
    border-color: #bbb;
    opacity: 0.55;
    cursor: not-allowed;
    filter: grayscale(40%);
}

.upgrade-card.purchased {
    background: #d4edda;
    border-color: #4a7c59;
    cursor: default;
}

.upgrade-name {
    font-size: 19px;
    color: #5c3d1e;
}

.upgrade-level {
    font-size: 17px;
    color: #4a7c59;
    text-align: right;
}

.upgrade-cost {
    font-size: 18px;
    color: #c8860a;
}

.upgrade-rate {
    font-size: 16px;
    color: #888;
    text-align: right;
}

.upgrade-requirement {
    font-size: 15px;
    color: #999;
    grid-column: 1 / -1;
    font-style: italic;
}

.upgrade-effect {
    font-size: 15px;
    color: #4a7c59;
    grid-column: 1 / -1;
}
```

- [ ] **Step 2: Verify styles load**

Open `http://localhost:5000`. Expected: green header, tan body background, cream sidebar.

- [ ] **Step 3: Commit**

```bash
git add static/style.css
git commit -m "feat: add Stardew Valley CSS theme"
```

---

## Task 4: Game State + Save System

**Files:**
- Modify: `static/game.js` (gameState declaration + formatMoney only)
- Modify: `static/save.js`

- [ ] **Step 1: Write `static/save.js`**

```javascript
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
```

- [ ] **Step 2: Write the gameState declaration and `formatMoney()` in `static/game.js`**

```javascript
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
```

- [ ] **Step 3: Verify save/load in browser console**

Start Flask (`python app.py`), open `http://localhost:5000`, open DevTools console, paste:

```javascript
// Test formatMoney
console.assert(formatMoney(0)      === '$0',       'formatMoney(0)');
console.assert(formatMoney(999)    === '$999',      'formatMoney(999)');
console.assert(formatMoney(1500)   === '$1.50K',    'formatMoney(1500)');
console.assert(formatMoney(2500000)=== '$2.50M',    'formatMoney(2500000)');
console.assert(formatMoney(3e9)    === '$3.00B',    'formatMoney(3e9)');

// Test save/load round-trip
gameState.playerMoney = 12345;
saveGame();
gameState.playerMoney = 0;
loadGame();
console.assert(gameState.playerMoney === 12345, 'save/load round-trip');
console.log('All save/format tests passed');
```

Expected: `All save/format tests passed` with no assertion errors.

- [ ] **Step 4: Commit**

```bash
git add static/save.js static/game.js
git commit -m "feat: add gameState, formatMoney, and save/load system"
```

---

## Task 5: Upgrade Definitions

**Files:**
- Modify: `static/upgrades.js`

- [ ] **Step 1: Write `static/upgrades.js` — data arrays and cost calculation only**

```javascript
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
```

- [ ] **Step 2: Test cost scaling in browser console**

Open `http://localhost:5000`, DevTools console:

```javascript
// Cost scaling: 2nd tractor should cost floor(100 * 1.15^1) = 115
gameState.ownedUpgrades['tractor'] = 1;
const tractor = PASSIVE_UPGRADES.find(u => u.id === 'tractor');
console.assert(getUpgradeCost(tractor) === 115, 'tractor cost at Lv1 should be 115');
gameState.ownedUpgrades['tractor'] = 0; // reset
console.log('Cost scaling test passed');
```

Expected: `Cost scaling test passed`

- [ ] **Step 3: Commit**

```bash
git add static/upgrades.js
git commit -m "feat: add upgrade definitions, purchase logic, and sidebar rendering"
```

---

## Task 6: Prestige System

**Files:**
- Modify: `static/prestige.js`

- [ ] **Step 1: Write `static/prestige.js`**

```javascript
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
```

- [ ] **Step 2: Test prestige calculation in browser console**

```javascript
// 1,000,000 totalEarned → floor(sqrt(1)) = 1 point
gameState.totalEarned = 1e6;
console.assert(getPrestigePointsAvailable() === 1, 'prestige at 1M');

// 4,000,000 → floor(sqrt(4)) = 2 points
gameState.totalEarned = 4e6;
console.assert(getPrestigePointsAvailable() === 2, 'prestige at 4M');

// 999,999 → 0 points (threshold not met)
gameState.totalEarned = 999999;
console.assert(getPrestigePointsAvailable() === 0, 'prestige below threshold');

gameState.totalEarned = 0; // reset
console.log('Prestige calculation tests passed');
```

Expected: `Prestige calculation tests passed`

- [ ] **Step 3: Commit**

```bash
git add static/prestige.js
git commit -m "feat: add prestige/rebirth system"
```

---

## Task 7: Core Game Loop

**Files:**
- Modify: `static/game.js` (add harvest click, passive tick, updateDisplay, window.onload)

- [ ] **Step 1: Replace `static/game.js` with the complete file**

```javascript
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
```

- [ ] **Step 2: Run the game end-to-end**

```bash
python app.py
```

Open `http://localhost:5000`. Verify:
- Header shows `💰 $0` and `🌾 $0/sec`
- Clicking the 🌾 button increments money and shows floating text
- Buying a Scarecrow adds `+0.1/sec` and money ticks up every second
- After 10 clicks, Farmer's Almanac milestone unlocks in the sidebar

- [ ] **Step 3: Test save persistence**

1. Earn some money, buy an upgrade
2. Refresh the page
3. Verify money and upgrade level are restored

- [ ] **Step 4: Commit**

```bash
git add static/game.js
git commit -m "feat: add harvest click, passive income loop, display updates, and page load"
```

---

## Task 8: Integration Test + Prestige Smoke Test

**Files:**
- Modify: `test_app.py`

- [ ] **Step 1: Add a content test to `test_app.py`**

```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_returns_200(client):
    response = client.get('/')
    assert response.status_code == 200

def test_index_contains_game_elements(client):
    response = client.get('/')
    html = response.data.decode('utf-8')
    assert 'harvest-btn' in html
    assert 'shop-sidebar' in html
    assert 'money-counter' in html
    assert 'upgrades.js' in html
    assert 'prestige.js' in html
    assert 'save.js' in html
    assert 'game.js' in html

def test_static_js_files_served(client):
    for filename in ['game.js', 'upgrades.js', 'prestige.js', 'save.js', 'style.css']:
        response = client.get(f'/static/{filename}')
        assert response.status_code == 200, f'{filename} should be served'
```

- [ ] **Step 2: Run all tests**

```bash
pytest test_app.py -v
```

Expected:
```
test_app.py::test_index_returns_200 PASSED
test_app.py::test_index_contains_game_elements PASSED
test_app.py::test_static_js_files_served PASSED
```

- [ ] **Step 3: Manual prestige smoke test in browser**

Open DevTools console on `http://localhost:5000`, paste:

```javascript
// Force prestige threshold to be met
gameState.totalEarned = 1e6;
updateDisplay();
// Rebirth button should now be visible
console.assert(document.getElementById('rebirth-btn').style.display !== 'none', 'rebirth btn visible');
gameState.totalEarned = 0;
updateDisplay();
console.log('Prestige smoke test passed');
```

Expected: `Prestige smoke test passed`

- [ ] **Step 4: Final commit**

```bash
git add test_app.py
git commit -m "test: add integration tests for Flask routes and static file serving"
```
