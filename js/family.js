/* ============================================================
   UNDERWORLD - Family Council
   ============================================================ */

const FAMILY_RELATIONS = ['Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Cousin', 'Father', 'Mother', 'Uncle', 'Aunt'];
const FAMILY_TRAITS = ['Ambitious', 'Loyal', 'Reckless', 'Devout', 'Greedy', 'Cautious', 'Charming', 'Vengeful'];
const FAMILY_ROLES = {
  advisor: { id: 'advisor', label: 'Advisor', desc: 'Better deal prices on product sales and purchases (+10%).' },
  enforcer: { id: 'enforcer', label: 'Enforcer', desc: 'Combat bonus in scuffles and gang wars (+5 to rolls).' },
  businessface: { id: 'businessface', label: 'Business Face', desc: 'Shell companies launder faster and fronts earn more (+15%).' }
};

const FEMALE_RELATIONS = new Set(['Spouse', 'Sister', 'Daughter', 'Mother', 'Aunt']);
const MALE_RELATIONS = new Set(['Spouse', 'Brother', 'Son', 'Father', 'Uncle']);

function initFamily(state) {
  const count = 3 + (Math.random() < 0.5 ? 1 : 0); // 3-4
  const relations = [...FAMILY_RELATIONS].sort(() => Math.random() - 0.5).slice(0, count);
  state.family = relations.map((relation, i) => {
    const couldBeFemale = FEMALE_RELATIONS.has(relation);
    const couldBeMale = MALE_RELATIONS.has(relation);
    let gender = 'male';
    if (couldBeFemale && couldBeMale) gender = Math.random() < 0.5 ? 'female' : 'male';
    else if (couldBeFemale) gender = 'female';
    return {
      id: 'fam' + i,
      name: randomName(gender),
      relation,
      loyalty: 40 + Math.floor(Math.random() * 40),
      role: null,
      alive: true,
      traits: [FAMILY_TRAITS[Math.floor(Math.random() * FAMILY_TRAITS.length)]],
      captured: false,
      ransom: 0
    };
  });
}

function familyMembersAlive(state) {
  return state.family.filter(f => f.alive);
}

function assignFamilyRole(state, memberId, role) {
  for (const m of state.family) {
    if (m.role === role) m.role = null;
  }
  const member = state.family.find(f => f.id === memberId);
  if (member) {
    member.role = role;
    state.eventLog.push(logEntry(state, `${member.name} (${member.relation}) now serves as ${FAMILY_ROLES[role] ? FAMILY_ROLES[role].label : role}.`, 'family'));
  }
}

function getFamilyMemberWithRole(state, role) {
  return state.family.find(f => f.alive && f.role === role) || null;
}

function familyDiscountMultiplier(state) {
  return getFamilyMemberWithRole(state, 'advisor') ? 0.90 : 1.0;
}

function familyCombatBonus(state) {
  return getFamilyMemberWithRole(state, 'enforcer') ? 5 : 0;
}

function familyBusinessMultiplier(state) {
  return getFamilyMemberWithRole(state, 'businessface') ? 1.15 : 1.0;
}

/* ---------------- Turn Tick & Random Events ---------------- */

function familyTurnTick(state) {
  const alive = familyMembersAlive(state);
  if (!alive.length) return;

  // Resolve ransom deadlines
  for (const m of alive) {
    if (m.captured) {
      m.ransomDeadline--;
      if (m.ransomDeadline <= 0) {
        m.captured = false;
        triggerFamilyDeath(state, m.id, 'kidnapping gone wrong');
      }
    }
  }

  // Small chance of a personal-arc story event
  if (Math.random() < 0.12) {
    const member = alive[Math.floor(Math.random() * alive.length)];
    const evt = pickFamilyStoryEvent(state, member);
    if (evt) applyEventOutcome(state, evt, { familyMember: member });
  }

  // Vulnerability events scale with reputation/heat
  const dangerScore = (state.player.heat.pd + state.player.heat.feds + state.player.heat.gangs) / 3
    + (state.player.reputation.street + state.player.reputation.gang) / 4;
  const riskChance = clamp(dangerScore / 400, 0, 0.12);

  if (Math.random() < riskChance) {
    const candidates = alive.filter(m => !m.captured);
    if (candidates.length) {
      const member = candidates[Math.floor(Math.random() * candidates.length)];
      const roll = Math.random();
      if (roll < 0.4) {
        triggerFamilyKidnap(state, member.id);
      } else if (roll < 0.65) {
        triggerFamilyBetrayalCheck(state, member.id);
      }
    }
  }
}

function triggerFamilyKidnap(state, memberId) {
  const m = state.family.find(f => f.id === memberId);
  if (!m || m.captured) return;
  m.captured = true;
  m.ransom = Math.round((2000 + Math.random() * 8000) * (1 + state.player.reputation.gang / 100));
  m.ransomDeadline = 3;
  state.eventLog.push(logEntry(state, `RIVALS HAVE TAKEN ${m.name.toUpperCase()} (your ${m.relation}). They demand ${fmtMoney(m.ransom)} within 3 turns, or you'll never see them again.`, 'family'));
}

function payRansom(state, memberId) {
  const m = state.family.find(f => f.id === memberId);
  if (!m || !m.captured) return false;
  if (state.player.cash.dirty + state.player.cash.clean < m.ransom) return false;
  // pay dirty first
  let remaining = m.ransom;
  const dirtyUsed = Math.min(state.player.cash.dirty, remaining);
  state.player.cash.dirty -= dirtyUsed;
  remaining -= dirtyUsed;
  state.player.cash.clean -= remaining;
  m.captured = false;
  m.loyalty = clamp(m.loyalty + 15, 0, 100);
  state.eventLog.push(logEntry(state, `You paid ${fmtMoney(m.ransom)} and ${m.name} comes home, shaken but alive.`, 'family'));
  return true;
}

function attemptRescue(state, memberId) {
  const m = state.family.find(f => f.id === memberId);
  if (!m || !m.captured) return null;
  const combatPower = state.player.crew.size * state.player.crew.quality + WEAPON_TIERS[state.player.crew.weaponTier].combatBonus + familyCombatBonus(state);
  const roll = Math.random() * 100 + combatPower;
  if (roll > 70) {
    m.captured = false;
    m.loyalty = clamp(m.loyalty + 20, 0, 100);
    state.player.reputation.street = clamp(state.player.reputation.street + 5, 0, 100);
    state.eventLog.push(logEntry(state, `Your crew stormed the safehouse and brought ${m.name} home. Word of this won't be forgotten.`, 'family'));
    return true;
  } else {
    state.player.health = clamp(state.player.health - (10 + Math.floor(Math.random() * 15)), 0, state.player.maxHealth);
    state.eventLog.push(logEntry(state, `The rescue attempt for ${m.name} went sideways. Your crew took losses and came back empty-handed.`, 'family'));
    return false;
  }
}

function triggerFamilyBetrayalCheck(state, memberId) {
  const m = state.family.find(f => f.id === memberId);
  if (!m) return;
  const threatened = state.player.rank === 'Underboss' || state.player.rank === 'Boss';
  const betrayalChance = (100 - m.loyalty) / 100 * (threatened ? 1.6 : 1.0) * 0.5;
  if (Math.random() < betrayalChance) {
    triggerFamilyBetrayal(state, memberId);
  } else {
    state.eventLog.push(logEntry(state, `${m.name} has been distant lately. Something is brewing beneath the surface.`, 'family'));
    m.loyalty = clamp(m.loyalty - 5, 0, 100);
  }
}

function triggerFamilyBetrayal(state, memberId) {
  const m = state.family.find(f => f.id === memberId);
  if (!m) return;
  m.role = null;
  m.loyalty = clamp(m.loyalty - 30, 0, 100);
  const severity = Math.random();
  if (severity < 0.4) {
    addHeat(state, 'pd', 12);
    state.eventLog.push(logEntry(state, `${m.name} tipped off the police about one of your operations. PD Heat rises sharply.`, 'family'));
  } else if (severity < 0.75) {
    const taken = Math.round(state.player.cash.dirty * 0.2);
    state.player.cash.dirty -= taken;
    state.eventLog.push(logEntry(state, `${m.name} cleaned out ${fmtMoney(taken)} from a stash before disappearing into the night.`, 'family'));
  } else {
    state.player.crew.loyalty = clamp(state.player.crew.loyalty - 15, 0, 100);
    m.alive = false;
    state.eventLog.push(logEntry(state, `${m.name} has cut ties with the family for good, taking their secrets - and your crew's trust - with them.`, 'family'));
  }
}

function triggerFamilyDeath(state, memberId, cause) {
  const m = state.family.find(f => f.id === memberId);
  if (!m || !m.alive) return;
  m.alive = false;
  m.role = null;
  state.player.crew.loyalty = clamp(state.player.crew.loyalty - 10, 0, 100);
  state.player.combatBonusTemp = (state.player.combatBonusTemp || 0) + 8; // revenge-fueled aggression
  state.player.combatBonusTurns = 5;
  state.eventLog.push(logEntry(state, `${m.name} (your ${m.relation}) is dead - ${cause}. The family reels, and the streets will pay for it.`, 'family_death'));
}

function pickFamilyStoryEvent(state, member) {
  const pool = EVENT_POOL.filter(e => e.category === 'family');
  if (!pool.length) return null;
  const evt = pool[Math.floor(Math.random() * pool.length)];
  return evt;
}
