/* ============================================================
   UNDERWORLD - Event & Dialogue Pool
   Offline narrative pool (default mode) + AI hook integration.
   Placeholders: {city} {district} {gang} {boss} {era} {player}
   ============================================================ */

const EVENT_POOL = [
  /* ---------------- Turn Tick (15) ---------------- */
  { id: 't1', category: 'turn_tick', text: 'The night settles over {city} like a wet blanket. Somewhere, sirens wail and nobody looks up.' },
  { id: 't2', category: 'turn_tick', text: 'Word on the street says the {gang} are getting nervous. Good. Let them be.' },
  { id: 't3', category: 'turn_tick', text: 'A cold front rolls through {city}. Even the corner boys are working in coats tonight.' },
  { id: 't4', category: 'turn_tick', text: 'Somewhere across town, a deal you weren\'t part of just went very wrong. You hear about it secondhand.' },
  { id: 't5', category: 'turn_tick', text: 'The {district} hums with the usual late-night business. Nothing unusual - yet.' },
  { id: 't6', category: 'turn_tick', text: 'A new graffiti tag appears overnight, marking territory that wasn\'t marked yesterday.' },
  { id: 't7', category: 'turn_tick', text: 'You catch your reflection in a rain-streaked window and barely recognize the person staring back.' },
  { id: 't8', category: 'turn_tick', text: 'Someone left an unmarked envelope at your usual spot. Inside: nothing but a phone number.' },
  { id: 't9', category: 'turn_tick', text: 'The city keeps its secrets close, but everyone in {city} knows your name a little better today.' },
  { id: 't10', category: 'turn_tick', text: 'A radio crackles somewhere nearby, tuned to a police scanner. Old habits.' },
  { id: 't11', category: 'turn_tick', text: 'Rain hammers the rooftops of {district}. Good cover for moving product, bad cover for moving fast.' },
  { id: 't12', category: 'turn_tick', text: 'You hear the {boss} held court at a backroom card game last night. Nothing came of it - this time.' },
  { id: 't13', category: 'turn_tick', text: 'A street preacher on the corner shouts about judgment day. Half the block ignores him. The other half tips him.' },
  { id: 't14', category: 'turn_tick', text: 'The pulse of {city} doesn\'t care about your plans. It just keeps beating.' },
  { id: 't15', category: 'turn_tick', text: 'Somewhere, a debt comes due. Not yours - not yet.' },

  /* ---------------- Post-Crime Success (10) ---------------- */
  { id: 'cs1', category: 'post_crime_success', text: 'Clean, fast, and nobody saw a thing. Your crew moves like they\'ve done this a hundred times.' },
  { id: 'cs2', category: 'post_crime_success', text: 'It goes off without a hitch. Even the getaway felt easy - too easy, maybe.' },
  { id: 'cs3', category: 'post_crime_success', text: 'You walk away with more than expected and a story your crew will tell for weeks.' },
  { id: 'cs4', category: 'post_crime_success', text: 'Textbook. The kind of job that makes a reputation.' },
  { id: 'cs5', category: 'post_crime_success', text: 'Smooth as silk. Whoever planned this deserves a cut.' },
  { id: 'cs6', category: 'post_crime_success', text: 'In and out before anyone could blink. The {district} won\'t even know what hit it.' },
  { id: 'cs7', category: 'post_crime_success', text: 'Your crew comes back grinning, pockets heavy, mouths shut.' },
  { id: 'cs8', category: 'post_crime_success', text: 'A flawless run. Even the {gang} would respect it - if they ever found out.' },
  { id: 'cs9', category: 'post_crime_success', text: 'Sometimes everything just clicks. Tonight was one of those nights.' },
  { id: 'cs10', category: 'post_crime_success', text: 'No alarms, no witnesses, no problems. Just the way you like it.' },

  /* ---------------- Post-Crime Partial (8) ---------------- */
  { id: 'cp1', category: 'post_crime_partial', text: 'It mostly went to plan - "mostly" being the operative word.' },
  { id: 'cp2', category: 'post_crime_partial', text: 'You got out with something, but left more behind than you wanted to.' },
  { id: 'cp3', category: 'post_crime_partial', text: 'A close call near the end nearly turned the whole thing sideways.' },
  { id: 'cp4', category: 'post_crime_partial', text: 'Half a win is still a win, even if your crew won\'t stop complaining about it.' },
  { id: 'cp5', category: 'post_crime_partial', text: 'Someone improvised at the last second. It worked - barely.' },
  { id: 'cp6', category: 'post_crime_partial', text: 'You\'ll take it. Not the haul you wanted, but not nothing either.' },
  { id: 'cp7', category: 'post_crime_partial', text: 'A bystander got a good look at one of your guys. Nothing came of it. Probably.' },
  { id: 'cp8', category: 'post_crime_partial', text: 'The job took twice as long as it should have. Time is money, and you just spent both.' },

  /* ---------------- Post-Crime Fail (8) ---------------- */
  { id: 'cf1', category: 'post_crime_fail', text: 'It falls apart fast. Someone yells, someone runs, and suddenly everyone\'s running.' },
  { id: 'cf2', category: 'post_crime_fail', text: 'Wrong place, wrong time. The whole thing collapses before it really starts.' },
  { id: 'cf3', category: 'post_crime_fail', text: 'A silent alarm wasn\'t so silent. Your crew scatters into the {district} night.' },
  { id: 'cf4', category: 'post_crime_fail', text: 'Someone talked too loud, too soon. The job is dead before it begins.' },
  { id: 'cf5', category: 'post_crime_fail', text: 'You walk away empty-handed and lucky to be walking at all.' },
  { id: 'cf6', category: 'post_crime_fail', text: 'A rival crew was already working the same mark. Awkward doesn\'t cover it.' },
  { id: 'cf7', category: 'post_crime_fail', text: 'The whole thing goes loud, fast, and ugly. {city} hears about it by morning.' },
  { id: 'cf8', category: 'post_crime_fail', text: 'Bad intel, worse timing. You\'re lucky anyone made it back at all.' },

  /* ---------------- Post-Combat Win (6) ---------------- */
  { id: 'cw1', category: 'post_combat_win', text: 'The {gang} crew breaks first, scattering into alleys and side streets.' },
  { id: 'cw2', category: 'post_combat_win', text: 'Your crew stands over the wreckage, breathing hard but standing tall.' },
  { id: 'cw3', category: 'post_combat_win', text: 'The fight ends with a message sent loud and clear across {district}.' },
  { id: 'cw4', category: 'post_combat_win', text: 'It wasn\'t pretty, but the {gang} won\'t forget who walked away from this one.' },
  { id: 'cw5', category: 'post_combat_win', text: 'By the time it\'s over, the only ones still standing are yours.' },
  { id: 'cw6', category: 'post_combat_win', text: 'The dust settles in {district}, and the balance of power shifts a little further your way.' },

  /* ---------------- Post-Combat Loss (6) ---------------- */
  { id: 'cl1', category: 'post_combat_loss', text: 'It goes bad fast. Your crew pulls back, bloodied and short a few faces.' },
  { id: 'cl2', category: 'post_combat_loss', text: 'The {gang} hits harder and smarter than expected. You retreat to lick your wounds.' },
  { id: 'cl3', category: 'post_combat_loss', text: 'A bad read on their numbers turns the fight into a rout.' },
  { id: 'cl4', category: 'post_combat_loss', text: 'You limp back to {district} having lost more than ground.' },
  { id: 'cl5', category: 'post_combat_loss', text: 'The {gang} sends a clear message: not yet, not here, not like this.' },
  { id: 'cl6', category: 'post_combat_loss', text: 'It\'s a long, quiet ride back. Nobody wants to talk about what just happened.' },

  /* ---------------- Operation Raid (6) ---------------- */
  { id: 'or1', category: 'operation_raid', text: 'Flashing lights cut through {district}. Someone tipped them off, or got sloppy. Either way, it\'s a mess now.' },
  { id: 'or2', category: 'operation_raid', text: 'The operation goes dark fast. Whoever was on shift barely got out.' },
  { id: 'or3', category: 'operation_raid', text: 'By the time anyone notices the surveillance van, it\'s already too late.' },
  { id: 'or4', category: 'operation_raid', text: 'Doors get kicked in across {district}. The cleanup will take time - and money.' },
  { id: 'or5', category: 'operation_raid', text: 'A routine patrol turns into anything but. Someone\'s going to ask hard questions.' },
  { id: 'or6', category: 'operation_raid', text: 'The bust makes the morning news in {city}. Your name, thankfully, doesn\'t.' },

  /* ---------------- District Travel (8) ---------------- */
  { id: 'dt1', category: 'district_travel', text: 'You cross into {district}. The air changes - sharper, watchful.' },
  { id: 'dt2', category: 'district_travel', text: '{district} looks different at this hour. Quieter. Hungrier.' },
  { id: 'dt3', category: 'district_travel', text: 'Eyes follow you through {district}, the way they always do for someone who doesn\'t quite belong - yet.' },
  { id: 'dt4', category: 'district_travel', text: 'The streets of {district} carry the weight of whoever controls them this week.' },
  { id: 'dt5', category: 'district_travel', text: 'You roll into {district} and feel the familiar tension settle into your shoulders.' },
  { id: 'dt6', category: 'district_travel', text: 'In {district}, even the streetlights seem to take sides.' },
  { id: 'dt7', category: 'district_travel', text: 'A local kid points you toward {district} like he\'s done it a hundred times for a hundred people.' },
  { id: 'dt8', category: 'district_travel', text: '{district} smells like rain, gasoline, and old money gone bad.' },

  /* ---------------- Family (10) ---------------- */
  { id: 'fam1', category: 'family', text: '{family} corners you at the door, wanting to talk about something that has nothing to do with business - for once.' },
  { id: 'fam2', category: 'family', text: 'You catch {family} on the phone, voice low, conversation cut short the moment they see you.' },
  { id: 'fam3', category: 'family', text: '{family} asks for a "small favor" that sounds anything but small.' },
  { id: 'fam4', category: 'family', text: 'Over dinner, {family} brings up the old days - back before any of this started.' },
  { id: 'fam5', category: 'family', text: '{family} has been spending time with people you don\'t recognize. You make a note of it.' },
  { id: 'fam6', category: 'family', text: '{family} mentions, almost casually, that they\'ve been thinking about getting out of {city} altogether.' },
  { id: 'fam7', category: 'family', text: 'You find {family} up late, going over numbers that aren\'t theirs to go over.' },
  { id: 'fam8', category: 'family', text: '{family} surprises you with a small gift - the kind that means more than it should, lately.' },
  { id: 'fam9', category: 'family', text: '{family} asks, point blank, if any of this is worth it. You don\'t have a good answer.' },
  { id: 'fam10', category: 'family', text: 'A photo of {family} from years ago turns up in a box. Different city, different life.' },

  /* ---------------- Law Enforcement (6) ---------------- */
  { id: 'le1', category: 'lawenforcement', text: 'A familiar unmarked car idles two blocks down. Same one as last week. Coincidence, probably.' },
  { id: 'le2', category: 'lawenforcement', text: 'Someone in a cheap suit asks too many questions at the corner store. Word travels fast.' },
  { id: 'le3', category: 'lawenforcement', text: 'A folder with your associates\' names in it gets "accidentally" left open on a desk you weren\'t supposed to see.' },
  { id: 'le4', category: 'lawenforcement', text: 'The local precinct gets a new commander. Everyone\'s arrangements suddenly feel less certain.' },
  { id: 'le5', category: 'lawenforcement', text: 'A wiretap rumor spreads through {city}. True or not, people start whispering instead of talking.' },
  { id: 'le6', category: 'lawenforcement', text: 'Federal plates show up outside a building you have business in. Nobody says a word about it.' },

  /* ---------------- Loyalty / Betrayal (6) ---------------- */
  { id: 'lb1', category: 'loyalty_betrayal', text: 'Two of your crew stop talking the moment you walk into the room.' },
  { id: 'lb2', category: 'loyalty_betrayal', text: 'A counted stack comes up short. Nobody admits to anything.' },
  { id: 'lb3', category: 'loyalty_betrayal', text: 'Someone\'s been asking around about your schedule. Could be nothing. Could be everything.' },
  { id: 'lb4', category: 'loyalty_betrayal', text: 'A crew member you trusted starts making excuses to be somewhere else.' },
  { id: 'lb5', category: 'loyalty_betrayal', text: 'Loose talk at a bar gets back to you, twisted just enough to sting.' },
  { id: 'lb6', category: 'loyalty_betrayal', text: 'You notice a face from the {gang} drinking a little too comfortably with one of your own.' },

  /* ---------------- Commission (6) ---------------- */
  { id: 'com1', category: 'commission', text: 'The Commission convenes in a back room that smells like cigars and old grudges.' },
  { id: 'com2', category: 'commission', text: '{boss} of the {gang} arrives late, as always, and takes the seat nobody else wants.' },
  { id: 'com3', category: 'commission', text: 'A vote is called. Every boss at the table has already decided - the discussion is just for show.' },
  { id: 'com4', category: 'commission', text: 'The truce on the table is fragile. Everyone at the Commission knows it. Nobody says it.' },
  { id: 'com5', category: 'commission', text: '{boss} leans back, arms crossed, and waits to see who blinks first.' },
  { id: 'com6', category: 'commission', text: 'Old alliances and older betrayals hang over the Commission table like smoke.' },

  /* ---------------- Bonus general flavor (extra to exceed 80) ---------------- */
  { id: 'ex1', category: 'turn_tick', text: 'A jukebox somewhere plays a song that\'s older than half the people listening to it.' },
  { id: 'ex2', category: 'turn_tick', text: 'The {era} grinds on around you - {eraFlavor}.' },
  { id: 'ex3', category: 'district_travel', text: 'In {district}, the {era} feels closer than it does anywhere else in {city} - {eraFlavor}.' },
  { id: 'ex4', category: 'post_crime_success', text: 'For once, the {era} works in your favor - {eraFlavor}.' },
  { id: 'ex5', category: 'turn_tick', text: 'You think, not for the first time, that {city} is a city that eats its own.' },
  { id: 'ex6', category: 'family', text: '{family} laughs at something on TV, and for a second, none of this feels real.' },
  { id: 'ex7', category: 'lawenforcement', text: 'A patrol car slows as it passes, then keeps moving. This time.' },
  { id: 'ex8', category: 'loyalty_betrayal', text: 'Trust, in this business, has a shelf life. Yours might be running short.' }
];

function fillTemplate(state, text, extra) {
  const era = state.meta.era === 'custom' ? (state.meta.customEraText || 'this era') : (ERAS[state.meta.era] ? ERAS[state.meta.era].label : 'this era');
  const eraFlavor = state.meta.era === 'custom' ? (state.meta.customEraText || 'a world all its own') : (ERAS[state.meta.era] ? ERAS[state.meta.era].flavor : '');
  const district = state.districts[state.player.currentDistrict];
  let randomGang = null;
  const gangIds = Object.keys(state.gangs);
  if (gangIds.length) randomGang = state.gangs[gangIds[Math.floor(Math.random() * gangIds.length)]];

  const map = Object.assign({
    city: state.meta.cityName,
    district: district ? district.name : '',
    gang: randomGang ? randomGang.name : 'rivals',
    boss: randomGang ? randomGang.boss.name : 'the boss',
    era,
    eraFlavor,
    player: state.player.name,
    family: extra && extra.familyMember ? `${extra.familyMember.name} (your ${extra.familyMember.relation})` : 'a relative'
  }, extra && extra.vars ? extra.vars : {});

  return text.replace(/\{(\w+)\}/g, (m, key) => (map[key] !== undefined ? map[key] : m));
}

function pickEvent(category) {
  const pool = EVENT_POOL.filter(e => e.category === category);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Push a narrated event into the log. Offline text shows immediately;
// if an API key is configured, an async AI flavor line may follow.
function narrate(state, category, extra) {
  const evt = pickEvent(category);
  if (!evt) return;
  const text = fillTemplate(state, evt.text, extra);
  state.eventLog.push(logEntry(state, text, category));

  if (state.settings.apiKey) {
    requestAINarrative(state, category, extra, (aiText) => {
      if (aiText) {
        state.eventLog.push(logEntry(state, aiText, category + '_ai'));
        if (typeof window !== 'undefined' && typeof window.onAINarrative === 'function') {
          window.onAINarrative();
        }
      }
    });
  }
}

// Apply a generic minor effect for family story events (loyalty drift)
function applyEventOutcome(state, evt, extra) {
  const text = fillTemplate(state, evt.text, extra);
  state.eventLog.push(logEntry(state, text, 'family'));
  if (extra && extra.familyMember) {
    extra.familyMember.loyalty = clamp(extra.familyMember.loyalty + (Math.random() < 0.5 ? 2 : -2), 0, 100);
  }
}
