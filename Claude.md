# Agriculture Clicker Game

## Overview
An incremental/clicker game where players harvest crops to earn money, buy upgrades (tractors, irrigation systems, etc.), and progress through farming tiers. Inspired by Cookie Clicker with a farming theme.

## Core Mechanics
- **Click to Harvest**: Main click action generates currency (money/crops)
- **Passive Income**: Upgrades (tractor, barn, irrigation) generate money over time
- **Prestige System (Rebirths)**: Reset progress for permanent multipliers and new content
- **Upgrades**: Increase click value, unlock passive generators, improve multipliers
- **Prestige Multipliers**: Bonuses that persist across rebirths (click power, passive generation rate)

## Architecture
- Single page app (HTML/CSS/JS or framework)
- `index.html` — main UI
- `game.js` — core game logic (click handling, currency, upgrades)
- `upgrades.js` — upgrade definitions and purchase logic
- `prestige.js` — rebirth mechanics and persistent multipliers
- `save.js` — localStorage save/load system
- `style.css` — UI styling (Cookie Clicker aesthetic)

## Key Variables
- `money` — current currency
- `clickValue` — damage per click
- `passiveIncome` — money per second
- `upgrades` — object with all purchasable upgrades and their states
- `prestige` — rebirth count and permanent multipliers
- `totalEarned` — all-time earnings (for prestige calculations)

## Upgrade Types
- **Click Upgrades**: Increase harvest value
- **Generators**: Tractors, barns, irrigation (passive income)
- **Multipliers**: Boost click power or passive income by %
- **Unlocks**: New upgrade tiers available after rebirth

## Prestige/Rebirth Rules
- Calculated as: `floor(sqrt(totalEarned / 1e6))` (or similar formula)
- On rebirth: reset money/upgrades, gain permanent multiplier, unlock new content
- Prestige multiplier applies to all future earnings (e.g., +1% per prestige point)

## Conventions
- Use camelCase for variables
- Prefix UI update functions with `update` (e.g., `updateDisplay()`)
- Format large numbers with commas or scientific notation (1.23e6)
- Save game state every 10 seconds or on important action

## Important Context
- Must feel rewarding and addictive (incremental gameplay)
- Balance: passive income should eventually surpass clicking
- Prestige should feel meaningful (players want to rebirth for better multipliers)
- UI should update smoothly, even with large numbers

## Save System
- Use localStorage to persist:
  - Current money, clickValue, passiveIncome
  - Upgrade purchase states
  - Prestige count and multipliers
  - Total earned
- Auto-save every 10 seconds, manual save on rebirth

## Notes for Claude
- When suggesting features, consider balance (early game grind vs. endgame passive)
- Number formatting is critical (1234567 should display as "1.23M")
- Prestige calculations should feel meaningful but not too grindy
- Keep prestige unlocks exciting (new generators, higher multipliers, visual changes)