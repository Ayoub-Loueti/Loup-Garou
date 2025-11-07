class Player {
  constructor(name) {
    this.name = name; // Player's name for identification
    this.role = null; // Single role for the player (e.g., SimpleVillageois, LoupGarou)
    this.state = new SleepPhase(); // Initial state: SleepPhase
  }

  // Perform an action based on the current state
  performAction() {
    if (this.state.canAct()) {
      this.state.handleAction(this);
    } else {
      console.log(`${this.name} cannot act in the current state.`);
    }
  }

  // Get the player's role
  getRole() {
    return this.role;
  }

  // Set the player's current role
  setRole(role) {
    if (role && this.role !== role) {
      this.role = role;
      console.log(`${this.name} set role to: ${role.getName()}`);
    }
  }

  // Remove the player's role
  removeRole() {
    if (this.role) {
      const oldRole = this.role;
      this.role = null;
      console.log(`${this.name} removed role: ${oldRole.getName()}`);
    }
  }

  // Set the player's current state
  setState(state) {
    this.state = state;
    console.log(`${this.name} state changed to ${state.constructor.name}`);
  }

  // Get the player's current state
  getState() {
    return this.state;
  }

  // Get the player's name
  getName() {
    return this.name;
  }
}