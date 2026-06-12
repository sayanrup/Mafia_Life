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
  { id: 'empire', label: 'Empire', requires: 'empire' },
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
  app.innerHTML = renderTopBar() + renderTabBar() + renderActionUpdate() + `<div class="content">${renderTabContent()}</div>`;
  const existingModal = document.getElementById('modal-root');
  if (existingModal) existingModal.remove();
  if (MODAL) {
    document.body.insertAdjacentHTML('beforeend', renderModal());
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
    ${TAB_DEFS.filter(t => !t.requires
        || (t.requires === 'commission' && GAME.commission.unlocked)
        || (t.requires === 'empire' && canAccessEmpire(GAME)))
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
    case 'empire': return renderEmpire();
    case 'inventory': return renderInventory();
    case 'events': return renderEvents();
    case 'settings': return renderSettings();
    default: return '';
  }
}

/* ---------------- Action Update Screen ---------------- */

const ACTION_UPDATE_LABELS = {
  activity: 'Criminal Activity',
  gang: 'Gang Activity',
  bribe: 'Bribery',
  combat: 'Combat',
  rank: 'Rank Change',
  family: 'Family',
  family_death: 'Family',
  lawenforcement: 'Law Enforcement',
  empire: 'Drug Empire',
  finance_raid: 'Finance',
  betrayal: 'Betrayal',
  system: 'System',
  health: 'Health',
  injury: 'Injury',
  district_travel: 'Travel'
};

function renderActionUpdate() {
  if (!GAME.eventLog.length) return '';
  const lastCategory = GAME.eventLog[GAME.eventLog.length - 1].category;
  const relevant = GAME.eventLog.filter(e => e.category === lastCategory).slice(-5);
  if (!relevant.length) return '';
  return `
    <div class="card action-update">
      <h3>Latest: ${ACTION_UPDATE_LABELS[lastCategory] || 'Update'}</h3>
      ${renderLog(relevant)}
    </div>
  `;
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

  const hasHitTargets = gangsHere.some(g => !g.gang.isPlayerGang);

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
      <h2>Criminal Activities</h2>
      <div class="crime-menu">
        ${crimeMenuItem('🔪', 'Street Crime', 'Muggings and small-time hustles for fast, low-risk cash.', "openCrimeModal('street')")}
        ${crimeMenuItem('💰', 'Heists & Rackets', 'Bigger scores: heists, extortion, smuggling runs.', "openCrimeModal('heists')")}
        ${hasHitTargets ? crimeMenuItem('⚔️', 'Gang Operations', 'Send a message or start a gang war.', "openCrimeModal('gang')") : ''}
        ${hasHitTargets ? crimeMenuItem('🤲', 'Help a Gang', 'Small jobs for local crews - paid in cash, no membership.', "openCrimeModal('help')") : ''}
        ${crimeMenuItem('💵', 'Deals', 'Sell product from your inventory.', 'openDealsModal()')}
        ${crimeMenuItem('🤝', 'Bribes & Corruption', 'Buy off cops, feds, or rival crews.', 'openBribesModal()')}
      </div>
    </div>

    <div class="card">
      <h2>Travel</h2>
      <div class="row">${travelButtons}</div>
    </div>

    <div class="card">
      <h2>Turn ${GAME.meta.turn}</h2>
      <div class="row between">
        <span class="muted">Take as many actions as you like, then end the turn.</span>
        <button class="btn-primary" onclick="endTurn()">End Turn</button>
      </div>
    </div>

    <div class="card">
      <h2>Recent Activity</h2>
      ${renderLog(GAME.eventLog.slice(-12))}
    </div>
  `;
}

/* ---------------- Criminal Activities Menu / Modals ---------------- */

function crimeMenuItem(icon, title, desc, onclick) {
  return `
    <button class="crime-menu-item" onclick="${onclick}">
      <span class="crime-item-icon">${icon}</span>
      <span class="crime-item-info">
        <span class="crime-item-title">${title}</span>
        <span class="crime-item-desc muted small">${desc}</span>
      </span>
      <span class="crime-chevron">&rsaquo;</span>
    </button>
  `;
}

function crimeListItem(icon, title, desc, payout, actionHtml) {
  return `
    <div class="crime-item">
      <span class="crime-item-icon">${icon}</span>
      <span class="crime-item-info">
        <span class="crime-item-title">${title}</span>
        <span class="crime-item-desc muted small">${desc}</span>
        <span class="crime-item-payout small">${payout}</span>
      </span>
      <span class="crime-item-action">${actionHtml}</span>
    </div>
  `;
}

function cashHeatLabel(cashMin, cashMax, heatMin, heatMax) {
  return `${fmtMoney(cashMin)} - ${fmtMoney(cashMax)} <span class="muted">| Heat +${heatMin}-${heatMax}</span>`;
}

function closeButtonRow() {
  return `<div class="row" style="justify-content:flex-end; margin-top:10px;"><button class="btn-primary" onclick="closeModal()">Close</button></div>`;
}

function openCrimeModal(category) {
  MODAL = { type: 'crime', category };
  renderApp();
}

function openDealsModal() {
  MODAL = { type: 'deals' };
  renderApp();
}

function openBribesModal() {
  MODAL = { type: 'bribes' };
  renderApp();
}

function renderCrimeModal(category) {
  const district = GAME.districts[GAME.player.currentDistrict];

  if (category === 'street') {
    const items = [
      crimeListItem('🔪', 'Mug a Mark', 'Quick, low-risk cash grab on the street.', cashHeatLabel(60, 160, 0, 6), '<button class="btn-primary" onclick="actionMug()">Do It</button>'),
      ...STREET_CRIMES.map(c => crimeListItem(c.icon, c.label, c.desc, cashHeatLabel(c.cashMin, c.cashMax, c.heatMin, c.heatMax), `<button class="btn-primary" onclick="actionStreetCrime('${c.id}')">Do It</button>`))
    ].join('');
    return `
      <h2>Street Crime</h2>
      <p class="muted small">Each crime can be run up to ${MAX_ACTION_REPEATS}x per turn.</p>
      <div class="crime-list">${items}</div>
      ${closeButtonRow()}
    `;
  }

  if (category === 'heists') {
    const routeTier = district.operations.route.tier;
    const racket = GAME.player.extortionRackets.find(r => r.districtId === district.id);
    return `
      <h2>Heists &amp; Rackets</h2>
      <p class="muted small">Each action can be run up to ${MAX_ACTION_REPEATS}x per turn.</p>
      <div class="crime-list">
        ${crimeListItem('🏦', 'Heist', 'High risk, high reward score against a local target.', cashHeatLabel(400, 4000, 6, 20), '<button class="btn-primary" onclick="actionHeist()">Do It</button>')}
        ${crimeListItem('🧾', 'Extortion', racket ? `Expand your protection racket here (level ${racket.level}/3).` : 'Shake down local businesses for recurring income.', racket ? `Level ${racket.level}/3 <span class="muted">| Heat +0-5/turn</span>` : `Recurring income <span class="muted">| Heat +0-4</span>`, '<button class="btn-primary" onclick="actionExtortion()">Do It</button>')}
        ${crimeListItem('🚚', 'Smuggling Run', routeTier === 0 ? 'No smuggling route established here.' : 'Move contraband through your established route.', routeTier === 0 ? 'Requires a route' : 'Arms &amp; Contraband <span class="muted">| Heat +0-12 on bust</span>', `<button class="btn-primary" onclick="actionSmuggling()" ${routeTier === 0 ? 'disabled' : ''}>Do It</button>`)}
      </div>
      ${closeButtonRow()}
    `;
  }

  if (category === 'gang') {
    const gangsHere = Object.entries(district.control).map(([gid, pct]) => ({ gang: GAME.gangs[gid], pct }));
    const hitTargets = gangsHere.filter(g => !g.gang.isPlayerGang).map(g => `<option value="${g.gang.id}">${g.gang.name}</option>`).join('');
    return `
      <h2>Gang Operations</h2>
      ${hitTargets ? `
        <div class="field">
          <label>Target Gang</label>
          <select id="hit-target">${hitTargets}</select>
        </div>
        <div class="crime-list">
          ${crimeListItem('🔫', 'Send a Message', 'Intimidate a rival gang and shift territory control.', 'Territory shift <span class="muted">| Gang Heat +4-10</span>', '<button class="btn-primary" onclick="actionHit()">Do It</button>')}
          ${crimeListItem('💣', 'Start Gang War', 'Open conflict for control of this district.', 'High risk <span class="muted">| Heat &amp; injury vary</span>', '<button class="btn-danger" onclick="actionStartGangWar()">Do It</button>')}
        </div>
      ` : '<p class="muted">No rival gang presence to target here.</p>'}
      ${closeButtonRow()}
    `;
  }

  if (category === 'help') {
    const gangsHere = Object.entries(district.control).map(([gid]) => GAME.gangs[gid]).filter(g => !g.isPlayerGang);
    if (!gangsHere.length) {
      return `<h2>Help a Gang</h2><p class="muted">No rival crews around here to work for.</p>${closeButtonRow()}`;
    }
    const items = GANG_GIGS.map(g => crimeListItem(g.icon, g.label, g.desc, cashHeatLabel(g.cashMin, g.cashMax, g.heatMin, g.heatMax), `<button class="btn-primary" onclick="actionGangGig('${g.id}')">Do It</button>`)).join('');
    return `
      <h2>Help a Gang</h2>
      <p class="muted small">Small jobs for a local crew without joining them. Builds relations and gang reputation. Each job can be run up to ${MAX_ACTION_REPEATS}x per turn.</p>
      <div class="crime-list">${items}</div>
      ${closeButtonRow()}
    `;
  }

  return '';
}

function renderDealsModal() {
  const district = GAME.districts[GAME.player.currentDistrict];
  const p = GAME.player;
  const productOptions = Object.keys(PRODUCT_TYPES).map(pt => {
    const owned = p.inventory.product[pt];
    const price = getDealPrice(GAME, district.id, pt);
    return `<option value="${pt}">${PRODUCT_TYPES[pt].label} (have ${owned}, ${fmtMoney(price)}/u)</option>`;
  }).join('');

  return `
    <h2>Deals</h2>
    <p class="muted small">Sell product from your inventory at the going rate in ${district.name}.</p>
    <div class="row">
      <select id="deal-product">${productOptions}</select>
      <input type="number" id="deal-qty" value="1" min="1" style="width:80px;" />
      <button class="btn-primary" onclick="actionSell()">Sell</button>
    </div>
    ${closeButtonRow()}
  `;
}

function renderBribesModal() {
  const district = GAME.districts[GAME.player.currentDistrict];
  return `
    <h2>Bribes &amp; Corruption</h2>
    ${renderBribeWidget(district)}
    ${closeButtonRow()}
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
  else if (MODAL.type === 'crime') body = renderCrimeModal(MODAL.category);
  else if (MODAL.type === 'deals') body = renderDealsModal();
  else if (MODAL.type === 'bribes') body = renderBribesModal();
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
