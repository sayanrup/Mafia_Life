/* ============================================================
   UNDERWORLD - Static Data Tables
   Eras, origins, ranks, items, name pools, district templates.
   ============================================================ */

const ERAS = {
  '80s':   { id: '80s',   label: '1980s',      flavor: 'neon-lit streets, pagers, cocaine cowboys and cassette tapes' },
  '90s':   { id: '90s',   label: '1990s',      flavor: 'beepers, dial-up modems, the calm before the cell phone wars' },
  '2000s': { id: '2000s', label: '2000s',      flavor: 'flip phones, burner accounts, the rise of wiretaps and task forces' },
  'modern':{ id: 'modern',label: 'Modern Day', flavor: 'encrypted apps, drones, crypto ledgers and citywide camera grids' },
  'custom':{ id: 'custom',label: 'Custom Era', flavor: '' }
};

const ORIGINS = {
  hustler: {
    id: 'hustler',
    label: 'Street Hustler',
    desc: 'You grew up running corners and learned to read people before you could read a menu.',
    start: {
      cashDirty: 400, cashClean: 50,
      reputation: { street: 20, gang: 5, cartel: 0 },
      crewSize: 2, crewQuality: 1, crewLoyalty: 55,
      heat: { pd: 5, feds: 0, gangs: 5 },
      bonus: 'Street rep gains are +20% and mugging/extortion pay better.'
    }
  },
  military: {
    id: 'military',
    label: 'Ex-Military',
    desc: 'Discharged, disillusioned, and disturbingly calm under fire.',
    start: {
      cashDirty: 150, cashClean: 200,
      reputation: { street: 5, gang: 0, cartel: 0 },
      crewSize: 1, crewQuality: 2, crewLoyalty: 60,
      heat: { pd: 0, feds: 5, gangs: 0 },
      bonus: 'Combat rolls get a flat bonus and crew weapon training is faster.'
    }
  },
  smuggler: {
    id: 'smuggler',
    label: "Smuggler's Family",
    desc: 'Born into the trade. You know which docks look the other way.',
    start: {
      cashDirty: 300, cashClean: 100,
      reputation: { street: 5, gang: 10, cartel: 25 },
      crewSize: 2, crewQuality: 1, crewLoyalty: 50,
      heat: { pd: 5, feds: 5, gangs: 0 },
      bonus: 'Smuggling runs have lower bust risk and cartel rep starts higher.'
    }
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate Dropout',
    desc: 'You used to launder spreadsheets. Now you launder everything else.',
    start: {
      cashDirty: 50, cashClean: 500,
      reputation: { street: 0, gang: 0, cartel: 0 },
      crewSize: 1, crewQuality: 1, crewLoyalty: 50,
      heat: { pd: 0, feds: 0, gangs: 0 },
      bonus: 'Shell companies launder faster and business fronts cost less.'
    }
  }
};

const RANKS = [
  { id: 'Associate', threshold: 0,   crewCap: 4,  perk: 'Can run basic crimes and smuggling.' },
  { id: 'Soldier',    threshold: 20, crewCap: 8,  perk: 'Unlocks Bribe (Rival Crew) and Stash House upgrades.' },
  { id: 'Capo',       threshold: 45, crewCap: 14, perk: 'Unlocks Lieutenants and Shell Companies.' },
  { id: 'Underboss',  threshold: 70, crewCap: 22, perk: 'Unlocks founding/leading a Gang and major gang wars.' },
  { id: 'Boss',       threshold: 90, crewCap: 35, perk: 'Unlocks the Commission.' }
];

// Weighted score used to evaluate rank-up: street + gang + cartel rep, averaged with territory influence (computed at runtime)
function rankForScore(score) {
  let cur = RANKS[0];
  for (const r of RANKS) if (score >= r.threshold) cur = r;
  return cur;
}
function rankIndex(rankId) {
  return RANKS.findIndex(r => r.id === rankId);
}

const WEAPON_TIERS = [
  { id: 0, label: 'Improvised',        unitCost: 50,   combatBonus: 0,  qualityFloor: 1 },
  { id: 1, label: 'Pistols',           unitCost: 250,  combatBonus: 3,  qualityFloor: 2 },
  { id: 2, label: 'SMGs / Rifles',     unitCost: 900,  combatBonus: 7,  qualityFloor: 3 },
  { id: 3, label: 'Heavy / Military Grade', unitCost: 3000, combatBonus: 13, qualityFloor: 4 }
];

const PRODUCT_TYPES = {
  weed:       { id: 'weed',       label: 'Weed',        baseValue: 12 },
  pills:      { id: 'pills',      label: 'Pills',       baseValue: 30 },
  powder:     { id: 'powder',     label: 'Powder',      baseValue: 80 },
  arms:       { id: 'arms',       label: 'Arms',        baseValue: 150 },
  contraband: { id: 'contraband', label: 'Contraband',  baseValue: 45 }
};

const PERSONALITIES = ['Aggressive', 'Diplomatic', 'Opportunistic'];

const PERSONALITY_DESC = {
  Aggressive:    'Expands by force whenever possible and rarely backs down from a fight.',
  Diplomatic:    'Prefers negotiation, bribes, and truces over open conflict.',
  Opportunistic: 'Strikes only when an opponent looks weak, otherwise consolidates.'
};

const OPERATION_DEFS = {
  stash: {
    label: 'Stash House',
    tiers: [
      { name: 'None', cost: 0, capacity: 20, heatMitigation: 0, goodsCapacity: 0 },
      { name: 'Safehouse', cost: 1200, capacity: 60, heatMitigation: 5, goodsCapacity: 50000 },
      { name: 'Reinforced Den', cost: 4500, capacity: 150, heatMitigation: 12, goodsCapacity: 150000 },
      { name: 'Fortified Vault', cost: 12000, capacity: 400, heatMitigation: 22, goodsCapacity: 400000 }
    ]
  },
  route: {
    label: 'Smuggling Route',
    tiers: [
      { name: 'None', cost: 0, throughput: 0, bustRisk: 0 },
      { name: 'Local Courier', cost: 1000, throughput: 30, bustRisk: 12 },
      { name: 'Cross-Border Line', cost: 5000, throughput: 90, bustRisk: 18 },
      { name: 'Cartel Pipeline', cost: 15000, throughput: 250, bustRisk: 25 }
    ]
  }
};

const BUSINESS_TYPES = [
  { type: 'Diner', basePrice: 8000, baseIncome: 1000, launderBonus: 400, heatReduction: 0 },
  { type: 'Laundromat', basePrice: 6000, baseIncome: 750, launderBonus: 800, heatReduction: 0 },
  { type: 'Bar', basePrice: 12000, baseIncome: 1500, launderBonus: 600, heatReduction: 1 },
  { type: 'Auto Repair Shop', basePrice: 15000, baseIncome: 1900, launderBonus: 700, heatReduction: 1 },
  { type: 'Pawn Shop', basePrice: 10000, baseIncome: 1300, launderBonus: 900, heatReduction: 0 },
  { type: 'Real Estate Office', basePrice: 25000, baseIncome: 3200, launderBonus: 1500, heatReduction: 2 },
  { type: 'Nightclub', basePrice: 30000, baseIncome: 4000, launderBonus: 1800, heatReduction: 2 },
  { type: 'Vending Route', basePrice: 4000, baseIncome: 500, launderBonus: 300, heatReduction: 0 }
];

/* ---------------- Drug Operations (Boss-tier farms/labs) ---------------- */

const FARM_TYPES = {
  weed:   { product: 'weed',   label: 'Weed Farm',   icon: '🌿', plotBaseCost: 60000,  plotCostStep: 30000, batchValuePerPlot: 150000, growTurns: 3 },
  pills:  { product: 'pills',  label: 'Pill Press',  icon: '💊', plotBaseCost: 100000, plotCostStep: 50000, batchValuePerPlot: 250000, growTurns: 3 },
  powder: { product: 'powder', label: 'Cocaine Lab', icon: '❄️', plotBaseCost: 160000, plotCostStep: 80000, batchValuePerPlot: 400000, growTurns: 3 }
};

const EQUIPMENT_TIERS = [
  { tier: 0, name: 'Basic Setup',          cost: 0,      yieldMult: 1.0 },
  { tier: 1, name: 'Upgraded Equipment',   cost: 40000,  yieldMult: 1.3 },
  { tier: 2, name: 'Industrial Gear',      cost: 120000, yieldMult: 1.7 },
  { tier: 3, name: 'State-of-the-Art Rig', cost: 300000, yieldMult: 2.5 }
];

const DISTRIBUTOR_HIRE_COST = 5000;
const DISTRIBUTOR_UPKEEP = 400;
const DISTRIBUTOR_BASE_CAPACITY = 2000; // cash value a distributor can move per turn on foot/unaided

const OPS_ECONOMY = {
  unlockRank: 'Associate',
  protectionPerDollar: 1 / 40,
  protectionDecay: 8,
  raidBaseRisk: 5,
  priceMinMult: 0.5,
  priceMaxMult: 2.0,
  stashRentalRate: 0.015 // % of free stash goods-capacity paid to you per turn by other crews renting space
};

/* ---------------- Operations Progression by Rank ---------------- */
// Controls how much of the drug-operation system is open at each rank.
// maxPlotsPerDistrict applies per district per product.

const OPS_RANK_LIMITS = {
  Associate: { unlockedProducts: ['weed'], maxPlotsPerDistrict: 1, maxEquipmentTier: 0, maxDistributors: 1 },
  Soldier:   { unlockedProducts: ['weed', 'pills'], maxPlotsPerDistrict: 2, maxEquipmentTier: 1, maxDistributors: 3 },
  Capo:      { unlockedProducts: ['weed', 'pills', 'powder'], maxPlotsPerDistrict: 4, maxEquipmentTier: 2, maxDistributors: 6 },
  Underboss: { unlockedProducts: ['weed', 'pills', 'powder'], maxPlotsPerDistrict: 6, maxEquipmentTier: 3, maxDistributors: 10 },
  Boss:      { unlockedProducts: ['weed', 'pills', 'powder'], maxPlotsPerDistrict: 10, maxEquipmentTier: 3, maxDistributors: 20 }
};

function getOpsLimits(state) {
  return OPS_RANK_LIMITS[state.player.rank] || OPS_RANK_LIMITS.Associate;
}

/* ---------------- Vehicles (Distribution Fleet) ---------------- */

const VEHICLE_TYPES = [
  { id: 'sedan',  label: 'Beat-up Sedan',  cost: 6000,   cargoCapacity: 6000,   crewCapacity: 2, upkeep: 80,   resaleMult: 0.5 },
  { id: 'van',    label: 'Cargo Van',      cost: 16000,  cargoCapacity: 25000,  crewCapacity: 3, upkeep: 200,  resaleMult: 0.5 },
  { id: 'suv',    label: 'Armored SUV',    cost: 32000,  cargoCapacity: 45000,  crewCapacity: 4, upkeep: 350,  resaleMult: 0.5 },
  { id: 'truck',  label: 'Box Truck',      cost: 55000,  cargoCapacity: 110000, crewCapacity: 2, upkeep: 500,  resaleMult: 0.5 },
  { id: 'armored',label: 'Armored Truck',  cost: 140000, cargoCapacity: 300000, crewCapacity: 4, upkeep: 1200, resaleMult: 0.5 }
];

/* ---------------- Money Laundering via Rival Gangs ---------------- */

const GANG_LAUNDER_CUT = 0.30; // cut taken by outside fixers before shell companies are available
const WEAPON_SELL_MULT = 0.5; // fraction of unit cost recovered when selling armory weapons

/* ---------------- Kidnapping Racket ---------------- */

const KIDNAP_JOBS = [
  { id: 'dealer',     label: 'Snatch a Rival Dealer',        icon: '🎯', desc: 'Grab a low-level rival dealer and hold them for ransom.', cashMin: 2000,  cashMax: 8000,   heatMin: 5,  heatMax: 12, repGain: 2,  difficulty: 14, unlockRank: 'Soldier' },
  { id: 'bookie',     label: 'Kidnap a Bookie',               icon: '📒', desc: "Lean on a bookie who owes the wrong people.",              cashMin: 4000,  cashMax: 15000,  heatMin: 6,  heatMax: 15, repGain: 3,  difficulty: 18, unlockRank: 'Capo' },
  { id: 'businessman',label: 'Snatch a Businessman',          icon: '💼', desc: 'Grab a wealthy local businessman for a fat ransom.',       cashMin: 10000, cashMax: 40000,  heatMin: 10, heatMax: 22, repGain: 4,  difficulty: 24, unlockRank: 'Capo' },
  { id: 'lieutenant', label: "Kidnap a Rival's Lieutenant",   icon: '🥃', desc: "Take one of a rival gang's lieutenants hostage.",          cashMin: 15000, cashMax: 60000,  heatMin: 12, heatMax: 28, repGain: 6,  difficulty: 30, unlockRank: 'Underboss' },
  { id: 'tycoon',     label: 'Kidnap a City Tycoon',          icon: '🏙️', desc: 'The biggest score: grab a city tycoon and demand a fortune.', cashMin: 40000, cashMax: 150000, heatMin: 18, heatMax: 35, repGain: 10, difficulty: 38, unlockRank: 'Boss' }
];

function isUnlockedForRank(state, unlockRank) {
  return rankIndex(state.player.rank) >= rankIndex(unlockRank);
}

/* ---------------- Action Economy ---------------- */

const MAX_ACTION_REPEATS = 3; // each distinct action type can be repeated at most this many times per turn

/* ---------------- Street Crimes (beyond the basic Mug a Mark) ---------------- */

const STREET_CRIMES = [
  { id: 'pickpocket',  label: 'Pickpocket',          icon: '🧤', desc: 'Lift a wallet in a crowded market.',          cashMin: 15,  cashMax: 90,   heatMin: 0, heatMax: 2, repGain: 1, difficulty: 5, unlockRank: 'Associate' },
  { id: 'shoplift',    label: 'Shoplifting',         icon: '🛍️', desc: 'Walk out of a store with merchandise to fence.', cashMin: 30,  cashMax: 150,  heatMin: 1, heatMax: 3, repGain: 1, difficulty: 6, unlockRank: 'Associate' },
  { id: 'cartheft',    label: 'Car Theft',           icon: '🚗', desc: 'Boost a parked car and sell it to a chop shop.', cashMin: 200, cashMax: 900,  heatMin: 3, heatMax: 8, repGain: 2, difficulty: 14, unlockRank: 'Capo' },
  { id: 'vandalism',   label: 'Vandalism for Hire',  icon: '🔨', desc: "Trash a rival's storefront for a quick payday.", cashMin: 50,  cashMax: 250,  heatMin: 2, heatMax: 6, repGain: 1, difficulty: 8, unlockRank: 'Associate' },
  { id: 'fence',       label: 'Fence Stolen Goods',  icon: '💎', desc: 'Move hot merchandise through a fence.',        cashMin: 100, cashMax: 500,  heatMin: 1, heatMax: 4, repGain: 1, difficulty: 7, unlockRank: 'Associate' },
  { id: 'dicehustle',  label: 'Street Dice Hustle',  icon: '🎲', desc: 'Run a rigged dice game on the corner.',        cashMin: 30,  cashMax: 180,  heatMin: 0, heatMax: 3, repGain: 1, difficulty: 6, unlockRank: 'Associate' },
  { id: 'skimming',    label: 'ATM Skimming',        icon: '💳', desc: 'Rig a card skimmer on a local ATM.',           cashMin: 150, cashMax: 700,  heatMin: 2, heatMax: 7, repGain: 1, difficulty: 12, unlockRank: 'Soldier' },
  { id: 'pilferage',   label: 'Cargo Pilferage',     icon: '📦', desc: 'Snatch goods off a delivery truck.',           cashMin: 100, cashMax: 600,  heatMin: 2, heatMax: 6, repGain: 2, difficulty: 11, unlockRank: 'Soldier' },
  { id: 'shakedown',   label: 'Corner Store Shakedown', icon: '✊', desc: 'Strong-arm a small business for quick cash.', cashMin: 80,  cashMax: 400,  heatMin: 2, heatMax: 5, repGain: 2, difficulty: 9, unlockRank: 'Soldier' }
];

/* ---------------- Help a Gang (gig work, no membership required) ---------------- */

const GANG_GIGS = [
  { id: 'message',  label: 'Pass a Message',  icon: '✉️', desc: 'Deliver a coded message between crews.',          cashMin: 50,  cashMax: 200, heatMin: 0, heatMax: 2, relationGain: 3, gangRepGain: 1, difficulty: 4, unlockRank: 'Associate' },
  { id: 'package',  label: 'Deliver a Package', icon: '📦', desc: "Move a sealed package without asking questions.", cashMin: 100, cashMax: 400, heatMin: 1, heatMax: 4, relationGain: 4, gangRepGain: 2, difficulty: 8, unlockRank: 'Soldier' },
  { id: 'lookout',  label: 'Stand Lookout',   icon: '👀', desc: 'Watch the street while the crew works.',          cashMin: 60,  cashMax: 250, heatMin: 0, heatMax: 3, relationGain: 2, gangRepGain: 1, difficulty: 5, unlockRank: 'Associate' },
  { id: 'collect',  label: 'Collect a Debt',  icon: '💵', desc: 'Lean on someone who owes the gang money.',        cashMin: 120, cashMax: 500, heatMin: 2, heatMax: 6, relationGain: 5, gangRepGain: 2, difficulty: 10, unlockRank: 'Soldier' },
  { id: 'wheelman', label: 'Be the Wheelman', icon: '🚙', desc: "Drive the getaway car for a job that isn't yours.", cashMin: 150, cashMax: 600, heatMin: 2, heatMax: 7, relationGain: 5, gangRepGain: 3, difficulty: 11, unlockRank: 'Capo' },
  { id: 'recon',    label: 'Scout a Location', icon: '🔭', desc: 'Case a building the gang is planning to hit.',    cashMin: 80,  cashMax: 300, heatMin: 0, heatMax: 2, relationGain: 3, gangRepGain: 1, difficulty: 6, unlockRank: 'Associate' }
];

const HEIST_UNLOCK_RANK = 'Soldier';

const SHELL_TIERS = [
  { tier: 1, cost: 3000,  launderPerTurn: 600,  fee: 0.15, auditRisk: 6 },
  { tier: 2, cost: 9000,  launderPerTurn: 1800, fee: 0.12, auditRisk: 9 },
  { tier: 3, cost: 25000, launderPerTurn: 5000, fee: 0.08, auditRisk: 13 }
];

/* ---------------- AI Narrative Model Options (via OpenRouter) ---------------- */
// Costs are USD per 1M tokens. null cost = unknown / depends on the model the
// player types in for the 'custom' option.

const AI_MODEL_OPTIONS = [
  { id: 'openrouter/auto:free', label: 'OpenRouter Auto (Free)', inputCost: 0,    outputCost: 0 },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', inputCost: 0.05, outputCost: 0.30 },
  { id: 'moonshotai/kimi-k2', label: 'Kimi K2', inputCost: 0.55, outputCost: 2.20 },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct', inputCost: 0.35, outputCost: 0.40 },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', inputCost: 0.15, outputCost: 0.60 },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', inputCost: 0.27, outputCost: 1.10 },
  { id: 'custom', label: 'Custom (type a model ID)', inputCost: null, outputCost: null }
];

/* ---------------- Name Pools ---------------- */

const NAME_POOLS = {
  firstMale: ['Tony','Marco','Vinnie','Ray','Sal','Dom','Eddie','Frankie','Lou','Nico','Carmine','Joey','Mickey','Sonny','Pete','Gus','Hector','Diego','Mateo','Sergio','Reggie','Marcus','Darnell','Tyrone','Andre','Wesley','Owen','Jules','Vic','Stan'],
  firstFemale: ['Gia','Sofia','Renata','Donna','Carla','Vivian','Angela','Marisol','Bianca','Dolores','Yolanda','Tasha','Nadia','Selena','Rosa','Camille','Vera','Lucia','Diane','Maxine'],
  last: ['Russo','Marchetti','Calabrese','Vitale','Donnelly','Castellano','Moreno','Reyes','Okafor','Banks','Sterling','Vance','Kowalski','Nguyen','Petrov','Romano','Esposito','Delgado','Brennan','Carver','Whitmore','Salerno','Vasquez','Quinn','Marrone'],
  gang: ['Talon Boys','Red Sash Crew','Salt Row Outfit','Iron Hill Mob','Vultures','Black Tide','Cinder Syndicate','Gravediggers','Hollow Point Crew','The Wire','Marlowe Family','Cobblestone Kings','Night Market Cartel','The Foundry','Riverside Union','Brass Knuckle Boys','Ash Street Gang','The Quiet Few','Sundown Crew','Pale Horse Outfit'],
  business: ['Lucky','Golden','Silver','Crown','Rusty','Midnight','Velvet','Iron','Sunset','Corner','Eastside','Downtown','Royal','Diamond','Big Easy','Old Mill','Riverside','Union','Coastal','Echo']
};

const COP_FIRST = ['Diane','Robert','James','Carla','Pete','Marcus','Linda','Frank','Yusuf','Patricia','Ray','Howard','Glenn','Tasha','Walter'];
const COP_PERSONALITIES = ['Corrupt', 'By-the-Book', 'Ambitious'];
const COP_PERSONALITY_DESC = {
  Corrupt: 'Takes bribes readily and at a discount, but cannot be fully trusted.',
  'By-the-Book': 'Rarely accepts bribes; expensive and risky to approach.',
  Ambitious: 'Will deal, but expects bigger payoffs as they climb the ranks.'
};

/* ---------------- District Name Generation ---------------- */

const DISTRICT_SUFFIXES = ['Heights','Row','District','Quarter','Flats','Yards','Park','Harbor','Crossing','End','Square','Hollow'];
const DISTRICT_PREFIXES = ['North','South','East','West','Old','New','Lower','Upper'];

function generateDistrictNames(cityName) {
  const used = new Set();
  const names = [];
  const pool = [
    `Old ${cityName}`,
    `${cityName} Harbor`,
    `Downtown ${cityName}`,
    `${cityName} Heights`,
    `South ${cityName}`,
    `${cityName} Industrial Yards`,
    `North ${cityName}`,
    `${cityName} Riverside`
  ];
  while (names.length < 5) {
    let candidate;
    if (pool.length) {
      candidate = pool.shift();
    } else {
      const pre = DISTRICT_PREFIXES[Math.floor(Math.random() * DISTRICT_PREFIXES.length)];
      const suf = DISTRICT_SUFFIXES[Math.floor(Math.random() * DISTRICT_SUFFIXES.length)];
      candidate = `${pre} ${suf}`;
    }
    if (!used.has(candidate)) {
      used.add(candidate);
      names.push(candidate);
    }
  }
  return names;
}

const CITY_SUGGESTIONS = ['Port Calloway', 'New Verona', 'Granite Bay', 'East Harlow', 'Castelmare', 'Brindle City', 'Marrow Falls', 'Tidewater'];

function randomName(gender) {
  const first = gender === 'female' ? NAME_POOLS.firstFemale : NAME_POOLS.firstMale;
  const f = first[Math.floor(Math.random() * first.length)];
  const l = NAME_POOLS.last[Math.floor(Math.random() * NAME_POOLS.last.length)];
  return `${f} ${l}`;
}
