/**
 * assets/dataSyncEngine.js
 * 
 * Simulates fetching data from Google Sheets/Survey and syncing with KPI Baseline.
 */

const DataSyncEngine = {
    // Simulated Latency
    LATENCY: 800, // ms

    // Mock External Data (Simulating Google Sheet Response)
    mockData: {
        survey: {
            q_medical_access: 65,    // 65% find it inconvenient
            q_traffic_access: 70,    // 70% find it inconvenient
            q_digital_gap: 55,       // 55% have difficulty
            q_community_participation: 40, // 40% willing to participate
            q_settlement_intent: 35        // 35% willing to settle/stay
        },
        admin: {
            total_visitor_revenue: 55000000 // 55 Million KRW
        }
    },

    /**
     * Fetch Data (Async Simulation)
     */
    async fetchExternalData() {
        console.log("[DataSync] Fetching external data...");
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.mockData);
            }, this.LATENCY);
        });
    },

    /**
     * Sync Data to Baseline
     * @param {Object} currentBaseline - Current Baseline Object
     * @returns {Object} Updated Baseline
     */
    async syncKPIs(currentBaseline) {
        if (!window.KpiMapping) {
            console.error("[DataSync] Mapping table not found.");
            return currentBaseline;
        }

        const data = await this.fetchExternalData();
        const mapping = window.KpiMapping;
        let newBaseline = JSON.parse(JSON.stringify(currentBaseline)); // Deep Copy

        console.log("[DataSync] Syncing Survey Data...");
        // 1. Process Survey Data
        Object.entries(data.survey).forEach(([key, value]) => {
            const rule = mapping.survey[key];
            if (rule) {
                // Determine Target Field (Main Metric or Sub-Component)
                // e.g., 'SI' is in 'SII_components', 'CGS' is top-level
                this._applyValue(newBaseline, rule.target, value, rule.type);
            }
        });

        // 2. Process Admin Data
        Object.entries(data.admin).forEach(([key, value]) => {
            const rule = mapping.admin[key];
            if (rule) {
                let score = 0;
                if (rule.type === 'revenue_scale') {
                    // Logic: 10 Million KRW = 10 Points? (Scale 0.000001)
                    // Let's say 100 Million = 100 Points. 1 Million = 1 Point.
                    // Scale Factor should be 0.000001
                    score = Math.min(100, value * 0.000001); 
                }
                this._applyValue(newBaseline, rule.target, score, 'positive');
            }
        });

        return newBaseline;
    },

    _applyValue(baseline, targetKey, value, type) {
        // Clamp Input
        let finalVal = Math.max(0, Math.min(100, value));

        // Logic: Is it top-level or sub-component?
        // Sub-components: SI, LAI, DI -> in baseline.SII_components
        if (['SI', 'LAI', 'DI'].includes(targetKey)) {
             if (!baseline.SII_components) baseline.SII_components = {};
             // Simple override or weighted average? Request says "KPI Mapping" -> "Value".
             // We'll override for "Real-time Reflection".
             baseline.SII_components[targetKey] = finalVal;
             console.log(`[DataSync] Updated ${targetKey} to ${finalVal}`);
        } else if (baseline.hasOwnProperty(targetKey)) {
             // Top level: CGS, PTS, SUS, LSI
             baseline[targetKey] = finalVal;
             console.log(`[DataSync] Updated ${targetKey} to ${finalVal}`);
        }
    }
};

window.DataSyncEngine = DataSyncEngine;
