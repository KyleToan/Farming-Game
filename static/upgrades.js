// upgrades.js — upgrade definitions, purchase logic, and sidebar rendering
// Depends on: gameState, formatMoney (game.js), saveGame (save.js), updateDisplay (game.js)

// Global price tuning: lower = easier (passive, milestones, animals, housing use applyEconomyCost).
window.GAME_ECONOMY_COST_MULT = 0.4;
window.applyEconomyCost = function (raw) {
    const m = window.GAME_ECONOMY_COST_MULT ?? 0.4;
    return Math.max(1, Math.floor(Number(raw) * m));
};

// ── Passive upgrade definitions ───────────────────────────────────────────
// Repeatable generators. Cost scales by (costScaling^owned) after each purchase.
const PASSIVE_UPGRADES = [
    // Starter → end-game progression
    { id: 'fieldHand',   name: 'Field Hand',              description: 'A worker who tends crops all day',            emoji: '👨‍🌾', baseCost: 15,       baseRate: 1,    costScaling: 1.15 },
    { id: 'irrigation',  name: 'Irrigation Pipes',        description: 'Automated watering increases yield',         emoji: '💧',   baseCost: 100,      baseRate: 3,    costScaling: 1.18 },
    { id: 'tractor',     name: 'Basic Tractor',           description: 'Mechanized farming speeds up harvesting',    emoji: '🚜',   baseCost: 500,      baseRate: 10,   costScaling: 1.20 },
    { id: 'greenhouse',  name: 'Greenhouse',              description: 'Grow crops year-round',                      emoji: '🏡',   baseCost: 2000,     baseRate: 25,   costScaling: 1.22 },
    { id: 'fertilizer',  name: 'Fertilizer System',       description: 'Nutrient-rich soil boosts production',       emoji: '🧪',   baseCost: 10000,    baseRate: 60,   costScaling: 1.25 },
    { id: 'harvester',   name: 'Harvester Combine',       description: 'Industrial-grade harvesting machines',       emoji: '🚛',   baseCost: 50000,    baseRate: 150,  costScaling: 1.28 },
    { id: 'silos',       name: 'Crop Storage Silos',      description: 'Prevent waste and increase efficiency',      emoji: '🛢️',  baseCost: 200000,   baseRate: 350,  costScaling: 1.30 },
    { id: 'farmAI',      name: 'Farm AI System',          description: 'Smart algorithms optimize crop cycles',      emoji: '🤖',   baseCost: 1000000,  baseRate: 800,  costScaling: 1.33 },
    { id: 'drones',      name: 'Drone Crop Monitoring',   description: 'Drones monitor and optimize fields',         emoji: '🛰️',  baseCost: 5000000,  baseRate: 2000, costScaling: 1.35 },
    { id: 'megaFarm',    name: 'Autonomous Mega Farm',    description: 'Fully automated farming operation',          emoji: '🏭',   baseCost: 20000000, baseRate: 5000, costScaling: 1.40 },
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
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['tractor'] = (gs.upgradeProductionMultipliers['tractor'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Tractor production',
    },
    {
        id: 'cropWhisperer',
        name: 'Crop Whisperer',
        emoji: '🌽',
        cost: 2500,
        requirementText: '$10,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 10000,
        applyEffect: (gs) => { gs.clickMultiplier *= 3; },
        effectText: '3× click income',
    },
    {
        id: 'harvestFestival',
        name: 'Harvest Festival',
        emoji: '🎪',
        cost: 25000,
        requirementText: 'Own 5 greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 5,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 2; },
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

    // ── Field Hand milestones ─────────────────────────────────────────────
    {
        id: 'unionizedWorkers',
        name: 'Unionized Workers',
        emoji: '🌱',
        cost: 750,
        requirementText: 'Own 10 Field Hands',
        isUnlocked: (gs) => (gs.ownedUpgrades['fieldHand'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fieldHand'] = (gs.upgradeProductionMultipliers['fieldHand'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Field Hand production',
    },
    {
        id: 'experiencedCrew',
        chainPrev: 'unionizedWorkers',
        name: 'Experienced Crew',
        emoji: '🌱',
        cost: 5000,
        requirementText: 'Own 25 Field Hands',
        isUnlocked: (gs) => (gs.ownedUpgrades['fieldHand'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fieldHand'] = (gs.upgradeProductionMultipliers['fieldHand'] || 1) * 1.5;
            recalculatePassiveIncome();
        },
        effectText: '+50% Field Hand output',
    },
    {
        id: 'masterFarmers',
        chainPrev: 'experiencedCrew',
        name: 'Master Farmers',
        emoji: '🌱',
        cost: 25000,
        requirementText: 'Own 50 Field Hands',
        isUnlocked: (gs) => (gs.ownedUpgrades['fieldHand'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fieldHand'] = (gs.upgradeProductionMultipliers['fieldHand'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Field Hand production',
    },
    {
        id: 'legendaryWorkforce',
        chainPrev: 'masterFarmers',
        name: 'Legendary Workforce',
        emoji: '🌱',
        cost: 150000,
        requirementText: 'Own 100 Field Hands',
        isUnlocked: (gs) => (gs.ownedUpgrades['fieldHand'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fieldHand'] = (gs.upgradeProductionMultipliers['fieldHand'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× Field Hand production',
    },
    {
        id: 'agriculturalGuild',
        chainPrev: 'legendaryWorkforce',
        name: 'Agricultural Guild',
        emoji: '🌱',
        cost: 1000000,
        requirementText: 'Own 200 Field Hands',
        isUnlocked: (gs) => (gs.ownedUpgrades['fieldHand'] || 0) >= 200,
        applyEffect: (gs) => { gs.clickMultiplier *= 1.25; },
        effectText: 'Click income +25%',
    },

    // ── Irrigation milestones ─────────────────────────────────────────────
    {
        id: 'highPressureValves',
        name: 'High-Pressure Valves',
        emoji: '💧',
        cost: 3500,
        requirementText: 'Own 10 Irrigation Pipes',
        isUnlocked: (gs) => (gs.ownedUpgrades['irrigation'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['irrigation'] = (gs.upgradeProductionMultipliers['irrigation'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Irrigation output',
    },
    {
        id: 'smartWaterRouting',
        chainPrev: 'highPressureValves',
        name: 'Smart Water Routing',
        emoji: '💧',
        cost: 25000,
        requirementText: 'Own 25 Irrigation Pipes',
        isUnlocked: (gs) => (gs.ownedUpgrades['irrigation'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['irrigation'] = (gs.upgradeProductionMultipliers['irrigation'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'automatedSprinklers',
        chainPrev: 'smartWaterRouting',
        name: 'Automated Sprinklers',
        emoji: '💧',
        cost: 150000,
        requirementText: 'Own 50 Irrigation Pipes',
        isUnlocked: (gs) => (gs.ownedUpgrades['irrigation'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['irrigation'] = (gs.upgradeProductionMultipliers['irrigation'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Irrigation output',
    },
    {
        id: 'zeroWasteSystem',
        chainPrev: 'automatedSprinklers',
        name: 'Zero-Waste System',
        emoji: '💧',
        cost: 1000000,
        requirementText: 'Own 100 Irrigation Pipes',
        isUnlocked: (gs) => (gs.ownedUpgrades['irrigation'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['irrigation'] = (gs.upgradeProductionMultipliers['irrigation'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× Irrigation output',
    },
    {
        id: 'perfectHydration',
        chainPrev: 'zeroWasteSystem',
        name: 'Perfect Hydration',
        emoji: '💧',
        cost: 8000000,
        requirementText: 'Own 200 Irrigation Pipes',
        isUnlocked: (gs) => (gs.ownedUpgrades['irrigation'] || 0) >= 200,
        applyEffect: (gs) => { gs.productionMultiplier *= 1.10; },
        effectText: 'All income +10%',
    },

    // ── Tractor milestones ────────────────────────────────────────────────
    {
        id: 'turboEngines',
        chainPrev: 'goldenTractor',
        name: 'Turbo Engines',
        emoji: '🚜',
        cost: 75000,
        requirementText: 'Own 25 Tractors',
        isUnlocked: (gs) => (gs.ownedUpgrades['tractor'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['tractor'] = (gs.upgradeProductionMultipliers['tractor'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% Tractor output',
    },
    {
        id: 'diamondPlatedTractors',
        chainPrev: 'turboEngines',
        name: 'Diamond-Plated Tractors',
        emoji: '🚜',
        cost: 500000,
        requirementText: 'Own 50 Tractors',
        isUnlocked: (gs) => (gs.ownedUpgrades['tractor'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['tractor'] = (gs.upgradeProductionMultipliers['tractor'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Tractor production',
    },
    {
        id: 'autonomousTractorFleet',
        chainPrev: 'diamondPlatedTractors',
        name: 'Autonomous Tractor Fleet',
        emoji: '🚜',
        cost: 3500000,
        requirementText: 'Own 100 Tractors',
        isUnlocked: (gs) => (gs.ownedUpgrades['tractor'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['tractor'] = (gs.upgradeProductionMultipliers['tractor'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× Tractor production',
    },
    {
        id: 'tractorSupremacy',
        chainPrev: 'autonomousTractorFleet',
        name: 'Tractor Supremacy',
        emoji: '🚜',
        cost: 25000000,
        requirementText: 'Own 200 Tractors',
        isUnlocked: (gs) => (gs.ownedUpgrades['tractor'] || 0) >= 200,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 1.15; },
        effectText: 'Passive income +15%',
    },

    // ── Greenhouse milestones ─────────────────────────────────────────────
    {
        id: 'climateControl',
        name: 'Climate Control',
        emoji: '🌿',
        cost: 200000,
        requirementText: 'Own 10 Greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['greenhouse'] = (gs.upgradeProductionMultipliers['greenhouse'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Greenhouse output',
    },
    {
        id: 'advancedSoilBeds',
        chainPrev: 'climateControl',
        name: 'Advanced Soil Beds',
        emoji: '🌿',
        cost: 1200000,
        requirementText: 'Own 25 Greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['greenhouse'] = (gs.upgradeProductionMultipliers['greenhouse'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'hybridCrops',
        chainPrev: 'advancedSoilBeds',
        name: 'Hybrid Crops',
        emoji: '🌿',
        cost: 7500000,
        requirementText: 'Own 50 Greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['greenhouse'] = (gs.upgradeProductionMultipliers['greenhouse'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Greenhouse output',
    },
    {
        id: 'verticalFarming',
        chainPrev: 'hybridCrops',
        name: 'Vertical Farming',
        emoji: '🌿',
        cost: 50000000,
        requirementText: 'Own 100 Greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['greenhouse'] = (gs.upgradeProductionMultipliers['greenhouse'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× Greenhouse output',
    },
    {
        id: 'infiniteSeasons',
        chainPrev: 'verticalFarming',
        name: 'Infinite Seasons',
        emoji: '🌿',
        cost: 250000000,
        requirementText: 'Own 200 Greenhouses',
        isUnlocked: (gs) => (gs.ownedUpgrades['greenhouse'] || 0) >= 200,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 1.20; },
        effectText: 'Passive income +20%',
    },

    // ── Fertilizer milestones ─────────────────────────────────────────────
    {
        id: 'enrichedCompost',
        name: 'Enriched Compost',
        emoji: '🧪',
        cost: 850000,
        requirementText: 'Own 10 Fertilizer Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['fertilizer'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fertilizer'] = (gs.upgradeProductionMultipliers['fertilizer'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Fertilizer output',
    },
    {
        id: 'nutrientOptimization',
        chainPrev: 'enrichedCompost',
        name: 'Nutrient Optimization',
        emoji: '🧪',
        cost: 6000000,
        requirementText: 'Own 25 Fertilizer Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['fertilizer'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fertilizer'] = (gs.upgradeProductionMultipliers['fertilizer'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'growthAccelerators',
        chainPrev: 'nutrientOptimization',
        name: 'Growth Accelerators',
        emoji: '🧪',
        cost: 35000000,
        requirementText: 'Own 50 Fertilizer Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['fertilizer'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fertilizer'] = (gs.upgradeProductionMultipliers['fertilizer'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× Fertilizer output',
    },
    {
        id: 'superSoil',
        chainPrev: 'growthAccelerators',
        name: 'Super Soil',
        emoji: '🧪',
        cost: 250000000,
        requirementText: 'Own 100 Fertilizer Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['fertilizer'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['fertilizer'] = (gs.upgradeProductionMultipliers['fertilizer'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× Fertilizer output',
    },
    {
        id: 'perfectYield',
        chainPrev: 'superSoil',
        name: 'Perfect Yield',
        emoji: '🧪',
        cost: 1500000000,
        requirementText: 'Own 200 Fertilizer Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['fertilizer'] || 0) >= 200,
        applyEffect: (gs) => { gs.clickMultiplier *= 1.50; },
        effectText: 'Click income +50%',
    },

    // ── Harvester milestones ──────────────────────────────────────────────
    {
        id: 'reinforcedBlades',
        name: 'Reinforced Blades',
        emoji: '🚜',
        cost: 3500000,
        requirementText: 'Own 10 Harvesters',
        isUnlocked: (gs) => (gs.ownedUpgrades['harvester'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['harvester'] = (gs.upgradeProductionMultipliers['harvester'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'fasterCycles',
        chainPrev: 'reinforcedBlades',
        name: 'Faster Cycles',
        emoji: '🚜',
        cost: 25000000,
        requirementText: 'Own 25 Harvesters',
        isUnlocked: (gs) => (gs.ownedUpgrades['harvester'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['harvester'] = (gs.upgradeProductionMultipliers['harvester'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'industrialEfficiency',
        chainPrev: 'fasterCycles',
        name: 'Industrial Efficiency',
        emoji: '🚜',
        cost: 150000000,
        requirementText: 'Own 50 Harvesters',
        isUnlocked: (gs) => (gs.ownedUpgrades['harvester'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['harvester'] = (gs.upgradeProductionMultipliers['harvester'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'megaCombines',
        chainPrev: 'industrialEfficiency',
        name: 'Mega Combines',
        emoji: '🚜',
        cost: 1000000000,
        requirementText: 'Own 100 Harvesters',
        isUnlocked: (gs) => (gs.ownedUpgrades['harvester'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['harvester'] = (gs.upgradeProductionMultipliers['harvester'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× output',
    },
    {
        id: 'harvestOverdrive',
        chainPrev: 'megaCombines',
        name: 'Harvest Overdrive',
        emoji: '🚜',
        cost: 6500000000,
        requirementText: 'Own 200 Harvesters',
        isUnlocked: (gs) => (gs.ownedUpgrades['harvester'] || 0) >= 200,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['tractor'] = (gs.upgradeProductionMultipliers['tractor'] || 1) * 1.25;
            recalculatePassiveIncome();
        },
        effectText: 'Tractors +25%',
    },

    // ── Silo milestones ───────────────────────────────────────────────────
    {
        id: 'spoilageControl',
        name: 'Spoilage Control',
        emoji: '🏗️',
        cost: 15000000,
        requirementText: 'Own 10 Silos',
        isUnlocked: (gs) => (gs.ownedUpgrades['silos'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['silos'] = (gs.upgradeProductionMultipliers['silos'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'temperatureRegulation',
        chainPrev: 'spoilageControl',
        name: 'Temperature Regulation',
        emoji: '🏗️',
        cost: 100000000,
        requirementText: 'Own 25 Silos',
        isUnlocked: (gs) => (gs.ownedUpgrades['silos'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['silos'] = (gs.upgradeProductionMultipliers['silos'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'smartInventory',
        chainPrev: 'temperatureRegulation',
        name: 'Smart Inventory',
        emoji: '🏗️',
        cost: 600000000,
        requirementText: 'Own 50 Silos',
        isUnlocked: (gs) => (gs.ownedUpgrades['silos'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['silos'] = (gs.upgradeProductionMultipliers['silos'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'infiniteStorage',
        chainPrev: 'smartInventory',
        name: 'Infinite Storage',
        emoji: '🏗️',
        cost: 4000000000,
        requirementText: 'Own 100 Silos',
        isUnlocked: (gs) => (gs.ownedUpgrades['silos'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['silos'] = (gs.upgradeProductionMultipliers['silos'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× output',
    },
    {
        id: 'supplyChainMastery',
        chainPrev: 'infiniteStorage',
        name: 'Supply Chain Mastery',
        emoji: '🏗️',
        cost: 25000000000,
        requirementText: 'Own 200 Silos',
        isUnlocked: (gs) => (gs.ownedUpgrades['silos'] || 0) >= 200,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 1.25; },
        effectText: 'Passive income +25%',
    },

    // ── Farm AI milestones ────────────────────────────────────────────────
    {
        id: 'predictiveFarming',
        name: 'Predictive Farming',
        emoji: '🤖',
        cost: 60000000,
        requirementText: 'Own 10 AI Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['farmAI'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['farmAI'] = (gs.upgradeProductionMultipliers['farmAI'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× AI output',
    },
    {
        id: 'machineLearningCrops',
        chainPrev: 'predictiveFarming',
        name: 'Machine Learning Crops',
        emoji: '🤖',
        cost: 350000000,
        requirementText: 'Own 25 AI Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['farmAI'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['farmAI'] = (gs.upgradeProductionMultipliers['farmAI'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'neuralOptimization',
        chainPrev: 'machineLearningCrops',
        name: 'Neural Optimization',
        emoji: '🤖',
        cost: 2000000000,
        requirementText: 'Own 50 AI Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['farmAI'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['farmAI'] = (gs.upgradeProductionMultipliers['farmAI'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× AI output',
    },
    {
        id: 'selfEvolvingAI',
        chainPrev: 'neuralOptimization',
        name: 'Self-Evolving AI',
        emoji: '🤖',
        cost: 15000000000,
        requirementText: 'Own 100 AI Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['farmAI'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['farmAI'] = (gs.upgradeProductionMultipliers['farmAI'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× AI output',
    },
    {
        id: 'farmSingularity',
        chainPrev: 'selfEvolvingAI',
        name: 'Farm Singularity',
        emoji: '🤖',
        cost: 100000000000,
        requirementText: 'Own 200 AI Systems',
        isUnlocked: (gs) => (gs.ownedUpgrades['farmAI'] || 0) >= 200,
        applyEffect: (gs) => { gs.productionMultiplier *= 1.30; },
        effectText: 'All income +30%',
    },

    // ── Drone milestones ──────────────────────────────────────────────────
    {
        id: 'precisionScanning',
        name: 'Precision Scanning',
        emoji: '🚁',
        cost: 300000000,
        requirementText: 'Own 10 Drones',
        isUnlocked: (gs) => (gs.ownedUpgrades['drones'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['drones'] = (gs.upgradeProductionMultipliers['drones'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'aiTargeting',
        chainPrev: 'precisionScanning',
        name: 'AI Targeting',
        emoji: '🚁',
        cost: 2000000000,
        requirementText: 'Own 25 Drones',
        isUnlocked: (gs) => (gs.ownedUpgrades['drones'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['drones'] = (gs.upgradeProductionMultipliers['drones'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'swarmIntelligence',
        chainPrev: 'aiTargeting',
        name: 'Swarm Intelligence',
        emoji: '🚁',
        cost: 12000000000,
        requirementText: 'Own 50 Drones',
        isUnlocked: (gs) => (gs.ownedUpgrades['drones'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['drones'] = (gs.upgradeProductionMultipliers['drones'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'planetaryCoverage',
        chainPrev: 'swarmIntelligence',
        name: 'Planetary Coverage',
        emoji: '🚁',
        cost: 80000000000,
        requirementText: 'Own 100 Drones',
        isUnlocked: (gs) => (gs.ownedUpgrades['drones'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['drones'] = (gs.upgradeProductionMultipliers['drones'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× output',
    },
    {
        id: 'skyDominion',
        chainPrev: 'planetaryCoverage',
        name: 'Sky Dominion',
        emoji: '🚁',
        cost: 500000000000,
        requirementText: 'Own 200 Drones',
        isUnlocked: (gs) => (gs.ownedUpgrades['drones'] || 0) >= 200,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 1.35; },
        effectText: 'Passive income +35%',
    },

    // ── Mega Farm milestones ──────────────────────────────────────────────
    {
        id: 'hyperAutomation',
        name: 'Hyper Automation',
        emoji: '🏭',
        cost: 1500000000,
        requirementText: 'Own 10 Mega Farms',
        isUnlocked: (gs) => (gs.ownedUpgrades['megaFarm'] || 0) >= 10,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['megaFarm'] = (gs.upgradeProductionMultipliers['megaFarm'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'globalLogistics',
        chainPrev: 'hyperAutomation',
        name: 'Global Logistics',
        emoji: '🏭',
        cost: 12000000000,
        requirementText: 'Own 25 Mega Farms',
        isUnlocked: (gs) => (gs.ownedUpgrades['megaFarm'] || 0) >= 25,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['megaFarm'] = (gs.upgradeProductionMultipliers['megaFarm'] || 1) * 1.75;
            recalculatePassiveIncome();
        },
        effectText: '+75% output',
    },
    {
        id: 'industrialEmpire',
        chainPrev: 'globalLogistics',
        name: 'Industrial Empire',
        emoji: '🏭',
        cost: 60000000000,
        requirementText: 'Own 50 Mega Farms',
        isUnlocked: (gs) => (gs.ownedUpgrades['megaFarm'] || 0) >= 50,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['megaFarm'] = (gs.upgradeProductionMultipliers['megaFarm'] || 1) * 2;
            recalculatePassiveIncome();
        },
        effectText: '2× output',
    },
    {
        id: 'planetaryFarming',
        chainPrev: 'industrialEmpire',
        name: 'Planetary Farming',
        emoji: '🏭',
        cost: 450000000000,
        requirementText: 'Own 100 Mega Farms',
        isUnlocked: (gs) => (gs.ownedUpgrades['megaFarm'] || 0) >= 100,
        applyEffect: (gs) => {
            gs.upgradeProductionMultipliers['megaFarm'] = (gs.upgradeProductionMultipliers['megaFarm'] || 1) * 3;
            recalculatePassiveIncome();
        },
        effectText: '3× output',
    },
    {
        id: 'galacticAgriculture',
        chainPrev: 'planetaryFarming',
        name: 'Galactic Agriculture',
        emoji: '🏭',
        cost: 3000000000000,
        requirementText: 'Own 200 Mega Farms',
        isUnlocked: (gs) => (gs.ownedUpgrades['megaFarm'] || 0) >= 200,
        applyEffect: (gs) => { gs.productionMultiplier *= 2; },
        effectText: 'All income 2× globally',
    },

    // ── Lifetime earnings milestones ──────────────────────────────────────
    {
        id: 'firstBigHarvest',
        name: 'First Big Harvest',
        emoji: '💰',
        cost: 2500,
        requirementText: '$10,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 10000,
        applyEffect: (gs) => { gs.productionMultiplier *= 1.25; },
        effectText: 'Global income 1.25×',
    },
    {
        id: 'farmingReputation',
        name: 'Farming Reputation',
        emoji: '💰',
        cost: 25000,
        requirementText: '$100,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 100000,
        applyEffect: (gs) => { gs.clickMultiplier *= 2; },
        effectText: 'Click income 2×',
    },
    {
        id: 'agriculturalTycoon',
        name: 'Agricultural Tycoon',
        emoji: '💰',
        cost: 250000,
        requirementText: '$1,000,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 1000000,
        applyEffect: (gs) => { gs.passiveIncomeMultiplier *= 2; },
        effectText: 'Passive income 2×',
    },
    {
        id: 'globalSupplier',
        name: 'Global Supplier',
        emoji: '💰',
        cost: 2500000,
        requirementText: '$10,000,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 10000000,
        applyEffect: (gs) => { gs.productionMultiplier *= 2; },
        effectText: 'All production 2×',
    },
    {
        id: 'legendOfTheLand',
        name: 'Legend of the Land',
        emoji: '💰',
        cost: 25000000,
        requirementText: '$100,000,000 total earned',
        isUnlocked: (gs) => gs.totalEarned >= 100000000,
        applyEffect: (gs) => { gs.productionMultiplier *= 3; },
        effectText: 'All income 3×',
    },

    // ── Special achievement milestones ────────────────────────────────────
    {
        id: 'efficientPlanning',
        name: 'Efficient Planning',
        emoji: '🏆',
        cost: 500000,
        requirementText: '100 total upgrades owned',
        isUnlocked: (gs) => getTotalUpgradesOwned(gs) >= 100,
        applyEffect: (gs) => { gs.costMultiplier *= 0.90; },
        effectText: 'Costs reduced by 10%',
    },
    {
        id: 'masterFarmer',
        name: 'Master Farmer',
        emoji: '🏆',
        cost: 5000000,
        requirementText: 'Unlock all passive upgrades',
        isUnlocked: (gs) => PASSIVE_UPGRADES.every(u => (gs.ownedUpgrades[u.id] || 0) >= 1),
        applyEffect: (gs) => { gs.productionMultiplier *= 1.5; },
        effectText: 'All production 1.5×',
    },
    {
        id: 'industrialScale',
        name: 'Industrial Scale',
        emoji: '🏆',
        cost: 25000000,
        requirementText: 'Own 500 total items',
        isUnlocked: (gs) => getTotalRunItemsOwned(gs) >= 500,
        applyEffect: (gs) => { gs.passiveTickMultiplier *= 2; },
        effectText: 'Passive income ticks twice as fast',
    },
];

// ── Cost calculation ──────────────────────────────────────────────────────
// Returns the current purchase cost for a passive upgrade
function getUpgradeCost(upgrade) {
    const owned = gameState.ownedUpgrades[upgrade.id] || 0;
    const scaling = upgrade.costScaling ?? 1.15;
    const costMult = gameState.costMultiplier ?? 1;
    return window.applyEconomyCost(upgrade.baseCost * Math.pow(scaling, owned) * costMult);
}

function getMilestoneCost(milestone) {
    const costMult = gameState.costMultiplier ?? 1;
    return window.applyEconomyCost(milestone.cost * costMult);
}

function getTotalPassiveItemsOwned(gs) {
    let total = 0;
    for (const u of PASSIVE_UPGRADES) total += (gs.ownedUpgrades[u.id] || 0);
    return total;
}

function getTotalRunItemsOwned(gs) {
    const animals = (typeof getTotalAnimalCount === 'function') ? getTotalAnimalCount(gs) : 0;
    return getTotalPassiveItemsOwned(gs) + animals;
}

function getTotalUpgradesOwned(gs) {
    const animalCount = (typeof getTotalAnimalCount === 'function') ? getTotalAnimalCount(gs) : 0;
    return getTotalPassiveItemsOwned(gs) + (gs.purchasedMilestones?.length || 0) + animalCount;
}

// Only show passive generators after the player owns ≥1 of the previous tier.
function getVisiblePassiveUpgrades() {
    return PASSIVE_UPGRADES.filter((u, i) => {
        if (i === 0) return true;
        const prev = PASSIVE_UPGRADES[i - 1];
        return (gameState.ownedUpgrades[prev.id] || 0) >= 1;
    });
}

// Milestones: hidden until requirement met; per-generator chains also require the previous milestone purchased.
function isMilestoneVisible(milestone, gs) {
    if (gs.purchasedMilestones.includes(milestone.id)) return true;
    if (milestone.chainPrev && !gs.purchasedMilestones.includes(milestone.chainPrev)) return false;
    return milestone.isUnlocked(gs);
}

// ── Passive income recalculation ──────────────────────────────────────────
// Sums base rates of all owned generators. Call after every upgrade purchase.
function recalculatePassiveIncome() {
    let total = 0;
    for (const upgrade of PASSIVE_UPGRADES) {
        const owned = gameState.ownedUpgrades[upgrade.id] || 0;
        const mult = (gameState.upgradeProductionMultipliers?.[upgrade.id] || 1);
        total += upgrade.baseRate * owned * mult;
    }
    const sheepMult = (typeof getAnimalPassiveUpgradeMult === 'function') ? getAnimalPassiveUpgradeMult() : 1;
    total *= sheepMult;
    gameState.moneyPerSecond = total;
}

// ── Buy a passive upgrade ─────────────────────────────────────────────────
function buyUpgrade(upgradeId) {
    const upgrade = PASSIVE_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    const idx = PASSIVE_UPGRADES.indexOf(upgrade);
    if (idx > 0) {
        const prev = PASSIVE_UPGRADES[idx - 1];
        if ((gameState.ownedUpgrades[prev.id] || 0) < 1) return;
    }
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
    if (milestone.chainPrev && !gameState.purchasedMilestones.includes(milestone.chainPrev)) return;
    if (!milestone.isUnlocked(gameState)) return;
    const cost = getMilestoneCost(milestone);
    if (gameState.playerMoney < cost) return;

    gameState.playerMoney -= cost;
    milestone.applyEffect(gameState);
    gameState.purchasedMilestones.push(milestoneId);
    saveGame();
    updateDisplay();
}

// ── Render sidebar ────────────────────────────────────────────────────────
// Called by updateDisplay(). Re-renders both upgrade sections from scratch.
function renderUpgrades() {
    renderPassiveUpgrades();
    if (typeof renderAnimals === 'function') renderAnimals();
    renderMilestones();
}

function renderPassiveUpgrades() {
    const container = document.getElementById('passive-upgrades-list');
    container.innerHTML = '';

    for (const upgrade of getVisiblePassiveUpgrades()) {
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
        if (!isMilestoneVisible(milestone, gameState)) continue;

        const purchased = gameState.purchasedMilestones.includes(milestone.id);
        const unlocked  = milestone.isUnlocked(gameState);
        const cost = getMilestoneCost(milestone);
        const canAfford = gameState.playerMoney >= cost;

        let cardClass = 'upgrade-card';
        if (purchased)       cardClass += ' purchased';
        else if (!canAfford) cardClass += ' cant-afford';
        else                 cardClass += ' can-afford';

        const card = document.createElement('div');
        card.className = cardClass;
        if (!purchased && unlocked) card.onclick = () => buyMilestone(milestone.id);

        const icon = purchased ? '✅' : '🔓';
        let bottomRow;
        if (purchased) {
            bottomRow = `<span class="upgrade-effect">${milestone.effectText}</span>`;
        } else {
            bottomRow = `<span class="upgrade-cost">💰 ${formatMoney(cost)}</span>`;
        }

        card.innerHTML = `
            <span class="upgrade-name">${icon} ${milestone.emoji} ${milestone.name}</span>
            <span class="upgrade-level">${purchased ? 'Owned' : ''}</span>
            ${bottomRow}
        `;
        container.appendChild(card);
    }
}
