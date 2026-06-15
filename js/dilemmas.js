/* ============================================================
   UNDERWORLD - Street Dilemmas
   Periodic branching choice events offered to every player,
   independent of Commission/Criminal World unlocks. Mirrors the
   council decision generator/resolve pattern in criminalWorld.js,
   but surfaces as a blocking modal on the Home tab.
   ============================================================ */

// Chance per turn (when no dilemma is already pending) that a new one fires.
// Set to 1.0 so every turn brings at least one AI-narrated situation.
const STREET_DILEMMA_CHANCE = 1.0;

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

function genLieutenantKidnapDilemma(state) {
  if (!state.player.lieutenants.length) return null;
  const lt = state.player.lieutenants[Math.floor(Math.random() * state.player.lieutenants.length)];
  return {
    type: 'lieutenant_kidnap',
    title: `${lt.name}'s Family Taken`,
    description: `${lt.name} corners you, shaken - someone snatched their family off the street last night and is holding them as leverage against you both. ${lt.name} wants to know what you're going to do about it.`,
    context: { ltId: lt.id, ltName: lt.name },
    options: [
      { id: 'rescue', label: `Hit the safehouse and pull them out (risk to your crew, big loyalty boost from ${lt.name} if it works)` },
      { id: 'demote', label: `Tell ${lt.name} it's not the family's problem and strip the rank (${lt.name} demoted, Crew Loyalty -10)` },
      { id: 'side_kidnappers', label: `Quietly let the kidnappers keep them and walk away (Gang Heat +10, ${lt.name} leaves for good)` }
    ]
  };
}

function genGangInformantDilemma(state) {
  const candidates = Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated);
  if (!candidates.length) return null;
  const gang = candidates[Math.floor(Math.random() * candidates.length)];
  const cost = 1000 + Math.floor(Math.random() * 2000);
  const payout = cost + 1500 + Math.floor(Math.random() * 3000);
  return {
    type: 'gang_informant',
    title: 'A Defector Knocks',
    description: `A nervous ${gang.name} runner slides into the booth across from you. He knows where they keep a stash, he says, and he wants out of the family before anyone notices he's gone.`,
    context: { gangId: gang.id, gangName: gang.name, cost, payout },
    options: [
      { id: 'pay', label: `Pay him ${fmtMoney(cost)} for the tip (chance at ${fmtMoney(payout)}, ${gang.name} relations -10)` },
      { id: 'recruit', label: `Take him into your crew instead (Crew +1, ${gang.name} relations -15, Gang Heat +5)` },
      { id: 'turn_away', label: `Send him back before this gets you both killed` }
    ]
  };
}

function genFedSubpoenaDilemma(state) {
  return {
    type: 'fed_subpoena',
    title: 'A Subpoena With Your Name On It',
    description: `A federal agent is waiting by your car with a folder under his arm. A grand jury has gotten "curious" about your finances - and he's offering to lose the paperwork, for a price.`,
    context: {},
    options: [
      { id: 'bribe', label: `Slip him ${fmtMoney(5000)} dirty cash to lose the file (Fed Heat -15)` },
      { id: 'lawyer', label: `Call your lawyer and stonewall (${fmtMoney(2000)} clean cash, Fed Heat -5)` },
      { id: 'ignore', label: `Ignore it and hope it blows over (Fed Heat +10)` }
    ]
  };
}

function genCrewDebtDilemma(state) {
  if (state.player.crew.size < 2) return null;
  const debt = 1500 + Math.floor(Math.random() * 2500);
  return {
    type: 'crew_debt',
    title: 'A Marker Comes Due',
    description: `One of your crew ran up a debt at a card game backed by people who don't offer payment plans. They're leaning on him hard, and it's starting to spook the rest of the crew.`,
    context: { debt },
    options: [
      { id: 'cover', label: `Cover his marker (${fmtMoney(debt)} dirty cash, Crew Loyalty +8)` },
      { id: 'leverage', label: `Pay it off and remind him who he answers to now (${fmtMoney(debt)} dirty cash, Crew Loyalty +3, Street Rep +2)` },
      { id: 'let_handle', label: `Let him handle it himself (Crew Loyalty -5, risk of losing him)` }
    ]
  };
}

function genReporterDilemma(state) {
  return {
    type: 'reporter',
    title: 'A Nosy Reporter',
    description: `A local reporter has been asking pointed questions about "unusual cash flow" tied to your name. Nothing's printed yet, but she's persistent and getting closer.`,
    context: {},
    options: [
      { id: 'feed_story', label: `Feed her a juicier story to chase instead (${fmtMoney(1500)} dirty cash, PD Heat -5)` },
      { id: 'threaten', label: `Make it clear she should drop it (Street Rep -3, PD Heat -3, Fed Heat +5)` },
      { id: 'ignore', label: `Ignore her - she probably has nothing concrete` }
    ]
  };
}

function genBusinessShakedownDilemma(state) {
  const district = state.districts[state.player.currentDistrict];
  const existing = state.player.extortionRackets.find(r => r.districtId === district.id);
  return {
    type: 'business_shakedown',
    title: 'A Shop Owner Asks for Help',
    description: `A shop owner in ${district.name} corners you after hours. A rival crew has been "taxing" her register every week, and she's heard you're someone who settles things like that.`,
    context: { districtId: district.id },
    options: [
      existing
        ? { id: 'take_over', label: `Tell the rival crew this storefront is yours now (your extortion racket in ${district.name} grows, Gang Heat +5)` }
        : { id: 'take_over', label: `Take over the "tax" yourself (start an extortion racket in ${district.name}, Gang Heat +5)` },
      { id: 'help_free', label: `Run the rival crew off for free (Street Rep +5, Gang Heat +3)` },
      { id: 'refuse', label: `Tell her it's not your fight` }
    ]
  };
}

function genProductQualityDilemma(state) {
  const products = ['weed', 'pills', 'powder'].filter(k => (state.player.inventory.product[k] || 0) > 0);
  if (!products.length) return null;
  const product = products[Math.floor(Math.random() * products.length)];
  const label = FARM_TYPES[product].label;
  return {
    type: 'product_quality',
    title: 'A Bad Batch',
    description: `One of your distributors flags a batch of ${label.toLowerCase()} as off - cut wrong, or cut with something it shouldn't be. Sell it as-is and word travels fast on the street.`,
    context: { product, label },
    options: [
      { id: 'destroy', label: `Destroy the batch (Street Rep +4, lose the product on hand)` },
      { id: 'sell_anyway', label: `Sell it anyway and let buyers find out (cash now, Street Rep -8, PD Heat +3)` },
      { id: 'blame_rival', label: `Spread word a rival gang's product is the bad batch (Street Rep +2, a rival gang's relations -10)` }
    ]
  };
}

function genOldDebtDilemma(state) {
  const amount = 2000 + Math.floor(Math.random() * 3000);
  return {
    type: 'old_debt',
    title: 'A Face From Before',
    description: `Someone you owed money to years ago - before any of this - tracks you down. They say they "just want what's owed, with a little something for the wait."`,
    context: { amount },
    options: [
      { id: 'pay_full', label: `Pay them in full, with interest (${fmtMoney(amount)} dirty cash, Street Rep +5)` },
      { id: 'pay_half', label: `Offer half now and a promise (${fmtMoney(Math.round(amount / 2))} dirty cash, Street Rep +1)` },
      { id: 'refuse', label: `Tell them that debt died a long time ago (Street Rep -5, PD Heat +2)` }
    ]
  };
}

function genLawyerRetainerDilemma(state) {
  return {
    type: 'lawyer_retainer',
    title: 'A Lawyer With a Card',
    description: `A sharply-dressed lawyer offers you a standing retainer - on call for arrests, raids, and "inconveniences," paid up front in clean cash.`,
    context: {},
    options: [
      { id: 'hire', label: `Pay the retainer (${fmtMoney(4000)} clean cash, PD Heat -10, Fed Heat -5)` },
      { id: 'pass', label: `Pass for now - you'll manage` }
    ]
  };
}

function genCrewProveThemselvesDilemma(state) {
  if (state.player.crew.size < 2) return null;
  return {
    type: 'crew_prove',
    title: 'Eager to Prove Themselves',
    description: `One of the newer crew members keeps pushing to be put on something bigger - a job that matters. Give them a shot, and either they step up or they don't.`,
    context: {},
    options: [
      { id: 'give_shot', label: `Put them on a real job (risk/reward - success raises Crew Loyalty and Street Rep, failure costs you both)` },
      { id: 'make_wait', label: `Tell them to wait their turn (Crew Loyalty -3)` }
    ]
  };
}

function genRivalTruceOfferDilemma(state) {
  const candidates = Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated && g.relationToPlayer < 50);
  if (!candidates.length) return null;
  const gang = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    type: 'rival_truce',
    title: `A Message From the ${gang.name}`,
    description: `A messenger from the ${gang.name} approaches, hands visibly empty. Their boss wants a sit-down - no crews, no guns, just a conversation about "easing tensions."`,
    context: { gangId: gang.id, gangName: gang.name },
    options: [
      { id: 'meet', label: `Take the meeting (${gang.name} relations +15, Gang Heat -5)` },
      { id: 'snub', label: `Send the messenger back empty-handed (${gang.name} relations -10)` },
      { id: 'ambush', label: `Use the meeting as a setup (one-time cash grab, ${gang.name} relations -25, Gang Heat +15)` }
    ]
  };
}

function genSmugglerDetourDilemma(state) {
  const cost = 1000 + Math.floor(Math.random() * 1500);
  const gain = cost + 1000 + Math.floor(Math.random() * 2500);
  return {
    type: 'smuggler_detour',
    title: 'A Detour Worth Taking',
    description: `A smuggling contact has a truck rerouted through your territory tonight - no questions, but it needs a "toll" paid up front to keep moving quietly.`,
    context: { cost, gain },
    options: [
      { id: 'pay_toll', label: `Pay the toll (${fmtMoney(cost)} dirty cash, chance at ${fmtMoney(gain)} cut)` },
      { id: 'shake_down', label: `Take a bigger cut by force (${fmtMoney(gain)} now, Gang Heat +10, burns the contact)` },
      { id: 'wave_through', label: `Wave it through for free (builds goodwill, no immediate payoff)` }
    ]
  };
}

function genFederalTaskForceDilemma(state) {
  if ((state.player.heat.feds || 0) < 60) return null;
  const loss = Math.round(state.player.cash.dirty * 0.2);
  return {
    type: 'federal_task_force',
    title: 'A Federal Task Force Forms',
    description: `Word comes down through a contact at the courthouse: the Feds have stood up a dedicated task force with your name at the top of the file. This isn't a subpoena anymore - it's a campaign, and weathering it is going to cost you.`,
    context: { loss },
    options: [
      { id: 'go_dark', label: `Go dark - shut down the riskiest operations for a while (lose ${fmtMoney(loss)} dirty cash, Fed Heat -25)` },
      { id: 'lawyer_up', label: `Bring in a full defense team (${fmtMoney(10000)} clean cash, Fed Heat -15)` },
      { id: 'double_down', label: `Push harder before they're ready - one big score while you still can (Fed Heat +10, Street Rep +6, big payout)` }
    ]
  };
}

function genRivalAllianceDilemma(state) {
  const myGangId = playerGangId(state);
  if (!myGangId) return null;
  const hostiles = Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated && (g.relationToPlayer || 0) < -10);
  const influence = computeTerritoryInfluence(state);
  if (hostiles.length < 2 || influence < 30) return null;
  const target = hostiles[Math.floor(Math.random() * hostiles.length)];
  return {
    type: 'rival_alliance',
    title: 'A Coalition Forms Against You',
    description: `Word reaches you that ${hostiles.map(g => g.name).join(', ')} have been talking - more than usual. Your growing footprint in the city has made you the common enemy, and a coalition against you is taking shape.`,
    context: { gangId: target.id, gangName: target.name },
    options: [
      { id: 'strike_first', label: `Hit ${target.name} before the coalition solidifies (combat - breaks the coalition if it works)` },
      { id: 'buy_off', label: `Quietly buy off ${target.name} to peel them away (${fmtMoney(6000)} dirty cash, ${target.name} relations +20)` },
      { id: 'fortify', label: `Fortify your territory - pour cash into protection across the board (${fmtMoney(5000)} dirty cash, Gang Heat -5)` }
    ]
  };
}

function genCartelWarDilemma(state) {
  if (rankIndex(state.player.rank) < 2) return null;
  let totalPlots = 0;
  for (const d of state.districts) {
    for (const product of Object.keys(FARM_TYPES)) {
      totalPlots += (d.farms[product] && d.farms[product].plots) || 0;
    }
  }
  if (totalPlots < 6) return null;
  const gain = 6000 + Math.floor(Math.random() * 9000);
  return {
    type: 'cartel_war',
    title: 'A Cartel War Erupts',
    description: `Your production has gotten big enough to draw outside attention - a cartel war breaks out over supply lines into the city, and everyone wants to know which side you're on.`,
    context: { gain },
    options: [
      { id: 'pick_side', label: `Pick a side and supply them (+${fmtMoney(gain)}, Gang Heat +10, PD Heat +5)` },
      { id: 'stay_neutral', label: `Stay neutral and ride it out (lose half your current product inventory, Street Rep +3)` },
      { id: 'exploit', label: `Exploit the chaos - raid a weakened shipment (combat for a big payout)` }
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
  weapons_deal: genWeaponsDealDilemma,
  lieutenant_kidnap: genLieutenantKidnapDilemma,
  gang_informant: genGangInformantDilemma,
  fed_subpoena: genFedSubpoenaDilemma,
  crew_debt: genCrewDebtDilemma,
  reporter: genReporterDilemma,
  business_shakedown: genBusinessShakedownDilemma,
  product_quality: genProductQualityDilemma,
  old_debt: genOldDebtDilemma,
  lawyer_retainer: genLawyerRetainerDilemma,
  crew_prove: genCrewProveThemselvesDilemma,
  rival_truce: genRivalTruceOfferDilemma,
  smuggler_detour: genSmugglerDetourDilemma,
  federal_task_force: genFederalTaskForceDilemma,
  rival_alliance: genRivalAllianceDilemma,
  cartel_war: genCartelWarDilemma
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

    case 'lieutenant_kidnap': {
      const lt = p.lieutenants.find(l => l.id === dilemma.context.ltId);
      const ltName = dilemma.context.ltName;
      if (optionId === 'rescue') {
        const result = resolveScuffle(state, 35);
        if (result.result === 'fail') {
          if (lt) p.lieutenants = p.lieutenants.filter(l => l.id !== lt.id);
          p.crew.loyalty = clamp(p.crew.loyalty - 15, 0, 100);
          addHeat(state, 'gangs', 10);
          text = `The hit goes bad. ${ltName} pulls out of the operation entirely to deal with the fallout, and the rest of the crew is rattled.`;
        } else {
          if (lt) lt.loyalty = clamp(lt.loyalty + 20, 0, 100);
          addRep(state, 'street', 5);
          text = result.result === 'success'
            ? `Your crew hits the safehouse hard and gets ${ltName}'s family out clean. ${ltName} owes you everything now.`
            : `It's messy, but you get ${ltName}'s family out alive. ${ltName} won't forget it.`;
        }
      } else if (optionId === 'demote') {
        if (lt) p.lieutenants = p.lieutenants.filter(l => l.id !== lt.id);
        p.crew.loyalty = clamp(p.crew.loyalty - 10, 0, 100);
        text = `You tell ${ltName} this is a personal problem, not a family one, and strip the rank on the spot. The rest of the crew goes quiet for days.`;
      } else {
        if (lt) p.lieutenants = p.lieutenants.filter(l => l.id !== lt.id);
        addHeat(state, 'gangs', 10);
        p.crew.loyalty = clamp(p.crew.loyalty - 5, 0, 100);
        text = `You pass word that you won't be coming. ${ltName} never finds out it was your call - but disappears from your operation within the week, and whispers about the family start circling your crew.`;
      }
      break;
    }

    case 'gang_informant': {
      const gang = state.gangs[dilemma.context.gangId];
      const { cost, payout, gangName } = dilemma.context;
      if (optionId === 'pay') {
        if (p.cash.dirty >= cost) {
          p.cash.dirty -= cost;
          if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 10, -100, 100);
          if (Math.random() < 0.6) {
            addCash(state, payout, 0);
            text = `The tip is good. You pay ${fmtMoney(cost)} and walk away with ${fmtMoney(payout)} from the ${gangName} stash he pointed out.`;
          } else {
            text = `You pay ${fmtMoney(cost)} for the tip, but the stash has already been moved. The ${gangName} will be looking for their leak soon.`;
          }
        } else {
          text = `You can't spare ${fmtMoney(cost)} for the tip, and he's not interested in credit.`;
        }
      } else if (optionId === 'recruit') {
        p.crew.size += 1;
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 15, -100, 100);
        addHeat(state, 'gangs', 5);
        text = `You bring him into the fold. One more body for the crew - and one more reason for the ${gangName} to hate you.`;
      } else {
        text = `You send him back the way he came. Whatever he's running from, it's not your problem.`;
      }
      break;
    }

    case 'fed_subpoena': {
      if (optionId === 'bribe') {
        if (p.cash.dirty >= 5000) {
          p.cash.dirty -= 5000;
          addHeat(state, 'feds', -15);
          text = `You slip the agent ${fmtMoney(5000)} in an envelope. The folder never makes it back to the office.`;
        } else {
          text = `You don't have ${fmtMoney(5000)} in dirty cash on hand to make this go away.`;
        }
      } else if (optionId === 'lawyer') {
        if (p.cash.clean >= 2000) {
          p.cash.clean -= 2000;
          addHeat(state, 'feds', -5);
          text = `Your lawyer fires off a wall of paperwork. It buys time, for ${fmtMoney(2000)}.`;
        } else {
          text = `You don't have ${fmtMoney(2000)} in clean cash to put your lawyer on it.`;
        }
      } else {
        addHeat(state, 'feds', 10);
        text = `You brush it off. The subpoena lands on someone's desk anyway, and the file stays open.`;
      }
      break;
    }

    case 'crew_debt': {
      const debt = dilemma.context.debt;
      if (optionId === 'cover') {
        if (p.cash.dirty >= debt) {
          p.cash.dirty -= debt;
          p.crew.loyalty = clamp(p.crew.loyalty + 8, 0, 100);
          text = `You cover the marker without a word. He doesn't say much, but the crew notices.`;
        } else {
          text = `You want to help, but you can't cover ${fmtMoney(debt)} right now.`;
        }
      } else if (optionId === 'leverage') {
        if (p.cash.dirty >= debt) {
          p.cash.dirty -= debt;
          p.crew.loyalty = clamp(p.crew.loyalty + 3, 0, 100);
          addRep(state, 'street', 2);
          text = `You pay off the marker yourself, then make it very clear he's working it off. The street takes note of how you handle your own.`;
        } else {
          text = `You can't cover ${fmtMoney(debt)} to make the play.`;
        }
      } else {
        p.crew.loyalty = clamp(p.crew.loyalty - 5, 0, 100);
        if (Math.random() < 0.3) {
          p.crew.size = Math.max(1, p.crew.size - 1);
          text = `You let him sort it out. He doesn't come back to work - and nobody's seen him since.`;
        } else {
          text = `You let him sort it out himself. He's rattled for a week, and the crew is rattled with him.`;
        }
      }
      break;
    }

    case 'reporter': {
      if (optionId === 'feed_story') {
        if (p.cash.dirty >= 1500) {
          p.cash.dirty -= 1500;
          addHeat(state, 'pd', -5);
          text = `You point her at a juicier story across town, with ${fmtMoney(1500)} to grease the tip line. She bites - and forgets about you.`;
        } else {
          text = `You don't have ${fmtMoney(1500)} spare to redirect her attention.`;
        }
      } else if (optionId === 'threaten') {
        addRep(state, 'street', -3);
        addHeat(state, 'pd', -3);
        addHeat(state, 'feds', 5);
        text = `Someone has a quiet word with her. The story dies - but a federal liaison hears about how it died.`;
      } else {
        addHeat(state, 'feds', 3);
        text = `You ignore her. A week later, a "person familiar with the matter" is quoted in a story that names your street, if not your name.`;
      }
      break;
    }

    case 'business_shakedown': {
      const district = state.districts[dilemma.context.districtId];
      if (optionId === 'take_over') {
        const existing = p.extortionRackets.find(r => r.districtId === district.id);
        if (existing) {
          existing.level = Math.min(EXTORTION_RACKET_INCOME.length, existing.level + 1);
          text = `You tell the rival crew the shop is under new management. Your racket in ${district.name} grows to level ${existing.level}.`;
        } else {
          p.extortionRackets.push({ districtId: district.id, level: 1 });
          text = `You take over the "tax" yourself. You've got a new extortion racket running in ${district.name}.`;
        }
        addHeat(state, 'gangs', 5);
      } else if (optionId === 'help_free') {
        addRep(state, 'street', 5);
        addHeat(state, 'gangs', 3);
        text = `Your crew leans on the rival collectors until they find somewhere else to be. The shop owner won't forget it - and neither will the rival crew.`;
      } else {
        text = `You tell her it's not your fight. She nods like she expected as much and goes back inside.`;
      }
      break;
    }

    case 'product_quality': {
      const { product, label } = dilemma.context;
      if (optionId === 'destroy') {
        p.inventory.product[product] = 0;
        addRep(state, 'street', 4);
        text = `You order the whole batch dumped. It costs you product, but the street knows your ${label.toLowerCase()} is clean.`;
      } else if (optionId === 'sell_anyway') {
        const amount = p.inventory.product[product];
        const value = Math.round(amount * 40);
        p.inventory.product[product] = 0;
        addCash(state, value, 0);
        addRep(state, 'street', -8);
        addHeat(state, 'pd', 3);
        text = `You move the bad batch anyway, clearing ${fmtMoney(value)}. By morning, complaints are already spreading.`;
      } else {
        addRep(state, 'street', 2);
        const candidates = Object.values(state.gangs).filter(g => !g.isPlayerGang && !g.eliminated);
        if (candidates.length) {
          const gang = candidates[Math.floor(Math.random() * candidates.length)];
          gang.relationToPlayer = clamp(gang.relationToPlayer - 10, -100, 100);
          text = `You quietly spread word that the bad batch is the ${gang.name}'s product, not yours. Your reputation survives - theirs takes the hit.`;
        } else {
          text = `You quietly spread word that the bad batch isn't yours. Nobody's around to take the blame, but the rumor sticks anyway.`;
        }
      }
      break;
    }

    case 'old_debt': {
      const amount = dilemma.context.amount;
      if (optionId === 'pay_full') {
        if (p.cash.dirty >= amount) {
          p.cash.dirty -= amount;
          addRep(state, 'street', 5);
          text = `You pay them in full, with interest. They leave satisfied, and word gets around that you settle your debts.`;
        } else {
          text = `You can't cover ${fmtMoney(amount)} to settle the old debt right now.`;
        }
      } else if (optionId === 'pay_half') {
        const half = Math.round(amount / 2);
        if (p.cash.dirty >= half) {
          p.cash.dirty -= half;
          addRep(state, 'street', 1);
          text = `You hand over ${fmtMoney(half)} and promise the rest later. They're not thrilled, but they take it.`;
        } else {
          text = `You can't even spare ${fmtMoney(half)} right now, so you put them off with words instead.`;
        }
      } else {
        addRep(state, 'street', -5);
        addHeat(state, 'pd', 2);
        text = `You tell them that debt died with the person you used to be. They don't take it well, and they don't leave quietly.`;
      }
      break;
    }

    case 'lawyer_retainer': {
      if (optionId === 'hire') {
        if (p.cash.clean >= 4000) {
          p.cash.clean -= 4000;
          addHeat(state, 'pd', -10);
          addHeat(state, 'feds', -5);
          text = `You pay the retainer. Within days, a couple of standing "concerns" with the PD and the Feds quietly evaporate.`;
        } else {
          text = `You don't have ${fmtMoney(4000)} in clean cash to put a lawyer on retainer right now.`;
        }
      } else {
        text = `You pass on the offer. The lawyer shrugs and leaves a card, just in case.`;
      }
      break;
    }

    case 'crew_prove': {
      if (optionId === 'give_shot') {
        const result = resolveScuffle(state, 25);
        if (result.result === 'fail') {
          p.crew.loyalty = clamp(p.crew.loyalty - 8, 0, 100);
          addHeat(state, 'pd', 4);
          text = `The job goes sideways. They make it back, but barely - and the crew is shaken by how close it was.`;
        } else {
          const gain = result.result === 'success' ? 1200 + Math.floor(Math.random() * 1800) : 400 + Math.floor(Math.random() * 600);
          addCash(state, gain, 0);
          p.crew.loyalty = clamp(p.crew.loyalty + 6, 0, 100);
          addRep(state, 'street', 3);
          text = `They come through, bringing back ${fmtMoney(gain)} and a story the crew won't stop telling for a week.`;
        }
      } else {
        p.crew.loyalty = clamp(p.crew.loyalty - 3, 0, 100);
        text = `You tell them to wait their turn. They nod, but you can tell it stings.`;
      }
      break;
    }

    case 'rival_truce': {
      const gang = state.gangs[dilemma.context.gangId];
      const gangName = dilemma.context.gangName;
      if (optionId === 'meet') {
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer + 15, -100, 100);
        addHeat(state, 'gangs', -5);
        text = `You take the meeting. It's tense, but both sides walk away with a little less reason to start something.`;
      } else if (optionId === 'snub') {
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 10, -100, 100);
        text = `You send the messenger back without a word. The message it sends is its own kind of answer.`;
      } else {
        const take = 2000 + Math.floor(Math.random() * 3000);
        addCash(state, take, 0);
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 25, -100, 100);
        addHeat(state, 'gangs', 15);
        text = `You take the meeting - and take everything the messenger's carrying, ${fmtMoney(take)} worth. The ${gangName} will be coming for blood.`;
      }
      break;
    }

    case 'smuggler_detour': {
      const { cost, gain } = dilemma.context;
      if (optionId === 'pay_toll') {
        if (p.cash.dirty >= cost) {
          p.cash.dirty -= cost;
          if (Math.random() < 0.65) {
            addCash(state, gain, 0);
            text = `You pay the toll, and the cut comes back bigger than expected - ${fmtMoney(gain)} for your trouble.`;
          } else {
            text = `You pay the toll, but the truck's "cut" turns out to be lighter than promised. Lesson learned.`;
          }
        } else {
          text = `You can't cover the ${fmtMoney(cost)} toll, so the truck reroutes elsewhere.`;
        }
      } else if (optionId === 'shake_down') {
        addCash(state, gain, 0);
        addHeat(state, 'gangs', 10);
        text = `You take a bigger cut than agreed, ${fmtMoney(gain)} worth. Word gets around fast that your territory isn't a safe detour anymore.`;
      } else {
        addRep(state, 'street', 3);
        text = `You wave the truck through without taking a cut. The contact remembers favors like that.`;
      }
      break;
    }

    case 'federal_task_force': {
      const { loss } = dilemma.context;
      if (optionId === 'go_dark') {
        p.cash.dirty = Math.max(0, p.cash.dirty - loss);
        addHeat(state, 'feds', -25);
        text = `You shut down every operation that could be traced back to you and wait out the heat. It costs ${fmtMoney(loss)}, but the task force loses the scent.`;
      } else if (optionId === 'lawyer_up') {
        if (p.cash.clean >= 10000) {
          p.cash.clean -= 10000;
          addHeat(state, 'feds', -15);
          text = `A full defense team goes to work, burying the task force in motions and delays. ${fmtMoney(10000)} well spent.`;
        } else {
          text = `You can't put together ${fmtMoney(10000)} for a defense team on short notice. The task force presses on.`;
        }
      } else {
        const gain = 8000 + Math.floor(Math.random() * 12000);
        addCash(state, gain, 0);
        addHeat(state, 'feds', 10);
        addRep(state, 'street', 6);
        text = `You move fast and hit hard before the task force is fully stood up, walking away with ${fmtMoney(gain)}. The street takes notice - so do the Feds.`;
      }
      break;
    }

    case 'rival_alliance': {
      const gang = state.gangs[dilemma.context.gangId];
      const gangName = dilemma.context.gangName;
      if (optionId === 'strike_first') {
        const result = resolveScuffle(state, 30 + (gang ? gang.crewSize || 10 : 10));
        if (result.result === 'fail') {
          addHeat(state, 'gangs', 8);
          p.crew.loyalty = clamp(p.crew.loyalty - 8, 0, 100);
          text = `You hit ${gangName} first, but it goes badly - your crew limps back, and the coalition against you only grows tighter.`;
        } else {
          if (gang) gang.relationToPlayer = clamp((gang.relationToPlayer || 0) - 20, -100, 100);
          addRep(state, 'gang', 6);
          text = `You hit ${gangName} hard and fast, scattering their crew. The message lands - the coalition against you quietly falls apart before it forms.`;
        }
      } else if (optionId === 'buy_off') {
        if (p.cash.dirty >= 6000) {
          p.cash.dirty -= 6000;
          if (gang) gang.relationToPlayer = clamp((gang.relationToPlayer || 0) + 20, -100, 100);
          text = `A quiet payoff to ${gangName} peels them out of the coalition. The others are left with one less ally.`;
        } else {
          text = `You can't spare ${fmtMoney(6000)} to buy ${gangName} off right now.`;
        }
      } else {
        if (p.cash.dirty >= 5000) {
          p.cash.dirty -= 5000;
          for (const b of state.ownedBusinesses) b.protection = clamp((b.protection || 0) + 20, 0, 100);
          addHeat(state, 'gangs', -5);
          text = `You pour ${fmtMoney(5000)} into protection across your businesses and territory. Whatever the coalition is planning, you're not an easy target anymore.`;
        } else {
          text = `You can't spare ${fmtMoney(5000)} to fortify right now.`;
        }
      }
      break;
    }

    case 'cartel_war': {
      const { gain } = dilemma.context;
      if (optionId === 'pick_side') {
        addCash(state, gain, 0);
        addHeat(state, 'gangs', 10);
        addHeat(state, 'pd', 5);
        text = `You throw in with one side of the cartel war, supplying their push into the city. It pays ${fmtMoney(gain)} - and paints a target on your back.`;
      } else if (optionId === 'stay_neutral') {
        for (const product of Object.keys(p.inventory.product)) {
          p.inventory.product[product] = Math.floor(p.inventory.product[product] / 2);
        }
        addRep(state, 'street', 3);
        text = `You keep your head down and let the cartels fight it out elsewhere. Half your stash gets "redirected" to keep the peace, but you stay out of the crossfire.`;
      } else {
        const result = resolveScuffle(state, 40);
        if (result.result === 'fail') {
          addHeat(state, 'gangs', 15);
          p.crew.loyalty = clamp(p.crew.loyalty - 10, 0, 100);
          text = `You move on a shipment caught in the crossfire, but it's an ambush. Your crew barely gets out, and now both sides of the cartel war have a reason to come after you.`;
        } else {
          const take = gain + 3000;
          addCash(state, take, 0);
          text = `You hit a weakened shipment in the middle of the chaos and walk away with ${fmtMoney(take)} before anyone notices you were there.`;
        }
      }
      break;
    }
  }

  if (text) {
    state.eventLog.push(logEntry(state, text, 'dilemma'));
    queueNarration(state, 'dilemma', text);
  }
}
