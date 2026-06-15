/* ============================================================
   UNDERWORLD - Money Laundering & Legit Business Fronts
   ============================================================ */

/* ---------------- Laundering Methods (one-off, no shell needed) ---------------- */

function launderViaMethod(state, methodId, amount) {
  const method = LAUNDERING_METHODS.find(m => m.id === methodId);
  if (!method) return { ok: false, reason: 'Unknown laundering method.' };
  if (!isUnlockedForRank(state, method.unlockRank)) return { ok: false, reason: `${method.label} unlocks at rank ${method.unlockRank}.` };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter an amount to launder.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  const fee = amount * method.fee;
  const cleaned = Math.round(amount - fee);
  state.player.cash.dirty -= amount;
  state.player.cash.clean += cleaned;
  addHeat(state, method.heatTrack, method.heatAmount);
  state.eventLog.push(logEntry(state, `You launder ${fmtMoney(amount)} via ${method.label.toLowerCase()}, taking a ${Math.round(method.fee * 100)}% cut. You netted ${fmtMoney(cleaned)} clean.`, 'finance'));
  return { ok: true, cleaned };
}

function reverseLaunderViaMethod(state, methodId, amount) {
  const method = LAUNDERING_METHODS.find(m => m.id === methodId);
  if (!method) return { ok: false, reason: 'Unknown laundering method.' };
  if (!isUnlockedForRank(state, method.unlockRank)) return { ok: false, reason: `${method.label} unlocks at rank ${method.unlockRank}.` };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter an amount to convert.' };
  if (state.player.cash.clean < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Clean Cash.` };
  const fee = amount * method.fee;
  const dirtied = Math.round(amount - fee);
  state.player.cash.clean -= amount;
  state.player.cash.dirty += dirtied;
  addHeat(state, method.heatTrack, method.heatAmount);
  state.eventLog.push(logEntry(state, `You feed ${fmtMoney(amount)} of clean cash back through ${method.label.toLowerCase()} to get ${fmtMoney(dirtied)} dirty cash off the books, losing ${Math.round(method.fee * 100)}% to the cut.`, 'finance'));
  return { ok: true, dirtied };
}

/* ---------------- Shell Companies ---------------- */

function establishShellCompany(state, name) {
  const tierDef = SHELL_TIERS[0];
  const cost = Math.round(tierDef.cost * familyDiscountMultiplier(state));
  if (state.player.cash.clean < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Clean Cash.` };
  state.player.cash.clean -= cost;
  const company = {
    id: 'shell_' + Math.random().toString(36).slice(2, 8),
    name: name || `${NAME_POOLS.business[Math.floor(Math.random() * NAME_POOLS.business.length)]} Holdings`,
    tier: 1,
    auditCooldown: 0,
    lastRevenue: 0,
    lastExpense: 0
  };
  state.shellCompanies.push(company);
  state.eventLog.push(logEntry(state, `Established shell company "${company.name}" for ${fmtMoney(cost)}.`, 'finance'));
  return { ok: true, company };
}

function upgradeShellCompany(state, companyId) {
  const company = state.shellCompanies.find(c => c.id === companyId);
  if (!company) return { ok: false, reason: 'Not found.' };
  if (company.tier >= SHELL_TIERS.length) return { ok: false, reason: 'Already at maximum cover tier.' };
  const nextDef = SHELL_TIERS[company.tier];
  if (!isUnlockedForRank(state, nextDef.unlockRank)) return { ok: false, reason: `Tier ${nextDef.tier} cover unlocks at rank ${nextDef.unlockRank}.` };
  const cost = Math.round(nextDef.cost * familyDiscountMultiplier(state));
  if (state.player.cash.clean < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Clean Cash.` };
  state.player.cash.clean -= cost;
  company.tier++;
  state.eventLog.push(logEntry(state, `"${company.name}" upgraded to Tier ${company.tier} cover.`, 'finance'));
  return { ok: true };
}

function totalLaunderCapacity(state) {
  let total = 0;
  for (const c of state.shellCompanies) {
    if (c.auditCooldown > 0) continue;
    total += SHELL_TIERS[c.tier - 1].launderPerTurn;
  }
  total += totalBusinessLaunderCapacity(state);
  return total;
}

function totalBusinessLaunderCapacity(state) {
  return state.ownedBusinesses.reduce((sum, b) => sum + (b.damaged ? 0 : Math.round(b.launderBonus * businessLevelMult(b))), 0);
}

function launderingTick(state) {
  const businessMult = familyBusinessMultiplier(state);
  let launderedDirty = 0;
  let launderedClean = 0;
  for (const c of state.shellCompanies) {
    c.lastRevenue = 0;
    c.lastExpense = 0;
    if (c.auditCooldown > 0) {
      c.auditCooldown--;
      continue;
    }
    const tierDef = SHELL_TIERS[c.tier - 1];
    const amount = Math.min(tierDef.launderPerTurn, state.player.cash.dirty);
    if (amount > 0) {
      const fee = amount * tierDef.fee;
      const cleaned = (amount - fee) * businessMult;
      state.player.cash.dirty -= amount;
      state.player.cash.clean += cleaned;
      launderedDirty += amount;
      launderedClean += cleaned;
    }
    // Outside clients also pay the shell company to launder their money - the cover takes its cut as clean income.
    const outsideRevenue = Math.round(tierDef.launderPerTurn * businessMult);
    state.player.cash.clean += outsideRevenue;
    c.lastRevenue = outsideRevenue;
    // Audit risk - loss is scaled to this shell's own throughput (1-3 turns of
    // its launder volume), not the player's total clean cash, so a small shell
    // can't wipe out an unrelated fortune.
    if (Math.random() * 100 < tierDef.auditRisk) {
      const loss = Math.min(state.player.cash.clean, Math.round(tierDef.launderPerTurn * (1 + Math.random() * 2)));
      state.player.cash.clean -= loss;
      addHeat(state, 'feds', 6 + Math.floor(Math.random() * 6));
      c.auditCooldown = 2;
      c.lastExpense = loss;
      state.eventLog.push(logEntry(state, `Federal auditors descended on "${c.name}". Lost ${fmtMoney(loss)} and the books are frozen for 2 turns.`, 'finance_raid'));
    }
  }

  // Business fronts quietly mix a bit of dirty cash into their books too
  const businessCapacity = totalBusinessLaunderCapacity(state);
  if (businessCapacity > 0 && state.player.cash.dirty > 0) {
    const amount = Math.min(businessCapacity, state.player.cash.dirty);
    const fee = amount * 0.2;
    const cleaned = (amount - fee) * businessMult;
    state.player.cash.dirty -= amount;
    state.player.cash.clean += cleaned;
    launderedDirty += amount;
    launderedClean += cleaned;
  }

  state.player.lastLaunderedDirty = Math.round(launderedDirty);
  state.player.lastLaunderedClean = Math.round(launderedClean);

  // Excess dirty cash raises Fed Heat
  const capacity = totalLaunderCapacity(state);
  const excess = state.player.cash.dirty - capacity * 3;
  if (excess > 0) {
    addHeat(state, 'feds', clamp(Math.floor(excess / 2000), 0, 6));
  }
}

/* ---------------- Business Fronts ---------------- */

function buyBusiness(state, districtId, marketId) {
  const market = state.businessMarket[districtId];
  const listing = market.find(b => b.id === marketId);
  if (!listing) return { ok: false, reason: 'Listing not found.' };
  const price = Math.round(listing.price * familyDiscountMultiplier(state));
  if (state.player.cash.clean < price) return { ok: false, reason: `Requires ${fmtMoney(price)} Clean Cash.` };
  state.player.cash.clean -= price;
  const business = {
    id: 'biz_' + Math.random().toString(36).slice(2, 8),
    districtId,
    type: listing.type,
    baseIncome: listing.baseIncome,
    launderBonus: listing.launderBonus,
    heatReduction: listing.heatReduction,
    purchasePrice: price,
    damaged: false,
    level: 1,
    protection: 0,
    invested: price,
    lastRevenue: 0,
    lastExpense: 0
  };
  state.ownedBusinesses.push(business);
  state.businessMarket[districtId] = market.filter(b => b.id !== marketId);
  addRep(state, 'street', 2);
  state.eventLog.push(logEntry(state, `Acquired ${business.type} in ${state.districts[districtId].name} for ${fmtMoney(price)}.`, 'finance'));
  return { ok: true, business };
}

// Cost to upgrade a business from its current level to the next (null if already at max level 3).
function businessUpgradeCost(purchasePrice, level) {
  if (level >= 3) return null;
  return Math.round(purchasePrice * (level === 1 ? 0.6 : 1.2));
}

function businessLevelMult(business) {
  return 1 + (business.level - 1) * 0.5;
}

function upgradeBusiness(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return { ok: false, reason: 'Not found.' };
  const cost = businessUpgradeCost(business.purchasePrice, business.level);
  if (cost == null) return { ok: false, reason: 'Already at the maximum level.' };
  if (state.player.cash.clean < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Clean Cash.` };
  state.player.cash.clean -= cost;
  business.level++;
  business.invested = (business.invested || business.purchasePrice) + cost;
  state.eventLog.push(logEntry(state, `Upgraded ${business.type} in ${state.districts[business.districtId].name} to Level ${business.level} for ${fmtMoney(cost)}.`, 'finance'));
  return { ok: true };
}

// Net worth of a business = cumulative amount invested (purchase price + upgrades).
function getBusinessNetWorth(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return 0;
  return business.invested || business.purchasePrice || 0;
}

function bribeBusinessProtection(state, businessId, amount) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return { ok: false, reason: 'Not found.' };
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter a bribe amount.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  state.player.cash.dirty -= amount;
  business.protection = clamp((business.protection || 0) + amount * OPS_ECONOMY.protectionPerDollar, 0, 100);
  state.eventLog.push(logEntry(state, `You bribe local officials to keep an eye on your ${business.type} in ${state.districts[business.districtId].name} for ${fmtMoney(amount)}.`, 'finance'));
  return { ok: true };
}

// Selling a business front refunds 1.5x its net worth (cumulative invested amount).
function resaleValue(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return 0;
  let value = (business.invested || business.purchasePrice || 0) * 1.5;
  if (business.damaged) value *= 0.6;
  return Math.round(Math.max(0, value));
}

function sellBusiness(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return { ok: false, reason: 'Not found.' };
  const value = resaleValue(state, businessId);
  state.player.cash.clean += value;
  state.ownedBusinesses = state.ownedBusinesses.filter(b => b.id !== businessId);
  state.eventLog.push(logEntry(state, `Sold ${business.type} in ${state.districts[business.districtId].name} for ${fmtMoney(value)}.`, 'finance'));
  return { ok: true, value };
}

function repairBusiness(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business || !business.damaged) return { ok: false, reason: 'Nothing to repair.' };
  const cost = Math.round(business.purchasePrice * 0.25);
  if (state.player.cash.clean < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Clean Cash.` };
  state.player.cash.clean -= cost;
  business.damaged = false;
  state.eventLog.push(logEntry(state, `Repaired ${business.type} in ${state.districts[business.districtId].name} for ${fmtMoney(cost)}.`, 'finance'));
  return { ok: true };
}

// Revenue as a fraction of a business's baseIncome: ranges 50%-100%, biased
// downward as Gang Heat rises (rival gangs skim/disrupt takings), with
// random turn-to-turn variance within that band.
function businessRevenuePct(state) {
  const gangHeat = clamp(state.player.heat.gangs || 0, 0, 100);
  const midpoint = 0.9 - (gangHeat / 100) * 0.3; // 90% at 0 heat -> 60% at 100 heat
  const pct = midpoint + (Math.random() * 2 - 1) * 0.15; // +/-15% swing
  return clamp(pct, 0.5, 1.0);
}

function businessIncomeTick(state) {
  const mult = familyBusinessMultiplier(state);
  let total = 0;
  const districtCounts = {};
  for (const b of state.ownedBusinesses) {
    if (!b.damaged) {
      const pct = businessRevenuePct(state);
      const income = Math.round((b.baseIncome / OPS_ECONOMY.businessIncomeDivisor) * pct * businessLevelMult(b) * mult);
      total += income;
      b.lastRevenue = income;
      b.lastRevenuePct = pct;
    } else {
      b.lastRevenue = 0;
      b.lastRevenuePct = 0;
    }
    b.lastExpense = 0;
    districtCounts[b.districtId] = (districtCounts[b.districtId] || 0) + 1;
  }
  state.player.cash.clean += total;

  // Multiple fronts in a district -> small street rep boost (checked, capped)
  for (const [districtId, count] of Object.entries(districtCounts)) {
    if (count >= 2 && Math.random() < 0.1) {
      addRep(state, 'street', 1);
    }
  }
  return total;
}

// Random event hook: damage a business in districts with active gang conflict.
// Protection (bought via bribes) reduces the chance and decays each turn.
function checkBusinessDamage(state) {
  for (const b of state.ownedBusinesses) {
    const district = state.districts[b.districtId];
    if (!b.damaged) {
      const protectionFactor = 1 - (b.protection || 0) / 100;
      if (district.heat > 50 && Math.random() < 0.05 * protectionFactor) {
        b.damaged = true;
        state.eventLog.push(logEntry(state, `Crossfire in ${district.name} left your ${b.type} damaged. Income halted until repaired.`, 'finance_raid'));
      }
    }
    b.protection = clamp((b.protection || 0) - 5, 0, 100);
  }
}

function getFrontHeatReduction(state) {
  return state.ownedBusinesses.reduce((sum, b) => sum + (b.damaged ? 0 : b.heatReduction), 0);
}
