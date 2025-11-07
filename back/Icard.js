/**
 * Abstract base interface for role cards.
 * All role cards must implement these methods.
 */
class ICard {
  /**
   * Perform the role's action.
   * Must be implemented by subclasses.
   */
  performAction() {
    throw new Error("ICard.performAction() must be implemented by subclass.");
  }

  /**
   * Get the role's ability description.
   * Must be implemented by subclasses.
   */
  getAbility() {
    throw new Error("ICard.getAbility() must be implemented by subclass.");
  }

  /**
   * Get the role's name.
   * Must be implemented by subclasses.
   */
  getName() {
    throw new Error("ICard.getName() must be implemented by subclass.");
  }
}