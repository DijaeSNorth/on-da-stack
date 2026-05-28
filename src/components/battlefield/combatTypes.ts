import type { PermanentCard, PlayerBattlefield } from "./types";

export type CombatStep = "declareAttackers" | "declareBlockers" | "combatDamage" | "endOfCombat";

export type JudgeFlagSeverity = "info" | "warning" | "illegal" | "missed-trigger";

export interface JudgeFlag {
  id: string;
  severity: JudgeFlagSeverity;
  title: string;
  detail: string;
  relatedCardId?: string;
  relatedPlayerId?: string;
}

export interface CombatCreature extends PermanentCard {
  controllerId: string;
  power: string;
  toughness: string;
  basePower: number;
  baseToughness: number;
  typeLine: string;
  keywords?: string[];
}

export interface CombatPlayer extends Pick<PlayerBattlefield, "id" | "name" | "life" | "eliminated"> {
  commanderDamageTaken: Record<string, number>;
}

export interface CombatAttack {
  id: string;
  attackerId: string;
  attackerControllerId: string;
  defendingPlayerId: string;
  isMyriadToken?: boolean;
  sourceAttackerId?: string;
  createdThisCombat?: boolean;
  assignedDamageToPlayer?: number;
}

export interface CombatBlock {
  id: string;
  attackerId: string;
  blockerId: string;
  blockerControllerId: string;
  order: number;
}

export interface DamageAssignment {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  targetType: "player" | "creature";
  amount: number;
  lethal?: boolean;
  trampleOverflow?: boolean;
  commanderDamage?: boolean;
}

export interface CombatResolutionState {
  step: CombatStep;
  activePlayerId: string;
  players: CombatPlayer[];
  creatures: CombatCreature[];
  attacks: CombatAttack[];
  blocks: CombatBlock[];
  damageAssignments: DamageAssignment[];
  flags: JudgeFlag[];
  actionLog: string[];
}

export interface CombatResolutionEngineProps {
  initialState: CombatResolutionState;
  onChange?: (state: CombatResolutionState) => void;
  onCommitDamage?: (state: CombatResolutionState) => void;
  className?: string;
}
