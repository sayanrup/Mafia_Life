/* ============================================================
   UNDERWORLD - Drug Operations (Boss-tier farms/labs, distributors,
   street pricing, equipment, operation protection, kidnapping)
   ============================================================ */

function canAccessOperations(state) {
  return rankIndex(state.player.rank) >= rankIndex(OPS_ECONOMY.unlockRank);
}

function freshDistributorCounts() {
  const counts = {};
  for (const t of DISTRIBUTOR_TYPES) counts[t.id] = 0;
  return counts;
}

function freshPlayerOperations() {
  return {
    distributors: { weed: freshDistributorCounts(), pills: freshDistributorCounts(), powder: freshDistributorCounts() },
    prices: { weed: 1, pills: 1, powder: 1 },
    equipment: { weed: 0, pills: 0, powder: 0 },
    marketing: { weed: { campaignId: null, turnsLeft: 0 }, pills: { campaignId: null, turnsLeft: 0 }, powder: { campaignId: null, turnsLeft: 0 } }
  };
}

function initPlayerOperations(state) {
  state.player.operations = freshPlayerOperations();
  for (const d of state.districts) {
    d.farms = {
      weed: { plots: 0, growTurn: 0, pendingValue: 0, invested: 0, lastRevenue: 0, lastExpense: 0 },
      pills: { plots: 0, growTurn: 0, pendingValue: 0, invested: 0, lastRevenue: 0, lastExpense: 0 },
      powder: { plots: 0, growTurn: 0, pendingValue: 0, invested: 0, lastRevenue: 0, lastExpense: 0 }
    };
    d.opProtection = 0;
    d.protectionIncome = 0;
  }
}

/* ---------------- Plots / Farms ---------------- */

// Returns the cost of the next facility tier, or null if already maxed out.
function getFarmPlotCost(state, districtId, product) {
  const def = FARM_TYPES[product];
  const plots = state.districts[districtId].farms[product].plots;
  const tier = def.facilityTiers[plots];
  return tier ? tier.cost : null;
}

// How many turns a grow cycle takes, based on the highest facility tier owned.
function getFarmGrowTurns(state, districtId, product) {
  const def = FARM_TYPES[product];
  const farm = state.districts[districtId].farms[product];
  if (farm.plots <= 0) return def.growTurns;
  return def.facilityTiers[farm.plots - 1].growTurns;
}

// Sum of batch values for every facility tier owned so far.
function getFarmBatchValue(state, districtId, product) {
  const def = FARM_TYPES[product];
  const farm = state.districts[districtId].farms[product];
  let total = 0;
  for (let i = 0; i < farm.plots; i++) total += def.facilityTiers[i].batchValue;
  return total;
}

function buyFarmPlot(state, districtId, product) {
  const limits = getOpsLimits(state);
  if (!limits.unlockedProducts.includes(product)) return { ok: false, reason: `${FARM_TYPES[product].label} operations unlock once you've earned more Dirty Cash.` };
  const farm = state.districts[districtId].farms[product];
  if (farm.plots >= limits.maxPlotsPerDistrict) return { ok: false, reason: `Your current limit is ${limits.maxPlotsPerDistrict} ${FARM_TYPES[product].label.toLowerCase()} facility tier(s) per district. Earn more Dirty Cash to expand.` };
  const cost = getFarmPlotCost(state, districtId, product);
  if (cost == null) return { ok: false, reason: 'Already at the maximum facility tier.' };
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.districts[districtId].farms[product].plots++;
  state.districts[districtId].farms[product].invested = (state.districts[districtId].farms[product].invested || 0) + cost;
  const tierName = FARM_TYPES[product].facilityTiers[farm.plots - 1].name;
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You build a ${tierName} for your ${FARM_TYPES[product].label.toLowerCase()} operation in ${district.name} for ${fmtMoney(cost)}.`, 'operations'));
  return { ok: true };
}

// Net worth of an operation = cumulative amount invested in its facility tiers.
function getFarmNetWorth(state, districtId, product) {
  return state.districts[districtId].farms[product].invested || 0;
}

function sellFarmOperation(state, districtId, product) {
  const farm = state.districts[districtId].farms[product];
  if (!farm || farm.plots <= 0) return { ok: false, reason: 'Nothing to sell.' };
  const value = Math.round((farm.invested || 0) * 1.5);
  state.player.cash.dirty += value;
  farm.plots = 0;
  farm.growTurn = 0;
  farm.pendingValue = 0;
  farm.invested = 0;
  farm.lastRevenue = 0;
  farm.lastExpense = 0;
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You sell off your ${FARM_TYPES[product].label.toLowerCase()} operation in ${district.name} for ${fmtMoney(value)}.`, 'operations'));
  return { ok: true, value };
}

/* ---------------- Distributors ---------------- */

function totalDistributors(state) {
  let total = 0;
  for (const product of Object.keys(state.player.operations.distributors)) {
    const counts = state.player.operations.distributors[product];
    for (const typeId of Object.keys(counts)) total += counts[typeId];
  }
  return total;
}

function productDistributorCount(state, product) {
  const counts = state.player.operations.distributors[product];
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function hireDistributors(state, product, typeId, count) {
  const type = DISTRIBUTOR_TYPES.find(t => t.id === typeId);
  if (!type) return { ok: false, reason: 'Unknown distributor type.' };
  if (!isUnlockedForCash(state, type.unlockCash)) return { ok: false, reason: `${type.label} unlocks once you've earned ${fmtMoney(type.unlockCash)} Dirty Cash.` };
  const limits = getOpsLimits(state);
  count = Math.max(1, Math.floor(count) || 0);
  const room = limits.maxDistributors - totalDistributors(state);
  if (room <= 0) return { ok: false, reason: `Your current limit is ${limits.maxDistributors} distributor(s) total. Earn more Dirty Cash to hire more.` };
  count = Math.min(count, room);
  state.player.operations.distributors[product][typeId] += count;
  state.eventLog.push(logEntry(state, `You bring on ${count}x ${type.label} to move ${FARM_TYPES[product].label.toLowerCase()} (${fmtMoney(type.upkeep)}/turn wage each).`, 'operations'));
  return { ok: true };
}

/* ---------------- Pricing ---------------- */

function setOperationPrice(state, product, priceMult) {
  const clamped = clamp(Number(priceMult) || 1, OPS_ECONOMY.priceMinMult, OPS_ECONOMY.priceMaxMult);
  state.player.operations.prices[product] = clamped;
  state.eventLog.push(logEntry(state, `You set the street markup for ${FARM_TYPES[product].label.toLowerCase()} to ${Math.round(clamped * 100)}% of base value.`, 'operations'));
  return { ok: true };
}

/* ---------------- Equipment ---------------- */

function buyEquipment(state, product) {
  const limits = getOpsLimits(state);
  const tier = state.player.operations.equipment[product];
  if (tier >= limits.maxEquipmentTier) return { ok: false, reason: `Equipment upgrades are capped at your current Dirty Cash tier. Earn more Dirty Cash to unlock further upgrades.` };
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
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter a bribe amount.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  state.player.cash.dirty -= amount;
  const district = state.districts[districtId];
  district.opProtection = clamp((district.opProtection || 0) + amount * OPS_ECONOMY.protectionPerDollar, 0, 100);
  state.eventLog.push(logEntry(state, `You spread ${fmtMoney(amount)} around ${district.name} to keep the law off your operations.`, 'operations'));
  return { ok: true };
}

/* ---------------- Security Details (preset protection payoffs) ---------------- */

function hireSecurityDetail(state, districtId, tierId) {
  const tier = SECURITY_TIERS.find(t => t.id === tierId);
  if (!tier) return { ok: false, reason: 'Unknown security detail.' };
  const result = bribeOpProtection(state, districtId, tier.amount);
  if (result.ok) {
    const district = state.districts[districtId];
    district.protectionIncome = Math.max(district.protectionIncome || 0, tier.incomePerTurn);
  }
  return result;
}

/* ---------------- Marketing Campaigns (temporary demand boosts) ---------------- */

function launchMarketingCampaign(state, product, campaignId) {
  const campaign = MARKETING_CAMPAIGNS.find(c => c.id === campaignId);
  if (!campaign) return { ok: false, reason: 'Unknown campaign.' };
  if (!isUnlockedForCash(state, campaign.unlockCash)) return { ok: false, reason: `${campaign.label} unlocks once you've earned ${fmtMoney(campaign.unlockCash)} Dirty Cash.` };
  if (state.player.cash.dirty < campaign.cost) return { ok: false, reason: `Requires ${fmtMoney(campaign.cost)} in Dirty Cash.` };
  state.player.cash.dirty -= campaign.cost;
  state.player.operations.marketing[product] = { campaignId: campaign.id, turnsLeft: campaign.turns };
  state.eventLog.push(logEntry(state, `You launch a "${campaign.label}" campaign for your ${FARM_TYPES[product].label.toLowerCase()} operation (+${Math.round(campaign.demandBonus * 100)}% demand for ${campaign.turns} turn(s)).`, 'operations'));
  return { ok: true };
}

/* ---------------- Turn Tick: Growth, Raids, Distribution ---------------- */

function farmTick(state) {
  if (!canAccessOperations(state)) return;

  // Paid-off cops & feds kick back a cut of their own action while protection holds.
  let protectionPayout = 0;
  for (const district of state.districts) {
    if ((district.opProtection || 0) > 0 && district.protectionIncome > 0) {
      protectionPayout += district.protectionIncome;
    } else {
      district.protectionIncome = 0;
    }
  }
  if (protectionPayout > 0) {
    state.player.cash.dirty += protectionPayout;
  }

  const distributorCount = totalDistributors(state);
  const vehicleCapacity = totalVehicleCapacity(state);
  const upkeepByProduct = {};
  if (distributorCount > 0) {
    let upkeep = 0;
    for (const product of Object.keys(FARM_TYPES)) {
      const counts = state.player.operations.distributors[product];
      let productUpkeep = 0;
      for (const type of DISTRIBUTOR_TYPES) productUpkeep += (counts[type.id] || 0) * type.upkeep;
      upkeepByProduct[product] = productUpkeep;
      upkeep += productUpkeep;
    }
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

    const activeFarms = state.districts.filter(d => d.farms[product] && d.farms[product].plots > 0);
    const expensePerFarm = activeFarms.length > 0 ? (upkeepByProduct[product] || 0) / activeFarms.length : 0;
    for (const district of state.districts) {
      const farm = district.farms[product];
      if (farm) {
        farm.lastRevenue = 0;
        farm.lastExpense = farm.plots > 0 ? Math.round(expensePerFarm) : 0;
      }
      if (!farm || farm.plots <= 0) {
        if (farm) district.opProtection = clamp((district.opProtection || 0) - OPS_ECONOMY.protectionDecay, 0, 100);
        continue;
      }

      farm.growTurn++;
      district.heat = clamp(district.heat + farm.plots, 0, 100);
      addHeat(state, 'pd', Math.max(0, Math.round(farm.plots / 2) - Math.floor((district.opProtection || 0) / 20)));

      if (farm.growTurn >= getFarmGrowTurns(state, district.id, product)) {
        const batchValue = Math.round(getFarmBatchValue(state, district.id, product) * equipMult);
        farm.pendingValue += batchValue;
        farm.growTurn = 0;
        narrate(state, 'farm_maturity', { vars: { district: district.name, product: def.label, amount: fmtMoney(batchValue) } });
        state.eventLog.push(logEntry(state, `Your ${def.label.toLowerCase()} operation in ${district.name} matured: a batch worth ${fmtMoney(batchValue)} is ready to move.`, 'operations'));
      }

      checkFarmRaid(state, district, product, farm);

      district.opProtection = clamp((district.opProtection || 0) - OPS_ECONOMY.protectionDecay, 0, 100);
    }

    // Distribution: distributors sell from matured batches across all districts
    const productDistCount = productDistributorCount(state, product);
    const counts = state.player.operations.distributors[product];
    let sellCapacity = 0;
    for (const type of DISTRIBUTOR_TYPES) sellCapacity += (counts[type.id] || 0) * type.capacity;
    if (distributorCount > 0) {
      sellCapacity += vehicleCapacity * (productDistCount / distributorCount);
    }
    if (sellCapacity > 0) {
      if (state.criminalWorld && state.criminalWorld.smugglingBonusTurns > 0) {
        sellCapacity *= (1 + state.criminalWorld.smugglingBonusMult);
      }

      // Distributor performance swings +/-50% with equipment efficiency and gang heat.
      const equipTier = state.player.operations.equipment[product];
      const efficiency = equipTier / (EQUIPMENT_TIERS.length - 1);
      const gangHeat = (state.player.heat.gangs || 0) / 100;
      const distVariance = clamp(1 + efficiency * 0.5 - gangHeat * 0.5, 0.5, 1.5);
      sellCapacity *= distVariance;

      const priceMult = state.player.operations.prices[product];
      const marketing = state.player.operations.marketing[product];
      const marketingBonus = marketing && marketing.turnsLeft > 0
        ? (MARKETING_CAMPAIGNS.find(c => c.id === marketing.campaignId) || {}).demandBonus || 0
        : 0;
      const demandMult = clamp(2 - priceMult + marketingBonus, 0.4, 2.5); // higher markup = slower sales, marketing offsets it
      sellCapacity *= demandMult;

      let totalRevenue = 0;
      for (const district of state.districts) {
        if (sellCapacity <= 0) break;
        const farm = district.farms[product];
        if (!farm || farm.pendingValue <= 0) continue;
        const sold = Math.min(farm.pendingValue, sellCapacity);
        farm.pendingValue -= sold;
        sellCapacity -= sold;
        const revenue = sold * priceMult;
        farm.lastRevenue += revenue;
        totalRevenue += revenue;
      }
      if (totalRevenue > 0) {
        addCash(state, totalRevenue, 0);
        narrate(state, 'distribution_sale', { vars: { product: def.label, amount: fmtMoney(totalRevenue) } });
        state.eventLog.push(logEntry(state, `Your distributors moved ${fmtMoney(totalRevenue)} worth of ${def.label.toLowerCase()}.`, 'operations'));
      }
    }

    const marketing = state.player.operations.marketing[product];
    if (marketing && marketing.turnsLeft > 0) {
      marketing.turnsLeft--;
      if (marketing.turnsLeft <= 0) {
        const campaign = MARKETING_CAMPAIGNS.find(c => c.id === marketing.campaignId);
        state.eventLog.push(logEntry(state, `Your "${campaign ? campaign.label : 'marketing'}" campaign for ${def.label.toLowerCase()} has run its course.`, 'operations'));
        marketing.campaignId = null;
        marketing.turnsLeft = 0;
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
