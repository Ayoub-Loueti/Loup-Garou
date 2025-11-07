class GameController {
  constructor(game = null) {
    this.commandHistory = []; // Stack to store executed commands
    this.game = game || new Game(); // Instance of the Game class (can be set externally)
  }

  // Set the game instance (useful when game is created separately)
  setGame(game) {
    if (game instanceof Game) {
      this.game = game;
    } else {
      console.log("GameController: Invalid game instance provided.");
    }
  }

  // Execute a command and add it to history
  executeCommand(command) {
    if (!command) {
      console.log("GameController: No command provided.");
      return false;
    }

    if (!(command instanceof ICommand)) {
      console.log("GameController: Invalid command type - must extend ICommand.");
      return false;
    }

    try {
      // Execute the command
      command.execute();
      
      // Only add to history if execution was successful
      // (commands should set an 'executed' flag if they want to track success)
      this.commandHistory.push(command);
      console.log(`Command executed and added to history (${this.commandHistory.length} commands total).`);
      return true;
    } catch (error) {
      console.error(`GameController: Error executing command:`, error);
      return false;
    }
  }

  // Undo the last command
  undoLastCommand() {
    if (this.commandHistory.length === 0) {
      console.log("GameController: No commands to undo.");
      return false;
    }

    const lastCommand = this.commandHistory.pop();
    try {
      lastCommand.undo();
      console.log(`Last command undone (${this.commandHistory.length} commands remaining).`);
      return true;
    } catch (error) {
      console.error(`GameController: Error undoing command:`, error);
      // Re-add command to history if undo failed
      this.commandHistory.push(lastCommand);
      return false;
    }
  }

  // Get command history (read-only access)
  getCommandHistory() {
    return [...this.commandHistory]; // Return a copy to prevent external modification
  }

  // Clear command history
  clearHistory() {
    this.commandHistory = [];
    console.log("GameController: Command history cleared.");
  }

  // Add a player to the game (delegates to Game)
  addPlayer(player, joinCode) {
    if (!this.game) {
      console.log("GameController: No game instance set.");
      return;
    }
    this.game.addPlayer(player, joinCode);
  }

  // Start night phase (delegates to Game)
  startNight() {
    if (!this.game) {
      console.log("GameController: No game instance set.");
      return;
    }
    this.game.startNight();
  }

  // Start day phase (delegates to Game)
  startDay() {
    if (!this.game) {
      console.log("GameController: No game instance set.");
      return;
    }
    this.game.startDay();
  }
}