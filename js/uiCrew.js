/* ============================================================
   UNDERWORLD - UI: Crew / Gang Tab (Affiliation, Armory, Lieutenants)
   ============================================================ */

function renderCrew() {
  return `
    ${renderAffiliationCard()}
    ${renderCrewStatsCard()}
    ${renderTrainingCard()}
    ${renderLieutenantsCard()}
    ${renderArmoryCard()}
    ${renderVehiclesCard()}
  `;
}

function renderAffiliationCard() {
  const p = GAME.player;
  let body = '';

  const repBars = `
    <div class="row between"><span>Rank</span><span>${p.rank}</span></div>
    ${statBar('Gang Rep', p.reputation.gang, 100, 'rep-gang')}
    ${statBar('Cartel Rep', p.reputation.cartel, 100, 'rep-cartel')}
    <hr class="sep" />
  `;

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
      <h3>Found Your Own Gang (requires Gang Rep 30+)</h3>
      <div class="row">
        <input type="text" id="found-gang-name" placeholder="Gang name" />
        <button onclick="actionFoundGang()" ${canFoundGang(GAME) ? '' : 'disabled'}>Found Gang</button>
      </div>
    `;
  } else {
    const gang = GAME.gangs[p.affiliation.gangId];
    const territories = gang.territory.map(id => GAME.districts[id].name).join(', ') || 'none yet';
    const leaveLabel = p.affiliation.type === 'founder' ? 'Disband Gang' : 'Leave Gang';
    body = `
      <p>You are ${p.affiliation.type === 'founder' ? 'the founder and boss of' : 'a member of'} <span class="tag" style="border-color:${gang.color}">${gang.name}</span>.</p>
      ${p.affiliation.type === 'member' ? `<p class="muted">Led by ${gang.boss.name} (${gang.boss.personality}).</p>` : ''}
      <p class="muted">Territory: ${territories}</p>
      ${p.affiliation.type === 'founder' ? `<p class="small muted" style="margin-top:4px;">Crew now handles street crimes and heists for you - click an activity and one of your crew gets sent to do it.</p>` : ''}
      <button class="btn-danger" onclick="actionLeaveGang()">${leaveLabel}</button>
      ${p.affiliation.type === 'founder' ? `<p class="small muted" style="margin-top:4px;">Disbanding hands your territory to the remaining families and costs you Gang Rep.</p>` : `<p class="small muted" style="margin-top:4px;">Leaving costs you Gang Rep and damages your standing with ${gang.name}.</p>`}
      ${p.affiliation.type === 'founder' ? renderImprisonedCrewSection(p) : ''}
    `;
  }

  return `<div class="card"><h2>Gang Affiliation</h2>${repBars}${body}</div>`;
}

function renderImprisonedCrewSection(p) {
  const imprisoned = p.crew.imprisoned || 0;
  if (imprisoned <= 0) return '';
  return `
    <hr class="sep" />
    <h3>Imprisoned Crew (${imprisoned})</h3>
    <p class="muted small">Some of your crew got picked up on the job and are sitting in lockup.</p>
    <div class="row">
      <button class="btn-small" onclick="actionHireCrewLawyer()">Hire a Lawyer (${fmtMoney(CREW_LAWYER_COST)})</button>
      <button class="btn-danger btn-small" onclick="actionSilenceCrew()">Silence (Loyalty -8)</button>
    </div>
  `;
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

  const rows = lts.map(lt => {
    const assignmentDef = lt.assignment ? LIEUTENANT_ASSIGNMENTS.find(a => a.id === lt.assignment.type) : null;
    const current = assignmentDef ? `${assignmentDef.label} - ${GAME.districts[lt.assignment.districtId].name}` : 'Unassigned';
    const currentValue = lt.assignment ? `${lt.assignment.type}:${lt.assignment.districtId}` : 'none';
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${lt.name}</strong><span class="muted small">${current}</span></div>
        ${statBar('Loyalty', lt.loyalty, 100, 'loyalty')}
        <div class="row" style="margin-top:6px;">
          <select id="lt-assign-${lt.id}">
            <option value="none" ${currentValue === 'none' ? 'selected' : ''}>No Assignment</option>
            ${LIEUTENANT_ASSIGNMENTS.map(a => GAME.districts.map(d => `<option value="${a.id}:${d.id}" ${currentValue === `${a.id}:${d.id}` ? 'selected' : ''}>${a.label} - ${d.name}</option>`).join('')).join('')}
          </select>
          <button onclick="actionAssignLieutenant('${lt.id}')">Assign</button>
        </div>
        ${assignmentDef ? `<p class="muted small" style="margin-top:4px;">${assignmentDef.desc}</p>` : ''}
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
  const rows = WEAPON_TIERS.map(t => {
    const locked = !isUnlockedForRank(GAME, t.unlockRank);
    return `
    <div class="card" style="margin-bottom:6px;">
      <div class="row between">
        <strong>${t.label}</strong>
        <span class="muted small">Owned: ${GAME.player.armory[t.id]} &middot; Combat Bonus: +${t.combatBonus}</span>
      </div>
      ${locked ? `<p class="muted small">Unlocks at ${t.unlockRank}</p>` : `
      <div class="row" style="margin-top:6px;">
        <input type="number" id="buy-weapon-${t.id}" value="1" min="1" style="width:80px;" />
        <button onclick="actionBuyWeapons(${t.id})">Buy @ ${fmtMoney(t.unitCost)} each</button>
      </div>
      <div class="row" style="margin-top:6px;">
        <input type="number" id="armory-sell-${t.id}" value="1" min="1" style="width:80px;" />
        <button class="btn-small" onclick="actionSellWeapons(${t.id})" ${GAME.player.armory[t.id] > 0 ? '' : 'disabled'}>Sell @ ${fmtMoney(Math.round(t.unitCost * WEAPON_SELL_MULT))} each</button>
      </div>`}
    </div>
  `;
  }).join('');

  return `<div class="card"><h2>Armory</h2><p class="muted small">Equip your crew (size ${GAME.player.crew.size}) with enough units of a tier to raise your combat bonus.</p>${rows}</div>`;
}

function renderTrainingCard() {
  const completed = GAME.player.crew.trainingCompleted || [];
  const rows = TRAINING_PROGRAMS.map(p => {
    const done = completed.includes(p.id);
    const locked = !isUnlockedForRank(GAME, p.unlockRank);
    let actionHtml;
    if (done) {
      actionHtml = '<span class="tag clean">Completed</span>';
    } else if (locked) {
      actionHtml = `<span class="muted small">Unlocks at ${p.unlockRank}</span>`;
    } else {
      actionHtml = `<button class="btn-small" onclick="actionTrainCrew('${p.id}')" ${GAME.player.cash.dirty >= p.cost ? '' : 'disabled'}>Train @ ${fmtMoney(p.cost)}</button>`;
    }
    return `
      <div class="row between" style="margin-bottom:4px;">
        <span>${p.label} <span class="muted small">(${p.desc} - Quality +${p.qualityGain.toFixed(1)})</span></span>
        ${actionHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>Crew Training</h2>
      <p class="muted small">Permanent crew quality upgrades. Quality: ${GAME.player.crew.quality.toFixed(1)}</p>
      ${rows}
    </div>
  `;
}

function renderVehiclesCard() {
  const owned = GAME.player.vehicles || [];
  const totalCargo = totalVehicleCapacity(GAME);
  const totalUpkeep = totalVehicleUpkeep(GAME);

  const ownedRows = owned.length
    ? owned.map(v => {
        const def = VEHICLE_TYPES.find(t => t.id === v.typeId);
        return `
          <div class="row between" style="margin-bottom:4px;">
            <span>${def.label} <span class="muted small">(${fmtMoney(def.cargoCapacity)} cargo, ${fmtMoney(def.upkeep)}/turn upkeep)</span></span>
            <button class="btn-small" onclick="actionSellVehicle('${v.id}')">Sell @ ${fmtMoney(Math.round(def.cost * def.resaleMult))}</button>
          </div>
        `;
      }).join('')
    : '<p class="muted">No vehicles owned - distributors are limited to moving product on foot.</p>';

  const buyRows = VEHICLE_TYPES.map(t => {
    const locked = !isUnlockedForRank(GAME, t.unlockRank);
    return `
    <div class="row between" style="margin-bottom:4px;">
      <span>${t.label} <span class="muted small">(${fmtMoney(t.cargoCapacity)} cargo, ${t.crewCapacity} crew, ${fmtMoney(t.upkeep)}/turn upkeep)</span></span>
      ${locked
        ? `<span class="muted small">Unlocks at ${t.unlockRank}</span>`
        : `<button class="btn-small" onclick="actionBuyVehicle('${t.id}')" ${GAME.player.cash.dirty >= t.cost ? '' : 'disabled'}>Buy @ ${fmtMoney(t.cost)}</button>`}
    </div>
  `;
  }).join('');

  return `
    <div class="card">
      <h2>Vehicles (Distribution Fleet)</h2>
      <p class="muted small">Vehicles add cargo capacity that's shared across your distributors, letting them move far more product per turn than on foot.</p>
      <div class="row between"><span>Total Cargo Capacity</span><span>${fmtMoney(totalCargo)}</span></div>
      <div class="row between"><span>Total Vehicle Upkeep</span><span>${fmtMoney(totalUpkeep)}/turn</span></div>
      <hr class="sep" />
      <h3>Owned</h3>
      ${ownedRows}
      <hr class="sep" />
      <h3>Buy</h3>
      ${buyRows}
    </div>
  `;
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

function actionLeaveGang() {
  const res = leaveGang(GAME);
  if (!res.ok) showMsg('Gang Affiliation', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionRecruit() {
  const input = document.getElementById('recruit-count');
  const count = Math.max(1, parseInt(input.value, 10) || 1);
  const res = recruitCrew(GAME, count);
  if (!res.ok) showMsg('Recruiting', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionHireCrewLawyer() {
  const res = hireCrewLawyer(GAME);
  if (!res.ok) showMsg('Imprisoned Crew', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionSilenceCrew() {
  const res = silenceCrewMember(GAME);
  if (!res.ok) showMsg('Imprisoned Crew', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionBuyWeapons(tier) {
  const input = document.getElementById(`buy-weapon-${tier}`);
  const qty = Math.max(1, parseInt(input.value, 10) || 1);
  const res = buyWeapons(GAME, tier, qty);
  if (!res.ok) showMsg('Armory', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionTrainCrew(programId) {
  const res = trainCrew(GAME, programId);
  if (!res.ok) showMsg('Training', res.reason);
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
