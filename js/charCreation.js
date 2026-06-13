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
  const eraCards = Object.values(ERAS).map(e => `
    <div class="option-card ${CC.era === e.id ? 'selected' : ''}" onclick="ccSelectEra('${e.id}')">
      <h3>${e.label}</h3>
      <p>${e.id === 'custom' ? 'Define your own era - used to flavor the narrative.' : e.flavor}</p>
    </div>
  `).join('');

  const originCards = Object.values(ORIGINS).map(o => `
    <div class="option-card ${CC.originId === o.id ? 'selected' : ''}" onclick="ccSelectOrigin('${o.id}')">
      <h3>${o.label}</h3>
      <p>${o.desc}</p>
      <p class="small">${o.start.bonus}</p>
    </div>
  `).join('');

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
        <h2>Choose Your Era</h2>
        <div class="grid">${eraCards}</div>
        ${CC.era === 'custom' ? `
          <div class="field" style="margin-top:10px;">
            <label>Describe your custom era (used in flavor text)</label>
            <input type="text" id="cc-custom-era" placeholder="e.g. a rain-soaked cyberpunk sprawl" value="${CC.customEra}" oninput="ccUpdateField('customEra', this.value)" />
          </div>
        ` : ''}
      </div>

      <div class="card">
        <h2>Your Origin</h2>
        <div class="grid">${originCards}</div>
      </div>

      <div class="row" style="justify-content:center; margin-top:10px;">
        <button class="btn-primary" onclick="ccSubmit()">Begin</button>
      </div>
      <p class="small muted" style="text-align:center;">Have a save already? Check the Settings tab after starting, or import a save file once in-game.</p>
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
