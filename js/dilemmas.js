/* ============================================================
   UNDERWORLD - Street Dilemmas
   Periodic branching choice events offered to every player,
   independent of Commission/Criminal World unlocks. Mirrors the
   council decision generator/resolve pattern in criminalWorld.js,
   but surfaces as a blocking modal on the Home tab.
   ============================================================ */

// Chance per turn (when no dilemma is already pending) that a new one fires.
const STREET_DILEMMA_CHANCE = 0.35;

/* ---------------- Dilemma Generators ---------------- */

function genSnitchDilemma(state) {
  if (state.player.crew.size < 1) return null;
  return {
    type: 'snitch',
    title: 'Whispers of a Rat',
    description: 'One of your crew has been seen talking a little too long with a stranger in a cheap suit. Could be nothing. Could be everything.',
    context: {},
    options: [
      { id: 'confront', label: 'Confront them in front of the crew (Crew Loyalty -5, PD Heat -4)' },
      { id: 'watch', label: 'Say nothing and watch them closely' },
      { id: 'cut_loose', label: 'Cut them loose quietly (Crew shrinks by one, PD Heat -10)' }
    ]
  };
}

function genOldFavorDilemma(state) {
  const amount = 2000 + Math.floor(Math.random() * 4000);
  return {
    type: 'old_favor',
    title: "An Old Associate's Favor",
    description: `Someone from your past needs cash to leave town before old debts catch up with them. They're asking you, of all people, for help.`,
    context: { amount },
    options: [
      { id: 'help', label: `Give them ${fmtMoney(amount)} (Street Rep +3)` },
      { id: 'refuse', label: 'Turn them away (Gang Heat +3)' }
    ]
  };
}

function genStreetKidDilemma(state) {
  const cost = 500 + Math.floor(Math.random() * 1000);
  return {
    type: 'street_kid',
    title: 'A Kid With a Tip',
    description: `A street kid corners you with a "guaranteed" tip on a rival stash house - for a price up front.`,
    context: { cost },
    options: [
      { id: 'pay', label: `Pay ${fmtMoney(cost)} for the tip (chance of a bigger payout, PD Heat +2)` },
      { id: 'turn_away', label: 'Send the kid packing' }
    ]
  };
}

function genDirtyCopDilemma(state) {
  return {
    type: 'dirty_cop',
    title: 'A Quiet Word From a Cop',
    description: `A cop you've never met buys you a coffee and offers to make a few "ongoing concerns" disappear - for a price paid in favors, not cash.`,
    context: {},
    options: [
      { id: 'accept', label: 'Take the deal (PD Heat -10, Fed Heat +2)' },
      { id: 'refuse', label: 'Walk away (Street Rep +2)' }
    ]
  };
}

function genWoundedRivalDilemma(state) {
  const candidates = Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated);
  if (!candidates.length) return null;
  const gang = candidates[Math.floor(Math.random() * candidates.length)];
  const amount = 1000 + Math.floor(Math.random() * 2000);
  return {
    type: 'wounded_rival',
    title: 'A Wounded Rival',
    description: `A bloodied member of the ${gang.name} stumbles into an alley near you, in no shape to fight. Nobody else is around.`,
    context: { gangId: gang.id, amount },
    options: [
      { id: 'help', label: `Patch them up and send them home (Street Rep +4, improves relations with the ${gang.name})` },
      { id: 'exploit', label: `Take what they're carrying (${fmtMoney(amount)}, Gang Heat +5, ${gang.name} relations -5)` },
      { id: 'ignore', label: 'Keep walking' }
    ]
  };
}

function genFoundCashDilemma(state) {
  const amount = 1000 + Math.floor(Math.random() * 3000);
  return {
    type: 'found_cash',
    title: 'An Unmarked Bag',
    description: `One of your crew turns up an unmarked bag of cash from a job that wasn't supposed to have any. Word hasn't spread yet.`,
    context: { amount },
    options: [
      { id: 'split_crew', label: `Split it with the crew (+${fmtMoney(Math.round(amount * 0.5))}, Crew Loyalty +5)` },
      { id: 'keep_all', label: `Keep it all (+${fmtMoney(amount)}, Crew Loyalty -3)` }
    ]
  };
}

function genCharityRequestDilemma(state) {
  const cost = 500 + Math.floor(Math.random() * 1500);
  return {
    type: 'charity_request',
    title: 'A Family in Trouble',
    description: `A local family is about to lose their storefront to back rent. They've heard you're someone who can make problems disappear - for the right reasons, for once.`,
    context: { cost },
    options: [
      { id: 'give', label: `Cover their debt with ${fmtMoney(cost)} clean cash (Street Rep +5)` },
      { id: 'refuse', label: "It's not your problem" }
    ]
  };
}

function genWeaponsDealDilemma(state) {
  const amount = 5 + Math.floor(Math.random() * 15);
  const cost = amount * 60;
  return {
    type: 'weapons_deal',
    title: 'A Discount on Hardware',
    description: `A contact offers a crate of arms at a steep discount - "no questions" pricing that usually means something fell off a truck.`,
    context: { amount, cost },
    options: [
      { id: 'buy', label: `Buy the crate: +${amount} Arms for ${fmtMoney(cost)} (PD Heat +2)` },
      { id: 'pass', label: 'Pass on it' }
    ]
  };
}

const STREET_DILEMMA_GENERATORS = {
  snitch: genSnitchDilemma,
  old_favor: genOldFavorDilemma,
  street_kid: genStreetKidDilemma,
  dirty_cop: genDirtyCopDilemma,
  wounded_rival: genWoundedRivalDilemma,
  found_cash: genFoundCashDilemma,
  charity_request: genCharityRequestDilemma,
  weapons_deal: genWeaponsDealDilemma
};

function generateStreetDilemma(state) {
  const candidates = [];
  for (const fn of Object.values(STREET_DILEMMA_GENERATORS)) {
    const dilemma = fn(state);
    if (dilemma) candidates.push(dilemma);
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ---------------- Turn Tick ---------------- */

function streetDilemmaTick(state) {
  if (state.player.pendingDilemma) return;
  if (Math.random() > STREET_DILEMMA_CHANCE) return;
  const dilemma = generateStreetDilemma(state);
  if (dilemma) {
    state.player.pendingDilemma = dilemma;
    state.eventLog.push(logEntry(state, `Something needs your attention: ${dilemma.title}`, 'dilemma'));
  }
}

/* ---------------- Resolution ---------------- */

function resolveStreetDilemma(state, optionId) {
  const dilemma = state.player.pendingDilemma;
  if (!dilemma) return { ok: false, reason: 'Nothing requires your attention right now.' };
  const option = dilemma.options.find(o => o.id === optionId);
  if (!option) return { ok: false, reason: 'Unknown option.' };

  applyDilemmaOption(state, dilemma, optionId);
  state.player.pendingDilemma = null;
  return { ok: true };
}

function applyDilemmaOption(state, dilemma, optionId) {
  const p = state.player;
  let text = null;

  switch (dilemma.type) {
    case 'snitch':
      if (optionId === 'confront') {
        p.crew.loyalty = clamp(p.crew.loyalty - 5, 0, 100);
        addHeat(state, 'pd', -4);
        text = 'You confront the suspected rat in front of everyone. The crew goes quiet, but the message lands - and word never reaches the PD.';
      } else if (optionId === 'cut_loose') {
        p.crew.size = Math.max(1, p.crew.size - 1);
        addHeat(state, 'pd', -10);
        text = 'You quietly cut the suspect loose before they can do any damage. The crew is smaller, but cleaner.';
      } else {
        text = 'You say nothing and keep a closer eye on them. For now, business continues as usual.';
      }
      break;

    case 'old_favor': {
      const amount = dilemma.context.amount;
      if (optionId === 'help') {
        if (p.cash.dirty >= amount) {
          p.cash.dirty -= amount;
          addRep(state, 'street', 3);
          text = `You front ${fmtMoney(amount)} to help an old associate disappear. Word of your generosity travels the right circles.`;
        } else {
          text = `You want to help, but you can't spare ${fmtMoney(amount)} right now. They'll have to find another way out.`;
        }
      } else {
        addHeat(state, 'gangs', 3);
        text = 'You turn them away. They leave bitter, and word of your refusal makes the rounds.';
      }
      break;
    }

    case 'street_kid': {
      const cost = dilemma.context.cost;
      if (optionId === 'pay') {
        if (p.cash.dirty >= cost) {
          p.cash.dirty -= cost;
          addHeat(state, 'pd', 2);
          if (Math.random() < 0.6) {
            const gain = cost + Math.floor(Math.random() * cost * 2);
            addCash(state, gain, 0);
            text = `The tip was good. You pay ${fmtMoney(cost)} and walk away with ${fmtMoney(gain)} from the stash the kid pointed out.`;
          } else {
            text = `You pay ${fmtMoney(cost)} for the tip. The stash is long gone by the time you check - but the kid's gone too, so at least no one's the wiser.`;
          }
        } else {
          text = `You can't spare ${fmtMoney(cost)} for a kid's "guaranteed" tip, no matter how convincing.`;
        }
      } else {
        text = 'You wave the kid off. Probably for the best.';
      }
      break;
    }

    case 'dirty_cop':
      if (optionId === 'accept') {
        addHeat(state, 'pd', -10);
        addHeat(state, 'feds', 2);
        text = "You take the deal. A few local problems quietly vanish - but favors like this have a way of getting noticed higher up.";
      } else {
        addRep(state, 'street', 2);
        text = 'You walk away from the offer. On the street, that kind of restraint doesn\'t go unnoticed.';
      }
      break;

    case 'wounded_rival': {
      const gang = state.gangs[dilemma.context.gangId];
      const amount = dilemma.context.amount;
      if (optionId === 'help') {
        addRep(state, 'street', 4);
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer + 5, -100, 100);
        text = gang
          ? `You patch up the wounded ${gang.name} member and send them home. The ${gang.name} won't forget the gesture.`
          : 'You patch up the wounded stranger and send them home.';
      } else if (optionId === 'exploit') {
        addCash(state, amount, 0);
        addHeat(state, 'gangs', 5);
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 5, -100, 100);
        text = gang
          ? `You strip ${fmtMoney(amount)} off the wounded ${gang.name} member before leaving them. The ${gang.name} will hear about this.`
          : `You take ${fmtMoney(amount)} off the wounded stranger before leaving.`;
      } else {
        text = 'You keep walking. Not your problem, not your war.';
      }
      break;
    }

    case 'found_cash': {
      const amount = dilemma.context.amount;
      if (optionId === 'split_crew') {
        const share = Math.round(amount * 0.5);
        addCash(state, share, 0);
        p.crew.loyalty = clamp(p.crew.loyalty + 5, 0, 100);
        text = `You split the bag with the crew. Everyone walks away a little richer and a little more loyal - your cut comes to ${fmtMoney(share)}.`;
      } else {
        addCash(state, amount, 0);
        p.crew.loyalty = clamp(p.crew.loyalty - 3, 0, 100);
        text = `You pocket the full ${fmtMoney(amount)} without telling anyone. Word has a way of getting around eventually.`;
      }
      break;
    }

    case 'charity_request': {
      const cost = dilemma.context.cost;
      if (optionId === 'give') {
        if (p.cash.clean >= cost) {
          p.cash.clean -= cost;
          addRep(state, 'street', 5);
          text = `You quietly cover ${fmtMoney(cost)} of their debt. No cameras, no headlines - but the neighborhood remembers who helped.`;
        } else {
          text = `You'd help if you could, but you don't have ${fmtMoney(cost)} in clean cash to spare right now.`;
        }
      } else {
        text = "You tell them it's not your problem. The storefront closes within the week.";
      }
      break;
    }

    case 'weapons_deal': {
      const amount = dilemma.context.amount;
      const cost = dilemma.context.cost;
      if (optionId === 'buy') {
        if (p.cash.dirty >= cost) {
          p.cash.dirty -= cost;
          p.inventory.product.arms += amount;
          addHeat(state, 'pd', 2);
          text = `You buy the crate: ${fmtMoney(cost)} for ${amount} Arms, no questions asked.`;
        } else {
          text = `You can't cover the ${fmtMoney(cost)} asking price, so the crate goes to someone else.`;
        }
      } else {
        text = 'You pass on the deal. Probably stolen anyway.';
      }
      break;
    }
  }

  if (text) {
    state.eventLog.push(logEntry(state, text, 'dilemma'));
    queueNarration(state, 'dilemma', text);
  }
}
