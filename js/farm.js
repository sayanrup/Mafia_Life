/* ============================================================
   UNDERWORLD - Drug Operations (Boss-tier farms/labs, distributors,
   street pricing, equipment, operation protection, kidnapping)
   ============================================================ */

function canAccessOperations(state) {
  return rankIndex(state.player.rank) >= rankIndex(OPS_ECONOMY.unlockRank);
}

function freshPlayerOperations() {
  return {
    distributors: { weed: 0, pills: 0, powder: 0 },
    prices: { weed: 1, pills: 1, powder: 1 },
    equipment: { weed: 0, pills: 0, powder: 0 }
  };
}

function initPlayerOperations(state) {
  state.player.operations = freshPlayerOperations();
  for (const d of state.districts) {
    d.farms = {
      weed: { plots: 0, growTurn: 0, pendingValue: 0 },
      pills: { plots: 0, growTurn: 0, pendingValue: 0 },
      powder: { plots: 0, growTurn: 0, pendingValue: 0 }
    };
    d.opProtection = 0;
  }
}

/* ---------------- Plots / Farms ---------------- */

function getFarmPlotCost(state, districtId, product) {
  const def = FARM_TYPES[product];
  const plots = state.districts[districtId].farms[product].plots;
  return def.plotBaseCost + plots * def.plotCostStep;
}

function buyFarmPlot(state, districtId, product) {
  if (!canAccessOperations(state)) return { ok: false, reason: `Only a ${OPS_ECONOMY.unlockRank} can build drug operations.` };
  const limits = getOpsLimits(state);
  if (!limits.unlockedProducts.includes(product)) return { ok: false, reason: `${FARM_TYPES[product].label} operations unlock at a higher rank.` };
  const farm = state.districts[districtId].farms[product];
  if (farm.plots >= limits.maxPlotsPerDistrict) return { ok: false, reason: `Your rank limits you to ${limits.maxPlotsPerDistrict} ${FARM_TYPES[product].label.toLowerCase()} plot(s) per district. Rank up to expand.` };
  const cost = getFarmPlotCost(state, districtId, product);
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.districts[districtId].farms[product].plots++;
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You acquire a new ${FARM_TYPES[product].label} plot in ${district.name} for ${fmtMoney(cost)}.`, 'operations'));
  return { ok: true };
}

/* ---------------- Distributors ---------------- */

function totalDistributors(state) {
  return Object.values(state.player.operations.distributors).reduce((a, b) => a + b, 0);
}

function hireDistributors(state, product, count) {
  if (!canAccessOperations(state)) return { ok: false, reason: `Only a ${OPS_ECONOMY.unlockRank} can build drug operations.` };
  const limits = getOpsLimits(state);
  count = Math.max(1, Math.floor(count) || 0);
  const room = limits.maxDistributors - totalDistributors(state);
  if (room <= 0) return { ok: false, reason: `Your rank limits you to ${limits.maxDistributors} distributor(s) total. Rank up to hire more.` };
  count = Math.min(count, room);
  const cost = DISTRIBUTOR_HIRE_COST * count;
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.player.operations.distributors[product] += count;
  state.eventLog.push(logEntry(state, `You hire ${count} distributor(s) to move ${FARM_TYPES[product].label.toLowerCase()} for ${fmtMoney(cost)}.`, 'operations'));
  return { ok: true };
}

/* ---------------- Pricing ---------------- */

function setOperationPrice(state, product, priceMult) {
  if (!canAccessOperations(state)) return { ok: false, reason: `Only a ${OPS_ECONOMY.unlockRank} can build drug operations.` };
  const clamped = clamp(Number(priceMult) || 1, OPS_ECONOMY.priceMinMult, OPS_ECONOMY.priceMaxMult);
  state.player.operations.prices[product] = clamped;
  state.eventLog.push(logEntry(state, `You set the street markup for ${FARM_TYPES[product].label.toLowerCase()} to ${Math.round(clamped * 100)}% of base value.`, 'operations'));
  return { ok: true };
}

/* ---------------- Equipment ---------------- */

function buyEquipment(state, product) {
  if (!canAccessOperations(state)) return { ok: false, reason: `Only a ${OPS_ECONOMY.unlockRank} can build drug operations.` };
  const limits = getOpsLimits(state);
  const tier = state.player.operations.equipment[product];
  if (tier >= limits.maxEquipmentTier) return { ok: false, reason: `Equipment upgrades are capped at your current rank. Rank up to unlock further upgrades.` };
  const next = EQUIPMENT_TIERS[tier + 1];
  if (!next) return { ok: false, reason: 'Already at maximum equipment tier.' };
  if (state.player.cash.dirty < next.cost) return { ok: false, reason: `Requires ${fmtMoney(next.cost)} in Dirty Cash.` };
  state.player.cash.dirty -= next.cost;
  state.player.operations.equipment[product] = next.tier;
  state.eventLog.push(logEntry(state, `Upgraded your ${FARM_TYPES[product].label.toLowerCase()} equipment to ${next.name}.`, 'operations'));
  return { ok: true };
}

/* ---------------- Operation Protection ---------------- */

function bribeOpProtection(state, districtId, amount) {
  if (!canAccessOperations(state)) return { ok: false, reason: `Only a ${OPS_ECONOMY.unlockRank} can build drug operations.` };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter a bribe amount.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  state.player.cash.dirty -= amount;
  const district = state.districts[districtId];
  district.opProtection = clamp((district.opProtection || 0) + amount * OPS_ECONOMY.protectionPerDollar, 0, 100);
  state.eventLog.push(logEntry(state, `You spread ${fmtMoney(amount)} around ${district.name} to keep the law off your operations.`, 'operations'));
  return { ok: true };
}

/* ---------------- Turn Tick: Growth, Raids, Distribution ---------------- */

function farmTick(state) {
  if (!canAccessOperations(state)) return;

  const distributorCount = totalDistributors(state);
  const vehicleCapacity = totalVehicleCapacity(state);
  if (distributorCount > 0) {
    const upkeep = distributorCount * DISTRIBUTOR_UPKEEP;
    if (state.player.cash.dirty >= upkeep) {
      state.player.cash.dirty -= upkeep;
    } else {
      const shortfall = upkeep - state.player.cash.dirty;
      state.player.cash.dirty = 0;
      state.player.crew.loyalty = clamp(state.player.crew.loyalty - 2, 0, 100);
      state.eventLog.push(logEntry(state, `Couldn't cover ${fmtMoney(shortfall)} in distributor upkeep. Crew loyalty -2.`, 'operations'));
    }
  }

  for (const product of Object.keys(FARM_TYPES)) {
    const def = FARM_TYPES[product];
    const equipMult = EQUIPMENT_TIERS[state.player.operations.equipment[product]].yieldMult;

    for (const district of state.districts) {
      const farm = district.farms[product];
      if (!farm || farm.plots <= 0) {
        if (farm) district.opProtection = clamp((district.opProtection || 0) - OPS_ECONOMY.protectionDecay, 0, 100);
        continue;
      }

      farm.growTurn++;
      district.heat = clamp(district.heat + farm.plots, 0, 100);
      addHeat(state, 'pd', Math.max(0, Math.round(farm.plots / 2) - Math.floor((district.opProtection || 0) / 20)));

      if (farm.growTurn >= def.growTurns) {
        const batchValue = Math.round(farm.plots * def.batchValuePerPlot * equipMult);
        farm.pendingValue += batchValue;
        farm.growTurn = 0;
        narrate(state, 'farm_maturity', { vars: { district: district.name, product: def.label, amount: fmtMoney(batchValue) } });
        state.eventLog.push(logEntry(state, `Your ${def.label.toLowerCase()} operation in ${district.name} matured: a batch worth ${fmtMoney(batchValue)} is ready to move.`, 'operations'));
      }

      checkFarmRaid(state, district, product, farm);

      district.opProtection = clamp((district.opProtection || 0) - OPS_ECONOMY.protectionDecay, 0, 100);
    }

    // Distribution: distributors sell from matured batches across all districts
    let sellCapacity = state.player.operations.distributors[product] * DISTRIBUTOR_BASE_CAPACITY;
    if (distributorCount > 0) {
      sellCapacity += vehicleCapacity * (state.player.operations.distributors[product] / distributorCount);
    }
    if (sellCapacity > 0) {
      if (state.criminalWorld && state.criminalWorld.smugglingBonusTurns > 0) {
        sellCapacity *= (1 + state.criminalWorld.smugglingBonusMult);
      }
      const priceMult = state.player.operations.prices[product];
      const demandMult = clamp(2 - priceMult, 0.4, 1.5); // higher markup = slower sales
      sellCapacity *= demandMult;

      let totalRevenue = 0;
      for (const district of state.districts) {
        if (sellCapacity <= 0) break;
        const farm = district.farms[product];
        if (!farm || farm.pendingValue <= 0) continue;
        const sold = Math.min(farm.pendingValue, sellCapacity);
        farm.pendingValue -= sold;
        sellCapacity -= sold;
        totalRevenue += sold * priceMult;
      }
      if (totalRevenue > 0) {
        addCash(state, totalRevenue, 0);
        narrate(state, 'distribution_sale', { vars: { product: def.label, amount: fmtMoney(totalRevenue) } });
        state.eventLog.push(logEntry(state, `Your distributors moved ${fmtMoney(totalRevenue)} worth of ${def.label.toLowerCase()}.`, 'operations'));
      }
    }
  }

  stashGoodsTick(state);
}

/* ---------------- Stash House Goods: Overflow & Rental Income ---------------- */

function stashGoodsTick(state) {
  for (const district of state.districts) {
    const tier = district.operations.stash.tier;
    const capacity = OPERATION_DEFS.stash.tiers[tier].goodsCapacity;
    if (capacity <= 0) continue;

    let used = 0;
    for (const product of Object.keys(FARM_TYPES)) used += district.farms[product].pendingValue;

    if (used > capacity) {
      const excess = used - capacity;
      for (const product of Object.keys(FARM_TYPES)) {
        const farm = district.farms[product];
        if (used > 0 && farm.pendingValue > 0) {
          const share = farm.pendingValue / used;
          farm.pendingValue = Math.max(0, farm.pendingValue - Math.round(excess * share));
        }
      }
      addHeat(state, 'gangs', 2);
      state.eventLog.push(logEntry(state, `Your stash in ${district.name} overflowed - rival crews helped themselves to ${fmtMoney(excess)} worth of product.`, 'operations'));
    } else {
      const free = capacity - used;
      const rental = Math.round(free * OPS_ECONOMY.stashRentalRate);
      if (rental > 0) {
        addCash(state, rental, 0);
        state.eventLog.push(logEntry(state, `Other crews paid ${fmtMoney(rental)} to use spare space in your ${district.name} stash house.`, 'operations'));
      }
    }
  }
}

function checkFarmRaid(state, district, product, farm) {
  if (farm.plots <= 0) return;
  const protection = district.opProtection || 0;
  const chance = clamp(OPS_ECONOMY.raidBaseRisk + district.heat / 10 - protection / 5, 1, 60);
  if (Math.random() * 100 < chance) {
    farm.plots = Math.max(0, farm.plots - 1);
    farm.pendingValue = Math.round(farm.pendingValue * 0.6);
    addHeat(state, 'pd', 8);
    addHeat(state, 'feds', 4);
    narrate(state, 'operation_raid', { vars: { district: district.name } });
    state.eventLog.push(logEntry(state, `RAID! Authorities hit your ${FARM_TYPES[product].label.toLowerCase()} operation in ${district.name}. A plot is seized.`, 'operation_raid'));
  }
}

/* ---------------- Kidnapping Racket ---------------- */

function doKidnapJob(state, jobId) {
  const def = KIDNAP_JOBS.find(j => j.id === jobId);
  if (!def) return { ok: false, reason: 'Unknown job.' };
  if (!isUnlockedForRank(state, def.unlockRank)) return { ok: false, reason: `${def.label} unlocks at rank ${def.unlockRank}.` };
  const result = resolveScuffle(state, def.difficulty);
  const span = def.cashMax - def.cashMin;
  const heatSpan = def.heatMax - def.heatMin;

  if (result.result === 'success') {
    const gain = Math.round(def.cashMin + Math.random() * span);
    addCash(state, gain, 0);
    addRep(state, 'street', def.repGain);
    addRep(state, 'gang', def.repGain);
    const pdHeat = Math.round(def.heatMin + Math.random() * heatSpan * 0.6);
    const fedHeat = Math.round(pdHeat * 0.6);
    addHeat(state, 'pd', pdHeat);
    addHeat(state, 'feds', fedHeat);
    narrate(state, 'post_crime_success');
    state.eventLog.push(logEntry(state, `${def.label}: the ransom pays out ${fmtMoney(gain)}. PD Heat +${pdHeat}, Fed Heat +${fedHeat}.`, 'activity'));
  } else if (result.result === 'partial') {
    const gain = Math.round((def.cashMin + Math.random() * span) * 0.4);
    addCash(state, gain, 0);
    const pdHeat = Math.round(def.heatMin + Math.random() * heatSpan);
    const fedHeat = Math.round(pdHeat * 0.8);
    addHeat(state, 'pd', pdHeat);
    addHeat(state, 'feds', fedHeat);
    narrate(state, 'post_crime_partial');
    state.eventLog.push(logEntry(state, `${def.label} goes sideways - a partial ransom of ${fmtMoney(gain)}, but PD Heat +${pdHeat} and Fed Heat +${fedHeat}.`, 'activity'));
  } else {
    const pdHeat = def.heatMax;
    const fedHeat = Math.round(pdHeat * 1.2);
    addHeat(state, 'pd', pdHeat);
    addHeat(state, 'feds', fedHeat);
    applyInjury(state, 'minor');
    addRep(state, 'street', -2);
    narrate(state, 'post_crime_fail');
    state.eventLog.push(logEntry(state, `${def.label} falls apart - the target gets away and calls it in. PD Heat +${pdHeat}, Fed Heat +${fedHeat}.`, 'activity'));
  }
  return { ok: true };
}
