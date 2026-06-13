/* ============================================================
   UNDERWORLD - Rival Gang Scenario Engine
   Every turn, each non-player, non-eliminated gang runs one
   random scenario drawn from GANG_SCENARIOS (100 entries across
   10 categories), growing their own economy. When territory
   changes hands (via shiftControl), district businesses, drug
   operations and rackets transfer with it.
   ============================================================ */

const GANG_PRODUCTS = ['weed', 'pills', 'powder', 'arms', 'contraband'];

function gangEnsureOps(gang, districtId) {
  if (!gang.operations[districtId]) {
    gang.operations[districtId] = { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 };
  }
  return gang.operations[districtId];
}

function pushDistrictEvent(district, msg) {
  district.lastEvents.unshift(msg);
  if (district.lastEvents.length > 5) district.lastEvents.length = 5;
}

/* ---------------- Scenario category executors ---------------- */

function scenarioStreetHustle(state, gang, district, label) {
  const take = 150 + Math.floor(Math.random() * 350);
  gang.treasury = (gang.treasury || 0) + take;
  if (Math.random() < 0.25) district.heat = clamp(district.heat + 1, 0, 100);
  pushDistrictEvent(district, `${gang.name} ${label} in ${district.name}.`);
}

function scenarioHeist(state, gang, district, label) {
  const crew = gang.crewSize || 10;
  const skill = gang.crewSkill || 50;
  const successChance = clamp(20 + crew + skill / 4, 35, 90);
  if (Math.random() * 100 < successChance) {
    const take = 1500 + Math.floor(Math.random() * 4500);
    gang.treasury = (gang.treasury || 0) + take;
    district.heat = clamp(district.heat + 4, 0, 100);
    pushDistrictEvent(district, `${gang.name} ${label} in ${district.name} and scored big.`);
  } else {
    gang.crewSize = Math.max(1, crew - (1 + Math.floor(Math.random() * 2)));
    district.heat = clamp(district.heat + 8, 0, 100);
    pushDistrictEvent(district, `${gang.name} ${label} in ${district.name}, but it went sideways.`);
  }
}

function scenarioDrugExpansion(state, gang, district, label) {
  const product = GANG_PRODUCTS[Math.floor(Math.random() * GANG_PRODUCTS.length)];
  const ops = gangEnsureOps(gang, district.id);
  const level = ops[product] || 0;
  if (level >= 5) {
    gang.treasury = (gang.treasury || 0) + 300;
    return;
  }
  const cost = (level + 1) * 800;
  if ((gang.treasury || 0) < cost) return;
  gang.treasury -= cost;
  ops[product] = level + 1;
  district.saturation[product] = clamp((district.saturation[product] || 0) + 4, 0, 100);
  pushDistrictEvent(district, `${gang.name} ${label} in ${district.name}.`);
}

function scenarioSmuggling(state, gang, district, label) {
  const product = GANG_PRODUCTS[Math.floor(Math.random() * GANG_PRODUCTS.length)];
  const ops = gangEnsureOps(gang, district.id);
  const level = ops[product] || 0;
  const payout = 300 * (level + 1) + Math.floor(Math.random() * 600);
  gang.treasury = (gang.treasury || 0) + payout;
  district.saturation[product] = clamp((district.saturation[product] || 0) + 6, 0, 100);
  district.heat = clamp(district.heat + 2, 0, 100);
  pushDistrictEvent(district, `${gang.name} ${label} through ${district.name}.`);
}

function scenarioBusinessAcquire(state, gang, district, label) {
  const market = state.businessMarket[district.id];
  if (!market || !market.length) {
    gang.treasury = (gang.treasury || 0) + 200;
    return;
  }
  const idx = Math.floor(Math.random() * market.length);
  const listing = market[idx];
  if ((gang.treasury || 0) < listing.price) return;
  gang.treasury -= listing.price;
  gang.businesses.push({
    id: 'gbiz_' + Math.random().toString(36).slice(2, 8),
    districtId: district.id,
    type: listing.type,
    baseIncome: listing.baseIncome,
    level: 1
  });
  state.businessMarket[district.id] = market.filter((_, i) => i !== idx);
  pushDistrictEvent(district, `${gang.name} ${label} (${listing.type}) in ${district.name}.`);
}

function scenarioBusinessUpgrade(state, gang, district, label) {
  const local = gang.businesses.filter(b => b.districtId === district.id && b.level < 3);
  if (!local.length) {
    gang.treasury = (gang.treasury || 0) + 150;
    return;
  }
  const b = local[Math.floor(Math.random() * local.length)];
  const cost = b.baseIncome * (b.level === 1 ? 6 : 12);
  if ((gang.treasury || 0) < cost) return;
  gang.treasury -= cost;
  b.level++;
  pushDistrictEvent(district, `${gang.name} ${label} (${b.type}) in ${district.name}.`);
}

function scenarioFinanceLaundering(state, gang, district, label) {
  const totalIncome = gang.businesses.reduce((sum, b) => sum + b.baseIncome * (1 + (b.level - 1) * 0.5), 0);
  const windfall = Math.round(totalIncome * 0.5) + 100;
  gang.treasury = (gang.treasury || 0) + windfall;
  pushDistrictEvent(district, `${gang.name} ${label}.`);
}

function scenarioCrewRecruit(state, gang, district, label) {
  const cost = 400 + (gang.crewSize || 10) * 50;
  if ((gang.treasury || 0) < cost) return;
  gang.treasury -= cost;
  gang.crewSize = (gang.crewSize || 10) + 1;
  pushDistrictEvent(district, `${gang.name} ${label} in ${district.name}.`);
}

function scenarioProtectionRacket(state, gang, district, label) {
  let racket = gang.rackets.find(r => r.districtId === district.id);
  if (!racket) {
    racket = { districtId: district.id, level: 0 };
    gang.rackets.push(racket);
  }
  if (racket.level < 5) {
    racket.level++;
    district.heat = clamp(district.heat + 1, 0, 100);
  }
  gang.treasury = (gang.treasury || 0) + racket.level * 150;
  pushDistrictEvent(district, `${gang.name} ${label} in ${district.name}.`);
}

function scenarioTerritoryPush(state, gang, district, label) {
  const others = Object.keys(district.control).filter(g => g !== gang.id);
  if (!others.length) return;
  const targetId = others[Math.floor(Math.random() * others.length)];
  const target = state.gangs[targetId];
  if (!target) return;
  const amount = 2 + Math.floor(Math.random() * 5);
  const taken = shiftControl(state, district.id, targetId, gang.id, amount);
  if (taken > 0) {
    pushDistrictEvent(district, `${gang.name} ${label}, taking ${taken}% of ${target.name}'s turf in ${district.name}.`);
    if (targetId === playerGangId(state)) {
      state.player.heat.gangs = clamp((state.player.heat.gangs || 0) + 2, 0, 100);
      state.eventLog.push(logEntry(state, `${gang.name} ${label} and took ${taken}% of your territory in ${district.name}.`, 'gang'));
    }
  }
}

/* ---------------- 100 scenarios: 10 categories x 10 variants ---------------- */

const GANG_SCENARIO_CATEGORIES = [
  {
    category: 'Street Hustles',
    run: scenarioStreetHustle,
    labels: [
      'ran a street tax shakedown', 'fenced stolen goods on the corner', 'ran a three-card monte hustle',
      'rolled a drunk tourist', 'flipped stolen electronics', 'ran an illegal dice game',
      'pickpocketed the market crowd', 'sold bootleg merchandise', 'ran a chop-shop side job',
      'shook down a corner store'
    ]
  },
  {
    category: 'Heists & Big Scores',
    run: scenarioHeist,
    labels: [
      'hit an armored car', 'robbed a jewelry store', 'knocked over a check-cashing joint',
      'cracked a bank vault', 'hijacked a cargo truck', 'raided a rival\'s stash house',
      'pulled a casino skim', 'ran a payroll heist', 'looted a warehouse', 'ran an art theft job'
    ]
  },
  {
    category: 'Drug Operation Expansion',
    run: scenarioDrugExpansion,
    labels: [
      'expanded a weed grow-house', 'set up a new pill press', 'invested in a cocaine lab',
      'scaled up arms trafficking', 'expanded contraband smuggling lines', 'upgraded a cutting house',
      'opened a new grow operation', 'financed a chemist\'s lab upgrade', 'expanded distribution for their product',
      'doubled down on production capacity'
    ]
  },
  {
    category: 'Smuggling & Trafficking',
    run: scenarioSmuggling,
    labels: [
      'ran a smuggling run across the docks', 'moved product through a shipping container',
      'bribed customs to wave through a shipment', 'ran a cross-town trafficking route',
      'offloaded a shipment to outside buyers', 'ran guns through a border contact',
      'moved contraband through a front business', 'coordinated a midnight drop',
      'ran a courier network shipment', 'flooded the street with cheap product'
    ]
  },
  {
    category: 'Business Fronts',
    run: scenarioBusinessAcquire,
    labels: [
      'bought out a local business front', 'acquired a new storefront', 'took over a struggling business',
      'invested in a new front operation', 'bought into a local enterprise', 'acquired a laundering-friendly business',
      'opened a new legitimate front', 'purchased a business on the cheap', 'snapped up a foreclosed property',
      'bought a controlling stake in a local shop'
    ]
  },
  {
    category: 'Business Upgrades',
    run: scenarioBusinessUpgrade,
    labels: [
      'renovated a business front', 'expanded an existing storefront', 'upgraded equipment at a front business',
      'hired more staff for a business', 'remodeled a property for more traffic', 'invested in marketing for a front',
      'modernized a business operation', 'expanded hours at a front business', 'added a new service line to a business',
      'poured profits back into a front'
    ]
  },
  {
    category: 'Finance & Laundering',
    run: scenarioFinanceLaundering,
    labels: [
      'laundered a windfall through their books', 'cleaned up dirty cash through front businesses',
      'ran a money-laundering scheme through shells', 'moved cash through offshore contacts',
      'skimmed profits off the books', 'cooked the books for a quick cash boost',
      'ran a quiet financial play', 'collected on outstanding debts', 'called in favors for a cash infusion',
      'ran a numbers racket payout'
    ]
  },
  {
    category: 'Crew & Manpower',
    run: scenarioCrewRecruit,
    labels: [
      'recruited new muscle', 'brought in fresh soldiers', 'expanded their crew', 'hired a new enforcer',
      'put more bodies on the payroll', 'recruited from the neighborhood', 'brought in an old contact\'s crew',
      'trained up new recruits', 'poached talent from a rival', 'expanded their ranks'
    ]
  },
  {
    category: 'Protection & Extortion Rackets',
    run: scenarioProtectionRacket,
    labels: [
      'leaned on local shops for protection money', 'expanded a protection racket', 'shook down businesses for tribute',
      'tightened their grip on local extortion', 'ran a fresh protection shakedown', 'collected protection payments',
      'expanded their extortion network', 'muscled new businesses into paying up',
      'ran enforcers through the block collecting dues', 'upped the price of "protection"'
    ]
  },
  {
    category: 'Territory Moves',
    run: scenarioTerritoryPush,
    labels: [
      'pushed into rival turf', 'made a play for more territory', 'tested a rival\'s hold on the block',
      'sent crew to muscle in on contested turf', 'made an aggressive territory grab', 'encroached on a neighboring operation',
      'staked a claim on disputed turf', 'moved to expand their footprint', 'challenged a rival for street control',
      'made a bold move for more turf'
    ]
  }
];

const GANG_SCENARIOS = [];
for (const cat of GANG_SCENARIO_CATEGORIES) {
  for (const label of cat.labels) {
    GANG_SCENARIOS.push({ category: cat.category, label, run: cat.run });
  }
}

/* ---------------- Turn hook ---------------- */

function gangActivityTick(state) {
  for (const gangId of Object.keys(state.gangs)) {
    const gang = state.gangs[gangId];
    if (!gang || gang.isPlayerGang || gang.eliminated) continue;
    if (!gang.territory || !gang.territory.length) continue;
    const scenario = GANG_SCENARIOS[Math.floor(Math.random() * GANG_SCENARIOS.length)];
    const districtId = gang.territory[Math.floor(Math.random() * gang.territory.length)];
    const district = state.districts[districtId];
    if (!district) continue;
    scenario.run(state, gang, district, scenario.label);
  }
}
