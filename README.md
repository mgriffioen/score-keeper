# Score Keeper

A mobile-first score pad for card games. Set up a table once — players, how you
win, when it ends, whether there's a pot — then tap in each hand on a built-in
keypad. Everything is saved, named, and kept in a history you can come back to.

## What it does

**Set up any game.** Seventeen presets (Rummy, Hearts, Spades, Oh Hell, Wizard, Skull King, Golf,
Cribbage, Farkle, poker night with a buy-in, and more) fill in sensible
defaults, and every single one stays editable — they're starting points, not
rules lawyers. Oh Hell and Wizard deal their whole deck out, so their hand
count is re-derived whenever you add or remove a player.

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
- **Round naming** — Round, Hand, Deal, Turn, Hole, Leg — used everywhere in
  the interface.
- **Negative scores** on or off, and **dealer tracking** that passes the deal
  round the table.
- **Notes** for house rules.

**Enter scores fast.** Tapping a score opens a full-screen sheet with every
player and a large keypad: digits, `±`, backspace, `C`, *Next*, and *Save*. It
is a custom keypad rather than native text fields, which is what keeps the OS
keyboard shut and the page from zooming as you type. Tap any player row to jump
straight to them; on a laptop the number keys, `-`, `Backspace`, `Tab`/arrows
and `Enter` all work too.

**Fix mistakes.** Tap any row of the round table to re-enter or delete that
round, or undo the last one from the game menu.

**Keep the history.** Every session is named and saved — in progress games at
the top, finished games with their winner below. Rematch keeps the same table
and rules with a clean sheet and passes the deal on.

### No zoom, on purpose

Three things together stop the page moving while you enter scores: a
`maximum-scale=1` viewport, `touch-action: manipulation` (which kills double-tap
zoom while leaving normal scrolling alone), and a rule that no input is ever
below 16px — the size at which iOS zooms a focused field. Score entry avoids
native inputs entirely.

## Where the data lives

Saved games are stored in the browser's `localStorage`, on the device. That
means it works with no signal, needs no account, and nothing leaves the phone —
but it also means the history does not follow you to another device, and
clearing site data clears it.

To move games between devices, use **••• → Export a backup** and **Import from a
backup** on the home screen.

If you later want real cross-device sync, `src/lib/storage.ts` is the only file
that touches persistence: reimplement its `read`/`write` against a backend and
the rest of the app is unchanged.

## Running it

```sh
npm install
npm run dev        # local dev server, also reachable from your phone on the LAN
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # scoring engine tests
```

Add it to a phone's home screen and it runs full-screen as a standalone app
(there's a web app manifest and icons).

### Deploying

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push
to `main`. It sets `BASE_PATH` to `/<repo>/` so asset URLs resolve correctly on
a project site.

**Pages must be set to "GitHub Actions" as its source** — under **Settings →
Pages → Build and deployment → Source**. This is the one piece of setup that
is not in the repo, and getting it wrong fails in a way that looks like a bug
in the app:

> **Symptom:** the deployed page is blank, and the console shows
> `GET .../src/main.tsx net::ERR_ABORTED 404 (Not Found)`.
>
> **Cause:** Source is set to *Deploy from a branch* instead of *GitHub
> Actions*. That runs GitHub's Jekyll builder over the repository root and
> publishes the source tree verbatim — including the development `index.html`,
> whose `<script src="/src/main.tsx">` is TypeScript that only a bundler can
> load. The built `index.html` in `dist/` points at `/<repo>/assets/*.js`
> instead; that is what should be served.
>
> Both pipelines deploy if the source is a branch, and they race — so the
> workflow can report success while Jekyll's output is what is actually live.
> The tell is a second workflow run named **"pages build and deployment"**
> alongside this one. Once the source is *GitHub Actions*, those stop.

The workflow token cannot set this itself: creating or reconfiguring a Pages
site needs repository admin, which `GITHUB_TOKEN` does not have whatever it
declares under `permissions:`.

Any static host works just as well — the build is plain files with no server
behind it. Serve `dist/` at the path you built it for.

## Layout

```
src/
  types.ts              the shape of a session, its settings and its rounds
  lib/
    scoring.ts          totals, standings, end conditions, pot, dealer (pure)
    scoring.test.ts     tests for all of the above
    session.ts          creating and mutating a session
    presets.ts          the built-in games
    presets.test.ts     tests for the presets and their derived round counts
    storage.ts          localStorage persistence, export and import
    router.ts           hash routing, so the back button works
  components/
    ScoreEntrySheet.tsx the keypad
    RulesForm.tsx       the rule set, shared by setup and in-game settings
    PlayersForm.tsx     the table
    ui.tsx              buttons, fields, sheets, toasts
  screens/
    HomeScreen.tsx      history and backups
    SetupScreen.tsx     new game
    GameScreen.tsx      scoreboard, round table, game menu
```
