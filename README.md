# Underworld

A turn-based, choice-driven gangster RPG that runs entirely in your browser. No build step, no backend — just open `index.html`.

**[Play it here](https://sayanrup.github.io/Mafia_Life/)**

## Premise

Every empire starts in the gutter. Create a character, pick an era (80s, 90s, 2000s, modern, or a custom era of your own) and city, then choose your origin — Street Hustler, Ex-Military, Smuggler's Family, or Corporate Dropout, each with its own starting cash, reputation, crew, and bonus. Then build a criminal empire one turn at a time: run crimes, manage a crew, grow drug operations, expand your territory, launder money, and navigate the politics of rival gangs, law enforcement, and your own family.

## Features

- **Character creation** — name, era, city, and origin, each with its own starting stats and bonuses
- **Territory map** — districts contested by rival gangs, each with a named boss and a distinct personality (Aggressive, Diplomatic, Opportunistic) driving their AI; a recent activity feed on each district surfaces what rival gangs are doing turn to turn, and a Gangs subtab shows every rival family's territory index, crew, treasury, businesses, drug operations, and protection rackets
- **Drug operations with rank progression** — buy plots and grow weed, pills, and powder across your districts; the products you can run, plots per district, equipment tiers, and number of distributors you can hire all expand as you rank up from Associate to Boss. Distributors can be hired or fired per product to manage upkeep
- **Distribution fleet** — buy and sell sedans, vans, SUVs, box trucks, and armored trucks to add shared cargo capacity for your distributors, so high-output operations can actually move their product each turn
- **Stash houses** — store unsold product; spare capacity rents out to other crews for passive income, while overflow gets raided by rivals
- **Activities with rank-gated unlocks** — mugging, basic street crime, and protection rackets are available from the start, while bigger jobs (heists, gang gigs, kidnapping) unlock as you climb the ranks, with "Unlocks at &lt;rank&gt;" shown in the crime menu until then
- **Crew & lieutenants** — recruit muscle, manage loyalty and upkeep (including vehicle upkeep), promote lieutenants and assign them to districts or smuggling routes for passive bonuses
- **Armory** — four tiers of weapons that boost your crew's combat power, with buy and sell options for surplus gear
- **Law enforcement** — named detectives and federal agents with their own personalities, bribery, promotions, retirements, and informants (on you and on rival gangs)
- **Finance** — launder dirty cash via street contacts and other methods (steep cut, always available) or feed clean cash back into the streets as dirty cash through the same methods in reverse; establish shell companies and legitimate business fronts for better laundering rates. Businesses generate income, reduce heat, add laundering capacity, and can be repaired or sold for a resale value driven by district control, your reputation, and local heat. A profit & loss statement breaks down every income and expense source each turn
- **Family council** — relatives who can be assigned roles, and who face kidnapping, betrayal, or worse as your heat rises
- **The Commission** — once you reach Boss rank, negotiate truces, alliances, territory trades, and wars with rival gangs
- **Criminal World council** — once your gang controls 50%+ of the city's territory, a new tab opens where every turn the council brings a decision (price fixing, hits on rival gangs, police bribes, joint smuggling pacts, tribute demands, territory mediation, informant purges, cartel shipments) that shifts your cash, heat, reputation, and relationships with every other family. Allies occasionally kick back cash from joint ventures; gangs at war periodically raid your businesses, stashes, or crew loyalty. A Zone Leaders board shows which family leads each district as territory control shifts turn to turn
- **Win condition** — found or take over a gang, then push every district's control your way. Once your family leads every zone in the city, you win - with the option to keep playing as the city's undisputed power
- **Combat** — quick dice-based scuffles plus a tactical turn-based gang war screen (Attack / Defend / Use Item / Special / Flee)
- **Narrative** — a large pool of offline flavor text covering crime outcomes, drug operations, law enforcement, betrayals, and more, with optional AI-generated narration via OpenRouter (your own API key, stored locally, with a model picker and cost tracking)
- **Persistence** — autosave every turn to a single save slot, plus JSON export/import

## Running locally

This is a static site — serve the folder with any static file server and open `index.html`:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`.

## Tech

Vanilla HTML/CSS/JS, split into modules under `js/` and loaded via script tags in `index.html`. State lives in a single in-memory object that's serialized to `localStorage`. No frameworks, no build tooling — deployable as-is to GitHub Pages.
