/**
 * assets/auditLogger.js
 * Records inputs, rules, and outcomes for AI/Algorithm decisions.
 * Ensures "Explainability" for public sector usage.
 */

const AuditLogger = {
    logs: [],

    /**
     * Log an event
     * @param {string} category - 'RECOMMENDER', 'SIMULATOR', 'PREDICTOR', 'DOC_GEN'
     * @param {string} action - 'INPUT', 'DECISION', 'FILTER', 'OUTPUT'
     * @param {string} message - Human readable explanation
     * @param {Object} data - Context data (optional)
     */
    log(category, action, message, data = {}) {
        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            category,
            action,
            message,
            data: JSON.parse(JSON.stringify(data)) // Snapshot
        };
        this.logs.push(entry);
        console.log(`[Audit:${category}] ${action}: ${message}`, data);
    },

    getLogs(filterCategory = null) {
        if (filterCategory) {
            return this.logs.filter(l => l.category === filterCategory);
        }
        return this.logs;
    },

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    },
    
    clear() {
        this.logs = [];
    }
};

window.AuditLogger = AuditLogger;
