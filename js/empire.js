/* ============================================================
   UNDERWORLD - Drug Empire (Boss-tier production & distribution)
   Buy land/plots, hire distributors, set prices, auto-sell at
   end of turn, bribe for protection from raids.
   ============================================================ */

function canAccessEmpire(state) {
  return rankIndex(state.player.rank) >= rankIndex(EMPIRE.unlockRank);
}

function totalPlots(state, districtId) {
  const plots = state.player.empire.plots[districtId];
  if (!plots) return 0;
  return Object.values(plots).reduce((a, b) => a + b, 0);
}

function getPlotCost(state, districtId) {
  return EMPIRE.plotBaseCost + totalPlots(state, districtId) * EMPIRE.plotCostStep;
}

function buyLand(state, districtId, product) {
  if (!canAccessEmpire(state)) return { ok: false, reason: 'Only a Boss can build a drug empire.' };
  const cost = getPlotCost(state, districtId);
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  state.player.cash.dirty -= cost;
  const plots = state.player.empire.plots[districtId] || (state.player.empire.plots[districtId] = {});
  plots[product] = (plots[product] || 0) + 1;
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You acquire a new ${PRODUCT_TYPES[product].label} plot in ${district.name} for ${fmtMoney(cost)}.`, 'empire'));
  return { ok: true };
}

function totalDistributors(state) {
  return Object.values(state.player.empire.distributors).reduce((a, b) => a + b, 0);
}

function hireDistributors(state, districtId, count) {
  if (!canAccessEmpire(state)) return { ok: false, reason: 'Only a Boss can build a drug empire.' };
  count = Math.max(1, Math.floor(count) || 0);
  const cost = EMPIRE.distributorHireCost * count;
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.player.empire.distributors[districtId] = (state.player.empire.distributors[districtId] || 0) + count;
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You hire ${count} distributor(s) in ${district.name} for ${fmtMoney(cost)}.`, 'empire'));
  return { ok: true };
}

function setEmpirePrice(state, product, price) {
  if (!canAccessEmpire(state)) return { ok: false, reason: 'Only a Boss can build a drug empire.' };
  const base = PRODUCT_TYPES[product].baseValue;
  const min = Math.round(base * EMPIRE.priceMinMult);
  const max = Math.round(base * EMPIRE.priceMaxMult);
  const clamped = clamp(Math.round(price), min, max);
  state.player.empire.prices[product] = clamped;
  state.eventLog.push(logEntry(state, `You set the street price of ${PRODUCT_TYPES[product].label} to ${fmtMoney(clamped)}/unit.`, 'empire'));
  return { ok: true };
}

function bribeProtection(state, districtId, amount) {
  if (!canAccessEmpire(state)) return { ok: false, reason: 'Only a Boss can build a drug empire.' };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter a bribe amount.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  state.player.cash.dirty -= amount;
  const current = state.player.empire.protection[districtId] || 0;
  state.player.empire.protection[districtId] = clamp(current + amount * EMPIRE.protectionPerDollar, 0, 100);
  const district = state.districts[districtId];
  state.eventLog.push(logEntry(state, `You spread ${fmtMoney(amount)} around ${district.name} to keep the law off your operations.`, 'empire'));
  return { ok: true };
}

function empireTurnTick(state) {
  if (!canAccessEmpire(state)) return;

  const distributorCount = totalDistributors(state);
  if (distributorCount > 0) {
    const upkeep = distributorCount * EMPIRE.distributorUpkeep;
    if (state.player.cash.dirty >= upkeep) {
      state.player.cash.dirty -= upkeep;
    } else {
      const shortfall = upkeep - state.player.cash.dirty;
      state.player.cash.dirty = 0;
      state.player.crew.loyalty = clamp(state.player.crew.loyalty - 2, 0, 100);
      state.eventLog.push(logEntry(state, `Couldn't cover ${fmtMoney(shortfall)} in distributor upkeep. Crew loyalty -2.`, 'empire'));
    }
  }

  // Production: each plot produces units into the player's stash, generating heat
  for (const districtId of Object.keys(state.player.empire.plots)) {
    const district = state.districts[districtId];
    const plots = state.player.empire.plots[districtId];
    const protection = state.player.empire.protection[districtId] || 0;
    let producedAny = false;

    for (const product of Object.keys(plots)) {
      const count = plots[product];
      if (count <= 0) continue;
      const produced = Math.round(count * EMPIRE.productionPerPlot * (0.5 + state.player.crew.quality * 0.25));
      const cap = getStashCapacity(state);
      const used = totalProductUnits(state);
      const room = Math.max(0, cap - used);
      const add = Math.min(produced, room);
      if (add > 0) {
        state.player.inventory.product[product] += add;
        producedAny = true;
      }
    }

    if (producedAny) {
      district.heat = clamp(district.heat + totalPlots(state, districtId), 0, 100);
      addHeat(state, 'pd', Math.max(0, Math.round(totalPlots(state, districtId) / 2) - Math.round(protection / 20)));
    }

    checkEmpireRaid(state, district, protection);

    state.player.empire.protection[districtId] = clamp(protection - EMPIRE.protectionDecay, 0, 100);
  }

  // Distribution: each district with distributors auto-sells from the player's stash
  for (const districtId of Object.keys(state.player.empire.distributors)) {
    const count = state.player.empire.distributors[districtId];
    if (count > 0) autoSellInDistrict(state, districtId, count);
  }
}

function checkEmpireRaid(state, district, protection) {
  const plots = totalPlots(state, district.id);
  if (plots <= 0) return;
  const chance = clamp(EMPIRE.raidBaseRisk + district.heat / 10 - protection / 5, 1, 60);
  if (Math.random() * 100 < chance) {
    const plotMap = state.player.empire.plots[district.id];
    const products = Object.keys(plotMap).filter(p => plotMap[p] > 0);
    if (!products.length) return;
    const hit = products[Math.floor(Math.random() * products.length)];
    plotMap[hit]--;
    if (plotMap[hit] <= 0) delete plotMap[hit];
    addHeat(state, 'pd', 8);
    addHeat(state, 'feds', 4);
    state.eventLog.push(logEntry(state, `RAID! Authorities hit one of your ${PRODUCT_TYPES[hit].label} plots in ${district.name}. The land is seized.`, 'operation_raid'));
  }
}

function autoSellInDistrict(state, districtId, distributors) {
  const district = state.districts[districtId];
  let sellCapacity = distributors * EMPIRE.sellPerDistributor;
  let totalRevenue = 0;
  const sold = {};

  for (const product of Object.keys(PRODUCT_TYPES)) {
    if (sellCapacity <= 0) break;
    const have = state.player.inventory.product[product] || 0;
    if (have <= 0) continue;

    const marketPrice = getDealPrice(state, districtId, product);
    const setPrice = state.player.empire.prices[product];
    const demandMult = clamp(marketPrice / setPrice, 0.2, 1.5);

    const qty = Math.min(have, Math.round(sellCapacity * demandMult / Object.keys(PRODUCT_TYPES).length) || 0);
    const finalQty = Math.min(have, Math.max(0, qty));
    if (finalQty <= 0) continue;

    const revenue = finalQty * setPrice;
    state.player.inventory.product[product] -= finalQty;
    totalRevenue += revenue;
    sellCapacity -= finalQty;
    sold[product] = finalQty;

    district.saturation[product] = clamp((district.saturation[product] || 0) + finalQty * 2, 0, 100);
  }

  if (totalRevenue > 0) {
    addCash(state, totalRevenue, 0);
    const summary = Object.entries(sold).map(([p, q]) => `${q}x ${PRODUCT_TYPES[p].label}`).join(', ');
    state.eventLog.push(logEntry(state, `Your distributors moved ${summary} in ${district.name} for ${fmtMoney(totalRevenue)}.`, 'empire'));
  }
}
