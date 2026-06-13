/* ============================================================
   UNDERWORLD - UI: Finance, Family, Commission
   ============================================================ */

/* ---------------- Finance Tab ---------------- */

function renderFinance() {
  const p = GAME.player;
  const capacity = totalLaunderCapacity(GAME);

  const shellRows = GAME.shellCompanies.map(c => {
    const def = SHELL_TIERS[c.tier - 1];
    const next = SHELL_TIERS[c.tier];
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${c.name}</strong><span class="muted small">Tier ${c.tier}${c.auditCooldown > 0 ? ' - <span class="tag dirty">Under Audit</span>' : ''}</span></div>
        <div class="muted small">Launders ${fmtMoney(def.launderPerTurn)}/turn at ${Math.round(def.fee * 100)}% fee, audit risk ${def.auditRisk}%</div>
        ${next
          ? `<div class="row between" style="margin-top:4px;"><span class="small">Upgrade to Tier ${c.tier + 1}: ${fmtMoney(next.cost)} Clean Cash</span><button onclick="actionUpgradeShell('${c.id}')">Upgrade</button></div>`
          : `<div class="small muted" style="margin-top:4px;">Maximum cover tier.</div>`}
      </div>
    `;
  }).join('');

  const marketCards = GAME.districts.map(d => {
    const listings = GAME.businessMarket[d.id];
    if (!listings.length) return '';
    const rows = listings.map(b => `
      <div class="row between">
        <span>${b.type} - ${fmtMoney(b.price)} <span class="muted small">(+${fmtMoney(b.baseIncome)}/turn, +${fmtMoney(b.launderBonus)} launder cap, -${b.heatReduction} heat)</span></span>
        <button onclick="actionBuyBusiness(${d.id}, '${b.id}')" ${p.cash.clean >= b.price ? '' : 'disabled'}>Buy</button>
      </div>
    `).join('');
    return `<div class="card" style="margin-bottom:6px;"><h3>${d.name}</h3>${rows}</div>`;
  }).join('');

  const ownedRows = GAME.ownedBusinesses.map(b => {
    const d = GAME.districts[b.districtId];
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${b.type}</strong><span class="muted small">${d.name}${b.damaged ? ' - <span class="tag dirty">Damaged</span>' : ''}</span></div>
        <div class="muted small">Income: ${fmtMoney(b.damaged ? 0 : b.baseIncome)}/turn &middot; Resale: ${fmtMoney(resaleValue(GAME, b.id))}</div>
        <div class="row" style="margin-top:4px;">
          ${b.damaged ? `<button onclick="actionRepairBusiness('${b.id}')">Repair (${fmtMoney(Math.round(b.purchasePrice * 0.25))})</button>` : ''}
          <button class="btn-danger" onclick="actionSellBusiness('${b.id}')">Sell</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>Cash</h2>
      <div class="row between"><span>Dirty Cash</span><span class="tag dirty">${fmtMoney(p.cash.dirty)}</span></div>
      <div class="row between"><span>Clean Cash</span><span class="tag clean">${fmtMoney(p.cash.clean)}</span></div>
      <div class="muted small" style="margin-top:6px;">Laundering capacity: ${fmtMoney(capacity)}/turn. Excess dirty cash raises Federal Heat.</div>
    </div>

    <div class="card">
      <h2>Launder via Street Contacts</h2>
      <p class="muted small">No shell company? Outside fixers will launder Dirty Cash for you on the spot, taking a steep ${Math.round(GANG_LAUNDER_CUT * 100)}% cut. Always available, but raises Gang Heat slightly. Shell companies and business fronts offer much better rates.</p>
      <div class="row">
        <input type="number" id="launder-gang-amount" placeholder="Amount ($)" min="0" style="width:140px;" />
        <button onclick="actionLaunderViaGangs()" ${p.cash.dirty > 0 ? '' : 'disabled'}>Launder</button>
      </div>
    </div>

    <div class="card">
      <h2>Shell Companies</h2>
      ${shellRows || '<p class="muted">None established.</p>'}
      <div class="row">
        <input type="text" id="shell-name" placeholder="Company name (optional)" />
        <button onclick="actionEstablishShell()">Establish (${fmtMoney(SHELL_TIERS[0].cost)} Clean Cash)</button>
      </div>
    </div>

    <div class="card">
      <h2>Business Fronts - Marketplace</h2>
      ${marketCards || '<p class="muted">No listings remaining.</p>'}
    </div>

    <div class="card">
      <h2>Owned Businesses</h2>
      ${ownedRows || '<p class="muted">You own no businesses yet.</p>'}
    </div>
  `;
}

function actionEstablishShell() {
  const input = document.getElementById('shell-name');
  const res = establishShellCompany(GAME, input.value.trim());
  if (!res.ok) showMsg('Shell Company', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionUpgradeShell(id) {
  const res = upgradeShellCompany(GAME, id);
  if (!res.ok) showMsg('Shell Company', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionBuyBusiness(districtId, marketId) {
  const res = buyBusiness(GAME, districtId, marketId);
  if (!res.ok) showMsg('Business Front', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionSellBusiness(id) {
  sellBusiness(GAME, id);
  autosave(GAME);
  renderApp();
}

function actionRepairBusiness(id) {
  const res = repairBusiness(GAME, id);
  if (!res.ok) showMsg('Repair', res.reason);
  else { autosave(GAME); renderApp(); }
}

/* ---------------- Family Tab ---------------- */

function renderFamily() {
  const rows = GAME.family.map(m => {
    if (!m.alive) {
      return `<div class="card" style="margin-bottom:6px; opacity:0.6;"><div class="row between"><strong>${m.name}</strong><span class="tag dirty">Deceased</span></div><div class="muted small">${m.relation}</div></div>`;
    }
    const roleOptions = ['', ...Object.keys(FAMILY_ROLES)].map(r => `<option value="${r}" ${m.role === r || (!m.role && r === '') ? 'selected' : ''}>${r ? FAMILY_ROLES[r].label : 'Unassigned'}</option>`).join('');

    let captureBlock = '';
    if (m.captured) {
      captureBlock = `
        <div class="card" style="margin-top:6px; border-color: var(--red);">
          <strong style="color:var(--red-bright)">CAPTURED</strong> - Ransom: ${fmtMoney(m.ransom)} (${m.ransomDeadline} turn(s) left)
          <div class="row" style="margin-top:4px;">
            <button onclick="actionPayRansom('${m.id}')">Pay Ransom</button>
            <button onclick="actionRescue('${m.id}')">Attempt Rescue</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${m.name}</strong><span class="muted small">${m.relation} &middot; ${m.traits.join(', ')}</span></div>
        ${statBar('Loyalty / Affection', m.loyalty, 100, 'loyalty')}
        <div class="row" style="margin-top:6px;">
          <select id="role-${m.id}" onchange="actionAssignFamilyRole('${m.id}')">${roleOptions}</select>
        </div>
        ${Object.values(FAMILY_ROLES).map(r => m.role === r.id ? `<div class="muted small" style="margin-top:4px;">${r.desc}</div>` : '').join('')}
        ${captureBlock}
      </div>
    `;
  }).join('');

  return `<div class="card"><h2>Family Council</h2><p class="muted">Assign roles to active family members. Captured family members must be ransomed or rescued.</p>${rows}</div>`;
}

function actionAssignFamilyRole(memberId) {
  const select = document.getElementById(`role-${memberId}`);
  const role = select.value || null;
  assignFamilyRole(GAME, memberId, role);
  autosave(GAME);
  renderApp();
}

function actionPayRansom(memberId) {
  const ok = payRansom(GAME, memberId);
  if (!ok) showMsg('Ransom', 'Not enough cash to pay the ransom.');
  else { autosave(GAME); renderApp(); }
}

function actionRescue(memberId) {
  attemptRescue(GAME, memberId);
  autosave(GAME);
  renderApp();
}

/* ---------------- Commission Tab ---------------- */

function renderCommission() {
  if (!canAccessCommission(GAME)) {
    return `<div class="card"><h2>Commission</h2><p class="muted">Reach Boss rank to earn a seat at the table.</p></div>`;
  }

  const myGangId = playerGangId(GAME);
  const myDistricts = myGangId
    ? GAME.districts.filter(d => (d.control[myGangId] || 0) > 0)
    : [];

  const gangCards = getCouncilGangs(GAME).map(g => {
    const status = g.atWarWithPlayer ? '<span class="tag dirty">AT WAR</span>' : (g.alliedWithPlayer ? '<span class="tag clean">ALLIED</span>' : '');
    const tradeTargets = GAME.districts.filter(d => (d.control[g.id] || 0) > 0);

    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong><span class="tag" style="border-color:${g.color}">${g.name}</span> - ${g.boss.name}</strong>${status}</div>
        <div class="muted small">Personality: ${g.boss.personality} (${PERSONALITY_DESC[g.boss.personality]})</div>
        ${statBar('Relation', g.relationToPlayer + 100, 200, 'rep-gang', `${g.relationToPlayer}`)}
        <div class="row" style="margin-top:6px;">
          <button onclick="actionProposeTruce('${g.id}')">Propose Truce</button>
          <button onclick="actionProposeAlliance('${g.id}')">Propose Alliance</button>
          ${g.atWarWithPlayer
            ? `<button onclick="actionOfferPeace('${g.id}')">Offer Peace</button>`
            : `<button class="btn-danger" onclick="actionDeclareWar('${g.id}')">Declare War</button>`}
        </div>
        ${myDistricts.length && tradeTargets.length ? `
          <hr class="sep" />
          <div class="small muted">Propose Territory Trade</div>
          <div class="row" style="margin-top:4px;">
            <select id="trade-give-${g.id}">${myDistricts.map(d => `<option value="${d.id}">Give: ${d.name} (${Math.round(d.control[myGangId])}%)</option>`).join('')}</select>
            <select id="trade-take-${g.id}">${tradeTargets.map(d => `<option value="${d.id}">Take: ${d.name} (${Math.round(d.control[g.id])}%)</option>`).join('')}</select>
            <input type="number" id="trade-pct-${g.id}" value="10" min="1" max="50" style="width:70px;" />
            <button onclick="actionProposeTrade('${g.id}')">Propose</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `<div class="card"><h2>The Commission</h2><p class="muted">A council of the city's bosses. Tread carefully.</p>${gangCards}</div>`;
}

function actionProposeTruce(gangId) { proposeTruce(GAME, gangId); autosave(GAME); renderApp(); }
function actionProposeAlliance(gangId) { proposeAlliance(GAME, gangId); autosave(GAME); renderApp(); }
function actionDeclareWar(gangId) { declareWar(GAME, gangId); autosave(GAME); renderApp(); }
function actionOfferPeace(gangId) { offerPeace(GAME, gangId); autosave(GAME); renderApp(); }

function actionProposeTrade(gangId) {
  const give = parseInt(document.getElementById(`trade-give-${gangId}`).value, 10);
  const take = parseInt(document.getElementById(`trade-take-${gangId}`).value, 10);
  const pct = parseInt(document.getElementById(`trade-pct-${gangId}`).value, 10) || 10;
  const res = proposeTerritoryTrade(GAME, gangId, give, take, pct);
  if (!res.ok) showMsg('Territory Trade', res.reason);
  else { autosave(GAME); renderApp(); }
}
