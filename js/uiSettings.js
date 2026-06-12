/* ============================================================
   UNDERWORLD - UI: Settings (API key, Saves, Export/Import, Reset)
   ============================================================ */

function renderSettings() {
  const settings = GAME.settings;

  const slotRows = SAVE_SLOTS.map(slot => {
    const meta = getSlotMeta(slot);
    const info = meta
      ? `${meta.name} - ${meta.rank} - Day ${meta.day} - ${fmtMoney(meta.cash)} - ${new Date(meta.savedAt).toLocaleString()}`
      : 'Empty';
    return `
      <div class="card" style="margin-bottom:6px;">
        <div class="row between"><strong>${slot.toUpperCase()}</strong><span class="muted small">${info}</span></div>
        <div class="row" style="margin-top:6px;">
          <button onclick="actionSaveToSlot('${slot}')">Save Here</button>
          <button onclick="actionLoadFromSlot('${slot}')" ${meta ? '' : 'disabled'}>Load</button>
          <button class="btn-danger" onclick="actionDeleteSlot('${slot}')" ${meta ? '' : 'disabled'}>Delete</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>AI Narrative (optional)</h2>
      <p class="muted small">If set, Underworld will occasionally request short narrative flavor from the Anthropic API using model "claude-sonnet-4-6". Your key is stored only in this browser's localStorage and sent directly to api.anthropic.com. All game mechanics remain deterministic - this only affects flavor text. Leave blank to use the built-in offline narrative pool.</p>
      <div class="field">
        <label>Anthropic API Key</label>
        <input type="password" id="api-key-input" value="${settings.apiKey || ''}" placeholder="sk-ant-..." />
      </div>
      <div class="row">
        <button onclick="actionSaveApiKey()">Save Key</button>
        <button onclick="actionTestApiKey()">Test Key</button>
        <button class="btn-danger" onclick="actionClearApiKey()">Clear Key</button>
      </div>
    </div>

    <div class="card">
      <h2>Save Slots</h2>
      ${slotRows}
    </div>

    <div class="card">
      <h2>Export / Import</h2>
      <div class="row">
        <button onclick="exportStateToFile(GAME)">Export Save (.json)</button>
        <label class="btn" style="cursor:pointer;">
          Import Save (.json)
          <input type="file" accept=".json,application/json" style="display:none;" onchange="actionImportFile(this)" />
        </label>
      </div>
    </div>

    <div class="card">
      <h2>Reset</h2>
      <p class="muted small">This permanently deletes your current run (autosave). Manual save slots are unaffected.</p>
      <button class="btn-danger" onclick="actionResetGame()">Abandon Run &amp; Start New Game</button>
    </div>
  `;
}

function actionSaveApiKey() {
  const input = document.getElementById('api-key-input');
  GAME.settings.apiKey = input.value.trim();
  saveSettings(GAME.settings);
  autosave(GAME);
  showMsg('Settings', 'API key saved.');
}

function actionClearApiKey() {
  GAME.settings.apiKey = '';
  saveSettings(GAME.settings);
  autosave(GAME);
  renderApp();
}

function actionTestApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (!key) { showMsg('Settings', 'Enter an API key first.'); return; }
  showMsg('Settings', 'Testing key...');
  testAPIKey(key, (ok, status) => {
    showMsg('Settings', ok ? 'Key works! AI narrative is enabled.' : `Key test failed (status ${status}). Falling back to offline narrative.`);
  });
}

function actionSaveToSlot(slot) {
  saveToSlot(GAME, slot);
  renderApp();
}

function actionLoadFromSlot(slot) {
  const loaded = loadFromSlot(slot);
  if (!loaded) return;
  GAME = loaded;
  autosave(GAME);
  setActiveTab('home');
}

function actionDeleteSlot(slot) {
  deleteSlot(slot);
  renderApp();
}

function actionImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  importStateFromFile(file, (state, err) => {
    if (err || !state || !state.player) { showMsg('Import', 'Could not read save file.'); return; }
    GAME = state;
    autosave(GAME);
    setActiveTab('home');
  });
}

function actionResetGame() {
  if (!confirm('Abandon your current run and start a new game? Manual save slots are kept.')) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  GAME = null;
  CC = { name: '', era: 'modern', customEra: '', cityName: '', originId: 'hustler' };
  setActiveTab('home');
}
