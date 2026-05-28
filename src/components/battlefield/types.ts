export type BattlefieldMode = "overview" | "focus" | "combat" | "stack" | "judge" | "minimal";

export type ManaColor = "w" | "u" | "b" | "r" | "g" | "c";

export type CardGroupKind =
  | "lands"
  | "creatures"
  | "artifacts"
  | "enchantments"
  | "planeswalkers"
  | "tokens"
  | "graveyard"
  | "exile";

export interface TokenCloud {
  id: string;
  name: string;
  count: number;
  power?: string;
  toughness?: string;
  tapped?: number;
  summoningSick?: number;
  counters?: Record<string, number>;
}

export interface PermanentCard {
  id: string;
  name: string;
  typeLine?: string;
  manaCost?: string;
  power?: string;
  toughness?: string;
  basePower?: number;
  baseToughness?: number;
  tapped?: boolean;
  summoningSick?: boolean;
  commander?: boolean;
  controllerId?: string;
  ownerId?: string;
  keywords?: string[];
  counters?: Record<string, number>;
  attachedCount?: number;
  triggerCount?: number;
  restrictionActive?: boolean;
  damageMarked?: number;
}

export interface CardGroup {
  id: string;
  kind: CardGroupKind;
  label: string;
  cards: PermanentCard[];
  compressed?: boolean;
}

export interface CommanderInfo {
  name: string;
  zone: "command" | "battlefield" | "library" | "hand" | "graveyard" | "exile";
  tax: number;
  damageDealt: Record<string, number>;
}

export interface PlayerBattlefield {
  id: string;
  seat: number;
  name: string;
  isYou?: boolean;
  isActive?: boolean;
  hasPriority?: boolean;
  eliminated?: boolean;
  life: number;
  poison: number;
  commander: CommanderInfo;
  commanderDamageTaken: Record<string, number>;
  triggerCount: number;
  pendingRestrictionCount: number;
  manaOpen?: Partial<Record<ManaColor, number>>;
  groups: CardGroup[];
  tokenClouds: TokenCloud[];
}

export interface CombatAttacker {
  id: string;
  attackerPlayerId: string;
  defendingPlayerId: string;
  cardName: string;
  groupedCount?: number;
  myriad?: boolean;
  copied?: boolean;
}

export interface StackObjectSummary {
  id: string;
  controllerId: string;
  title: string;
  kind: "spell" | "ability" | "trigger" | "copy";
  groupedCount?: number;
}

export interface BattlefieldState {
  players: PlayerBattlefield[];
  activePlayerId: string;
  priorityPlayerId: string;
  mode: BattlefieldMode;
  focusedPlayerId?: string;
  combat?: {
    attackers: CombatAttacker[];
  };
  stack: StackObjectSummary[];
}

export interface BattlefieldLayoutProps {
  state: BattlefieldState;
  mode?: BattlefieldMode;
  focusedPlayerId?: string;
  onFocusPlayer?: (playerId: string) => void;
  onSelectCard?: (card: PermanentCard, playerId: string) => void;
  onSelectTokenCloud?: (cloud: TokenCloud, playerId: string) => void;
  className?: string;
}
