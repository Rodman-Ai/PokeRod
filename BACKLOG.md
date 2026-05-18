# PokeRod Backlog

A prioritised list of candidate features, drawn from a survey of mainline
Pokémon (through Scarlet/Violet + Legends Arceus), modern indie creature
collectors, fan ROM hacks, mobile companion apps, and PokeRod-specific
creative ideas. Use this as the default ground-truth queue when picking
the next thing to build.

## How items are ranked

Each entry carries:

- **Impact** (1–5) — how much it changes the player experience
- **Cost** (1–5) — rough engineering size; 1 ≈ a day, 5 ≈ multi-week
- **Category** — Battle / Catch / Manage / Overworld / Story / QoL / Visual / Meta
- **Source** — where the idea comes from

The ordered list at the bottom uses the formula `value = impact × 2 − cost`,
ties broken by category coherence (group items that share infrastructure so
one PR sets up the next). Re-rank by recomputing `value`; if the project's
direction changes, update the impact column rather than fudging the order.

The bottom rows are multi-PR roadmap projects; treat them as planning
fodder, not sprint candidates. Tag any item rated 5/5 with **roadmap** in
the note column so it can't get accidentally pulled into a single-day
sprint.

## Competitor analysis

**Mainline Pokémon (Gen 1 → Scarlet/Violet, plus Legends Arceus).** The
design baseline. Things present there but **not yet in PokeRod**: the
**Terastal one-battle type-swap gimmick** (S/V) — PokeRod has a Power
Gem stat-surge but not a type-swap; **sandwich/picnic encounter buffs**
(S/V) — PokeRod has cooking but the food doesn't bias encounters;
**5-star raid battles** with a single boss and multi-mon player side;
**open-world co-op routes** (S/V); **mass outbreaks of one species** on
a route with daily refresh (Legends Arceus); **agile / strong move
styles** that re-deliver the same move with different action speed
(Arceus); **alpha-size variants** with +stats (Arceus); **overworld
no-battle capture** for shy / weak mons (Arceus); **auto-battle**
where a party member fights ambient mons while you explore (Arceus).
What PokeRod is **past** the mainline baseline on: a true type-chart
reference page in-game (mainline still doesn't ship one), in-game
ability-judge IV potential rollup, a daily-bonus calendar with rotating
items, a CHAIN-style shiny-hunt that telegraphs in the HUD.

**Modern indie creature collectors (Cassette Beasts + Multiplayer DLC,
TemTem 1.7, Coromon 1.4, Nexomon, Monster Sanctuary).** These add:
**creature fusion** (Cassette Beasts — still the highlight feature);
**deep co-op campaign** (TemTem); **per-creature skill trees**
(Monster Sanctuary); **party potential rating + perfect IV display**
(Coromon — PokeRod now has a lite version via the IV-judge overlay);
**death-perma / nuzlocke baked in** (TemTem); **affection that drives
battle bonuses** (PokeRod ships a friendship damage bump + bond-endure
already); **postgame raid bosses** (Monster Sanctuary). The highest
remaining bar from this bucket is **per-creature skill trees** and
**fusion** — both genuinely 5/5 cost.

**Palworld (2024).** New entrant worth its own row: creature-collector
that bolts on **mountable / rideable creatures** (replaces surf and fly
with mounting your own party), **base-building** (creature-decorated
plots with crafting), and **breeding-as-core-mechanic** (egg-cycle is
how you progress, not a side activity). PokeRod could pull the mounts
idea cheaply; base-building maps onto the existing wardrobe + cooking
infra; breeding is the same expensive item as Pokémon daycare.

**ROM hacks (Renegade Platinum, Radical Red recent updates, Reborn,
Unbound, Inclement Emerald, Crystal Clear).** Fan-made enhancement
layer: **difficulty toggles** (PokeRod ships easy / normal / hard; the
nuzlocke variant is still open), **level caps tied to badges**,
**EV/IV editor in an NPC**, **move relearner + deleter** (PokeRod has
both), **mid-game move tutors**, **debug menu** (PokeRod ships a
Konami-gated cheat menu), **search-by-type in PC box** (PokeRod has
sort, not search), **fast-forward toggle**, **set-mode battles** (now
shipped), **modern QoL** (turbo, auto-run shipped, repel re-prompt).
**Crystal Clear** introduced open-world non-linear progression — PokeRod
is linear, this is the biggest "feel different" knob still on the table.

**Mobile / casual companion apps (Pokémon Sleep, Pokémon GO, Pokémon
Unite, Hatchi, Pou, Coral Island).** Daily-routine engagement:
**Pokémon Sleep** turns hours-asleep into in-app collection — PokeRod's
daily-bonus chip is a good seed for a real event calendar;
**Pokémon GO** weekly events / community days; **avatar customisation**
(clothes, hat, hair); **Pokémon-Amie / camp affection mini-games**;
**bestiary completion percentages with milestone gifts** (PokeRod ships
this at 20/40/77); **birthday creature variants**; **postcard / friend
code share** (a stripped-down trade); **photo mode with stickers**
(PokeRod has photo mode — sticker pass is still open). The runway here
is: layer a real **event calendar** + cosmetic / affection systems on
top of the daily-bonus skeleton that already exists.

## Already shipped (as of v0.55.60 / build #204)

**World & overworld**
- Tile-based overworld with follow camera, day/night cycle, animated
  water, ambient creatures, biome particles, **8 weather kinds** across
  **30 named presets**, **2 hidden grottos** (Mossy Grotto + Snowmelt
  Hollow), **64 maps including 3 themed zones**, **circular world map + fast
  travel**, **bicycle**, **hold-B to run**, **fishing + surfing**,
  **roaming legendary**, **photo mode**, hidden-item pickups, **rain
  puddle ripples** on water, **tall-grass rustle encounter telegraph**,
  per-biome ambient drone audio layer.
- **NPC day/night schedules** (6 NPCs flip presence dawn/dusk), 12
  named story characters with home tiles + 4-phase dialog, **50
  walk-up cutscenes** across 8 chains.

**Battle depth**
- Turn-based engine: 18-type chart, 6 status effects, weather-modifying
  damage, stat stages, priority moves, **per-type + per-move VFX (107
  signature animations)**, critical-hit pulse, **hit-pause freeze-frame
  on super-effective hits**, **screens (Reflect / Light Screen) + entry
  hazards (Spikes / Stealth Rock)**, **charge + recharge moves** (Solar
  Beam, Sky Attack, Hyper Beam), **weather-setting moves** (Rain Dance
  / Storm Call / Hailstorm), **high-crit moves + Focus Energy
  crit-stage table**, **recoil + drain moves** (Take Down, Giga Drain,
  Drain Punch), **switch-in matchup preview** (RISK/WALL/GOOD), **tag
  battles** (light AI-ally doubles), **set-mode toggle**, **Choice
  Band lock-into-move** + 6 other held-gear pieces, **Power Gem**
  one-shot stat surge.
- **11 named abilities** assigned to most species via a side table,
  **20 hidden-ability variants** rolled at encounter (1/8 wild odds),
  **friendship endure** at 220+, **VS-trainer banner intro**, three
  battle-music variants (wild / trainer / champion), louder cry for the
  roaming legendary, **scrollback log** of the last 3 battles.

**Creatures**
- **77 hand-pixeled species** across **5 graphics eras** (GB Red, GB
  Pocket, GBC Yellow, GBA FireRed, DS Diamond), with era-toned UI
  overlays on the monochrome eras.
- **25 natures** with ±10% stat curves, **shiny variants** with charm
  doubling, **8 creature marks + titles**, **5 evolution stones**
  (Fire / Thunder / Ice / Leaf / Moon), **friendship evolutions**
  (Pugpaw / Breezlet / Mindrop), **IV judge overlay + potential rating**
  (LEGENDARY / EXCEPTIONAL / DECENT / ROUGH).

**Catch & encounter**
- 8 ball types + **4 apricorn-crafted balls** (HEAL / NET / TIMER /
  LUXURY) crafted by BALL-MAKER YORI in Crestrock, **3 type-bait
  lures** (BUG / WATER / FIRE), **shiny charm** at full Dex,
  **catch-combo chain** with HUD chip + shiny mult, **daily-featured
  species** with 3× spawn boost, time-gated encounters, weather-gated
  encounters, badge-widened rare-mon weights.

**Items & progression**
- 75-item bag (balls, heals, status cures, berries, trinkets, held
  gear, lures, **5 reusable TMs**, evolution stones, apricorn, repels,
  bicycle, rods, key items). Held-item passive effects across 7 pieces
  (Leftovers, Focus Sash, Eviolite, Quick Claw, Wide Lens, Expert Belt,
  Choice Band, Power Gem). Move tutor + move re-learner NPCs.
- **NewGame+** with cumulative tier-keepsakes (Lucky Egg, Shiny Charm,
  Master's Pendant), **Battle Tower** with trainer-class roster +
  per-floor cash reward, **trainer rematches** at +3 levels / ×1.5
  reward after a 100-step cooldown, **dex milestone rewards** at 20 /
  40 / 77 caught, daily login bonus rotation, **achievements + trophy
  room**, full PC box with sort cycle + mass release.

**UI / UX**
- Retro pixel-art top-screen title with d-pad navigation, DS dual-
  screen layout, **pause menu pages** for MAP / DEX / TYPES (full
  18-type chart) / COVER (party offensive coverage) / LOG (battle
  scrollback) / BAG / PARTY / PROFILE / BOX / QUEST / ERA / SETTINGS /
  PHOTO / SAVE / LOAD, **menu cursor memory** across visits, **Konami
  cheat menu** (3 charged rows), **overworld quick-heal hotkey** (H),
  **berry farming** patch, **wardrobe NPC** stub, settings (text speed
  / difficulty / battle-style / dayNight / colour-blind / reduced
  motion / DS perspective toggles).

**Audio**
- Procedural Web Audio music + SFX (15 named tracks + 3 battle
  variants), per-biome ambient drone layer, **per-species cries** with
  loud variant for the roaming legendary.

## Candidate features (catalog)

| # | Feature | Impact | Cost | Cat | Source |
|---|---|---|---|---|---|
| 1 | **Terastal-style type-swap** — once-per-battle change the holder of a Tera Crystal to a chosen single type, including STAB on that type for the rest of the battle. Reuses Power Gem's "one-shot per battle" pattern. | 4 | 3 | Battle | Pokémon S/V |
| 2 | **Sandwich / picnic buffs** — extend cooking so a finished dish optionally applies a 30-step encounter bias (boost shiny odds / boost a chosen type's spawn rate) instead of just healing. | 3 | 2 | Catch | Pokémon S/V |
| 3 | **5-star raid battle** — single boss with shielded HP bars and a multi-mon player side (lead + your bench takes simultaneous swings). Reuses tag-battle ally infra. | 4 | 4 | Battle | Pokémon S/V |
| 4 | **Push hidden-item count to ~25** — seed apricorns / berries / one-off potions across more maps using the existing `hiddenItems` dict. Pure data-only drop. | 3 | 1 | Overworld | Pokémon S/V |
| 5 | **Mass outbreaks** — once per real-time day, one species' icon appears on the world map and its spawn rate triples on the marked route for 24 hours. Hooks the existing daily-featured-species hash + the world-map chevron infra. | 4 | 3 | Catch | Pokémon Arceus |
| 6 | **Agile / strong move-style toggle** — each move can be fired in 1 of 2 styles: AGILE (less dmg, +priority next turn) or STRONG (more dmg, no action next turn). Single battle-engine knob, no new moves needed. | 3 | 3 | Battle | Pokémon Arceus |
| 7 | **Alpha-size variants** — 1/30 wild encounters render larger and roll with +1 stat-stage in ATK + SPA. Marks the catch with a new `ALPHA` mark. | 3 | 2 | Catch | Pokémon Arceus |
| 8 | **Overworld no-battle catch** — for low-level wild mons, throwing a ball from the overworld captures without entering the battle scene. Adds a back-throw animation to the existing ball arc. | 4 | 4 | Catch | Pokémon Arceus |
| 9 | **Auto-battle in overworld** — second party member visibly walks behind player and brawls ambient creatures for XP while the player explores. | 3 | 4 | Battle | Pokémon Arceus |
| 10 | **Mountable creatures** — replace surf + bicycle with mounting a compatible party member. Sprite swap + speed knob; reuses on-bike logic. | 4 | 4 | Overworld | Palworld |
| 11 | **Base-building lite** — extend wardrobe NPC into a single-screen plot where the player drops + arranges existing decoration tiles (lamps, plants, rugs). | 3 | 3 | Manage | Palworld |
| 12 | **Real-time event calendar** — weekly themed event (XP+50% / shiny+200% / berry harvest +2× / catch-rate +25%) driven by the existing date hash. HUD chip + dex-detail tag. | 3 | 2 | Meta | Mobile / GO |
| 13 | **Personality / affection mini-game** — between-battle Pokémon-Amie-style camp with feed / play / pet inputs; raises friendship faster + cosmetic ribbon. | 3 | 2 | Manage | Mobile / S/V |
| 14 | **Trainer-card postcard share** — export the trainer + party + dex completion as a base64 share-code; importer applies it as a "spectator profile" in a single PC slot. | 3 | 3 | Meta | Mobile |
| 15 | **Step-rewards milestone bag** — every 1000 player.steps drops a small reward (potion → great ball → repel rotation). Reuses the daily-bonus toast pipeline. | 3 | 1 | Meta | Mobile |
| 16 | **Battle Frontier expansion** — Factory / Arena / Palace facilities next to the existing Tower, each with a unique rule (rental teams / judged scoring / random-AI). | 4 | 3 | Meta | PokeRod |
| 17 | **Per-gym puzzle screens** — small in-gym single-screen puzzle (push-blocks / type-quiz / floor-switches) before the leader battle. | 4 | 3 | World | PokeRod |
| 18 | **Catching contest event** — opt-in 5-minute timed round on a flagged route; score = sum of caught levels × type-rarity bonus; winner gets a tier ribbon. | 3 | 2 | Catch | PokeRod |
| 19 | **Player-house decoration** — extends Aunt Lu's room + the wardrobe NPC into a small grid where the player places furniture / posters / a creature bed. | 3 | 2 | Manage | PokeRod |
| 20 | **Move tutor expansion** — a second tutor NPC in a postgame town with rare-move offers (Earthquake / Stone Edge / Dragon Pulse) priced in achievements rather than money. | 3 | 1 | Manage | PokeRod |
| 21 | **Underwater dive layer** — second map layer on water tiles via the existing Dive move (TM03 already in catalog). Doubles content on coast / lake maps. | 4 | 4 | Overworld | PokeRod |
| 22 | **Field skill key-items** — Headbutt / Rock Smash / Cut as key items rather than moves, so they don't occupy a creature's slot. | 3 | 2 | Overworld | PokeRod |
| 23 | **Apricorn outbreaks** — apricorn-tree decorations refresh daily; one tree per route has 1–2 free apricorns to harvest. | 2 | 1 | Catch | PokeRod |
| 24 | **Postgame Elite-4 rematch chain** — sequential 4-trainer + champion fight at +10 levels post-NG+, no mid-heal. | 3 | 2 | Meta | ROM hacks |
| 25 | **Level cap per badge** — Settings toggle: when ON, party members can't gain XP past `(badges + 1) × 12` until the next badge. Mirrors Drayano's rebalance toggle. | 3 | 1 | Meta | ROM hacks |
| 26 | **PC box search + filter** — extends the existing sort cycle with a type-filter chip row + a 1-char fast-jump-to-letter cursor. | 3 | 2 | Manage | ROM hacks |
| 27 | **Avatar customisation completion** — turns the wardrobe NPC stub into a real wardrobe: pick body palette + hat + outfit, persist on state.player.outfit. | 4 | 3 | Visual | Mobile |
| 28 | **Local trade via QR / share-code** — base64-encode a party slot, paste-import elsewhere. Browser-only, no server. | 4 | 4 | Meta | Pokémon — *roadmap-adjacent* |
| 29 | **Full doubles battles (2v2)** — the player's front two vs the foe's front two, single-target moves pick a side. Tag-battles already proved out the ally-AI plumbing. | 5 | 5 | Battle | Pokémon — *roadmap* |
| 30 | **Daycare + simple breeding** — leave two compatible creatures, walk N steps, return for an egg that hatches into a baby of one parent's species. No IV/move inheritance to start. | 5 | 5 | Manage | Pokémon — *roadmap* |
| 31 | **Per-creature skill tree** — earn skill points on level-up; spend to unlock minor passives (+5 ATK, +1 priority on move 1, +20% friendship gain). | 5 | 5 | Battle | Monster Sanctuary — *roadmap* |
| 32 | **Creature fusion (Cassette Beasts style)** — combine two party members into a one-battle fused form (composite sprite, mixed type, mixed moves). | 5 | 5 | Battle | Cassette Beasts — *roadmap* |

## Ranked sprint queue

Sorted by `value = impact × 2 − cost`. Group adjacent items when they
share infrastructure so one PR sets up scaffolding for the next.

| Rank | Value | Imp/Cost | Feature | Note |
|------|-------|----------|---------|------|
| 1 | 5 | 3/1 | #4 Push hidden-item count to ~25 | Pure data drop; ship first |
| 2 | 5 | 3/1 | #15 Step-rewards milestone bag | Reuses daily-bonus toast pipe |
| 3 | 5 | 3/1 | #20 Move tutor expansion | Reuses existing tutor flow |
| 4 | 5 | 3/1 | #25 Level cap per badge | Single settings toggle |
| 5 | 5 | 4/3 | #1 Terastal-style type-swap | Pairs with the existing Power Gem stat-surge |
| 6 | 5 | 4/3 | #5 Mass outbreaks | Pairs with #4 + #12; reuses daily-species hash + world-map chevron |
| 7 | 5 | 4/3 | #16 Battle Frontier expansion | Extends Battle Tower; pairs with #24 |
| 8 | 5 | 4/3 | #17 Per-gym puzzle screens | World-content push; gym data already in place |
| 9 | 4 | 3/2 | #2 Sandwich / picnic buffs | Extends cooking + encounter-pool filter chain |
| 10 | 4 | 3/2 | #7 Alpha-size variants | Hooks into makeMon roll + MARKS table |
| 11 | 4 | 3/2 | #12 Real-time event calendar | Pairs with #5 + #15 |
| 12 | 4 | 3/2 | #13 Personality affection mini-game | Hooks friendship counter |
| 13 | 4 | 3/2 | #18 Catching contest event | Reuses encounter + score loops |
| 14 | 4 | 3/2 | #19 Player-house decoration | Reuses wardrobe NPC + decoration tile atlas |
| 15 | 4 | 3/2 | #22 Field skill key-items | Reuses key-item bag pocket |
| 16 | 4 | 3/2 | #24 Postgame Elite-4 rematch | Reuses battle / npcKey infra; pairs with #16 |
| 17 | 4 | 3/2 | #26 PC box search + filter | Extends shipped sort |
| 18 | 4 | 4/4 | #3 5-star raid battle | Reuses tag-battle ally + boss-HP UI |
| 19 | 4 | 4/4 | #8 Overworld no-battle catch | Reuses ball-arc anim |
| 20 | 4 | 4/4 | #10 Mountable creatures | Reuses bicycle speed knob; pair with surf |
| 21 | 4 | 4/4 | #21 Underwater dive layer | Significant content; Dive already in TM catalog |
| 22 | 5 | 4/3 | #27 Avatar customisation | Pairs with #19; wardrobe NPC stub already in player_house |
| 23 | 4 | 4/4 | #28 Local trade via QR | Browser-only; depends on a save-export helper |
| 24 | 3 | 3/3 | #6 Agile / strong move toggle | Battle-engine refactor; affects every move pick |
| 25 | 3 | 3/3 | #11 Base-building lite | Pairs with #19; furniture atlas reuse |
| 26 | 3 | 3/3 | #14 Trainer-card postcard share | Save-encoder helper; pairs with #28 |
| 27 | 3 | 2/1 | #23 Apricorn outbreaks | Tiny; pairs with the existing craftsman loop |
| 28 | 2 | 3/4 | #9 Auto-battle in overworld | Adds an overworld combat sim |
| 29 | 5 | 5/5 | #29 Full doubles (2v2) | **roadmap** — multi-PR refactor of the battle scene |
| 30 | 5 | 5/5 | #30 Daycare + breeding | **roadmap** — egg cycle is a new subsystem |
| 31 | 5 | 5/5 | #31 Per-creature skill tree | **roadmap** — touches stats, level-up, save |
| 32 | 5 | 5/5 | #32 Creature fusion | **roadmap** — composite sprite system |
