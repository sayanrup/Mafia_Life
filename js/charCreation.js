/* ============================================================
   UNDERWORLD - Character Creation Screen
   ============================================================ */

let CC = {
  name: '',
  era: 'modern',
  customEra: '',
  cityName: '',
  originId: 'hustler'
};

function renderCharacterCreation() {
  const eraOptions = Object.values(ERAS).map(e => `
    <option value="${e.id}" ${CC.era === e.id ? 'selected' : ''}>${e.label}</option>
  `).join('');

  const originOptions = Object.values(ORIGINS).map(o => `
    <option value="${o.id}" ${CC.originId === o.id ? 'selected' : ''}>${o.label}</option>
  `).join('');

  const selectedEra = ERAS[CC.era];
  const selectedOrigin = ORIGINS[CC.originId];

  const citySuggestions = CITY_SUGGESTIONS.map(c => `<option value="${c}">`).join('');

  return `
    <div class="cc-screen">
      <h1 class="cc-title">Underworld</h1>
      <p class="cc-subtitle">Every empire starts in the gutter. Build yours.</p>

      <div class="card">
        <h2>Your Character</h2>
        <div class="row" style="gap:12px;">
          <div class="field" style="flex:1; min-width:140px;">
            <label>Name</label>
            <input type="text" id="cc-name" placeholder="What do they call you?" value="${CC.name}" oninput="ccUpdateField('name', this.value)" />
          </div>
          <div class="field" style="flex:1; min-width:140px;">
            <label>City</label>
            <input list="city-suggestions" id="cc-city" placeholder="Name your city" value="${CC.cityName}" oninput="ccUpdateField('cityName', this.value)" />
            <datalist id="city-suggestions">${citySuggestions}</datalist>
          </div>
        </div>
        <p class="small muted">Pick a city suggestion or type your own. District names will be generated from it.</p>
      </div>

      <div class="card">
        <div class="row" style="gap:12px;">
          <div class="field" style="flex:1; min-width:140px;">
            <label>Era</label>
            <select id="cc-era-select" onchange="ccSelectEra(this.value)">${eraOptions}</select>
          </div>
          <div class="field" style="flex:1; min-width:140px;">
            <label>Origin</label>
            <select id="cc-origin-select" onchange="ccSelectOrigin(this.value)">${originOptions}</select>
          </div>
        </div>
        <p class="small muted">${selectedEra.id === 'custom' ? 'Define your own era - used to flavor the narrative.' : selectedEra.flavor}</p>
        <p class="small muted">${selectedOrigin.desc} <strong>${selectedOrigin.start.bonus}</strong></p>
        ${CC.era === 'custom' ? `
          <div class="field" style="margin-top:10px;">
            <label>Describe your custom era (used in flavor text)</label>
            <input type="text" id="cc-custom-era" placeholder="e.g. a rain-soaked cyberpunk sprawl" value="${CC.customEra}" oninput="ccUpdateField('customEra', this.value)" />
          </div>
        ` : ''}
      </div>

      <div class="row" style="justify-content:center; margin-top:10px;">
        <button class="btn-primary" onclick="ccSubmit()">Begin</button>
      </div>
      <p class="small muted" style="text-align:center;">Have a save already? Check the Settings tab after starting, or import a save file once in-game.</p>
      <p class="cc-copyright">&copy; Sayan &mdash; AI Enthusiast &amp; Product Manager</p>
    </div>
  `;
}

function ccSelectEra(eraId) {
  CC.era = eraId;
  renderApp();
}

function ccSelectOrigin(originId) {
  CC.originId = originId;
  renderApp();
}

function ccUpdateField(field, value) {
  CC[field] = value;
}

function ccSubmit() {
  const nameInput = document.getElementById('cc-name');
  const cityInput = document.getElementById('cc-city');
  if (nameInput) CC.name = nameInput.value;
  if (cityInput) CC.cityName = cityInput.value;
  const customEraInput = document.getElementById('cc-custom-era');
  if (customEraInput) CC.customEra = customEraInput.value;

  if (!CC.name.trim()) { alert('Enter a name.'); return; }
  if (!CC.cityName.trim()) { alert('Name your city.'); return; }
  if (CC.era === 'custom' && !CC.customEra.trim()) { alert('Describe your custom era.'); return; }

  GAME = createNewGame(CC);
  autosave(GAME);
  setActiveTab('home');
  renderApp();
}
