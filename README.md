# On Da Stack React Battlefield Components

Standalone React component set for the On Da Stack MTG Simulator dynamic battlefield. It is designed for a Vite + React project and keeps simulator layout behavior isolated from game-engine/rules logic.

## Included

- `BattlefieldLayoutSystem` with unique spatial layouts for 2, 3, 4, 5, and 6 Commander players.
- Contextual focus mode that expands the focused or active player while compressing inactive battlefields.
- Combat isolation mode with SVG attack lanes, dimmed unrelated players, and grouped attack labels.
- Grouped token cloud components for Treasure, Clue, Food, creature token groups, and custom counters.
- Battlefield overview minimap with life totals, commander-on-board indicators, trigger indicators, restriction indicators, priority, focus, and combat state.
- `CombatResolutionEngine` for Commander combat flow: attack declaration, blocker assignment, combat damage, commander damage, Myriad token creation/exile, and assistant judge flags.
- Pure combat helper functions if you want to drive combat from your own reducer instead of the packaged UI.
- `ReplayBoardStateScrubber` for action-log replay: timeline scrubbing, step-forward/back controls, rebuilt life totals, commander damage, stack state, zone contents, assistant flags, and replay JSON export.
- `ShareableReplayViewer` for read-only community replay links. It accepts uploaded `.replay.json` files or URL-encoded replay data and opens as a GitHub Pages-friendly route.
- Sample state factory and TypeScript data model for fast prototyping.

## Drop-in usage

Copy this folder into your Vite project:

```text
src/components/battlefield
```

Then import:

```tsx
import {
  BattlefieldLayoutSystem,
  CombatResolutionEngine,
  ReplayBoardStateScrubber,
  ShareableReplayViewer,
  makeSampleBattlefield,
  makeSampleCombatState,
  makeSampleReplayActions,
  type BattlefieldState,
} from "./components/battlefield";
```

Example:

```tsx
const state: BattlefieldState = makeSampleBattlefield(4);

<BattlefieldLayoutSystem
  state={state}
  mode="combat"
  focusedPlayerId="p1"
  onFocusPlayer={(playerId) => setFocusedPlayerId(playerId)}
  onSelectCard={(card, playerId) => openCardInspector(card, playerId)}
  onSelectTokenCloud={(cloud, playerId) => openTokenEditor(cloud, playerId)}
/>;
```

Combat engine example:

```tsx
const combatState = makeSampleCombatState();

<CombatResolutionEngine
  initialState={combatState}
  onChange={(nextState) => setCombatSnapshot(nextState)}
  onCommitDamage={(resolvedState) => applyCombatDamageToMatch(resolvedState)}
/>;
```

## Combat engine behavior

- Drag from an active player creature to a defending player to declare an attack. Keyboard/click fallback is also supported by selecting an attacker, then selecting a defender.
- Select a declared attack, then select defending creatures to assign blockers.
- `Calculate damage` resolves current assignments with simplified Commander combat math, including deathtouch lethal damage and trample overflow.
- Commander damage is tracked per commander source on each defending player.
- Myriad attackers create temporary token-copy attacks against other opponents, and those copies are exiled when `End combat` runs.
- Assistant judge flags are advisory only. Illegal attacks, tapped blockers, missed attack triggers, commander-damage checks, and Myriad reminders are logged but never blocked.

Replay scrubber example:

```tsx
const replayActions = makeSampleReplayActions();

<ReplayBoardStateScrubber
  actions={replayActions}
  matchName="Thursday Commander Pod"
  onSnapshotChange={(snapshot) => syncPreview(snapshot)}
/>;
```

## Replay scrubber behavior

- The action log is the source of truth. `buildReplaySnapshots(actions)` rebuilds every board state from the beginning of the log.
- The timeline slider and step controls move between action indexes.
- Each snapshot includes turn, stage, active player, priority player, life totals, poison, commander damage, zone contents, stack state, assistant flags, and judge annotations.
- `Export replay JSON` downloads a `.replay.json` file containing version metadata, export timestamp, match name, and raw actions.
- Judge flags and annotations re-display at the point in the replay where they entered the log and remain visible in later snapshots.

Shareable replay viewer example:

```tsx
<ShareableReplayViewer />;
```

## Shareable replay route

Use this route format for GitHub Pages:

```text
/#/replay?data=<base64url-encoded-replay-json>
```

The viewer also accepts:

- Uploaded `.replay.json` files.
- `?replay=` or `?data=` query parameters.
- `#/replay?replay=` or `#/replay?data=` hash parameters.

The viewer is read-only and does not require the full simulator state to be open. It reconstructs the timeline from the replay action log and then renders the board-state scrubber, judge annotation layer, and stack state at each logged turn and stage.

## Integration notes

- The component does not enforce MTG rules or block actions. It visually represents the game state that your simulator/action-log engine provides.
- Use the action log as the source of truth, then rebuild a `BattlefieldState` snapshot and pass it into the component.
- Use the combat action log or your own reducer as the source of truth for combat. The included UI owns local state for prototyping, while the exported pure functions can be used in a larger simulator reducer.
- For player counts above 6, clamp or paginate at the parent layer. This package intentionally targets 2-6 Commander pods.
- The CSS is plain CSS, namespaced with `ods-`, and has no Tailwind, shadcn, or icon dependency.
- The layout is optimized for desktop browsers and iPad landscape. It includes a fallback stacked layout for narrower screens, but phone-first gameplay is intentionally out of scope.

## Suggested state flow

```text
Action log → reducer/replay engine → BattlefieldState → BattlefieldLayoutSystem
Action log → buildReplaySnapshots → ReplayBoardSnapshot → ReplayBoardStateScrubber
ReplayFile or URL data → ShareableReplayViewer → ReplayBoardStateScrubber
```

Keep rule validation, hidden-information permissions, and network authority outside this display layer. The component is intended to be a battlefield cockpit, not a restrictive game engine.
