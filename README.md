# Underworld

A turn-based, choice-driven gangster RPG that runs entirely in your browser. No build step, no backend — just open `index.html`.

**[Play it here](https://sayanrup.github.io/Mafia_Life/)**

## Premise

Every empire starts in the gutter. Create a character, pick an era (80s, 90s, 2000s, modern, or a custom era of your own) and city, then choose your origin — Street Hustler, Ex-Military, Smuggler's Family, or Corporate Dropout, each with its own starting cash, reputation, crew, and bonus. Then build a criminal empire one turn at a time: run crimes, manage a crew, grow drug operations, expand your territory, launder money, and navigate the politics of rival gangs, law enforcement, and your own family.

## Features

- **Character creation** — name, era, city, and origin, each with its own starting stats and bonuses
- **Territory map** — districts contested by rival gangs, each with a named boss and a distinct personality (Aggressive, Diplomatic, Opportunistic) driving their AI
- **Drug operations** — buy plots and grow weed, pills, and powder across your districts, hire distributors to move product, set street prices, buy production equipment, and bribe local protection to keep raids down
- **Activities** — mugging, heists, hits, extortion rackets, kidnapping jobs, smuggling runs, product deals, and bribes (PD, Feds, rival crews)
- **Crew & lieutenants** — recruit muscle, manage loyalty and upkeep, promote lieutenants and assign them to districts or smuggling routes for passive bonuses
- **Armory** — four tiers of weapons that boost your crew's combat power
- **Law enforcement** — named detectives and federal agents with their own personalities, bribery, promotions, retirements, and informants (on you and on rival gangs)
- **Finance** — shell companies for laundering dirty cash, plus a marketplace of legitimate business fronts that generate income, reduce heat, and add extra laundering capacity
- **Family council** — relatives who can be assigned roles, and who face kidnapping, betrayal, or worse as your heat rises
- **The Commission** — once you reach Boss rank, negotiate truces, alliances, territory trades, and wars with rival gangs
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
