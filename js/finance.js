/* ============================================================
   UNDERWORLD - Money Laundering & Legit Business Fronts
   ============================================================ */

/* ---------------- Laundering via Rival Gangs (no shell needed) ---------------- */

function launderViaGangs(state, amount) {
  amount = Math.max(0, Math.floor(amount) || 0);
  if (amount <= 0) return { ok: false, reason: 'Enter an amount to launder.' };
  if (state.player.cash.dirty < amount) return { ok: false, reason: `Requires ${fmtMoney(amount)} in Dirty Cash.` };
  const fee = amount * GANG_LAUNDER_CUT;
  const cleaned = Math.round(amount - fee);
  state.player.cash.dirty -= amount;
  state.player.cash.clean += cleaned;
  addHeat(state, 'gangs', 1);
  state.eventLog.push(logEntry(state, `A rival crew laundered ${fmtMoney(amount)} for you, taking a ${Math.round(GANG_LAUNDER_CUT * 100)}% cut. You netted ${fmtMoney(cleaned)} clean.`, 'finance'));
  return { ok: true, cleaned };
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
    auditCooldown: 0
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
  return state.ownedBusinesses.reduce((sum, b) => sum + (b.damaged ? 0 : b.launderBonus), 0);
}

function launderingTick(state) {
  const businessMult = familyBusinessMultiplier(state);
  for (const c of state.shellCompanies) {
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
    }
    // Audit risk
    if (Math.random() * 100 < tierDef.auditRisk) {
      const loss = Math.round(state.player.cash.clean * (0.1 + Math.random() * 0.2));
      state.player.cash.clean -= loss;
      addHeat(state, 'feds', 6 + Math.floor(Math.random() * 6));
      c.auditCooldown = 2;
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
  }

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
    damaged: false
  };
  state.ownedBusinesses.push(business);
  state.businessMarket[districtId] = market.filter(b => b.id !== marketId);
  addRep(state, 'street', 2);
  state.eventLog.push(logEntry(state, `Acquired ${business.type} in ${state.districts[districtId].name} for ${fmtMoney(price)}.`, 'finance'));
  return { ok: true, business };
}

function resaleValue(state, businessId) {
  const business = state.ownedBusinesses.find(b => b.id === businessId);
  if (!business) return 0;
  const district = state.districts[business.districtId];
  const myGangId = playerGangId(state);
  const controlPct = myGangId ? (district.control[myGangId] || 0) : 50;
  const repFactor = (state.player.reputation.street + state.player.reputation.gang) / 200; // 0-1
  const heatFactor = 1 - district.heat / 250; // high district heat erodes resale value
  let value = business.purchasePrice * (0.4 + controlPct / 200 + repFactor * 0.2) * heatFactor + business.baseIncome * 8;
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

function businessIncomeTick(state) {
  const mult = familyBusinessMultiplier(state);
  let total = 0;
  const districtCounts = {};
  for (const b of state.ownedBusinesses) {
    if (!b.damaged) {
      const income = Math.round(b.baseIncome * mult);
      total += income;
    }
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

// Random event hook: damage a business in districts with active gang conflict
function checkBusinessDamage(state) {
  for (const b of state.ownedBusinesses) {
    if (b.damaged) continue;
    const district = state.districts[b.districtId];
    if (district.heat > 50 && Math.random() < 0.05) {
      b.damaged = true;
      state.eventLog.push(logEntry(state, `Crossfire in ${district.name} left your ${b.type} damaged. Income halted until repaired.`, 'finance_raid'));
    }
  }
}

function getFrontHeatReduction(state) {
  return state.ownedBusinesses.reduce((sum, b) => sum + (b.damaged ? 0 : b.heatReduction), 0);
}
