class PlayRolePhase extends IPlayerState {
  canAct() {
    return true; // Only players with special roles act
  }

  handleAction(player) {
    if (player.getRole()) {
      player.getRole().performAction(); // Trigger the role's action
    } else {
      console.log(`${player.getName()} has no role to play.`);
    }
  }
}