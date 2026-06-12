/* ============================================================
   UNDERWORLD - AI Narrative Integration (optional)
   Uses the Anthropic API directly from the browser if a key is
   configured in Settings. Falls back silently on any failure.
   All numeric outcomes are deterministic and computed elsewhere -
   this module only supplies flavor text.
   ============================================================ */

const AI_MODEL = 'claude-sonnet-4-6';
const AI_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function buildStateSummary(state) {
  const era = state.meta.era === 'custom' ? state.meta.customEraText : (ERAS[state.meta.era] ? ERAS[state.meta.era].label : state.meta.era);
  const district = state.districts[state.player.currentDistrict];
  return {
    era,
    city: state.meta.cityName,
    day: state.meta.day,
    playerName: state.player.name,
    rank: state.player.rank,
    currentDistrict: district ? district.name : 'unknown',
    health: state.player.health,
    cashDirty: Math.round(state.player.cash.dirty),
    cashClean: Math.round(state.player.cash.clean),
    heat: state.player.heat,
    reputation: state.player.reputation,
    crewSize: state.player.crew.size,
    crewLoyalty: state.player.crew.loyalty
  };
}

function recentLogLines(state, n) {
  return state.eventLog.slice(-n).map(e => e.text);
}

/**
 * Requests a short narrative/dialogue snippet from the Anthropic API.
 * callback(text|null) is always called - null on missing key, network
 * failure, or malformed response so callers can fall back gracefully.
 */
function requestAINarrative(state, category, extra, callback) {
  const apiKey = state.settings.apiKey;
  if (!apiKey) { callback(null); return; }

  const summary = buildStateSummary(state);
  const recent = recentLogLines(state, 5);

  const systemPrompt = 'You are a narrative generator for a gritty, noir crime-drama text RPG called Underworld. ' +
    'Write ONE short paragraph (2-4 sentences) of atmospheric narrative or dialogue matching the requested event category. ' +
    'Tone: mature crime drama in the vein of Breaking Bad, Narcos, The Godfather, Peaky Blinders. ' +
    'No real-world brand names, no real public figures, no graphic gore - implied violence and noir atmosphere only. ' +
    'Respond ONLY with strict JSON of the form {"text": "..."} and nothing else.';

  const userPrompt = JSON.stringify({
    category,
    eventState: summary,
    recentLog: recent
  });

  fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
    .then(res => {
      if (!res.ok) throw new Error('AI request failed: ' + res.status);
      return res.json();
    })
    .then(data => {
      const block = data && data.content && data.content[0];
      if (!block || !block.text) { callback(null); return; }
      let parsed;
      try {
        parsed = JSON.parse(block.text);
      } catch (e) {
        // Model may wrap JSON in prose; try to extract the first {...} block
        const match = block.text.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
        }
      }
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
        callback(parsed.text.trim());
      } else {
        callback(null);
      }
    })
    .catch(() => callback(null));
}

function testAPIKey(apiKey, callback) {
  fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }]
    })
  })
    .then(res => callback(res.ok, res.status))
    .catch(() => callback(false, 0));
}
