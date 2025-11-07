class Salvateur extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Salvateur";
    this.protectedPlayer = null; // Tracks the player protected this night
    this.lastProtectedPlayer = null; // Tracks the last protected player to prevent consecutive protection
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
    const ownerName = this.owner ? this.owner.getName() : this.name;
    if (target && !this.protectedPlayer && target !== this.lastProtectedPlayer) {
      this.protectedPlayer = target;
      this.lastProtectedPlayer = target; // Update last protected player
      console.log(`${ownerName} (${this.name}) protected ${target.getName()} from attack this night`);
    } else if (target === this.lastProtectedPlayer) {
      console.log(`${ownerName} (${this.name}) cannot protect ${target.getName()} two nights in a row.`);
    } else if (this.protectedPlayer) {
      console.log(`${ownerName} (${this.name}) has already protected someone this night.`);
    } else {
      console.log(`${ownerName} (${this.name}) could not find a target to protect.`);
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
    return "Protect a player from attack at night (cannot protect the same player consecutively)";
  }

  getName() {
    return this.name;
  }

  isProtected(target) {
    return this.protectedPlayer === target;
  }

  // Reset protected player at the end of the night (to be called by Game)
  resetProtection() {
    this.protectedPlayer = null; // Clear protection for the next night
  }
}
