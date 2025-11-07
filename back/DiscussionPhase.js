class DiscussionPhase extends IPlayerState {
  canAct() {
    return true; // All living players can discuss
  }

  handleAction(player) {
    if (player.getState().constructor.name !== "DeadPhase") {
      console.log(`${player.getName()} is discussing...`); 
    } else {
      console.log(`${player.getName()} is dead and cannot discuss.`);
    }
  }
}