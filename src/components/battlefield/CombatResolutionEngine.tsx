import { useEffect, useMemo, useState, type PointerEvent } from "react";
import {
  assignBlocker,
  calculateCombatDamage,
  checkMissedCombatTriggers,
  createMyriadTokens,
  declareAttack,
  endCombat,
  getCreaturePower,
  getCreatureToughness,
  hasKeyword,
} from "./combatEngine";
import type {
  CombatAttack,
  CombatCreature,
  CombatResolutionEngineProps,
  CombatResolutionState,
  JudgeFlag,
} from "./combatTypes";

type DragLine = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  attackerId: string;
};

function severityLabel(flag: JudgeFlag) {
  if (flag.severity === "illegal") return "Illegal";
  if (flag.severity === "missed-trigger") return "Missed";
  if (flag.severity === "warning") return "Review";
  return "Info";
}

function creatureSummary(creature: CombatCreature) {
  const keywords = creature.keywords?.length ? creature.keywords.join(", ") : "No keywords";
  return `${creature.name} ${getCreaturePower(creature)}/${getCreatureToughness(creature)} · ${keywords}`;
}

function attackLabel(state: CombatResolutionState, attack: CombatAttack) {
  const attacker = state.creatures.find((creature) => creature.id === attack.attackerId);
  const defender = state.players.find((player) => player.id === attack.defendingPlayerId);
  return `${attacker?.name ?? attack.attackerId} → ${defender?.name ?? attack.defendingPlayerId}`;
}

export function CombatResolutionEngine({
  initialState,
  onChange,
  onCommitDamage,
  className = "",
}: CombatResolutionEngineProps) {
  const [state, setState] = useState(initialState);
  const [dragLine, setDragLine] = useState<DragLine | null>(null);
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);
  const [selectedBlockAttackId, setSelectedBlockAttackId] = useState<string | null>(null);

  useEffect(() => {
    onChange?.(state);
  }, [onChange, state]);

  const activeCreatures = useMemo(
    () => state.creatures.filter((creature) => creature.controllerId === state.activePlayerId),
    [state.activePlayerId, state.creatures],
  );

  const defendingCreatures = useMemo(
    () => state.creatures.filter((creature) => creature.controllerId !== state.activePlayerId),
    [state.activePlayerId, state.creatures],
  );

  const updateState = (updater: (current: CombatResolutionState) => CombatResolutionState) => {
    setState((current) => updater(current));
  };

  const handleAttack = (attackerId: string, defenderId: string) => {
    updateState((current) => {
      const declared = declareAttack(current, attackerId, defenderId);
      const attacker = declared.creatures.find((creature) => creature.id === attackerId);
      const attack = declared.attacks[declared.attacks.length - 1];
      return attacker && attack && hasKeyword(attacker, "Myriad") ? createMyriadTokens(declared, attack.id) : declared;
    });
    setSelectedAttackerId(null);
    setDragLine(null);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, attackerId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedAttackerId(attackerId);
    setDragLine({
      fromX: rect.left + rect.width / 2,
      fromY: rect.top + rect.height / 2,
      toX: event.clientX,
      toY: event.clientY,
      attackerId,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    setDragLine((line) => (line ? { ...line, toX: event.clientX, toY: event.clientY } : line));
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const attackerId = dragLine?.attackerId;
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const defender = target?.closest<HTMLElement>("[data-combat-defender-id]");
    if (attackerId && defender?.dataset.combatDefenderId) {
      handleAttack(attackerId, defender.dataset.combatDefenderId);
      return;
    }
    setDragLine(null);
  };

  const selectedBlockAttack = state.attacks.find((attack) => attack.id === selectedBlockAttackId);

  return (
    <section className={`ods-combat-engine ${className}`.trim()} data-step={state.step} data-testid="section-combat-engine">
      <header className="ods-combat-engine__header">
        <div>
          <p>Combat Resolution Engine</p>
          <h2>Commander combat assistant</h2>
        </div>
        <div className="ods-combat-engine__step">{state.step}</div>
      </header>

      {dragLine && (
        <svg className="ods-drag-arrow" aria-hidden="true">
          <defs>
            <marker id="ods-drag-arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <line x1={dragLine.fromX} y1={dragLine.fromY} x2={dragLine.toX} y2={dragLine.toY} markerEnd="url(#ods-drag-arrow-head)" />
        </svg>
      )}

      <div className="ods-combat-engine__grid">
        <section className="ods-combat-panel ods-combat-panel--attackers">
          <header>
            <span>Attackers</span>
            <strong>{activeCreatures.length}</strong>
          </header>
          <div className="ods-combat-creatures">
            {activeCreatures.map((creature) => (
              <button
                key={creature.id}
                type="button"
                className="ods-combat-creature"
                data-selected={selectedAttackerId === creature.id ? "true" : "false"}
                data-attacking={state.attacks.some((attack) => attack.attackerId === creature.id) ? "true" : "false"}
                onPointerDown={(event) => handlePointerDown(event, creature.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={() => setSelectedAttackerId(creature.id)}
                data-testid={`button-combat-attacker-${creature.id}`}
                title={creatureSummary(creature)}
              >
                <strong>{creature.name}</strong>
                <span>
                  {getCreaturePower(creature)}/{getCreatureToughness(creature)}
                  {creature.commander ? " · Commander" : ""}
                </span>
                <small>{creature.keywords?.join(" · ") || "No keywords"}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="ods-combat-panel ods-combat-panel--defenders">
          <header>
            <span>Defending players</span>
            <strong>{state.players.filter((player) => player.id !== state.activePlayerId).length}</strong>
          </header>
          <div className="ods-combat-defenders">
            {state.players
              .filter((player) => player.id !== state.activePlayerId)
              .map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="ods-combat-defender"
                  data-combat-defender-id={player.id}
                  onPointerUp={() => selectedAttackerId && handleAttack(selectedAttackerId, player.id)}
                  onClick={() => selectedAttackerId && handleAttack(selectedAttackerId, player.id)}
                  data-testid={`button-combat-defender-${player.id}`}
                >
                  <span>{player.name}</span>
                  <strong>{player.life}</strong>
                  <small>
                    Commander dmg:{" "}
                    {Object.values(player.commanderDamageTaken).reduce((total, amount) => total + amount, 0)}
                  </small>
                </button>
              ))}
          </div>
        </section>

        <section className="ods-combat-panel ods-combat-panel--attacks">
          <header>
            <span>Declared attacks</span>
            <strong>{state.attacks.length}</strong>
          </header>
          <div className="ods-combat-stack">
            {state.attacks.length ? (
              state.attacks.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  className="ods-combat-attack"
                  data-selected={selectedBlockAttackId === attack.id ? "true" : "false"}
                  data-myriad={attack.isMyriadToken ? "true" : "false"}
                  onClick={() => setSelectedBlockAttackId((current) => (current === attack.id ? null : attack.id))}
                  data-testid={`button-select-block-attack-${attack.id}`}
                >
                  <span>{attackLabel(state, attack)}</span>
                  {attack.isMyriadToken && <small>Temporary Myriad token, exile at EOC</small>}
                </button>
              ))
            ) : (
              <p className="ods-combat-empty">Drag an attacker to a player, or click attacker then defender.</p>
            )}
          </div>
        </section>

        <section className="ods-combat-panel ods-combat-panel--blockers">
          <header>
            <span>Blockers</span>
            <strong>{state.blocks.length}</strong>
          </header>
          {selectedBlockAttack ? (
            <p className="ods-combat-helper">Assigning blocks for {attackLabel(state, selectedBlockAttack)}</p>
          ) : (
            <p className="ods-combat-helper">Select a declared attack, then choose blocking creatures.</p>
          )}
          <div className="ods-combat-creatures ods-combat-creatures--blockers">
            {defendingCreatures.map((creature) => (
              <button
                key={creature.id}
                type="button"
                className="ods-combat-creature"
                data-blocking={state.blocks.some((block) => block.blockerId === creature.id) ? "true" : "false"}
                onClick={() => selectedBlockAttackId && updateState((current) => assignBlocker(current, selectedBlockAttack!.attackerId, creature.id))}
                data-testid={`button-combat-blocker-${creature.id}`}
                title={creatureSummary(creature)}
              >
                <strong>{creature.name}</strong>
                <span>
                  {getCreaturePower(creature)}/{getCreatureToughness(creature)}
                </span>
                <small>{creature.keywords?.join(" · ") || "No keywords"}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="ods-combat-panel ods-combat-panel--damage">
          <header>
            <span>Resolution</span>
            <strong>{state.damageAssignments.length}</strong>
          </header>
          <div className="ods-combat-actions">
            <button type="button" onClick={() => updateState(checkMissedCombatTriggers)} data-testid="button-check-combat-triggers">
              Check triggers
            </button>
            <button type="button" onClick={() => updateState(calculateCombatDamage)} data-testid="button-calculate-combat-damage">
              Calculate damage
            </button>
            <button
              type="button"
              onClick={() => {
                onCommitDamage?.(state);
                updateState(endCombat);
              }}
              data-testid="button-end-combat"
            >
              End combat
            </button>
          </div>
          <div className="ods-damage-list">
            {state.damageAssignments.length ? (
              state.damageAssignments.map((assignment) => (
                <article key={assignment.id} className="ods-damage-item">
                  <strong>{assignment.amount}</strong>
                  <span>
                    {assignment.sourceName} → {assignment.targetName}
                  </span>
                  <small>
                    {assignment.lethal ? "lethal " : ""}
                    {assignment.trampleOverflow ? "trample overflow " : ""}
                    {assignment.commanderDamage ? "commander damage" : assignment.targetType}
                  </small>
                </article>
              ))
            ) : (
              <p className="ods-combat-empty">Damage assignments appear here after calculation.</p>
            )}
          </div>
        </section>

        <aside className="ods-combat-panel ods-combat-panel--judge">
          <header>
            <span>Assistant judge</span>
            <strong>{state.flags.length}</strong>
          </header>
          <div className="ods-judge-flags">
            {state.flags.length ? (
              state.flags.map((flag) => (
                <article key={flag.id} className="ods-judge-flag" data-severity={flag.severity}>
                  <span>{severityLabel(flag)}</span>
                  <strong>{flag.title}</strong>
                  <p>{flag.detail}</p>
                </article>
              ))
            ) : (
              <p className="ods-combat-empty">No flags yet. The assistant logs issues but never blocks actions.</p>
            )}
          </div>
        </aside>

        <aside className="ods-combat-panel ods-combat-panel--log">
          <header>
            <span>Combat log</span>
            <strong>{state.actionLog.length}</strong>
          </header>
          <ol className="ods-combat-log">
            {state.actionLog.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
