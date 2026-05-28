import type {
  CombatAttack,
  CombatBlock,
  CombatCreature,
  CombatPlayer,
  CombatResolutionState,
  DamageAssignment,
  JudgeFlag,
} from "./combatTypes";

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function hasKeyword(creature: CombatCreature | undefined, keyword: string) {
  return Boolean(creature?.keywords?.some((item) => item.toLowerCase() === keyword.toLowerCase()));
}

export function parseStat(value: string | number | undefined, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getCreaturePower(creature: CombatCreature) {
  return creature.basePower ?? parseStat(creature.power);
}

export function getCreatureToughness(creature: CombatCreature) {
  return creature.baseToughness ?? parseStat(creature.toughness, 1);
}

function findCreature(state: CombatResolutionState, creatureId: string) {
  return state.creatures.find((creature) => creature.id === creatureId);
}

function findPlayer(state: CombatResolutionState, playerId: string) {
  return state.players.find((player) => player.id === playerId);
}

export function validateAttack(
  state: CombatResolutionState,
  attackerId: string,
  defendingPlayerId: string,
): JudgeFlag[] {
  const attacker = findCreature(state, attackerId);
  const defender = findPlayer(state, defendingPlayerId);
  const flags: JudgeFlag[] = [];

  if (!attacker) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Attacker not found",
      detail: "The selected attacking creature could not be found in the combat cache.",
      relatedCardId: attackerId,
    });
    return flags;
  }

  if (!defender) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Defender not found",
      detail: "The chosen defending player does not exist in this combat state.",
      relatedCardId: attackerId,
      relatedPlayerId: defendingPlayerId,
    });
  }

  if (attacker.controllerId === defendingPlayerId) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Creature attacking its controller",
      detail: `${attacker.name} is assigned to attack its own controller.`,
      relatedCardId: attacker.id,
      relatedPlayerId: defendingPlayerId,
    });
  }

  if (!/creature/i.test(attacker.typeLine)) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Noncreature declared as attacker",
      detail: `${attacker.name} is not currently typed as a creature.`,
      relatedCardId: attacker.id,
    });
  }

  if (attacker.tapped && !hasKeyword(attacker, "Vigilance")) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Tapped attacker",
      detail: `${attacker.name} is tapped and does not have vigilance.`,
      relatedCardId: attacker.id,
    });
  }

  if (attacker.summoningSick && !hasKeyword(attacker, "Haste")) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Summoning sickness",
      detail: `${attacker.name} appears to be affected by summoning sickness and does not have haste.`,
      relatedCardId: attacker.id,
    });
  }

  if (defender?.eliminated) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Defender already eliminated",
      detail: `${defender.name} is marked as eliminated.`,
      relatedPlayerId: defender.id,
    });
  }

  if (state.attacks.some((attack) => attack.attackerId === attackerId)) {
    flags.push({
      id: makeId("flag"),
      severity: "warning",
      title: "Duplicate attack declaration",
      detail: `${attacker.name} is already declared as an attacker. The action is logged but should be reviewed.`,
      relatedCardId: attacker.id,
    });
  }

  if (hasKeyword(attacker, "Myriad")) {
    flags.push({
      id: makeId("flag"),
      severity: "info",
      title: "Myriad trigger expected",
      detail: `${attacker.name} has Myriad. Create token copies attacking each other opponent, then exile those tokens at end of combat.`,
      relatedCardId: attacker.id,
    });
  }

  return flags;
}

export function declareAttack(
  state: CombatResolutionState,
  attackerId: string,
  defendingPlayerId: string,
): CombatResolutionState {
  const attacker = findCreature(state, attackerId);
  const flags = validateAttack(state, attackerId, defendingPlayerId);
  const attack: CombatAttack = {
    id: makeId("attack"),
    attackerId,
    attackerControllerId: attacker?.controllerId ?? state.activePlayerId,
    defendingPlayerId,
  };

  return {
    ...state,
    step: "declareAttackers",
    attacks: [...state.attacks, attack],
    flags: [...state.flags, ...flags],
    actionLog: [
      `${attacker?.name ?? attackerId} declared attacking ${findPlayer(state, defendingPlayerId)?.name ?? defendingPlayerId}.`,
      ...state.actionLog,
    ],
  };
}

export function createMyriadTokens(state: CombatResolutionState, sourceAttackId: string): CombatResolutionState {
  const sourceAttack = state.attacks.find((attack) => attack.id === sourceAttackId);
  const sourceCreature = sourceAttack ? findCreature(state, sourceAttack.attackerId) : undefined;

  if (!sourceAttack || !sourceCreature || !hasKeyword(sourceCreature, "Myriad")) {
    return state;
  }

  const defendingPlayerIds = state.players
    .filter(
      (player) =>
        player.id !== sourceCreature.controllerId &&
        player.id !== sourceAttack.defendingPlayerId &&
        !player.eliminated,
    )
    .map((player) => player.id);

  const tokenCreatures: CombatCreature[] = defendingPlayerIds.map((playerId) => ({
    ...sourceCreature,
    id: makeId(`${sourceCreature.id}-myriad`),
    name: `${sourceCreature.name} Myriad Copy`,
    commander: false,
    tapped: true,
    summoningSick: false,
  }));

  const tokenAttacks: CombatAttack[] = tokenCreatures.map((token, index) => ({
    id: makeId("myriad-attack"),
    attackerId: token.id,
    attackerControllerId: sourceCreature.controllerId,
    defendingPlayerId: defendingPlayerIds[index],
    isMyriadToken: true,
    sourceAttackerId: sourceCreature.id,
    createdThisCombat: true,
  }));

  return {
    ...state,
    creatures: [...state.creatures, ...tokenCreatures],
    attacks: [...state.attacks, ...tokenAttacks],
    flags: [
      ...state.flags,
      {
        id: makeId("flag"),
        severity: "info",
        title: "Myriad tokens created",
        detail: `${tokenCreatures.length} Myriad token ${tokenCreatures.length === 1 ? "copy was" : "copies were"} created and attacking other opponents.`,
        relatedCardId: sourceCreature.id,
      },
    ],
    actionLog: [`Created ${tokenCreatures.length} Myriad token attacks for ${sourceCreature.name}.`, ...state.actionLog],
  };
}

export function assignBlocker(
  state: CombatResolutionState,
  attackerId: string,
  blockerId: string,
): CombatResolutionState {
  const attacker = findCreature(state, attackerId);
  const blocker = findCreature(state, blockerId);
  const existingBlocks = state.blocks.filter((block) => block.attackerId === attackerId);
  const flags: JudgeFlag[] = [];

  if (!attacker || !state.attacks.some((attack) => attack.attackerId === attackerId)) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Blocking unassigned attacker",
      detail: "A blocker was assigned to a creature that is not currently attacking.",
      relatedCardId: attackerId,
    });
  }

  if (!blocker) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Blocker not found",
      detail: "The selected blocking creature could not be found in the combat cache.",
      relatedCardId: blockerId,
    });
  } else if (blocker.tapped && !hasKeyword(blocker, "Can block while tapped")) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Tapped blocker",
      detail: `${blocker.name} is tapped and normally cannot block.`,
      relatedCardId: blocker.id,
    });
  }

  if (blocker && attacker && blocker.controllerId === attacker.controllerId) {
    flags.push({
      id: makeId("flag"),
      severity: "illegal",
      title: "Same controller block",
      detail: `${blocker.name} is controlled by the attacking player. Review multiplayer control effects if intentional.`,
      relatedCardId: blocker.id,
    });
  }

  return {
    ...state,
    step: "declareBlockers",
    blocks: [
      ...state.blocks,
      {
        id: makeId("block"),
        attackerId,
        blockerId,
        blockerControllerId: blocker?.controllerId ?? "unknown",
        order: existingBlocks.length,
      },
    ],
    flags: [...state.flags, ...flags],
    actionLog: [
      `${blocker?.name ?? blockerId} assigned to block ${attacker?.name ?? attackerId}.`,
      ...state.actionLog,
    ],
  };
}

function assignDamageForAttack(state: CombatResolutionState, attack: CombatAttack): DamageAssignment[] {
  const attacker = findCreature(state, attack.attackerId);
  const defender = findPlayer(state, attack.defendingPlayerId);
  if (!attacker || !defender) {
    return [];
  }

  const power = Math.max(0, getCreaturePower(attacker));
  const blocks = state.blocks
    .filter((block) => block.attackerId === attack.attackerId)
    .sort((a, b) => a.order - b.order);
  const blockers = blocks.map((block) => findCreature(state, block.blockerId)).filter(Boolean) as CombatCreature[];
  const assignments: DamageAssignment[] = [];

  if (!blockers.length) {
    assignments.push({
      id: makeId("damage"),
      sourceId: attacker.id,
      sourceName: attacker.name,
      targetId: defender.id,
      targetName: defender.name,
      targetType: "player",
      amount: power,
      commanderDamage: Boolean(attacker.commander && !attack.isMyriadToken),
    });
    return assignments;
  }

  let remaining = power;
  blockers.forEach((blocker, index) => {
    if (remaining <= 0) {
      return;
    }
    const lethalDamage = hasKeyword(attacker, "Deathtouch")
      ? 1
      : Math.max(1, getCreatureToughness(blocker) - (blocker.damageMarked ?? 0));
    const isLastBlocker = index === blockers.length - 1;
    const assigned = hasKeyword(attacker, "Trample") && isLastBlocker ? Math.min(remaining, lethalDamage) : Math.min(remaining, lethalDamage);
    assignments.push({
      id: makeId("damage"),
      sourceId: attacker.id,
      sourceName: attacker.name,
      targetId: blocker.id,
      targetName: blocker.name,
      targetType: "creature",
      amount: assigned,
      lethal: assigned >= lethalDamage,
    });
    remaining -= assigned;
  });

  if (hasKeyword(attacker, "Trample") && remaining > 0) {
    assignments.push({
      id: makeId("damage"),
      sourceId: attacker.id,
      sourceName: attacker.name,
      targetId: defender.id,
      targetName: defender.name,
      targetType: "player",
      amount: remaining,
      trampleOverflow: true,
      commanderDamage: Boolean(attacker.commander && !attack.isMyriadToken),
    });
  }

  return assignments;
}

export function calculateCombatDamage(state: CombatResolutionState): CombatResolutionState {
  const assignments = state.attacks.flatMap((attack) => assignDamageForAttack(state, attack));
  const updatedPlayers = state.players.map((player) => {
    const playerDamage = assignments
      .filter((assignment) => assignment.targetType === "player" && assignment.targetId === player.id)
      .reduce((total, assignment) => total + assignment.amount, 0);
    const commanderDamage = assignments.filter(
      (assignment) => assignment.targetType === "player" && assignment.targetId === player.id && assignment.commanderDamage,
    );
    const nextCommanderDamage = { ...player.commanderDamageTaken };
    commanderDamage.forEach((assignment) => {
      nextCommanderDamage[assignment.sourceId] = (nextCommanderDamage[assignment.sourceId] ?? 0) + assignment.amount;
    });

    return {
      ...player,
      life: player.life - playerDamage,
      commanderDamageTaken: nextCommanderDamage,
    };
  });

  const flags: JudgeFlag[] = [];
  assignments.forEach((assignment) => {
    if (assignment.commanderDamage) {
      const player = updatedPlayers.find((item) => item.id === assignment.targetId);
      const totalCommanderDamage = player?.commanderDamageTaken[assignment.sourceId] ?? 0;
      if (totalCommanderDamage >= 21) {
        flags.push({
          id: makeId("flag"),
          severity: "warning",
          title: "Commander damage loss check",
          detail: `${assignment.targetName} has ${totalCommanderDamage} commander damage from ${assignment.sourceName}. Check elimination and replacement effects.`,
          relatedCardId: assignment.sourceId,
          relatedPlayerId: assignment.targetId,
        });
      }
    }
  });

  return {
    ...state,
    step: "combatDamage",
    players: updatedPlayers,
    damageAssignments: assignments,
    flags: [...state.flags, ...flags],
    actionLog: [`Combat damage assigned: ${assignments.length} assignment(s).`, ...state.actionLog],
  };
}

export function checkMissedCombatTriggers(state: CombatResolutionState): CombatResolutionState {
  const flags = state.attacks.flatMap((attack) => {
    const attacker = findCreature(state, attack.attackerId);
    if (!attacker?.triggerCount) {
      return [];
    }
    return [
      {
        id: makeId("flag"),
        severity: "missed-trigger" as const,
        title: "Possible missed attack trigger",
        detail: `${attacker.name} has ${attacker.triggerCount} tracked trigger ${attacker.triggerCount === 1 ? "marker" : "markers"}. Confirm attack/combat triggers were acknowledged.`,
        relatedCardId: attacker.id,
      },
    ];
  });

  return {
    ...state,
    flags: [...state.flags, ...flags],
    actionLog: [`Checked ${state.attacks.length} attacker(s) for missed combat triggers.`, ...state.actionLog],
  };
}

export function endCombat(state: CombatResolutionState): CombatResolutionState {
  const tokenIds = new Set(
    state.attacks.filter((attack) => attack.isMyriadToken || attack.createdThisCombat).map((attack) => attack.attackerId),
  );
  const exiledCount = tokenIds.size;

  return {
    ...state,
    step: "endOfCombat",
    creatures: state.creatures.filter((creature) => !tokenIds.has(creature.id)),
    attacks: [],
    blocks: [],
    flags: [
      ...state.flags,
      ...(exiledCount
        ? [
            {
              id: makeId("flag"),
              severity: "info" as const,
              title: "Myriad tokens exiled",
              detail: `${exiledCount} Myriad token ${exiledCount === 1 ? "copy was" : "copies were"} exiled at end of combat.`,
            },
          ]
        : []),
    ],
    actionLog: [`End of combat. Exiled ${exiledCount} temporary Myriad token(s).`, ...state.actionLog],
  };
}

export function makeSampleCombatState(): CombatResolutionState {
  const players: CombatPlayer[] = [
    { id: "p1", name: "Alex", life: 34, commanderDamageTaken: {} },
    { id: "p2", name: "Brian", life: 28, commanderDamageTaken: {} },
    { id: "p3", name: "Chloe", life: 41, commanderDamageTaken: {} },
    { id: "p4", name: "Daniel", life: 19, commanderDamageTaken: {} },
  ];

  const creatures: CombatCreature[] = [
    {
      id: "c-tymna",
      name: "Tymna the Weaver",
      typeLine: "Legendary Creature",
      controllerId: "p1",
      power: "2",
      toughness: "2",
      basePower: 2,
      baseToughness: 2,
      commander: true,
      keywords: ["Lifelink"],
      triggerCount: 1,
    },
    {
      id: "c-herald",
      name: "Blade of Selves Herald",
      typeLine: "Creature",
      controllerId: "p1",
      power: "4",
      toughness: "4",
      basePower: 4,
      baseToughness: 4,
      keywords: ["Myriad", "Trample"],
      triggerCount: 1,
    },
    {
      id: "c-nighthawk",
      name: "Vampire Nighthawk",
      typeLine: "Creature",
      controllerId: "p2",
      power: "2",
      toughness: "3",
      basePower: 2,
      baseToughness: 3,
      keywords: ["Deathtouch", "Flying"],
    },
    {
      id: "c-golem",
      name: "Solemn Simulacrum",
      typeLine: "Artifact Creature",
      controllerId: "p4",
      power: "2",
      toughness: "2",
      basePower: 2,
      baseToughness: 2,
    },
  ];

  return {
    step: "declareAttackers",
    activePlayerId: "p1",
    players,
    creatures,
    attacks: [],
    blocks: [],
    damageAssignments: [],
    flags: [],
    actionLog: ["Combat engine ready. Drag an attacker to a defending player."],
  };
}
