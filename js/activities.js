/* ============================================================
   UNDERWORLD - Activities / Crimes Menu
   Mugging, Heists, Hits, Extortion, Smuggling Runs, Deals.
   All outcomes deterministic; narrative text via events.js.
   ============================================================ */

/* ---------------- Mugging / Street Crime ---------------- */

function doMugging(state) {
  const result = resolveScuffle(state, 8);
  const district = state.districts[state.player.currentDistrict];
  let hustlerBonus = state.player.originId === 'hustler' ? 1.2 : 1.0;

  if (result.result === 'success') {
    const gain = Math.round((60 + Math.random() * 100) * hustlerBonus);
    addCash(state, gain, 0);
    addRep(state, 'street', state.player.originId === 'hustler' ? 3.5 : 3);
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `Mugging in ${district.name}: +${fmtMoney(gain)} dirty cash.`, 'activity'));
  } else if (result.result === 'partial') {
    const gain = Math.round((20 + Math.random() * 40) * hustlerBonus);
    addCash(state, gain, 0);
    addHeat(state, 'pd', 2);
    narrate(state, 'post_crime_partial');
    state.eventLog.push(logEntry(state, `Mugging in ${district.name}: +${fmtMoney(gain)} dirty cash, but it drew some attention (PD Heat +2).`, 'activity'));
  } else {
    addHeat(state, 'pd', 6);
    applyInjury(state, 'minor');
    addRep(state, 'street', -1);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `Mugging in ${district.name} went wrong. PD Heat +6, took a beating.`, 'activity'));
  }
}

/* ---------------- Generic Street Crimes (data-driven, STREET_CRIMES) ---------------- */

function doStreetCrime(state, crimeId) {
  const def = STREET_CRIMES.find(c => c.id === crimeId);
  if (!def) return { ok: false, reason: 'Unknown crime.' };
  if (!isUnlockedForProgress(state, def.unlockProgress)) return { ok: false, reason: `${def.label} unlocks once your Street Rep or PD Heat reaches ${def.unlockProgress}.` };

  const district = state.districts[state.player.currentDistrict];
  const result = resolveScuffle(state, def.difficulty);
  const hustlerBonus = state.player.originId === 'hustler' ? 1.2 : 1.0;
  const span = def.cashMax - def.cashMin;
  const heatSpan = def.heatMax - def.heatMin;

  if (result.result === 'success') {
    const gain = Math.round((def.cashMin + Math.random() * span) * hustlerBonus);
    addCash(state, gain, 0);
    addRep(state, 'street', def.repGain * (state.player.originId === 'hustler' ? 1.2 : 1));
    const heat = Math.round(def.heatMin + Math.random() * heatSpan * 0.5);
    if (heat > 0) addHeat(state, 'pd', heat);
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `${def.label} in ${district.name}: +${fmtMoney(gain)} dirty cash${heat > 0 ? ` (PD Heat +${heat})` : ''}.`, 'activity'));
  } else if (result.result === 'partial') {
    const gain = Math.round((def.cashMin + Math.random() * span) * 0.4 * hustlerBonus);
    addCash(state, gain, 0);
    const heat = Math.round(def.heatMin + Math.random() * heatSpan);
    addHeat(state, 'pd', heat);
    narrate(state, 'post_crime_partial');
    state.eventLog.push(logEntry(state, `${def.label} in ${district.name}: +${fmtMoney(gain)} dirty cash, but it drew attention (PD Heat +${heat}).`, 'activity'));
  } else {
    addHeat(state, 'pd', def.heatMax);
    applyInjury(state, 'minor');
    addRep(state, 'street', -1);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `${def.label} in ${district.name} went wrong. PD Heat +${def.heatMax}.`, 'activity'));
  }
  return { ok: true };
}

/* ---------------- Heists ---------------- */

function doHeist(state) {
  if (!isUnlockedForRank(state, HEIST_UNLOCK_RANK)) return { ok: false, reason: `Heists unlock at rank ${HEIST_UNLOCK_RANK}.` };
  const district = state.districts[state.player.currentDistrict];
  const difficulty = 25 + Math.round(district.heat / 2);
  const result = resolveScuffle(state, difficulty);

  if (result.result === 'success') {
    const gain = Math.round(1500 + Math.random() * 3000 + state.player.crew.size * 100);
    addCash(state, gain, 0);
    addRep(state, 'street', 6);
    addRep(state, 'gang', 10);
    addHeat(state, 'pd', 6);
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `Heist in ${district.name}: +${fmtMoney(gain)} dirty cash. PD Heat +6.`, 'activity'));
  } else if (result.result === 'partial') {
    const gain = Math.round(1000 + Math.random() * 1500);
    addCash(state, gain, 0);
    addHeat(state, 'pd', 12);
    state.player.crew.loyalty = clamp(state.player.crew.loyalty - 2, 0, 100);
    narrate(state, 'post_crime_partial');
    state.eventLog.push(logEntry(state, `Heist in ${district.name}: +${fmtMoney(gain)} dirty cash, but PD Heat +12 and crew loyalty took a hit.`, 'activity'));
  } else {
    addHeat(state, 'pd', 20);
    addHeat(state, 'feds', result.diff < -40 ? 8 : 0);
    applyInjury(state, result.diff < -40 ? 'severe' : 'major');
    if (result.diff < -40) degradeArmory(state, 0.15);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `Heist in ${district.name} fell apart. PD Heat +20${result.diff < -40 ? ', Federal attention drawn (+8 Fed Heat).' : '.'}`, 'activity'));
  }
}

/* ---------------- Hits / Intimidation ---------------- */

function doHit(state, targetGangId) {
  const district = state.districts[state.player.currentDistrict];
  const target = state.gangs[targetGangId];
  if (!target || district.control[targetGangId] === undefined) return { ok: false, reason: 'No such gang presence here.' };

  const difficulty = Math.round((district.control[targetGangId] || 0) * 0.5);
  const result = resolveScuffle(state, difficulty);

  if (result.result === 'success') {
    const shift = 3 + Math.floor(Math.random() * 5);
    const myGangId = playerGangId(state);
    let taken = 0;
    if (myGangId && district.control[myGangId] !== undefined) {
      taken = shiftControl(state, district.id, targetGangId, myGangId, shift);
    } else {
      const other = Object.keys(district.control).find(g => g !== targetGangId);
      if (other) taken = shiftControl(state, district.id, targetGangId, other, shift);
    }
    addRep(state, 'gang', 5);
    target.relationToPlayer = clamp(target.relationToPlayer - 10, -100, 100);
    addHeat(state, 'gangs', 4);
    narrate(state, 'post_combat_win');
    state.eventLog.push(logEntry(state, `Hit on the ${target.name} in ${district.name} lands hard. ${taken}% control shifts away from them.`, 'activity'));
  } else if (result.result === 'partial') {
    target.relationToPlayer = clamp(target.relationToPlayer - 5, -100, 100);
    addHeat(state, 'gangs', 6);
    applyInjury(state, 'minor');
    narrate(state, 'post_crime_partial');
    state.eventLog.push(logEntry(state, `Hit on the ${target.name} sent a message, but it cost you. Gang Heat +6.`, 'activity'));
  } else {
    applyInjury(state, 'major');
    target.relationToPlayer = clamp(target.relationToPlayer - 15, -100, 100);
    addHeat(state, 'gangs', 10);
    narrate(state, 'post_combat_loss');
    state.eventLog.push(logEntry(state, `The hit on the ${target.name} backfires badly. Gang Heat +10.`, 'activity'));
  }
  return { ok: true };
}

/* ---------------- Help a Gang (gig work, no membership required) ---------------- */

function doGangGig(state, gigId) {
  const def = GANG_GIGS.find(g => g.id === gigId);
  if (!def) return { ok: false, reason: 'Unknown job.' };
  if (!isUnlockedForGangRep(state, def.unlockGangRep)) return { ok: false, reason: `${def.label} unlocks at Gang Rep ${def.unlockGangRep}.` };

  const district = state.districts[state.player.currentDistrict];
  const gangsHere = Object.entries(district.control).map(([gid]) => state.gangs[gid]).filter(g => !g.isPlayerGang);
  if (!gangsHere.length) return { ok: false, reason: 'No gang here to work for.' };
  const gang = gangsHere[Math.floor(Math.random() * gangsHere.length)];

  const result = resolveScuffle(state, def.difficulty);
  const span = def.cashMax - def.cashMin;
  const heatSpan = def.heatMax - def.heatMin;

  if (result.result !== 'fail') {
    const mult = result.result === 'success' ? 1 : 0.5;
    const gain = Math.round((def.cashMin + Math.random() * span) * mult);
    addCash(state, gain, 0);
    addRep(state, 'gang', def.gangRepGain * mult);
    gang.relationToPlayer = clamp(gang.relationToPlayer + def.relationGain * mult, -100, 100);
    const heat = Math.round(def.heatMin + Math.random() * heatSpan * 0.5);
    if (heat > 0) addHeat(state, 'pd', heat);
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `${def.label} for the ${gang.name} in ${district.name}: +${fmtMoney(gain)} cash.${heat > 0 ? ` (PD Heat +${heat})` : ''}`, 'gang'));
  } else {
    addHeat(state, 'pd', def.heatMax);
    gang.relationToPlayer = clamp(gang.relationToPlayer - 2, -100, 100);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `${def.label} for the ${gang.name} went wrong. PD Heat +${def.heatMax}.`, 'gang'));
  }
  return { ok: true };
}

/* ---------------- Extortion (recurring Dirty Cash) ---------------- */

function startExtortion(state) {
  const districtId = state.player.currentDistrict;
  const existing = state.player.extortionRackets.find(r => r.districtId === districtId);
  if (existing) {
    if (existing.level >= 3) return { ok: false, reason: 'Racket already at maximum here.' };
    const result = resolveScuffle(state, 10 + existing.level * 10);
    if (result.result === 'fail') {
      addHeat(state, 'gangs', 5);
      narrate(state, 'post_crime_fail');
      state.eventLog.push(logEntry(state, `Attempt to expand your racket in ${state.districts[districtId].name} was rebuffed.`, 'activity'));
      return { ok: true };
    }
    existing.level++;
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `Your extortion racket in ${state.districts[districtId].name} expands to level ${existing.level}.`, 'activity'));
    return { ok: true };
  }
  const result = resolveScuffle(state, 12);
  if (result.result === 'fail') {
    addHeat(state, 'pd', 4);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `Local businesses in ${state.districts[districtId].name} weren't intimidated this time.`, 'activity'));
    return { ok: true };
  }
  state.player.extortionRackets.push({ districtId, level: 1 });
  addRep(state, 'street', 3);
  narrate(state, 'post_crime_success');
  state.eventLog.push(logEntry(state, `You've set up an extortion racket in ${state.districts[districtId].name}.`, 'activity'));
  return { ok: true };
}

function extortionTick(state) {
  for (const racket of state.player.extortionRackets) {
    const income = racket.level * 60;
    addCash(state, income, 0);
    const district = state.districts[racket.districtId];
    district.heat = clamp(district.heat + racket.level, 0, 100);
    addHeat(state, 'gangs', Math.random() < 0.3 ? 1 : 0);
  }
}

/* ---------------- Smuggling Runs ---------------- */

function doSmugglingRun(state) {
  const district = state.districts[state.player.currentDistrict];
  const routeTier = district.operations.route.tier;
  if (routeTier === 0) return { ok: false, reason: 'No smuggling route established here.' };
  const def = OPERATION_DEFS.route.tiers[routeTier];
  const mitigation = totalHeatMitigation(state);
  const bustRisk = clamp(def.bustRisk - mitigation - (state.player.originId === 'smuggler' ? 8 : 0), 2, 60);

  const roll = Math.random() * 100;
  if (roll > bustRisk) {
    const cap = getStashCapacity(state);
    const room = Math.max(0, cap - totalProductUnits(state));
    const gain = Math.min(def.throughput, room);
    const armsGain = Math.ceil(gain / 2);
    const contraGain = gain - armsGain;
    state.player.inventory.product.arms += armsGain;
    state.player.inventory.product.contraband += contraGain;
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `Smuggling run through ${district.name} pays off: +${armsGain} arms, +${contraGain} contraband.`, 'activity'));
  } else {
    addHeat(state, 'feds', 8);
    addHeat(state, 'pd', 4);
    const lossArms = Math.round(state.player.inventory.product.arms * 0.3);
    state.player.inventory.product.arms -= lossArms;
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `Smuggling run through ${district.name} got intercepted. Lost ${lossArms} arms, Federal Heat +8.`, 'activity'));
  }
  return { ok: true };
}

/* ---------------- Deals (sell product) ---------------- */

function getDealPrice(state, districtId, productType) {
  const district = state.districts[districtId];
  const base = PRODUCT_TYPES[productType].baseValue;
  const heatFactor = 1 - district.heat / 250;
  const saturationFactor = 1 - (district.saturation[productType] || 0) / 100;
  const advisorBonus = getFamilyMemberWithRole(state, 'advisor') ? 1.1 : 1.0;
  return Math.max(2, Math.round(base * heatFactor * saturationFactor * advisorBonus));
}

function sellProduct(state, productType, quantity) {
  const districtId = state.player.currentDistrict;
  const available = state.player.inventory.product[productType] || 0;
  const qty = Math.min(quantity, available);
  if (qty <= 0) return { ok: false, reason: 'Nothing to sell.' };

  const price = getDealPrice(state, districtId, productType);
  const total = price * qty;
  state.player.inventory.product[productType] -= qty;
  addCash(state, total, 0);

  const district = state.districts[districtId];
  district.saturation[productType] = clamp((district.saturation[productType] || 0) + qty * 2, 0, 100);
  district.heat = clamp(district.heat + Math.ceil(qty / 10), 0, 100);

  state.eventLog.push(logEntry(state, `Sold ${qty}x ${PRODUCT_TYPES[productType].label} in ${district.name} for ${fmtMoney(total)}.`, 'activity'));
  return { ok: true, total };
}

function saturationTick(state) {
  for (const d of state.districts) {
    for (const key of Object.keys(d.saturation)) {
      d.saturation[key] = clamp(d.saturation[key] - 8, 0, 100);
    }
  }
}
