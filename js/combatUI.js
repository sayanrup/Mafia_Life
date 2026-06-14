/* ============================================================
   UNDERWORLD - UI: Major Gang War Tactical Panel
   ============================================================ */

let GANG_WAR = null; // active war state, or null when no gang war is in progress

function renderGangWarPanel() {
  const war = GANG_WAR;
  const enemy = GAME.gangs[war.enemyGangId];
  const district = GAME.districts[war.districtId];

  const logLines = war.log.slice(-6).map(l => `<div class="log-entry">${l}</div>`).join('');

  return `
    <div class="card gangwar-panel">
      <h2>Gang War: ${district.name}</h2>
      <p class="muted">${GAME.player.name}'s crew vs. the ${enemy.name} (led by ${enemy.boss.name}, ${enemy.boss.personality})</p>
      <div class="grid">
        ${statBar('Your Crew', war.playerHP, 100, 'health')}
        ${statBar(`${enemy.name}`, war.enemyHP, 100, 'heat-gangs')}
      </div>
      <div class="log" style="margin-top:10px; max-height:160px;">${logLines}</div>
      <div class="row" style="margin-top:10px; justify-content:center;">
        <button class="btn-primary" onclick="actionGangWarRound('attack')">Attack</button>
        <button onclick="actionGangWarRound('defend')">Defend</button>
        <button onclick="actionGangWarRound('item')">Use Item (5 Arms)</button>
        <button onclick="actionGangWarRound('special')" ${war.specialUsed ? 'disabled' : ''}>Special</button>
        <button class="btn-danger" onclick="actionGangWarRound('flee')">Flee</button>
      </div>
    </div>
  `;
}

function actionGangWarRound(playerAction) {
  const war = GANG_WAR;
  const result = gangWarRound(GAME, war, playerAction);

  if (result.fled) {
    resolveGangWarOutcome(GAME, war, 'fled');
    GANG_WAR = null;
    checkGameOver(GAME);
    autosave(GAME);
    renderApp();
    return;
  }

  if (result.outcome) {
    resolveGangWarOutcome(GAME, war, result.outcome);
    GANG_WAR = null;
    checkGameOver(GAME);
    autosave(GAME);
    renderApp();
    return;
  }

  renderApp();
}
