/**
 * 03_datastore.js
 * Centralized Application State Manager
 * Ticket 01: Core 분리
 */

window.App = window.App || {};

App.store = {
    state: {
        // Raw Data Caches
        summary: null,         // Tab 1: Strategy Dashboard
        trend: null,           // Tab 1: 3M Trend Chart
        surveyStats: null,     // Tab 2: Survey Data
        villageAnalysis: null, // Tab 3: Ri Analysis
        routine: null,         // Tab 4: Routine Tasks
        reports: null,         // Tab 6: Reports Index
        dataSync: null,        // Tab 7: Data Status
        scenario: null,        // Tab 5: Scenario Lab
        
        // Active UI States
        activeTab: 'dashboard',
        activeVillage: '모항리' // For Tab 3 toggle
    },

    /**
     * Get a slice of state
     * @param {string} key 
     */
    get(key) {
        return this.state[key];
    },

    /**
     * Update state and notify subscribers
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        this.state[key] = value;
        // Optionally emit event if bus exists
        if (window.App.bus) {
            window.App.bus.emit(`store:changed:${key}`, value);
        }
    }
};
