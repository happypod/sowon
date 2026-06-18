// --- Merged from 01_utils.js ---
/**
 * 01_utils.js
 * Common General Utilities
 * Ticket 01: Core 분리
 */

window.App = window.App || {};

App.utils = {
    /**
     * Number Formatter (e.g. 1000 -> 1,000)
     */
    fmt(val) {
        if(val === null || val === undefined || isNaN(val)) return '-';
        return Number(val).toLocaleString();
    },

    /**
     * Render a standard Progress Bar HTML string
     */
    renderBar(label, count, max, colorClass = 'bg-ocean-500') {
        const pct = max > 0 ? (count / max * 100) : 0;
        return `
            <div class="mb-2">
                <div class="flex items-center justify-between mb-1">
                    <span class="truncate w-2/3 text-xs text-slate-600" title="${label}">${label}</span>
                    <span class="font-bold text-ocean-600 text-xs">${count}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="${colorClass} h-1.5 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    },

    /**
     * Show a standardized Error Toast
     */
    showError(msg, retryCallback = null) {
        // Remove existing errors
        document.querySelectorAll('.fixed-error-toast').forEach(e => e.remove());

        const errDiv = document.createElement('div');
        errDiv.className = 'fixed-error-toast fixed top-5 right-5 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded shadow-xl z-50 flex items-center gap-3 animate-bounce';
        
        let retryBtnHtml = '';
        if (retryCallback) {
            // Generate a unique ID for the retry button to attach event listener safely
            const btnId = 'err-retry-btn-' + Date.now();
            retryBtnHtml = `<button id="${btnId}" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded font-bold transition-colors mt-2">다시 시도</button>`;
            
            // Attach event listener after injecting HTML
            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if (btn) btn.addEventListener('click', retryCallback);
            }, 0);
        }

        errDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle text-2xl"></i>
            <div>
                <strong class="font-bold block">시스템 알림</strong>
                <span class="text-sm block mb-1">${msg}</span>
                ${retryBtnHtml}
            </div>
            <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 ml-2 self-start"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(errDiv);
        
        // Auto remove after 5s if no retry button
        if(!retryCallback) setTimeout(() => errDiv.remove(), 5000);
    },

    /**
     * Show a standardized Success Toast
     */
    showSuccess(msg) {
        document.querySelectorAll('.fixed-success-toast').forEach(e => e.remove());

        const div = document.createElement('div');
        div.className = 'fixed-success-toast fixed top-5 right-5 bg-green-100 border border-green-400 text-green-800 px-6 py-4 rounded shadow-xl z-[100] flex items-center gap-3 animate-fade-in-down';
        
        div.innerHTML = `
            <i class="fas fa-check-circle text-2xl text-green-500"></i>
            <div>
                <strong class="font-bold block text-sm">성공</strong>
                <span class="text-sm block">${msg}</span>
            </div>
            <button onclick="this.parentElement.remove()" class="text-green-500 hover:text-green-700 ml-2 self-start"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },
    
    /**
     * Alias for showSuccess (Compatibility)
     */
    showToast(msg) {
        this.showSuccess(msg);
    }
};


// --- Merged from kpiMappingTable.js ---
/**
 * assets/kpiMappingTable.js
 * 
 * Defines rules for mapping Survey/External Data to Baseline KPIs.
 * Used by DataSyncEngine.
 */

const KpiMapping = {
    // 1. Survey Data Mapping
    // Source Keys correspond to fields in the mocked external data
    survey: {
        'q_medical_access': { 
            target: 'SI', // Service Inconvenience
            type: 'inconvenience', // Higher value = Higher Score (Bad)
            weight: 1.0,
            label: '의료 접근성 불편 응답'
        },
        'q_traffic_access': { 
            target: 'LAI', // Living Amenity Inconvenience
            type: 'inconvenience', 
            weight: 0.8,
            label: '대중교통 불편 응답'
        },
        'q_digital_gap': { 
            target: 'DI', // Digital Inconvenience
            type: 'inconvenience',
            weight: 1.0,
            label: '디지털 기기 사용 어려움'
        },
        'q_community_participation': { 
            target: 'CGS', // Community Governance Score
            type: 'positive', // Higher value = Higher Score (Good)
            weight: 1.0,
            label: '마을 운영 참여 의향'
        },
        'q_settlement_intent': {
            target: 'PTS', // Population Transition Score
            type: 'positive',
            weight: 1.0,
            label: '정주/이주 의향'
        }
    },

    // 2. Revenue/Admin Data Mapping
    admin: {
        'total_visitor_revenue': {
            target: 'SUS', // Sustainability
            type: 'revenue_scale', // Special logic needed (normalize revenue to 0-100)
            weight: 1.0,
            scaleFactor: 0.001 // e.g., 100,000 KRW -> 100 Point? No, 100,000,000 -> 100?
                             // Let's assume input is raw Won. 1000만원 = 10??
        }
    }
};

window.KpiMapping = KpiMapping;




// --- Merged from auditLogger.js ---
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



// --- Merged from 02_bus.js ---
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


// --- Merged from 03_datastore.js ---
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
        activeVillage: '모항리', // For Tab 3 toggle
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


// --- Merged from 04_api.js ---
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
     * @param {object} data Parameters (for GET) or Payload (for POST)
     * @param {string} method HTTP method ('GET' or 'POST')
     * @param {number} timeoutMs Timeout in milliseconds
     * @returns {Promise<any>}
     */
    async callAction(action, data = {}, method = "GET", timeoutMs = 30000) {
        const url = new URL(App.config.SURVEY_SCRIPT_URL);
        url.searchParams.set("action", action);

        // AUTH-03: Auto-include pass if available in the global namespace
        const pass = (window.APP && window.APP.auth && window.APP.auth.pass);
        if (pass) {
            url.searchParams.set("pass", pass);
        }
        
        const fetchOptions = {
            method,
        };

        if (method === "GET") {
            Object.entries(data).forEach(([k, v]) => url.searchParams.set(k, String(v)));
        } else {
            const payload = { ...data };
            if (pass && !payload.pass) payload.pass = pass;
            fetchOptions.body = JSON.stringify(payload);
            // Use text/plain to avoid CORS preflight (OPTIONS) which GAS doesn't handle well
            fetchOptions.headers = { "Content-Type": "text/plain;charset=utf-8" };
        }

        const reqKey = action + method + JSON.stringify(data);

        // Abort previous redundant request if still pending
        if (this._controllers[reqKey]) {
            this._controllers[reqKey].abort('Duplicate request cancelled');
        }

        const controller = new AbortController();
        this._controllers[reqKey] = controller;
        fetchOptions.signal = controller.signal;

        const timeoutId = setTimeout(() => controller.abort('Timeout exceeded'), timeoutMs);

        try {
            console.log(`[App.api] ${method}: ${action}`, data);
            const res = await fetch(url.toString(), fetchOptions);
            
            clearTimeout(timeoutId);
            delete this._controllers[reqKey];

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} Error`);
            }
            
            const result = await res.json();
            
            if (result.status === 'error' || result.error) {
                throw new Error(result.message || result.error || 'Unknown API Error');
            }
            
            return result;

        } catch (error) {
            clearTimeout(timeoutId);
            delete this._controllers[reqKey];
            
            if (error.name === 'AbortError') {
                console.warn(`[App.api] Request aborted/timeout: ${action}`);
                throw new Error(`데이터 처리 중 오류가 발생했습니다 (${action})`);
            }
            console.error(`[App.api] API Failed (${action}):`, error);
            throw error;
        }
    }
};


// --- Merged from 05_cache.js ---
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


// --- Merged from 08_helpData.js ---
/**
 * 08_helpData.js
 * Standardized Help/Definition Data for Dashboard Cards
 * Ticket 03: Modal 공통화+ cardHelp 데이터 분리
 */

window.App = window.App || {};

App.helpData = {
    // Core KPIs
    RTRI: {
        title: "종합 전환 타당성 (RTRI)",
        summary: "숙박시설의 장기 체류형 공간(워케이션 등) 전환 타당성을 평가하는 핵심 종합 지수입니다.",
        formula: "(전환 가능 객실 * 0.3) + (숙박업주 참여 의지 * 0.2) + (주민 수용성 * 0.2) + (장기체류 수요 * 0.2) - (제약 요인 * 0.1)",
        components: ["전환 가능 객실 확보율", "숙박업주 참여 의지", "주민 수용성 (긍정 응답률)", "장기체류 수요 (일주일/한달 살기)"],
        source: "숙박업주 조사(Q21~Q24), 주민 조사(Q15~Q19), 방문객 조사(Q8~Q12) 통합",
        notes: "점수가 높을수록 사업 대상지로서의 타당성과 성공 가능성이 큽니다."
    },
    SII: {
        title: "사회서비스 불균형 지수 (SII)",
        summary: "지역 내 필수 생활 서비스(의료, 교통, 돌봄 등)의 부족 정도를 나타내는 지표입니다.",
        formula: "100 - (의료 + 교통 + 돌봄 + 인프라 + 디지털 접근성 만족도 평균)",
        components: ["의료 접근성(Q5_1)", "대중교통(Q5_2)", "돌봄/교육(Q5_3)", "문화/체육(Q5_4)"],
        source: "주민 실태조사 (Q5 만족도 문항 역산)",
        notes: "이 지수가 높을수록 서비스 결핍이 심각함을 의미하며, 사업 우선 투자 대상이 됩니다."
    },
    LSI: {
        title: "생활 서비스 수준 (LSI)",
        summary: "현재 지역 주민들이 체감하는 생활 인프라 및 서비스 만족도를 나타냅니다. (SII의 대척점)",
        formula: "(5개 분야 만족도 총점 / 만점) * 100",
        components: ["상업시설", "의료시설", "문화시설", "교통인프라"],
        source: "주민 실태조사 (Q5 만족도 문항 평균)",
        notes: "LSI 50 미만 시 우선적 개선이 필요합니다."
    },
    CGS: {
        title: "공동체 거버넌스 역량 (CGS)",
        summary: "주민들의 지역 사회 참여 의지와 역량을 평가하는 지표입니다.",
        formula: "(마을회의 참여도 + 봉사활동 의향 + 공유공간 사용 의향) 평균",
        components: ["공동체 회의 참여", "지역 봉사/기여", "시설 공동 활용 동의"],
        source: "주민 실태조사 (Q15, Q18, Q19)",
        notes: "CGS 60 이상인 지역이 주민 주도 사업(어촌신활력 등) 성공률이 높습니다."
    },
    PTS: {
        title: "인구 유도 전환 비율 (PTS)",
        summary: "워케이션, 한달살기 등 체류형 인구가 실제 지역 관계 인구로 전환될 잠재력을 측정합니다.",
        formula: "(장기 체류 희망자 / 전체 응답 방문객) * 100 수정 가중치 적용",
        components: ["전환 유효 객실 수", "전환 의향 업주 수"],
        source: "방문객 실태조사 및 숙박업주 데이터 교차",
        notes: "빈집 추이 및 숙박 가동률 저하 지역에서 이 수치가 중요합니다."
    },
    SUS: {
        title: "지속가능성 지수 (SUS)",
        summary: "관광객의 재방문, 정착, 창업 의향 등 장기적인 지역 활력 유지 가능성을 보여줍니다.",
        formula: "(재방문 의향 * 0.4) + (정착/창업 의향 * 0.6)",
        components: ["재방문 의향", "정주 관심도", "일자리/창업 관심도"],
        source: "관광객 실태조사 (Q12 ~ Q15)",
        notes: "50점 이하시 일회성 방문에 그칠 확률이 높습니다."
    },
    
    PCI_HIGH: {
        title: "고액 지불 의향 (PCI High)",
        summary: "생활서비스 이용 시 1만원 이상의 비용을 지불할 용의가 있는 주민의 비율입니다.",
        formula: "(1~3만원 + 3~5만원 + 5만원 이상 응답자 / 전체 응답자) * 100",
        components: ["기본 지불력", "프리미엄 서비스 수요"],
        source: "주민 실태조사 (Q20)",
        notes: "이 비율이 높을수록 민간 주도의 유료 서비스 도입 가능성이 큼을 의미합니다."
    },
    LSI_MEDICAL: {
        title: "의료 서비스 만족도",
        summary: "지역 내 병의원, 보건소 등 의료 기관 이용에 대한 주민들의 만족 수준입니다.",
        formula: "분야별 긍정 답변 비율 (Q9 불편사항 역산)",
        components: ["병·의원 접근성", "보건소/약국 이용"],
        source: "주민 실태조사 (Q9)",
        notes: "결핍 지수가 높을 경우 원격 의료나 이동식 진료소 등의 대안 사업이 검토되어야 합니다."
    },
    LSI_TRAFFIC: {
        title: "대중교통 만족도",
        summary: "버스, 택시 등 대중교통 이용 편의성 및 배차 간격 등에 대한 주민 만족도입니다.",
        formula: "분야별 긍정 답변 비율 (Q9 불편사항 역산)",
        components: ["버스 노선/배차", "정류장 접근성"],
        source: "주민 실태조사 (Q9)",
        notes: "교통 만족도가 낮으면 고령층의 고립 위험이 커지므로 수요 응답형 교통(DRT) 검토가 필요합니다."
    },
    LSI_CULTURE: {
        title: "문화·여가 서비스 만족도",
        summary: "마을 내 문화시설(경로당, 도서관 등) 및 여가 프로그램에 대한 주민들의 만족 수준입니다.",
        formula: "분야별 긍정 답변 비율 (Q9 불편사항 역산)",
        components: ["문화시설 이용", "여가 프로그램"],
        source: "주민 실태조사 (Q9)",
        notes: "문화적 소외감이 높은 지역은 소규모 동아리 활동 지원이나 이동식 문화 서비스를 강화해야 합니다."
    },
    LSI_HOUSING: {
        title: "주거 환경 만족도",
        summary: "골목길 정비, 가로등, 안전 등 전반적인 주거 환경에 대한 주민 체감 만족도입니다.",
        formula: "분야별 긍정 답변 비율 (Q9 불편사항 역산)",
        components: ["가로등/안전", "골목길/주차"],
        source: "주민 실태조사 (Q9)",
        notes: "주거 환경 만족도는 정주 의향과 직결되므로 마을 경관 개선 및 안전망 구축이 중요합니다."
    },
    LSI_CONVENIENCE: {
        title: "생활/편의 서비스 만족도",
        summary: "슈퍼, 식당 등 일상생활에 필수적인 상업 및 편의시설 이용에 대한 만족도입니다.",
        formula: "분야별 긍정 답변 비율 (Q9 불편사항 역산)",
        components: ["상업시설 이용", "택배/편의시설"],
        source: "주민 실태조사 (Q9)",
        notes: "도보권 내 편의시설 부재 시 구매 대행이나 순환 장터 등의 서비스 모델링이 필요합니다."
    }
};

