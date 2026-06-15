/* ============================================================
   UNDERWORLD - Game State
   Canonical state shape, new-game factory, persistence layer.
   ============================================================ */

const SAVE_KEY = 'underworld_save';
const AUTOSAVE_KEY = 'underworld_autosave';
const SETTINGS_KEY = 'underworld_settings';

let GAME = null; // the live game state, set by main.js

/* ---------------- New Game Factory ---------------- */

function createNewGame(charData) {
  const origin = ORIGINS[charData.originId];
  const start = origin.start;
  const cityName = charData.cityName.trim() || 'Granite Bay';

  const state = {
    version: 1,
    meta: {
      day: 1,
      turn: 1,
      era: charData.era,
      customEraText: charData.era === 'custom' ? charData.customEra : '',
      cityName: cityName,
      gameOver: false,
      gameOverReason: null,
      victoryAchieved: false,
      pendingArrest: false,
      familyRevealed: false,
      peakCash: start.cashDirty + start.cashClean,
      peakDirtyCash: start.cashDirty,
      peakHeatPd: start.heat.pd
    },
    player: {
      name: charData.name.trim() || 'Unnamed',
      originId: origin.id,
      rank: 'Associate',
      health: 100,
      maxHealth: 100,
      injuries: [],
      recoveryTurns: 0,
      cash: { dirty: start.cashDirty, clean: start.cashClean },
      heat: { pd: start.heat.pd, feds: start.heat.feds, gangs: start.heat.gangs },
      reputation: { street: start.reputation.street, gang: start.reputation.gang, cartel: start.reputation.cartel },
      crew: {
        size: start.crewSize,
        quality: start.crewQuality,
        loyalty: start.crewLoyalty,
        weaponTier: 0,
        upkeepPaid: true,
        autoPayUpkeep: true,
        trainingCompleted: [],
        imprisoned: 0,
        members: [] // {id, name, loyalty} - kept in sync with `size` by syncCrewMembers()
      },
      armory: freshArmory(),
      lieutenants: [], // {id, name, loyalty, assignment: null|{type: one of LIEUTENANT_ASSIGNMENTS ids, districtId}}
      inventory: {
        product: { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 },
        consumables: {}
      },
      extortionRackets: [], // {districtId, level}
      affiliation: { type: 'solo', gangId: null }, // 'solo' | 'member' | 'founder'
      currentDistrict: 0,
      actionCounts: {}, // actionKey -> uses this turn (reset on endTurn)
      vehicles: [], // {id, typeId} - distribution fleet
      operations: null, // set by initPlayerOperations below
      pendingDilemma: null, // {type, title, description, context, options} - set by streetDilemmaTick
      pendingTerritoryThreat: null // {gangId, gangName, districtId, amount, label} - set by scenarioTerritoryPush
    },
    districts: [],
    gangs: {},
    family: [],
    lawEnforcement: { detectives: [], agents: [], informantPlanted: null, informantOnPlayer: false, informantCooldown: 0 },
    shellCompanies: [],
    businessMarket: {}, // districtId -> [businesses available]
    ownedBusinesses: [], // {id, districtId, type, income, damaged, purchasePrice}
    commission: { unlocked: false, relations: {}, proposals: [], warTargets: [] },
    criminalWorld: { unlocked: false, decision: null, decisionHistory: [], smugglingBonusMult: 0, smugglingBonusTurns: 0 },
    eventLog: [],
    settings: loadSettings()
  };

  initWorld(state);
  initPlayerOperations(state);
  initLawEnforcement(state);

  state.eventLog.push(logEntry(state, `You arrive in ${cityName}. The ${ERAS[state.meta.era] ? ERAS[state.meta.era].label : state.meta.customEraText} city hums with opportunity and danger alike.`, 'system'));

  return state;
}

function logEntry(state, text, category) {
  return { turn: state.meta.turn, day: state.meta.day, text, category: category || 'general' };
}

/* ---------------- Settings (separate from save slots) ---------------- */

function defaultSettings() {
  return {
    apiKey: '',
    aiModel: 'openrouter/auto:free',
    aiCustomModel: '',
    aiUsage: { inputTokens: 0, outputTokens: 0 },
    aiNarrationFrequency: 'all', // 'all' | 'major' | 'off'
    autosaveEnabled: true
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return Object.assign(defaultSettings(), JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return defaultSettings();
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------------- Persistence ---------------- */

// Cap on stored event log entries - keeps localStorage saves from growing
// without bound over a long playthrough. The Events tab only ever shows the
// most recent 200 anyway.
const MAX_EVENT_LOG = 400;

function trimEventLog(state) {
  if (state.eventLog && state.eventLog.length > MAX_EVENT_LOG) {
    state.eventLog.splice(0, state.eventLog.length - MAX_EVENT_LOG);
  }
}

function serializeState(state) {
  return JSON.stringify(state);
}

function deserializeState(json) {
  return JSON.parse(json);
}

function autosave(state) {
  try {
    trimEventLog(state);
    localStorage.setItem(AUTOSAVE_KEY, serializeState(state));
  } catch (e) {
    console.error('Autosave failed', e);
  }
}

/* ---------------- Save Migration ---------------- */
// Brings older saves up to date with newer game data (new fields, rebalanced
// business income/laundering values, etc.) so existing saves keep working.

function migrateState(state) {
  if (!state || !state.player) return state;

  if (!Array.isArray(state.player.vehicles)) {
    state.player.vehicles = [];
  }

  if (!('pendingDilemma' in state.player)) {
    state.player.pendingDilemma = null;
  }

  if (!('pendingTerritoryThreat' in state.player)) {
    state.player.pendingTerritoryThreat = null;
  }

  // Non-punitive defaults for the new Dirty-Cash/PD-Heat progression tracks:
  // grant existing saves at least what their current rank used to unlock.
  if (state.meta.peakDirtyCash === undefined) {
    const cashByRank = { Associate: 0, Soldier: 50000, Capo: 150000, Underboss: 400000, Boss: 400000 };
    state.meta.peakDirtyCash = Math.max(state.player.cash.dirty, cashByRank[state.player.rank] || 0);
  }
  if (state.meta.peakHeatPd === undefined) {
    const heatByRank = { Associate: 0, Soldier: 15, Capo: 35, Underboss: 60, Boss: 85 };
    state.meta.peakHeatPd = Math.max(state.player.heat.pd, heatByRank[state.player.rank] || 0);
  }
  if (state.meta.pendingArrest === undefined) {
    state.meta.pendingArrest = false;
  }

  if (!state.criminalWorld) {
    state.criminalWorld = { unlocked: false, decision: null, decisionHistory: [], smugglingBonusMult: 0, smugglingBonusTurns: 0 };
  }

  if (state.player.armory) {
    for (const t of WEAPON_TIERS) {
      if (!(t.id in state.player.armory)) state.player.armory[t.id] = 0;
    }
  }

  if (!Array.isArray(state.player.crew.trainingCompleted)) {
    state.player.crew.trainingCompleted = [];
  }

  if (state.player.crew.imprisoned === undefined) {
    state.player.crew.imprisoned = 0;
  }

  if (!Array.isArray(state.player.crew.members)) {
    state.player.crew.members = [];
  }
  syncCrewMembers(state);

  if (state.player.inventory && !state.player.inventory.consumables) {
    state.player.inventory.consumables = {};
  }

  if (state.player.operations) {
    const ops = state.player.operations;
    for (const product of Object.keys(FARM_TYPES)) {
      const dist = ops.distributors[product];
      if (typeof dist === 'number') {
        const counts = freshDistributorCounts();
        counts.street = dist;
        ops.distributors[product] = counts;
      } else if (dist) {
        for (const t of DISTRIBUTOR_TYPES) if (!(t.id in dist)) dist[t.id] = 0;
      }
    }
    if (!ops.marketing) {
      ops.marketing = { weed: { campaignId: null, turnsLeft: 0 }, pills: { campaignId: null, turnsLeft: 0 }, powder: { campaignId: null, turnsLeft: 0 } };
    }
  }

  if (Array.isArray(state.districts)) {
    for (const d of state.districts) {
      if (typeof d.protectionIncome !== 'number') d.protectionIncome = 0;
      if (d.farms) {
        for (const product of Object.keys(d.farms)) {
          const farm = d.farms[product];
          if (typeof farm.invested !== 'number') {
            const def = FARM_TYPES[product];
            let invested = 0;
            for (let i = 0; i < farm.plots; i++) invested += def.facilityTiers[i].cost;
            farm.invested = invested;
          }
          if (typeof farm.lastRevenue !== 'number') farm.lastRevenue = 0;
          if (typeof farm.lastExpense !== 'number') farm.lastExpense = 0;
        }
      }
    }
  }

  if (Array.isArray(state.shellCompanies)) {
    for (const c of state.shellCompanies) {
      if (typeof c.lastRevenue !== 'number') c.lastRevenue = 0;
      if (typeof c.lastExpense !== 'number') c.lastExpense = 0;
    }
  }

  if (state.gangs) {
    for (const gang of Object.values(state.gangs)) {
      if (gang.isPlayerGang) continue;
      if (typeof gang.treasury !== 'number') gang.treasury = 5000 + Math.floor(Math.random() * 15000);
      if (typeof gang.crewSize !== 'number') gang.crewSize = 10 + Math.floor(Math.random() * 15);
      if (typeof gang.crewSkill !== 'number') gang.crewSkill = 30 + Math.floor(Math.random() * 51);
      if (!Array.isArray(gang.businesses)) gang.businesses = [];
      if (!gang.operations || Array.isArray(gang.operations)) gang.operations = {};
      if (!Array.isArray(gang.rackets)) gang.rackets = [];
    }
  }

  // Top up older saves whose business marketplace listings predate the
  // 10-per-district expansion. Gated by businessMarketExpanded so this only
  // ever runs once per save - otherwise it would re-trigger every time the
  // player bought a listing dropped the market below 10, handing out new
  // listings whose `${d.id}_${idx}` ids collided with still-listed entries
  // and made the "last" listings' Buy buttons act on the wrong business.
  if (state.businessMarket && Array.isArray(state.districts)) {
    for (const d of state.districts) {
      const market = state.businessMarket[d.id] || (state.businessMarket[d.id] = []);

      // Fix any duplicate listing ids left over from that bug so Buy always
      // targets the listing the player actually clicked.
      const seenIds = new Set();
      for (const b of market) {
        while (seenIds.has(b.id)) b.id = `${b.id}_${Math.random().toString(36).slice(2, 6)}`;
        seenIds.add(b.id);
      }

      if (market.length >= 10 || state.meta.businessMarketExpanded) continue;
      const usedTypes = new Set(market.map(b => b.type));
      for (const biz of (state.ownedBusinesses || [])) {
        if (biz.districtId === d.id) usedTypes.add(biz.type);
      }
      for (const g of Object.values(state.gangs || {})) {
        for (const b of (g.businesses || [])) {
          if (b.districtId === d.id) usedTypes.add(b.type);
        }
      }
      const candidates = BUSINESS_TYPES.filter(b => !usedTypes.has(b.type)).sort(() => Math.random() - 0.5);
      while (market.length < 10 && candidates.length) {
        const b = candidates.shift();
        const variance = 0.85 + Math.random() * 0.3;
        market.push({
          id: `${d.id}_topup_${Math.random().toString(36).slice(2, 8)}`,
          type: b.type,
          price: Math.round(b.basePrice * variance),
          baseIncome: Math.round(b.baseIncome * variance),
          launderBonus: b.launderBonus,
          heatReduction: b.heatReduction
        });
      }
    }
    state.meta.businessMarketExpanded = true;
  }

  if (Array.isArray(state.ownedBusinesses)) {
    for (const b of state.ownedBusinesses) {
      if (typeof b.level !== 'number') b.level = 1;
      if (typeof b.protection !== 'number') b.protection = 0;
      if (typeof b.invested !== 'number') b.invested = b.purchasePrice || 0;
      if (typeof b.lastRevenue !== 'number') b.lastRevenue = 0;
      if (typeof b.lastExpense !== 'number') b.lastExpense = 0;
      const def = BUSINESS_TYPES.find(t => t.type === b.type);
      if (def) {
        b.baseIncome = def.baseIncome;
        b.launderBonus = def.launderBonus;
        b.heatReduction = def.heatReduction;
      }
    }
  }

  return state;
}

function loadAutosave() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  return raw ? migrateState(deserializeState(raw)) : null;
}

function saveGame(state) {
  trimEventLog(state);
  const meta = {
    name: state.player.name,
    rank: state.player.rank,
    day: state.meta.day,
    city: state.meta.cityName,
    cash: state.player.cash.dirty + state.player.cash.clean,
    savedAt: Date.now()
  };
  localStorage.setItem(SAVE_KEY, serializeState(state));
  localStorage.setItem(SAVE_KEY + '_meta', JSON.stringify(meta));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? migrateState(deserializeState(raw)) : null;
}

function getSaveMeta() {
  const raw = localStorage.getItem(SAVE_KEY + '_meta');
  return raw ? JSON.parse(raw) : null;
}

/* ---------------- Derived Helpers ---------------- */

function getRankScore(state) {
  const rep = state.player.reputation;
  const territoryScore = computeTerritoryInfluence(state);
  return Math.round((rep.street + rep.gang + rep.cartel) / 3 * 0.7 + territoryScore * 0.3);
}

function computeTerritoryInfluence(state) {
  let total = 0;
  let count = 0;
  for (const d of state.districts) {
    const playerGangId = state.player.affiliation.gangId;
    if (playerGangId && d.control[playerGangId] !== undefined) {
      total += d.control[playerGangId];
    }
    count++;
  }
  return count ? total / count : 0;
}

function updateRank(state) {
  const score = getRankScore(state);
  const newRank = rankForScore(score);
  if (newRank.id !== state.player.rank) {
    const oldIdx = rankIndex(state.player.rank);
    const newIdx = rankIndex(newRank.id);
    state.player.rank = newRank.id;
    if (newIdx > oldIdx) {
      state.eventLog.push(logEntry(state, `You've been promoted to ${newRank.id}. ${newRank.perk}`, 'rank'));
      if (newRank.id === 'Boss' && !state.commission.unlocked) {
        state.commission.unlocked = true;
        state.eventLog.push(logEntry(state, `As Boss, you've earned a seat at the Commission - the council of district bosses.`, 'rank'));
      }
    } else {
      state.eventLog.push(logEntry(state, `Your standing has slipped. You've been demoted to ${newRank.id}.`, 'rank'));
    }
  }
}

function getCrewCap(state) {
  const rank = RANKS.find(r => r.id === state.player.rank);
  return rank ? rank.crewCap : 4;
}

// Bankroll milestones shown on the Home tab's Objectives card.
const CASH_MILESTONES = [5000, 25000, 100000, 500000, 1000000, 5000000];

function getNextCashMilestone(state) {
  const total = state.player.cash.dirty + state.player.cash.clean;
  for (const m of CASH_MILESTONES) {
    if (total < m) return m;
  }
  return null;
}

// Derived (non-persisted) list of milestone progress bars for the Home tab.
function computeObjectives(state) {
  const p = state.player;
  const objectives = [];

  const rankIdx = rankIndex(p.rank);
  const nextRank = RANKS[rankIdx + 1];
  if (nextRank) {
    const curRank = RANKS[rankIdx];
    const score = getRankScore(state);
    objectives.push({
      label: `Promotion to ${nextRank.id}`,
      current: clamp(score - curRank.threshold, 0, nextRank.threshold - curRank.threshold),
      max: nextRank.threshold - curRank.threshold,
      detail: nextRank.perk
    });
  } else {
    objectives.push({
      label: 'Top of the Food Chain',
      current: 1,
      max: 1,
      detail: "You've reached the rank of Boss."
    });
  }

  const total = p.cash.dirty + p.cash.clean;
  const nextMilestone = getNextCashMilestone(state);
  if (nextMilestone) {
    const milestoneIdx = CASH_MILESTONES.indexOf(nextMilestone);
    const prevMilestone = milestoneIdx > 0 ? CASH_MILESTONES[milestoneIdx - 1] : 0;
    objectives.push({
      label: `Build a ${fmtMoney(nextMilestone)} Bankroll`,
      current: clamp(total - prevMilestone, 0, nextMilestone - prevMilestone),
      max: nextMilestone - prevMilestone,
      detail: `Currently holding ${fmtMoney(total)}.`
    });
  } else {
    objectives.push({
      label: 'Bankroll',
      current: 1,
      max: 1,
      detail: `Currently holding ${fmtMoney(total)}. You've outgrown every milestone.`
    });
  }

  if (playerGangId(state) && !state.criminalWorld.unlocked) {
    const myGangId = playerGangId(state);
    const influence = computeTerritoryInfluence(state);
    const bestDistrict = Math.max(0, ...state.districts.map(d => d.control[myGangId] || 0));
    const progress = Math.max(influence, bestDistrict);
    objectives.push({
      label: 'Criminal World Access',
      current: Math.round(progress),
      max: 50,
      detail: `City-wide average control: ${Math.round(influence)}% &middot; Best single district: ${Math.round(bestDistrict)}%. Reach 50% on either to earn a seat in the Criminal World.`
    });
  }

  return objectives;
}

// Surfaces actionable items the player might otherwise miss: damaged or
// under-protected businesses, raided routes, unused distributor capacity,
// and any pending rival territory threat. Each item links to the tab where
// it can be addressed.
function computeOpportunities(state) {
  const items = [];

  for (const b of state.ownedBusinesses) {
    const district = state.districts[b.districtId];
    if (b.damaged) {
      items.push({
        icon: '🔧',
        title: `${b.type} in ${district.name} is damaged`,
        detail: 'Generating no income until repaired.',
        actionLabel: 'Repair in Finance',
        onclick: "setActiveTab('finance')"
      });
    } else if ((b.protection || 0) < 25) {
      items.push({
        icon: '⚠️',
        title: `${b.type} in ${district.name} has weak protection (${Math.round(b.protection || 0)}%)`,
        detail: 'Low protection risks crossfire damage when district heat is high.',
        actionLabel: 'Manage in Finance',
        onclick: "setActiveTab('finance')"
      });
    }
  }

  for (const district of state.districts) {
    const route = district.operations.route;
    if (route.raided) {
      items.push({
        icon: '🚧',
        title: `Smuggling route offline in ${district.name}`,
        detail: `Raided - back online in ${route.raidCooldown} turn(s).`,
        actionLabel: 'Go to Operations',
        onclick: "setActiveTab('operations')"
      });
    }
  }

  const limits = getOpsLimits(state);
  const freeDistributors = limits.maxDistributors - totalDistributors(state);
  if (freeDistributors > 0) {
    items.push({
      icon: '📦',
      title: `${freeDistributors} unused distributor slot(s)`,
      detail: 'Hire more distributors to move product faster.',
      actionLabel: 'Go to Operations',
      onclick: "setActiveTab('operations')"
    });
  }

  if (state.player.pendingTerritoryThreat) {
    const t = state.player.pendingTerritoryThreat;
    const district = state.districts[t.districtId];
    items.push({
      icon: '🔥',
      title: `${t.gangName} is moving on your turf in ${district.name}`,
      detail: 'Respond to this threat now.',
      actionLabel: null,
      onclick: null
    });
  }

  return items;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function addHeat(state, track, amount) {
  state.player.heat[track] = clamp(state.player.heat[track] + amount, 0, 100);
}

function addRep(state, track, amount) {
  state.player.reputation[track] = clamp(state.player.reputation[track] + amount, 0, 100);
}

function addCash(state, dirty, clean) {
  state.player.cash.dirty = Math.max(0, state.player.cash.dirty + (dirty || 0));
  state.player.cash.clean = Math.max(0, state.player.cash.clean + (clean || 0));
}
