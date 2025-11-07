class Chasseur extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Chasseur";
    this.isActive = true; // One-time use upon death
    this.forcedTarget = null; // Target to shoot when dying
    this.game = null;
    this.owner = null;
  }

  setTarget(target) {
    this.forcedTarget = target;
  }

  setGame(game) {
    this.game = game;
  }

  setOwner(player) {
    this.owner = player;
  }

  performAction() {
    if (!this.isActive) return; // Only triggers on death
    const target = this.forcedTarget; // Deterministic for tests; interactive in real game
    if (target) {
      // Check Salvateur protection
      const isProtected = this.isProtected(target);
      if (isProtected) {
        console.log(`${this.name} tried to shoot ${target.getName()} upon death, but they are protected by the Salvateur!`);
        this.isActive = false;
        return;
      }
      console.log(`${this.name} shot ${target.getName()} upon death`);
      target.setState(new DeadPhase());
      if (this.game && typeof this.game.moveToGraveyard === 'function') {
        this.game.moveToGraveyard(target);
      }
      this.isActive = false;
    } else {
      console.log(`${this.name} could not find a target to shoot upon death.`);
    }
  }

  isProtected(target) {
    if (!this.game) return false;
    for (const player of this.game.players) {
      const role = player.getRole();
      if (!role) continue;
      const roleName = role.getName ? role.getName() : '';
      if (roleName === 'Salvateur' && role.isProtected && role.isProtected(target)) {
        return true;
      }
    }
    return false;
  }

  getAbility() {
    return "Shoot a player upon death";
  }

  getName() {
    return this.name;
  }

  triggerDeathAction() {
    if (!this.isActive) return;
    // If no target set, pick a random living target (not self), respecting protection later in performAction
    if (!this.forcedTarget) {
      if (!this.game) {
        console.log('Chasseur could not find a target (no game context).');
        return;
      }
      // Build living list manually to avoid issues if getLivingPlayers excludes edge cases
      const living = this.game.players.filter(p => p.getState().constructor.name !== 'DeadPhase' && p !== this.owner);
      if (living.length === 0) {
        console.log('Chasseur could not find a living target to shoot.');
        return;
      }
      const randomIndex = Math.floor(Math.random() * living.length);
      this.forcedTarget = living[randomIndex];
      console.log(`Chasseur auto-selected ${this.forcedTarget.getName()} as death shot target.`);
    }
    this.performAction();
  }
}