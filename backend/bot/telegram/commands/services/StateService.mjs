export class StateService {
    constructor(options = {}) {
        this.states = new Map();
        this.ttl = options.ttl || 1800000;
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    }

    setState(userId, state) {
        this.states.set(userId, {
            ...state,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.ttl
        });
    }

    getState(userId) {
        const state = this.states.get(userId);
        if (!state || Date.now() > state.expiresAt) {
            this.states.delete(userId);
            return null;
        }
        return state;
    }

    updateState(userId, updates) {
        const currentState = this.getState(userId);
        if (currentState) {
            this.setState(userId, { ...currentState, ...updates });
        }
    }

    clearState(userId) {
        this.states.delete(userId);
    }

    cleanup() {
        const now = Date.now();
        for (const [userId, state] of this.states.entries()) {
            if (now > state.expiresAt) {
                this.states.delete(userId);
            }
        }
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.states.clear();
    }
}