# PokeRod Backlog

A prioritised list of 50 candidate features, drawn from a survey of mainline
Pokémon, modern indie creature collectors, fan ROM hacks, and casual mobile
games — plus a few PokeRod-specific creative ideas. Use this as the
default ground-truth queue when picking the next thing to build.

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

The bottom 5 (ranks 47–50) are huge multi-PR projects; treat them as
roadmap items, not sprint candidates. **Battle abilities** (rank 47) is
high-impact but touches every move/creature path — start with a small
RFC commit before implementation.

## Competitor analysis

**Mainline Pokémon (Gen 1 → Scarlet/Violet)** — the design baseline.
Things present there but not in PokeRod: held items per creature,
Abilities, multi-battles (doubles/triples), TMs / move tutors, daycare +
breeding + eggs, EV/IV transparency, weather *modifying battle damage*
(sunny → +50% FIRE), terrain effects, mega/Z/Tera gimmicks,
contest/showcase mini-games, Battle Frontier-style postgame, town map
item with player pin, bicycle fast travel, fly waypoints, repels with
HUD timer, mass release, dex with location + footprint pages,
multiplayer trade, shiny variants.

**Modern indie creature collectors (Cassette Beasts, Temtem, Coromon,
Nexomon, Monster Sanctuary)** — these add: creature **fusion** (Cassette
Beasts), **co-op campaign** (Temtem), **per-creature skill trees**
(Monster Sanctuary), **party potential rating + perfect IV display**
(Coromon), **arena ladder + daily goals** (Nexomon), **simultaneous
on-the-overworld attacks** (Cassette Beasts), **death-perma + nuzlocke
baked in** (Temtem), **affection/friendship that drives battle bonuses**
(most), **postgame raid bosses** (Monster Sanctuary).

**ROM hacks (Renegade Platinum, Radical Red, Unbound, Inclement
Emerald)** — fan-made enhancement layer: **difficulty toggles**
(easy/normal/hard/nuzlocke), **level caps tied to badges**, **EV/IV
editor in NPC**, **move relearner / deleter**, **mid-game move tutors**,
**debug menu**, **search-by-type in PC box**, **fast-forward toggle**,
**set-mode battles** (no free switch), **modern QoL** (turbo, auto-run,
repel re-prompt).

**Mobile / casual (Pokémon GO, Hatchi, Pou, Coral Island)** — daily
engagement: **daily login bonuses**, **timed events / festivals**,
**photo mode with stickers**, **achievement / trophy room**, **friend
codes / spectator mode**, **bestiary completion percentages with
rewards**, **avatar customisation** (clothes, hat, hair, skin),
**birthday creature variants**, **random daily encounter forecast**.

## Already shipped (as of v0.49.1 / build #131)

- Tile-based overworld with follow camera, day/night cycle, animated
  water, ambient creatures, biome particles, **8 weather kinds** (rain
  / sleet / snow / hail / thunder / hurricane / overcast / fog) across
  **30 named presets** (drizzle, monsoon, lake-effect, whiteout,
  sea-fog, smog, etc.). Tornado retired as a weather kind; its funnel
  render lives on as a battle move effect.
- Turn-based battles, 18-type chart, status effects, stat stages,
  priority, **per-type + per-move VFX (18 types + 13 signature
  overrides, including a gust / airslash twister)**, critical-hit
  pulse on DS.
- 77 hand-pixeled creatures across **4 graphics tiers** (GB Red, GBC
  Yellow, GBA FireRed, DS Diamond).
- 5 ball types, hidden items, **fishing minigame** (A=fish, B=surf),
  trinket equipment, badges, **6-page profile** (trainer, battles,
  journey, dex, story, gear).
- Story: **12 named characters** with home tiles + state-aware dialog (4
  phases × first/second/third/idle), **50 walk-up cutscene encounters**,
  8 chains, branching choice prompts.
- Quests: **54 quests** (42 NPC-given via offer/turn-in, 12
  auto-milestone), 7 categories (fetch / catch / find / talk / battle /
  visit / milestone), detail view on A.
- Mobile touch UI, multiple save slots, PC box storage, party reorder
  via swap-pattern, NPC trap-escape swap-past.
- Procedural Web Audio music + SFX (no asset files).

## Candidate features (catalog)

| # | Feature | Impact | Cost | Cat | Source |
|---|---|---|---|---|---|
| 1 | **Held items per creature** — single slot, items confer passive effects (Lucky Egg → +50% XP, Oran Berry → auto-heal at 25%, Choice Band → +ATK but lock move). Reuse existing trinket-style logic. | 5 | 2 | Battle | Pokémon |
| 2 | **Battle text speed setting** + **Press A to skip dialog** — toggle in settings; A in-battle fast-forwards animations. Single biggest feel-good QoL. | 5 | 1 | QoL | ROM hacks |
| 3 | **Weather affects battle damage** — sunny boosts FIRE +50%, rain boosts WATER +50%, snow halves accuracy of FIRE, sandstorm chips non-ROCK/STEEL/GROUND. Reuse PR_WEATHER. | 5 | 2 | Battle | Pokémon |
| 4 | **Effectiveness preview on move-select** — show "STRONG" / "WEAK" / "—" tag next to each of the 4 moves in the battle menu, computed from foe types. | 4 | 1 | Battle | ROM hacks |
| 5 | **Encounter rate by weather + time** — rain spawns more WATER, night spawns GHOST/DARK, sun spawns FIRE/GROUND. Hooks PR_WEATHER + existing day/night. | 4 | 1 | Catch | Pokémon |
| 6 | **Move re-learner NPC** — visit a tutor to bring back any move the creature could have learned by level. | 4 | 1 | Manage | ROM hacks |
| 7 | **Town map item** — Select opens a region map with current location pin + visited towns marked. | 5 | 2 | Overworld | Pokémon |
| 8 | **Fast travel via Fly to visited towns** — late-game key item; opens town map and warps you to any visited PokeRod Center. | 5 | 2 | Overworld | Pokémon |
| 9 | **Achievement / trophy room** — 30 trackable achievements (catch starter line, beat all gyms with one type, walk 10000 steps, etc.) with a trophy-shelf UI. | 4 | 2 | Meta | Mobile |
| 10 | **Daily login + daily quest** — calendar slot rewards (potion → great ball → daily revive); a single "Daily Quest" rotates through fetch/catch/battle. | 4 | 2 | Story | Mobile |
| 11 | **PC box search + filter + sort** — filter by type, level, caught-when, sort by name/level/dex#. | 4 | 2 | Manage | ROM hacks |
| 12 | **Mass release from PC** — multi-select with confirm. Pairs with #11. | 3 | 1 | Manage | ROM hacks |
| 13 | **Nicknames on catch** — opt-in dialog after a successful catch; falls back to species name. | 3 | 1 | Manage | Pokémon |
| 14 | **Berry farming** — pick a berry tile, plant, water with rod, harvest in N steps. Already have berries. | 4 | 3 | Overworld | Pokémon |
| 15 | **Difficulty modes** — Easy (less XP needed), Normal, Hard (trainers level-scaled +3), Nuzlocke (perma-faint, one catch per zone). Settings toggle. | 5 | 3 | Meta | ROM hacks |
| 16 | **Shiny variants** — 1/4096 alt palette per species, marked in dex with a star, +1 friendship. Adds sparkle particle on encounter. | 4 | 2 | Catch | Pokémon |
| 17 | **Battle abilities** — one passive ability per species (Blaze: +50% FIRE damage <1/3 HP, Levitate: immune to GROUND, Static: 30% paralyse on contact). 18 abilities to start. | 5 | 4 | Battle | Pokémon |
| 18 | **Photo mode** — pause world, frame a shot with brackets + zoom, save to gallery (localStorage data URL). View gallery from menu. | 4 | 3 | Visual | Mobile |
| 19 | **Bicycle** — key item halves move animation duration on outdoor maps; B+dir toggles. | 4 | 2 | Overworld | Pokémon |
| 20 | **NPC schedules (day/night)** — some NPCs walk into / out of buildings at dusk; dialog tags. Hooks existing day/night counter. | 4 | 3 | Overworld | Indie |
| 21 | **Avatar customisation** — pick body palette + hat + outfit at game start, change at the wardrobe in your room. Reuse `npcPalette`. | 4 | 3 | Visual | Mobile |
| 22 | **Hidden grottos** — small 8×8 single-encounter rooms behind hard-to-reach tiles; weekly rotating species. Adds 6 grottos to the world. | 4 | 3 | Catch | Pokémon |
| 23 | **Music per biome / per battle type** — wild battle / trainer battle / gym battle / final-rival have distinct themes. Currently shares the battle theme. | 4 | 3 | Visual | Pokémon |
| 24 | **Random daily creature** — one species' encounter rate triples for a 24-hour calendar slot, marked on the dex. | 3 | 1 | Catch | Mobile |
| 25 | **Repel item + HUD timer** — uses 100 steps that suppress wild encounters below a level threshold. | 4 | 2 | QoL | Pokémon |
| 26 | **Set-mode battles toggle** — disables free switching when the foe faints (asks before sending out next). Settings checkbox. | 3 | 1 | Battle | ROM hacks |
| 27 | **Doubles battles (2v2)** — your front two vs. their front two, single-target moves pick a side. Limit to a few flagged trainers. | 5 | 5 | Battle | Pokémon |
| 28 | **Move tutors** — small set of unique moves (e.g. Hyper Beam, Earthquake) taught at NPCs in exchange for badges or items. | 4 | 2 | Manage | Pokémon |
| 29 | **TM items** — 30 one-use TMs that teach a specific move to any compatible creature. | 4 | 3 | Manage | Pokémon |
| 30 | **EV / IV transparency** — judge NPC tells you "exceptional in ATK", later a hidden-stats overlay in the party page. | 3 | 2 | Manage | ROM hacks |
| 31 | **Friendship / affection mechanic** — value rises with battles + walking; high friendship enables Return move + auto-survive a fatal hit once. Display in party detail. | 4 | 3 | Battle | Pokémon |
| 32 | **Battle backgrounds vary by terrain** — different platform art when battling on grass vs. cave vs. snow vs. water. Already have biome data. | 4 | 2 | Visual | Pokémon |
| 33 | **Ambient soundscapes** — overworld ambient track per biome (forest birds, cave drips, beach waves) layered under the music. | 4 | 3 | Visual | Indie |
| 34 | **Battle ball-throw animation** — curved arc with sparkle, ball wobbles 0-3 times before catch outcome. Hooks battle FX system. | 4 | 2 | Visual | Pokémon |
| 35 | **Mid-battle item use** — open bag from the battle menu (already accessible); throw potion plays a sparkle on the active mon. | 3 | 2 | Battle | Pokémon |
| 36 | **Random encounter rebalancer** — encounter pool widens slightly with badges (so post-game routes still surprise). | 3 | 1 | Catch | Indie |
| 37 | **NewGame+** — finish the league → save flag → new run keeps dex / play time / cosmetic, resets bag/party/badges, trainer levels +5. | 4 | 3 | Meta | ROM hacks |
| 38 | **Battle replay / log viewer** — last 5 battles' turn-by-turn log accessible from menu. | 3 | 2 | QoL | Indie |
| 39 | **Cooking / curry from berries** — combine 3 berries into a meal that grants temporary stat boost or heals at center. | 3 | 3 | Overworld | Pokémon |
| 40 | **Daycare + simple breeding** — drop two compatible creatures, walk N steps, return for an egg that hatches into a baby of one parent's species. No IV/move inheritance to start. | 5 | 5 | Manage | Pokémon |
| 41 | **Postgame Battle Tower** — 5/10/15-streak modes with rental teams against scaling trainers. Reuses existing battle code. | 4 | 4 | Meta | Pokémon |
| 42 | **Type-coverage party advisor** — bottom screen shows a 18-type grid of your party's coverage (which types you hit super-effective). | 4 | 2 | Manage | Indie |
| 43 | **Encounter shake — tall grass rustle** — grass tile gently shakes when a wild creature is about to spawn within 3 steps. | 3 | 2 | Visual | Pokémon |
| 44 | **Cry on encounter / sendout** — already have cries; add a louder version for legendary / boss creatures. | 2 | 1 | Visual | Pokémon |
| 45 | **Konami unlock for cheat menu** — already have Konami; expand to a small cheat menu (level up, heal, money, teleport). | 3 | 2 | QoL | Konami already exists |
| 46 | **Apricorn / craftable balls** — gather coloured apricorns from trees, NPC crafts them into 5 special balls (Friend Ball, Heavy Ball, etc.). | 4 | 3 | Catch | Pokémon |
| 47 | **Roaming legendary** — one rare, level-50 creature wanders the map; encounter chance 1/40 on certain routes. Catch is tough; runs every turn. | 4 | 3 | Catch | Pokémon |
| 48 | **Creature fusion (Cassette Beasts style)** — combine two party members into a one-battle fused form (composite sprite, mixed type, mixed moves). | 5 | 5 | Battle | Cassette Beasts |
| 49 | **Local trade via QR / share-code** — export party member as a base64 string; other player imports. Browser-only, no server. | 4 | 4 | Meta | Pokémon |
| 50 | **Per-creature skill tree** — earn skill points on level-up; spend to unlock minor passives (e.g. +5 ATK, +1 priority on Move 1). | 5 | 5 | Battle | Monster Sanctuary |

## Ranked sprint queue

Sorted by `value = impact × 2 − cost`. Group adjacent items when they
share infrastructure so one PR sets up scaffolding for the next.

| Rank | Value | Imp/Cost | Feature | Note |
|------|-------|----------|---------|------|
| 1 | 9 | 5/1 | Battle text speed + skip | Ship first; ~1 day, biggest feel-good |
| 2 | 8 | 4/1 | Effectiveness preview in battle menu | |
| 3 | 8 | 4/1 | Encounter rate by weather + time | |
| 4 | 8 | 4/1 | Move re-learner NPC | |
| 5 | 8 | 5/2 | Held items per creature | |
| 6 | 8 | 5/2 | Weather affects battle damage | Pairs with #3 + #5; ship as "battle weather PR" |
| 7 | 8 | 5/2 | Town map item | |
| 8 | 8 | 5/2 | Fast travel via Fly | Pairs with #7 |
| 9 | 8 | 4/2 | Repel item + HUD timer | |
| 10 | 7 | 3/1 | Nicknames on catch | |
| 11 | 7 | 3/1 | Random daily creature | |
| 12 | 7 | 3/1 | Set-mode battles toggle | |
| 13 | 7 | 3/1 | Cry on encounter / sendout | |
| 14 | 6 | 4/2 | Achievement / trophy room | |
| 15 | 6 | 4/2 | Daily login + daily quest | Pairs with #14 (achievement infra) |
| 16 | 6 | 4/2 | PC box search / filter / sort | |
| 17 | 6 | 3/1 | Mass release from PC | Pairs with #16 |
| 18 | 6 | 4/2 | Shiny variants | |
| 19 | 6 | 4/2 | Battle backgrounds vary by terrain | |
| 20 | 6 | 4/2 | Ball-throw curve animation | |
| 21 | 6 | 4/2 | Type-coverage party advisor | |
| 22 | 6 | 4/2 | Bicycle (movement speed) | |
| 23 | 6 | 4/2 | Move tutors | |
| 24 | 5 | 3/1 | Encounter pool widens with badges | |
| 25 | 5 | 3/2 | Mid-battle item-use animation | |
| 26 | 5 | 3/2 | EV / IV transparency | |
| 27 | 5 | 3/2 | Battle replay / log viewer | |
| 28 | 5 | 3/2 | Konami unlock cheat menu | |
| 29 | 5 | 4/3 | Berry farming | |
| 30 | 5 | 4/3 | Photo mode with gallery | |
| 31 | 5 | 4/3 | NPC day/night schedules | |
| 32 | 5 | 4/3 | Avatar customisation | |
| 33 | 5 | 4/3 | Hidden grottos | |
| 34 | 5 | 4/3 | Music per biome / battle type | |
| 35 | 5 | 4/3 | Ambient soundscapes | |
| 36 | 5 | 4/3 | Friendship / affection mechanic | |
| 37 | 5 | 4/3 | Apricorn / craftable balls | |
| 38 | 5 | 4/3 | Roaming legendary | |
| 39 | 5 | 4/3 | New Game+ | |
| 40 | 5 | 5/3 | Difficulty modes (incl. nuzlocke) | |
| 41 | 4 | 4/3 | TM items | |
| 42 | 4 | 3/3 | Cooking / curry from berries | |
| 43 | 4 | 2/1 | Louder cry for legendaries | |
| 44 | 3 | 3/2 | Encounter shake — tall grass rustle | |
| 45 | 4 | 4/4 | Postgame Battle Tower | |
| 46 | 3 | 4/4 | Local trade via QR / share-code | |
| 47 | 3 | 5/4 | **Battle abilities** | Largest design surface — write an RFC commit before implementation |
| 48 | 1 | 5/5 | Doubles battles (2v2) | Multi-PR roadmap item |
| 49 | 1 | 5/5 | Daycare + breeding (eggs) | Multi-PR roadmap item |
| 50 | -1 | 5/5 | Creature fusion / per-creature skill tree | Multi-PR roadmap item |
