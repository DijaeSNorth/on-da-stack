import { useMemo, useState } from "react";
import {
  BattlefieldLayoutSystem,
  CombatResolutionEngine,
  ReplayBoardStateScrubber,
  ShareableReplayViewer,
  makeSampleBattlefield,
  makeSampleCombatState,
  makeSampleReplayActions,
  type BattlefieldMode,
} from "../components/battlefield";
import "./app.css";

const modes: BattlefieldMode[] = ["overview", "focus", "combat", "stack", "judge", "minimal"];
const demoViews = [
  {
    id: "battlefield",
    label: "Battlefield",
    eyebrow: "2–6 Commander layouts",
  },
  {
    id: "combat",
    label: "Combat Engine",
    eyebrow: "Attacks, blocks, damage",
  },
  {
    id: "replay",
    label: "Replay Scrubber",
    eyebrow: "Action log as truth",
  },
  {
    id: "share",
    label: "Share Viewer",
    eyebrow: "Read-only community replay",
  },
] as const;

export default function App() {
  const [playerCount, setPlayerCount] = useState(4);
  const [mode, setMode] = useState<BattlefieldMode>("overview");
  const isReplayRoute = typeof window !== "undefined" && window.location.hash.startsWith("#/replay");
  const [demoView, setDemoView] = useState<"battlefield" | "combat" | "replay" | "share">(
    isReplayRoute ? "share" : "battlefield",
  );
  const [focusedPlayerId, setFocusedPlayerId] = useState("p1");
  const combatState = useMemo(() => makeSampleCombatState(), []);
  const replayActions = useMemo(() => makeSampleReplayActions(), []);
  const state = useMemo(() => {
    const sample = makeSampleBattlefield(playerCount);
    return {
      ...sample,
      mode,
      focusedPlayerId,
    };
  }, [focusedPlayerId, mode, playerCount]);

  return (
    <main className="ods-prototype">
      <header className="ods-prototype__hero">
        <div className="ods-prototype__brand" aria-label="On Da Stack">
          <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
            <path d="M13 18h38l-6 27H19L13 18Z" />
            <path d="M21 12h31l-4 18M12 26h33M23 45l-5 7h25l-5-7" />
            <path d="M31 23l7 8-7 8-7-8 7-8Z" />
          </svg>
          <span>On Da Stack</span>
        </div>
        <div className="ods-prototype__hero-copy">
          <p>Commander-first MTG simulator prototype</p>
          <h1>Digital tabletop freedom with an assistant judge watching the stack.</h1>
          <span>
            Built around your core rule: players can make any move, the system logs it, explains what matters,
            and flags possible issues without blocking play.
          </span>
        </div>
        <div className="ods-prototype__principles" aria-label="Design principles">
          <strong>Design principles</strong>
          <span>Low resource usage</span>
          <span>Expandable detail</span>
          <span>Desktop + iPad landscape</span>
          <span>Local-first replay sharing</span>
        </div>
      </header>

      <section className="ods-prototype__controls" aria-label="Prototype controls">
        <div className="ods-prototype__tabs" role="tablist" aria-label="Simulator modules">
          {demoViews.map((view) => (
            <button
              key={view.id}
              type="button"
              className={demoView === view.id ? "is-active" : ""}
              onClick={() => setDemoView(view.id)}
            >
              <span>{view.eyebrow}</span>
              {view.label}
            </button>
          ))}
        </div>

        {demoView === "battlefield" && (
          <div className="ods-prototype__toolbar" aria-label="Battlefield layout controls">
            <div>
              <span>Players</span>
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={playerCount === count ? "is-active" : ""}
                  onClick={() => setPlayerCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
            <div>
              <span>Mode</span>
              {modes.map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  className={mode === nextMode ? "is-active" : ""}
                  onClick={() => setMode(nextMode)}
                >
                  {nextMode}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {demoView === "combat" ? (
        <CombatResolutionEngine initialState={combatState} onChange={(nextState) => console.log("Combat state", nextState)} />
      ) : demoView === "replay" ? (
        <ReplayBoardStateScrubber
          actions={replayActions}
          matchName="On Da Stack Demo Replay"
          onSnapshotChange={(snapshot) => console.log("Replay snapshot", snapshot)}
        />
      ) : demoView === "share" ? (
        <ShareableReplayViewer />
      ) : (
        <BattlefieldLayoutSystem
          state={state}
          mode={mode}
          focusedPlayerId={focusedPlayerId}
          onFocusPlayer={setFocusedPlayerId}
          onSelectCard={(card, playerId) => console.log("Selected card", playerId, card)}
          onSelectTokenCloud={(cloud, playerId) => console.log("Selected token cloud", playerId, cloud)}
        />
      )}
    </main>
  );
}
