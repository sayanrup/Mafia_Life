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
  const cost = costForUsage(usage, def);
  return { cost, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

// Cost in USD for a given token usage under a model's per-million-token pricing.
function costForUsage(usage, modelDef) {
  if (!modelDef || modelDef.inputCost === null || modelDef.outputCost === null) return null;
  return (usage.inputTokens / 1e6) * modelDef.inputCost + (usage.outputTokens / 1e6) * modelDef.outputCost;
}

// Per-model cost breakdown for the tokens consumed so far, used by the
// Settings cost calculator to compare what the run would have cost on
// each priced model.
function aiCostBreakdown(settings) {
  const usage = settings.aiUsage || { inputTokens: 0, outputTokens: 0 };
  return AI_MODEL_OPTIONS
    .filter(m => m.inputCost !== null && m.outputCost !== null)
    .map(m => ({ id: m.id, label: m.label, inputCost: m.inputCost, outputCost: m.outputCost, cost: costForUsage(usage, m) }));
}

/* ---------------- Batched Narration ---------------- */

const MAX_NARRATION_BATCH = 4;

// True while a batch request is in flight. Prevents overlapping requests -
// any narration queued while a request is pending waits for it to finish.
let AI_REQUEST_IN_FLIGHT = false;

/**
 * Sends ALL queued narration items in a single request and resolves the
 * batch as one log update, then recurses to drain any remaining queue.
 * This keeps AI calls to roughly one per turn/action even when several
 * narrate() calls happened along the way.
 */
function flushNarrationQueue(state) {
  if (!state._narrationQueue || !state._narrationQueue.length) return;
  if (AI_REQUEST_IN_FLIGHT) return;
  if (!state.settings.apiKey) { state._narrationQueue = []; return; }

  const items = state._narrationQueue.splice(0, MAX_NARRATION_BATCH);
  AI_REQUEST_IN_FLIGHT = true;

  requestAINarrativeBatch(state, items, (results) => {
    AI_REQUEST_IN_FLIGHT = false;
    let changed = false;
    if (Array.isArray(results)) {
      for (let i = 0; i < items.length; i++) {
        const r = results[i];
        const category = (r && typeof r.category === 'string' && r.category) || items[i].category;
        const text = r && typeof r.text === 'string' ? r.text.trim() : '';
        if (text) {
          state.eventLog.push(logEntry(state, text, category + '_ai'));
          changed = true;
        }
      }
    }
    if (changed && typeof window !== 'undefined' && typeof window.onAINarrative === 'function') {
      window.onAINarrative();
    }
    flushNarrationQueue(state);
  });
}

/**
 * Requests short narrative/dialogue snippets for a batch of queued events
 * from OpenRouter in a single call. callback(items|null) is always called -
 * items is an array aligned with the input `items` array, or null on
 * missing key, network failure, or malformed response.
 */
function requestAINarrativeBatch(state, items, callback) {
  const settings = state.settings;
  const apiKey = settings.apiKey;
  if (!apiKey || !items || !items.length) { callback(null); return; }

  const model = getAIModel(settings);
  if (!model) { callback(null); return; }

  const summary = buildStateSummary(state);
  const recent = recentLogLines(state, 5);

  const systemPrompt = 'You are a narrative generator for a gritty, noir crime-drama text RPG called Underworld. ' +
    'You will receive a list of game events that just happened, each with a category and a short base description. ' +
    'For EACH item, write ONE short paragraph (2-4 sentences) of atmospheric narrative or dialogue that expands on it. ' +
    'Tone: mature crime drama in the vein of Breaking Bad, Narcos, The Godfather, Peaky Blinders. ' +
    'No real-world brand names, no real public figures, no graphic gore - implied violence and noir atmosphere only. ' +
    `Respond ONLY with strict JSON of the form {"items":[{"category":"...","text":"..."}]} with exactly ${items.length} entries, ` +
    'in the same order as the input items, and nothing else.';

  const userPrompt = JSON.stringify({
    eventState: summary,
    recentLog: recent,
    items: items.map(i => ({ category: i.category, baseText: i.text }))
  });

  // Anthropic models served via OpenRouter support prompt caching on the
  // system message - the system prompt is identical on every call, so
  // marking it cacheable cuts repeat input-token cost.
  const systemMessage = model.indexOf('anthropic/') === 0
    ? { role: 'system', content: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] }
    : { role: 'system', content: systemPrompt };

  fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(120 * items.length + 100, 1000),
      messages: [
        systemMessage,
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
      if (parsed && Array.isArray(parsed.items)) {
        callback(parsed.items);
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
