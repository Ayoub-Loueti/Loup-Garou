class LoupGarou extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Loup-Garou";
    this.game = null; // Reference to game for protection check and target selection
    this.owner = null; // Player who owns this role
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
    const target = this.forcedTarget || this.selectTarget();
    const ownerName = this.owner ? this.owner.getName() : this.name;
    if (target && target.getState().constructor.name !== "DeadPhase") {
      // Check if target is protected by Salvateur
      const isProtected = this.checkIfProtected(target);
      if (isProtected) {
        console.log(`${ownerName} (${this.name}) tried to attack ${target.getName()}, but they are protected by the Salvateur!`);
      } else {
        console.log(`${ownerName} (${this.name}) attacked ${target.getName()}`);
        target.setState(new DeadPhase());
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
            r.triggerDeathAction();
          } else {
            r.triggerDeathAction();
          }
        }
        // Move all newly dead players to graveyard
        if (this.game && typeof this.game.moveToGraveyard === 'function') {
          for (const p of this.game.players) {
            if (p.getState().constructor.name === 'DeadPhase') {
              this.game.moveToGraveyard(p);
            }
          }
        }
      }
    } else {
      console.log(`${ownerName} (${this.name}) could not find a valid target to attack.`);
    }
  }

  selectTarget() {
    // In real game, this would be interactive (wolves vote/discuss)
    // For now, return the first living player that's not the owner
    if (!this.game) return null;
    const livingPlayers = this.game.getLivingPlayers();
    // Wolves typically target non-wolves
    return livingPlayers.find(p => p !== this.owner && p.getRole() && p.getRole().getName() !== "Loup-Garou");
  }

  checkIfProtected(target) {
    if (!this.game) return false;
    // Check if any Salvateur is protecting this target
    for (const player of this.game.players) {
      if (player.getRole() && player.getRole().isProtected && player.getRole().isProtected(target)) {
        return true;
      }
    }
    return false;
  }

  getAbility() {
    return "Attack a player at night";
  }

  getName() {
    return this.name;
  }
}
