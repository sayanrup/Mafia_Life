/* ============================================================
   UNDERWORLD - UI: Criminal World (Inter-Gang Council)
   ============================================================ */

function renderCriminalWorld() {
  const cw = GAME.criminalWorld;

  let decisionCard;
  if (cw.decision) {
    const d = cw.decision;
    decisionCard = `
      <div class="card council-decision">
        <h2>${d.title}</h2>
        <p>${d.description}</p>
        <div class="row" style="flex-wrap:wrap; gap:6px;">
          ${d.options.map(o => `<button onclick="actionResolveCouncilDecision('${o.id}')">${o.label}</button>`).join('')}
        </div>
      </div>
    `;
  } else {
    decisionCard = `<div class="card"><h2>Council Floor</h2><p class="muted">No matters are before the council right now. End your turn to see what comes up next.</p></div>`;
  }

  const activeGangs = getCouncilGangs(GAME);
  const eliminatedGangs = Object.values(GAME.gangs).filter(g => !g.isPlayerGang && g.eliminated);

  const gangCards = activeGangs.map(g => {
    const status = g.atWarWithPlayer ? '<span class="tag dirty">AT WAR</span>' : (g.alliedWithPlayer ? '<span class="tag clean">ALLIED</span>' : '');
    const territory = Math.round(gangTerritoryScore(GAME, g.id));
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong><span class="tag" style="border-color:${g.color}">${g.name}</span> - ${g.boss.name}</strong>${status}</div>
        <div class="muted small">Personality: ${g.boss.personality} (${PERSONALITY_DESC[g.boss.personality]}) &middot; Territory Index: ${territory}</div>
        <div class="muted small">Crew: ${g.crewSize || 0} &middot; Crew Skill: ${g.crewSkill || 0}/100 &middot; Treasury: ${fmtMoney(g.treasury || 0)}</div>
        ${statBar('Relation', g.relationToPlayer + 100, 200, 'rep-gang', `${g.relationToPlayer}`)}
        <div class="row" style="margin-top:6px;">
          <button onclick="actionProposeTruce('${g.id}')">Propose Truce</button>
          <button onclick="actionProposeAlliance('${g.id}')">Propose Alliance</button>
          ${g.atWarWithPlayer
            ? `<button onclick="actionOfferPeace('${g.id}')">Offer Peace</button>`
            : `<button class="btn-danger" onclick="actionDeclareWar('${g.id}')">Declare War</button>`}
        </div>
      </div>
    `;
  }).join('');

  const eliminatedRows = eliminatedGangs.map(g => `<div class="muted small">${g.name} - wiped off the map.</div>`).join('');

  const historyRows = cw.decisionHistory.map(h => `<div class="muted small">Day ${h.turn}: <strong>${h.title}</strong> - ${h.choice}</div>`).join('');

  const myGangId = playerGangId(GAME);
  const zoneLeaderRows = GAME.districts.map(d => {
    const domId = dominantGang(d);
    const dom = GAME.gangs[domId];
    const pct = Math.round(d.control[domId] || 0);
    const isPlayer = domId === myGangId;
    return `
      <div class="row between">
        <span>${d.name}</span>
        <span><span class="tag" style="border-color:${dom.color}">${dom.name}</span>${isPlayer ? ' <span class="tag clean">YOU</span>' : ''} - ${dom.boss.name} (${pct}%)</span>
      </div>
    `;
  }).join('');
  const zonesLed = myGangId ? GAME.districts.filter(d => dominantGang(d) === myGangId).length : 0;

  return `
    <div class="card">
      <h2>Criminal World</h2>
      <p class="muted">You've earned a seat among the city's true power brokers. Every turn the council brings a new matter before the families - your call shapes the streets, your revenue, and your standing with every other crew.</p>
      ${cw.smugglingBonusTurns > 0 ? `<div class="muted small">Active smuggling pact: +${Math.round(cw.smugglingBonusMult * 100)}% distribution capacity for ${cw.smugglingBonusTurns} more turn(s).</div>` : ''}
    </div>
    ${decisionCard}
    <div class="card">
      <h2>Zone Leaders</h2>
      <p class="muted small">Whichever family holds the most control in a district leads that zone. Lead every zone in ${GAME.meta.cityName} to take the city.${myGangId ? ` You currently lead ${zonesLed} of ${GAME.districts.length}.` : ''}</p>
      ${zoneLeaderRows}
    </div>
    <div class="card">
      <h2>Families</h2>
      ${gangCards || '<p class="muted">No other families remain.</p>'}
      ${eliminatedRows}
    </div>
    <div class="card">
      <h2>Council History</h2>
      ${historyRows || '<p class="muted">No matters resolved yet.</p>'}
    </div>
  `;
}
