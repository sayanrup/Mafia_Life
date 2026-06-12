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
  let total = 50; // base personal capacity
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
    // Drug Lab - passive dirty cash income, generates heat
    const labTier = district.operations.lab.tier;
    if (labTier > 0 && !district.operations.lab.raided) {
      const def = OPERATION_DEFS.lab.tiers[labTier];
      addCash(state, def.income, 0);
      district.heat = clamp(district.heat + def.heat, 0, 100);
      addHeat(state, 'pd', Math.max(0, Math.round(def.heat * 0.4) - Math.floor(mitigation / 10)));
      checkOperationRaid(state, district, 'lab', def.heat * 1.5, mitigation);
    } else if (district.operations.lab.raided) {
      district.operations.lab.raidCooldown--;
      if (district.operations.lab.raidCooldown <= 0) district.operations.lab.raided = false;
    }

    // Smuggling Route - generates product, risk of bust
    const routeTier = district.operations.route.tier;
    if (routeTier > 0 && !district.operations.route.raided) {
      const def = OPERATION_DEFS.route.tiers[routeTier];
      const cap = getStashCapacity(state);
      const current = totalProductUnits(state);
      const room = Math.max(0, cap - current);
      const add = Math.min(def.throughput, room);
      if (add > 0) {
        const armsAdd = Math.floor(add / 2);
        const contraAdd = add - armsAdd;
        state.player.inventory.product.arms += armsAdd;
        state.player.inventory.product.contraband += contraAdd;
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
    if (opType === 'lab') {
      const loss = Math.round(state.player.cash.dirty * 0.15);
      state.player.cash.dirty -= loss;
      addHeat(state, 'pd', 8);
      state.eventLog.push(logEntry(state, `RAID! Police hit your ${OPERATION_DEFS.lab.label} in ${district.name}. You lose ${fmtMoney(loss)} and the operation is offline for 2 turns.`, 'operation_raid'));
    } else {
      const lostArms = Math.round(state.player.inventory.product.arms * 0.4);
      const lostContra = Math.round(state.player.inventory.product.contraband * 0.4);
      state.player.inventory.product.arms -= lostArms;
      state.player.inventory.product.contraband -= lostContra;
      addHeat(state, 'feds', 6);
      addHeat(state, 'pd', 4);
      state.eventLog.push(logEntry(state, `BUSTED! A shipment on your ${OPERATION_DEFS.route.label} in ${district.name} was seized. Lost ${lostArms} arms and ${lostContra} contraband. The route is offline for 2 turns.`, 'operation_raid'));
    }
  }
}
