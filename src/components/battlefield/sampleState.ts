import type { BattlefieldState, PlayerBattlefield } from "./types";

const names = ["Alex", "Brian", "Chloe", "Daniel", "Ethan", "Farah"];
const commanders = ["Tymna the Weaver", "Muldrotha", "Alela", "Prosper", "Krenko", "Atraxa"];

function makePlayer(index: number, count: number): PlayerBattlefield {
  const id = `p${index + 1}`;
  const isYou = index === 0;
  return {
    id,
    seat: index + 1,
    name: `${names[index]}${isYou ? " (You)" : ""}`,
    isYou,
    isActive: index === 0,
    hasPriority: index === 0,
    life: [34, 28, 41, 19, 17, 37][index] ?? 40,
    poison: [0, 0, 1, 0, 3, 0][index] ?? 0,
    triggerCount: [2, 0, 3, 1, 4, 0][index] ?? 0,
    pendingRestrictionCount: [0, 1, 0, 0, 2, 0][index] ?? 0,
    manaOpen: { u: index % 2 ? 0 : 2, g: index % 3 ? 1 : 0, r: index === 4 ? 3 : 0 },
    commander: {
      name: commanders[index],
      zone: index === 0 || index === 3 ? "battlefield" : "command",
      tax: index === 1 ? 2 : 0,
      damageDealt: {},
    },
    commanderDamageTaken: {
      p1: index === 3 ? 7 : 0,
      p3: index === 0 ? 8 : 0,
    },
    tokenClouds: [
      { id: `${id}-treasure`, name: "Treasure", count: index === 0 ? 18 : 2 + index },
      { id: `${id}-spirit`, name: "Spirit", count: index === 0 ? 4 : index, power: "1", toughness: "1" },
      ...(index === 2 ? [{ id: `${id}-clue`, name: "Clue", count: 6 }] : []),
    ],
    groups: [
      {
        id: `${id}-lands`,
        kind: "lands",
        label: "Lands",
        compressed: count > 4 && index !== 0,
        cards: Array.from({ length: 5 + (index % 3) }, (_, landIndex) => ({
          id: `${id}-land-${landIndex}`,
          name: ["Island", "Command Tower", "Blood Crypt", "Forest", "Swamp", "Plains"][landIndex % 6],
          tapped: landIndex % 3 === 0,
        })),
      },
      {
        id: `${id}-creatures`,
        kind: "creatures",
        label: "Creatures",
        compressed: count > 3 && index !== 0,
        cards: [
          {
            id: `${id}-commander`,
            name: commanders[index],
            commander: true,
            power: index === 4 ? "3" : "2",
            toughness: index === 4 ? "3" : "2",
            tapped: index === 3,
            triggerCount: index === 0 ? 2 : 0,
          },
          {
            id: `${id}-creature-1`,
            name: ["Dockside Extortionist", "Eternal Witness", "Baleful Strix", "Esper Sentinel", "Goblin Guide", "Birds of Paradise"][index],
            power: index === 0 ? "1" : "2",
            toughness: index === 0 ? "2" : "1",
            triggerCount: index === 0 ? 1 : 0,
          },
        ],
      },
      {
        id: `${id}-engine`,
        kind: "enchantments",
        label: "Engines",
        compressed: index !== 0,
        cards: [
          {
            id: `${id}-engine-1`,
            name: ["Rhystic Study", "Smothering Tithe", "Phyrexian Arena", "Impact Tremors", "Skullclamp", "Doubling Season"][index],
            triggerCount: index < 2 ? 1 : 0,
            restrictionActive: index === 1,
          },
        ],
      },
    ],
  };
}

export function makeSampleBattlefield(playerCount = 4): BattlefieldState {
  const players = Array.from({ length: Math.min(6, Math.max(2, playerCount)) }, (_, index) =>
    makePlayer(index, playerCount),
  );

  return {
    players,
    activePlayerId: "p1",
    priorityPlayerId: "p1",
    focusedPlayerId: "p1",
    mode: "overview",
    combat: {
      attackers: [
        {
          id: "atk-1",
          attackerPlayerId: "p1",
          defendingPlayerId: players[Math.min(3, players.length - 1)].id,
          cardName: "Dockside Extortionist",
        },
        {
          id: "atk-2",
          attackerPlayerId: "p1",
          defendingPlayerId: players[Math.min(3, players.length - 1)].id,
          cardName: "Spirit",
          groupedCount: 4,
          myriad: true,
        },
      ],
    },
    stack: [
      { id: "stack-1", controllerId: "p1", title: "Cyclonic Rift", kind: "spell" },
      { id: "stack-2", controllerId: "p2", title: "Swan Song", kind: "spell" },
      { id: "stack-3", controllerId: "p3", title: "Smothering Tithe Trigger", kind: "trigger", groupedCount: 3 },
    ],
  };
}
