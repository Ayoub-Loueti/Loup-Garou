class RoleActionCommand extends ICommand {
  constructor(player) {
    super();
    this.player = player; // The player performing the role action
    this.previousState = null; // To store state before action (for undo)
    this.role = player.getRole(); // Store reference to role
    this.executed = false; // Track if command was successfully executed
  }

  execute() {
    if (!this.player) {
      console.log("RoleActionCommand: No player provided.");
      return;
    }

    if (!this.role) {
      console.log(`${this.player.getName()} has no role to perform action.`);
      return;
    }

    // Store state before action for potential undo
    this.previousState = this.player.getState();
    
    // Check if player can act (for Chasseur, allow even if dead)
    const state = this.player.getState();
    const roleName = this.role.getName ? this.role.getName() : '';
    const canAct = state.canAct ? state.canAct() : true;
    const isDead = state.constructor.name === 'DeadPhase';
    
    // Allow Chasseur to act even when dead (death shot)
    if (!canAct && !(isDead && roleName === 'Chasseur')) {
      console.log(`${this.player.getName()} cannot perform a role action in the current state.`);
      return;
    }

    // Execute the role's action
    if (typeof this.role.performAction === 'function') {
      this.role.performAction();
      this.executed = true;
      console.log(`${this.player.getName()} executed a role action command (${roleName}).`);
    } else {
      console.log(`${this.player.getName()}'s role does not support performAction.`);
    }
  }

  undo() {
    if (!this.executed) {
      console.log(`RoleActionCommand: Cannot undo - command was not successfully executed.`);
      return;
    }
    
    // Most role actions are irreversible (kills, protections, etc.)
    // This is a placeholder for future implementation if needed
    console.log(`Role action undo requested; lethal effects cannot be undone.`);
    // Note: In a real implementation, you might want to restore player states,
    // but for a game like Loup Garou, undoing kills would break game integrity.
  }
}