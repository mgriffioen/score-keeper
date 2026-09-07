# Score Keeper

A mobile-first score pad for card games. Set up a table once — players, how you
win, when it ends, whether there's a pot — then tap in each hand on a built-in
keypad. Everything is saved, named, and kept in a history you can come back to.

**→ [mgriffioen.github.io/score-keeper](https://mgriffioen.github.io/score-keeper/)**

---

## Setting up a game

Seventeen presets — Rummy, Hearts, Spades, Oh Hell, Wizard, Skull King, Golf,
Five Crowns, Cribbage, Canasta, Farkle, Uno, a 501 countdown, poker night, and
more — fill in sensible defaults. Every one of them stays editable, during setup
and mid-game: they are starting points, not rules lawyers.

- **2 to 8 players**, named, reorderable, with a *shuffle seats* button for
  deciding who sits where.
- **Highest or lowest total wins.**
- **A starting score** — 0 for most games, 501 for a countdown.
- **How it ends:** play until you say stop, a fixed number of rounds, or the
  first player to *reach* a target (Rummy to 500) or *fall to* one (501 down to
  zero). When the condition is met the app offers to end the game; you can wave
  it off and keep playing.
- **A pot:** a buy-in per player, optionally topped up each round, totalled and
  shown against the winner.
- **Round naming** — Round, Hand, Deal, Turn, Hole, Leg — used everywhere in the
  interface.
- **Negative scores** on or off, and **dealer tracking** that passes the deal
  round the table.
- **Notes** for house rules.

Trick-taking games get [bidding and a deal pattern](#trick-taking-games); poker
nights get [blinds on a clock](#poker-night).

## Playing

**Entering scores.** Tapping a score opens a full-screen sheet with every player
and a large keypad: digits, `±`, backspace, `C`, *Next*, and *Save*. It is a
custom keypad rather than native text fields, which is what keeps the OS
keyboard shut and the page from zooming as you type. Tap any player row to jump
straight to them; on a laptop the number keys, `-`, `Backspace`, `Tab`/arrows
and `Enter` all work too.

**Fixing mistakes.** Tap any row of the round table to re-enter or delete that
round, or undo the last one from the game menu.

**The history.** Every session is named and saved — games in progress at the
top, finished games with their winner below. Rematch keeps the same table and
rules with a clean sheet, and passes the deal on.

## Trick-taking games

### Bidding

Switch **Bidding** on and a round collects two numbers per player — what they
called and what they took — and works out the points itself. The formula is
yours to set: a bonus for calling it exactly, a rate per trick on top, and a
choice of what a miss is worth (nothing, the tricks you took anyway, or a
penalty per trick out).

Two presets arrive configured:

| | Made your bid | Missed |
|---|---|---|
| **Oh Hell** | 10 + 1 per trick — bid 3, take 3, score 13 | the tricks you took — bid 3, take 4, score 4 |
| **Wizard** | 20 + 10 per trick | −10 per trick over or under |

Oh Hell follows [officialgamerules.org](https://officialgamerules.org/game-rules/oh-hell/):
*"1 point per trick taken. +10 bonus points if the tricks taken exactly match
your bid."* Bidding zero and making it earns the bonus like any other bid.

### Calling, then scoring

Because you call before you play, a bid round is saved in two passes. Enter
everyone's call and hit **Save**: the hand goes on the board with the bids
visible beside each name, but it does not yet count as played. When the hand is
over the button reads **Score hand N** — reopen it, enter the tricks won, and
the points land. Nothing about the length of the game moves until then.

Turning bidding off part-way through leaves every hand already played exactly as
it was scored.

### The deal

Games that change the hand size each round can say so. Pick a pattern — down,
up, down then up, up then down — and the biggest hand, and the app works out the
rest: how many cards are dealt each round, and how many rounds there are. When a
pattern is set it decides the length of the game, so the round count stops being
separately editable and reports what the deal says instead.

Oh Hell's default is the classic **10, 9, 8 … 1, and back up to 10** — nineteen
hands. The opening hand shrinks automatically when the table is too big to spare
that many from one deck, so six players get eight down to one and back, fifteen
hands. Wizard deals its own sixty-card deck a card at a time upwards. Set the
pattern to *same every hand* and the app stops tracking cards altogether, which
is what every non-trick-taking game does.

Knowing the hand size earns its keep during play: the header reads
`Hand 2 · 9 cards · 19 hands`, and while everyone is calling, the entry sheet
totals it up — `8 called of 10 · 2 under`. Anyone playing the hook rule (the
dealer may not make the bids add up to the tricks available) can see at a glance
whether the table is even.

## Poker night

Switch **Blinds** on and the game screen gains a countdown at the top: the level
you're on, what the blinds are, what's next, and how long until they go up. It
walks up the ladder on its own, and chimes and buzzes when it does. Controls are
‹ and › to move a level, ↺ to put the current one back to full, and one big
Pause/Resume.

The poker night preset arrives with a nine-rung home-game ladder — 25/50 up to
500/1000, fifteen minutes each, with a ten-minute break in the middle. Every
number is editable: small blind, big blind, ante and length per level, plus add
and remove. **+ Add level** doubles the one before it. Breaks are their own kind
of rung — a clock with no blinds, and not counted in "level 3 of 8".

**The clock is wall-clock arithmetic, not a ticking counter.** All that is
stored is which level you were on, when it was last resumed, and how much of the
level had already gone; everything on screen is derived from the current time.
That is what keeps it right through a locked phone, a backgrounded tab or a
reload — come back forty minutes later and it is on the level it should be on,
having rolled forward through the ones that passed, rather than the level you
left. Nothing is written to storage on a tick, only when someone presses
something.

## Built for a phone

**No zoom, on purpose.** Three things together stop the page moving while you
enter scores: a `maximum-scale=1` viewport, `touch-action: manipulation` (which
kills double-tap zoom while leaving normal scrolling alone), and a rule that no
input is ever below 16px — the size at which iOS zooms a focused field. Score
entry avoids native inputs entirely.

Add it to a phone's home screen and it runs full-screen as a standalone app;
there's a web app manifest and icons. It works in light and dark, and lays out
from a 320px phone upwards.

## Where the data lives

Saved games are stored in the browser's `localStorage`, on the device. That
means it works with no signal, needs no account, and nothing leaves the phone —
but it also means the history does not follow you to another device, and
clearing site data clears it.

To move games between devices, use **••• → Export a backup** and **Import from a
backup** on the home screen.

If you later want real cross-device sync, `src/lib/storage.ts` is the only file
that touches persistence: reimplement its `read`/`write` against a backend and
the rest of the app is unchanged. Sessions saved by older builds are brought up
to the current shape on the way out of storage, so adding a settings block never
breaks a game already on someone's phone.

## Running it

```sh
npm install
npm run dev        # local dev server, also reachable from your phone on the LAN
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # unit tests: scoring, bidding, deal patterns, the clock
npm run typecheck  # tsc, no emit
```

### Deploying

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push
to `main`. It sets `BASE_PATH` to `/<repo>/` so asset URLs resolve correctly on
a project site.

**Pages must be set to "GitHub Actions" as its source**, under **Settings →
Pages → Build and deployment → Source**. This is the one piece of setup that is
not in the repo, and the workflow token cannot do it for you: creating or
reconfiguring a Pages site needs repository admin, which `GITHUB_TOKEN` does not
have whatever it declares under `permissions:`.

<details>
<summary><strong>If the deployed page is blank with a 404 on <code>/src/main.tsx</code></strong></summary>

The source is set to *Deploy from a branch* instead of *GitHub Actions*. That
runs GitHub's Jekyll builder over the repository root and publishes the source
tree verbatim — including the development `index.html`, whose
`<script src="/src/main.tsx">` is TypeScript that only a bundler can load. The
built `index.html` in `dist/` points at `/<repo>/assets/*.js` instead; that is
what should be served.

Both pipelines deploy when the source is a branch, and they race — so this
workflow can report success while Jekyll's output is what is actually live. The
tell is a second workflow run named **"pages build and deployment"** appearing
alongside this one. Once the source is *GitHub Actions*, those stop.

</details>

Any static host works just as well — the build is plain files with no server
behind it. Serve `dist/` at the path you built it for.

## How the code is laid out

```
src/
  types.ts              the shape of a session, its settings and its rounds
  lib/
    scoring.ts          totals, standings, end conditions, bids, pot, dealer
    session.ts          creating, mutating and migrating a session
    deal.ts             hand sizes round by round, and how many rounds
    blinds.ts           the blinds ladder and the wall-clock countdown
    presets.ts          the built-in games
    storage.ts          localStorage persistence, export and import
    router.ts           hash routing, so the back button works
    useSessions.ts      the live view of what is saved
    format.ts, id.ts    small shared helpers
  components/
    ScoreEntrySheet.tsx the keypad, in points or bid-and-tricks mode
    BlindsClock.tsx     the countdown, its controls and its chime
    RulesForm.tsx       the rule set, shared by setup and in-game settings
    PlayersForm.tsx     the table
    ui.tsx              buttons, fields, sheets, toasts
  screens/
    HomeScreen.tsx      history and backups
    SetupScreen.tsx     new game
    GameScreen.tsx      scoreboard, round table, game menu
```

The rules live in `lib/` as pure functions, which is where the tests are too —
`scoring`, `deal`, `blinds`, `presets`, and one (`hydrate.test.ts`) that opens a
session saved before half these features existed.
