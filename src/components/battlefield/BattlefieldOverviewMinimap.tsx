import type { PlayerBattlefield } from "./types";

type MinimapProps = {
  players: PlayerBattlefield[];
  playerCount: number;
  activePlayerId: string;
  priorityPlayerId: string;
  focusedPlayerId?: string;
  combatPlayerIds?: Set<string>;
  onFocusPlayer?: (playerId: string) => void;
};

const miniSeats: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 50, y: 18 },
    { x: 50, y: 82 },
  ],
  3: [
    { x: 50, y: 16 },
    { x: 22, y: 78 },
    { x: 78, y: 78 },
  ],
  4: [
    { x: 50, y: 14 },
    { x: 84, y: 50 },
    { x: 50, y: 86 },
    { x: 16, y: 50 },
  ],
  5: [
    { x: 50, y: 12 },
    { x: 85, y: 38 },
    { x: 72, y: 82 },
    { x: 28, y: 82 },
    { x: 15, y: 38 },
  ],
  6: [
    { x: 30, y: 14 },
    { x: 70, y: 14 },
    { x: 86, y: 50 },
    { x: 70, y: 86 },
    { x: 30, y: 86 },
    { x: 14, y: 50 },
  ],
};

export function BattlefieldOverviewMinimap({
  players,
  playerCount,
  activePlayerId,
  priorityPlayerId,
  focusedPlayerId,
  combatPlayerIds = new Set(),
  onFocusPlayer,
}: MinimapProps) {
  const seats = miniSeats[playerCount] ?? miniSeats[4];

  return (
    <aside className="ods-minimap" aria-label="Battlefield overview minimap">
      <header className="ods-minimap__header">
        <span>Overview</span>
        <strong>{players.length} seats</strong>
      </header>
      <div className="ods-minimap__map" role="list">
        <svg viewBox="0 0 100 100" aria-hidden="true" className="ods-minimap__ring">
          <circle cx="50" cy="50" r="28" />
          <circle cx="50" cy="50" r="6" />
        </svg>
        {players.slice(0, playerCount).map((player, index) => {
          const seat = seats[index];
          const isActive = player.id === activePlayerId;
          const hasPriority = player.id === priorityPlayerId;
          const isFocused = player.id === focusedPlayerId;
          const inCombat = combatPlayerIds.has(player.id);

          return (
            <button
              key={player.id}
              type="button"
              role="listitem"
              className="ods-minimap-seat"
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
              data-active={isActive ? "true" : "false"}
              data-priority={hasPriority ? "true" : "false"}
              data-focused={isFocused ? "true" : "false"}
              data-combat={inCombat ? "true" : "false"}
              onClick={() => onFocusPlayer?.(player.id)}
              data-testid={`button-minimap-player-${player.id}`}
              title={`${player.name}: ${player.life} life, ${player.triggerCount} triggers`}
            >
              <span className="ods-minimap-seat__name">{player.name.replace(" (You)", "")}</span>
              <span className="ods-minimap-seat__life">{player.life}</span>
              <span className="ods-minimap-seat__icons" aria-label="Indicators">
                {player.commander.zone === "battlefield" ? <span title="Commander on battlefield">C</span> : null}
                {player.triggerCount ? <span title={`${player.triggerCount} triggers`}>T</span> : null}
                {player.pendingRestrictionCount ? <span title={`${player.pendingRestrictionCount} restrictions`}>!</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
