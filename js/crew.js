/* ============================================================
   UNDERWORLD - Crew, Armory, Loyalty & Lieutenants
   ============================================================ */

const RECRUIT_COST = 350;
const UPKEEP_PER_MEMBER = 60;
const LIEUTENANT_LOYALTY_THRESHOLD = 65;

function maxLieutenants(state) {
  const idx = rankIndex(state.player.rank);
  return 1 + idx; // Associate:1, Soldier:2, Capo:3, Underboss:4, Boss:5
}

function freshArmory() {
  const armory = {};
  for (const t of WEAPON_TIERS) armory[t.id] = 0;
  return armory;
}

/* ---------------- Armory ---------------- */

function buyWeapons(state, tier, quantity) {
  const t = WEAPON_TIERS[tier];
  if (!t || quantity <= 0) return { ok: false, reason: 'Invalid request.' };
  if (!isUnlockedForRank(state, t.unlockRank)) return { ok: false, reason: `${t.label} unlocks at rank ${t.unlockRank}.` };
  const cost = Math.round(t.unitCost * quantity * familyQuartermasterDiscount(state));
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.player.armory[tier] += quantity;
  recalcEquippedWeaponTier(state);
  state.eventLog.push(logEntry(state, `Picked up ${quantity}x ${t.label} for ${fmtMoney(cost)}.`, 'armory'));
  return { ok: true };
}

function sellWeapons(state, tier, quantity) {
  const t = WEAPON_TIERS[tier];
  if (!t || quantity <= 0) return { ok: false, reason: 'Invalid request.' };
  const owned = state.player.armory[tier] || 0;
  const actual = Math.min(quantity, owned);
  if (actual <= 0) return { ok: false, reason: `You don't own any ${t.label}.` };
  const refund = Math.round(t.unitCost * WEAPON_SELL_MULT * actual);
  state.player.armory[tier] -= actual;
  state.player.cash.dirty += refund;
  recalcEquippedWeaponTier(state);
  state.eventLog.push(logEntry(state, `Sold ${actual}x ${t.label} for ${fmtMoney(refund)}.`, 'armory'));
  return { ok: true };
}

function recalcEquippedWeaponTier(state) {
  let best = 0;
  for (let tier = WEAPON_TIERS.length - 1; tier >= 0; tier--) {
    if (state.player.armory[tier] >= state.player.crew.size && tier > best) {
      best = tier;
    }
  }
  // also allow lower tiers to count if a higher tier alone isn't enough, pick the best fully-equipped tier
  let equipped = 0;
  for (let tier = 0; tier < WEAPON_TIERS.length; tier++) {
    if (state.player.armory[tier] >= state.player.crew.size) equipped = tier;
  }
  state.player.crew.weaponTier = equipped;
}

function weaponCombatBonus(state) {
  return WEAPON_TIERS[state.player.crew.weaponTier].combatBonus;
}

// Called after major combat losses - degrade armory stock
function degradeArmory(state, severity) {
  for (let tier = WEAPON_TIERS.length - 1; tier >= 0; tier--) {
    if (state.player.armory[tier] > 0) {
      const loss = Math.ceil(state.player.armory[tier] * severity);
      state.player.armory[tier] = Math.max(0, state.player.armory[tier] - loss);
      if (loss > 0) {
        state.eventLog.push(logEntry(state, `Lost ${loss}x ${WEAPON_TIERS[tier].label} in the fighting.`, 'combat'));
      }
    }
  }
  recalcEquippedWeaponTier(state);
}

/* ---------------- Vehicles (Distribution Fleet) ---------------- */

function totalVehicleCapacity(state) {
  return (state.player.vehicles || []).reduce((sum, v) => {
    const def = VEHICLE_TYPES.find(t => t.id === v.typeId);
    return sum + (def ? def.cargoCapacity : 0);
  }, 0);
}

function totalVehicleUpkeep(state) {
  const raw = (state.player.vehicles || []).reduce((sum, v) => {
    const def = VEHICLE_TYPES.find(t => t.id === v.typeId);
    return sum + (def ? def.upkeep : 0);
  }, 0);
  return Math.round(raw * familyVehicleUpkeepMultiplier(state));
}

function buyVehicle(state, typeId) {
  const def = VEHICLE_TYPES.find(v => v.id === typeId);
  if (!def) return { ok: false, reason: 'Unknown vehicle.' };
  if (!isUnlockedForRank(state, def.unlockRank)) return { ok: false, reason: `${def.label} unlocks at rank ${def.unlockRank}.` };
  if (state.player.cash.dirty < def.cost) return { ok: false, reason: `Requires ${fmtMoney(def.cost)} in Dirty Cash.` };
  state.player.cash.dirty -= def.cost;
  state.player.vehicles.push({ id: 'veh_' + Math.random().toString(36).slice(2, 8), typeId: def.id });
  state.eventLog.push(logEntry(state, `Picked up a ${def.label} for ${fmtMoney(def.cost)} to help move product.`, 'crew'));
  return { ok: true };
}

function sellVehicle(state, vehicleId) {
  const idx = state.player.vehicles.findIndex(v => v.id === vehicleId);
  if (idx === -1) return { ok: false, reason: 'Vehicle not found.' };
  const def = VEHICLE_TYPES.find(t => t.id === state.player.vehicles[idx].typeId);
  const refund = Math.round(def.cost * def.resaleMult);
  state.player.vehicles.splice(idx, 1);
  state.player.cash.dirty += refund;
  state.eventLog.push(logEntry(state, `Sold a ${def.label} for ${fmtMoney(refund)}.`, 'crew'));
  return { ok: true };
}

/* ---------------- Recruiting & Upkeep ---------------- */

function recruitCrew(state, count) {
  const cap = getCrewCap(state);
  const room = cap - state.player.crew.size;
  if (room <= 0) return { ok: false, reason: `Crew is at capacity (${cap}) for your rank.` };
  const actual = Math.min(count, room);
  const cost = Math.round(RECRUIT_COST * actual * familyQuartermasterDiscount(state));
  if (state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} Dirty Cash.` };
  state.player.cash.dirty -= cost;
  state.player.crew.size += actual;
  recalcEquippedWeaponTier(state);
  state.eventLog.push(logEntry(state, `Recruited ${actual} new crew member(s) for ${fmtMoney(cost)}.`, 'crew'));
  return { ok: true, actual };
}

function totalUpkeepCost(state) {
  return state.player.crew.size * UPKEEP_PER_MEMBER + totalVehicleUpkeep(state);
}

/* ---------------- Crew Training ---------------- */

function trainCrew(state, programId) {
  const program = TRAINING_PROGRAMS.find(p => p.id === programId);
  if (!program) return { ok: false, reason: 'Unknown training program.' };
  if (!isUnlockedForRank(state, program.unlockRank)) return { ok: false, reason: `${program.label} unlocks at rank ${program.unlockRank}.` };
  const completed = state.player.crew.trainingCompleted || (state.player.crew.trainingCompleted = []);
  if (completed.includes(program.id)) return { ok: false, reason: `${program.label} has already been completed.` };
  if (state.player.cash.dirty < program.cost) return { ok: false, reason: `Requires ${fmtMoney(program.cost)} Dirty Cash.` };
  state.player.cash.dirty -= program.cost;
  state.player.crew.quality = Math.round((state.player.crew.quality + program.qualityGain) * 100) / 100;
  completed.push(program.id);
  state.eventLog.push(logEntry(state, `Your crew completed "${program.label}" (Quality +${program.qualityGain.toFixed(1)}).`, 'crew'));
  return { ok: true };
}

function payUpkeep(state, pay) {
  const cost = totalUpkeepCost(state);
  if (pay && state.player.cash.dirty >= cost) {
    state.player.cash.dirty -= cost;
    state.player.crew.upkeepPaid = true;
    state.player.crew.loyalty = clamp(state.player.crew.loyalty + 2, 0, 100);
  } else {
    state.player.crew.upkeepPaid = false;
    state.player.crew.loyalty = clamp(state.player.crew.loyalty - 6, 0, 100);
    state.eventLog.push(logEntry(state, `Crew upkeep (${fmtMoney(cost)}) went unpaid. Loyalty slips.`, 'crew'));
  }
}

/* ---------------- Crew Delegation & Imprisonment ---------------- */

const CREW_FIRST_NAMES = ['Tony', 'Vinny', 'Sal', 'Joey', 'Frankie', 'Marco', 'Lou', 'Nico', 'Gino', 'Rocco', 'Dom', 'Carmine', 'Sonny', 'Paulie', 'Mikey'];

const CREW_LAWYER_COST = 8000;

// Once the player runs their own gang, street crimes/heists get handed off to a
// crew member instead of done personally. Returns the delegate's name, or null
// if the player has to do the job themselves.
function delegateCrewMember(state) {
  if (state.player.affiliation.type !== 'founder') return null;
  if (state.player.crew.size <= 0) return null;
  return CREW_FIRST_NAMES[Math.floor(Math.random() * CREW_FIRST_NAMES.length)];
}

// A delegated job gone wrong lands a crew member in prison instead of injuring the player.
function imprisonCrewMember(state) {
  state.player.crew.size = Math.max(0, state.player.crew.size - 1);
  state.player.crew.imprisoned = (state.player.crew.imprisoned || 0) + 1;
  recalcEquippedWeaponTier(state);
}

function hireCrewLawyer(state) {
  if ((state.player.crew.imprisoned || 0) <= 0) return { ok: false, reason: 'No crew members are currently locked up.' };
  const cost = CREW_LAWYER_COST;
  if (state.player.cash.clean + state.player.cash.dirty < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)} to post bail and cover lawyer fees.` };
  let remaining = cost;
  const fromClean = Math.min(state.player.cash.clean, remaining);
  state.player.cash.clean -= fromClean;
  remaining -= fromClean;
  state.player.cash.dirty -= remaining;
  state.player.crew.imprisoned -= 1;
  state.player.crew.size += 1;
  recalcEquippedWeaponTier(state);
  state.eventLog.push(logEntry(state, `Your lawyer springs a crew member loose for ${fmtMoney(cost)}.`, 'crew'));
  return { ok: true };
}

function silenceCrewMember(state) {
  if ((state.player.crew.imprisoned || 0) <= 0) return { ok: false, reason: 'No crew members are currently locked up.' };
  state.player.crew.imprisoned -= 1;
  state.player.crew.loyalty = clamp(state.player.crew.loyalty - 8, 0, 100);
  state.eventLog.push(logEntry(state, `You make sure a locked-up crew member never talks. The rest of the crew is rattled (Loyalty -8).`, 'crew'));
  return { ok: true };
}

/* ---------------- Loyalty & Betrayal ---------------- */

function loyaltyTurnTick(state) {
  const loyalty = state.player.crew.loyalty;
  const dangerScore = (state.player.heat.pd + state.player.heat.feds + state.player.heat.gangs) / 3
    + (100 - state.player.reputation.gang) / 4;
  // Periodic loyalty check - chance scales as loyalty drops and danger rises
  const betrayalChance = clamp(((100 - loyalty) / 100) * 0.18 + dangerScore / 1000, 0, 0.3);
  if (Math.random() < betrayalChance) {
    triggerCrewBetrayal(state);
  }

  // Lieutenant loyalty drift & checks
  for (const lt of state.player.lieutenants) {
    lt.loyalty = clamp(lt.loyalty + (loyalty >= 60 ? 1 : -2) + (Math.random() < 0.5 ? 1 : -1), 0, 100);
    const ltBetrayalChance = clamp(((100 - lt.loyalty) / 100) * 0.12, 0, 0.25);
    if (Math.random() < ltBetrayalChance) {
      triggerLieutenantBetrayal(state, lt);
    }
  }
}

function triggerCrewBetrayal(state) {
  narrate(state, 'loyalty_betrayal');
  const roll = Math.random();
  if (roll < 0.34) {
    const stolen = Math.round(state.player.cash.dirty * (0.05 + Math.random() * 0.15));
    state.player.cash.dirty -= stolen;
    state.eventLog.push(logEntry(state, `A crew member skimmed ${fmtMoney(stolen)} from the take before anyone noticed.`, 'betrayal'));
  } else if (roll < 0.67) {
    addHeat(state, 'pd', 10 + Math.floor(Math.random() * 10));
    state.eventLog.push(logEntry(state, `Someone in your crew talked to the cops. PD Heat spikes.`, 'betrayal'));
  } else {
    const lost = Math.min(state.player.crew.size, 1 + Math.floor(Math.random() * 2));
    state.player.crew.size -= lost;
    const target = pickRivalGangForDefection(state);
    if (target) target.relationToPlayer = clamp(target.relationToPlayer + 5, -100, 100);
    recalcEquippedWeaponTier(state);
    state.eventLog.push(logEntry(state, `${lost} crew member(s) defected${target ? ` to the ${target.name}` : ''}, taking what they knew with them.`, 'betrayal'));
  }
  state.player.crew.loyalty = clamp(state.player.crew.loyalty - 8, 0, 100);
}

function pickRivalGangForDefection(state) {
  const candidates = Object.values(state.gangs).filter(g => !g.isPlayerGang);
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ---------------- Lieutenants ---------------- */

function canPromoteLieutenant(state) {
  return state.player.crew.loyalty >= LIEUTENANT_LOYALTY_THRESHOLD && state.player.lieutenants.length < maxLieutenants(state);
}

function promoteLieutenant(state) {
  if (!canPromoteLieutenant(state)) return { ok: false, reason: 'Need crew loyalty 65+ and an open Lieutenant slot.' };
  const lt = {
    id: 'lt_' + Math.random().toString(36).slice(2, 8),
    name: randomName(Math.random() < 0.3 ? 'female' : 'male'),
    loyalty: clamp(state.player.crew.loyalty - 5 + Math.floor(Math.random() * 15), 0, 100),
    assignment: null
  };
  state.player.lieutenants.push(lt);
  state.eventLog.push(logEntry(state, `${lt.name} has been promoted to Lieutenant.`, 'crew'));
  return { ok: true, lieutenant: lt };
}

function assignLieutenant(state, ltId, assignment) {
  const lt = state.player.lieutenants.find(l => l.id === ltId);
  if (!lt) return { ok: false, reason: 'Lieutenant not found.' };
  lt.assignment = assignment; // null | {type:'district', districtId} | {type:'smuggling', districtId}
  return { ok: true };
}

function triggerLieutenantBetrayal(state, lt) {
  narrate(state, 'loyalty_betrayal');
  const roll = Math.random();
  lt.assignment = null;
  const idx = state.player.lieutenants.findIndex(l => l.id === lt.id);
  if (roll < 0.5) {
    const stolen = Math.round((state.player.cash.dirty + state.player.cash.clean) * 0.1);
    const dirtyPortion = Math.min(state.player.cash.dirty, stolen);
    state.player.cash.dirty -= dirtyPortion;
    state.player.cash.clean -= (stolen - dirtyPortion);
    state.eventLog.push(logEntry(state, `Lieutenant ${lt.name} vanished overnight with ${fmtMoney(stolen)} from the operation.`, 'betrayal'));
  } else {
    addHeat(state, 'gangs', 10);
    const target = pickRivalGangForDefection(state);
    if (target) target.relationToPlayer = clamp(target.relationToPlayer + 10, -100, 100);
    state.eventLog.push(logEntry(state, `Lieutenant ${lt.name} defected${target ? ` to the ${target.name}` : ''}, taking inside knowledge of your operations.`, 'betrayal'));
  }
  state.player.lieutenants.splice(idx, 1);
  state.player.crew.loyalty = clamp(state.player.crew.loyalty - 10, 0, 100);
}

// Apply passive bonuses from lieutenants assigned to districts/smuggling
function applyLieutenantBonuses(state) {
  for (const lt of state.player.lieutenants) {
    if (!lt.assignment) continue;
    const effectiveness = lt.loyalty / 100;
    if (lt.assignment.type === 'district') {
      const d = state.districts[lt.assignment.districtId];
      if (d) {
        const routeTier = d.operations.route.tier;
        if (routeTier > 0 && !d.operations.route.raided) {
          const throughput = OPERATION_DEFS.route.tiers[routeTier].throughput;
          addCash(state, Math.round(throughput * 3 * effectiveness), 0);
        }
      }
    } else if (lt.assignment.type === 'smuggling') {
      const cap = getStashCapacity(state);
      const current = totalProductUnits(state);
      const room = Math.max(0, cap - current);
      const add = Math.min(Math.round(15 * effectiveness), room);
      if (add > 0) {
        state.player.inventory.product.contraband += add;
      }
    } else if (lt.assignment.type === 'security') {
      const d = state.districts[lt.assignment.districtId];
      if (d) {
        d.opProtection = clamp((d.opProtection || 0) + 1 + Math.round(2 * effectiveness), 0, 100);
      }
    } else if (lt.assignment.type === 'recruit') {
      const cap = getCrewCap(state);
      if (state.player.crew.size < cap && Math.random() < 0.3 * effectiveness) {
        state.player.crew.size += 1;
        recalcEquippedWeaponTier(state);
        state.eventLog.push(logEntry(state, `${lt.name}'s recruitment drive brought in a new crew member.`, 'crew'));
      }
    } else if (lt.assignment.type === 'enforcer') {
      state.player.crew.loyalty = clamp(state.player.crew.loyalty + Math.round(2 * effectiveness), 0, 100);
    } else if (lt.assignment.type === 'diplomat') {
      const d = state.districts[lt.assignment.districtId];
      if (d) {
        let bestGangId = null, bestControl = -1;
        for (const [gid, val] of Object.entries(d.control)) {
          if (val > bestControl) { bestControl = val; bestGangId = gid; }
        }
        const gang = bestGangId && state.gangs[bestGangId];
        if (gang && !gang.isPlayerGang) {
          gang.relationToPlayer = clamp(gang.relationToPlayer + Math.round(1 * effectiveness), -100, 100);
        }
      }
    }
  }
}
