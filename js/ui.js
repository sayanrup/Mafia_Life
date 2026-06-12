/* ============================================================
   UNDERWORLD - UI Core: Top Bar, Tabs, Home / Map / Operations /
   Inventory / Events
   ============================================================ */

let ACTIVE_TAB = 'home';
let MODAL = null; // {type:'gangwar', war} | {type:'gameover'} | {type:'msg', title, body}

const TAB_DEFS = [
  { id: 'home', label: 'Home' },
  { id: 'map', label: 'Map' },
  { id: 'operations', label: 'Operations' },
  { id: 'crew', label: 'Crew' },
  { id: 'finance', label: 'Finance' },
  { id: 'family', label: 'Family' },
  { id: 'commission', label: 'Commission', requires: 'commission' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'events', label: 'Events' },
  { id: 'settings', label: 'Settings' }
];

function setActiveTab(tab) {
  ACTIVE_TAB = tab;
  renderApp();
}

function renderApp() {
  const app = document.getElementById('app');
  if (!GAME) {
    app.innerHTML = renderCharacterCreation();
    return;
  }
  if (GAME.meta.gameOver) {
    app.innerHTML = renderGameOver();
    return;
  }
  app.innerHTML = renderTopBar() + renderTabBar() + `<div class="content">${renderTabContent()}</div>`;
  if (MODAL) {
    document.body.insertAdjacentHTML('beforeend', renderModal());
  } else {
    const existing = document.getElementById('modal-root');
    if (existing) existing.remove();
  }
}

// Hook for AI-enhanced narrative arriving asynchronously
window.onAINarrative = function () {
  if (ACTIVE_TAB === 'home' || ACTIVE_TAB === 'events') renderApp();
};

/* ---------------- Top Bar ---------------- */

function statBar(label, value, max, cls, displayOverride) {
  const pct = clamp((value / max) * 100, 0, 100);
  const display = displayOverride !== undefined ? displayOverride : `${Math.round(value)}/${max}`;
  return `<div>
    <div class="bar-label"><span>${label}</span><span>${display}</span></div>
    <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
  </div>`;
}

function renderTopBar() {
  const p = GAME.player;
  const era = GAME.meta.era === 'custom' ? GAME.meta.customEraText : ERAS[GAME.meta.era].label;
  return `
    <div class="topbar">
      <h1>Underworld</h1>
      <div class="topbar-sub">${p.name} - ${p.rank} of ${GAME.meta.cityName} &middot; ${era} &middot; Day ${GAME.meta.day}</div>
      <div class="stat-row">
        <div class="stat-chip cash-dirty"><span class="label">Dirty Cash</span><span class="value">${fmtMoney(p.cash.dirty)}</span></div>
        <div class="stat-chip cash-clean"><span class="label">Clean Cash</span><span class="value">${fmtMoney(p.cash.clean)}</span></div>
        <div class="stat-chip"><span class="label">Actions Left</span><span class="value">${p.actionsRemaining} / ${ACTIONS_PER_TURN}</span></div>
      </div>
      <div class="bar-group">
        ${statBar('Health', p.health, p.maxHealth, 'health')}
        ${statBar('PD Heat', p.heat.pd, 100, 'heat-pd')}
        ${statBar('Fed Heat', p.heat.feds, 100, 'heat-feds')}
        ${statBar('Gang Heat', p.heat.gangs, 100, 'heat-gangs')}
        ${statBar('Street Rep', p.reputation.street, 100, 'rep-street')}
        ${statBar('Gang Rep', p.reputation.gang, 100, 'rep-gang')}
        ${statBar('Cartel Rep', p.reputation.cartel, 100, 'rep-cartel')}
        ${statBar('Crew Loyalty', p.crew.loyalty, 100, 'loyalty')}
      </div>
    </div>
  `;
}

function renderTabBar() {
  return `<div class="tab-bar">
    ${TAB_DEFS.filter(t => !t.requires || (t.requires === 'commission' && GAME.commission.unlocked))
      .map(t => `<button class="tab-btn ${ACTIVE_TAB === t.id ? 'active' : ''}" onclick="setActiveTab('${t.id}')">${t.label}</button>`)
      .join('')}
  </div>`;
}

function renderTabContent() {
  switch (ACTIVE_TAB) {
    case 'home': return renderHome();
    case 'map': return renderMap();
    case 'operations': return renderOperations();
    case 'crew': return renderCrew();
    case 'finance': return renderFinance();
    case 'family': return renderFamily();
    case 'commission': return renderCommission();
    case 'inventory': return renderInventory();
    case 'events': return renderEvents();
    case 'settings': return renderSettings();
    default: return '';
  }
}

/* ---------------- Home Tab ---------------- */

function renderHome() {
  const p = GAME.player;
  const district = GAME.districts[p.currentDistrict];
  const gangsHere = Object.entries(district.control).map(([gid, pct]) => ({ gang: GAME.gangs[gid], pct }));

  const controlBar = gangsHere.map(g => `
    <div class="control-seg" style="width:${g.pct}%; background:${g.gang.color};" title="${g.gang.name}: ${Math.round(g.pct)}%">${Math.round(g.pct)}%</div>
  `).join('');

  const bossLines = gangsHere.map(g => `
    <div class="boss-line">
      <span><span class="tag" style="border-color:${g.gang.color}">${g.gang.name}</span> ${g.gang.boss.name}</span>
      <span class="personality-tag">${g.gang.boss.personality}${g.gang.atWarWithPlayer ? ' &middot; AT WAR' : ''}${g.gang.alliedWithPlayer ? ' &middot; ALLY' : ''}</span>
    </div>
  `).join('');

  const noAction = p.actionsRemaining <= 0;
  const noActionAttr = noAction ? 'disabled' : '';

  const hitTargets = gangsHere.filter(g => !g.gang.isPlayerGang).map(g => `<option value="${g.gang.id}">${g.gang.name}</option>`).join('');

  const routeTier = district.operations.route.tier;

  const productOptions = Object.keys(PRODUCT_TYPES).map(pt => {
    const owned = p.inventory.product[pt];
    const price = getDealPrice(GAME, district.id, pt);
    return `<option value="${pt}">${PRODUCT_TYPES[pt].label} (have ${owned}, ${fmtMoney(price)}/u)</option>`;
  }).join('');

  const travelButtons = GAME.districts.map(d => d.id === district.id
    ? `<button class="disabled" disabled>You are here: ${d.name}</button>`
    : `<button onclick="travelTo(${d.id})">Travel to ${d.name}</button>`
  ).join(' ');

  return `
    <div class="card">
      <h2>${district.name}</h2>
      <div class="control-bar">${controlBar}</div>
      ${bossLines}
      <div class="muted">District Heat: ${district.heat}/100</div>
    </div>

    <div class="card">
      <h2>Activities ${noAction ? '<span class="tag dirty">No actions left</span>' : ''}</h2>
      <div class="row">
        <button ${noActionAttr} onclick="actionMug()">Mug / Street Crime</button>
        <button ${noActionAttr} onclick="actionHeist()">Heist</button>
        <button ${noActionAttr} onclick="actionExtortion()">Extortion</button>
        <button ${noActionAttr} onclick="actionSmuggling()" ${routeTier === 0 ? 'disabled title="No smuggling route here"' : ''}>Smuggling Run</button>
      </div>

      <hr class="sep" />
      <h3>Hit / Intimidation</h3>
      ${hitTargets ? `
        <div class="row">
          <select id="hit-target">${hitTargets}</select>
          <button ${noActionAttr} onclick="actionHit()">Send a Message</button>
          <button ${noActionAttr} class="btn-danger" onclick="actionStartGangWar()">Start Gang War</button>
        </div>
      ` : '<p class="muted">No rival gang presence to target here.</p>'}

      <hr class="sep" />
      <h3>Deals (sell product)</h3>
      <div class="row">
        <select id="deal-product">${productOptions}</select>
        <input type="number" id="deal-qty" value="1" min="1" style="width:80px;" />
        <button onclick="actionSell()">Sell</button>
      </div>

      <hr class="sep" />
      <h3>Bribes</h3>
      ${renderBribeWidget(district)}
    </div>

    <div class="card">
      <h2>Travel</h2>
      <div class="row">${travelButtons}</div>
    </div>

    <div class="card">
      <h2>Turn ${GAME.meta.turn}</h2>
      <div class="row between">
        <span class="muted">${p.actionsRemaining} action(s) remaining this turn.</span>
        <button class="btn-primary" onclick="endTurn()">End Turn</button>
      </div>
    </div>

    <div class="card">
      <h2>Recent Activity</h2>
      ${renderLog(GAME.eventLog.slice(-12))}
    </div>
  `;
}

function renderBribeWidget(district) {
  const pdOptions = GAME.lawEnforcement.detectives.map(c => `<option value="${c.id}">${c.name} (${rankOf(c).name}, ${c.personality}) - ~${fmtMoney(baseBribeCost(c))}</option>`).join('');
  const fedOptions = GAME.lawEnforcement.agents.map(c => `<option value="${c.id}">${c.name} (${rankOf(c).name}, ${c.personality}) - ~${fmtMoney(baseBribeCost(c))}</option>`).join('');
  const rivalGangs = Object.entries(district.control).filter(([gid]) => !GAME.gangs[gid].isPlayerGang);
  const rivalOptions = rivalGangs.map(([gid]) => `<option value="${gid}">${GAME.gangs[gid].name}</option>`).join('');

  return `
    <div class="grid">
      <div>
        <label>Local PD Contact</label>
        <select id="bribe-pd">${pdOptions || '<option>None available</option>'}</select>
        <input type="number" id="bribe-pd-amount" placeholder="Offer amount ($)" min="0" style="margin-top:4px;" />
        <button onclick="actionBribePD()" ${pdOptions ? '' : 'disabled'} style="margin-top:4px;">Bribe PD</button>
      </div>
      <div>
        <label>Federal Contact</label>
        <select id="bribe-fed">${fedOptions || '<option>None available</option>'}</select>
        <input type="number" id="bribe-fed-amount" placeholder="Offer amount ($)" min="0" style="margin-top:4px;" />
        <button onclick="actionBribeFed()" ${fedOptions ? '' : 'disabled'} style="margin-top:4px;">Bribe Feds</button>
      </div>
      <div>
        <label>Rival Crew (this district)</label>
        <select id="bribe-rival">${rivalOptions || '<option>None present</option>'}</select>
        <input type="number" id="bribe-rival-amount" placeholder="Offer amount ($)" min="0" style="margin-top:4px;" />
        <button onclick="actionBribeRival()" ${rivalOptions ? '' : 'disabled'} style="margin-top:4px;">Bribe Rival Crew</button>
      </div>
    </div>
  `;
}

function renderLog(entries) {
  if (!entries.length) return '<p class="muted">Nothing yet.</p>';
  return `<div class="log">${entries.map(e => `
    <div class="log-entry cat-${e.category}"><span class="turn-tag">D${e.day}</span>${e.text}</div>
  `).reverse().join('')}</div>`;
}

/* ---------------- Map Tab ---------------- */

function renderMap() {
  const cards = GAME.districts.map(d => {
    const segs = Object.entries(d.control).map(([gid, pct]) => {
      const g = GAME.gangs[gid];
      return `<div class="control-seg" style="width:${pct}%; background:${g.color};" title="${g.name}">${Math.round(pct)}%</div>`;
    }).join('');
    const bosses = Object.entries(d.control).map(([gid, pct]) => {
      const g = GAME.gangs[gid];
      return `<div class="boss-line">
        <span><span class="tag" style="border-color:${g.color}">${g.name}</span> ${g.boss.name}</span>
        <span class="personality-tag">${g.boss.personality}${g.atWarWithPlayer ? ' &middot; AT WAR' : ''}${g.alliedWithPlayer ? ' &middot; ALLY' : ''}</span>
      </div>`;
    }).join('');
    const opsLine = ['lab', 'stash', 'route'].map(op => {
      const tier = d.operations[op].tier;
      return `${OPERATION_DEFS[op].label}: ${OPERATION_DEFS[op].tiers[tier].name}${d.operations[op].raided ? ' (raided)' : ''}`;
    }).join(' &middot; ');

    return `
      <div class="card">
        <h2>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h2>
        <div class="control-bar">${segs}</div>
        ${bosses}
        <div class="muted">District Heat: ${d.heat}/100</div>
        <div class="muted">${opsLine}</div>
        ${d.id !== GAME.player.currentDistrict ? `<div class="row" style="margin-top:6px;"><button onclick="travelTo(${d.id})">Travel here</button></div>` : ''}
      </div>
    `;
  }).join('');

  return `<div class="grid">${cards}</div>`;
}

/* ---------------- Operations Tab ---------------- */

function renderOperations() {
  const cards = GAME.districts.map(d => {
    const rows = ['lab', 'stash', 'route'].map(op => {
      const def = OPERATION_DEFS[op];
      const tier = d.operations[op].tier;
      const current = def.tiers[tier];
      const next = def.tiers[tier + 1];
      const check = canUpgradeOperation(GAME, d.id, op);
      let detail;
      if (op === 'lab') detail = `Income: ${fmtMoney(current.income)}/turn, Heat: +${current.heat}/turn`;
      else if (op === 'stash') detail = `Capacity: ${current.capacity}, Heat Mitigation: ${current.heatMitigation}`;
      else detail = `Throughput: ${current.throughput}/turn, Bust Risk: ${current.bustRisk}%`;

      return `
        <div class="card" style="margin-bottom:8px;">
          <h3>${def.label}: ${current.name} ${d.operations[op].raided ? '<span class="tag dirty">Raided</span>' : ''}</h3>
          <div class="muted small">${detail}</div>
          ${next
            ? `<div class="row between" style="margin-top:6px;">
                <span class="small">Upgrade to ${next.name}: ${fmtMoney(next.cost)} Dirty Cash</span>
                <button onclick="actionUpgradeOperation(${d.id}, '${op}')" ${check.ok ? '' : 'disabled'}>${check.ok ? 'Upgrade' : check.reason}</button>
              </div>`
            : `<div class="small muted" style="margin-top:6px;">Maximum tier reached.</div>`
          }
        </div>
      `;
    }).join('');

    return `<div class="card"><h2>${d.name}</h2>${rows}</div>`;
  }).join('');

  return `<div class="grid">${cards}</div>`;
}

/* ---------------- Inventory Tab ---------------- */

function renderInventory() {
  const armoryRows = WEAPON_TIERS.map(t => `
    <div class="row between"><span>${t.label}${GAME.player.crew.weaponTier === t.id ? ' <span class="tag clean">Equipped</span>' : ''}</span><span>${GAME.player.armory[t.id]} units</span></div>
  `).join('');

  const cap = getStashCapacity(GAME);
  const used = totalProductUnits(GAME);
  const productRows = Object.values(PRODUCT_TYPES).map(pt => `
    <div class="row between"><span>${pt.label}</span><span>${GAME.player.inventory.product[pt.id]} units</span></div>
  `).join('');

  const injuryRows = GAME.player.injuries.length
    ? GAME.player.injuries.map(i => `<div class="row between"><span>${i.label}</span><span>${i.type === 'permanent' ? 'Permanent' : `${i.turnsRemaining} turn(s) left`}</span></div>`).join('')
    : '<p class="muted">No active injuries.</p>';

  return `
    <div class="card">
      <h2>Armory</h2>
      ${armoryRows}
      <div class="muted small" style="margin-top:6px;">Crew combat bonus from weapons: +${weaponCombatBonus(GAME)}</div>
    </div>
    <div class="card">
      <h2>Product Inventory</h2>
      ${productRows}
      ${statBar('Stash Capacity', used, cap, 'control')}
    </div>
    <div class="card">
      <h2>Health & Injuries</h2>
      ${statBar('Health', GAME.player.health, GAME.player.maxHealth, 'health')}
      ${injuryRows}
      <div class="row" style="margin-top:6px;">
        <button onclick="actionHospital()">Visit Hospital (${fmtMoney(hospitalCost(GAME))})</button>
      </div>
    </div>
  `;
}

/* ---------------- Events Tab ---------------- */

function renderEvents() {
  return `<div class="card"><h2>Event History</h2>${renderLog(GAME.eventLog.slice(-200))}</div>`;
}

/* ---------------- Game Over ---------------- */

function renderGameOver() {
  const p = GAME.player;
  const myGangId = playerGangId(GAME);
  const territories = myGangId ? GAME.gangs[myGangId].territory.length : 0;
  const aliveFamily = familyMembersAlive(GAME);

  const continueOptions = aliveFamily.map(m => `
    <button onclick="continueAsFamilyMember('${m.id}')">Continue as ${m.name} (${m.relation})</button>
  `).join(' ');

  return `
    <div class="content">
      <div class="gameover-screen">
        <h1>${GAME.meta.gameOverReason === 'arrest' ? 'Busted' : 'Game Over'}</h1>
        <p class="muted">${GAME.meta.gameOverReason === 'arrest' ? `The walls finally closed in on ${p.name}.` : `${p.name}'s story ends here.`}</p>
        <div class="gameover-stats">
          <div class="row"><span>Days Survived</span><span>${GAME.meta.day}</span></div>
          <div class="row"><span>Peak Cash</span><span>${fmtMoney(GAME.meta.peakCash || (p.cash.dirty + p.cash.clean))}</span></div>
          <div class="row"><span>Territories Controlled</span><span>${territories}</span></div>
          <div class="row"><span>Final Rank</span><span>${p.rank}</span></div>
          <div class="row"><span>Street Reputation</span><span>${Math.round(p.reputation.street)}</span></div>
          <div class="row"><span>Gang Reputation</span><span>${Math.round(p.reputation.gang)}</span></div>
          <div class="row"><span>Cartel Reputation</span><span>${Math.round(p.reputation.cartel)}</span></div>
          <div class="row"><span>Family Status</span><span>${aliveFamily.length} of ${GAME.family.length} alive</span></div>
        </div>
        <div class="row" style="justify-content:center; flex-wrap:wrap;">
          <button class="btn-primary" onclick="startOver()">New Game</button>
          ${continueOptions}
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Modal Dispatch ---------------- */

function renderModal() {
  if (!MODAL) return '';
  let body = '';
  if (MODAL.type === 'gangwar') body = renderGangWarModal();
  else if (MODAL.type === 'msg') body = `<h2>${MODAL.title}</h2><div>${MODAL.body}</div><div class="row" style="justify-content:flex-end; margin-top:10px;"><button class="btn-primary" onclick="closeModal()">Close</button></div>`;
  return `<div class="modal-overlay" id="modal-root"><div class="modal">${body}</div></div>`;
}

function closeModal() {
  MODAL = null;
  renderApp();
}

function showMsg(title, body) {
  MODAL = { type: 'msg', title, body };
  renderApp();
}
