class DeadPhase extends IPlayerState {
  canAct() {
    return false; // Dead players cannot act
  }

  handleAction(player) {
    console.log(`${player.getName()} is dead, no action allowed.`);
  }
}