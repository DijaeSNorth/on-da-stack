import type { JudgeFlag } from "./combatTypes";
import type { StackObjectSummary } from "./types";

export type ReplayZoneName = "library" | "hand" | "battlefield" | "graveyard" | "exile" | "command" | "stack";

export type ReplayActionType =
  | "match_start"
  | "set_turn_stage"
  | "move_card"
  | "tap_card"
  | "life_change"
  | "commander_damage"
  | "stack_push"
  | "stack_pop"
  | "create_token"
  | "remove_card"
  | "judge_flag"
  | "annotation";

export interface ReplayCard {
  id: string;
  name: string;
  ownerId: string;
  controllerId: string;
  zone: ReplayZoneName;
  tapped?: boolean;
  token?: boolean;
  commander?: boolean;
  power?: string;
  toughness?: string;
  counters?: Record<string, number>;
}

export interface ReplayPlayerState {
  id: string;
  name: string;
  life: number;
  poison: number;
  commanderDamageTaken: Record<string, number>;
  zones: Record<ReplayZoneName, string[]>;
}

export interface ReplayBoardSnapshot {
  id: string;
  actionIndex: number;
  turn: number;
  stage: string;
  activePlayerId: string;
  priorityPlayerId?: string;
  players: ReplayPlayerState[];
  cards: Record<string, ReplayCard>;
  stack: StackObjectSummary[];
  flags: JudgeFlag[];
  annotations: string[];
}

export interface ReplayBaseAction {
  id: string;
  type: ReplayActionType;
  turn: number;
  stage: string;
  playerId?: string;
  label: string;
  timestamp?: string;
}

export type ReplayAction =
  | (ReplayBaseAction & {
      type: "match_start";
      players: ReplayPlayerState[];
      cards: ReplayCard[];
      activePlayerId: string;
      priorityPlayerId?: string;
    })
  | (ReplayBaseAction & {
      type: "set_turn_stage";
      activePlayerId: string;
      priorityPlayerId?: string;
    })
  | (ReplayBaseAction & {
      type: "move_card";
      cardId: string;
      toZone: ReplayZoneName;
      controllerId?: string;
      tapped?: boolean;
    })
  | (ReplayBaseAction & {
      type: "tap_card";
      cardId: string;
      tapped: boolean;
    })
  | (ReplayBaseAction & {
      type: "life_change";
      targetPlayerId: string;
      delta: number;
      reason?: string;
    })
  | (ReplayBaseAction & {
      type: "commander_damage";
      targetPlayerId: string;
      commanderSourceId: string;
      amount: number;
    })
  | (ReplayBaseAction & {
      type: "stack_push";
      object: StackObjectSummary;
    })
  | (ReplayBaseAction & {
      type: "stack_pop";
      stackObjectId?: string;
    })
  | (ReplayBaseAction & {
      type: "create_token";
      card: ReplayCard;
      zone?: ReplayZoneName;
    })
  | (ReplayBaseAction & {
      type: "remove_card";
      cardId: string;
    })
  | (ReplayBaseAction & {
      type: "judge_flag";
      flag: JudgeFlag;
    })
  | (ReplayBaseAction & {
      type: "annotation";
      note: string;
    });

export interface ReplayFile {
  version: string;
  exportedAt: string;
  matchName: string;
  actions: ReplayAction[];
}

export interface ReplayScrubberProps {
  actions: ReplayAction[];
  matchName?: string;
  initialIndex?: number;
  onSnapshotChange?: (snapshot: ReplayBoardSnapshot) => void;
  className?: string;
}
