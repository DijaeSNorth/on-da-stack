import type {
  ReplayAction,
  ReplayBoardSnapshot,
  ReplayCard,
  ReplayFile,
  ReplayPlayerState,
  ReplayZoneName,
} from "./replayTypes";

const zones: ReplayZoneName[] = ["library", "hand", "battlefield", "graveyard", "exile", "command", "stack"];

function clonePlayer(player: ReplayPlayerState): ReplayPlayerState {
  return {
    ...player,
    commanderDamageTaken: { ...player.commanderDamageTaken },
    zones: Object.fromEntries(zones.map((zone) => [zone, [...(player.zones[zone] ?? [])]])) as Record<ReplayZoneName, string[]>,
  };
}

function cloneSnapshot(snapshot: ReplayBoardSnapshot): ReplayBoardSnapshot {
  return {
    ...snapshot,
    players: snapshot.players.map(clonePlayer),
    cards: Object.fromEntries(Object.entries(snapshot.cards).map(([id, card]) => [id, { ...card, counters: { ...(card.counters ?? {}) } }])),
    stack: snapshot.stack.map((item) => ({ ...item })),
    flags: snapshot.flags.map((flag) => ({ ...flag })),
    annotations: [...snapshot.annotations],
  };
}

function emptyZones(): Record<ReplayZoneName, string[]> {
  return {
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command: [],
    stack: [],
  };
}

function addToZone(players: ReplayPlayerState[], card: ReplayCard) {
  const player = players.find((item) => item.id === card.controllerId || item.id === card.ownerId);
  if (!player) return;
  const zoneCards = player.zones[card.zone] ?? [];
  if (!zoneCards.includes(card.id)) {
    zoneCards.push(card.id);
  }
}

function removeFromZones(players: ReplayPlayerState[], cardId: string) {
  players.forEach((player) => {
    zones.forEach((zone) => {
      player.zones[zone] = (player.zones[zone] ?? []).filter((id) => id !== cardId);
    });
  });
}

function normalizePlayer(player: ReplayPlayerState): ReplayPlayerState {
  return {
    ...player,
    zones: {
      ...emptyZones(),
      ...player.zones,
    },
    commanderDamageTaken: { ...player.commanderDamageTaken },
  };
}

function initialSnapshot(): ReplayBoardSnapshot {
  return {
    id: "snapshot-empty",
    actionIndex: -1,
    turn: 0,
    stage: "Pregame",
    activePlayerId: "",
    priorityPlayerId: undefined,
    players: [],
    cards: {},
    stack: [],
    flags: [],
    annotations: [],
  };
}

export function applyReplayAction(snapshot: ReplayBoardSnapshot, action: ReplayAction, actionIndex: number): ReplayBoardSnapshot {
  const next = cloneSnapshot(snapshot);
  next.id = `snapshot-${actionIndex}`;
  next.actionIndex = actionIndex;
  next.turn = action.turn;
  next.stage = action.stage;

  switch (action.type) {
    case "match_start": {
      const players = action.players.map(normalizePlayer);
      const cards: Record<string, ReplayCard> = {};
      action.cards.forEach((card) => {
        cards[card.id] = { ...card, counters: { ...(card.counters ?? {}) } };
        addToZone(players, cards[card.id]);
      });
      return {
        ...next,
        activePlayerId: action.activePlayerId,
        priorityPlayerId: action.priorityPlayerId,
        players,
        cards,
        stack: [],
        flags: [],
        annotations: [],
      };
    }
    case "set_turn_stage": {
      next.activePlayerId = action.activePlayerId;
      next.priorityPlayerId = action.priorityPlayerId;
      break;
    }
    case "move_card": {
      const card = next.cards[action.cardId];
      if (card) {
        removeFromZones(next.players, card.id);
        card.zone = action.toZone;
        card.controllerId = action.controllerId ?? card.controllerId;
        if (typeof action.tapped === "boolean") {
          card.tapped = action.tapped;
        }
        addToZone(next.players, card);
      }
      break;
    }
    case "tap_card": {
      const card = next.cards[action.cardId];
      if (card) {
        card.tapped = action.tapped;
      }
      break;
    }
    case "life_change": {
      const player = next.players.find((item) => item.id === action.targetPlayerId);
      if (player) {
        player.life += action.delta;
      }
      break;
    }
    case "commander_damage": {
      const player = next.players.find((item) => item.id === action.targetPlayerId);
      if (player) {
        player.commanderDamageTaken[action.commanderSourceId] =
          (player.commanderDamageTaken[action.commanderSourceId] ?? 0) + action.amount;
      }
      break;
    }
    case "stack_push": {
      next.stack = [action.object, ...next.stack];
      break;
    }
    case "stack_pop": {
      next.stack = action.stackObjectId
        ? next.stack.filter((item) => item.id !== action.stackObjectId)
        : next.stack.slice(1);
      break;
    }
    case "create_token": {
      const card = { ...action.card, zone: action.zone ?? action.card.zone, token: true };
      next.cards[card.id] = card;
      addToZone(next.players, card);
      break;
    }
    case "remove_card": {
      removeFromZones(next.players, action.cardId);
      delete next.cards[action.cardId];
      break;
    }
    case "judge_flag": {
      next.flags = [action.flag, ...next.flags];
      break;
    }
    case "annotation": {
      next.annotations = [action.note, ...next.annotations];
      break;
    }
  }

  return next;
}

export function buildReplaySnapshots(actions: ReplayAction[]): ReplayBoardSnapshot[] {
  const snapshots: ReplayBoardSnapshot[] = [];
  let current = initialSnapshot();
  actions.forEach((action, index) => {
    current = applyReplayAction(current, action, index);
    snapshots.push(current);
  });
  return snapshots;
}

export function buildReplaySnapshotAt(actions: ReplayAction[], actionIndex: number): ReplayBoardSnapshot {
  if (!actions.length || actionIndex < 0) {
    return initialSnapshot();
  }
  return actions.slice(0, actionIndex + 1).reduce(
    (snapshot, action, index) => applyReplayAction(snapshot, action, index),
    initialSnapshot(),
  );
}

export function makeReplayFile(actions: ReplayAction[], matchName = "On Da Stack Replay"): ReplayFile {
  return {
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    matchName,
    actions,
  };
}

function basePlayer(id: string, name: string): ReplayPlayerState {
  return {
    id,
    name,
    life: 40,
    poison: 0,
    commanderDamageTaken: {},
    zones: emptyZones(),
  };
}

export function makeSampleReplayActions(): ReplayAction[] {
  const players = [basePlayer("p1", "Alex"), basePlayer("p2", "Brian"), basePlayer("p3", "Chloe"), basePlayer("p4", "Daniel")];
  const cards: ReplayCard[] = [
    { id: "c-tymna", name: "Tymna the Weaver", ownerId: "p1", controllerId: "p1", zone: "command", commander: true, power: "2", toughness: "2" },
    { id: "c-sol-ring", name: "Sol Ring", ownerId: "p1", controllerId: "p1", zone: "hand" },
    { id: "c-command-tower", name: "Command Tower", ownerId: "p1", controllerId: "p1", zone: "hand" },
    { id: "c-counterspell", name: "Counterspell", ownerId: "p2", controllerId: "p2", zone: "hand" },
    { id: "c-rhystic", name: "Rhystic Study", ownerId: "p3", controllerId: "p3", zone: "battlefield" },
    { id: "c-prosper", name: "Prosper, Tome-Bound", ownerId: "p4", controllerId: "p4", zone: "command", commander: true, power: "1", toughness: "4" },
  ];

  return [
    {
      id: "a-0",
      type: "match_start",
      turn: 0,
      stage: "Pregame",
      label: "Match started",
      players,
      cards,
      activePlayerId: "p1",
      priorityPlayerId: "p1",
    },
    {
      id: "a-1",
      type: "set_turn_stage",
      turn: 1,
      stage: "Main Phase 1",
      label: "Alex moves to Main Phase 1",
      activePlayerId: "p1",
      priorityPlayerId: "p1",
    },
    {
      id: "a-2",
      type: "move_card",
      turn: 1,
      stage: "Main Phase 1",
      playerId: "p1",
      label: "Alex plays Command Tower",
      cardId: "c-command-tower",
      toZone: "battlefield",
    },
    {
      id: "a-3",
      type: "move_card",
      turn: 1,
      stage: "Main Phase 1",
      playerId: "p1",
      label: "Alex casts Sol Ring",
      cardId: "c-sol-ring",
      toZone: "battlefield",
    },
    {
      id: "a-4",
      type: "judge_flag",
      turn: 1,
      stage: "Main Phase 1",
      playerId: "p3",
      label: "Assistant notes Rhystic Study trigger",
      flag: {
        id: "flag-rhystic-1",
        severity: "missed-trigger",
        title: "Possible missed trigger",
        detail: "Rhystic Study may have triggered when Sol Ring was cast. Confirm whether Alex paid 1.",
        relatedCardId: "c-rhystic",
        relatedPlayerId: "p3",
      },
    },
    {
      id: "a-5",
      type: "stack_push",
      turn: 2,
      stage: "Main Phase 1",
      playerId: "p2",
      label: "Brian casts Counterspell",
      object: { id: "stack-counterspell", controllerId: "p2", title: "Counterspell targeting Tymna", kind: "spell" },
    },
    {
      id: "a-6",
      type: "stack_pop",
      turn: 2,
      stage: "Main Phase 1",
      playerId: "p2",
      label: "Counterspell resolves",
      stackObjectId: "stack-counterspell",
    },
    {
      id: "a-7",
      type: "set_turn_stage",
      turn: 3,
      stage: "Declare Attackers",
      label: "Daniel moves to attacks",
      activePlayerId: "p4",
      priorityPlayerId: "p4",
    },
    {
      id: "a-8",
      type: "move_card",
      turn: 3,
      stage: "Declare Attackers",
      playerId: "p4",
      label: "Prosper attacks Alex",
      cardId: "c-prosper",
      toZone: "battlefield",
      tapped: true,
    },
    {
      id: "a-9",
      type: "life_change",
      turn: 3,
      stage: "Combat Damage",
      playerId: "p4",
      label: "Prosper deals 1 combat damage to Alex",
      targetPlayerId: "p1",
      delta: -1,
      reason: "combat damage",
    },
    {
      id: "a-10",
      type: "commander_damage",
      turn: 3,
      stage: "Combat Damage",
      playerId: "p4",
      label: "Track Prosper commander damage to Alex",
      targetPlayerId: "p1",
      commanderSourceId: "c-prosper",
      amount: 1,
    },
    {
      id: "a-11",
      type: "annotation",
      turn: 3,
      stage: "End of Combat",
      label: "Judge annotation added",
      note: "Review whether Prosper's attack trigger was acknowledged before damage.",
    },
  ];
}
