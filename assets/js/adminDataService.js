/**
 * assets/adminDataService.js
 * Responsible for fetching Admin Data and normalizing it to the Standard JSON Schema.
 */

const AdminDataService = {
    // Standard Schema Template
    schema: {
        region: "sowon_all",
        updatedAt: null,
        kpi: { RTRI: 0, SII: 0, LSI: 0, CGS: 0, PTS: 0, SUS: 0 },
        survey: {
            responseRate: 0,
            lifeService: [],
            governance: [],
            transition: []
        },
        ri: { rows: [] },
        routine: {
            monthlyChecklist: [],
            quarterly: [],
            gantt: []
        },
        alerts: []
    },

    /**
     * Load Admin Data
     * @param {string} region - 'all' (default), 'uihang', 'mohang'
     * @param {string} period - 'this_month', '3m', '6m'
     * @param {string} source - 'raw', 'norm'
     * @returns {Promise<Object>} normalizedData
     */
    async loadAdminData(region = 'all', period = 'this_month', source = 'raw') {
        const action = 'admin_summary';
        const params = { region, period, source };

        // 1. Check Cache
        const cached = App.cache.get(action, params);
        if (cached) return cached;

        console.log(`[AdminDataService] Fetching Summary...`);
        try {
            // 2. Fetch using centralized API
            const rawData = await App.api.callAction(action, params);
            
            // 3. Set Cache & Return
            App.cache.set(action, params, rawData);
            return rawData;
        } catch (error) {
            console.error("[AdminDataService] Summary Error:", error);
            throw error;
        }
    },

    async loadTrendData() {
        const action = 'kpi_trend_3m';
        
        const cached = App.cache.get(action);
        if (cached) return cached;

        console.log(`[AdminDataService] Fetching Trend...`);
        try {
            const rawData = await App.api.callAction(action);
            let data = [];
            if (Array.isArray(rawData)) data = rawData;
            else if (rawData && Array.isArray(rawData.rows)) data = rawData.rows;
            
            App.cache.set(action, {}, data);
            return data;
        } catch (error) {
            console.warn("[AdminDataService] Trend Error:", error);
            return []; // Fallback empty array
        }
    },
    
    _normalize(raw, region) {
         // If GAS returns exactly what we need, just return it.
         // Otherwise, fill in defaults.
         const data = JSON.parse(JSON.stringify(this.schema));
         
         if(raw.kpi) data.kpi = { ...data.kpi, ...raw.kpi };
         if(raw.survey) data.survey = { ...data.survey, ...raw.survey };
         if(raw.phase) data.phase = raw.phase || { current: "PHASE_1" };
         if(raw.alerts) data.alerts = raw.alerts;
         if(raw.trend3m) data.trend3m = raw.trend3m;
         
         // [NEW] If kpiComponents exists (from advanced stats), recalculate Top KPI
         // This ensures consistency between Detailed Views and Dashboard
         if(raw.kpiComponents) {
             data.kpiComponents = raw.kpiComponents; // Store for modal usage
             
             // Optional: Override Top KPI with calculated average of components
             // const calc = this._calcKpiFromComponents(raw.kpiComponents);
             // data.kpi = { ...data.kpi, ...calc };
         }
         
         data.region = region;
         data.updatedAt = raw.updatedAt || new Date().toISOString();
         
         return data;
    },

    // [New] Helper to inject Granular KPI Components if missing (Mock/Simulation)
    _injectMockComponents(data) {
        if(!data) return data;
        
        // Structure Template
        const comps = data.kpiComponents || {
            RTRI: { lodgingIntent: 0, residentAcceptance: 0, longStayDemand: 0, constraintIndex: 0 },
            SII: { medical:0, transport:0, facility:0, care:0, digital:0 },
            CGS: { governanceIntent:0, volunteerIntent:0, usageIntent:0 },
            PTS: { convertibleRoomRate:0 },
            SUS: { revisitIntent:0, settleInterest:0, jobInterest:0, startupInterest:0 }
        };

        // Fill with Mock Data if 0 (Simulation for MVP)
        // Values are roughly based on the "Current" status (RTRI ~54, LSI ~70)
        
        // RTRI (Avg ~55)
        if(!comps.RTRI.lodgingIntent) comps.RTRI.lodgingIntent = 65; // High Intent
        if(!comps.RTRI.residentAcceptance) comps.RTRI.residentAcceptance = 45; // Low Acceptance
        if(!comps.RTRI.longStayDemand) comps.RTRI.longStayDemand = 70; // High Demand
        if(!comps.RTRI.constraintIndex) comps.RTRI.constraintIndex = 40; // Moderate Constraint

        // SII (Avg ~70, Inconvenience inverted? No, SII is Inconvenience Index usually, 
        // but here LSI is Life Service Index (High is Good). SII is Service Inequality (High is Bad).
        // Let's assume input values here are "Satisfaction" (High is Good) for easier UI,
        // and we invert them for SII calculation if needed.
        // Or simply: SII components = Inequality Score (High = Bad).
        // Let's use Satisfaction (High=Good) for LSI components.
        if(!comps.SII.medical) comps.SII.medical = 30; // Poor
        if(!comps.SII.transport) comps.SII.transport = 40; // Poor
        if(!comps.SII.facility) comps.SII.facility = 75; // Good
        if(!comps.SII.care) comps.SII.care = 60; // Fair
        if(!comps.SII.digital) comps.SII.digital = 80; // Good

        // CGS (Avg ~60)
        if(!comps.CGS.governanceIntent) comps.CGS.governanceIntent = 55;
        if(!comps.CGS.volunteerIntent) comps.CGS.volunteerIntent = 65;
        if(!comps.CGS.usageIntent) comps.CGS.usageIntent = 60;

        // PTS (Avg ~50)
        if(!comps.PTS.convertibleRoomRate) comps.PTS.convertibleRoomRate = 48;

        // SUS (Avg ~45)
        if(!comps.SUS.revisitIntent) comps.SUS.revisitIntent = 80; // Tourists love it
        if(!comps.SUS.settleInterest) comps.SUS.settleInterest = 30; // Hard to settle
        if(!comps.SUS.jobInterest) comps.SUS.jobInterest = 20; // No jobs
        if(!comps.SUS.startupInterest) comps.SUS.startupInterest = 40;

        data.kpiComponents = comps;
        return data;
    },

    // [Ticket 07] Mock 6-month trend for a specific KPI
    // Simulated backend capability
    async loadKpiTrend6m(metric, currentScore) {
        return new Promise(resolve => {
            setTimeout(() => {
                const labels = [];
                const data = [];
                
                const now = new Date();
                let baseScore = parseFloat(currentScore);
                if(isNaN(baseScore)) baseScore = 65.0; // Fallback
                
                // Generate 6 months data ending in current score
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(`${d.getMonth() + 1}월`);
                    
                    if (i === 0) {
                        data.push(baseScore);
                    } else {
                        // generate realistic fluctuation (+- 5)
                        const variation = (Math.random() * 10 - 5);
                        let val = baseScore + variation;
                        // simulate a slight upward/downward trend realistically
                        baseScore = baseScore - (Math.random() * 2 - 1); 
                        data.push(Math.max(0, Math.min(100, parseFloat(val.toFixed(1)))));
                    }
                }
                
                resolve({ labels, data });
            }, 50); // small delay to simulate network
        });
    },

    // Tab 2: Survey & Stats (Parallel Fetch)
    async loadSurveyStats() {
        try {
            const [stats, charts, wc, summaryData] = await Promise.all([
                this._fetchGas('survey_stats').catch(e => null),
                this._fetchGas('survey_charts').catch(e => null),
                this._fetchGas('wordcloud').catch(e => null),
                this._fetchGas('survey_stats_summary').catch(e => null)
            ]);
            
            // Fallback to mock data if the backend hasn't warmed up or fails
            const safeSummary = summaryData || (window.App && window.App.EXAMPLE_SURVEY_SUMMARY) || null;

            // Merge into single object for the renderer
            // [FIX] Add guard for null stats
            const result = {
                ...(stats || {}),
                charts: charts || {},
                wordcloud: wc || {},
                summary: safeSummary // [Phase 4] Attach summary object
            };
            
            return this._injectMockComponents(result); // [NEW] Inject Components
        } catch (e) {
            console.error("Survey Load Failed", e);
            throw e;
        }
    },

    // --- Tab 3: Village Analysis ---
    async loadVillageAnalysis() {
        // GAS responses: ri_charts → { updatedAt, data: { 모항리: {...}, 의항리: {...} } }
        //                ri_wordcloud → { keywords: { 모항리: [...], 의항리: [...] } }
        //                kpi_by_ri → { 모항리: { kpi: {...} }, 의항리: { kpi: {...} } }
        const EMPTY_RI = {
            sample: 0,
            lsiBreakdown: { items: [] },
            lsiScoreAvg: 0,
            loiSummary: { intentRate: 0, activeRate: 0, counts: {} },
            pciHighRate: 0,
            payDist: [],
            intentPayCrosstab: { xLabels: [], yLabels: [], maxCount: 1, heatmap: [] }
        };
        const FALLBACK_CHARTS = {
            updatedAt: '-',
            data: { '모항리': { ...EMPTY_RI }, '의항리': { ...EMPTY_RI } }
        };
        const FALLBACK_WC = { keywords: { '모항리': [], '의항리': [] } };

        let charts = null, wc = null, kpiByRi = null;
        try {
            [charts, wc, kpiByRi] = await Promise.all([
                this._fetchGas('ri_charts').catch(e => { console.warn('[RI] ri_charts:', e); return null; }),
                this._fetchGas('ri_wordcloud').catch(e => { console.warn('[RI] ri_wordcloud:', e); return null; }),
                this._fetchGas('kpi_by_ri').catch(e => { console.warn('[RI] kpi_by_ri:', e); return null; })
            ]);
        } catch (e) {
            console.error('Village Analysis Load Failed', e);
        }

        const normalizedCharts = charts || FALLBACK_CHARTS;
        if (normalizedCharts && !normalizedCharts.data && typeof normalizedCharts === 'object') {
            normalizedCharts.data = normalizedCharts;
        }

        return {
            charts:    normalizedCharts,
            wordcloud: wc || FALLBACK_WC,
            kpiByRi:   kpiByRi || {}
        };
    },

    // --- Tab 8: Dashboard Extensions (New) ---
    async loadProgExecSummary(region = 'all') {
        try {
            // "All" (capital A) is used to bypass stale 'ALL' or 'all' cache keys in GAS
            const mockRegion = (region === 'all' || region === 'ALL') ? 'All' : region;
            return await this._fetchGas('prog_exec_summary', { ri: mockRegion, region, period: 'all' });
        } catch (e) {
            console.error("ProgExec Load Failed", e);
            return null;
        }
    },

    async loadLinkerBaseSummary(region = 'all') {
        try {
            const mockRegion = (region === 'all' || region === 'ALL') ? 'All' : region;
            return await this._fetchGas('linker_base_summary', { ri: mockRegion, region, period: 'all' });
        } catch (e) {
            console.error("LinkerBase Load Failed", e);
            return null;
        }
    },

    // --- Tab 4: Routine (GAS Real Backend) ---
    async loadOpsRoutine(monthKey) {
        if (!monthKey) {
            monthKey = new Date().toISOString().slice(0, 7);
        }
        const raw = await this._fetchGas('ops_routine_get', { monthKey });
        if (!raw) return null;
        // A-plan response: raw.items and raw.issues are exposed at top level (backward compat)
        // Also accept raw.payload.items / raw.payload.issues
        const items = raw.items || (raw.payload && raw.payload.items) || [];
        const issues = raw.issues || (raw.payload && raw.payload.issues) || [];
        return {
            monthKey: raw.monthKey || monthKey,
            scope: raw.scope || 'ALL',
            items,
            issues,
            completionRate: raw.completionRate || 0,
            updatedAt: raw.updatedAt || null,
        };
    },

    async saveOpsRoutine(payload) {
        console.log(`[AdminDataService] Saving OPS Routine...`, payload);
        try {
            // Always include scope for A-plan schema (monthKey + scope upsert key)
            const data = { scope: 'ALL', ...payload };
            return await App.api.callAction('ops_routine_upsert', data, 'POST');
        } catch (error) {
            console.error("[AdminDataService] OPS Save Error:", error);
            throw error;
        }
    },

    async cloneOpsRoutine(fromMonth, toMonth) {
        console.log(`[AdminDataService] Cloning OPS Routine from ${fromMonth} to ${toMonth}`);
        try {
            return await App.api.callAction('ops_routine_clone', { fromMonth, toMonth }, 'POST');
        } catch (error) {
            console.error("[AdminDataService] OPS Clone Error:", error);
            throw error;
        }
    },

    async listOpsRoutine() {
        return await this._fetchGas('ops_routine_list');
    },

    // --- Tab 5: Reports (데이터는 renderReportsTab이 자체 병렬 로딩) ---
    async loadReportsIndex() {
        // renderReportsTab이 내부에서 5개 API를 직접 병렬 fetch하므로
        // 여기서는 빈 구조만 반환 (loadTabContent 라우터 호환용)
        return { reports: [] };
    },

    // --- Tab 5b: Geo / Map Data (MAP-FE-CORE-02) ---
    async getGeoIndex() {
        // TTL 10 minutes (600,000ms)
        return await this._fetchGas('geo_index', {}, 600000);
    },

    async getKpiByRi() {
        // TTL 60 seconds (60,000ms)
        // Recommendation: Promise.all([mohang, uihang])
        try {
            const cached = App.cache.get('kpi_by_ri_normalized');
            if (cached && (Date.now() - cached._ts < 60000)) return cached._data;

            const [mRaw, uRaw] = await Promise.all([
                this._fetchGas('ri_charts', { ri: '모항리' }, 60000),
                this._fetchGas('ri_charts', { ri: '의항리' }, 60000)
            ]);

            // Helper to unwrap data cleanly
            const extractData = (raw, riName) => {
                if (!raw) return { kpi: { RTRI:0, SII:0, LSI:0, CGS:0, PTS:0, SUS:0 } };
                if (raw.data) {
                    return raw.data[riName] || raw.data;
                }
                return raw[riName] || raw;
            };

            // Normalize
            const normalized = {
                '모항리': extractData(mRaw, '모항리') || { kpi: { RTRI:0, SII:0, LSI:0, CGS:0, PTS:0, SUS:0 } },
                '의항리': extractData(uRaw, '의항리') || { kpi: { RTRI:0, SII:0, LSI:0, CGS:0, PTS:0, SUS:0 } }
            };

            App.cache.set('kpi_by_ri_normalized', {}, { _data: normalized, _ts: Date.now() });
            return normalized;
        } catch (e) {
            console.error("[AdminDataService] getKpiByRi failed:", e);
            return { '모항리': null, '의항리': null };
        }
    },

    // --- Tab 6: Scenario Lab (SL-DATA-02) ---
    async saveScenario(payload) {
        try {
            const params = {
                action: 'scenario_save',
                title:             payload.title || '제목 없음',
                scope:             payload.scope || 'ALL',
                scenarioId:        payload.scenarioId || '',
                selectedItemsJson: JSON.stringify(payload.selectedItems || []),
                assumptionsJson:   JSON.stringify(payload.assumptions  || {}),
                baselineJson:      JSON.stringify(payload.baselineKpi  || {}),
                resultJson:        JSON.stringify(payload.result       || {}),
                driversJson:       JSON.stringify(payload.drivers      || {})
            };
            // Use POST to avoid URL length limits for large JSON result
            const res = await App.api.callAction('scenario_save', params, 'POST');
            
            // [FIX] Invalidate cache so that UI reloads immediately
            if (res && res.ok && App.cache) {
                App.cache.set(`scenario_list_${params.scope}`, null, { data: null, timestamp: 0 }); // flush
            }
            return res;
        } catch (err) {
            console.error('[AdminDataService] Scenario Save Failed:', err);
            return { ok: false, error: err.message };
        }
    },

    async listScenarios(scope = '') {
        try {
            const cacheKey = `scenario_list_${scope}`;
            const cached = App.cache.get(cacheKey);
            if (cached && cached.timestamp && (Date.now() - cached.timestamp < 30000)) {
                return cached.data;
            }
            const result = await App.api.callAction('scenario_list', { scope });
            App.cache.set(cacheKey, {}, { data: result, timestamp: Date.now() });
            return result;
        } catch (err) {
            console.error('[AdminDataService] Scenario List Failed:', err);
            return { ok: false, scenarios: [] };
        }
    },

    async getScenario(id) {
        try {
            return await App.api.callAction('scenario_get', { id });
        } catch (err) {
            console.error('[AdminDataService] Scenario Get Failed:', err);
            return { ok: false };
        }
    },

    async loadScenarioMap() {
        try {
            const [scenarios, geoIndex] = await Promise.all([
                this.listScenarios(),
                this.getGeoIndex()
            ]);
            return { scenarios, geoIndex };
        } catch (err) {
            console.error('[AdminDataService] loadScenarioMap Failed:', err);
            return { scenarios: [], geoIndex: null };
        }
    },

    async loadSurveySettings() {
        return await this._fetchGas('survey_settings', {}, 0);
    },

    async saveSurveySettings(settings) {
        return await App.api.callAction('survey_settings_update', { settings }, 'POST');
    },

    async loadVisitorAdmin() {
        const [stats, responses, settings] = await Promise.all([
            this._fetchGas('stats_visitor', { period: 'all' }, 0).catch(() => null),
            this._fetchGas('visitor_responses', { limit: 500, role: 'admin' }, 0).catch(() => null),
            this.loadSurveySettings().catch(() => null)
        ]);
        return { stats, responses, settings };
    },

    async loadResidentV2Admin() {
        const [stats, responses, settings] = await Promise.all([
            this._fetchGas('stats_resident_v2', { period: 'all' }, 0).catch(() => null),
            this._fetchGas('resident_v2_responses', { limit: 500, role: 'admin' }, 0).catch(() => null),
            this.loadSurveySettings().catch(() => null)
        ]);
        return { stats, responses, settings };
    },

    // --- Tab 7: Data Integrity & Health (Phase 7) ---
    async loadDataIntegrity() {
        // 무결성 검사는 실시간 파악이 중요하므로 TTL을 0으로 주어 캐시를 방지
        return await this._fetchGas('data_integrity', { role: 'admin' }, 0);
    },

    async loadKpiMappingStatus() {
        return await this._fetchGas('kpi_mapping_status', { role: 'admin' }, 0);
    },

    async loadSystemHealth() {
        return await this._fetchGas('system_health', { role: 'admin' }, 0);
    },

    // --- Tab 7: AUTO FIX (Phase 10) ---
    async scanDataNormalize(formType = "") {
        return await this._fetchGas('data_normalize_scan', { formType }, 0);
    },
    
    async previewDataNormalize(formType = "", limit = 20) {
        return await this._fetchGas('data_normalize_preview', { formType, limit }, 0);
    },
    
    async applyDataNormalize(formType = "") {
        return await this._fetchGas('data_normalize_apply', { formType }, 0);
    },
    
    async toggleDataNormalize() {
        return await this._fetchGas('toggle_norm', {}, 0);
    },

    async refreshAgg() {
        return await this._fetchGas('agg_refresh', {}, 0);
    },

    /**
     * Internal Fetch Helper (Updated to use App.api and App.cache)
     * @param {string} action 
     * @param {Object} params 
     * @param {number} ttl - TTL in ms (default 60s)
     */
    async _fetchGas(action, params={}, ttl = 60000) {
        // [DATA-01] 관리자 롤 전송 (보안 검증용)
        if (window.APP && window.APP.auth && window.APP.auth.role) {
            params.role = window.APP.auth.role;
        } else if (window.App && window.App.auth && window.App.auth.role) {
            params.role = window.App.auth.role;
        }

        const cached = App.cache.get(action, params);
        if (cached && cached._ts) {
            const now = Date.now();
            if (now - cached._ts < ttl) {
                return cached._data;
            }
        }

        try {
            const data = await App.api.callAction(action, params);
            // Store with timestamp wrapper to support TTL
            App.cache.set(action, params, { _data: data, _ts: Date.now() });
            return data;
        } catch (error) {
            console.error(`[AdminDataService] Fetch Error (${action}):`, error);
            return null;
        }
    }
};

window.AdminDataService = AdminDataService;
