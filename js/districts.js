/* ============================================================
   UNDERWORLD - Districts, Gangs & Rival AI
   ============================================================ */

const GANG_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#7f8c8d'];

function initWorld(state) {
  const cityName = state.meta.cityName;
  const districtNames = generateDistrictNames(cityName);
  const usedGangNames = new Set();

  // Generate a pool of 6 named gangs with bosses
  const gangPool = [];
  for (let i = 0; i < 6; i++) {
    let gname;
    do { gname = NAME_POOLS.gang[Math.floor(Math.random() * NAME_POOLS.gang.length)]; } while (usedGangNames.has(gname));
    usedGangNames.add(gname);
    const gid = 'gang' + i;
    gangPool.push({
      id: gid,
      name: gname,
      color: GANG_COLORS[i % GANG_COLORS.length],
      boss: {
        name: randomName(Math.random() < 0.3 ? 'female' : 'male'),
        personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
      },
      isPlayerGang: false,
      relationToPlayer: 0, // -100 hostile .. 100 allied
      territory: [],
      treasury: 5000 + Math.floor(Math.random() * 15000),
      crewSize: 10 + Math.floor(Math.random() * 15),
      businesses: [], // {id, districtId, type, baseIncome, level}
      operations: {}, // districtId -> {weed, pills, powder, arms, contraband} levels 0-5
      rackets: [] // {districtId, level}
    });
  }

  state.districts = districtNames.map((name, i) => {
    // assign two distinct gangs, cycling through the pool with some randomness
    const a = (i * 2) % gangPool.length;
    let b = (a + 1 + Math.floor(Math.random() * (gangPool.length - 1))) % gangPool.length;
    if (b === a) b = (b + 1) % gangPool.length;
    const dominant = 55 + Math.floor(Math.random() * 26); // 55-80
    const control = {};
    control[gangPool[a].id] = dominant;
    control[gangPool[b].id] = 100 - dominant;
    gangPool[a].territory.push(i);
    gangPool[b].territory.push(i);

    return {
      id: i,
      name,
      control,
      heat: 0,
      operations: {
        stash: { tier: 0, raided: false },
        route: { tier: 0, raided: false }
      },
      saturation: { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 },
      lastEvents: []
    };
  });

  state.gangs = {};
  for (const g of gangPool) state.gangs[g.id] = g;

  // Business market: a handful of random business types available per district
  state.businessMarket = {};
  for (const d of state.districts) {
    const choices = [...BUSINESS_TYPES].sort(() => Math.random() - 0.5).slice(0, 10);
    state.businessMarket[d.id] = choices.map((b, idx) => {
      const variance = 0.85 + Math.random() * 0.3;
      return {
        id: `${d.id}_${idx}`,
        type: b.type,
        price: Math.round(b.basePrice * variance),
        baseIncome: Math.round(b.baseIncome * variance),
        launderBonus: b.launderBonus,
        heatReduction: b.heatReduction
      };
    });
  }
}

/* ---------------- District / Gang helpers ---------------- */

function getDistrict(state, id) {
  return state.districts[id];
}

function dominantGang(district) {
  let bestId = null, bestPct = -1;
  for (const [gid, pct] of Object.entries(district.control)) {
    if (pct > bestPct) { bestPct = pct; bestId = gid; }
  }
  return bestId;
}

function shiftControl(state, districtId, fromGangId, toGangId, amount) {
  const d = state.districts[districtId];
  if (d.control[fromGangId] === undefined || amount <= 0) return 0;
  const actual = Math.min(amount, d.control[fromGangId]);
  d.control[fromGangId] -= actual;
  d.control[toGangId] = (d.control[toGangId] || 0) + actual;

  const toGang = state.gangs[toGangId];
  if (toGang && !toGang.territory.includes(districtId)) toGang.territory.push(districtId);

  if (d.control[fromGangId] <= 0) {
    delete d.control[fromGangId];
    const fromGang = state.gangs[fromGangId];
    if (fromGang) {
      fromGang.territory = fromGang.territory.filter(t => t !== districtId);
      transferDistrictAssets(state, districtId, fromGangId, toGangId);
      checkGangElimination(state, fromGangId, toGangId);
    }
  }
  return actual;
}

// Move a gang's businesses, drug operations and rackets in a district to the
// gang that just took full control of it (called when control drops to 0).
function transferDistrictAssets(state, districtId, fromGangId, toGangId) {
  const fromGang = state.gangs[fromGangId];
  const toGang = state.gangs[toGangId];
  if (!fromGang || !toGang) return;
  const district = state.districts[districtId];

  if (Array.isArray(fromGang.businesses)) {
    const moving = fromGang.businesses.filter(b => b.districtId === districtId);
    if (moving.length) {
      fromGang.businesses = fromGang.businesses.filter(b => b.districtId !== districtId);
      if (Array.isArray(toGang.businesses)) {
        toGang.businesses.push(...moving);
        district.lastEvents.unshift(`${toGang.name} seized ${moving.length} business front${moving.length > 1 ? 's' : ''} from ${fromGang.name} in ${district.name}.`);
      }
    }
  }

  if (fromGang.operations && fromGang.operations[districtId]) {
    const ops = fromGang.operations[districtId];
    delete fromGang.operations[districtId];
    if (toGang.operations) {
      const existing = toGang.operations[districtId] || { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 };
      for (const k of Object.keys(ops)) existing[k] = Math.max(existing[k] || 0, ops[k] || 0);
      toGang.operations[districtId] = existing;
    }
  }

  if (Array.isArray(fromGang.rackets)) {
    const moving = fromGang.rackets.filter(r => r.districtId === districtId);
    if (moving.length) {
      fromGang.rackets = fromGang.rackets.filter(r => r.districtId !== districtId);
      if (Array.isArray(toGang.rackets)) {
        toGang.rackets.push(...moving);
        district.lastEvents.unshift(`${toGang.name} took over protection rackets from ${fromGang.name} in ${district.name}.`);
      }
    }
  }
}

// If a gang has lost all of its territory, mark it eliminated and hand its
// remaining treasury to the gang that delivered the finishing blow.
function checkGangElimination(state, gangId, toGangId) {
  const gang = state.gangs[gangId];
  if (!gang || gang.isPlayerGang || gang.eliminated) return;
  if (gang.territory.length > 0) return;
  gang.eliminated = true;
  gang.atWarWithPlayer = false;
  gang.alliedWithPlayer = false;
  const toGang = state.gangs[toGangId];
  if (toGang && !toGang.isPlayerGang && typeof gang.treasury === 'number' && typeof toGang.treasury === 'number') {
    toGang.treasury += gang.treasury;
    gang.treasury = 0;
  }
  state.eventLog.push(logEntry(state, `${gang.name} has been wiped out - their remaining assets and turf were carved up by ${toGang ? toGang.name : 'rival families'}.`, 'gang'));
}

function playerGangId(state) {
  return state.player.affiliation.gangId;
}

function isPlayerInGang(state) {
  return state.player.affiliation.type !== 'solo';
}

/* ---------------- Join / Found Gang ---------------- */

function canJoinGang(state, gangId) {
  return state.player.reputation.gang >= 15 && state.player.affiliation.type === 'solo';
}

function joinGang(state, gangId) {
  const gang = state.gangs[gangId];
  state.player.affiliation = { type: 'member', gangId };
  gang.relationToPlayer = clamp(gang.relationToPlayer + 30, -100, 100);
  state.eventLog.push(logEntry(state, `You've joined the ${gang.name}, under ${gang.boss.name}. Their territory is now your business too.`, 'gang'));
}

function canFoundGang(state) {
  return state.player.reputation.gang >= 30 && state.player.affiliation.type === 'solo';
}

function foundGang(state, gangName) {
  const gid = 'playergang';
  const color = '#f1c40f';
  state.gangs[gid] = {
    id: gid,
    name: gangName,
    color,
    boss: { name: state.player.name, personality: 'Player' },
    isPlayerGang: true,
    relationToPlayer: 100,
    territory: []
  };
  state.player.affiliation = { type: 'founder', gangId: gid };
  // Player's gang carves out a small foothold in the current district
  const d = state.districts[state.player.currentDistrict];
  const dom = dominantGang(d);
  shiftControl(state, d.id, dom, gid, Math.min(15, d.control[dom] || 0));
  state.eventLog.push(logEntry(state, `You've founded the ${gangName}. Word spreads fast - some respect it, others see a target.`, 'gang'));
}

function canLeaveGang(state) {
  return state.player.affiliation.type !== 'solo';
}

function leaveGang(state) {
  const aff = state.player.affiliation;
  if (aff.type === 'solo') return { ok: false, reason: 'You are not in a gang.' };
  const gang = state.gangs[aff.gangId];

  if (aff.type === 'member') {
    gang.relationToPlayer = clamp(gang.relationToPlayer - 30, -100, 100);
    state.player.reputation.gang = clamp(state.player.reputation.gang - 10, 0, 100);
    state.eventLog.push(logEntry(state, `You've left the ${gang.name}. ${gang.boss.name} won't forget it.`, 'gang'));
  } else {
    // Founder: disband the gang and carve up its territory among the remaining families.
    for (const d of state.districts) {
      const pct = d.control[gang.id];
      if (!pct) continue;
      delete d.control[gang.id];
      const others = Object.keys(d.control).filter(gid => !state.gangs[gid].eliminated);
      if (others.length > 0) {
        const share = pct / others.length;
        for (const gid of others) d.control[gid] = (d.control[gid] || 0) + share;
      } else {
        const dom = dominantGang(d);
        if (dom) d.control[dom] = (d.control[dom] || 0) + pct;
      }
    }
    gang.territory = [];
    gang.eliminated = true;
    state.player.reputation.gang = clamp(state.player.reputation.gang - 20, 0, 100);
    state.eventLog.push(logEntry(state, `You've disbanded the ${gang.name} and gone solo. Your former territory is carved up among the remaining families.`, 'gang'));
  }

  state.player.affiliation = { type: 'solo', gangId: null };
  return { ok: true };
}

/* ---------------- Rival Gang AI Turn ---------------- */

function runRivalGangAI(state) {
  for (const district of state.districts) {
    const gangIds = Object.keys(district.control);
    for (const gid of gangIds) {
      const gang = state.gangs[gid];
      if (!gang || gang.isPlayerGang) continue;
      if (Math.random() < 0.55) continue; // not every gang acts every turn
      gangAction(state, district, gang, gangIds);
    }
  }
}

function gangAction(state, district, gang, gangIds) {
  const myGangId = playerGangId(state);
  let others = gangIds.filter(g => g !== gang.id);
  // Allied gangs never target the player's gang
  if (gang.alliedWithPlayer) others = others.filter(g => g !== myGangId);
  if (!others.length) return;
  let target = state.gangs[others[Math.floor(Math.random() * others.length)]];
  if (!target) return;
  const myPct = district.control[gang.id] || 0;
  const targetPct = district.control[target.id] || 0;

  let action;
  switch (gang.personality) {
    case 'Aggressive':
      action = myPct >= targetPct * 0.5 ? 'expand' : (Math.random() < 0.3 ? 'expand' : 'consolidate');
      break;
    case 'Diplomatic':
      action = Math.random() < 0.5 ? 'negotiate' : 'consolidate';
      break;
    case 'Opportunistic':
      action = targetPct < 30 ? 'expand' : 'consolidate';
      break;
    default:
      action = 'consolidate';
  }

  // Gangs at open war with the player aggressively retaliate if the player's gang holds territory here
  if (gang.atWarWithPlayer && myGangId && district.control[myGangId] !== undefined && Math.random() < 0.75) {
    action = 'retaliate';
    target = state.gangs[myGangId];
  }

  // If a rival has very hostile relation toward the player and the player's gang holds territory here, may retaliate
  if (action !== 'retaliate' && gang.relationToPlayer < -40 && myGangId && district.control[myGangId] && Math.random() < 0.4) {
    action = 'retaliate';
    target = state.gangs[myGangId];
  }

  switch (action) {
    case 'expand': {
      const amount = 3 + Math.floor(Math.random() * 6);
      const taken = shiftControl(state, district.id, target.id, gang.id, amount);
      if (taken > 0) {
        if (!gang.territory.includes(district.id)) gang.territory.push(district.id);
        if (target.control[district.id] === undefined) target.territory = target.territory.filter(t => t !== district.id);
        district.lastEvents.unshift(`${gang.name} pushed into ${target.name} turf in ${district.name} (+${taken}%).`);
        if (target.id === playerGangId(state)) {
          target.relationToPlayer = clamp(target.relationToPlayer - 5, -100, 100);
          gang.relationToPlayer = clamp(gang.relationToPlayer - 5, -100, 100);
          state.player.heat.gangs = clamp(state.player.heat.gangs + 3, 0, 100);
          state.eventLog.push(logEntry(state, `${gang.name} encroached on your territory in ${district.name}, taking ${taken}% control.`, 'gang'));
        }
      }
      break;
    }
    case 'retaliate': {
      const amount = 5 + Math.floor(Math.random() * 8);
      const taken = shiftControl(state, district.id, target.id, gang.id, amount);
      if (taken > 0 && target.id === playerGangId(state)) {
        state.player.heat.gangs = clamp(state.player.heat.gangs + 5, 0, 100);
        state.eventLog.push(logEntry(state, `${gang.name} retaliated against you in ${district.name}, seizing ${taken}% of your turf.`, 'gang'));
      }
      break;
    }
    case 'negotiate': {
      if (target.relationToPlayer !== undefined && Math.random() < 0.3) {
        gang.relationToPlayer = clamp(gang.relationToPlayer + 3, -100, 100);
        district.lastEvents.unshift(`${gang.name} sent feelers for a truce in ${district.name}.`);
      }
      break;
    }
    case 'consolidate':
    default: {
      district.heat = clamp(district.heat - 1, 0, 100);
      break;
    }
  }
}
