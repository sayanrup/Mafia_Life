/* ============================================================
   UNDERWORLD - Combat System (Scuffles, Injuries, Gang Wars)
   ============================================================ */

/* ---------------- Combat Power & Injuries ---------------- */

function getPlayerCombatPower(state) {
  const base = state.player.crew.size * state.player.crew.quality;
  const weapon = weaponCombatBonus(state);
  const family = familyCombatBonus(state);
  const temp = state.player.combatBonusTemp || 0;
  const healthFactor = Math.round(state.player.health / 10);
  return base + weapon + family + temp + healthFactor - getInjuryPenalty(state);
}

function getInjuryPenalty(state) {
  return state.player.injuries.reduce((sum, inj) => sum + (inj.combatPenalty || 0), 0);
}

function tickInjuries(state) {
  for (const inj of state.player.injuries) {
    if (inj.turnsRemaining > 0) inj.turnsRemaining--;
  }
  state.player.injuries = state.player.injuries.filter(inj => inj.type !== 'recovery' || inj.turnsRemaining > 0);

  if (state.player.combatBonusTurns > 0) {
    state.player.combatBonusTurns--;
    if (state.player.combatBonusTurns <= 0) state.player.combatBonusTemp = 0;
  }
}

function applyInjury(state, severity) {
  // severity: 'minor' | 'major' | 'severe'
  if (severity === 'minor') {
    state.player.health = clamp(state.player.health - (5 + Math.floor(Math.random() * 10)), 0, state.player.maxHealth);
    return;
  }
  const dmg = severity === 'severe' ? 25 + Math.floor(Math.random() * 25) : 12 + Math.floor(Math.random() * 13);
  state.player.health = clamp(state.player.health - dmg, 0, state.player.maxHealth);

  if (severity === 'severe' && Math.random() < 0.45) {
    const reduction = 5 + Math.floor(Math.random() * 11);
    state.player.maxHealth = Math.max(40, state.player.maxHealth - reduction);
    state.player.health = clamp(state.player.health, 0, state.player.maxHealth);
    state.player.injuries.push({
      id: 'inj_' + Math.random().toString(36).slice(2, 8),
      label: `Lasting wound (-${reduction} Max Health)`,
      type: 'permanent',
      combatPenalty: 0,
      maxHealthPenalty: reduction,
      turnsRemaining: -1
    });
    state.eventLog.push(logEntry(state, `The wound never fully healed. Max Health permanently reduced by ${reduction}.`, 'injury'));
  } else {
    const turns = 2 + Math.floor(Math.random() * 4);
    const penalty = severity === 'severe' ? 6 : 3;
    state.player.injuries.push({
      id: 'inj_' + Math.random().toString(36).slice(2, 8),
      label: `Recovering (-${penalty} combat for ${turns} turns)`,
      type: 'recovery',
      combatPenalty: penalty,
      maxHealthPenalty: 0,
      turnsRemaining: turns
    });
    state.eventLog.push(logEntry(state, `You're banged up - operating at reduced capacity for ${turns} turns.`, 'injury'));
  }
}

function hospitalCost(state) {
  const missing = state.player.maxHealth - state.player.health;
  const recoveryInjuries = state.player.injuries.filter(i => i.type === 'recovery').length;
  return Math.round(missing * 40 + recoveryInjuries * 300);
}

function visitHospital(state) {
  const cost = hospitalCost(state);
  if (cost === 0) return { ok: false, reason: 'Already at full health.' };
  const total = state.player.cash.dirty + state.player.cash.clean;
  if (total < cost) return { ok: false, reason: `Requires ${fmtMoney(cost)}.` };
  let remaining = cost;
  const dirtyUsed = Math.min(state.player.cash.dirty, remaining);
  state.player.cash.dirty -= dirtyUsed;
  remaining -= dirtyUsed;
  state.player.cash.clean -= remaining;
  state.player.health = state.player.maxHealth;
  state.player.injuries = state.player.injuries.filter(i => i.type !== 'recovery');
  state.eventLog.push(logEntry(state, `Patched up at a private clinic for ${fmtMoney(cost)}. Back to full strength.`, 'health'));
  return { ok: true };
}

/* ---------------- Minor Scuffles ---------------- */

function resolveScuffle(state, difficulty) {
  const power = getPlayerCombatPower(state);
  const roll = Math.random() * 100 + power;
  const oppRoll = Math.random() * 100 + difficulty;
  const diff = roll - oppRoll;
  let result;
  if (diff > 15) result = 'success';
  else if (diff > -25) result = 'partial';
  else result = 'fail';
  return { result, diff, roll, oppRoll };
}

/* ---------------- Major Gang War ---------------- */

function estimateEnemyStrength(state, districtId, enemyGangId) {
  const district = state.districts[districtId];
  const control = district.control[enemyGangId] || 0;
  let strength = Math.round(control * 0.6 + 10);
  if (isGangWeakened(state, enemyGangId)) strength = Math.round(strength * 0.7);
  return strength;
}

function startGangWar(state, districtId, enemyGangId) {
  const enemyStrength = estimateEnemyStrength(state, districtId, enemyGangId);
  const war = {
    districtId,
    enemyGangId,
    round: 1,
    playerHP: 100,
    enemyHP: 100,
    enemyStrength,
    specialUsed: false,
    log: [`The streets of ${state.districts[districtId].name} go quiet. Your crew squares off against the ${state.gangs[enemyGangId].name}.`]
  };
  return war;
}

function gangWarRound(state, war, playerAction) {
  const power = getPlayerCombatPower(state);
  let playerDamage = 0;
  let enemyDamage = 0;
  let note = '';

  // Player action
  switch (playerAction) {
    case 'attack':
      playerDamage = Math.max(2, Math.round((power - war.enemyStrength * 0.4) / 2 + 8 + (Math.random() * 14 - 7)));
      break;
    case 'defend':
      playerDamage = Math.max(1, Math.round(power / 6 + Math.random() * 4));
      break;
    case 'item': {
      const armsAvailable = state.player.inventory.product.arms;
      if (armsAvailable >= 5) {
        state.player.inventory.product.arms -= 5;
        playerDamage = Math.max(3, Math.round(power / 4 + 12 + Math.random() * 10));
        note = ' Your crew burns through a crate of arms for a heavy push.';
      } else {
        playerDamage = Math.max(1, Math.round(power / 8));
        note = ' No usable arms in inventory - the move falls flat.';
      }
      break;
    }
    case 'special':
      if (!war.specialUsed) {
        war.specialUsed = true;
        playerDamage = Math.max(5, Math.round(power / 2 + 15 + Math.random() * 15));
        note = ' Your crew pulls off a coordinated special maneuver!';
      } else {
        playerDamage = Math.max(2, Math.round(power / 5 + Math.random() * 6));
        note = ' (Special already used this war - basic attack instead.)';
      }
      break;
    case 'flee':
      return { fled: true };
  }

  // Enemy action - based on boss personality
  const enemyGang = state.gangs[war.enemyGangId];
  const personality = enemyGang.boss.personality;
  let enemyAction = 'attack';
  if (personality === 'Diplomatic') enemyAction = war.enemyHP < 35 ? 'attack' : (Math.random() < 0.4 ? 'defend' : 'attack');
  if (personality === 'Opportunistic') enemyAction = war.playerHP < 40 ? 'attack' : (Math.random() < 0.5 ? 'attack' : 'defend');
  if (personality === 'Aggressive') enemyAction = Math.random() < 0.8 ? 'attack' : 'defend';

  if (enemyAction === 'attack') {
    enemyDamage = Math.max(2, Math.round((war.enemyStrength - power * 0.4) / 2 + 8 + (Math.random() * 14 - 7)));
  } else {
    enemyDamage = Math.max(1, Math.round(war.enemyStrength / 6 + Math.random() * 4));
  }

  if (playerAction === 'defend') {
    enemyDamage = Math.round(enemyDamage * 0.5);
  }

  war.enemyHP = Math.max(0, war.enemyHP - playerDamage);
  war.playerHP = Math.max(0, war.playerHP - enemyDamage);
  war.round++;

  const roundLog = `Round: your crew deals ${playerDamage}, the ${enemyGang.name} answers with ${enemyDamage}.${note}`;
  war.log.push(roundLog);

  if (war.enemyHP <= 0) return { outcome: 'win' };
  if (war.playerHP <= 0) return { outcome: 'loss' };
  if (war.round > 8) return { outcome: war.playerHP >= war.enemyHP ? 'win' : 'loss' };
  return { ongoing: true };
}

function resolveGangWarOutcome(state, war, outcome) {
  const district = state.districts[war.districtId];
  const enemyGang = state.gangs[war.enemyGangId];
  const myGangId = playerGangId(state);

  if (outcome === 'win') {
    const shift = 8 + Math.floor(Math.random() * 12);
    let taken = 0;
    if (myGangId) {
      taken = shiftControl(state, district.id, war.enemyGangId, myGangId, shift);
      if (taken > 0 && !state.gangs[myGangId].territory.includes(district.id)) state.gangs[myGangId].territory.push(district.id);
    } else {
      // Solo: weaken enemy in favor of the other local gang, but gain cash/rep
      const otherGangId = Object.keys(district.control).find(g => g !== war.enemyGangId);
      if (otherGangId) taken = shiftControl(state, district.id, war.enemyGangId, otherGangId, shift);
      addCash(state, 1500 + Math.floor(Math.random() * 1500), 0);
    }
    addRep(state, 'street', 6);
    addRep(state, 'gang', 4);
    enemyGang.relationToPlayer = clamp(enemyGang.relationToPlayer - 15, -100, 100);
    state.eventLog.push(logEntry(state, `Victory in ${district.name}! The ${enemyGang.name} retreats, ceding ${taken}% control.`, 'combat'));
  } else if (outcome === 'loss') {
    const shift = 5 + Math.floor(Math.random() * 10);
    let lost = 0;
    if (myGangId && district.control[myGangId]) {
      lost = shiftControl(state, district.id, myGangId, war.enemyGangId, shift);
    }
    applyInjury(state, Math.random() < 0.5 ? 'severe' : 'major');
    degradeArmory(state, 0.2 + Math.random() * 0.2);
    if (Math.random() < 0.1) {
      const alive = familyMembersAlive(state);
      if (alive.length) triggerFamilyDeath(state, alive[Math.floor(Math.random() * alive.length)].id, 'caught in the crossfire of a gang war');
    }
    state.eventLog.push(logEntry(state, `Defeat in ${district.name}. The ${enemyGang.name} presses their advantage${lost ? `, taking ${lost}% of your territory` : ''}.`, 'combat'));
  } else if (outcome === 'fled') {
    addHeat(state, 'gangs', 5);
    if (myGangId && district.control[myGangId]) {
      shiftControl(state, district.id, myGangId, war.enemyGangId, Math.min(3, district.control[myGangId]));
    }
    state.eventLog.push(logEntry(state, `Your crew pulled back from ${district.name} before things got worse. A minor loss of face.`, 'combat'));
  }
}
