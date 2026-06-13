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
    const nextLocked = next && !isUnlockedForRank(GAME, next.unlockRank);
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${c.name}</strong><span class="muted small">Tier ${c.tier}${c.auditCooldown > 0 ? ' - <span class="tag dirty">Under Audit</span>' : ''}</span></div>
        <div class="muted small">Launders ${fmtMoney(def.launderPerTurn)}/turn at ${Math.round(def.fee * 100)}% fee, audit risk ${def.auditRisk}%</div>
        ${next
          ? (nextLocked
              ? `<div class="small muted" style="margin-top:4px;">Tier ${c.tier + 1} unlocks at ${next.unlockRank}</div>`
              : `<div class="row between" style="margin-top:4px;"><span class="small">Upgrade to Tier ${c.tier + 1}: ${fmtMoney(next.cost)} Clean Cash</span><button onclick="actionUpgradeShell('${c.id}')">Upgrade</button></div>`)
          : `<div class="small muted" style="margin-top:4px;">Maximum cover tier.</div>`}
      </div>
    `;
  }).join('');

  const currentDistrict = GAME.districts[GAME.player.currentDistrict];
  const currentListings = GAME.businessMarket[GAME.player.currentDistrict] || [];
  const marketCards = currentListings.length ? currentListings.map(b => {
    const nextUpgradeCost = businessUpgradeCost(b.price, 1);
    return `
      <div class="row between">
        <span>${b.type} <span class="muted small">(Buy: ${fmtMoney(b.price)} &middot; Lvl 2 upgrade: ${fmtMoney(nextUpgradeCost)})</span></span>
        <button onclick="actionBuyBusiness(${GAME.player.currentDistrict}, '${b.id}')" ${p.cash.clean >= b.price ? '' : 'disabled'}>Buy</button>
      </div>
    `;
  }).join('') : '<p class="muted">No listings remaining here.</p>';

  const ownedByDistrict = {};
  for (const b of GAME.ownedBusinesses) {
    (ownedByDistrict[b.districtId] = ownedByDistrict[b.districtId] || []).push(b);
  }
  const ownedRows = Object.keys(ownedByDistrict).map(districtId => {
    const d = GAME.districts[districtId];
    const rows = ownedByDistrict[districtId].map(b => {
      const upgradeCost = businessUpgradeCost(b.purchasePrice, b.level);
      const netWorth = getBusinessNetWorth(GAME, b.id);
      const lastProfit = (b.lastRevenue || 0) - (b.lastExpense || 0);
      return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${b.type}</strong><span class="muted small">Level ${b.level}${b.damaged ? ' - <span class="tag dirty">Damaged</span>' : ''}</span></div>
        <div class="muted small">Income: ${fmtMoney(b.damaged ? 0 : Math.round(b.baseIncome * businessLevelMult(b)))}/turn &middot; Protection: ${Math.round(b.protection || 0)}% &middot; Sell: ${fmtMoney(resaleValue(GAME, b.id))}</div>
        <div class="muted small" style="margin-top:2px;">Net Worth: ${fmtMoney(netWorth)} &middot; Last Turn Revenue: ${fmtMoney(b.lastRevenue || 0)} &middot; Expense: ${fmtMoney(b.lastExpense || 0)} &middot; Profit: ${fmtMoney(lastProfit)}</div>
        <div class="row" style="margin-top:4px; flex-wrap:wrap; gap:4px;">
          ${b.damaged ? `<button onclick="actionRepairBusiness('${b.id}')">Repair (${fmtMoney(Math.round(b.purchasePrice * 0.25))})</button>` : ''}
          ${upgradeCost != null ? `<button class="btn-small" onclick="actionUpgradeBusiness('${b.id}')">Upgrade to Lvl ${b.level + 1} (${fmtMoney(upgradeCost)})</button>` : '<span class="muted small">Max Level</span>'}
          <span class="row" style="gap:4px;"><input type="number" id="bribe-${b.id}-amount" value="500" min="1" style="width:80px;" /><button class="btn-small" onclick="actionBribeBusiness('${b.id}')">Bribe (Protection)</button></span>
          <button class="btn-danger" onclick="actionSellBusiness('${b.id}')">Sell</button>
        </div>
      </div>
    `;
    }).join('');
    return `<div class="card" style="margin-bottom:6px;"><h3>${d.name}</h3>${rows}</div>`;
  }).join('');

  const launderingMethodRows = LAUNDERING_METHODS.map(m => {
    const locked = !isUnlockedForRank(GAME, m.unlockRank);
    return `
      <div class="row between" style="margin-bottom:4px;">
        <span>${m.label} <span class="muted small">(${m.desc} ${Math.round(m.fee * 100)}% fee, +${m.heatAmount} ${m.heatTrack} heat)</span></span>
        ${locked
          ? `<span class="muted small">Unlocks at ${m.unlockRank}</span>`
          : `<span class="row" style="gap:6px;"><input type="number" id="launder-${m.id}-amount" placeholder="Amount ($)" min="0" style="width:120px;" /><button class="btn-small" onclick="actionLaunderViaMethod('${m.id}')" ${p.cash.dirty > 0 ? '' : 'disabled'}>Launder</button></span>`}
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
      <h2>Laundering Methods</h2>
      <p class="muted small">One-off launders for Dirty Cash. Higher-rank methods take a smaller cut but raise more heat on other tracks. Shell companies and business fronts launder automatically every turn on top of these.</p>
      ${launderingMethodRows}
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
      <h2>Business Fronts - Marketplace (${currentDistrict.name})</h2>
      ${marketCards}
    </div>

    <div class="card">
      <h2>Owned Businesses</h2>
      ${ownedRows || '<p class="muted">You own no businesses yet.</p>'}
    </div>
  `;
}

function actionLaunderViaMethod(methodId) {
  const input = document.getElementById(`launder-${methodId}-amount`);
  const amount = Math.max(0, parseInt(input.value, 10) || 0);
  const res = launderViaMethod(GAME, methodId, amount);
  if (!res.ok) showMsg('Laundering', res.reason);
  else { autosave(GAME); renderApp(); }
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

function actionUpgradeBusiness(id) {
  const res = upgradeBusiness(GAME, id);
  if (!res.ok) showMsg('Upgrade Business', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionBribeBusiness(id) {
  const input = document.getElementById(`bribe-${id}-amount`);
  const amount = Math.max(0, parseInt(input.value, 10) || 0);
  const res = bribeBusinessProtection(GAME, id, amount);
  if (!res.ok) showMsg('Bribe', res.reason);
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

  const roleList = Object.values(FAMILY_ROLES).map(r => `<li><strong>${r.label}</strong>: ${r.desc}</li>`).join('');

  return `
    <div class="card"><h2>Family Council</h2><p class="muted">Assign roles to active family members. Captured family members must be ransomed or rescued.</p>${rows}</div>
    <div class="card"><h3>Family Roles</h3><p class="muted small">Each role can only be held by one family member at a time.</p><ul class="small muted">${roleList}</ul></div>
  `;
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
        <div class="row" style="margin-top:6px;">
          <button onclick="actionDemandTribute('${g.id}')" ${g.atWarWithPlayer ? 'disabled' : ''}>Demand Tribute</button>
          <button onclick="actionRequestReinforcements('${g.id}')" ${g.alliedWithPlayer ? '' : 'disabled'}>Request Reinforcements</button>
          <button onclick="actionScoutGang('${g.id}')">Scout Territory</button>
        </div>
        <div class="row" style="margin-top:6px;">
          <input type="number" id="gift-amount-${g.id}" value="500" min="1" style="width:90px;" />
          <button onclick="actionSendGift('${g.id}')">Send Gift</button>
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

function actionDemandTribute(gangId) {
  const res = demandTribute(GAME, gangId);
  if (!res.ok) showMsg('Commission', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionRequestReinforcements(gangId) {
  const res = requestReinforcements(GAME, gangId);
  if (!res.ok) showMsg('Commission', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionScoutGang(gangId) {
  scoutGang(GAME, gangId);
  autosave(GAME);
  renderApp();
}

function actionSendGift(gangId) {
  const amount = parseInt(document.getElementById(`gift-amount-${gangId}`).value, 10) || 0;
  const res = sendGift(GAME, gangId, amount);
  if (!res.ok) showMsg('Commission', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionProposeTrade(gangId) {
  const give = parseInt(document.getElementById(`trade-give-${gangId}`).value, 10);
  const take = parseInt(document.getElementById(`trade-take-${gangId}`).value, 10);
  const pct = parseInt(document.getElementById(`trade-pct-${gangId}`).value, 10) || 10;
  const res = proposeTerritoryTrade(GAME, gangId, give, take, pct);
  if (!res.ok) showMsg('Territory Trade', res.reason);
  else { autosave(GAME); renderApp(); }
}
