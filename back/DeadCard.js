class DeadCard extends ICard {
  constructor(player) {
    super();
    this.playerName = player.getName(); // Store the player's name
    this.roleName = player.getRole() ? player.getRole().getName() : "No Role"; // Store the player's last role
  }

  performAction() {
    console.log(`${this.playerName} (${this.roleName}) is eliminated and cannot act.`);
  }

  getAbility() {
    return "Eliminated - No ability";
  }

  getName() {
    return `${this.playerName} (${this.roleName})`;
  }

  getPlayerName() {
    return this.playerName;
  }

  getRoleName() {
    return this.roleName;
  }
}