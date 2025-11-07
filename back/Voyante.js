class Voyante extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Voyante";
    this.game = null; // Reference to game for target selection
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
    if (target) {
      const roleName = target.getRole() ? target.getRole().getName() : "No role";
      const ownerName = this.owner ? this.owner.getName() : this.name;
      console.log(`${ownerName} (${this.name}) checked ${target.getName()}: Role is ${roleName}`);
    } else {
      console.log(`${this.name} could not find a target to check.`);
    }
  }

  selectTarget() {
    // In real game, this would be interactive
    // For now, return the first living player that's not the owner
    if (!this.game) return null;
    const livingPlayers = this.game.getLivingPlayers();
    return livingPlayers.find(p => p !== this.owner);
  }

  getAbility() {
    return "Check a player's role at night";
  }

  getName() {
    return this.name;
  }
}
