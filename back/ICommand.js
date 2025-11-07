/**
 * Abstract base class for Command pattern.
 * All commands must extend this class and implement execute() and undo() methods.
 */
class ICommand {
  /**
   * Execute the command.
   * Must be implemented by subclasses.
   */
  execute() {
    throw new Error("ICommand.execute() must be implemented by subclass.");
  }

  /**
   * Undo the command.
   * Must be implemented by subclasses.
   */
  undo() {
    throw new Error("ICommand.undo() must be implemented by subclass.");
  }
}