class SleepPhase extends IPlayerState {
  canAct() {
    return false; // Players cannot act during sleep (e.g., non-special roles at night)
  }

  handleAction(player) {
    console.log(`${player.getName()} is sleeping, no action allowed.`);
  }
}