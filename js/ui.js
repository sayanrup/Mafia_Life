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
      ...STREET_CRIMES.map(c => {
        const locked = !isUnlockedForRank(GAME, c.unlockRank);
        return crimeListItem(c.icon, c.label, c.desc, cashHeatLabel(c.cashMin, c.cashMax, c.heatMin, c.heatMax), locked ? `<span class="muted small">Unlocks at ${c.unlockRank}</span>` : `<button class="btn-primary" onclick="actionStreetCrime('${c.id}')">Do It</button>`);
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
    const items = GANG_GIGS.map(g => {
      const locked = !isUnlockedForRank(GAME, g.unlockRank);
      return crimeListItem(g.icon, g.label, g.desc, cashHeatLabel(g.cashMin, g.cashMax, g.heatMin, g.heatMax), locked ? `<span class="muted small">Unlocks at ${g.unlockRank}</span>` : `<button class="btn-primary" onclick="actionGangGig('${g.id}')">Do It</button>`);
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
    const opsLine = ['stash', 'route'].map(op => {
      const tier = d.operations[op].tier;
      return `${OPERATION_DEFS[op].label}: ${OPERATION_DEFS[op].tiers[tier].name}${d.operations[op].raided ? ' (raided)' : ''}`;
    }).join(' &middot; ');
    const farmTotal = d.farms ? Object.values(d.farms).reduce((a, f) => a + f.plots, 0) : 0;
    const farmLine = farmTotal > 0
      ? Object.entries(d.farms).filter(([, f]) => f.plots > 0).map(([p, f]) => `${FARM_TYPES[p].label}: ${f.plots} plot(s)`).join(' &middot; ')
      : '';

    return `
      <div class="card">
        <h2>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h2>
        <div class="control-bar">${segs}</div>
        ${bosses}
        <div class="muted">District Heat: ${d.heat}/100</div>
        <div class="muted">${opsLine}</div>
        ${farmLine ? `<div class="muted">${farmLine}</div>` : ''}
        ${d.id !== GAME.player.currentDistrict ? `<div class="row" style="margin-top:6px;"><button onclick="travelTo(${d.id})">Travel here</button></div>` : ''}
      </div>
    `;
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

  if (!limits.unlockedProducts.includes(product)) {
    return `
      <div class="card">
        <h2>${def.icon} ${def.label}</h2>
        <p class="muted">${def.label} operations unlock at a higher rank. Keep building your reputation and territory to rank up.</p>
      </div>
    `;
  }

  const ops = GAME.player.operations;
  const equipTier = ops.equipment[product];
  const equipCurrent = EQUIPMENT_TIERS[equipTier];
  const equipNext = EQUIPMENT_TIERS[equipTier + 1];
  const equipLocked = equipTier >= limits.maxEquipmentTier;
  const distributors = ops.distributors[product];
  const totalDist = totalDistributors(GAME);
  const price = ops.prices[product];
  const minPrice = OPS_ECONOMY.priceMinMult, maxPrice = OPS_ECONOMY.priceMaxMult;
  const vehicleCap = totalVehicleCapacity(GAME);
  const myVehicleShare = totalDist > 0 ? Math.round(vehicleCap * (distributors / totalDist)) : 0;

  const districtCards = GAME.districts.map(d => {
    const farm = d.farms[product];
    const plotCost = getFarmPlotCost(GAME, d.id, product);
    const progressPct = clamp((farm.growTurn / def.growTurns) * 100, 0, 100);
    const atPlotCap = farm.plots >= limits.maxPlotsPerDistrict;
    return `
      <div class="card">
        <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
        <div class="row between"><span>Plots: ${farm.plots}/${limits.maxPlotsPerDistrict}</span><button class="btn-small" onclick="actionBuyFarmPlot(${d.id}, '${product}')" ${atPlotCap ? 'disabled' : ''}>${atPlotCap ? 'Rank Limit' : `Buy Plot (${fmtMoney(plotCost)})`}</button></div>
        ${farm.plots > 0 ? `
          <div class="bar-label" style="margin-top:6px;"><span>Grow Cycle</span><span>${farm.growTurn}/${def.growTurns} turns</span></div>
          <div class="bar-track"><div class="bar-fill control" style="width:${progressPct}%"></div></div>
        ` : ''}
        <div class="muted small" style="margin-top:6px;">Pending batch value: ${fmtMoney(farm.pendingValue)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>${def.icon} ${def.label}</h2>
      <p class="muted small">Each plot matures into a batch worth ${fmtMoney(def.batchValuePerPlot)} (before equipment bonus) every ${def.growTurns} turns. Distributors then sell off the matured batch value over subsequent turns based on your set price.</p>
      <div class="muted small">Rank ${GAME.player.rank} allows up to ${limits.maxPlotsPerDistrict} plot(s)/district, equipment tier ${limits.maxEquipmentTier}, and ${limits.maxDistributors} distributor(s) total (shared across products). Rank up to expand further.</div>
      <div class="grid">
        <div>
          <h3>Equipment</h3>
          <div class="muted small">Current: ${equipCurrent.name} (x${equipCurrent.yieldMult.toFixed(2)} yield)</div>
          ${equipNext && !equipLocked
            ? `<div class="row between" style="margin-top:6px;">
                <span class="small">Upgrade to ${equipNext.name} (x${equipNext.yieldMult.toFixed(2)}): ${fmtMoney(equipNext.cost)}</span>
                <button class="btn-small" onclick="actionBuyEquipment('${product}')">Upgrade</button>
              </div>`
            : equipNext
              ? `<div class="small muted" style="margin-top:6px;">Further upgrades unlock at a higher rank.</div>`
              : `<div class="small muted" style="margin-top:6px;">Maximum equipment tier reached.</div>`
          }
        </div>
        <div>
          <h3>Distributors</h3>
          <div class="muted small">Hired: ${distributors} &middot; Upkeep: ${fmtMoney(DISTRIBUTOR_UPKEEP)}/turn each</div>
          <div class="muted small">Moves up to ${fmtMoney(DISTRIBUTOR_BASE_CAPACITY)} value/turn each on foot, plus a share of your vehicle fleet (currently +${fmtMoney(myVehicleShare)}/turn for this product). Buy vehicles in the Crew tab to move more product.</div>
          <div class="row" style="margin-top:6px;">
            <input type="number" id="ops-distributors-${product}" value="1" min="1" style="width:70px;" />
            <button class="btn-small" onclick="actionHireDistributors('${product}')">Hire (${fmtMoney(DISTRIBUTOR_HIRE_COST)} ea)</button>
          </div>
        </div>
        <div>
          <h3>Street Price</h3>
          <div class="muted small">Markup multiplier (${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}). Higher markup means more cash per unit sold but slower sales.</div>
          <div class="row" style="margin-top:6px;">
            <input type="number" id="ops-price-${product}" value="${price}" min="${minPrice}" max="${maxPrice}" step="0.05" style="width:90px;" />
            <button class="btn-small" onclick="actionSetOperationPrice('${product}')">Set (current x${price.toFixed(2)})</button>
          </div>
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
    return `
      <div class="card">
        <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
        <h3 style="margin-top:0;">${def.label}: ${current.name} ${d.operations[op].raided ? '<span class="tag dirty">Raided</span>' : ''}</h3>
        <div class="muted small">Throughput: ${current.throughput}/turn, Bust Risk: ${current.bustRisk}%</div>
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
    return `
      <div class="card">
        <h3>${d.name} ${d.id === GAME.player.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
        <h3 style="margin-top:0;">${def.label}: ${current.name}</h3>
        <div class="muted small">Capacity: ${current.capacity}, Heat Mitigation: ${current.heatMitigation}</div>
        ${current.goodsCapacity > 0 ? `<div class="muted small">Goods Storage: ${fmtMoney(goodsUsed)} / ${fmtMoney(current.goodsCapacity)}${goodsUsed > current.goodsCapacity ? ' (overflowing - rivals will raid the excess)' : ' (spare space rents out to other crews for income each turn)'}</div>` : `<div class="muted small">No goods storage - build a Safehouse or better to rent spare space to other crews for income.</div>`}
        ${next
          ? `<div class="row between" style="margin-top:6px;">
              <span class="small">Upgrade to ${next.name}: ${fmtMoney(next.cost)} Dirty Cash</span>
              <button onclick="actionUpgradeOperation(${d.id}, '${op}')" ${check.ok ? '' : 'disabled'}>${check.ok ? 'Upgrade' : check.reason}</button>
            </div>`
          : `<div class="small muted" style="margin-top:6px;">Maximum tier reached.</div>`
        }
        <hr class="sep" />
        <div class="muted small">Protection Racket: ${racket ? `Level ${racket.level}/3 (${fmtMoney(racket.level * 60)}/turn)` : 'None - start one from Heists & Rackets.'}</div>
        ${canAccessOperations(GAME) ? `
          <hr class="sep" />
          <div class="muted small">Operation Protection (reduces drug-operation raid risk &amp; heat here)</div>
          ${statBar('Protection', opProtection, 100, 'control')}
          <div class="row between" style="margin-top:4px;">
            <input type="number" id="ops-protection-bribe-${d.id}" placeholder="Bribe amount ($)" min="0" style="width:140px;" />
            <button class="btn-small" onclick="actionBribeOpProtection(${d.id})">Bribe for Protection</button>
          </div>
        ` : ''}
      </div>
    `;
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
