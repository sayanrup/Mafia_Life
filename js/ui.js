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
  { id: 'criminalworld', label: 'Criminal World', requires: 'criminalworld' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'events', label: 'Events' },
  { id: 'settings', label: 'Settings' }
];

function setActiveTab(tab) {
  ACTIVE_TAB = tab;
  renderApp();
  window.scrollTo(0, 0);
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

  // Routine re-renders (after every action) replace the whole #app innerHTML,
  // which would otherwise reset scroll position and drop focus out of any
  // input the player is mid-edit on. Capture and restore both here.
  const scrollY = window.scrollY;
  const active = document.activeElement;
  let focusInfo = null;
  if (active && active.id && app.contains(active) &&
      (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
    focusInfo = { id: active.id, tag: active.tagName, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
  }

  app.innerHTML = `<div class="sticky-header">${renderTopBar()}${renderTabBar()}</div>` + renderActionUpdate() + `<div class="content">${renderTabContent()}</div>`;

  if (focusInfo) {
    const el = document.getElementById(focusInfo.id);
    if (el) {
      el.focus();
      if (focusInfo.tag !== 'SELECT' && typeof focusInfo.selectionStart === 'number' && el.setSelectionRange) {
        try { el.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd); } catch (e) { /* ignore */ }
      }
    }
  }
  window.scrollTo(0, scrollY);

  if (GAME.meta.pendingArrest && !MODAL) MODAL = { type: 'arrest' };
  else if (GAME.player.pendingDilemma && !MODAL) MODAL = { type: 'dilemma' };

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

/* ---------------- Collapsible Cards ---------------- */
// Lists of similar cards (districts, rival gangs, businesses, etc.) start
// collapsed to keep long lists scannable; expanding one is remembered across
// re-renders via this in-memory set (cleared on page reload).

const EXPANDED_CARDS = new Set();

function onCardToggle(id, el) {
  if (el.open) EXPANDED_CARDS.add(id); else EXPANDED_CARDS.delete(id);
}

function collapsibleCard(id, summaryHtml, bodyHtml, style) {
  const open = EXPANDED_CARDS.has(id);
  return `
    <details class="card" ${style ? `style="${style}"` : ''} ${open ? 'open' : ''} ontoggle="onCardToggle('${id}', this)">
      <summary><div class="card-summary">${summaryHtml}</div></summary>
      <div class="card-body">${bodyHtml}</div>
    </details>
  `;
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
        ${statBar('Crew Loyalty', p.crew.loyalty, 100, 'loyalty')}
      </div>
    </div>
  `;
}

function renderTabBar() {
  return `<div class="tab-bar">
    ${TAB_DEFS.filter(t => !t.requires
        || (t.requires === 'commission' && GAME.commission.unlocked)
        || (t.requires === 'criminalworld' && GAME.criminalWorld.unlocked))
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
    case 'criminalworld': return renderCriminalWorld();
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
  operations: 'Drug Operations',
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

function renderObjectives() {
  const objectives = computeObjectives(GAME);
  return objectives.map(o => `
    <div>
      ${statBar(o.label, o.current, o.max, 'rep-street', `${o.current}/${o.max}`)}
      <div class="muted small">${o.detail}</div>
    </div>
  `).join('');
}

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
      <h2>Objectives</h2>
      ${renderObjectives()}
    </div>

    <div class="card">
      <h2>${district.name}</h2>
      <div class="control-bar">${controlBar}</div>
      ${bossLines}
      <div class="muted small">Control shown is for this district only. Criminal World access depends on your average control across all districts (see Objectives).</div>
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
      ...STREET_CRIMES.map(c => {
        const locked = !isUnlockedForProgress(GAME, c.unlockProgress);
        return crimeListItem(c.icon, c.label, c.desc, cashHeatLabel(c.cashMin, c.cashMax, c.heatMin, c.heatMax), locked ? `<span class="muted small">Unlocks at Street Rep/PD Heat ${c.unlockProgress}</span>` : `<button class="btn-primary" onclick="actionStreetCrime('${c.id}')">Do It</button>`);
      })
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
    const heistLocked = !isUnlockedForRank(GAME, HEIST_UNLOCK_RANK);
    return `
      <h2>Heists &amp; Rackets</h2>
      <p class="muted small">Each action can be run up to ${MAX_ACTION_REPEATS}x per turn.</p>
      <div class="crime-list">
        ${crimeListItem('🏦', 'Heist', 'High risk, high reward score against a local target.', cashHeatLabel(400, 4000, 6, 20), heistLocked ? `<span class="muted small">Unlocks at ${HEIST_UNLOCK_RANK}</span>` : '<button class="btn-primary" onclick="actionHeist()">Do It</button>')}
        ${crimeListItem('🧾', 'Extortion', racket ? `Expand your protection racket here (level ${racket.level}/3).` : 'Shake down local businesses for recurring income.', racket ? `Level ${racket.level}/3 <span class="muted">| Heat +0-5/turn</span>` : `Recurring income <span class="muted">| Heat +0-4</span>`, '<button class="btn-primary" onclick="actionExtortion()">Do It</button>')}
        ${crimeListItem('🚚', 'Smuggling Run', routeTier === 0 ? 'No smuggling route established here.' : 'Move product through your established route for a cash payout.', routeTier === 0 ? 'Requires a route' : cashHeatLabel(OPERATION_DEFS.route.tiers[routeTier].cashMin, OPERATION_DEFS.route.tiers[routeTier].cashMax, 4, 4 + routeTier * 2) + ' on success, cash loss on bust', `<button class="btn-primary" onclick="actionSmuggling()" ${routeTier === 0 ? 'disabled' : ''}>Do It</button>`)}
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
    const items = GANG_GIGS.map(g => {
      const locked = !isUnlockedForGangRep(GAME, g.unlockGangRep);
      return crimeListItem(g.icon, g.label, g.desc, cashHeatLabel(g.cashMin, g.cashMax, g.heatMin, g.heatMax), locked ? `<span class="muted small">Unlocks at Gang Rep ${g.unlockGangRep}</span>` : `<button class="btn-primary" onclick="actionGangGig('${g.id}')">Do It</button>`);
    }).join('');
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
  const productTypes = Object.keys(PRODUCT_TYPES);
  const productOptions = productTypes.map(pt => {
    const owned = p.inventory.product[pt];
    const price = getDealPrice(GAME, district.id, pt);
    return `<option value="${pt}">${PRODUCT_TYPES[pt].label} (have ${owned}, ${fmtMoney(price)}/u)</option>`;
  }).join('');
  const defaultMax = Math.max(1, p.inventory.product[productTypes[0]] || 0);

  return `
    <h2>Deals</h2>
    <p class="muted small">Sell product from your inventory at the going rate in ${district.name}.</p>
    <div class="row">
      <select id="deal-product" onchange="updateDealMaxQty()">${productOptions}</select>
      <input type="number" id="deal-qty" value="${defaultMax}" min="1" style="width:80px;" />
      <button class="btn-primary" onclick="actionSell()">Sell</button>
    </div>
    ${closeButtonRow()}
  `;
}

function updateDealMaxQty() {
  const productSelect = document.getElementById('deal-product');
  const qtyInput = document.getElementById('deal-qty');
  if (!productSelect || !qtyInput) return;
  const owned = GAME.player.inventory.product[productSelect.value] || 0;
  qtyInput.value = Math.max(1, owned);
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

let MAP_SUBTAB = 'districts';

const MAP_SUBTABS = [
  { id: 'districts', label: 'Districts' },
  { id: 'gangs', label: 'Gangs' }
];

function setMapSubtab(tab) {
  MAP_SUBTAB = tab;
  renderApp();
}

function renderMap() {
  const nav = `<div class="tab-bar" style="margin-bottom:10px;">
    ${MAP_SUBTABS.map(t => `<button class="tab-btn ${MAP_SUBTAB === t.id ? 'active' : ''}" onclick="setMapSubtab('${t.id}')">${t.label}</button>`).join('')}
  </div>`;

  if (MAP_SUBTAB === 'gangs') {
    return nav + renderGangsSubtab();
  }

  return nav + renderDistrictsSubtab();
}

function renderDistrictsSubtab() {
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
    const opsLine = ['stash', 'route'].map(op => {
      const tier = d.operations[op].tier;
      return `${OPERATION_DEFS[op].label}: ${OPERATION_DEFS[op].tiers[tier].name}${d.operations[op].raided ? ' (raided)' : ''}`;
    }).join(' &middot; ');
    const farmTotal = d.farms ? Object.values(d.farms).reduce((a, f) => a + f.plots, 0) : 0;
    const farmLine = farmTotal > 0
      ? Object.entries(d.farms).filter(([, f]) => f.plots > 0).map(([p, f]) => `${FARM_TYPES[p].label}: ${f.plots} plot(s)`).join(' &middot; ')
      : '';
    const activityRows = (d.lastEvents || []).map(e => `<div class="muted small">${e}</div>`).join('');

    const summary = `
      <h2>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h2>
      <div class="control-bar">${segs}</div>
    `;
    const body = `
      ${bosses}
      <div class="muted">District Heat: ${d.heat}/100</div>
      <div class="muted">${opsLine}</div>
      ${farmLine ? `<div class="muted">${farmLine}</div>` : ''}
      ${activityRows ? `<div style="margin-top:6px;"><div class="muted small"><strong>Recent Activity</strong></div>${activityRows}</div>` : ''}
      ${d.id !== GAME.player.currentDistrict ? `<div class="row" style="margin-top:6px;"><button onclick="travelTo(${d.id})">Travel here</button></div>` : ''}
    `;
    return collapsibleCard(`district-${d.id}`, summary, body);
  }).join('');

  return `<div class="grid">${cards}</div>`;
}

function renderGangsSubtab() {
  const gangs = getCouncilGangs(GAME);
  if (!gangs.length) {
    return `<div class="card"><p class="muted">No rival gangs are active right now.</p></div>`;
  }

  const districtName = id => {
    const d = GAME.districts.find(dd => dd.id === id);
    return d ? d.name : `District ${id}`;
  };

  const cards = gangs.map(g => {
    const status = g.atWarWithPlayer ? '<span class="tag dirty">AT WAR</span>' : (g.alliedWithPlayer ? '<span class="tag clean">ALLIED</span>' : '');
    const territory = Math.round(gangTerritoryScore(GAME, g.id));

    const businessRows = (g.businesses || []).map(b =>
      `<div class="muted small">${b.type} - ${districtName(b.districtId)} (Level ${b.level})</div>`
    ).join('');

    const opsRows = Object.entries(g.operations || {}).flatMap(([districtId, ops]) =>
      GANG_PRODUCTS.filter(p => ops[p] > 0).map(p =>
        `<div class="muted small">${FARM_TYPES[p] ? FARM_TYPES[p].label : p} - ${districtName(Number(districtId))} (Level ${ops[p]})</div>`
      )
    ).join('');

    const racketRows = (g.rackets || []).map(r =>
      `<div class="muted small">Extortion Racket - ${districtName(r.districtId)} (Level ${r.level}, ${fmtMoney(extortionRacketIncome(r.level))}/turn)</div>`
    ).join('');

    const summary = `
      <div class="row between"><strong><span class="tag" style="border-color:${g.color}">${g.name}</span> - ${g.boss.name}</strong>${status}</div>
      <div class="muted small">Personality: ${g.boss.personality} &middot; Territory Index: ${territory}</div>
      <div class="muted small">Crew Size: ${g.crewSize || 0} &middot; Crew Skill: ${g.crewSkill || 0}/100 &middot; Treasury: ${fmtMoney(g.treasury || 0)}</div>
    `;
    const body = `
      <div>
        <div class="muted small"><strong>Businesses</strong></div>
        ${businessRows || '<div class="muted small">None</div>'}
      </div>
      <div style="margin-top:6px;">
        <div class="muted small"><strong>Drug Operations</strong></div>
        ${opsRows || '<div class="muted small">None</div>'}
      </div>
      <div style="margin-top:6px;">
        <div class="muted small"><strong>Rackets</strong></div>
        ${racketRows || '<div class="muted small">None</div>'}
      </div>
    `;
    return collapsibleCard(`mapgang-${g.id}`, summary, body, 'margin-bottom:6px;');
  }).join('');

  return `<div class="grid">${cards}</div>`;
}

/* ---------------- Operations Tab ---------------- */

let OPS_SUBTAB = 'weed';

const OPS_SUBTABS = [
  { id: 'weed', label: 'Weed' },
  { id: 'pills', label: 'Pills' },
  { id: 'powder', label: 'Cocaine' },
  { id: 'smuggling', label: 'Smuggling' },
  { id: 'protection', label: 'Protection' },
  { id: 'kidnapping', label: 'Kidnapping' }
];

function setOpsSubtab(tab) {
  OPS_SUBTAB = tab;
  renderApp();
}

function renderOperations() {
  const nav = `<div class="tab-bar" style="margin-bottom:10px;">
    ${OPS_SUBTABS.map(t => `<button class="tab-btn ${OPS_SUBTAB === t.id ? 'active' : ''}" onclick="setOpsSubtab('${t.id}')">${t.label}</button>`).join('')}
  </div>`;

  let body;
  switch (OPS_SUBTAB) {
    case 'weed':
    case 'pills':
    case 'powder':
      body = renderFarmSubtab(OPS_SUBTAB);
      break;
    case 'smuggling':
      body = renderSmugglingSubtab();
      break;
    case 'protection':
      body = renderProtectionSubtab();
      break;
    case 'kidnapping':
      body = renderKidnappingSubtab();
      break;
    default:
      body = '';
  }

  return nav + body;
}

function renderFarmSubtab(product) {
  const def = FARM_TYPES[product];
  const limits = getOpsLimits(GAME);

  if (!getUnlockedProducts(GAME).includes(product)) {
    const nextTier = OPS_CASH_LIMITS.find(t => t.unlockedProducts.includes(product));
    const prereq = PRODUCT_PROGRESSION_CHAIN[product];
    const prereqDef = prereq ? FARM_TYPES[prereq] : null;
    const prereqTierName = prereqDef ? prereqDef.facilityTiers[PRODUCT_PROGRESSION_TIER - 1].name : '';
    return `
      <div class="card">
        <h2>${def.icon} ${def.label}</h2>
        <p class="muted">${def.label} operations unlock once you've earned ${fmtMoney(nextTier ? nextTier.minDirtyCash : 0)} Dirty Cash${prereqDef ? `, or once you've built a ${prereqDef.label} up to a ${prereqTierName} (tier ${PRODUCT_PROGRESSION_TIER}) in any district` : ''}. Keep running operations and crimes to build up your Dirty Cash.</p>
      </div>
    `;
  }

  const ops = GAME.player.operations;
  const equipTier = ops.equipment[product];
  const equipCurrent = EQUIPMENT_TIERS[equipTier];
  const equipNext = EQUIPMENT_TIERS[equipTier + 1];
  const equipLocked = equipTier >= limits.maxEquipmentTier;
  const distCounts = ops.distributors[product];
  const productDistTotal = productDistributorCount(GAME, product);
  const totalDist = totalDistributors(GAME);
  const price = ops.prices[product];
  const minPrice = OPS_ECONOMY.priceMinMult, maxPrice = OPS_ECONOMY.priceMaxMult;
  const vehicleCap = totalVehicleCapacity(GAME);
  const myVehicleShare = totalDist > 0 ? Math.round(vehicleCap * (productDistTotal / totalDist)) : 0;
  const marketing = ops.marketing[product];
  const activeCampaign = marketing && marketing.turnsLeft > 0 ? MARKETING_CAMPAIGNS.find(c => c.id === marketing.campaignId) : null;

  const districtCards = GAME.districts.map(d => {
    const farm = d.farms[product];
    const plotCost = getFarmPlotCost(GAME, d.id, product);
    const growTurns = getFarmGrowTurns(GAME, d.id, product);
    const progressPct = clamp((farm.growTurn / growTurns) * 100, 0, 100);
    const atPlotCap = farm.plots >= limits.maxPlotsPerDistrict;
    const currentTierName = farm.plots > 0 ? def.facilityTiers[farm.plots - 1].name : 'None';
    const nextTier = def.facilityTiers[farm.plots];
    let upgradeLabel;
    if (atPlotCap) upgradeLabel = farm.plots >= def.facilityTiers.length ? 'Max Tier' : 'Dirty Cash Limit';
    else if (!nextTier || plotCost == null) upgradeLabel = 'Max Tier';
    else upgradeLabel = `Build ${nextTier.name} (${fmtMoney(plotCost)})`;
    const upgradeDisabled = atPlotCap || !nextTier || plotCost == null;
    const securityButtons = SECURITY_TIERS.map(t => `<button class="btn-small" onclick="actionHireSecurityDetail(${d.id}, '${t.id}')" title="${t.desc}">${t.label} (${fmtMoney(t.amount)})</button>`).join('');
    const netWorth = getFarmNetWorth(GAME, d.id, product);
    const lastProfit = (farm.lastRevenue || 0) - (farm.lastExpense || 0);
    const summary = `
      <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
      <div class="muted small">Facility: ${currentTierName} (${farm.plots}/${def.facilityTiers.length})</div>
      ${farm.plots > 0 ? `<div class="bar-track" style="margin-top:4px;"><div class="bar-fill control" style="width:${progressPct}%"></div></div>` : ''}
    `;
    const body = `
      <div class="row between"><span>Upgrade</span><button class="btn-small" onclick="actionBuyFarmPlot(${d.id}, '${product}')" ${upgradeDisabled ? 'disabled' : ''}>${upgradeLabel}</button></div>
      ${farm.plots > 0 ? `
        <div class="bar-label" style="margin-top:6px;"><span>Grow Cycle</span><span>${farm.growTurn}/${growTurns} turns</span></div>
        <div class="bar-track"><div class="bar-fill control" style="width:${progressPct}%"></div></div>
      ` : ''}
      <div class="muted small" style="margin-top:6px;">Pending batch value: ${fmtMoney(farm.pendingValue)}</div>
      <div class="muted small" style="margin-top:6px;">Security/Protection: ${Math.round(d.opProtection || 0)}%${(d.protectionIncome || 0) > 0 && (d.opProtection || 0) > 0 ? ` (kicking back ${fmtMoney(d.protectionIncome)}/turn)` : ''}</div>
      ${farm.plots > 0 ? `
        <div class="muted small" style="margin-top:6px;">Net Worth: ${fmtMoney(netWorth)} &middot; Last Turn Revenue: ${fmtMoney(farm.lastRevenue || 0)} &middot; Expense: ${fmtMoney(farm.lastExpense || 0)} &middot; Profit: ${fmtMoney(lastProfit)}</div>
        <div class="row" style="margin-top:4px;">
          <button class="btn-danger btn-small" onclick="actionSellFarmOperation(${d.id}, '${product}')">Sell Operation (${fmtMoney(Math.round(netWorth * 1.5))})</button>
        </div>
      ` : ''}
      <div class="row" style="flex-wrap:wrap; gap:4px; margin-top:4px;">${securityButtons}</div>
    `;
    return collapsibleCard(`farm-${product}-${d.id}`, summary, body);
  }).join('');

  const distributorRows = DISTRIBUTOR_TYPES.map(t => {
    const locked = !isUnlockedForCash(GAME, t.unlockCash);
    const owned = distCounts[t.id] || 0;
    return `
      <div class="row between" style="margin-bottom:4px;">
        <span>${t.label} <span class="muted small">(owned ${owned} &middot; ${fmtMoney(t.capacity)} cap &middot; ${fmtMoney(t.upkeep)}/turn wage ea)</span></span>
        ${locked
          ? `<span class="muted small">Unlocks at ${fmtMoney(t.unlockCash)} Dirty Cash</span>`
          : `<span class="row"><input type="number" id="ops-distributors-${product}-${t.id}" value="1" min="1" style="width:60px;" /><button class="btn-small" onclick="actionHireDistributors('${product}', '${t.id}')">Hire (Free)</button><button class="btn-small btn-danger" onclick="actionFireDistributors('${product}', '${t.id}')" ${owned > 0 ? '' : 'disabled'}>Fire</button></span>`}
      </div>
    `;
  }).join('');

  const pricePresetRow = PRICE_PRESETS.map(p => `<button class="btn-small" onclick="actionSetOperationPricePreset('${product}', ${p.mult})">${p.label} (x${p.mult.toFixed(2)})</button>`).join('');

  const marketingRows = MARKETING_CAMPAIGNS.map(c => {
    const locked = !isUnlockedForCash(GAME, c.unlockCash);
    return `
      <div class="row between" style="margin-bottom:4px;">
        <span>${c.label} <span class="muted small">(+${Math.round(c.demandBonus * 100)}% demand, ${c.turns} turn(s), ${fmtMoney(c.cost)})</span></span>
        ${locked ? `<span class="muted small">Unlocks at ${fmtMoney(c.unlockCash)} Dirty Cash</span>` : `<button class="btn-small" onclick="actionLaunchMarketing('${product}', '${c.id}')">Launch</button>`}
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>${def.icon} ${def.label}</h2>
      <p class="muted small">Build up your facility tier by tier (Terrace Grow &rarr; Rented Grow House &rarr; Garage Setup &rarr; Small Field &rarr; Mega Field). Each tier you own adds to your batch value and may speed up the grow cycle. Distributors then sell off the matured batch value over subsequent turns based on your set price.</p>
      <div class="muted small">Your current Dirty Cash tier allows up to ${limits.maxPlotsPerDistrict} facility tier(s)/district, equipment tier ${limits.maxEquipmentTier}, and ${limits.maxDistributors} distributor(s) total (shared across products). Earn more Dirty Cash to expand further.</div>
      <div class="grid">
        <div>
          <h3>Facilities / Equipment</h3>
          <div class="muted small">Current: ${equipCurrent.name} (x${equipCurrent.yieldMult.toFixed(2)} yield)</div>
          ${equipNext && !equipLocked
            ? `<div class="row between" style="margin-top:6px;">
                <span class="small">Upgrade to ${equipNext.name} (x${equipNext.yieldMult.toFixed(2)}): ${fmtMoney(equipNext.cost)}</span>
                <button class="btn-small" onclick="actionBuyEquipment('${product}')">Upgrade</button>
              </div>`
            : equipNext
              ? `<div class="small muted" style="margin-top:6px;">Further upgrades unlock at a higher Dirty Cash tier.</div>`
              : `<div class="small muted" style="margin-top:6px;">Maximum equipment tier reached.</div>`
          }
        </div>
        <div>
          <h3>Distributors</h3>
          <div class="muted small">Hired: ${productDistTotal} total &middot; vehicle share +${fmtMoney(myVehicleShare)}/turn for this product. Buy vehicles in the Crew tab to move more product.</div>
          <div style="margin-top:6px;">${distributorRows}</div>
        </div>
        <div>
          <h3>Street Price</h3>
          <div class="muted small">Markup multiplier (${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}). Higher markup means more cash per unit sold but slower sales.</div>
          <div class="row" style="margin-top:6px;">
            <input type="number" id="ops-price-${product}" value="${price}" min="${minPrice}" max="${maxPrice}" step="0.05" style="width:90px;" />
            <button class="btn-small" onclick="actionSetOperationPrice('${product}')">Set (current x${price.toFixed(2)})</button>
          </div>
          <div class="row" style="flex-wrap:wrap; gap:4px; margin-top:6px;">${pricePresetRow}</div>
        </div>
        <div>
          <h3>Marketing Campaigns</h3>
          <div class="muted small">${activeCampaign ? `Active: ${activeCampaign.label} (+${Math.round(activeCampaign.demandBonus * 100)}% demand, ${marketing.turnsLeft} turn(s) left)` : 'No active campaign for this product.'}</div>
          <div style="margin-top:6px;">${marketingRows}</div>
        </div>
      </div>
    </div>
    <div class="grid">${districtCards}</div>
  `;
}

function renderSmugglingSubtab() {
  const cards = GAME.districts.map(d => {
    const op = 'route';
    const def = OPERATION_DEFS[op];
    const tier = d.operations[op].tier;
    const current = def.tiers[tier];
    const next = def.tiers[tier + 1];
    const check = canUpgradeOperation(GAME, d.id, op);
    const summary = `
      <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
      <h3 style="margin-top:0;">${def.label}: ${current.name} ${d.operations[op].raided ? '<span class="tag dirty">Raided</span>' : ''}</h3>
      <div class="muted small">Throughput: ${current.throughput}/turn, Bust Risk: ${current.bustRisk}%</div>
    `;
    const body = next
      ? `<div class="row between">
          <span class="small">Upgrade to ${next.name}: ${fmtMoney(next.cost)} Dirty Cash</span>
          <button onclick="actionUpgradeOperation(${d.id}, '${op}')" ${check.ok ? '' : 'disabled'}>${check.ok ? 'Upgrade' : check.reason}</button>
        </div>`
      : `<div class="small muted">Maximum tier reached.</div>`;
    return collapsibleCard(`smuggle-${d.id}`, summary, body);
  }).join('');

  return `
    <div class="card">
      <h2>Smuggling Routes</h2>
      <p class="muted small">Upgrade routes to increase throughput of arms &amp; contraband produced each turn and to reduce bust risk. Run smuggling jobs from Heists &amp; Rackets on the Home tab.</p>
    </div>
    <div class="grid">${cards}</div>
  `;
}

function renderProtectionSubtab() {
  const stashCards = GAME.districts.map(d => {
    const op = 'stash';
    const def = OPERATION_DEFS[op];
    const tier = d.operations[op].tier;
    const current = def.tiers[tier];
    const next = def.tiers[tier + 1];
    const check = canUpgradeOperation(GAME, d.id, op);
    const racket = GAME.player.extortionRackets.find(r => r.districtId === d.id);
    const opProtection = d.opProtection || 0;

    const goodsUsed = d.farms ? Object.values(d.farms).reduce((a, f) => a + f.pendingValue, 0) : 0;
    const summary = `
      <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
      <h3 style="margin-top:0;">${def.label}: ${current.name}</h3>
      <div class="muted small">Capacity: ${current.capacity}, Heat Mitigation: ${current.heatMitigation}</div>
    `;
    const body = `
      ${current.goodsCapacity > 0 ? `<div class="muted small">Goods Storage: ${fmtMoney(goodsUsed)} / ${fmtMoney(current.goodsCapacity)}${goodsUsed > current.goodsCapacity ? ' (overflowing - rivals will raid the excess)' : ' (spare space rents out to other crews for income each turn)'}</div>` : `<div class="muted small">No goods storage - build a Safehouse or better to rent spare space to other crews for income.</div>`}
      ${next
        ? `<div class="row between" style="margin-top:6px;">
            <span class="small">Upgrade to ${next.name}: ${fmtMoney(next.cost)} Dirty Cash</span>
            <button onclick="actionUpgradeOperation(${d.id}, '${op}')" ${check.ok ? '' : 'disabled'}>${check.ok ? 'Upgrade' : check.reason}</button>
          </div>`
        : `<div class="small muted" style="margin-top:6px;">Maximum tier reached.</div>`
      }
      <hr class="sep" />
      <div class="muted small">Protection Racket: ${racket ? `Level ${racket.level}/3 (${fmtMoney(extortionRacketIncome(racket.level))}/turn)` : 'None - start one from Heists & Rackets.'}</div>
      ${canAccessOperations(GAME) ? `
        <hr class="sep" />
        <div class="muted small">Operation Protection (reduces drug-operation raid risk &amp; heat here)</div>
        ${statBar('Protection', opProtection, 100, 'control')}
        ${(d.protectionIncome || 0) > 0 && opProtection > 0 ? `<div class="muted small" style="margin-top:4px;">Paid-off contacts kick back ${fmtMoney(d.protectionIncome)}/turn while protection holds.</div>` : ''}
        <div class="row between" style="margin-top:4px;">
          <input type="number" id="ops-protection-bribe-${d.id}" placeholder="Bribe amount ($)" min="0" style="width:140px;" />
          <button class="btn-small" onclick="actionBribeOpProtection(${d.id})">Bribe for Protection</button>
        </div>
      ` : ''}
    `;
    return collapsibleCard(`stash-${d.id}`, summary, body);
  }).join('');

  return `
    <div class="card">
      <h2>Protection</h2>
      <p class="muted small">Stash houses raise your product capacity and reduce heat from operations. Protection rackets generate recurring income. Operation Protection bribes reduce raid risk on your drug operations in a district.</p>
    </div>
    <div class="grid">${stashCards}</div>
  `;
}

function renderKidnappingSubtab() {
  const items = KIDNAP_JOBS.map(j => {
    const locked = !isUnlockedForRank(GAME, j.unlockRank);
    return crimeListItem(j.icon, j.label, j.desc, cashHeatLabel(j.cashMin, j.cashMax, j.heatMin, j.heatMax), locked ? `<span class="muted small">Unlocks at ${j.unlockRank}</span>` : `<button class="btn-primary" onclick="actionKidnap('${j.id}')">Do It</button>`);
  }).join('');
  return `
    <div class="card">
      <h2>Kidnapping Racket</h2>
      <p class="muted small">High-risk, high-reward ransom jobs. Each job can be run up to ${MAX_ACTION_REPEATS}x per turn.</p>
      <div class="crime-list">${items}</div>
    </div>
  `;
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

  const blackMarketRows = BLACK_MARKET_ITEMS.map(item => {
    const owned = GAME.player.inventory.consumables[item.id] || 0;
    const locked = !isUnlockedForRank(GAME, item.unlockRank);
    return `
      <div class="row between" style="margin-bottom:4px;">
        <span>${item.label} <span class="muted small">(owned ${owned})</span><div class="muted small">${item.desc}</div></span>
        <span class="row">
          ${locked
            ? `<span class="muted small">Unlocks at ${item.unlockRank}</span>`
            : `<button onclick="actionBuyBlackMarketItem('${item.id}')">Buy (${fmtMoney(item.cost)})</button>`}
          <button ${owned > 0 ? '' : 'disabled'} onclick="actionUseBlackMarketItem('${item.id}')">Use</button>
        </span>
      </div>
    `;
  }).join('');

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
    <div class="card">
      <h2>Black Market Gear</h2>
      <p class="muted small">One-use items bought with Dirty Cash. Buy now, use whenever you need them.</p>
      ${blackMarketRows}
    </div>
  `;
}

function actionBuyBlackMarketItem(itemId) {
  const res = buyBlackMarketItem(GAME, itemId);
  if (!res.ok) showMsg('Black Market', res.reason);
  else { autosave(GAME); renderApp(); }
}

function actionUseBlackMarketItem(itemId) {
  const res = useBlackMarketItem(GAME, itemId);
  if (!res.ok) showMsg('Black Market', res.reason);
  else { autosave(GAME); renderApp(); }
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
  const isVictory = GAME.meta.gameOverReason === 'victory';

  const continueOptions = aliveFamily.map(m => `
    <button onclick="continueAsFamilyMember('${m.id}')">Continue as ${m.name} (${m.relation})</button>
  `).join(' ');

  const title = isVictory ? 'You Run This City' : (GAME.meta.gameOverReason === 'arrest' ? 'Busted' : 'Game Over');
  const subtitle = isVictory
    ? `${myGangId ? GAME.gangs[myGangId].name : p.name} now leads every zone in ${GAME.meta.cityName}. The streets, the politics, the money - all of it answers to ${p.name}.`
    : (GAME.meta.gameOverReason === 'arrest' ? `The walls finally closed in on ${p.name}.` : `${p.name}'s story ends here.`);

  return `
    <div class="content">
      <div class="gameover-screen">
        <h1>${title}</h1>
        <p class="muted">${subtitle}</p>
        <div class="gameover-stats">
          <div class="row"><span>Days Survived</span><span>${GAME.meta.day}</span></div>
          <div class="row"><span>Peak Cash</span><span>${fmtMoney(GAME.meta.peakCash || (p.cash.dirty + p.cash.clean))}</span></div>
          <div class="row"><span>Territories Controlled</span><span>${territories} / ${GAME.districts.length}</span></div>
          <div class="row"><span>Final Rank</span><span>${p.rank}</span></div>
          <div class="row"><span>Street Reputation</span><span>${Math.round(p.reputation.street)}</span></div>
          <div class="row"><span>Gang Reputation</span><span>${Math.round(p.reputation.gang)}</span></div>
          <div class="row"><span>Cartel Reputation</span><span>${Math.round(p.reputation.cartel)}</span></div>
          <div class="row"><span>Family Status</span><span>${aliveFamily.length} of ${GAME.family.length} alive</span></div>
        </div>
        <div class="row" style="justify-content:center; flex-wrap:wrap;">
          ${isVictory ? `<button class="btn-primary" onclick="continueAfterVictory()">Keep Playing</button>` : ''}
          <button ${isVictory ? '' : 'class="btn-primary"'} onclick="startOver()">New Game</button>
          ${continueOptions}
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Street Dilemma Modal ---------------- */

function renderDilemmaModal() {
  const d = GAME.player.pendingDilemma;
  if (!d) return '<h2>Nothing to decide</h2>' + closeButtonRow();
  return `
    <h2>${d.title}</h2>
    <p>${d.description}</p>
    <div style="display:flex; flex-direction:column; gap:6px; margin-top:10px;">
      ${d.options.map(o => `<button onclick="actionResolveDilemma('${o.id}')">${o.label}</button>`).join('')}
    </div>
  `;
}

/* ---------------- Busted / Hire a Lawyer Modal ---------------- */

function renderArrestModal() {
  const p = GAME.player;
  const cost = lawyerCost(GAME);
  const totalCash = p.cash.dirty + p.cash.clean;
  const fedHeat = p.heat.feds >= 100;
  return `
    <h2>Busted!</h2>
    <p>${fedHeat ? 'Federal agents have a warrant with your name on it.' : 'Local police have you dead to rights.'} ${p.name} is about to go away for a long time.</p>
    <p class="muted small">A lawyer can make this disappear - for a price.</p>
    <div class="row between"><span>Lawyer's Fee</span><span class="tag dirty">${fmtMoney(cost)}</span></div>
    <div class="row between"><span>Your Cash</span><span>${fmtMoney(totalCash)}</span></div>
    <div class="row" style="margin-top:10px; justify-content:flex-end; gap:8px;">
      <button class="btn-danger" onclick="actionAcceptArrest()">Take the Fall</button>
      <button class="btn-primary" onclick="actionHireLawyer()" ${totalCash >= cost ? '' : 'disabled'}>Hire a Lawyer (${fmtMoney(cost)})</button>
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
  else if (MODAL.type === 'dilemma') body = renderDilemmaModal();
  else if (MODAL.type === 'arrest') body = renderArrestModal();
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
