/* ============================================================
   UNDERWORLD - Black Market Gear (consumable items)
   ============================================================ */

const BLACK_MARKET_HEAT_LABELS = { pd: 'PD', feds: 'Federal', gangs: 'Gang' };

function buyBlackMarketItem(state, itemId) {
  const item = BLACK_MARKET_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'Unknown item.' };
  if (!isUnlockedForRank(state, item.unlockRank)) return { ok: false, reason: `${item.label} unlocks at rank ${item.unlockRank}.` };
  if (state.player.cash.dirty < item.cost) return { ok: false, reason: `Requires ${fmtMoney(item.cost)} Dirty Cash.` };
  state.player.cash.dirty -= item.cost;
  const consumables = state.player.inventory.consumables;
  consumables[item.id] = (consumables[item.id] || 0) + 1;
  state.eventLog.push(logEntry(state, `Picked up a ${item.label} on the black market for ${fmtMoney(item.cost)}.`, 'inventory'));
  return { ok: true };
}

function useBlackMarketItem(state, itemId) {
  const item = BLACK_MARKET_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'Unknown item.' };
  const consumables = state.player.inventory.consumables;
  if (!consumables[item.id]) return { ok: false, reason: `You don't have a ${item.label}.` };

  switch (item.effect) {
    case 'heal':
      state.player.health = clamp(state.player.health + item.amount, 0, state.player.maxHealth);
      state.eventLog.push(logEntry(state, `You use a ${item.label}, recovering ${item.amount} Health.`, 'inventory'));
      break;
    case 'heat':
      addHeat(state, item.track, -item.amount);
      state.eventLog.push(logEntry(state, `You use a ${item.label}, easing ${BLACK_MARKET_HEAT_LABELS[item.track] || item.track} Heat by ${item.amount}.`, 'inventory'));
      break;
    case 'rep':
      addRep(state, item.track, item.amount);
      state.eventLog.push(logEntry(state, `You use a ${item.label}, raising your ${item.track} reputation by ${item.amount}.`, 'inventory'));
      break;
    case 'combat_temp':
      state.player.combatBonusTemp = (state.player.combatBonusTemp || 0) + item.amount;
      state.player.combatBonusTurns = Math.max(state.player.combatBonusTurns || 0, item.turns);
      state.eventLog.push(logEntry(state, `You use a ${item.label}, gaining +${item.amount} combat for ${item.turns} turns.`, 'inventory'));
      break;
    case 'clear_informant':
      if (state.lawEnforcement.informantOnPlayer) {
        state.lawEnforcement.informantOnPlayer = false;
        state.eventLog.push(logEntry(state, `You use a ${item.label}, cutting off a snitch before they can talk.`, 'inventory'));
      } else {
        state.eventLog.push(logEntry(state, `You use a ${item.label}, but no one was talking anyway. Better safe than sorry.`, 'inventory'));
      }
      break;
  }

  consumables[item.id]--;
  if (consumables[item.id] <= 0) delete consumables[item.id];
  return { ok: true };
}
