/* ============================================================
   UNDERWORLD - AI Narrative Integration (optional)
   Uses OpenRouter (OpenAI-compatible) from the browser if a key
   is configured in Settings. Falls back silently on any failure.
   All numeric outcomes are deterministic and computed elsewhere -
   this module only supplies flavor text.
   ============================================================ */

const AI_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function getAIModel(settings) {
  if (settings.aiModel === 'custom') return (settings.aiCustomModel || '').trim();
  return settings.aiModel || 'openrouter/auto:free';
}

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

/* ---------------- Token Usage / Cost Tracking ---------------- */

function recordAIUsage(settings, usage) {
  if (!usage) return;
  if (!settings.aiUsage) settings.aiUsage = { inputTokens: 0, outputTokens: 0 };
  settings.aiUsage.inputTokens += usage.prompt_tokens || 0;
  settings.aiUsage.outputTokens += usage.completion_tokens || 0;
  saveSettings(settings);
}

function estimateAICost(settings) {
  const usage = settings.aiUsage || { inputTokens: 0, outputTokens: 0 };
  const def = AI_MODEL_OPTIONS.find(m => m.id === settings.aiModel);
  if (!def || def.inputCost === null || def.outputCost === null) return null;
  const cost = (usage.inputTokens / 1e6) * def.inputCost + (usage.outputTokens / 1e6) * def.outputCost;
  return { cost, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

/**
 * Requests a short narrative/dialogue snippet from OpenRouter.
 * callback(text|null) is always called - null on missing key, network
 * failure, or malformed response so callers can fall back gracefully.
 */
function requestAINarrative(state, category, extra, callback) {
  const settings = state.settings;
  const apiKey = settings.apiKey;
  if (!apiKey) { callback(null); return; }

  const model = getAIModel(settings);
  if (!model) { callback(null); return; }

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
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })
    .then(res => {
      if (!res.ok) throw new Error('AI request failed: ' + res.status);
      return res.json();
    })
    .then(data => {
      recordAIUsage(settings, data && data.usage);
      const message = data && data.choices && data.choices[0] && data.choices[0].message;
      const text = message && message.content;
      if (!text) { callback(null); return; }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        // Model may wrap JSON in prose; try to extract the first {...} block
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
        }
      }
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
        callback(parsed.text.trim());
      } else if (typeof text === 'string' && text.trim()) {
        callback(text.trim());
      } else {
        callback(null);
      }
    })
    .catch(() => callback(null));
}

function testAPIKey(apiKey, modelId, callback) {
  fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }]
    })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
    .then(({ ok, status, data }) => callback(ok, status, data && data.usage))
    .catch(() => callback(false, 0, null));
}
