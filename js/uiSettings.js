/* ============================================================
   UNDERWORLD - UI: Settings (AI Narrative, Save, Load, Exit, Reset)
   ============================================================ */

function renderSettings() {
  const settings = GAME.settings;
  const saveMeta = getSaveMeta();
  const saveInfo = saveMeta
    ? `${saveMeta.name} - ${saveMeta.rank} - Day ${saveMeta.day} - ${fmtMoney(saveMeta.cash)} - ${new Date(saveMeta.savedAt).toLocaleString()}`
    : 'No save yet.';

  const modelOptions = AI_MODEL_OPTIONS.map(m => `<option value="${m.id}" ${settings.aiModel === m.id ? 'selected' : ''}>${m.label}${m.inputCost !== null ? ` ($${m.inputCost.toFixed(2)}/M in, $${m.outputCost.toFixed(2)}/M out)` : ''}</option>`).join('');

  const usage = settings.aiUsage || { inputTokens: 0, outputTokens: 0 };
  const costEstimate = estimateAICost(settings);
  const costLine = costEstimate
    ? `Estimated spend: ~$${costEstimate.cost.toFixed(4)} (${usage.inputTokens.toLocaleString()} input / ${usage.outputTokens.toLocaleString()} output tokens)`
    : `Tokens used so far: ${usage.inputTokens.toLocaleString()} input / ${usage.outputTokens.toLocaleString()} output (cost varies by model)`;

  return `
    <div class="card">
      <h2>AI Narrative (optional)</h2>
      <p class="muted small">If set, Underworld will occasionally request short narrative flavor from an AI model via OpenRouter. Your key is stored only in this browser's localStorage and sent directly to openrouter.ai. All game mechanics remain deterministic - this only affects flavor text. Leave the key blank to use the built-in offline narrative pool.</p>
      <div class="field">
        <label>OpenRouter API Key</label>
        <input type="password" id="api-key-input" value="${settings.apiKey || ''}" placeholder="sk-or-..." />
      </div>
      <div class="field">
        <label>Model</label>
        <select id="ai-model-select" onchange="actionAIModelChange()">${modelOptions}</select>
      </div>
      ${settings.aiModel === 'custom' ? `
        <div class="field">
          <label>Custom Model ID</label>
          <input type="text" id="ai-custom-model" value="${settings.aiCustomModel || ''}" placeholder="e.g. anthropic/claude-3.5-haiku" />
        </div>
      ` : ''}
      <div class="field">
        <label>Narration Frequency</label>
        <select id="ai-narration-frequency" onchange="actionNarrationFrequencyChange()">
          <option value="all" ${settings.aiNarrationFrequency === 'all' || !settings.aiNarrationFrequency ? 'selected' : ''}>All events - most AI flavor, higher token usage</option>
          <option value="major" ${settings.aiNarrationFrequency === 'major' ? 'selected' : ''}>Major events only - fights, jobs, raids, family, betrayal</option>
          <option value="off" ${settings.aiNarrationFrequency === 'off' ? 'selected' : ''}>Off - offline narrative only</option>
        </select>
      </div>
      <p class="muted small">Queued events are sent to the AI in a single batched request (at most one in flight at a time), so AI flavor arrives shortly after - not instantly - and costs roughly one call per turn regardless of how many things happened.</p>
      <div class="muted small" style="margin-bottom:8px;">${costLine}</div>
      <div class="row">
        <button onclick="actionSaveApiKey()">Save Settings</button>
        <button onclick="actionTestApiKey()">Test Key</button>
        <button class="btn-danger" onclick="actionClearApiKey()">Clear Key</button>
      </div>
    </div>

    <div class="card">
      <h2>Game</h2>
      <p class="muted small">Last save: ${saveInfo}</p>
      <div class="row">
        <button onclick="actionSaveGame()">Save</button>
        <button onclick="actionLoadGame()" ${saveMeta ? '' : 'disabled'}>Load</button>
        <button onclick="actionExitGame()">Exit</button>
        <button class="btn-danger" onclick="actionResetGame()">Reset</button>
      </div>
    </div>
  `;
}

function actionAIModelChange() {
  const select = document.getElementById('ai-model-select');
  GAME.settings.aiModel = select.value;
  saveSettings(GAME.settings);
  renderApp();
}

function actionNarrationFrequencyChange() {
  const select = document.getElementById('ai-narration-frequency');
  GAME.settings.aiNarrationFrequency = select.value;
  saveSettings(GAME.settings);
}

function actionSaveApiKey() {
  const input = document.getElementById('api-key-input');
  GAME.settings.apiKey = input.value.trim();
  const customInput = document.getElementById('ai-custom-model');
  if (customInput) GAME.settings.aiCustomModel = customInput.value.trim();
  saveSettings(GAME.settings);
  autosave(GAME);
  showMsg('Settings', 'AI settings saved.');
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
  const customInput = document.getElementById('ai-custom-model');
  const settingsCopy = Object.assign({}, GAME.settings, { aiCustomModel: customInput ? customInput.value.trim() : GAME.settings.aiCustomModel });
  const model = getAIModel(settingsCopy);
  if (!model) { showMsg('Settings', 'Enter a custom model ID first.'); return; }
  showMsg('Settings', 'Testing key...');
  testAPIKey(key, model, (ok, status) => {
    showMsg('Settings', ok ? 'Key works! AI narrative is enabled.' : `Key test failed (status ${status}). Falling back to offline narrative.`);
  });
}

/* ---------------- Save / Load / Exit / Reset ---------------- */

function actionSaveGame() {
  saveGame(GAME);
  showMsg('Settings', 'Game saved.');
}

function actionLoadGame() {
  const loaded = loadGame();
  if (!loaded) { showMsg('Settings', 'No save found.'); return; }
  GAME = loaded;
  autosave(GAME);
  setActiveTab('home');
}

function actionExitGame() {
  if (!confirm('Exit to the title screen? Unsaved progress since your last Save will be kept in autosave on this device.')) return;
  autosave(GAME);
  GAME = null;
  CC = { name: '', era: 'modern', customEra: '', cityName: '', originId: 'hustler' };
  renderApp();
}

function actionResetGame() {
  if (!confirm('Abandon your current run and start a new game? Your manual save is kept.')) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  GAME = null;
  CC = { name: '', era: 'modern', customEra: '', cityName: '', originId: 'hustler' };
  setActiveTab('home');
}
