/* ============================================================
   UNDERWORLD - Main: Init, Turn Loop, Activity Action Handlers
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const saved = loadAutosave();
  if (saved && saved.player) {
    GAME = saved;
  } else {
    GAME = null;
  }
  renderApp();
});

/* ---------------- Action Economy Wrapper ---------------- */

function tryAction(actionKey, fn) {
  if (actionKey) {
    const counts = GAME.player.actionCounts || (GAME.player.actionCounts = {});
    const used = counts[actionKey] || 0;
    if (used >= MAX_ACTION_REPEATS) {
      showMsg('Action Limit Reached', `You've already done this ${MAX_ACTION_REPEATS} times this turn. End the turn to do it again.`);
      return;
    }
  }
  const res = fn();
  if (res && res.ok === false) {
    showMsg('Action Failed', res.reason);
    return;
  }
  if (actionKey) {
    GAME.player.actionCounts[actionKey] = (GAME.player.actionCounts[actionKey] || 0) + 1;
  }
  checkGameOver();
  autosave(GAME);
  renderApp();
}

/* ---------------- Activity Handlers (capped per-turn) ---------------- */

function actionMug() {
  tryAction('mug', () => { doMugging(GAME); });
}

function actionStreetCrime(crimeId) {
  tryAction('street_' + crimeId, () => doStreetCrime(GAME, crimeId));
}

function actionGangGig(gigId) {
  tryAction('gig_' + gigId, () => doGangGig(GAME, gigId));
}

function actionHeist() {
  tryAction('heist', () => doHeist(GAME));
}

function actionExtortion() {
  tryAction('extortion', () => startExtortion(GAME));
}

function actionSmuggling() {
  tryAction('smuggling', () => doSmugglingRun(GAME));
}

function actionHit() {
  tryAction('hit', () => {
    const select = document.getElementById('hit-target');
    if (!select || !select.value) return { ok: false, reason: 'No target selected.' };
    return doHit(GAME, select.value);
  });
}

function actionKidnap(jobId) {
  tryAction('kidnap_' + jobId, () => doKidnapJob(GAME, jobId));
}

function actionStartGangWar() {
  const select = document.getElementById('hit-target');
  if (!select || !select.value) { showMsg('Gang War', 'No target selected.'); return; }
  MODAL = { type: 'gangwar', war: startGangWar(GAME, GAME.player.currentDistrict, select.value) };
  renderApp();
}

/* ---------------- Deals / Bribes (no action cost) ---------------- */

function actionSell() {
  const productSelect = document.getElementById('deal-product');
  const qtyInput = document.getElementById('deal-qty');
  const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
  const res = sellProduct(GAME, productSelect.value, qty);
  if (!res.ok) { showMsg('Deal', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionBribePD() {
  const select = document.getElementById('bribe-pd');
  const amountInput = document.getElementById('bribe-pd-amount');
  const amount = Math.max(0, parseInt(amountInput.value, 10) || 0);
  if (amount <= 0) { showMsg('Bribe', 'Enter an offer amount.'); return; }
  const res = attemptBribe(GAME, select.value, amount);
  showMsg('Bribe Result', res.message);
  autosave(GAME);
}

function actionBribeFed() {
  const select = document.getElementById('bribe-fed');
  const amountInput = document.getElementById('bribe-fed-amount');
  const amount = Math.max(0, parseInt(amountInput.value, 10) || 0);
  if (amount <= 0) { showMsg('Bribe', 'Enter an offer amount.'); return; }
  const res = attemptBribe(GAME, select.value, amount);
  showMsg('Bribe Result', res.message);
  autosave(GAME);
}

function actionBribeRival() {
  const select = document.getElementById('bribe-rival');
  const amountInput = document.getElementById('bribe-rival-amount');
  const amount = Math.max(0, parseInt(amountInput.value, 10) || 0);
  if (amount <= 0) { showMsg('Bribe', 'Enter an offer amount.'); return; }
  const res = bribeRivalCrew(GAME, GAME.player.currentDistrict, select.value, amount);
  showMsg('Bribe Result', res.message);
  autosave(GAME);
  renderApp();
}

/* ---------------- Operations / Hospital / Travel (no action cost) ---------------- */

function actionUpgradeOperation(districtId, opType) {
  const res = upgradeOperation(GAME, districtId, opType);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionHospital() {
  const res = visitHospital(GAME);
  if (!res.ok) { showMsg('Hospital', res.reason); return; }
  autosave(GAME);
  renderApp();
}

/* ---------------- Drug Operations (no action cost) ---------------- */

function actionBuyFarmPlot(districtId, product) {
  const res = buyFarmPlot(GAME, districtId, product);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionHireDistributors(product, typeId) {
  const input = document.getElementById(`ops-distributors-${product}-${typeId}`);
  const count = Math.max(1, parseInt(input.value, 10) || 1);
  const res = hireDistributors(GAME, product, typeId, count);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionSetOperationPrice(product) {
  const input = document.getElementById(`ops-price-${product}`);
  const price = parseFloat(input.value);
  const res = setOperationPrice(GAME, product, price);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionSetOperationPricePreset(product, mult) {
  const res = setOperationPrice(GAME, product, mult);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionBuyEquipment(product) {
  const res = buyEquipment(GAME, product);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionBribeOpProtection(districtId) {
  const input = document.getElementById(`ops-protection-bribe-${districtId}`);
  const amount = Math.max(0, parseInt(input.value, 10) || 0);
  const res = bribeOpProtection(GAME, districtId, amount);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionHireSecurityDetail(districtId, tierId) {
  const res = hireSecurityDetail(GAME, districtId, tierId);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionLaunchMarketing(product, campaignId) {
  const res = launchMarketingCampaign(GAME, product, campaignId);
  if (!res.ok) { showMsg('Operations', res.reason); return; }
  autosave(GAME);
  renderApp();
}

/* ---------------- Vehicles / Armory Sales / Gang Laundering (no action cost) ---------------- */

function actionBuyVehicle(typeId) {
  const res = buyVehicle(GAME, typeId);
  if (!res.ok) { showMsg('Vehicles', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionSellVehicle(vehicleId) {
  const res = sellVehicle(GAME, vehicleId);
  if (!res.ok) { showMsg('Vehicles', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function actionSellWeapons(tier) {
  const input = document.getElementById(`armory-sell-${tier}`);
  const qty = Math.max(1, parseInt(input.value, 10) || 1);
  const res = sellWeapons(GAME, tier, qty);
  if (!res.ok) { showMsg('Armory', res.reason); return; }
  autosave(GAME);
  renderApp();
}

/* ---------------- Criminal World (Council Decisions) ---------------- */

function actionResolveCouncilDecision(optionId) {
  const res = resolveCouncilDecision(GAME, optionId);
  if (!res.ok) { showMsg('Criminal World', res.reason); return; }
  autosave(GAME);
  renderApp();
}

function travelTo(districtId) {
  GAME.player.currentDistrict = districtId;
  narrate(GAME, 'district_travel');
  autosave(GAME);
  setActiveTab('home');
}

/* ---------------- Turn Loop ---------------- */

function endTurn() {
  const state = GAME;

  tickOperations(state);
  farmTick(state);
  extortionTick(state);
  applyLieutenantBonuses(state);
  saturationTick(state);
  launderingTick(state);
  businessIncomeTick(state);
  checkBusinessDamage(state);

  payUpkeep(state, state.player.crew.autoPayUpkeep);
  loyaltyTurnTick(state);
  familyTurnTick(state);
  lawEnforcementTurnTick(state);
  informantPlantedTick(state);
  weakenedGangsTick(state);
  runRivalGangAI(state);
  commissionTurnTick(state);
  criminalWorldTick(state);
  gangRelationsTick(state);
  tickInjuries(state);

  updateRank(state);
  checkFamilyReveal(state);

  const totalCash = state.player.cash.dirty + state.player.cash.clean;
  state.meta.peakCash = Math.max(state.meta.peakCash || 0, totalCash);

  state.meta.day++;
  state.meta.turn++;
  state.player.actionCounts = {};

  narrate(state, 'turn_tick');

  checkGameOver();
  autosave(state);
  renderApp();
}

/* ---------------- Game Over / New Game / Continuation ---------------- */

function checkGameOver() {
  const p = GAME.player;
  if (GAME.meta.gameOver) return;

  if (p.heat.pd >= 100 || p.heat.feds >= 100) {
    GAME.meta.gameOver = true;
    GAME.meta.gameOverReason = 'arrest';
    GAME.eventLog.push(logEntry(GAME, `The walls close in. ${p.heat.feds >= 100 ? 'Federal agents' : 'Local police'} move in on ${p.name}.`, 'system'));
  } else if (p.heat.gangs >= 100) {
    GAME.meta.gameOver = true;
    GAME.meta.gameOverReason = 'gangs';
    GAME.eventLog.push(logEntry(GAME, `The streets turn on ${p.name} for good. There's nowhere left to hide from the gangs of ${GAME.meta.cityName}.`, 'system'));
  } else if (p.health <= 0) {
    GAME.meta.gameOver = true;
    GAME.meta.gameOverReason = 'death';
    GAME.eventLog.push(logEntry(GAME, `${p.name}'s story ends in the streets of ${GAME.meta.cityName}.`, 'system'));
  }

  if (GAME.meta.gameOver) {
    const totalCash = p.cash.dirty + p.cash.clean;
    GAME.meta.peakCash = Math.max(GAME.meta.peakCash || 0, totalCash);
    autosave(GAME);
  }
}

function startOver() {
  localStorage.removeItem(AUTOSAVE_KEY);
  GAME = null;
  CC = { name: '', era: 'modern', customEra: '', cityName: '', originId: 'hustler' };
  setActiveTab('home');
}

function continueAsFamilyMember(memberId) {
  const state = GAME;
  const member = state.family.find(f => f.id === memberId);
  if (!member) return;

  state.family = state.family.filter(f => f.id !== memberId);

  state.player = {
    name: member.name,
    originId: state.player.originId,
    rank: 'Associate',
    health: 100,
    maxHealth: 100,
    injuries: [],
    recoveryTurns: 0,
    combatBonusTemp: 0,
    combatBonusTurns: 0,
    cash: {
      dirty: Math.round(state.player.cash.dirty * 0.25),
      clean: Math.round(state.player.cash.clean * 0.5)
    },
    heat: { pd: 0, feds: 0, gangs: 0 },
    reputation: { street: Math.round(state.player.reputation.street * 0.3), gang: Math.round(state.player.reputation.gang * 0.3), cartel: Math.round(state.player.reputation.cartel * 0.3) },
    crew: { size: 1, quality: 1, loyalty: 50, weaponTier: 0, upkeepPaid: true, autoPayUpkeep: true, trainingCompleted: [] },
    armory: freshArmory(),
    lieutenants: [],
    inventory: { product: { weed: 0, pills: 0, powder: 0, arms: 0, contraband: 0 }, consumables: {} },
    extortionRackets: [],
    affiliation: { type: 'solo', gangId: null },
    currentDistrict: 0,
    actionCounts: {},
    vehicles: [],
    operations: freshPlayerOperations()
  };

  state.meta.gameOver = false;
  state.meta.gameOverReason = null;
  state.commission.unlocked = false;

  state.eventLog.push(logEntry(state, `${member.name} steps up to carry on the family name in ${state.meta.cityName}. The old empire's ashes are still warm.`, 'system'));

  autosave(state);
  setActiveTab('home');
}
