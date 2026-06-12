/* ============================================================
   UNDERWORLD - Game State
   Canonical state shape, new-game factory, persistence layer.
   ============================================================ */

const SAVE_PREFIX = 'underworld_save_';
const AUTOSAVE_KEY = 'underworld_autosave';
const SETTINGS_KEY = 'underworld_settings';
const SAVE_SLOTS = ['slot1', 'slot2', 'slot3'];

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
      gameOverReason: null
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
        autoPayUpkeep: true
      },
      armory: { 0: 0, 1: 0, 2: 0, 3: 0 },
      lieutenants: [], // {id, name, loyalty, assignment: null|{type:'district'|'smuggling', districtId}}
      inventory: {
        product: { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 }
      },
      extortionRackets: [], // {districtId, level}
      affiliation: { type: 'solo', gangId: null }, // 'solo' | 'member' | 'founder'
      currentDistrict: 0,
      empire: {
        plots: {}, // districtId -> {productType: count}
        distributors: {}, // districtId -> count
        prices: Object.fromEntries(Object.keys(PRODUCT_TYPES).map(p => [p, PRODUCT_TYPES[p].baseValue])),
        protection: {} // districtId -> 0-100
      }
    },
    districts: [],
    gangs: {},
    family: [],
    lawEnforcement: { detectives: [], agents: [], informantPlanted: null, informantOnPlayer: false, informantCooldown: 0 },
    shellCompanies: [],
    businessMarket: {}, // districtId -> [businesses available]
    ownedBusinesses: [], // {id, districtId, type, income, damaged, purchasePrice}
    commission: { unlocked: false, relations: {}, proposals: [], warTargets: [] },
    eventLog: [],
    settings: loadSettings()
  };

  initWorld(state);
  initFamily(state);
  initLawEnforcement(state);

  state.eventLog.push(logEntry(state, `You arrive in ${cityName}. The ${ERAS[state.meta.era] ? ERAS[state.meta.era].label : state.meta.customEraText} city hums with opportunity and danger alike.`, 'system'));

  return state;
}

function logEntry(state, text, category) {
  return { turn: state.meta.turn, day: state.meta.day, text, category: category || 'general' };
}

/* ---------------- Settings (separate from save slots) ---------------- */

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { apiKey: '', autosaveEnabled: true };
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------------- Persistence ---------------- */

function serializeState(state) {
  return JSON.stringify(state);
}

function deserializeState(json) {
  return JSON.parse(json);
}

function autosave(state) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeState(state));
  } catch (e) {
    console.error('Autosave failed', e);
  }
}

function loadAutosave() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  return raw ? deserializeState(raw) : null;
}

function saveToSlot(state, slotId) {
  const meta = {
    name: state.player.name,
    rank: state.player.rank,
    day: state.meta.day,
    city: state.meta.cityName,
    cash: state.player.cash.dirty + state.player.cash.clean,
    savedAt: Date.now()
  };
  localStorage.setItem(SAVE_PREFIX + slotId, serializeState(state));
  localStorage.setItem(SAVE_PREFIX + slotId + '_meta', JSON.stringify(meta));
}

function loadFromSlot(slotId) {
  const raw = localStorage.getItem(SAVE_PREFIX + slotId);
  return raw ? deserializeState(raw) : null;
}

function getSlotMeta(slotId) {
  const raw = localStorage.getItem(SAVE_PREFIX + slotId + '_meta');
  return raw ? JSON.parse(raw) : null;
}

function deleteSlot(slotId) {
  localStorage.removeItem(SAVE_PREFIX + slotId);
  localStorage.removeItem(SAVE_PREFIX + slotId + '_meta');
}

function exportStateToFile(state) {
  const blob = new Blob([serializeState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `underworld_${state.player.name.replace(/\s+/g, '_')}_day${state.meta.day}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importStateFromFile(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const state = deserializeState(e.target.result);
      callback(state, null);
    } catch (err) {
      callback(null, err);
    }
  };
  reader.readAsText(file);
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
