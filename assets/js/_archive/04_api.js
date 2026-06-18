/**
 * 04_api.js
 * Centralized API Fetcher with Timeout & AbortController support
 * Ticket 02: AdminDataService 분리 + Cache
 */

window.App = window.App || {};

App.api = {
    _controllers: {}, // Map URL/Action to AbortControllers for cancellation

    /**
     * Unified remote call to Google Apps Script
     * @param {string} action The GAS action parameter
     * @param {object} params Additional query parameters
     * @param {number} timeoutMs Timeout in milliseconds (default: 30s)
     * @returns {Promise<any>}
     */
    async callAction(action, params = {}, timeoutMs = 30000) {
        const url = new URL(App.config.SURVEY_SCRIPT_URL);
        url.searchParams.set("action", action);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

        const reqKey = action + JSON.stringify(params);

        // Abort previous redundant request if still pending (Optional, but good practice)
        if (this._controllers[reqKey]) {
            this._controllers[reqKey].abort('Duplicate request cancelled');
        }

        const controller = new AbortController();
        this._controllers[reqKey] = controller;
        const timeoutId = setTimeout(() => controller.abort('Timeout exceeded'), timeoutMs);

        try {
            console.log(`[App.api] Fetching: ${action}`, params);
            const res = await fetch(url.toString(), {
                method: "GET",
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            delete this._controllers[reqKey];

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} Error`);
            }
            
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                throw new Error(data.message || data.error || 'Unknown API Error');
            }
            
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            delete this._controllers[reqKey];
            
            if (error.name === 'AbortError') {
                console.warn(`[App.api] Request aborted/timeout: ${action}`);
                throw new Error(`요청 시간 초과 또는 취소됨 (${action})`);
            }
            console.error(`[App.api] API Failed (${action}):`, error);
            throw error; // Let caller UI handle the display
        }
    }
};
