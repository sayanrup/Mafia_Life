/* ============================================================
   UNDERWORLD - Operations (Labs, Stash Houses, Smuggling Routes)
   ============================================================ */

function getOperationTier(district, opType) {
  return district.operations[opType].tier;
}

function getUpgradeCost(district, opType) {
  const def = OPERATION_DEFS[opType];
  const nextTier = district.operations[opType].tier + 1;
  if (nextTier >= def.tiers.length) return null;
  return def.tiers[nextTier].cost;
}

function canUpgradeOperation(state, districtId, opType) {
  const district = state.districts[districtId];
  const cost = getUpgradeCost(district, opType);
  if (cost === null) return { ok: false, reason: 'Already at maximum tier.' };
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} in Dirty Cash.` };
  return { ok: true, cost };
}

function upgradeOperation(state, districtId, opType) {
  const district = state.districts[districtId];
  const check = canUpgradeOperation(state, districtId, opType);
  if (!check.ok) return check;
  state.player.cash.dirty -= check.cost;
  district.operations[opType].tier++;
  district.operations[opType].raided = false;
  district.operations[opType].raidCooldown = 0;
  const tierName = OPERATION_DEFS[opType].tiers[district.operations[opType].tier].name;
  state.eventLog.push(logEntry(state, `${OPERATION_DEFS[opType].label} in ${district.name} upgraded to ${tierName}.`, 'operations'));
  return { ok: true };
}

function getStashCapacity(state) {
  let total = 200; // base personal capacity
  for (const d of state.districts) {
    const tier = d.operations.stash.tier;
    total += OPERATION_DEFS.stash.tiers[tier].capacity - OPERATION_DEFS.stash.tiers[0].capacity;
  }
  return total;
}

function totalProductUnits(state) {
  return Object.values(state.player.inventory.product).reduce((a, b) => a + b, 0);
}

function totalHeatMitigation(state) {
  let total = 0;
  for (const d of state.districts) {
    total += OPERATION_DEFS.stash.tiers[d.operations.stash.tier].heatMitigation;
  }
  return total;
}

// Smuggling routes still ferry arms & contraband into your stash, but the
// weed/pills/powder portion of every run is fenced on the spot for dirty
// cash - no more manual "Deals" required.
const SMUGGLE_GOODS = ['arms', 'contraband'];

function smugglingEfficiency(state) {
  const equipTiers = Object.values(state.player.operations.equipment);
  return equipTiers.reduce((a, b) => a + b, 0) / equipTiers.length / (EQUIPMENT_TIERS.length - 1);
}

function tickOperations(state) {
  const mitigation = totalHeatMitigation(state);
  const gangHeat = (state.player.heat.gangs || 0) / 100;
  const efficiency = smugglingEfficiency(state);

  for (const district of state.districts) {
    const route = district.operations.route;
    route.lastRevenue = 0;

    // Smuggling Route - generates contraband/arms and direct cash, risk of bust
    const routeTier = route.tier;
    if (routeTier > 0 && !route.raided) {
      const def = OPERATION_DEFS.route.tiers[routeTier];
      const cap = getStashCapacity(state);
      const current = totalProductUnits(state);
      const room = Math.max(0, cap - current);
      const add = Math.min(def.throughput, room);
      if (add > 0) {
        const each = Math.floor(add / SMUGGLE_GOODS.length);
        let remainder = add - each * SMUGGLE_GOODS.length;
        for (const product of SMUGGLE_GOODS) {
          let amount = each;
          if (remainder > 0) { amount++; remainder--; }
          state.player.inventory.product[product] += amount;
        }
      }

      // Cash payout: 50%-100% of the route's potential, scaling up with
      // distributor efficiency and down as gang heat disrupts the route.
      const pct = clamp(0.75 + efficiency * 0.25 - gangHeat * 0.25, 0.5, 1.0);
      const revenue = Math.round(def.cashMin + (def.cashMax - def.cashMin) * pct);
      addCash(state, revenue, 0);
      route.lastRevenue = revenue;

      checkOperationRaid(state, district, 'route', def.bustRisk, mitigation);
    } else if (route.raided) {
      route.raidCooldown--;
      if (route.raidCooldown <= 0) route.raided = false;
    }
  }
}

function checkOperationRaid(state, district, opType, riskPercent, mitigation) {
  const chance = clamp(riskPercent - mitigation, 1, 60);
  if (Math.random() * 100 < chance) {
    district.operations[opType].raided = true;
    district.operations[opType].raidCooldown = 2;
    const losses = {};
    let totalLost = 0;
    for (const product of GANG_PRODUCTS) {
      const lost = Math.round(state.player.inventory.product[product] * 0.4);
      losses[product] = lost;
      totalLost += lost;
      state.player.inventory.product[product] -= lost;
    }
    addHeat(state, 'feds', 6);
    addHeat(state, 'pd', 4);
    narrate(state, 'operation_raid', { vars: { district: district.name } });
    const lossSummary = GANG_PRODUCTS.filter(p => losses[p] > 0).map(p => `${losses[p]} ${p}`).join(', ');
    state.eventLog.push(logEntry(state, `BUSTED! A shipment on your ${OPERATION_DEFS.route.label} in ${district.name} was seized.${totalLost > 0 ? ` Lost ${lossSummary}.` : ''} The route is offline for 2 turns.`, 'operation_raid'));
  }
}
