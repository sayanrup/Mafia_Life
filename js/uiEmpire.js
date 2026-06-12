/* ============================================================
   UNDERWORLD - Drug Empire Tab UI
   ============================================================ */

function renderEmpire() {
  if (!canAccessEmpire(GAME)) {
    return `
      <div class="card">
        <h2>Drug Empire</h2>
        <p class="muted">Reach the rank of Boss to start building a drug empire - buying up land for production, hiring distributors to move product, and setting your own street prices.</p>
      </div>
    `;
  }

  const p = GAME.player;
  const distributorCount = totalDistributors(GAME);
  const upkeep = distributorCount * EMPIRE.distributorUpkeep;

  const priceRows = Object.values(PRODUCT_TYPES).map(pt => {
    const base = pt.baseValue;
    const min = Math.round(base * EMPIRE.priceMinMult);
    const max = Math.round(base * EMPIRE.priceMaxMult);
    const current = p.empire.prices[pt.id];
    return `
      <div class="row between" style="margin-bottom:6px;">
        <span>${pt.label} <span class="muted small">(${fmtMoney(min)} - ${fmtMoney(max)})</span></span>
        <span class="row">
          <input type="number" id="empire-price-${pt.id}" value="${current}" min="${min}" max="${max}" style="width:90px;" />
          <button class="btn-small" onclick="actionSetEmpirePrice('${pt.id}')">Set</button>
        </span>
      </div>
    `;
  }).join('');

  const districtCards = GAME.districts.map(d => {
    const plots = p.empire.plots[d.id] || {};
    const plotTotal = totalPlots(GAME, d.id);
    const nextCost = getPlotCost(GAME, d.id);
    const distributorsHere = p.empire.distributors[d.id] || 0;
    const protection = p.empire.protection[d.id] || 0;

    const plotRows = Object.values(PRODUCT_TYPES).map(pt => `
      <div class="row between">
        <span>${pt.label}: ${plots[pt.id] || 0} plot(s)</span>
        <button class="btn-small" onclick="actionBuyLand(${d.id}, '${pt.id}')">Buy plot (${fmtMoney(nextCost)})</button>
      </div>
    `).join('');

    return `
      <div class="card">
        <h3>${d.name} ${d.id === p.currentDistrict ? '<span class="tag clean">Current</span>' : ''}</h3>
        <div class="muted small">Total plots: ${plotTotal}</div>
        ${plotRows}
        <hr class="sep" />
        <div class="row between">
          <span>Distributors here: ${distributorsHere}</span>
          <span class="row">
            <input type="number" id="empire-distributors-${d.id}" value="1" min="1" style="width:70px;" />
            <button class="btn-small" onclick="actionHireDistributors(${d.id})">Hire (${fmtMoney(EMPIRE.distributorHireCost)} ea)</button>
          </span>
        </div>
        <hr class="sep" />
        ${statBar('Protection', protection, 100, 'control')}
        <div class="row between" style="margin-top:4px;">
          <input type="number" id="empire-bribe-${d.id}" placeholder="Bribe amount ($)" min="0" style="width:140px;" />
          <button class="btn-small" onclick="actionBribeProtection(${d.id})">Bribe for Protection</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>Drug Empire</h2>
      <p class="muted">As Boss, you control land, distributors, and street prices across ${GAME.meta.cityName}. At the end of each turn, owned plots produce product into your stash and distributors auto-sell it based on demand and your set prices.</p>
      <div class="row between">
        <span>Total Distributors: ${distributorCount}</span>
        <span>Upkeep per turn: ${fmtMoney(upkeep)}</span>
      </div>
    </div>

    <div class="card">
      <h2>Street Prices</h2>
      ${priceRows}
    </div>

    <div class="grid">${districtCards}</div>
  `;
}
