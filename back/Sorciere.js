class Sorciere extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Sorcière";
    this.potion = 1; // One-time use for the whole game
    this.used = false; // Track if potion is used
    this.game = null;
    this.owner = null;
    this.forcedTarget = null;
  }

  setGame(game) {
    this.game = game;
  }

  setOwner(player) {
    this.owner = player;
  }

  setTarget(target) {
    this.forcedTarget = target;
  }

  performAction() {
    // Allow skipping turn: if no forcedTarget, do nothing and keep potion
    if (!this.forcedTarget) {
      console.log(`${this.name} skipped using the potion this night.`);
      return;
    }

    if (this.potion > 0 && !this.used) {
      const target = this.forcedTarget;
      if (target) {
        if (target.getState().constructor.name !== "DeadPhase") {
          // Witch poison bypasses Salvateur protection
          target.setState(new DeadPhase());
          console.log(`${this.name} killed ${target.getName()} with potion`);
          // Trigger death actions before removing role
          if (target.getRole() && typeof target.getRole().triggerDeathAction === 'function') {
            const r = target.getRole();
            const rName = r.getName && r.getName();
            if (rName === 'Chasseur') {
              // Ensure hunter has a target: pick random living (not hunter) if none
              if (!r.forcedTarget && this.game) {
                const candidates = this.game.players.filter(p => p.getState().constructor.name !== 'DeadPhase' && p !== target);
                if (candidates.length > 0) {
                  const idx = Math.floor(Math.random() * candidates.length);
                  r.setTarget(candidates[idx]);
                }
              }
            }
            r.triggerDeathAction();
          }
          // Move all newly dead players to graveyard
          if (this.game && typeof this.game.moveToGraveyard === 'function') {
            for (const p of this.game.players) {
              if (p.getState().constructor.name === 'DeadPhase') {
                this.game.moveToGraveyard(p);
              }
            }
          }
        } else {
          console.log(`${this.name} cannot use potion on a dead target.`);
        }
        // Consuming potion only when an attempt was made (even if protected)
        this.potion--;
        this.used = true;
      } else {
        console.log(`${this.name} could not find a target to use potion on.`);
      }
    } else {
      console.log(`${this.name} has no potions left or already used it.`);
    }
  }

  selectTarget() {
    if (!this.game) return null;
    const living = this.game.getLivingPlayers();
    return living.find(p => p !== this.owner);
  }

  getAbility() {
    return "Revive or kill a player once per game";
  }

  getName() {
    return this.name;
  }

  checkIfProtected(target) {
    if (!this.game) return false;
    for (const player of this.game.players) {
      if (player.getRole() && player.getRole().isProtected && player.getRole().isProtected(target)) {
        return true;
      }
    }
    return false;
  }
}