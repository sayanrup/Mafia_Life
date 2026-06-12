/* ============================================================
   UNDERWORLD - UI: Crew / Gang Tab (Affiliation, Armory, Lieutenants)
   ============================================================ */

function renderCrew() {
  return `
    ${renderAffiliationCard()}
    ${renderCrewStatsCard()}
    ${renderLieutenantsCard()}
    ${renderArmoryCard()}
  `;
}

function renderAffiliationCard() {
  const p = GAME.player;
  let body = '';

  if (p.affiliation.type === 'solo') {
    const joinable = Object.values(GAME.gangs).filter(g => !g.isPlayerGang);
    const gangRows = joinable.map(g => `
      <div class="row between">
        <span><span class="tag" style="border-color:${g.color}">${g.name}</span> led by ${g.boss.name} (${g.boss.personality})</span>
        <button onclick="actionJoinGang('${g.id}')" ${canJoinGang(GAME, g.id) ? '' : 'disabled'}>Join</button>
      </div>
    `).join('');

    body = `
      <p class="muted">You're operating solo - no gang backing, no gang obligations.</p>
      <h3>Join an Existing Gang (requires Gang Rep 15+)</h3>
      ${gangRows}
      <hr class="sep" />
      <h3>Found Your Own Gang (requires Gang Rep 50+)</h3>
      <div class="row">
        <input type="text" id="found-gang-name" placeholder="Gang name" />
        <button onclick="actionFoundGang()" ${canFoundGang(GAME) ? '' : 'disabled'}>Found Gang</button>
      </div>
      ${!canFoundGang(GAME) ? `<p class="small muted">Current Gang Rep: ${Math.round(p.reputation.gang)} / 50</p>` : ''}
    `;
  } else {
    const gang = GAME.gangs[p.affiliation.gangId];
    const territories = gang.territory.map(id => GAME.districts[id].name).join(', ') || 'none yet';
    body = `
      <p>You are ${p.affiliation.type === 'founder' ? 'the founder and boss of' : 'a member of'} <span class="tag" style="border-color:${gang.color}">${gang.name}</span>.</p>
      ${p.affiliation.type === 'member' ? `<p class="muted">Led by ${gang.boss.name} (${gang.boss.personality}).</p>` : ''}
      <p class="muted">Territory: ${territories}</p>
    `;
  }

  return `<div class="card"><h2>Gang Affiliation</h2>${body}</div>`;
}

function renderCrewStatsCard() {
  const p = GAME.player;
  const cap = getCrewCap(GAME);
  const upkeep = totalUpkeepCost(GAME);
  return `
    <div class="card">
      <h2>Crew</h2>
      <div class="row between"><span>Size</span><span>${p.crew.size} / ${cap}</span></div>
      <div class="row between"><span>Quality</span><span>${p.crew.quality.toFixed(1)}</span></div>
      <div class="row between"><span>Equipped Weapon Tier</span><span>${WEAPON_TIERS[p.crew.weaponTier].label}</span></div>
      ${statBar('Loyalty', p.crew.loyalty, 100, 'loyalty')}
      <hr class="sep" />
      <div class="row between">
        <span>Upkeep this turn: ${fmtMoney(upkeep)} ${p.crew.upkeepPaid ? '<span class="tag clean">Paid</span>' : '<span class="tag dirty">Unpaid</span>'}</span>
      </div>
      <label style="display:flex; align-items:center; gap:6px; margin-top:4px;">
        <input type="checkbox" id="auto-upkeep" style="width:auto;" ${p.crew.autoPayUpkeep ? 'checked' : ''} onchange="actionToggleAutoUpkeep()" />
        <span class="small">Automatically pay crew upkeep each turn if affordable</span>
      </label>
      <div class="row" style="margin-top:6px;">
        <input type="number" id="recruit-count" value="1" min="1" style="width:80px;" />
        <button onclick="actionRecruit()">Recruit (${fmtMoney(RECRUIT_COST)} each)</button>
      </div>
    </div>
  `;
}

function renderLieutenantsCard() {
  const lts = GAME.player.lieutenants;
  const districtOptions = GAME.districts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  const rows = lts.map(lt => {
    const current = lt.assignment ? `${lt.assignment.type === 'district' ? 'Running ops in' : 'Smuggling via'} ${GAME.districts[lt.assignment.districtId].name}` : 'Unassigned';
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${lt.name}</strong><span class="muted small">${current}</span></div>
        ${statBar('Loyalty', lt.loyalty, 100, 'loyalty')}
        <div class="row" style="margin-top:6px;">
          <select id="lt-assign-${lt.id}">
            <option value="none">No Assignment</option>
            ${GAME.districts.map(d => `<option value="district:${d.id}">Run Operations - ${d.name}</option>`).join('')}
            ${GAME.districts.map(d => `<option value="smuggling:${d.id}">Lead Smuggling - ${d.name}</option>`).join('')}
          </select>
          <button onclick="actionAssignLieutenant('${lt.id}')">Assign</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>Lieutenants (${lts.length} / ${maxLieutenants(GAME)})</h2>
      ${rows || '<p class="muted">No lieutenants promoted yet.</p>'}
      <button onclick="actionPromoteLieutenant()" ${canPromoteLieutenant(GAME) ? '' : 'disabled'}>Promote a Lieutenant (requires Loyalty 65+)</button>
    </div>
  `;
}

function renderArmoryCard() {
  const rows = WEAPON_TIERS.map(t => `
    <div class="card" style="margin-bottom:6px;">
      <div class="row between">
        <strong>${t.label}</strong>
        <span class="muted small">Owned: ${GAME.player.armory[t.id]} &middot; Combat Bonus: +${t.combatBonus}</span>
      </div>
      <div class="row" style="margin-top:6px;">
        <input type="number" id="buy-weapon-${t.id}" value="1" min="1" style="width:80px;" />
        <button onclick="actionBuyWeapons(${t.id})">Buy @ ${fmtMoney(t.unitCost)} each</button>
      </div>
    </div>
  `).join('');

  return `<div class="card"><h2>Armory</h2><p class="muted small">Equip your crew (size ${GAME.player.crew.size}) with enough units of a tier to raise your combat bonus.</p>${rows}</div>`;
}

/* ---------------- Action Handlers ---------------- */

function actionJoinGang(gangId) {
  if (!canJoinGang(GAME, gangId)) return;
  joinGang(GAME, gangId);
  autosave(GAME);
  renderApp();
}

function actionFoundGang() {
  if (!canFoundGang(GAME)) return;
  const nameInput = document.getElementById('found-gang-name');
  const name = (nameInput && nameInput.value.trim()) || `${GAME.player.name}'s Crew`;
  foundGang(GAME, name);
  autosave(GAME);
  renderApp();
}

function actionRecruit() {
  const input = document.getElementById('recruit-count');
  const count = Math.max(1, parseInt(input.value, 10) || 1);
  const res = recruitCrew(GAME, count);
  if (!res.ok) showMsg('Recruiting', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionBuyWeapons(tier) {
  const input = document.getElementById(`buy-weapon-${tier}`);
  const qty = Math.max(1, parseInt(input.value, 10) || 1);
  const res = buyWeapons(GAME, tier, qty);
  if (!res.ok) showMsg('Armory', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionPromoteLieutenant() {
  const res = promoteLieutenant(GAME);
  if (!res.ok) showMsg('Lieutenants', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionToggleAutoUpkeep() {
  GAME.player.crew.autoPayUpkeep = !GAME.player.crew.autoPayUpkeep;
  autosave(GAME);
}

function actionAssignLieutenant(ltId) {
  const select = document.getElementById(`lt-assign-${ltId}`);
  const val = select.value;
  let assignment = null;
  if (val !== 'none') {
    const [type, districtId] = val.split(':');
    assignment = { type, districtId: parseInt(districtId, 10) };
  }
  assignLieutenant(GAME, ltId, assignment);
  autosave(GAME);
  renderApp();
}
