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

function tickOperations(state) {
  const mitigation = totalHeatMitigation(state);

  for (const district of state.districts) {
    // Smuggling Route - generates product, risk of bust
    const routeTier = district.operations.route.tier;
    if (routeTier > 0 && !district.operations.route.raided) {
      const def = OPERATION_DEFS.route.tiers[routeTier];
      const cap = getStashCapacity(state);
      const current = totalProductUnits(state);
      const room = Math.max(0, cap - current);
      const add = Math.min(def.throughput, room);
      if (add > 0) {
        const each = Math.floor(add / GANG_PRODUCTS.length);
        let remainder = add - each * GANG_PRODUCTS.length;
        for (const product of GANG_PRODUCTS) {
          let amount = each;
          if (remainder > 0) { amount++; remainder--; }
          state.player.inventory.product[product] += amount;
        }
      }
      checkOperationRaid(state, district, 'route', def.bustRisk, mitigation);
    } else if (district.operations.route.raided) {
      district.operations.route.raidCooldown--;
      if (district.operations.route.raidCooldown <= 0) district.operations.route.raided = false;
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
