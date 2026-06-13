/* ============================================================
   UNDERWORLD - Commission (Boss-rank Diplomacy)
   ============================================================ */

function canAccessCommission(state) {
  return state.commission.unlocked;
}

function getCouncilGangs(state) {
  return Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated);
}

function acceptanceThreshold(personality, action) {
  // Lower threshold = more likely to accept (relation needed to accept)
  const base = { Aggressive: 55, Diplomatic: 20, Opportunistic: 35 };
  const actionMod = { truce: 0, alliance: 20, trade: -10, peace: -15, tribute: 10 };
  return base[personality] + (actionMod[action] || 0);
}

function proposeTruce(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  const threshold = acceptanceThreshold(gang.boss.personality, 'truce');
  if (gang.relationToPlayer >= threshold) {
    gang.relationToPlayer = clamp(gang.relationToPlayer + 15, -100, 100);
    gang.atWarWithPlayer = false;
    state.eventLog.push(logEntry(state, `${gang.boss.name} of the ${gang.name} agrees to a truce. Tensions ease.`, 'commission'));
    return { ok: true, accepted: true };
  } else {
    gang.relationToPlayer = clamp(gang.relationToPlayer - 2, -100, 100);
    state.eventLog.push(logEntry(state, `${gang.boss.name} dismisses the truce offer outright. The ${gang.name} aren't interested - not yet.`, 'commission'));
    return { ok: true, accepted: false };
  }
}

function proposeAlliance(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  const threshold = acceptanceThreshold(gang.boss.personality, 'alliance');
  if (gang.relationToPlayer >= threshold) {
    gang.relationToPlayer = clamp(gang.relationToPlayer + 10, -100, 100);
    gang.alliedWithPlayer = true;
    gang.atWarWithPlayer = false;
    state.eventLog.push(logEntry(state, `${gang.boss.name} extends a hand. The ${gang.name} are now allied with you.`, 'commission'));
    return { ok: true, accepted: true };
  } else {
    state.eventLog.push(logEntry(state, `${gang.boss.name} isn't ready to call you an ally. Maybe with more trust between you.`, 'commission'));
    return { ok: true, accepted: false };
  }
}

function proposeTerritoryTrade(state, gangId, giveDistrictId, takeDistrictId, pct) {
  const gang = state.gangs[gangId];
  const myGangId = playerGangId(state);
  if (!gang || !myGangId) return { ok: false, reason: 'You need your own gang to trade territory.' };

  const giveDistrict = state.districts[giveDistrictId];
  const takeDistrict = state.districts[takeDistrictId];
  const myStake = giveDistrict.control[myGangId] || 0;
  const theirStake = takeDistrict.control[gangId] || 0;
  if (myStake < pct || theirStake < pct) return { ok: false, reason: 'Not enough control to offer that trade.' };

  // Opportunistic/Diplomatic gangs more willing; Aggressive rarely trades away territory
  let acceptChance = { Aggressive: 15, Diplomatic: 45, Opportunistic: 35 }[gang.boss.personality];
  acceptChance += gang.relationToPlayer / 4;
  acceptChance = clamp(acceptChance, 5, 90);

  if (Math.random() * 100 < acceptChance) {
    shiftControl(state, giveDistrictId, myGangId, gangId, pct);
    shiftControl(state, takeDistrictId, gangId, myGangId, pct);
    gang.relationToPlayer = clamp(gang.relationToPlayer + 8, -100, 100);
    state.eventLog.push(logEntry(state, `${gang.boss.name} accepts the trade: ${pct}% of ${giveDistrict.name} for ${pct}% of ${takeDistrict.name}.`, 'commission'));
    return { ok: true, accepted: true };
  } else {
    state.eventLog.push(logEntry(state, `${gang.boss.name} rejects the proposed trade between ${giveDistrict.name} and ${takeDistrict.name}.`, 'commission'));
    return { ok: true, accepted: false };
  }
}

function declareWar(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  gang.atWarWithPlayer = true;
  gang.alliedWithPlayer = false;
  gang.relationToPlayer = -100;
  if (!state.commission.warTargets.includes(gangId)) state.commission.warTargets.push(gangId);
  state.eventLog.push(logEntry(state, `You've declared open war on the ${gang.name}. ${gang.boss.name} won't take this lightly.`, 'commission'));
  return { ok: true };
}

function offerPeace(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  const threshold = acceptanceThreshold(gang.boss.personality, 'peace');
  if (gang.relationToPlayer >= threshold || Math.random() * 100 < 30) {
    gang.atWarWithPlayer = false;
    gang.relationToPlayer = clamp(gang.relationToPlayer + 5, -100, 100);
    state.commission.warTargets = state.commission.warTargets.filter(g => g !== gangId);
    state.eventLog.push(logEntry(state, `${gang.boss.name} agrees to stand down. The war with the ${gang.name} is over - for now.`, 'commission'));
    return { ok: true, accepted: true };
  }
  state.eventLog.push(logEntry(state, `${gang.boss.name} refuses to stand down. The ${gang.name} remain at war with you.`, 'commission'));
  return { ok: true, accepted: false };
}

function sendGift(state, gangId, amount) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter an amount to send.' };
  if (state.player.cash.clean < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} Clean Cash.` };
  state.player.cash.clean -= amount;
  const gain = clamp(Math.round(amount / 500), 1, 20);
  gang.relationToPlayer = clamp(gang.relationToPlayer + gain, -100, 100);
  state.eventLog.push(logEntry(state, `You send ${gang.boss.name} a "gift" of ${fmtMoney(amount)}. Relations with the ${gang.name} improve.`, 'commission'));
  return { ok: true, gain };
}

function demandTribute(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  if (gang.atWarWithPlayer) return { ok: false, reason: 'The streets run on respect - they owe you nothing while at war.' };
  const threshold = acceptanceThreshold(gang.boss.personality, 'tribute');
  const score = gangTerritoryScore(state, gangId);
  const amount = Math.round(500 + score * 50);
  if (gang.relationToPlayer >= threshold) {
    state.player.cash.dirty += amount;
    gang.relationToPlayer = clamp(gang.relationToPlayer - 5, -100, 100);
    state.eventLog.push(logEntry(state, `${gang.boss.name} begrudgingly pays ${fmtMoney(amount)} in tribute to keep the peace.`, 'commission'));
    return { ok: true, accepted: true, amount };
  } else {
    gang.relationToPlayer = clamp(gang.relationToPlayer - 12, -100, 100);
    state.eventLog.push(logEntry(state, `${gang.boss.name} refuses your demand for tribute. The ${gang.name} are insulted.`, 'commission'));
    return { ok: true, accepted: false };
  }
}

function requestReinforcements(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  if (!gang.alliedWithPlayer) return { ok: false, reason: `The ${gang.name} aren't your allies.` };
  if (gang.relationToPlayer < 30) return { ok: false, reason: `${gang.boss.name} doesn't trust you enough for this yet.` };
  gang.relationToPlayer = clamp(gang.relationToPlayer - 10, -100, 100);
  state.player.combatBonusTemp = (state.player.combatBonusTemp || 0) + 12;
  state.player.combatBonusTurns = Math.max(state.player.combatBonusTurns || 0, 3);
  state.eventLog.push(logEntry(state, `${gang.boss.name} loans you some muscle. +12 combat for your next 3 turns.`, 'commission'));
  return { ok: true };
}

function scoutGang(state, gangId) {
  const gang = state.gangs[gangId];
  if (!gang) return { ok: false, reason: 'Unknown gang.' };
  const score = gangTerritoryScore(state, gangId);
  const districts = state.districts.filter(d => (d.control[gangId] || 0) > 0).map(d => `${d.name} (${Math.round(d.control[gangId])}%)`);
  state.eventLog.push(logEntry(state, `Your scouts report on the ${gang.name}: ${gang.boss.name} (${gang.boss.personality}), holding ${districts.length} district(s) - ${districts.join(', ') || 'none'}. Total territory score: ${score}.`, 'commission'));
  return { ok: true, score, districts };
}

function commissionTurnTick(state) {
  if (!state.commission.unlocked) return;
  for (const gang of getCouncilGangs(state)) {
    if (gang.alliedWithPlayer && Math.random() < 0.05) {
      narrate(state, 'commission');
    }
  }
}
