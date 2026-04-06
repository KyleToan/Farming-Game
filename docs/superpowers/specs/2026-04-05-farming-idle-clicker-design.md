# Farming Idle Clicker — Design Spec
**Date:** 2026-04-05

## Overview

A Cookie Clicker-style idle/clicker game with a farming theme inspired by Stardew Valley. Players click to harvest crops, buy passive income upgrades, unlock milestone bonuses, and prestige for permanent multipliers. Built with Flask (Python) serving a static HTML/CSS/JS frontend; all game logic runs in the browser with localStorage persistence.

---

## 1. Architecture & File Structure

```
Farming-Game/
├── app.py                  # Flask server — single GET / route, serves index.html
├── static/
│   ├── game.js             # Core loop: click handler, passive income tick, display updates
│   ├── upgrades.js         # Upgrade definitions, purchase logic, milestone checks
│   ├── prestige.js         # Rebirth logic, permanent multiplier calculations
│   ├── save.js             # localStorage read/write, auto-save every 10s
│   └── style.css           # All styling — header, sidebar, harvest button, animations
└── templates/
    └── index.html          # Layout skeleton — loads all JS/CSS, defines DOM structure
```

**Script load order in `index.html`:** `upgrades.js` → `prestige.js` → `save.js` → `game.js`

`app.py` has one job: serve `index.html` at `GET /`. Flask's built-in static file serving handles CSS/JS automatically. No API routes needed.

---

## 2. Game State & Core Variables

All mutable state lives in a single `gameState` object in `game.js`:

```js
const gameState = {
  playerMoney: 0,
  totalEarned: 0,           // all-time, never resets mid-run — drives prestige formula
  totalClickCount: 0,       // all-time clicks, never resets — used for milestone checks
  moneyPerClick: 1,         // base value, scaled by upgrades + multipliers
  moneyPerSecond: 0,        // recalculated after every upgrade purchase
  productionMultiplier: 1,  // global, boosted by milestones; resets on prestige
  prestigeCount: 0,
  prestigeMultiplier: 1,    // persists across rebirths, compounds per prestige
  ownedUpgrades: {},        // e.g. { tractor: 3, irrigation: 1 }
  purchasedMilestones: []   // e.g. ["almanac", "goldenTractor"] — source of truth for milestone state
}
```

**Key formulas:**
- Effective click value: `moneyPerClick × productionMultiplier × prestigeMultiplier`
- Effective passive income: `moneyPerSecond × productionMultiplier × prestigeMultiplier`
- Prestige points available: `Math.floor(Math.sqrt(totalEarned / 1e6))`
- Upgrade cost scaling: `baseCost × 1.15^owned`

---

## 3. UI Layout

Three zones, all visible simultaneously — no full-page scroll:

```
┌─────────────────────────────────────────────────┐
│           💰 $1,250        🌾 +3/sec            │  ← fixed header (top center)
├────────────────┬────────────────────────────────┤
│                │  [PASSIVE UPGRADES]             │
│                │  Scarecrow      Lv0   $15  +0.1/s│
│   🌾           │  Tractor        Lv3   $45  +1/s │
│  [HARVEST]     │  Irrigation     Lv1  $200  +5/s │
│                │  ─────────────────────────────  │
│  +$1 / click   │  [MILESTONES]                   │
│                │  🔒 Golden Tractor  Need 10 🚜  │
│                │  ✅ Farmer's Almanac  +1 click  │
└────────────────┴────────────────────────────────┘
```

**Header:** fixed, top-center. Displays `playerMoney` (formatted) and current `moneyPerSecond`. Forest green background (`#4a7c59`).

**Left panel:** centered harvest button (large crop emoji). On click: `scale(1.15)` bounce + floating "+$X" label animating upward and fading out (CSS keyframe animation).

**Right sidebar:** scrollable. Two labeled sections divided by a horizontal rule. Passive upgrades on top, milestones below. Locked milestones are grayed out with requirement text shown. Affordable upgrades glow green.

**Visual theme — Stardew Valley-inspired:**
- Background: `#f5f0e8` (warm tan)
- Header: `#4a7c59` (forest green)
- Sidebar: `#fff8ee` (cream)
- Buttons: `#8fbc5a` (harvest green)
- Accents: `#5c3d1e` (soil brown), `#f0c040` (wheat gold), `#87ceeb` (sky blue)
- Font: VT323 or Press Start 2P from Google Fonts (pixel/retro farm feel)
- Soft drop shadows, rounded corners, warm border strokes

---

## 4. Game Mechanics

### Click (Harvest)
`handleHarvest()` in `game.js`:
1. Computes earn = `moneyPerClick × productionMultiplier × prestigeMultiplier`
2. Adds to `playerMoney` and `totalEarned`
3. Spawns floating "+$X" label (CSS animation)
4. Triggers button bounce animation
5. Calls `updateDisplay()`

### Passive Income Loop
`setInterval` every 1000ms in `game.js`:
1. Computes tick = `moneyPerSecond × productionMultiplier × prestigeMultiplier`
2. Adds to `playerMoney` and `totalEarned`
3. Calls `updateDisplay()`

### Prestige / Rebirth
Managed in `prestige.js`:
- "Rebirth" button visible only when `prestigePointsAvailable >= 1`
- Points formula: `Math.floor(Math.sqrt(totalEarned / 1e6))`
- On confirm:
  - Resets: `playerMoney`, `ownedUpgrades`, `moneyPerClick` (to base 1), `moneyPerSecond` (to 0), `productionMultiplier` (to 1), `totalEarned` (to 0)
  - Increments: `prestigeCount`
  - Updates: `prestigeMultiplier += 0.10 × prestigePointsAvailable` (10% per point, compounding)
- Saves immediately after rebirth

---

## 5. Upgrade System

### Passive Upgrades (`upgrades.js`) — repeatable

| ID | Name | Base Cost | Income/sec | Cost Scale |
|---|---|---|---|---|
| `scarecrow` | Scarecrow | $15 | +0.1/s | ×1.15 |
| `tractor` | Tractor | $100 | +1/s | ×1.15 |
| `irrigation` | Irrigation System | $500 | +5/s | ×1.15 |
| `greenhouse` | Greenhouse | $2,000 | +20/s | ×1.15 |
| `windmill` | Windmill | $10,000 | +100/s | ×1.15 |

**Purchase logic (`buyUpgrade()`):**
1. Check `playerMoney >= cost`
2. Deduct cost, increment `ownedUpgrades[id]`
3. `recalculatePassiveIncome()` — sums all owned upgrades' base rates
4. `checkMilestones()` — re-evaluate all milestone conditions
5. `saveGame()`
6. `updateDisplay()`

### Milestone Upgrades (`upgrades.js`) — one-time, locked until requirement met

| ID | Name | Requirement | Cost | Effect |
|---|---|---|---|---|
| `almanac` | Farmer's Almanac | 10 total clicks | $50 | +1 base `moneyPerClick` |
| `goldenTractor` | Golden Tractor | Own 10 tractors | $5,000 | `productionMultiplier × 2` |
| `cropWhisperer` | Crop Whisperer | $10,000 total earned | $2,500 | `moneyPerClick × 3` |
| `harvestFestival` | Harvest Festival | Own 5 greenhouses | $25,000 | `moneyPerSecond × 2` (base rates) |
| `legendaryBarn` | Legendary Barn | 1+ prestige | $50,000 | `productionMultiplier × 1.5` |

Locked milestones render grayed out with requirement text. Purchased milestones show a checkmark. Effects apply immediately on purchase by mutating the relevant `gameState` property.

---

## 6. Save System (`save.js`)

- **`saveGame()`** — `JSON.stringify(gameState)` → `localStorage.setItem("farmGameSave", ...)`
- **`loadGame()`** — `JSON.parse(localStorage.getItem("farmGameSave"))`, safe-merged into `gameState` (missing keys fall back to defaults)
- **`resetGame()`** — `localStorage.removeItem("farmGameSave")` + reinitialize `gameState` (used internally by prestige after confirm)
- **Auto-save:** `setInterval(saveGame, 10000)` started in `game.js`
- **Manual save triggers:** every upgrade purchase, every prestige

**Page load sequence:**
1. `loadGame()` — restore full `gameState` from localStorage (all values including computed ones like `productionMultiplier` and `moneyPerClick` are restored as-is; no effects re-applied)
2. `recalculatePassiveIncome()` — rebuild `moneyPerSecond` from owned upgrades
3. `updateDisplay()` — render current state (including milestone locked/unlocked UI from `purchasedMilestones`)
4. Start passive income `setInterval`

> Note: milestone effects (`productionMultiplier`, `moneyPerClick`) are already stored in the saved `gameState`. On load we restore the values directly — we do NOT re-apply milestone logic, which would double the effects. `purchasedMilestones` is used only to render locked/unlocked UI state.

**Number formatting (`formatMoney()` in `game.js`):**
```
< 1,000        → "$450"
1,000–999,999  → "$1.25K"
1M–999M        → "$4.32M"
1B+            → "$1.23B"
```

---

## 7. Expandability Notes

- New passive upgrades: add one entry to the `PASSIVE_UPGRADES` array in `upgrades.js`
- New milestones: add one entry to the `MILESTONE_UPGRADES` array in `upgrades.js`
- New prestige unlocks: handled in `prestige.js` by checking `prestigeCount` thresholds
- All upgrade rendering is data-driven — no new HTML needed for new upgrades
