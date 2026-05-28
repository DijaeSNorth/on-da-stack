import type {
  BattlefieldLayoutProps,
  BattlefieldMode,
  BattlefieldState,
  CardGroup,
  CombatAttacker,
  PermanentCard,
  PlayerBattlefield,
  TokenCloud,
} from "./types";
import { BattlefieldOverviewMinimap } from "./BattlefieldOverviewMinimap";
import "./battlefield.css";

type SeatAnchor = {
  area: string;
  anchor: { x: number; y: number };
};

const seatLayouts: Record<number, SeatAnchor[]> = {
  2: [
    { area: "north", anchor: { x: 50, y: 14 } },
    { area: "south", anchor: { x: 50, y: 86 } },
  ],
  3: [
    { area: "north", anchor: { x: 50, y: 13 } },
    { area: "southWest", anchor: { x: 18, y: 80 } },
    { area: "southEast", anchor: { x: 82, y: 80 } },
  ],
  4: [
    { area: "north", anchor: { x: 50, y: 10 } },
    { area: "east", anchor: { x: 84, y: 50 } },
    { area: "south", anchor: { x: 50, y: 89 } },
    { area: "west", anchor: { x: 16, y: 50 } },
  ],
  5: [
    { area: "north", anchor: { x: 50, y: 9 } },
    { area: "east", anchor: { x: 86, y: 38 } },
    { area: "southEast", anchor: { x: 72, y: 84 } },
    { area: "southWest", anchor: { x: 28, y: 84 } },
    { area: "west", anchor: { x: 14, y: 38 } },
  ],
  6: [
    { area: "northWest", anchor: { x: 28, y: 12 } },
    { area: "northEast", anchor: { x: 72, y: 12 } },
    { area: "east", anchor: { x: 88, y: 50 } },
    { area: "southEast", anchor: { x: 72, y: 86 } },
    { area: "southWest", anchor: { x: 28, y: 86 } },
    { area: "west", anchor: { x: 12, y: 50 } },
  ],
};

function clampPlayerCount(count: number) {
  return Math.min(6, Math.max(2, count));
}

function getMode(state: BattlefieldState, mode?: BattlefieldMode): BattlefieldMode {
  return mode ?? state.mode ?? "overview";
}

function getFocusId(state: BattlefieldState, focusedPlayerId?: string) {
  return focusedPlayerId ?? state.focusedPlayerId ?? state.activePlayerId;
}

function getSeat(player: PlayerBattlefield, index: number, playerCount: number) {
  return seatLayouts[playerCount][index] ?? seatLayouts[playerCount][0];
}

function getCombatState(player: PlayerBattlefield, attackers: CombatAttacker[] = []) {
  const attacking = attackers.filter((lane) => lane.attackerPlayerId === player.id);
  const defending = attackers.filter((lane) => lane.defendingPlayerId === player.id);

  return {
    isInCombat: attacking.length > 0 || defending.length > 0,
    attackingCount: attacking.reduce((total, lane) => total + (lane.groupedCount ?? 1), 0),
    defendingCount: defending.length,
  };
}

function CardPip({ card, onClick }: { card: PermanentCard; onClick?: () => void }) {
  const hasCounters = card.counters && Object.values(card.counters).some((value) => value > 0);

  return (
    <button
      type="button"
      className="ods-card-pip"
      data-tapped={card.tapped ? "true" : "false"}
      data-commander={card.commander ? "true" : "false"}
      data-restricted={card.restrictionActive ? "true" : "false"}
      onClick={onClick}
      data-testid={`button-card-${card.id}`}
      title={card.name}
    >
      <span className="ods-card-pip__name">{card.name}</span>
      {(card.power || card.toughness) && (
        <span className="ods-card-pip__pt">
          {card.power ?? "?"}/{card.toughness ?? "?"}
        </span>
      )}
      <span className="ods-card-pip__badges" aria-label="Card indicators">
        {card.commander && <span className="ods-mini-badge">CMD</span>}
        {card.triggerCount ? <span className="ods-mini-badge">{card.triggerCount} trig</span> : null}
        {hasCounters && <span className="ods-mini-badge">ctr</span>}
        {card.attachedCount ? <span className="ods-mini-badge">{card.attachedCount} att</span> : null}
        {card.restrictionActive && <span className="ods-mini-badge ods-mini-badge--warn">rule</span>}
      </span>
    </button>
  );
}

function CardGroupPanel({
  group,
  compressed,
  onSelectCard,
}: {
  group: CardGroup;
  compressed: boolean;
  onSelectCard?: (card: PermanentCard) => void;
}) {
  const visibleCards = compressed ? group.cards.slice(0, 3) : group.cards;
  const hiddenCount = Math.max(0, group.cards.length - visibleCards.length);

  return (
    <section className="ods-card-group" data-kind={group.kind} data-compressed={compressed ? "true" : "false"}>
      <header className="ods-card-group__header">
        <span>{group.label}</span>
        <strong>{group.cards.length}</strong>
      </header>
      <div className="ods-card-group__cards">
        {visibleCards.map((card) => (
          <CardPip key={card.id} card={card} onClick={() => onSelectCard?.(card)} />
        ))}
        {hiddenCount > 0 && <span className="ods-card-group__more">+{hiddenCount}</span>}
      </div>
    </section>
  );
}

function TokenCloudButton({
  cloud,
  onSelect,
}: {
  cloud: TokenCloud;
  onSelect?: (cloud: TokenCloud) => void;
}) {
  const counterSummary = cloud.counters
    ? Object.entries(cloud.counters)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `${key} ${value}`)
        .join(", ")
    : "";

  return (
    <button
      type="button"
      className="ods-token-cloud"
      onClick={() => onSelect?.(cloud)}
      data-testid={`button-token-cloud-${cloud.id}`}
      title={`${cloud.count} ${cloud.name}${counterSummary ? `, ${counterSummary}` : ""}`}
    >
      <span className="ods-token-cloud__count">{cloud.count}</span>
      <span className="ods-token-cloud__label">{cloud.name}</span>
      {(cloud.power || cloud.toughness) && (
        <span className="ods-token-cloud__pt">
          {cloud.power ?? "?"}/{cloud.toughness ?? "?"}
        </span>
      )}
      {cloud.tapped ? <span className="ods-token-cloud__meta">{cloud.tapped} tapped</span> : null}
    </button>
  );
}

function ManaRow({ player }: { player: PlayerBattlefield }) {
  const mana = player.manaOpen ?? {};
  const pips = (Object.entries(mana) as [string, number | undefined][]).filter(([, value]) => (value ?? 0) > 0);

  if (!pips.length) {
    return <span className="ods-mana-row ods-mana-row--empty">No open mana tracked</span>;
  }

  return (
    <div className="ods-mana-row" aria-label={`${player.name} open mana`}>
      {pips.map(([color, value]) => (
        <span key={color} className="ods-mana-pip" data-color={color}>
          {color.toUpperCase()} {value}
        </span>
      ))}
    </div>
  );
}

function PlayerBattlefieldCard({
  player,
  state,
  mode,
  focused,
  compressed,
  seatArea,
  onFocusPlayer,
  onSelectCard,
  onSelectTokenCloud,
}: {
  player: PlayerBattlefield;
  state: BattlefieldState;
  mode: BattlefieldMode;
  focused: boolean;
  compressed: boolean;
  seatArea: string;
  onFocusPlayer?: (playerId: string) => void;
  onSelectCard?: BattlefieldLayoutProps["onSelectCard"];
  onSelectTokenCloud?: BattlefieldLayoutProps["onSelectTokenCloud"];
}) {
  const combat = getCombatState(player, state.combat?.attackers);
  const shouldCompressGroups = compressed || mode === "minimal";

  return (
    <article
      className="ods-player-field"
      style={{ gridArea: seatArea }}
      data-focused={focused ? "true" : "false"}
      data-active={player.id === state.activePlayerId ? "true" : "false"}
      data-priority={player.id === state.priorityPlayerId ? "true" : "false"}
      data-compressed={compressed ? "true" : "false"}
      data-combat={combat.isInCombat ? "true" : "false"}
      data-testid={`card-player-battlefield-${player.id}`}
    >
      <button
        type="button"
        className="ods-player-field__focus"
        onClick={() => onFocusPlayer?.(player.id)}
        data-testid={`button-focus-player-${player.id}`}
      >
        <span className="ods-player-field__seat">Seat {player.seat}</span>
        <strong>{player.name}</strong>
        <span className="ods-player-field__state">
          {player.isActive ? "Active" : player.hasPriority ? "Priority" : combat.isInCombat ? "Combat" : "Watching"}
        </span>
      </button>

      <div className="ods-player-field__stats">
        <span>
          <strong>{player.life}</strong> life
        </span>
        <span>{player.poison} poison</span>
        <span>Tax {player.commander.tax}</span>
      </div>

      <div className="ods-player-field__commander">
        <span className="ods-commander-rune" aria-hidden="true">
          ✦
        </span>
        <div>
          <span>{player.commander.name}</span>
          <small>{player.commander.zone}</small>
        </div>
      </div>

      <div className="ods-player-field__indicators" aria-label="Player indicators">
        {player.triggerCount ? <span className="ods-status-pill">{player.triggerCount} triggers</span> : null}
        {player.pendingRestrictionCount ? (
          <span className="ods-status-pill ods-status-pill--warn">{player.pendingRestrictionCount} restrictions</span>
        ) : null}
        {combat.attackingCount ? <span className="ods-status-pill">{combat.attackingCount} attackers</span> : null}
        {combat.defendingCount ? <span className="ods-status-pill">{combat.defendingCount} lanes in</span> : null}
      </div>

      <ManaRow player={player} />

      <div className="ods-player-field__tokens" aria-label={`${player.name} grouped token clouds`}>
        {player.tokenClouds.map((cloud) => (
          <TokenCloudButton
            key={cloud.id}
            cloud={cloud}
            onSelect={(selectedCloud) => onSelectTokenCloud?.(selectedCloud, player.id)}
          />
        ))}
      </div>

      <div className="ods-player-field__groups">
        {player.groups.map((group) => (
          <CardGroupPanel
            key={group.id}
            group={group}
            compressed={shouldCompressGroups || Boolean(group.compressed && !focused)}
            onSelectCard={(card) => onSelectCard?.(card, player.id)}
          />
        ))}
      </div>
    </article>
  );
}

function CombatLaneOverlay({
  state,
  playerCount,
}: {
  state: BattlefieldState;
  playerCount: number;
}) {
  const attackers = state.combat?.attackers ?? [];
  if (!attackers.length) {
    return null;
  }

  const playerIndex = new Map(state.players.map((player, index) => [player.id, index]));
  const seats = seatLayouts[playerCount];

  return (
    <svg className="ods-combat-lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="ods-combat-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {attackers.map((lane, index) => {
        const from = seats[playerIndex.get(lane.attackerPlayerId) ?? 0]?.anchor;
        const to = seats[playerIndex.get(lane.defendingPlayerId) ?? 0]?.anchor;
        if (!from || !to) {
          return null;
        }
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const bow = index % 2 === 0 ? 8 : -8;

        return (
          <g key={lane.id} className="ods-combat-lane">
            <path
              d={`M ${from.x} ${from.y} Q ${midX + bow} ${midY - bow} ${to.x} ${to.y}`}
              markerEnd="url(#ods-combat-arrow)"
            />
            <text x={midX + bow / 2} y={midY - bow / 2}>
              {lane.groupedCount ? `${lane.groupedCount}× ` : ""}
              {lane.cardName}
              {lane.myriad ? " · Myriad" : ""}
              {lane.copied ? " · Copy" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StackRibbon({ state }: { state: BattlefieldState }) {
  if (!state.stack.length) {
    return <aside className="ods-stack-ribbon ods-stack-ribbon--empty">Stack clear</aside>;
  }

  return (
    <aside className="ods-stack-ribbon" aria-label="Current stack summary">
      <span>TOP</span>
      {state.stack.map((item) => (
        <strong key={item.id}>
          {item.groupedCount ? `${item.groupedCount}× ` : ""}
          {item.title}
        </strong>
      ))}
      <span>BOTTOM</span>
    </aside>
  );
}

export function BattlefieldLayoutSystem({
  state,
  mode,
  focusedPlayerId,
  onFocusPlayer,
  onSelectCard,
  onSelectTokenCloud,
  className = "",
}: BattlefieldLayoutProps) {
  const tableMode = getMode(state, mode);
  const playerCount = clampPlayerCount(state.players.length);
  const focusId = getFocusId(state, focusedPlayerId);
  const combatIds = new Set(
    (state.combat?.attackers ?? []).flatMap((lane) => [lane.attackerPlayerId, lane.defendingPlayerId]),
  );

  return (
    <section
      className={`ods-battlefield ${className}`.trim()}
      data-player-count={playerCount}
      data-mode={tableMode}
      data-testid="section-dynamic-battlefield"
    >
      <header className="ods-battlefield__header">
        <div>
          <p>Dynamic Commander Battlefield</p>
          <h2>{playerCount}-player spatial layout</h2>
        </div>
        <div className="ods-battlefield__mode" aria-label="Current table mode">
          {tableMode}
        </div>
      </header>

      <div className="ods-battlefield__shell">
        <BattlefieldOverviewMinimap
          players={state.players}
          playerCount={playerCount}
          activePlayerId={state.activePlayerId}
          priorityPlayerId={state.priorityPlayerId}
          focusedPlayerId={focusId}
          combatPlayerIds={combatIds}
          onFocusPlayer={onFocusPlayer}
        />

        <div className="ods-battlefield__arena">
          <div className="ods-table-core">
            <span>STACK</span>
            <strong>{state.stack.length}</strong>
            <small>Assistant observes, never blocks</small>
          </div>
          {tableMode === "combat" && <CombatLaneOverlay state={state} playerCount={playerCount} />}
          {state.players.slice(0, playerCount).map((player, index) => {
            const seat = getSeat(player, index, playerCount);
            const focused = player.id === focusId;
            const compressed =
              tableMode === "focus"
                ? !focused
                : tableMode === "combat"
                  ? !combatIds.has(player.id)
                  : tableMode === "minimal";

            return (
              <PlayerBattlefieldCard
                key={player.id}
                player={player}
                state={state}
                mode={tableMode}
                focused={focused}
                compressed={compressed}
                seatArea={seat.area}
                onFocusPlayer={onFocusPlayer}
                onSelectCard={onSelectCard}
                onSelectTokenCloud={onSelectTokenCloud}
              />
            );
          })}
        </div>

        <StackRibbon state={state} />
      </div>
    </section>
  );
}
