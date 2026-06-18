/**
 * 05_cache.js
 * In-Memory Request Cache with TTL mechanism
 * Ticket 02: AdminDataService 분리 + Cache
 */

window.App = window.App || {};

App.cache = {
    _data: {},
    TTL_MS: 3 * 60 * 1000, // 3 Minutes default TTL

    /**
     * Generate unique hash key for a request
     */
    _makeKey(action, params = {}) {
        return action + '_' + JSON.stringify(params);
    },

    /**
     * Check if a valid, unexpired cache exists
     * @param {string} action 
     * @param {object} params 
     */
    get(action, params = {}) {
        const key = this._makeKey(action, params);
        const record = this._data[key];
        
        if (!record) return null;
        
        // TTL Check
        if (Date.now() - record.timestamp > this.TTL_MS) {
            delete this._data[key];
            console.log(`[App.cache] Expired: ${key}`);
            return null;
        }

        console.log(`[App.cache] HIT: ${key}`);
        return record.payload;
    },

    /**
     * Store payload in cache
     * @param {string} action 
     * @param {object} params 
     * @param {any} payload 
     */
    set(action, params = {}, payload) {
        const key = this._makeKey(action, params);
        this._data[key] = {
            timestamp: Date.now(),
            payload: payload
        };
        console.log(`[App.cache] SET: ${key}`);
    },

    /**
     * Force clear cache (e.g. on manual refresh)
     * @param {string} action Optional: clear specific, otherwise clear all
     */
    clear(action = null) {
        if(action) {
            Object.keys(this._data).forEach(k => {
                if(k.startsWith(action + '_')) delete this._data[k];
            });
        } else {
            this._data = {};
        }
        console.log(`[App.cache] Cleared${action ? ' for ' + action : ' all'}`);
    }
};
