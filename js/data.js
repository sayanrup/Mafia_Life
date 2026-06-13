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
  { id: 'Associate', threshold: 0,   crewCap: 8,  perk: 'Can run basic crimes and smuggling.' },
  { id: 'Soldier',    threshold: 20, crewCap: 16, perk: 'Unlocks Bribe (Rival Crew) and Stash House upgrades.' },
  { id: 'Capo',       threshold: 45, crewCap: 28, perk: 'Unlocks Lieutenants and Shell Companies.' },
  { id: 'Underboss',  threshold: 70, crewCap: 44, perk: 'Unlocks founding/leading a Gang and major gang wars.' },
  { id: 'Boss',       threshold: 90, crewCap: 70, perk: 'Unlocks the Commission.' }
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
  { id: 0, label: 'Improvised',           unitCost: 50,    combatBonus: 0,  qualityFloor: 1, unlockRank: 'Associate' },
  { id: 1, label: 'Pistols',              unitCost: 250,   combatBonus: 3,  qualityFloor: 2, unlockRank: 'Associate' },
  { id: 2, label: 'Shotguns',             unitCost: 600,   combatBonus: 5,  qualityFloor: 2, unlockRank: 'Associate' },
  { id: 3, label: 'SMGs',                 unitCost: 1200,  combatBonus: 8,  qualityFloor: 3, unlockRank: 'Soldier' },
  { id: 4, label: 'Assault Rifles',       unitCost: 2200,  combatBonus: 11, qualityFloor: 3, unlockRank: 'Soldier' },
  { id: 5, label: 'Heavy / Military Grade', unitCost: 3500, combatBonus: 14, qualityFloor: 4, unlockRank: 'Capo' },
  { id: 6, label: 'Explosives & Demolition', unitCost: 6000, combatBonus: 18, qualityFloor: 4, unlockRank: 'Underboss' },
  { id: 7, label: 'Tactical / SF Grade',  unitCost: 10000, combatBonus: 24, qualityFloor: 5, unlockRank: 'Boss' }
];

const LIEUTENANT_ASSIGNMENTS = [
  { id: 'district',  label: 'Run District Operations', desc: 'Boosts smuggling route income in the assigned district.' },
  { id: 'smuggling', label: 'Lead Smuggling Run',       desc: 'Funnels contraband into your stash every turn.' },
  { id: 'security',  label: 'Oversee Security Detail',  desc: 'Keeps police attention down in the assigned district.' },
  { id: 'recruit',   label: 'Run Recruitment Drive',    desc: 'Periodically brings in new crew members for free.' },
  { id: 'enforcer',  label: 'Command Enforcers',        desc: 'Keeps the crew in line, reducing betrayal risk.' },
  { id: 'diplomat',  label: 'Handle Gang Diplomacy',    desc: 'Improves relations with the gang controlling the assigned district.' }
];

const TRAINING_PROGRAMS = [
  { id: 'basic',      label: 'Basic Drills',          desc: 'Fundamentals of working as a crew.', cost: 5000,   qualityGain: 0.2, unlockRank: 'Associate' },
  { id: 'weapons',    label: 'Weapons Handling',      desc: 'Safer, faster, more accurate gunplay.', cost: 12000,  qualityGain: 0.3, unlockRank: 'Associate' },
  { id: 'tactical',   label: 'Tactical Training',     desc: 'Coordinated movement and cover use.', cost: 25000,  qualityGain: 0.4, unlockRank: 'Soldier' },
  { id: 'survival',   label: 'Survival Training',     desc: 'Patch up and keep fighting.', cost: 40000,  qualityGain: 0.4, unlockRank: 'Soldier' },
  { id: 'elite',      label: 'Elite Conditioning',    desc: 'Hardened veterans lead by example.', cost: 75000,  qualityGain: 0.6, unlockRank: 'Capo' },
  { id: 'specialist', label: 'Specialist Ops Course', desc: 'Demolitions, infiltration, wheelwork.', cost: 130000, qualityGain: 0.7, unlockRank: 'Underboss' },
  { id: 'legendary',  label: 'Legendary Crew Forging', desc: 'The kind of outfit people tell stories about.', cost: 250000, qualityGain: 1.0, unlockRank: 'Boss' }
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
      { name: 'None', cost: 0, throughput: 0, bustRisk: 0, cashMin: 0, cashMax: 0 },
      { name: 'Local Courier', cost: 1000, throughput: 30, bustRisk: 12, cashMin: 1200, cashMax: 2400 },
      { name: 'Cross-Border Line', cost: 5000, throughput: 90, bustRisk: 18, cashMin: 4000, cashMax: 8000 },
      { name: 'Cartel Pipeline', cost: 15000, throughput: 250, bustRisk: 25, cashMin: 9000, cashMax: 16000 }
    ]
  }
};

const BUSINESS_TYPES = [
  { type: 'Street Side Lemonade Stall', basePrice: 100,    baseIncome: 30,    launderBonus: 10,    heatReduction: 0 },
  { type: 'Newspaper Stand',            basePrice: 300,    baseIncome: 75,    launderBonus: 30,    heatReduction: 0 },
  { type: 'Food Cart',                  basePrice: 800,    baseIncome: 180,   launderBonus: 80,    heatReduction: 0 },
  { type: 'Vending Route',              basePrice: 2000,   baseIncome: 420,   launderBonus: 180,   heatReduction: 0 },
  { type: 'Tattoo Parlor',              basePrice: 4000,   baseIncome: 780,   launderBonus: 300,   heatReduction: 0 },
  { type: 'Laundromat',                 basePrice: 6000,   baseIncome: 1125,  launderBonus: 900,   heatReduction: 0 },
  { type: 'Diner',                      basePrice: 9000,   baseIncome: 1725,  launderBonus: 500,   heatReduction: 0 },
  { type: 'Pawn Shop',                  basePrice: 13000,  baseIncome: 2475,  launderBonus: 1200,  heatReduction: 1 },
  { type: 'Bar',                        basePrice: 18000,  baseIncome: 3375,  launderBonus: 900,   heatReduction: 1 },
  { type: 'Auto Repair Shop',           basePrice: 24000,  baseIncome: 4500,  launderBonus: 1100,  heatReduction: 1 },
  { type: 'Check Cashing Store',        basePrice: 30000,  baseIncome: 5625,  launderBonus: 2800,  heatReduction: 1 },
  { type: 'Tow Yard',                   basePrice: 38000,  baseIncome: 7050,  launderBonus: 1700,  heatReduction: 1 },
  { type: 'Storage Facility',           basePrice: 48000,  baseIncome: 9000,  launderBonus: 3000,  heatReduction: 2 },
  { type: 'Real Estate Office',         basePrice: 60000,  baseIncome: 11250, launderBonus: 3600,  heatReduction: 2 },
  { type: 'Construction Firm',          basePrice: 75000,  baseIncome: 13950, launderBonus: 5000,  heatReduction: 2 },
  { type: 'Nightclub',                  basePrice: 95000,  baseIncome: 17700, launderBonus: 4500,  heatReduction: 2 },
  { type: 'Import/Export Co',           basePrice: 120000, baseIncome: 22500, launderBonus: 8000,  heatReduction: 2 },
  { type: 'Casino',                     basePrice: 160000, baseIncome: 30000, launderBonus: 10500, heatReduction: 3 },
  { type: 'Luxury Car Dealership',      basePrice: 210000, baseIncome: 39000, launderBonus: 14000, heatReduction: 3 },
  { type: 'Hotel Chain',                basePrice: 280000, baseIncome: 52500, launderBonus: 19000, heatReduction: 3 }
];

/* ---------------- Drug Operations (Boss-tier farms/labs) ---------------- */

// Each product progresses through 5 facility tiers, from a cheap starter setup
// up to a full-scale operation. "plots" now represents how many tiers of
// facility have been bought (1 = Terrace only, 5 = fully built out).
function buildFarmTiers(mult) {
  return [
    { name: 'Terrace Grow',      cost: Math.round(100 * mult),   batchValue: Math.round(2000 * mult),   growTurns: 1 },
    { name: 'Rented Grow House', cost: Math.round(6000 * mult),  batchValue: Math.round(16000 * mult),  growTurns: 2 },
    { name: 'Garage Setup',      cost: Math.round(20000 * mult), batchValue: Math.round(60000 * mult),  growTurns: 2 },
    { name: 'Small Field',       cost: Math.round(35000 * mult), batchValue: Math.round(120000 * mult), growTurns: 3 },
    { name: 'Mega Field',        cost: Math.round(60000 * mult), batchValue: Math.round(300000 * mult), growTurns: 3 }
  ];
}

const FARM_TYPES = {
  weed:   { product: 'weed',   label: 'Weed Farm',   icon: '🌿', growTurns: 3, facilityTiers: buildFarmTiers(1) },
  pills:  { product: 'pills',  label: 'Pill Press',  icon: '💊', growTurns: 3, facilityTiers: buildFarmTiers(100000 / 60000) },
  powder: { product: 'powder', label: 'Cocaine Lab', icon: '❄️', growTurns: 3, facilityTiers: buildFarmTiers(160000 / 60000) }
};

const EQUIPMENT_TIERS = [
  { tier: 0, name: 'Basic Setup',            cost: 0,      yieldMult: 1.0 },
  { tier: 1, name: 'Upgraded Tools',         cost: 25000,  yieldMult: 1.2 },
  { tier: 2, name: 'Upgraded Equipment',     cost: 60000,  yieldMult: 1.4 },
  { tier: 3, name: 'Industrial Gear',        cost: 130000, yieldMult: 1.7 },
  { tier: 4, name: 'Advanced Lab Setup',     cost: 240000, yieldMult: 2.1 },
  { tier: 5, name: 'State-of-the-Art Rig',   cost: 400000, yieldMult: 2.6 },
  { tier: 6, name: 'Cartel-Grade Operation', cost: 650000, yieldMult: 3.3 }
];

/* ---------------- Distributors (6 hireable tiers per product) ---------------- */
// No upfront hiring cost - distributors are paid a per-turn wage instead.
// Actual units moved each turn vary +/-50% with equipment efficiency and gang heat.

const DISTRIBUTOR_TYPES = [
  { id: 'dealer',    label: 'Independent Dealer', upkeep: 200,  capacity: 2500,  unlockCash: 0 },
  { id: 'street',    label: 'Street Runner',      upkeep: 400,  capacity: 5000,  unlockCash: 0 },
  { id: 'van',       label: 'Van Crew',           upkeep: 900,  capacity: 12500, unlockCash: 10000 },
  { id: 'wholesale', label: 'Wholesale Broker',   upkeep: 1800, capacity: 27500, unlockCash: 50000 },
  { id: 'cartel',    label: 'Cartel Liaison',     upkeep: 3200, capacity: 55000, unlockCash: 150000 },
  { id: 'syndicate', label: 'Syndicate Fixer',    upkeep: 5000, capacity: 95000, unlockCash: 400000 }
];

/* ---------------- Security Details (preset operation-protection payoffs) ---------------- */

const SECURITY_TIERS = [
  { id: 'patrol',   label: 'Light Patrol Payoff', amount: 1000,  incomePerTurn: 1000, desc: 'Slip the beat cops walking your blocks a little something. Also kicks back a cut of their take.' },
  { id: 'beatcop',  label: 'Beat Cop Retainer',   amount: 2500,  incomePerTurn: 1800, desc: 'Put a local officer on a standing payoff who shares a slice of the action.' },
  { id: 'detective',label: 'Detective on Payroll', amount: 5000, incomePerTurn: 3000, desc: 'A detective looks the other way on your operation - and tips you off to easy money.' },
  { id: 'captain',  label: "Captain's Cut",       amount: 10000, incomePerTurn: 5000, desc: "The precinct captain keeps raids off your block and steers business your way." },
  { id: 'federal',  label: 'Federal Contact',     amount: 20000, incomePerTurn: 9000, desc: 'A fed makes sure your operation stays off the radar entirely - and feeds you protection money.' }
];

/* ---------------- Marketing Campaigns (temporary demand boosts) ---------------- */

const MARKETING_CAMPAIGNS = [
  { id: 'flyers',       label: 'Street Flyers',           desc: 'Cheap word-of-mouth push around the block.',          cost: 2000,  demandBonus: 0.10, turns: 2, unlockCash: 0 },
  { id: 'wordofmouth',  label: 'Word of Mouth Push',       desc: 'Get your regulars talking up the product.',           cost: 5000,  demandBonus: 0.18, turns: 3, unlockCash: 0 },
  { id: 'radio',        label: 'Pirate Radio Spot',        desc: 'A coded shoutout on the underground airwaves.',       cost: 12000, demandBonus: 0.28, turns: 3, unlockCash: 10000 },
  { id: 'influencer',   label: 'Influencer Push',          desc: 'Pay a local influencer to vouch for your supply.',    cost: 25000, demandBonus: 0.40, turns: 4, unlockCash: 50000 },
  { id: 'cartelpromo',  label: 'Cartel-Backed Promotion',  desc: 'Tap the cartel marketing machine for a major spike.', cost: 60000, demandBonus: 0.60, turns: 5, unlockCash: 150000 }
];

/* ---------------- Street Price Presets ---------------- */

const PRICE_PRESETS = [
  { id: 'bargain',     label: 'Bargain',          mult: 0.6 },
  { id: 'discount',    label: 'Discount',         mult: 0.8 },
  { id: 'standard',    label: 'Standard',         mult: 1.0 },
  { id: 'premium',     label: 'Premium',          mult: 1.3 },
  { id: 'luxury',      label: 'Luxury',           mult: 1.6 },
  { id: 'blackmarket', label: 'Black Market Max', mult: 2.0 }
];

const OPS_ECONOMY = {
  unlockRank: 'Associate',
  protectionPerDollar: 1 / 40,
  protectionDecay: 8,
  protectionIncomeRate: 10, // $/turn kicked back per point of opProtection from generic bribes
  raidBaseRisk: 3,
  priceMinMult: 0.5,
  priceMaxMult: 2.0,
  stashRentalRate: 0.015 // % of free stash goods-capacity paid to you per turn by other crews renting space
};

/* ---------------- Operations Progression by Dirty Cash Earned ---------------- */
// Controls how much of the drug-operation system is open, gated on the most
// dirty cash you've ever held (state.meta.peakDirtyCash) rather than rank.
// maxPlotsPerDistrict applies per district per product (max 5 = all facility tiers).

const OPS_CASH_LIMITS = [
  { minDirtyCash: 0,      unlockedProducts: ['weed'],                       maxPlotsPerDistrict: 2, maxEquipmentTier: 1, maxDistributors: 2 },
  { minDirtyCash: 10000,  unlockedProducts: ['weed'],                       maxPlotsPerDistrict: 3, maxEquipmentTier: 2, maxDistributors: 3 },
  { minDirtyCash: 50000,  unlockedProducts: ['weed', 'pills'],              maxPlotsPerDistrict: 4, maxEquipmentTier: 4, maxDistributors: 6 },
  { minDirtyCash: 150000, unlockedProducts: ['weed', 'pills', 'powder'],    maxPlotsPerDistrict: 5, maxEquipmentTier: 5, maxDistributors: 10 },
  { minDirtyCash: 400000, unlockedProducts: ['weed', 'pills', 'powder'],    maxPlotsPerDistrict: 5, maxEquipmentTier: 6, maxDistributors: 20 }
];

function peakDirtyCash(state) {
  return Math.max(state.meta.peakDirtyCash || 0, state.player.cash.dirty);
}

function getOpsLimits(state) {
  const peak = peakDirtyCash(state);
  let cur = OPS_CASH_LIMITS[0];
  for (const tier of OPS_CASH_LIMITS) {
    if (peak >= tier.minDirtyCash) cur = tier;
  }
  return cur;
}

function isUnlockedForCash(state, unlockCash) {
  return peakDirtyCash(state) >= (unlockCash || 0);
}

// Beyond the Dirty Cash gate, building a product's facility up to the
// "Garage Setup" tier (3) in any district also unlocks the next product in
// the weed -> pills -> powder chain, so players can work their way up
// through upgrades alone.
const PRODUCT_PROGRESSION_TIER = 3;
const PRODUCT_PROGRESSION_CHAIN = { pills: 'weed', powder: 'pills' };

function getUnlockedProducts(state) {
  const unlocked = new Set(getOpsLimits(state).unlockedProducts);
  for (const [product, prereq] of Object.entries(PRODUCT_PROGRESSION_CHAIN)) {
    if (unlocked.has(product)) continue;
    const maxTier = Math.max(0, ...state.districts.map(d => d.farms[prereq].plots));
    if (maxTier >= PRODUCT_PROGRESSION_TIER) unlocked.add(product);
  }
  return ['weed', 'pills', 'powder'].filter(p => unlocked.has(p));
}

/* ---------------- Vehicles (Distribution Fleet) ---------------- */

const VEHICLE_TYPES = [
  { id: 'bicycle',      label: 'Beat-up Bicycle',     cost: 200,    cargoCapacity: 150,    crewCapacity: 1, upkeep: 0,    resaleMult: 0.5, unlockRank: 'Associate' },
  { id: 'mountainbike', label: 'Mountain Bike',       cost: 600,    cargoCapacity: 400,    crewCapacity: 1, upkeep: 5,    resaleMult: 0.5, unlockRank: 'Associate' },
  { id: 'moped',        label: 'Moped',               cost: 1500,   cargoCapacity: 900,    crewCapacity: 1, upkeep: 15,   resaleMult: 0.5, unlockRank: 'Associate' },
  { id: 'scooter',      label: 'Delivery Scooter',    cost: 2800,   cargoCapacity: 1500,   crewCapacity: 1, upkeep: 25,   resaleMult: 0.5, unlockRank: 'Associate' },
  { id: 'hatchback',    label: 'Old Hatchback',       cost: 4500,   cargoCapacity: 3500,   crewCapacity: 2, upkeep: 55,   resaleMult: 0.5, unlockRank: 'Associate' },
  { id: 'motorcycle',   label: 'Motorcycle',          cost: 5500,   cargoCapacity: 2200,   crewCapacity: 1, upkeep: 45,   resaleMult: 0.5, unlockRank: 'Soldier' },
  { id: 'sedan',        label: 'Beat-up Sedan',       cost: 6000,   cargoCapacity: 6000,   crewCapacity: 2, upkeep: 80,   resaleMult: 0.5, unlockRank: 'Soldier' },
  { id: 'pickup',       label: 'Pickup Truck',        cost: 11000,  cargoCapacity: 12000,  crewCapacity: 2, upkeep: 140,  resaleMult: 0.5, unlockRank: 'Soldier' },
  { id: 'minivan',      label: 'Family Minivan',      cost: 14000,  cargoCapacity: 18000,  crewCapacity: 3, upkeep: 170,  resaleMult: 0.5, unlockRank: 'Soldier' },
  { id: 'van',          label: 'Cargo Van',           cost: 16000,  cargoCapacity: 25000,  crewCapacity: 3, upkeep: 200,  resaleMult: 0.5, unlockRank: 'Capo' },
  { id: 'panelvan',     label: 'Panel Truck',         cost: 23000,  cargoCapacity: 35000,  crewCapacity: 3, upkeep: 270,  resaleMult: 0.5, unlockRank: 'Capo' },
  { id: 'suv',          label: 'Armored SUV',         cost: 32000,  cargoCapacity: 45000,  crewCapacity: 4, upkeep: 350,  resaleMult: 0.5, unlockRank: 'Capo' },
  { id: 'limo',         label: 'Armored Limo',        cost: 42000,  cargoCapacity: 15000,  crewCapacity: 6, upkeep: 420,  resaleMult: 0.5, unlockRank: 'Capo' },
  { id: 'truck',        label: 'Box Truck',           cost: 55000,  cargoCapacity: 110000, crewCapacity: 2, upkeep: 500,  resaleMult: 0.5, unlockRank: 'Underboss' },
  { id: 'flatbed',      label: 'Flatbed Truck',       cost: 68000,  cargoCapacity: 125000, crewCapacity: 2, upkeep: 580,  resaleMult: 0.5, unlockRank: 'Underboss' },
  { id: 'reefer',       label: 'Refrigerated Truck',  cost: 80000,  cargoCapacity: 140000, crewCapacity: 2, upkeep: 650,  resaleMult: 0.5, unlockRank: 'Underboss' },
  { id: 'tanker',       label: 'Tanker Truck',        cost: 95000,  cargoCapacity: 160000, crewCapacity: 2, upkeep: 750,  resaleMult: 0.5, unlockRank: 'Underboss' },
  { id: 'armored',      label: 'Armored Truck',       cost: 140000, cargoCapacity: 300000, crewCapacity: 4, upkeep: 1200, resaleMult: 0.5, unlockRank: 'Boss' },
  { id: 'semi',         label: '18-Wheeler',          cost: 200000, cargoCapacity: 480000, crewCapacity: 2, upkeep: 1700, resaleMult: 0.5, unlockRank: 'Boss' },
  { id: 'convoy',       label: 'Armored Convoy',      cost: 320000, cargoCapacity: 650000, crewCapacity: 8, upkeep: 2600, resaleMult: 0.5, unlockRank: 'Boss' }
];

const WEAPON_SELL_MULT = 0.5; // fraction of unit cost recovered when selling armory weapons

/* ---------------- Kidnapping Racket ---------------- */

const KIDNAP_JOBS = [
  { id: 'dealer',     label: 'Snatch a Rival Dealer',        icon: '🎯', desc: 'Grab a low-level rival dealer and hold them for ransom.', cashMin: 2000,  cashMax: 8000,   heatMin: 5,  heatMax: 12, repGain: 2,  difficulty: 14, unlockRank: 'Soldier' },
  { id: 'informant',  label: 'Snatch a Police Informant',     icon: '🕵️', desc: 'Grab the rat before they testify and make them disappear.', cashMin: 6000,  cashMax: 25000,  heatMin: 10, heatMax: 20, repGain: 3,  difficulty: 20, unlockRank: 'Soldier' },
  { id: 'bookie',     label: 'Kidnap a Bookie',               icon: '📒', desc: "Lean on a bookie who owes the wrong people.",              cashMin: 4000,  cashMax: 15000,  heatMin: 6,  heatMax: 15, repGain: 3,  difficulty: 18, unlockRank: 'Capo' },
  { id: 'businessman',label: 'Snatch a Businessman',          icon: '💼', desc: 'Grab a wealthy local businessman for a fat ransom.',       cashMin: 10000, cashMax: 40000,  heatMin: 10, heatMax: 22, repGain: 4,  difficulty: 24, unlockRank: 'Capo' },
  { id: 'lieutenant', label: "Kidnap a Rival's Lieutenant",   icon: '🥃', desc: "Take one of a rival gang's lieutenants hostage.",          cashMin: 15000, cashMax: 60000,  heatMin: 12, heatMax: 28, repGain: 6,  difficulty: 30, unlockRank: 'Underboss' },
  { id: 'judge',      label: 'Kidnap a Corrupt Judge',        icon: '⚖️', desc: 'Snatch a judge before they rule against the family.',       cashMin: 25000, cashMax: 80000,  heatMin: 15, heatMax: 30, repGain: 8,  difficulty: 34, unlockRank: 'Underboss' },
  { id: 'tycoon',     label: 'Kidnap a City Tycoon',          icon: '🏙️', desc: 'The biggest score: grab a city tycoon and demand a fortune.', cashMin: 40000, cashMax: 150000, heatMin: 18, heatMax: 35, repGain: 10, difficulty: 38, unlockRank: 'Boss' },
  { id: 'heiress',    label: 'Kidnap a Socialite Heiress',    icon: '👑', desc: "Take the city's most famous heiress and name your price.", cashMin: 50000, cashMax: 180000, heatMin: 20, heatMax: 38, repGain: 12, difficulty: 42, unlockRank: 'Boss' }
];

function isUnlockedForRank(state, unlockRank) {
  return rankIndex(state.player.rank) >= rankIndex(unlockRank);
}

// Street crime progression: gated on the higher of your Street Rep or the
// most PD Heat you've ever drawn (state.meta.peakHeatPd), so going hot opens
// up bigger jobs even before your reputation catches up.
function isUnlockedForProgress(state, unlockProgress) {
  const progress = Math.max(state.meta.peakHeatPd || 0, state.player.reputation.street);
  return progress >= (unlockProgress || 0);
}

// Gang gig progression: gated on Gang Rep.
function isUnlockedForGangRep(state, unlockGangRep) {
  return state.player.reputation.gang >= (unlockGangRep || 0);
}

/* ---------------- Action Economy ---------------- */

const MAX_ACTION_REPEATS = 3; // each distinct action type can be repeated at most this many times per turn

/* ---------------- Street Crimes (beyond the basic Mug a Mark) ---------------- */

// unlockProgress: unlocked once max(peakHeatPd, Street Rep) reaches this value.
const STREET_CRIMES = [
  { id: 'pickpocket',  label: 'Pickpocket',          icon: '🧤', desc: 'Lift a wallet in a crowded market.',          cashMin: 15,  cashMax: 90,   heatMin: 0, heatMax: 2, repGain: 1, difficulty: 5, unlockProgress: 0 },
  { id: 'shoplift',    label: 'Shoplifting',         icon: '🛍️', desc: 'Walk out of a store with merchandise to fence.', cashMin: 30,  cashMax: 150,  heatMin: 1, heatMax: 3, repGain: 1, difficulty: 6, unlockProgress: 0 },
  { id: 'vandalism',   label: 'Vandalism for Hire',  icon: '🔨', desc: "Trash a rival's storefront for a quick payday.", cashMin: 50,  cashMax: 250,  heatMin: 2, heatMax: 6, repGain: 1, difficulty: 8, unlockProgress: 0 },
  { id: 'fence',       label: 'Fence Stolen Goods',  icon: '💎', desc: 'Move hot merchandise through a fence.',        cashMin: 100, cashMax: 500,  heatMin: 1, heatMax: 4, repGain: 1, difficulty: 7, unlockProgress: 0 },
  { id: 'dicehustle',  label: 'Street Dice Hustle',  icon: '🎲', desc: 'Run a rigged dice game on the corner.',        cashMin: 30,  cashMax: 180,  heatMin: 0, heatMax: 3, repGain: 1, difficulty: 6, unlockProgress: 0 },
  { id: 'skimming',    label: 'ATM Skimming',        icon: '💳', desc: 'Rig a card skimmer on a local ATM.',           cashMin: 150, cashMax: 700,  heatMin: 2, heatMax: 7, repGain: 1, difficulty: 12, unlockProgress: 15 },
  { id: 'pilferage',   label: 'Cargo Pilferage',     icon: '📦', desc: 'Snatch goods off a delivery truck.',           cashMin: 100, cashMax: 600,  heatMin: 2, heatMax: 6, repGain: 2, difficulty: 11, unlockProgress: 15 },
  { id: 'shakedown',   label: 'Corner Store Shakedown', icon: '✊', desc: 'Strong-arm a small business for quick cash.', cashMin: 80,  cashMax: 400,  heatMin: 2, heatMax: 5, repGain: 2, difficulty: 9, unlockProgress: 15 },
  { id: 'carjack',     label: 'Carjacking',          icon: '🚘', desc: 'Take a car at gunpoint and sell it fast.',     cashMin: 300, cashMax: 1300, heatMin: 4, heatMax: 10, repGain: 2, difficulty: 15, unlockProgress: 15 },
  { id: 'creditfraud', label: 'Credit Card Fraud',   icon: '🏧', desc: 'Run cloned cards through a string of stores.', cashMin: 200, cashMax: 900,  heatMin: 2, heatMax: 6, repGain: 1, difficulty: 11, unlockProgress: 15 },
  { id: 'cartheft',    label: 'Car Theft Ring',      icon: '🚗', desc: 'Run a chop-shop operation boosting cars to order.', cashMin: 500, cashMax: 2200, heatMin: 5, heatMax: 12, repGain: 3, difficulty: 18, unlockProgress: 35 },
  { id: 'chopshop',    label: 'Chop Shop Job',       icon: '🔧', desc: 'Strip a luxury car for parts before the owner notices.', cashMin: 600, cashMax: 2400, heatMin: 5, heatMax: 12, repGain: 3, difficulty: 18, unlockProgress: 35 },
  { id: 'artheft',     label: 'Art Theft',           icon: '🖼️', desc: "Lift a painting from a private collector's wall.", cashMin: 1000, cashMax: 4500, heatMin: 6, heatMax: 14, repGain: 4, difficulty: 22, unlockProgress: 35 },
  { id: 'jewelryheist',label: 'Jewelry Store Smash-and-Grab', icon: '💍', desc: 'Smash the case, grab the stock, gone in sixty seconds.', cashMin: 1200, cashMax: 5000, heatMin: 8, heatMax: 18, repGain: 4, difficulty: 24, unlockProgress: 35 },
  { id: 'counterfeit', label: 'Counterfeit Goods Ring', icon: '🏷️', desc: 'Flood the market with knockoff designer gear.', cashMin: 600, cashMax: 3000, heatMin: 4, heatMax: 10, repGain: 3, difficulty: 19, unlockProgress: 35 },
  { id: 'armsdeal',    label: 'Black Market Arms Deal', icon: '🔫', desc: 'Broker a crate of guns to an interested buyer.', cashMin: 2000, cashMax: 8000, heatMin: 10, heatMax: 22, repGain: 5, difficulty: 27, unlockProgress: 60 },
  { id: 'armoredcar',  label: 'Hit an Armored Car',  icon: '🚛', desc: "Crack a transport's route and hit it mid-run.", cashMin: 3500, cashMax: 13000, heatMin: 12, heatMax: 25, repGain: 6, difficulty: 32, unlockProgress: 60 },
  { id: 'casinoskim',  label: 'Skim a Casino Count Room', icon: '🎰', desc: 'Get a man inside the count room and skim the take.', cashMin: 4500, cashMax: 16000, heatMin: 10, heatMax: 24, repGain: 6, difficulty: 33, unlockProgress: 60 },
  { id: 'yachtheist',  label: "Hijack a Smuggler's Yacht", icon: '🛥️', desc: 'Board a rival smuggling yacht and take the whole cargo.', cashMin: 8000, cashMax: 30000, heatMin: 15, heatMax: 30, repGain: 8, difficulty: 38, unlockProgress: 85 },
  { id: 'artauction',  label: 'Rig a Charity Auction', icon: '🖋️', desc: 'Launder stolen art through a rigged high-society auction.', cashMin: 6000, cashMax: 25000, heatMin: 8, heatMax: 20, repGain: 7, difficulty: 35, unlockProgress: 85 }
];

/* ---------------- Help a Gang (gig work, no membership required) ---------------- */

// unlockGangRep: unlocked once Gang Rep reaches this value.
const GANG_GIGS = [
  { id: 'message',  label: 'Pass a Message',  icon: '✉️', desc: 'Deliver a coded message between crews.',          cashMin: 100, cashMax: 400,  heatMin: 0, heatMax: 2, relationGain: 6,  gangRepGain: 2,  difficulty: 4, unlockGangRep: 0 },
  { id: 'lookout',  label: 'Stand Lookout',   icon: '👀', desc: 'Watch the street while the crew works.',          cashMin: 120, cashMax: 500,  heatMin: 0, heatMax: 3, relationGain: 4,  gangRepGain: 2,  difficulty: 5, unlockGangRep: 0 },
  { id: 'recon',    label: 'Scout a Location', icon: '🔭', desc: 'Case a building the gang is planning to hit.',    cashMin: 160, cashMax: 600,  heatMin: 0, heatMax: 2, relationGain: 6,  gangRepGain: 2,  difficulty: 6, unlockGangRep: 0 },
  { id: 'package',  label: 'Deliver a Package', icon: '📦', desc: "Move a sealed package without asking questions.", cashMin: 200, cashMax: 800,  heatMin: 1, heatMax: 4, relationGain: 8,  gangRepGain: 4,  difficulty: 8, unlockGangRep: 10 },
  { id: 'collect',  label: 'Collect a Debt',  icon: '💵', desc: 'Lean on someone who owes the gang money.',        cashMin: 240, cashMax: 1000, heatMin: 2, heatMax: 6, relationGain: 10, gangRepGain: 4,  difficulty: 10, unlockGangRep: 10 },
  { id: 'intimidate', label: 'Intimidate a Witness', icon: '😠', desc: 'Make sure a witness suddenly forgets what they saw.', cashMin: 400, cashMax: 1400, heatMin: 3, heatMax: 8, relationGain: 12, gangRepGain: 6,  difficulty: 14, unlockGangRep: 10 },
  { id: 'wheelman', label: 'Be the Wheelman', icon: '🚙', desc: "Drive the getaway car for a job that isn't yours.", cashMin: 300, cashMax: 1200, heatMin: 2, heatMax: 7, relationGain: 10, gangRepGain: 6,  difficulty: 11, unlockGangRep: 25 },
  { id: 'smugglerun', label: 'Run Contraband Across Town', icon: '🚚', desc: "Move a crew's contraband across district lines.", cashMin: 600, cashMax: 2000, heatMin: 4, heatMax: 10, relationGain: 14, gangRepGain: 8,  difficulty: 18, unlockGangRep: 25 },
  { id: 'sabotage', label: "Sabotage a Rival's Shipment", icon: '💣', desc: "Wreck a shipment belonging to this gang's enemies.", cashMin: 800, cashMax: 3000, heatMin: 8, heatMax: 18, relationGain: 20, gangRepGain: 12, difficulty: 26, unlockGangRep: 45 },
  { id: 'enforcer', label: 'Be Muscle at a Sit-down', icon: '🥊', desc: 'Stand behind the boss while terms get negotiated.', cashMin: 1200, cashMax: 4400, heatMin: 6, heatMax: 15, relationGain: 24, gangRepGain: 14, difficulty: 30, unlockGangRep: 70 }
];

const HEIST_UNLOCK_RANK = 'Soldier';

const SHELL_TIERS = [
  { tier: 1, cost: 3000,   launderPerTurn: 2000,  fee: 0.15,  auditRisk: 6,  unlockRank: 'Associate' },
  { tier: 2, cost: 9000,   launderPerTurn: 6000,  fee: 0.12,  auditRisk: 9,  unlockRank: 'Associate' },
  { tier: 3, cost: 25000,  launderPerTurn: 17000, fee: 0.08,  auditRisk: 13, unlockRank: 'Soldier' },
  { tier: 4, cost: 60000,  launderPerTurn: 40000, fee: 0.06,  auditRisk: 16, unlockRank: 'Capo' },
  { tier: 5, cost: 140000, launderPerTurn: 93000, fee: 0.045, auditRisk: 19, unlockRank: 'Underboss' },
  { tier: 6, cost: 300000, launderPerTurn: 200000, fee: 0.03, auditRisk: 22, unlockRank: 'Boss' }
];

// Recurring per-turn payout from an extortion racket, by level (1-3). Each
// level roughly doubles to triples the payout of the one before it.
const EXTORTION_RACKET_INCOME = [1000, 2500, 6000];

function extortionRacketIncome(level) {
  return EXTORTION_RACKET_INCOME[level - 1] || EXTORTION_RACKET_INCOME[EXTORTION_RACKET_INCOME.length - 1];
}

const LAUNDERING_METHODS = [
  { id: 'streetcontacts', label: 'Street Contacts',     desc: 'Outside fixers launder cash on the spot, steep cut.', fee: 0.30, heatTrack: 'gangs', heatAmount: 1, unlockRank: 'Associate' },
  { id: 'pawnnetwork',    label: 'Pawn & Resale Network', desc: 'Move dirty cash through pawn shop resales.',          fee: 0.25, heatTrack: 'gangs', heatAmount: 1, unlockRank: 'Associate' },
  { id: 'casinochips',    label: 'Casino Chip Exchange', desc: 'Buy in big, cash out "winnings".',                     fee: 0.18, heatTrack: 'pd',    heatAmount: 2, unlockRank: 'Soldier' },
  { id: 'cryptomixer',    label: 'Crypto Mixer',         desc: 'Run cash through a chain of wallets.',                 fee: 0.15, heatTrack: 'feds',  heatAmount: 3, unlockRank: 'Soldier' },
  { id: 'offshore',       label: 'Offshore Account',     desc: 'Wire it through a friendly island bank.',              fee: 0.10, heatTrack: 'feds',  heatAmount: 2, unlockRank: 'Capo' },
  { id: 'artdealer',      label: 'Art & Antiques Dealer', desc: 'Overpay for "investment pieces", resell quietly.',    fee: 0.07, heatTrack: 'feds',  heatAmount: 1, unlockRank: 'Underboss' },
  { id: 'cartelfinance',  label: 'Cartel Finance Network', desc: 'The cartel\'s own books absorb the cash for a fee.', fee: 0.05, heatTrack: 'gangs', heatAmount: 4, unlockRank: 'Boss' }
];

/* ---------------- Black Market Gear (consumable items) ---------------- */

const BLACK_MARKET_ITEMS = [
  { id: 'firstaid',     label: 'First Aid Kit',        desc: 'Patch yourself up on the spot. Restores 25 Health.',                cost: 600,   effect: 'heal',           amount: 25,                 unlockRank: 'Associate' },
  { id: 'streetfavor',  label: 'Called-In Favor',      desc: 'Word travels fast when you do someone a solid. Street Rep +5.',     cost: 1800,  effect: 'rep',  track: 'street', amount: 5,        unlockRank: 'Associate' },
  { id: 'forgedpapers', label: 'Forged Papers',        desc: 'Clean paperwork makes local cops lose interest. PD Heat -10.',      cost: 2500,  effect: 'heat', track: 'pd',     amount: 10,        unlockRank: 'Associate' },
  { id: 'burnerphone',  label: 'Burner Phone',         desc: 'Cut ties before a rat can finish the call. Clears any active informant.', cost: 1000, effect: 'clear_informant',                        unlockRank: 'Associate' },
  { id: 'peaceoffering', label: 'Peace Offering',      desc: 'A token gift smooths things over with rival outfits. Gang Heat -10.', cost: 3000,  effect: 'heat', track: 'gangs',  amount: 10,        unlockRank: 'Soldier' },
  { id: 'adrenaline',    label: 'Adrenaline Shot',     desc: 'A risky stimulant - fight harder for a few turns. +10 combat for 3 turns.', cost: 2000, effect: 'combat_temp', amount: 10, turns: 3,  unlockRank: 'Soldier' },
  { id: 'shellcleanup', label: 'Shell Account Cleanup', desc: 'A quiet wire transfer throws federal auditors off your trail. Fed Heat -10.', cost: 6000, effect: 'heat', track: 'feds',  amount: 10,       unlockRank: 'Soldier' },
  { id: 'cartelpackage', label: 'Cartel Care Package', desc: 'A goodwill shipment buys you trust with the cartel. Cartel Rep +5.', cost: 8000,  effect: 'rep',  track: 'cartel', amount: 5,        unlockRank: 'Capo' }
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
