/**
 * Abstract base class for State pattern.
 * All player states must extend this class and implement canAct() and handleAction() methods.
 */
class IPlayerState {
  /**
   * Check if the player can act in this state.
   * Must be implemented by subclasses.
   */
  canAct() {
    throw new Error("IPlayerState.canAct() must be implemented by subclass.");
  }

  /**
   * Handle the player's action in this state.
   * Must be implemented by subclasses.
   * @param {Player} player - The player performing the action
   */
  handleAction(player) {
    throw new Error("IPlayerState.handleAction() must be implemented by subclass.");
  }
}