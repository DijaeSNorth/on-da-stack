import { useEffect, useMemo, useState } from "react";
import { buildReplaySnapshots, makeReplayFile } from "./replayEngine";
import type { ReplayBoardSnapshot, ReplayScrubberProps, ReplayZoneName } from "./replayTypes";

const visibleZones: ReplayZoneName[] = ["battlefield", "hand", "graveyard", "exile", "command"];

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getCardNames(snapshot: ReplayBoardSnapshot, cardIds: string[]) {
  return cardIds.map((cardId) => snapshot.cards[cardId]?.name ?? cardId);
}

function activePlayerName(snapshot: ReplayBoardSnapshot) {
  return snapshot.players.find((player) => player.id === snapshot.activePlayerId)?.name ?? "Unknown";
}

export function ReplayBoardStateScrubber({
  actions,
  matchName = "On Da Stack Replay",
  initialIndex,
  onSnapshotChange,
  className = "",
}: ReplayScrubberProps) {
  const snapshots = useMemo(() => buildReplaySnapshots(actions), [actions]);
  const maxIndex = Math.max(0, snapshots.length - 1);
  const [index, setIndex] = useState(Math.min(initialIndex ?? maxIndex, maxIndex));
  const snapshot = snapshots[index] ?? snapshots[0];
  const currentAction = actions[index];

  useEffect(() => {
    if (snapshot) {
      onSnapshotChange?.(snapshot);
    }
  }, [onSnapshotChange, snapshot]);

  const stepTo = (nextIndex: number) => {
    setIndex(Math.min(maxIndex, Math.max(0, nextIndex)));
  };

  if (!snapshot) {
    return (
      <section className={`ods-replay-scrubber ${className}`.trim()} data-testid="section-replay-scrubber">
        <p className="ods-replay-empty">No replay actions available.</p>
      </section>
    );
  }

  return (
    <section className={`ods-replay-scrubber ${className}`.trim()} data-testid="section-replay-scrubber">
      <header className="ods-replay-scrubber__header">
        <div>
          <p>Replay Scrubber</p>
          <h2>{matchName}</h2>
        </div>
        <button
          type="button"
          className="ods-replay-export"
          onClick={() => downloadJson(`${matchName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.replay.json`, makeReplayFile(actions, matchName))}
          data-testid="button-export-replay-json"
        >
          Export replay JSON
        </button>
      </header>

      <div className="ods-replay-controls">
        <button type="button" onClick={() => stepTo(index - 1)} disabled={index === 0} data-testid="button-replay-step-back">
          Step back
        </button>
        <input
          type="range"
          min="0"
          max={maxIndex}
          value={index}
          onChange={(event) => stepTo(Number(event.target.value))}
          aria-label="Replay timeline"
          data-testid="input-replay-timeline"
        />
        <button type="button" onClick={() => stepTo(index + 1)} disabled={index === maxIndex} data-testid="button-replay-step-forward">
          Step forward
        </button>
      </div>

      <div className="ods-replay-meta">
        <article>
          <span>Turn</span>
          <strong>{snapshot.turn}</strong>
        </article>
        <article>
          <span>Stage</span>
          <strong>{snapshot.stage}</strong>
        </article>
        <article>
          <span>Active player</span>
          <strong>{activePlayerName(snapshot)}</strong>
        </article>
        <article>
          <span>Action</span>
          <strong>
            {index + 1}/{snapshots.length}
          </strong>
        </article>
      </div>

      <div className="ods-replay-current-action" data-testid="text-current-replay-action">
        <span>{currentAction?.type ?? "snapshot"}</span>
        <strong>{currentAction?.label ?? "No action selected"}</strong>
      </div>

      <div className="ods-replay-grid">
        <section className="ods-replay-panel ods-replay-panel--players">
          <header>
            <span>Players</span>
            <strong>{snapshot.players.length}</strong>
          </header>
          <div className="ods-replay-players">
            {snapshot.players.map((player) => (
              <article key={player.id} className="ods-replay-player" data-active={player.id === snapshot.activePlayerId ? "true" : "false"}>
                <header>
                  <strong>{player.name}</strong>
                  <span>{player.life} life</span>
                </header>
                <small>{player.poison} poison</small>
                <div className="ods-replay-commander-damage">
                  {Object.entries(player.commanderDamageTaken).length ? (
                    Object.entries(player.commanderDamageTaken).map(([sourceId, amount]) => (
                      <span key={sourceId}>
                        {snapshot.cards[sourceId]?.name ?? sourceId}: {amount}
                      </span>
                    ))
                  ) : (
                    <span>No commander damage</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ods-replay-panel ods-replay-panel--zones">
          <header>
            <span>Zone contents</span>
            <strong>{Object.keys(snapshot.cards).length} cards</strong>
          </header>
          <div className="ods-replay-zone-board">
            {snapshot.players.map((player) => (
              <article key={player.id} className="ods-replay-zone-player">
                <h3>{player.name}</h3>
                <div className="ods-replay-zones">
                  {visibleZones.map((zone) => {
                    const names = getCardNames(snapshot, player.zones[zone] ?? []);
                    return (
                      <section key={zone} className="ods-replay-zone">
                        <header>
                          <span>{zone}</span>
                          <strong>{names.length}</strong>
                        </header>
                        {names.length ? (
                          <ul>
                            {names.slice(0, 6).map((name) => (
                              <li key={`${zone}-${name}`}>{name}</li>
                            ))}
                            {names.length > 6 && <li>+{names.length - 6} more</li>}
                          </ul>
                        ) : (
                          <p>Empty</p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="ods-replay-panel ods-replay-panel--stack">
          <header>
            <span>Stack state</span>
            <strong>{snapshot.stack.length}</strong>
          </header>
          <div className="ods-replay-stack">
            <span>TOP</span>
            {snapshot.stack.length ? (
              snapshot.stack.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <small>{item.kind}</small>
                </article>
              ))
            ) : (
              <p>Stack clear</p>
            )}
            <span>BOTTOM</span>
          </div>
        </aside>

        <aside className="ods-replay-panel ods-replay-panel--judge">
          <header>
            <span>Judge annotations</span>
            <strong>{snapshot.flags.length + snapshot.annotations.length}</strong>
          </header>
          <div className="ods-replay-flags">
            {snapshot.flags.map((flag) => (
              <article key={flag.id} className="ods-replay-flag" data-severity={flag.severity}>
                <span>{flag.severity}</span>
                <strong>{flag.title}</strong>
                <p>{flag.detail}</p>
              </article>
            ))}
            {snapshot.annotations.map((note, noteIndex) => (
              <article key={`${note}-${noteIndex}`} className="ods-replay-flag" data-severity="annotation">
                <span>annotation</span>
                <strong>Judge note</strong>
                <p>{note}</p>
              </article>
            ))}
            {!snapshot.flags.length && !snapshot.annotations.length && <p className="ods-replay-empty">No assistant flags at this moment.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
