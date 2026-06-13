/* ============================================================
   UNDERWORLD - Criminal World (Inter-Gang Council & Diplomacy)
   Unlocked once your gang controls 50%+ average territory.
   Each turn the council brings a decision that shifts revenue,
   stats, and relationships with the other families.
   ============================================================ */

const CRIMINAL_WORLD_TRIBUTE_MIN = 15000;
const CRIMINAL_WORLD_TRIBUTE_RANGE = 35000;
const CRIMINAL_WORLD_POLICE_FUND_COST = 50000;
const CRIMINAL_WORLD_SMUGGLING_BONUS = 0.25;
const CRIMINAL_WORLD_SMUGGLING_TURNS = 5;
const CRIMINAL_WORLD_HISTORY_LIMIT = 8;

function canAccessCriminalWorld(state) {
  return state.criminalWorld.unlocked;
}

function checkCriminalWorldUnlock(state) {
  if (state.criminalWorld.unlocked) return;
  if (!playerGangId(state)) return;
  if (computeTerritoryInfluence(state) >= 50) {
    state.criminalWorld.unlocked = true;
    state.eventLog.push(logEntry(state, `Your gang now holds over half the city's territory. You've earned a seat in the Criminal World - the true power brokers of ${state.meta.cityName} now answer your calls.`, 'criminalworld'));
  }
}

function gangTerritoryScore(state, gangId) {
  let score = 0;
  for (const d of state.districts) score += d.control[gangId] || 0;
  return score;
}

/* ---------------- Decision Generators ---------------- */

function genPriceFix(state) {
  const limits = getOpsLimits(state);
  const products = limits.unlockedProducts;
  if (!products.length) return null;
  const product = products[Math.floor(Math.random() * products.length)];
  const def = FARM_TYPES[product];
  return {
    type: 'price_fix',
    title: `Council Price Fix - ${def.label}`,
    description: `The district bosses are debating street prices for ${def.label.toLowerCase()}. Your call could shift the market citywide.`,
    context: { product },
    options: [
      { id: 'raise', label: 'Push prices up 10% (Gang Heat +3, slower sales)' },
      { id: 'hold', label: 'Hold steady' },
      { id: 'cut', label: 'Undercut rivals: cut prices 10% (Street Rep +2, faster sales)' }
    ]
  };
}

function genEliminateGang(state) {
  const myGangId = playerGangId(state);
  const candidates = getCouncilGangs(state).filter(g => !g.eliminated && !g.alliedWithPlayer && g.id !== myGangId);
  if (candidates.length < 2) return null;
  let weakest = null, weakestScore = Infinity;
  for (const g of candidates) {
    const score = gangTerritoryScore(state, g.id);
    if (score < weakestScore) { weakestScore = score; weakest = g; }
  }
  if (!weakest || weakestScore <= 0) return null;
  return {
    type: 'eliminate_gang',
    title: `Council Hit: The ${weakest.name}`,
    description: `${weakest.boss.name} of the ${weakest.name} has made one too many enemies on the council. There's talk of wiping them off the map for good and carving up their turf.`,
    context: { gangId: weakest.id },
    options: [
      { id: 'back', label: 'Back the hit (Gang Heat +10, PD Heat +5)' },
      { id: 'neutral', label: 'Stay out of it' },
      { id: 'warn', label: `Tip off ${weakest.boss.name} (improves relations with them)` }
    ]
  };
}

function genPoliceFund(state) {
  return {
    type: 'police_fund',
    title: 'Joint Police Fund',
    description: `The council proposes pooling cash to keep certain precincts looking the other way for everyone.`,
    context: { cost: CRIMINAL_WORLD_POLICE_FUND_COST },
    options: [
      { id: 'contribute', label: `Contribute ${fmtMoney(CRIMINAL_WORLD_POLICE_FUND_COST)} (PD Heat -15)` },
      { id: 'decline', label: 'Decline' }
    ]
  };
}

function genSmugglingPact(state) {
  const allies = getCouncilGangs(state).filter(g => !g.eliminated && g.alliedWithPlayer);
  if (!allies.length) return null;
  const gang = allies[Math.floor(Math.random() * allies.length)];
  return {
    type: 'smuggling_pact',
    title: `Combined Smuggling Route - ${gang.name}`,
    description: `${gang.boss.name} proposes linking your distribution networks for a few turns to move more product across the city.`,
    context: { gangId: gang.id },
    options: [
      { id: 'accept', label: `Accept the pact (+${Math.round(CRIMINAL_WORLD_SMUGGLING_BONUS * 100)}% distribution capacity for ${CRIMINAL_WORLD_SMUGGLING_TURNS} turns)` },
      { id: 'decline', label: 'Decline' }
    ]
  };
}

function genTributeDemand(state) {
  const myGangId = playerGangId(state);
  const candidates = getCouncilGangs(state).filter(g => !g.eliminated && !g.alliedWithPlayer && !g.atWarWithPlayer && g.id !== myGangId);
  if (!candidates.length) return null;
  let strongest = null, strongestScore = -1;
  for (const g of candidates) {
    const score = gangTerritoryScore(state, g.id);
    if (score > strongestScore) { strongestScore = score; strongest = g; }
  }
  if (!strongest || strongestScore <= 0) return null;
  const amount = CRIMINAL_WORLD_TRIBUTE_MIN + Math.floor(Math.random() * CRIMINAL_WORLD_TRIBUTE_RANGE);
  return {
    type: 'tribute_demand',
    title: `Tribute Demand - ${strongest.name}`,
    description: `${strongest.boss.name} sends word: the ${strongest.name} expect a "respect payment" for operating so freely in their territory.`,
    context: { gangId: strongest.id, amount },
    options: [
      { id: 'pay', label: `Pay ${fmtMoney(amount)}` },
      { id: 'refuse', label: 'Refuse' }
    ]
  };
}

function genTerritoryDispute(state) {
  const myGangId = playerGangId(state);
  const districts = [...state.districts].sort(() => Math.random() - 0.5);
  for (const d of districts) {
    const others = Object.keys(d.control).filter(gid => gid !== myGangId && !state.gangs[gid].eliminated);
    if (others.length >= 2) {
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      const [aId, bId] = shuffled;
      const gangA = state.gangs[aId], gangB = state.gangs[bId];
      return {
        type: 'territory_dispute',
        title: `Mediation: ${gangA.name} vs ${gangB.name}`,
        description: `${gangA.name} and ${gangB.name} are feuding over turf in ${d.name}. The council wants you to weigh in.`,
        context: { districtId: d.id, gangAId: aId, gangBId: bId },
        options: [
          { id: 'backA', label: `Back the ${gangA.name} (shift 5% of ${d.name} from ${gangB.name})` },
          { id: 'backB', label: `Back the ${gangB.name} (shift 5% of ${d.name} from ${gangA.name})` },
          { id: 'neutral', label: 'Stay neutral' }
        ]
      };
    }
  }
  return null;
}

function genInformantPurge(state) {
  return {
    type: 'informant_purge',
    title: 'Informant Purge',
    description: `Word is a rat has been feeding the police information. The council wants to root them out - quietly.`,
    context: {},
    options: [
      { id: 'support', label: 'Support the purge (PD Heat -5, Gang Heat +3)' },
      { id: 'protect', label: 'Protect your own contact (Street Rep +3, council relations -3)' }
    ]
  };
}

function genCartelShipment(state) {
  const amount = 20000 + Math.floor(Math.random() * 40000);
  return {
    type: 'cartel_shipment',
    title: 'Cartel Shipment Opportunity',
    description: `A cartel contact offers you a cut of an incoming shipment passing through the city - no questions asked.`,
    context: { amount },
    options: [
      { id: 'take', label: `Take the cut (${fmtMoney(amount)}, Fed Heat +10)` },
      { id: 'pass', label: 'Pass (Cartel Rep +2)' }
    ]
  };
}

function genWeaponsCache(state) {
  const amount = 10 + Math.floor(Math.random() * 30);
  return {
    type: 'weapons_cache',
    title: 'Recovered Weapons Cache',
    description: `A shipment of arms was intercepted and now sits in a council-controlled warehouse, up for grabs.`,
    context: { amount },
    options: [
      { id: 'claim', label: `Claim the cache (+${amount} Arms, PD Heat +4)` },
      { id: 'handover', label: 'Hand it to the council (relations improve with every family)' }
    ]
  };
}

function genCharityGala(state) {
  const cost = 5000 + Math.floor(Math.random() * 10000);
  return {
    type: 'charity_gala',
    title: 'Council Charity Gala',
    description: `The families are throwing a lavish charity gala to clean up their public image. A seat at the table costs plenty, but so does staying away.`,
    context: { cost },
    options: [
      { id: 'attend', label: `Attend and donate ${fmtMoney(cost)} (Street Rep +6, PD Heat -5)` },
      { id: 'skip', label: 'Skip it' }
    ]
  };
}

function genHostageNegotiation(state) {
  const myGangId = playerGangId(state);
  const candidates = getCouncilGangs(state).filter(g => !g.eliminated && g.id !== myGangId);
  if (!candidates.length) return null;
  const gang = candidates[Math.floor(Math.random() * candidates.length)];
  const amount = 8000 + Math.floor(Math.random() * 12000);
  return {
    type: 'hostage_negotiation',
    title: `Hostage Standoff - ${gang.name}`,
    description: `A deal gone wrong has left two crews holding each other's people. ${gang.boss.name} wants you to broker the trade.`,
    context: { gangId: gang.id, amount },
    options: [
      { id: 'broker', label: `Broker a fair trade (${gang.name} relations +10, Street Rep +3)` },
      { id: 'exploit', label: `Tip the scales your way (${fmtMoney(amount)}, ${gang.name} relations -10)` },
      { id: 'ignore', label: 'Stay out of it' }
    ]
  };
}

function genPoliticalFunding(state) {
  const cost = 20000 + Math.floor(Math.random() * 30000);
  return {
    type: 'political_funding',
    title: 'Funding a Friendly Candidate',
    description: `The council wants to pool funds behind a city council candidate who's promised to keep certain precincts looking the other way.`,
    context: { cost },
    options: [
      { id: 'fund', label: `Contribute ${fmtMoney(cost)} (PD Heat -8, Fed Heat -4)` },
      { id: 'decline', label: 'Decline' }
    ]
  };
}

const COUNCIL_DECISION_GENERATORS = {
  price_fix: genPriceFix,
  eliminate_gang: genEliminateGang,
  police_fund: genPoliceFund,
  smuggling_pact: genSmugglingPact,
  tribute_demand: genTributeDemand,
  territory_dispute: genTerritoryDispute,
  informant_purge: genInformantPurge,
  cartel_shipment: genCartelShipment,
  weapons_cache: genWeaponsCache,
  charity_gala: genCharityGala,
  hostage_negotiation: genHostageNegotiation,
  political_funding: genPoliticalFunding
};

function generateCouncilDecision(state) {
  const lastType = state.criminalWorld.decision ? state.criminalWorld.decision.type : null;
  const candidates = [];
  for (const [type, fn] of Object.entries(COUNCIL_DECISION_GENERATORS)) {
    if (type === lastType) continue;
    const decision = fn(state);
    if (decision) candidates.push(decision);
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ---------------- Decision Resolution ---------------- */

function resolveCouncilDecision(state, optionId) {
  const decision = state.criminalWorld.decision;
  if (!decision) return { ok: false, reason: 'No matter is currently before the council.' };
  const option = decision.options.find(o => o.id === optionId);
  if (!option) return { ok: false, reason: 'Unknown option.' };

  applyCouncilOption(state, decision, optionId);

  state.criminalWorld.decisionHistory.unshift({ turn: state.meta.turn, title: decision.title, choice: option.label });
  state.criminalWorld.decisionHistory = state.criminalWorld.decisionHistory.slice(0, CRIMINAL_WORLD_HISTORY_LIMIT);
  state.criminalWorld.decision = null;
  return { ok: true };
}

function applyCouncilOption(state, decision, optionId) {
  switch (decision.type) {
    case 'price_fix': {
      const product = decision.context.product;
      const def = FARM_TYPES[product];
      const ops = state.player.operations;
      if (optionId === 'raise') {
        ops.prices[product] = clamp(ops.prices[product] * 1.1, OPS_ECONOMY.priceMinMult, OPS_ECONOMY.priceMaxMult);
        addHeat(state, 'gangs', 3);
        state.eventLog.push(logEntry(state, `You back a price hike on ${def.label.toLowerCase()}. Your markup rises to x${ops.prices[product].toFixed(2)}.`, 'criminalworld'));
      } else if (optionId === 'cut') {
        ops.prices[product] = clamp(ops.prices[product] * 0.9, OPS_ECONOMY.priceMinMult, OPS_ECONOMY.priceMaxMult);
        addRep(state, 'street', 2);
        state.eventLog.push(logEntry(state, `You undercut the competition on ${def.label.toLowerCase()}. Markup drops to x${ops.prices[product].toFixed(2)}.`, 'criminalworld'));
      } else {
        state.eventLog.push(logEntry(state, `You hold prices steady on ${def.label.toLowerCase()}.`, 'criminalworld'));
      }
      break;
    }

    case 'eliminate_gang': {
      const target = state.gangs[decision.context.gangId];
      if (!target) break;
      if (optionId === 'back') {
        addHeat(state, 'gangs', 10);
        addHeat(state, 'pd', 5);
        const successChance = clamp(40 + state.player.reputation.gang / 2, 20, 85);
        if (Math.random() * 100 < successChance) {
          const myGangId = playerGangId(state);
          for (const d of state.districts) {
            const pct = d.control[target.id];
            if (!pct) continue;
            delete d.control[target.id];
            if (myGangId && d.control[myGangId] !== undefined) {
              d.control[myGangId] = (d.control[myGangId] || 0) + pct;
            } else {
              const dom = dominantGang(d);
              if (dom) d.control[dom] = (d.control[dom] || 0) + pct;
            }
          }
          target.territory = [];
          target.eliminated = true;
          target.relationToPlayer = -100;
          target.atWarWithPlayer = false;
          target.alliedWithPlayer = false;
          for (const g of getCouncilGangs(state)) {
            if (g.id !== target.id && !g.eliminated) g.relationToPlayer = clamp(g.relationToPlayer + 5, -100, 100);
          }
          state.eventLog.push(logEntry(state, `The hit succeeds. The ${target.name} are wiped out, their turf carved up among the remaining families.`, 'criminalworld'));
        } else {
          target.relationToPlayer = clamp(target.relationToPlayer - 20, -100, 100);
          state.eventLog.push(logEntry(state, `The hit on the ${target.name} fails. ${target.boss.name} now knows you were involved.`, 'criminalworld'));
        }
      } else if (optionId === 'warn') {
        target.relationToPlayer = clamp(target.relationToPlayer + 15, -100, 100);
        addRep(state, 'street', 2);
        state.eventLog.push(logEntry(state, `You tip off ${target.boss.name}. The ${target.name} owe you, for now.`, 'criminalworld'));
      } else {
        state.eventLog.push(logEntry(state, `You stay out of the council's business with the ${target.name}.`, 'criminalworld'));
      }
      break;
    }

    case 'police_fund': {
      const cost = decision.context.cost;
      if (optionId === 'contribute') {
        if (state.player.cash.dirty >= cost) {
          state.player.cash.dirty -= cost;
          addHeat(state, 'pd', -15);
          state.eventLog.push(logEntry(state, `You chip in ${fmtMoney(cost)} to the joint police fund. PD Heat eases citywide.`, 'criminalworld'));
        } else {
          state.eventLog.push(logEntry(state, `You can't afford the ${fmtMoney(cost)} contribution to the police fund.`, 'criminalworld'));
        }
      } else {
        state.eventLog.push(logEntry(state, `You decline to contribute to the police fund.`, 'criminalworld'));
      }
      break;
    }

    case 'smuggling_pact': {
      const gang = state.gangs[decision.context.gangId];
      if (optionId === 'accept') {
        state.criminalWorld.smugglingBonusMult = CRIMINAL_WORLD_SMUGGLING_BONUS;
        state.criminalWorld.smugglingBonusTurns = CRIMINAL_WORLD_SMUGGLING_TURNS;
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer + 8, -100, 100);
        state.eventLog.push(logEntry(state, `You accept the joint smuggling route with the ${gang ? gang.name : 'allied family'}. Distribution capacity is up ${Math.round(CRIMINAL_WORLD_SMUGGLING_BONUS * 100)}% for the next ${CRIMINAL_WORLD_SMUGGLING_TURNS} turns.`, 'criminalworld'));
      } else {
        if (gang) gang.relationToPlayer = clamp(gang.relationToPlayer - 2, -100, 100);
        state.eventLog.push(logEntry(state, `You decline the joint route with the ${gang ? gang.name : 'allied family'}.`, 'criminalworld'));
      }
      break;
    }

    case 'tribute_demand': {
      const target = state.gangs[decision.context.gangId];
      const amount = decision.context.amount;
      if (!target) break;
      if (optionId === 'pay') {
        if (state.player.cash.dirty >= amount) {
          state.player.cash.dirty -= amount;
          target.relationToPlayer = clamp(target.relationToPlayer + 10, -100, 100);
          state.eventLog.push(logEntry(state, `You pay the ${fmtMoney(amount)} tribute. The ${target.name} are appeased.`, 'criminalworld'));
        } else {
          target.relationToPlayer = clamp(target.relationToPlayer - 10, -100, 100);
          state.eventLog.push(logEntry(state, `You can't cover the ${fmtMoney(amount)} tribute. The ${target.name} take note of your refusal by default.`, 'criminalworld'));
        }
      } else {
        target.relationToPlayer = clamp(target.relationToPlayer - 15, -100, 100);
        if (!target.atWarWithPlayer && Math.random() < 0.3) {
          target.atWarWithPlayer = true;
          target.alliedWithPlayer = false;
          if (!state.commission.warTargets.includes(target.id)) state.commission.warTargets.push(target.id);
          state.eventLog.push(logEntry(state, `You refuse the tribute. The ${target.name} declare war over the insult.`, 'criminalworld'));
        } else {
          state.eventLog.push(logEntry(state, `You refuse the tribute. The ${target.name} are furious but hold back - for now.`, 'criminalworld'));
        }
      }
      break;
    }

    case 'territory_dispute': {
      const { districtId, gangAId, gangBId } = decision.context;
      const gangA = state.gangs[gangAId], gangB = state.gangs[gangBId];
      if (!gangA || !gangB) break;
      if (optionId === 'backA') {
        shiftControl(state, districtId, gangBId, gangAId, 5);
        gangA.relationToPlayer = clamp(gangA.relationToPlayer + 10, -100, 100);
        gangB.relationToPlayer = clamp(gangB.relationToPlayer - 8, -100, 100);
        state.eventLog.push(logEntry(state, `You back the ${gangA.name} in their dispute with the ${gangB.name}.`, 'criminalworld'));
      } else if (optionId === 'backB') {
        shiftControl(state, districtId, gangAId, gangBId, 5);
        gangB.relationToPlayer = clamp(gangB.relationToPlayer + 10, -100, 100);
        gangA.relationToPlayer = clamp(gangA.relationToPlayer - 8, -100, 100);
        state.eventLog.push(logEntry(state, `You back the ${gangB.name} in their dispute with the ${gangA.name}.`, 'criminalworld'));
      } else {
        state.eventLog.push(logEntry(state, `You stay neutral in the ${gangA.name}-${gangB.name} dispute.`, 'criminalworld'));
      }
      break;
    }

    case 'informant_purge': {
      if (optionId === 'support') {
        addHeat(state, 'pd', -5);
        addHeat(state, 'gangs', 3);
        state.eventLog.push(logEntry(state, `The purge goes ahead. A few informants vanish; the police lose a step.`, 'criminalworld'));
      } else {
        addRep(state, 'street', 3);
        for (const g of getCouncilGangs(state)) {
          if (!g.eliminated) g.relationToPlayer = clamp(g.relationToPlayer - 3, -100, 100);
        }
        state.eventLog.push(logEntry(state, `You quietly protect your own contact. The council notices your evasiveness.`, 'criminalworld'));
      }
      break;
    }

    case 'cartel_shipment': {
      const amount = decision.context.amount;
      if (optionId === 'take') {
        addCash(state, amount, 0);
        addHeat(state, 'feds', 10);
        state.eventLog.push(logEntry(state, `You take the cut: ${fmtMoney(amount)} in dirty cash, but the Feds are watching cartel activity closer now.`, 'criminalworld'));
      } else {
        addRep(state, 'cartel', 2);
        state.eventLog.push(logEntry(state, `You pass on the shipment. The cartel appreciates your discretion.`, 'criminalworld'));
      }
      break;
    }

    case 'weapons_cache': {
      const amount = decision.context.amount;
      if (optionId === 'claim') {
        state.player.inventory.product.arms += amount;
        addHeat(state, 'pd', 4);
        state.eventLog.push(logEntry(state, `You claim the cache: +${amount} Arms added to your stash, but moving them drew attention. PD Heat +4.`, 'criminalworld'));
      } else {
        for (const g of getCouncilGangs(state)) {
          if (!g.eliminated) g.relationToPlayer = clamp(g.relationToPlayer + 3, -100, 100);
        }
        state.eventLog.push(logEntry(state, `You hand the cache over to the council. Every family on the council thinks a little better of you.`, 'criminalworld'));
      }
      break;
    }

    case 'charity_gala': {
      const cost = decision.context.cost;
      if (optionId === 'attend') {
        if (state.player.cash.clean >= cost) {
          state.player.cash.clean -= cost;
          addRep(state, 'street', 6);
          addHeat(state, 'pd', -5);
          state.eventLog.push(logEntry(state, `You attend the gala and donate ${fmtMoney(cost)}. Your name is spoken kindly in polite company, and PD Heat eases.`, 'criminalworld'));
        } else {
          state.eventLog.push(logEntry(state, `You can't cover the ${fmtMoney(cost)} donation, so you skip the gala.`, 'criminalworld'));
        }
      } else {
        state.eventLog.push(logEntry(state, `You skip the charity gala. No one really expected you to show anyway.`, 'criminalworld'));
      }
      break;
    }

    case 'hostage_negotiation': {
      const gang = state.gangs[decision.context.gangId];
      const amount = decision.context.amount;
      if (!gang) break;
      if (optionId === 'broker') {
        gang.relationToPlayer = clamp(gang.relationToPlayer + 10, -100, 100);
        addRep(state, 'street', 3);
        state.eventLog.push(logEntry(state, `You broker a clean trade. Both sides walk away whole, and the ${gang.name} owe you one.`, 'criminalworld'));
      } else if (optionId === 'exploit') {
        addCash(state, amount, 0);
        gang.relationToPlayer = clamp(gang.relationToPlayer - 10, -100, 100);
        state.eventLog.push(logEntry(state, `You tip the trade in your favor, walking away with ${fmtMoney(amount)}. The ${gang.name} won't forget it.`, 'criminalworld'));
      } else {
        state.eventLog.push(logEntry(state, `You stay out of the standoff and let the two crews sort it out themselves.`, 'criminalworld'));
      }
      break;
    }

    case 'political_funding': {
      const cost = decision.context.cost;
      if (optionId === 'fund') {
        if (state.player.cash.dirty + state.player.cash.clean >= cost) {
          let remaining = cost;
          const dirtyUsed = Math.min(state.player.cash.dirty, remaining);
          state.player.cash.dirty -= dirtyUsed;
          remaining -= dirtyUsed;
          state.player.cash.clean -= remaining;
          addHeat(state, 'pd', -8);
          addHeat(state, 'feds', -4);
          state.eventLog.push(logEntry(state, `You chip in ${fmtMoney(cost)} for a friendly candidate. PD and Federal Heat both ease citywide.`, 'criminalworld'));
        } else {
          state.eventLog.push(logEntry(state, `You can't cover the ${fmtMoney(cost)} the council wants for the campaign.`, 'criminalworld'));
        }
      } else {
        state.eventLog.push(logEntry(state, `You decline to fund the council's candidate.`, 'criminalworld'));
      }
      break;
    }
  }
}

/* ---------------- Turn Ticks ---------------- */

function criminalWorldTick(state) {
  checkCriminalWorldUnlock(state);
  if (!state.criminalWorld.unlocked) return;

  if (state.criminalWorld.smugglingBonusTurns > 0) {
    state.criminalWorld.smugglingBonusTurns--;
    if (state.criminalWorld.smugglingBonusTurns <= 0) {
      state.criminalWorld.smugglingBonusTurns = 0;
      state.criminalWorld.smugglingBonusMult = 0;
    }
  }

  if (state.criminalWorld.decision) {
    state.eventLog.push(logEntry(state, `The council moved on from "${state.criminalWorld.decision.title}" without your input.`, 'criminalworld'));
  }

  const decision = generateCouncilDecision(state);
  state.criminalWorld.decision = decision;
  if (decision) {
    state.eventLog.push(logEntry(state, `Council matter before you: ${decision.title}`, 'criminalworld'));
  }
}

function gangRelationsTick(state) {
  for (const gang of getCouncilGangs(state)) {
    if (gang.eliminated) continue;
    if (gang.alliedWithPlayer && Math.random() < 0.15) {
      const bonus = 1000 + Math.floor(Math.random() * 4000);
      addCash(state, bonus, 0);
      state.eventLog.push(logEntry(state, `Your allies in the ${gang.name} kicked back ${fmtMoney(bonus)} from a joint venture.`, 'criminalworld'));
    }
    if (gang.atWarWithPlayer && Math.random() < 0.12) {
      raidByGang(state, gang);
    }
  }
}

function raidByGang(state, gang) {
  const roll = Math.random();
  if (roll < 0.4 && state.ownedBusinesses.length) {
    const undamaged = state.ownedBusinesses.filter(b => !b.damaged);
    if (undamaged.length) {
      const biz = undamaged[Math.floor(Math.random() * undamaged.length)];
      biz.damaged = true;
      state.eventLog.push(logEntry(state, `${gang.name} torched your ${biz.type} in ${state.districts[biz.districtId].name}.`, 'criminalworld'));
      return;
    }
  }
  if (roll < 0.7 && state.player.cash.dirty > 0) {
    const loss = Math.round(state.player.cash.dirty * 0.08);
    if (loss > 0) {
      state.player.cash.dirty -= loss;
      state.eventLog.push(logEntry(state, `${gang.name} hit one of your stashes, making off with ${fmtMoney(loss)}.`, 'criminalworld'));
      return;
    }
  }
  state.player.crew.loyalty = clamp(state.player.crew.loyalty - 4, 0, 100);
  state.eventLog.push(logEntry(state, `${gang.name} ambushed your crew. Loyalty -4 as your people grow nervous.`, 'criminalworld'));
}
