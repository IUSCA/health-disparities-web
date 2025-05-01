/**
 * StateMachine class to manage state transitions with role-based access control.
 */
class StateMachine {
  /**
   * Symbol representing a wildcard role that allows any role to perform a transition.
   */
  static ANY_ROLE = Symbol('ANY_ROLE');

  /**
   * Constructs a new StateMachine instance.
   * @param {Object} config - Configuration object for the state machine.
   * @param {string[]} config.states - Array of valid states.
   * @param {Object[]} config.transitions - Array of transition objects.
   * @param {string} config.transitions[].from - The starting state of the transition.
   * @param {string} config.transitions[].to - The target state of the transition.
   * @param {string[]} config.transitions[].roles - Array of roles allowed to perform the transition.
   */
  constructor({ states, transitions }) {
    this.states = new Set(states);
    this.transitions = transitions.map((t) => ({
      from: t.from,
      to: t.to,
      roles: new Set(t.roles),
    }));
    this.currentState = null;
  }

  /**
   * Sets the current state of the state machine.
   * @param {string} state - The state to set as the current state.
   * @throws {Error} If the state is not a valid state.
   */
  setState(state) {
    if (!this.states.has(state)) {
      throw new Error(`Invalid state: ${state}`);
    }
    this.currentState = state;
  }

  /**
   * Gets the current state of the state machine.
   * @returns {string|null} The current state, or null if no state is set.
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Gets all valid states of the state machine.
   * @returns {string[]} Array of valid states.
   */
  getStates() {
    return Array.from(this.states);
  }

  /**
   * Gets the allowed transitions from a given state for a specific role.
   * @param {Object} params - Parameters for determining allowed transitions.
   * @param {string} params.from - The starting state.
   * @param {string} params.role - The role attempting the transition.
   * @returns {string[]} Array of target states that can be transitioned to.
   */
  getAllowedTransitions({ from = null, role }) {
    const _from = from || this.currentState;
    if (!this.states.has(_from)) return [];
    return this.transitions
      .filter((t) => t.from === _from
        && (t.roles.has(role) || t.roles.has(StateMachine.ANY_ROLE)))
      .map((t) => t.to);
  }

  /**
   * Checks if a transition is allowed from one state to another for a specific role.
   * @param {Object} params - Parameters for checking the transition.
   * @param {string} params.from - The starting state.
   * @param {string} params.to - The target state.
   * @param {string} params.role - The role attempting the transition.
   * @returns {boolean} True if the transition is allowed, false otherwise.
   */
  canTransition({ from = null, to, role }) {
    const _from = from || this.currentState;
    return this.transitions.some(
      (t) => t.from === _from
        && t.to === to
        && (t.roles.has(role) || t.roles.has(StateMachine.ANY_ROLE)),
    );
  }
}

module.exports = StateMachine;
