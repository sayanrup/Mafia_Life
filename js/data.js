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
  lab: {
    label: 'Drug Lab',
    tiers: [
      { name: 'None', cost: 0, income: 0, heat: 0 },
      { name: 'Street Cook', cost: 1500, income: 80, heat: 2 },
      { name: 'Mid-Tier', cost: 6000, income: 220, heat: 4 },
      { name: 'Superlab', cost: 18000, income: 600, heat: 8 }
    ]
  },
  stash: {
    label: 'Stash House',
    tiers: [
      { name: 'None', cost: 0, capacity: 20, heatMitigation: 0 },
      { name: 'Safehouse', cost: 1200, capacity: 60, heatMitigation: 5 },
      { name: 'Reinforced Den', cost: 4500, capacity: 150, heatMitigation: 12 },
      { name: 'Fortified Vault', cost: 12000, capacity: 400, heatMitigation: 22 }
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
  { type: 'Diner', basePrice: 8000, baseIncome: 90, launderBonus: 400, heatReduction: 0 },
  { type: 'Laundromat', basePrice: 6000, baseIncome: 60, launderBonus: 800, heatReduction: 0 },
  { type: 'Bar', basePrice: 12000, baseIncome: 140, launderBonus: 600, heatReduction: 1 },
  { type: 'Auto Repair Shop', basePrice: 15000, baseIncome: 160, launderBonus: 700, heatReduction: 1 },
  { type: 'Pawn Shop', basePrice: 10000, baseIncome: 110, launderBonus: 900, heatReduction: 0 },
  { type: 'Real Estate Office', basePrice: 25000, baseIncome: 300, launderBonus: 1500, heatReduction: 2 },
  { type: 'Nightclub', basePrice: 30000, baseIncome: 380, launderBonus: 1800, heatReduction: 2 },
  { type: 'Vending Route', basePrice: 4000, baseIncome: 40, launderBonus: 300, heatReduction: 0 }
];

const SHELL_TIERS = [
  { tier: 1, cost: 3000,  launderPerTurn: 600,  fee: 0.15, auditRisk: 6 },
  { tier: 2, cost: 9000,  launderPerTurn: 1800, fee: 0.12, auditRisk: 9 },
  { tier: 3, cost: 25000, launderPerTurn: 5000, fee: 0.08, auditRisk: 13 }
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
