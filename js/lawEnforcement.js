/* ============================================================
   UNDERWORLD - Law Enforcement NPCs, Bribery & Informants
   ============================================================ */

const PD_RANKS = [
  { name: 'Detective', costMult: 1, heatMult: 1 },
  { name: 'Senior Detective', costMult: 1.6, heatMult: 1.3 },
  { name: 'Lieutenant', costMult: 2.4, heatMult: 1.6 }
];

const FED_RANKS = [
  { name: 'Field Agent', costMult: 2, heatMult: 1 },
  { name: 'Senior Agent', costMult: 3, heatMult: 1.4 },
  { name: 'Special Agent in Charge', costMult: 4.5, heatMult: 1.8 }
];

const PERSONALITY_BRIBE_CHANCE = { Corrupt: 70, 'By-the-Book': 18, Ambitious: 45 };
const PERSONALITY_ENTRAPMENT = { Corrupt: 3, 'By-the-Book': 18, Ambitious: 12 };

function initLawEnforcement(state) {
  const detCount = 2 + (Math.random() < 0.5 ? 1 : 0);
  state.lawEnforcement.detectives = [];
  for (let i = 0; i < detCount; i++) {
    state.lawEnforcement.detectives.push(makeLawNPC('pd'));
  }
  const agentCount = 1 + (Math.random() < 0.5 ? 1 : 0);
  state.lawEnforcement.agents = [];
  for (let i = 0; i < agentCount; i++) {
    state.lawEnforcement.agents.push(makeLawNPC('fed'));
  }
}

function makeLawNPC(type) {
  return {
    id: type + '_' + Math.random().toString(36).slice(2, 8),
    type,
    name: randomName(Math.random() < 0.35 ? 'female' : 'male'),
    personality: COP_PERSONALITIES[Math.floor(Math.random() * COP_PERSONALITIES.length)],
    rankIdx: 0,
    bribesAccepted: 0,
    active: true
  };
}

function rankTable(type) {
  return type === 'fed' ? FED_RANKS : PD_RANKS;
}

function rankOf(npc) {
  return rankTable(npc.type)[npc.rankIdx];
}

function baseBribeCost(npc) {
  const base = npc.type === 'fed' ? 4000 : 1000;
  return Math.round(base * rankOf(npc).costMult * (1 + npc.bribesAccepted * 0.4));
}

function attemptBribe(state, npcId, offerAmount) {
  const npc = [...state.lawEnforcement.detectives, ...state.lawEnforcement.agents].find(n => n.id === npcId);
  if (!npc || !npc.active) return { success: false, message: 'That contact is no longer available.' };

  const cost = baseBribeCost(npc);
  const ratio = offerAmount / cost;
  let chance = PERSONALITY_BRIBE_CHANCE[npc.personality] + (ratio - 1) * 35 - npc.bribesAccepted * 4;
  chance = clamp(chance, 5, 92);

  const roll = Math.random() * 100;
  const heatTrack = npc.type === 'fed' ? 'feds' : 'pd';

  if (roll < chance) {
    const flatReduction = clamp(Math.round(8 * ratio * rankOf(npc).heatMult), 4, 30);
    const pctReduction = Math.ceil(state.player.heat[heatTrack] * 0.25);
    const reduction = Math.max(flatReduction, pctReduction);
    addHeat(state, heatTrack, -reduction);
    state.player.cash.dirty = Math.max(0, state.player.cash.dirty - offerAmount);
    npc.bribesAccepted++;
    state.eventLog.push(logEntry(state, `${npc.name} (${rankOf(npc).name}) takes the envelope and looks the other way. ${heatTrack === 'feds' ? 'Federal' : 'Local PD'} Heat -${reduction}.`, 'bribe'));
    maybePromoteOrRetire(state, npc);
    return { success: true, message: `Bribe accepted. Heat reduced by ${reduction}.`, heatReduced: reduction };
  } else {
    state.player.cash.dirty = Math.max(0, state.player.cash.dirty - Math.round(offerAmount * 0.5));
    const entrapChance = PERSONALITY_ENTRAPMENT[npc.personality];
    if (Math.random() * 100 < entrapChance) {
      const spike = npc.type === 'fed' ? 15 : 10;
      addHeat(state, heatTrack, spike);
      state.eventLog.push(logEntry(state, `${npc.name} was wired the whole time. It's a setup - ${heatTrack === 'feds' ? 'Federal' : 'Local PD'} Heat +${spike}.`, 'bribe'));
      return { success: false, message: `Entrapment! Heat increased by ${spike}.`, entrapment: true };
    }
    state.eventLog.push(logEntry(state, `${npc.name} (${rankOf(npc).name}) refuses the offer and pockets nothing - but remembers your face.`, 'bribe'));
    return { success: false, message: 'Bribe refused.' };
  }
}

function maybePromoteOrRetire(state, npc) {
  if (npc.bribesAccepted >= 3 && npc.rankIdx < rankTable(npc.type).length - 1 && Math.random() < 0.25) {
    npc.rankIdx++;
    npc.bribesAccepted = 0;
    state.eventLog.push(logEntry(state, `${npc.name} has been promoted to ${rankOf(npc).name}. Bribing them will cost more now.`, 'lawenforcement'));
  }
}

function lawEnforcementTurnTick(state) {
  const all = [...state.lawEnforcement.detectives, ...state.lawEnforcement.agents];
  for (const npc of all) {
    if (Math.random() < 0.04) {
      retireOrReassign(state, npc);
    }
  }

  // Informant on player risk
  if (state.lawEnforcement.informantOnPlayer) {
    if (Math.random() < 0.25) {
      const spike = 8 + Math.floor(Math.random() * 10);
      addHeat(state, 'pd', spike);
      state.player.crew.loyalty = clamp(state.player.crew.loyalty - 8, 0, 100);
      narrate(state, 'lawenforcement');
      state.eventLog.push(logEntry(state, `Someone in your crew has been talking. PD Heat +${spike} and crew loyalty takes a hit.`, 'lawenforcement'));
      state.lawEnforcement.informantOnPlayer = false;
    }
  } else if (Math.random() < 0.015 + state.player.heat.gangs / 1000) {
    state.lawEnforcement.informantOnPlayer = true;
  }
}

function retireOrReassign(state, npc) {
  const list = npc.type === 'fed' ? state.lawEnforcement.agents : state.lawEnforcement.detectives;
  const idx = list.findIndex(n => n.id === npc.id);
  if (idx === -1) return;
  const roll = Math.random();
  const label = npc.type === 'fed' ? 'Federal' : 'Local PD';
  narrate(state, 'lawenforcement');
  if (roll < 0.5) {
    state.eventLog.push(logEntry(state, `${label} contact ${npc.name} (${rankOf(npc).name}) has retired. A new face takes over the beat.`, 'lawenforcement'));
  } else {
    state.eventLog.push(logEntry(state, `${label} contact ${npc.name} (${rankOf(npc).name}) was reassigned. Someone new is watching now.`, 'lawenforcement'));
  }
  list[idx] = makeLawNPC(npc.type);
}

/* ---------------- Informants on rival gangs ---------------- */

const INFORMANT_COST = 5000;

function plantInformant(state, gangId) {
  if (state.player.cash.clean + state.player.cash.dirty < INFORMANT_COST) {
    return { success: false, message: 'Not enough cash to plant an informant.' };
  }
  const dirtyUsed = Math.min(state.player.cash.dirty, INFORMANT_COST);
  state.player.cash.dirty -= dirtyUsed;
  state.player.cash.clean -= (INFORMANT_COST - dirtyUsed);

  const gang = state.gangs[gangId];
  state.lawEnforcement.informantPlanted = { gangId, turnsRemaining: 5 };
  const districts = gang.territory.map(id => state.districts[id].name).join(', ') || 'no fixed territory';
  narrate(state, 'lawenforcement');
  state.eventLog.push(logEntry(state, `Your informant is in place inside the ${gang.name}. Boss ${gang.boss.name} (${gang.boss.personality}) operates out of: ${districts}. Their next moves won't surprise you for a while.`, 'lawenforcement'));
  return { success: true };
}

function informantPlantedTick(state) {
  const inf = state.lawEnforcement.informantPlanted;
  if (!inf) return;
  inf.turnsRemaining--;
  if (inf.turnsRemaining <= 0) {
    const gang = state.gangs[inf.gangId];
    state.eventLog.push(logEntry(state, `Your informant inside the ${gang ? gang.name : 'rival gang'} has gone quiet - contact lost.`, 'lawenforcement'));
    state.lawEnforcement.informantPlanted = null;
  }
}

/* ---------------- Bribe Rival Crew ---------------- */

function bribeRivalCrew(state, districtId, gangId, amount) {
  const gang = state.gangs[gangId];
  if (!gang) return { success: false, message: 'Unknown gang.' };
  const cost = 2000;
  if (amount < cost) return { success: false, message: `Minimum bribe is ${fmtMoney(cost)}.` };
  if (state.player.cash.dirty < amount) return { success: false, message: 'Not enough dirty cash.' };

  state.player.cash.dirty -= amount;
  const chance = clamp(40 + (amount - cost) / 100, 10, 85);
  const roll = Math.random() * 100;
  if (roll < chance) {
    if (!state.weakenedGangs) state.weakenedGangs = {};
    state.weakenedGangs[gangId] = { turnsRemaining: 2, districtId };
    state.eventLog.push(logEntry(state, `Money talks. Key members of the ${gang.name} are looking the other way in ${state.districts[districtId].name} for the next couple of turns.`, 'bribe'));
    return { success: true, message: `${gang.name} weakened for 2 turns.` };
  } else {
    gang.relationToPlayer = clamp(gang.relationToPlayer - 20, -100, 100);
    state.player.heat.gangs = clamp(state.player.heat.gangs + 8, 0, 100);
    state.eventLog.push(logEntry(state, `The bribe attempt on the ${gang.name} backfired badly. Their hostility toward you spikes.`, 'bribe'));
    return { success: false, message: 'Backfired - hostility increased.' };
  }
}

function isGangWeakened(state, gangId) {
  return !!(state.weakenedGangs && state.weakenedGangs[gangId] && state.weakenedGangs[gangId].turnsRemaining > 0);
}

function weakenedGangsTick(state) {
  if (!state.weakenedGangs) return;
  for (const gid of Object.keys(state.weakenedGangs)) {
    state.weakenedGangs[gid].turnsRemaining--;
    if (state.weakenedGangs[gid].turnsRemaining <= 0) delete state.weakenedGangs[gid];
  }
}
