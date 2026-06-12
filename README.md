# Underworld

A turn-based, choice-driven gangster RPG that runs entirely in your browser. No build step, no backend — just open `index.html`.

**[Play it here](https://sayanrup.github.io/Mafia_Life/)**

## Premise

Every empire starts in the gutter. Create a character, pick an era (80s, 90s, 2000s, modern, or a custom era of your own), and choose your origin — Street Hustler, Ex-Military, Smuggler's Family, or Corporate Dropout. Then build a criminal empire one turn at a time: run crimes, manage a crew, expand your territory, launder money, and navigate the politics of rival gangs, law enforcement, and your own family.

## Features

- **Character creation** — name, era, city, and origin, each with its own starting stats and bonuses
- **Territory map** — five districts contested by rival gangs, each with a named boss and a distinct personality (Aggressive, Diplomatic, Opportunistic) driving their AI
- **Operations** — upgrade drug labs, stash houses, and smuggling routes through four tiers each
- **Activities** — mugging, heists, hits, extortion rackets, smuggling runs, product deals, and bribes (PD, Feds, rival crews)
- **Crew & lieutenants** — recruit muscle, manage loyalty and upkeep, promote lieutenants and assign them to districts
- **Armory** — four tiers of weapons that boost your crew's combat power
- **Law enforcement** — named detectives and federal agents with their own personalities, bribery, promotions, retirements, and informants
- **Finance** — shell companies for laundering dirty cash, plus a marketplace of legitimate business fronts
- **Family council** — relatives who can be assigned roles, and who face kidnapping, betrayal, or worse as your heat rises
- **The Commission** — once you reach Boss rank, negotiate truces, alliances, territory trades, and wars with rival gangs
- **Combat** — quick dice-based scuffles plus a tactical turn-based gang war screen (Attack / Defend / Use Item / Special / Flee)
- **Narrative** — a large pool of offline flavor text, with optional AI-generated narration via the Anthropic API (your own key, stored locally)
- **Persistence** — autosave every turn, three manual save slots, and JSON export/import

## Running locally

This is a static site — serve the folder with any static file server and open `index.html`:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`.

## Tech

Vanilla HTML/CSS/JS, split into modules under `js/` and loaded via script tags in `index.html`. State lives in a single in-memory object that's serialized to `localStorage`. No frameworks, no build tooling — deployable as-is to GitHub Pages.
