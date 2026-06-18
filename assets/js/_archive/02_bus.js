/**
 * 02_bus.js
 * Simple Event Emitter for cross-component communication
 * Ticket 01: Core 분리
 */

window.App = window.App || {};

App.bus = {
    events: {},

    /**
     * Subscribe to an event
     * @param {string} eventName 
     * @param {Function} callback 
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    },

    /**
     * Unsubscribe from an event
     * @param {string} eventName 
     * @param {Function} callback 
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    },

    /**
     * Emit an event to all subscribers
     * @param {string} eventName 
     * @param {any} data 
     */
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`[App.bus] Error executing callback for event '${eventName}':`, e);
            }
        });
    }
};
