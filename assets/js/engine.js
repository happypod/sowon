// --- Merged from core_calculator.js ---
/**
 * assets/core_calculator.js
 * 
 * Phase 1 Core Algorithm Module
 * Centralizes RTRI and SII calculations for both Dashboard (Real Data) and Scenario Lab (Simulated).
 */

const CoreCalc = {
    // Weights (Phased)
    // SUS is excluded from RTRI calculation (Weight 0) as it acts as a Gate Index only.
    WEIGHTS: {
        // Phase 1: Foundation (LSI/CGS focus)
        PHASE1: { LSI: 0.50, CGS: 0.30, PTS: 0.20, SUS: 0.0 },
        // Phase 2: Expansion (Balanced)
        PHASE2: { LSI: 0.40, CGS: 0.30, PTS: 0.30, SUS: 0.0 },
        // Phase 3: Maturity (PTS focus)
        PHASE3: { LSI: 0.30, CGS: 0.30, PTS: 0.40, SUS: 0.0 },
        
        SII: { SI: 0.30, LAI: 0.40, DI: 0.30 }
    },

    /**
     * Detect Phase based on RTRI Score
     * @param {number} rtri 
     * @returns {string} 'PHASE1' | 'PHASE2' | 'PHASE3'
     */
    detectPhase(rtri) {
        if (rtri >= 75) return 'PHASE3';
        if (rtri >= 60) return 'PHASE2';
        return 'PHASE1';
    },

    /**
     * Calculate Structural Inconvenience Index (SII)
     * Formula: 0.3*SI + 0.4*LAI + 0.3*DI
     * @param {number} si - Service Inconvenience (0-100)
     * @param {number} lai - Living Amenity Inconvenience (0-100)
     * @param {number} di - Digital Inconvenience (0-100)
     * @returns {number} SII Score (0-100, float)
     */
    calculateSII(si, lai, di) {
        // Clamp inputs just in case
        const _si = Math.max(0, Math.min(100, si));
        const _lai = Math.max(0, Math.min(100, lai));
        const _di = Math.max(0, Math.min(100, di));
        
        return (0.30 * _si) + (0.40 * _lai) + (0.30 * _di);
    },

    /**
     * Calculate Rural Transition Readiness Index (RTRI)
     * Formula: Weighted Sum based on Phase
     * @param {number} sii - Structural Inconvenience Index (0-100)
     * @param {number} cgs - Community Governance Score (0-100)
     * @param {number} pts - Population Transition Score (0-100)
     * @param {number} sus - Sustainability Score (0-100)
     * @param {string} phase - 'PHASE1' (default), 'PHASE2', 'PHASE3'
     * @returns {number} RTRI Score (0-100, float)
     */
    calculateRTRI(sii, cgs, pts, sus, phase = 'PHASE1') {
        // Reverse SII for positive contribution (Lower SII is better)
        const reversedSII = 100 - Math.max(0, Math.min(100, sii));
        
        const w = this.WEIGHTS[phase] || this.WEIGHTS.PHASE1;
        return (w.LSI * reversedSII) + 
               (w.CGS * cgs) + 
               (w.PTS * pts) + 
               (w.SUS * sus);
    },

    /**
     * Calculate Feasibility
     * Formula: 0.5*CGS + 0.3*(100-SII) + 0.2*SUS
     */
    calculateFeasibility(cgs, sii, sus) {
        return (0.5 * cgs) + (0.3 * (100 - sii)) + (0.2 * sus);
    },

    /**
     * Calculate Scenario Score (SS) - Final Logic (Phase 4)
     * SS_base = 0.55*Norm(dRTRI) + 0.25*Norm(dBalance) + 0.20*Feasibility
     * SS = clamp(SS_base - Penalty_SUS, 0, 100)
     */
    calculateScenarioScore(deltaRTRI, baseSII, finalSII, finalCGS, finalSUS) {
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

        // 1. Normalize Delta RTRI (Target: +20 = 100pts)
        const norm_dRTRI = clamp((deltaRTRI / 20) * 100, 0, 100);

        // 2. Normalize Delta Balance (SII Reduction)
        // Target: -15 SII (Improvement of 15) = 100pts
        // Delta Balance = (100 - finalSII) - (100 - baseSII) = baseSII - finalSII
        const deltaBalance = baseSII - finalSII; 
        const norm_dBalance = clamp((deltaBalance / 15) * 100, 0, 100);

        // 3. Feasibility
        const feasibility = this.calculateFeasibility(finalCGS, finalSII, finalSUS);

        // 4. Base Score
        const ss_base = (0.55 * norm_dRTRI) + (0.25 * norm_dBalance) + (0.20 * feasibility);

        // 5. SUS Penalty
        let penalty = 0;
        if (finalSUS < 40) penalty = 15;
        else if (finalSUS < 50) penalty = 8;
        else if (finalSUS > 95) penalty = 10;
        else if (finalSUS > 85) penalty = 5;

        // 6. Final Score
        return clamp(ss_base - penalty, 0, 100);
    }
};

// Export for global use
window.CoreCalc = CoreCalc;


// --- Merged from scenario_delta_matrix.js ---
/**
 * scenario_delta_matrix.js
 * Phase 2 Precision Model: Policy Package Delta Table
 * 
 * Structure:
 * {
 *   package_id: {
 *     item_id: { 
 *       M: Migration (Multiplier for PTS), 
 *       LAI: Living Amenity (Multiplier for LSI/CGS), 
 *       SI: Service Inconvenience (Impact on SI),
 *       DI: Digital Inconvenience (Impact on DI),
 *       CGS: Community Governance (Impact on CGS),
 *       SUS: Sustainability (Impact on SUS),
 *       weightImpact: Base Weight (Default 1.0)
 *     }
 *   }
 * }
 * 
 * Note: These values are 'Base Deltas'. 
 * Final Delta = Base Delta * Intensity Multiplier * Feasibility Coefficient
 */

const ScenarioDelta = {
    A: { // Life Service Package
        A1: { name: '의료 개선',     M: 5,  LAI: 15, SI: -20, SUS: -2, weightImpact: 1.2 },
        A2: { name: '빈집 정비',     M: 8,  LAI: 10, CGS: 5,  SUS: 2,  weightImpact: 1.0 },
        A3: { name: '광역 교통',     M: 10, LAI: 5,  SI: -10, SUS: -1, weightImpact: 1.1 },
        A4: { name: '생활 편의',     M: 3,  LAI: 8,  SI: -5,  SUS: 3,  weightImpact: 0.8 },
    },
    B: { // Governance Package
        B1: { name: '주민 협의체',   CGS: 20, LAI: 5, PTS: 5,  SUS: 0,  weightImpact: 1.5 },
        B2: { name: '갈등 관리',     CGS: 15, LAI: 3, PTS: 3,  SUS: 0,  weightImpact: 1.2 },
        B3: { name: '공동체 기금',   CGS: 10, SUS: 4, PTS: 2,  SI: -2,  weightImpact: 1.0 },
        B4: { name: '리더 교육',     CGS: 8,  PTS: 5, SUS: 2,  SI: 0,   weightImpact: 0.9 },
    },
    C: { // Transition Support Package
        C1: { name: '임대 주택',     PTS: 25, M: 15,  LAI: 5,  SUS: 3,  weightImpact: 1.4 },
        C2: { name: '일자리 연계',   PTS: 20, M: 10,  SUS: 5, CGS: 5,  weightImpact: 1.3 },
        C3: { name: '귀촌 교육',     PTS: 10, CGS: 5, LAI: 2,  SUS: 2,  weightImpact: 1.0 },
        C4: { name: '체류 프로그램', PTS: 8,  CGS: 3, SI: -3,  SUS: 6, weightImpact: 0.9 },
    },
    D: { // Sustainability Package
        D1: { name: '전환 객실 확보', SUS: 5, PTS: 2 },
        D2: { name: '가동률 개선',    SUS: 6, CGS: 1 },
        D3: { name: '거점 매출 확대', SUS: 7 },
        D4: { name: '운영비 효율화',  SUS: 4 }
    }
};

// Expose for usage
window.ScenarioDelta = ScenarioDelta;


// --- Merged from deltaLearningEngine.js ---
/**
 * assets/deltaLearningEngine.js
 * 
 * Implements "Learning Type" Delta Correction.
 * Updates ScenarioDelta based on actual feedback.
 */

const DeltaLearningEngine = {
    const: {
        WEIGHT_OLD: 0.7,
        WEIGHT_NEW: 0.3
    },

    init() {
        console.log("[DeltaLearning] Initializing...");
        this.loadLearnedDeltas();
    },

    /**
     * Feedback Input
     * @param {string} packageId - 'A'
     * @param {string} itemId - 'A1'
     * @param {Object} actualDeltas - { 'LAI': -8, 'CGS': 2 }
     */
    learn(packageId, itemId, actualDeltas) {
        if (!window.ScenarioDelta || !window.ScenarioDelta[packageId] || !window.ScenarioDelta[packageId][itemId]) {
            console.error("[DeltaLearning] Invalid ID");
            return;
        }

        const target = window.ScenarioDelta[packageId][itemId];
        
        Object.entries(actualDeltas).forEach(([key, actualVal]) => {
            if (target.hasOwnProperty(key)) {
                const oldVal = target[key];
                const newVal = (oldVal * this.const.WEIGHT_OLD) + (actualVal * this.const.WEIGHT_NEW);
                
                // Update Memory
                target[key] = parseFloat(newVal.toFixed(2));
                console.log(`[DeltaLearning] Updated ${itemId}.${key}: ${oldVal} -> ${newVal.toFixed(2)}`);
            }
        });

        this.saveLearnedDeltas();
        alert(`[학습 완료] ${itemId}의 Delta 값이 보정되었습니다.`);
    },

    saveLearnedDeltas() {
        localStorage.setItem('moalab_learned_deltas', JSON.stringify(window.ScenarioDelta));
    },

    loadLearnedDeltas() {
        const saved = localStorage.getItem('moalab_learned_deltas');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Deep merge/override to ensure structure safety? 
                // For prototype, direct override is okay if structure matches.
                // Better: Iterate and apply to allow code updates to structure.
                Object.keys(parsed).forEach(pkg => {
                    if(window.ScenarioDelta[pkg]) {
                        Object.keys(parsed[pkg]).forEach(item => {
                             if(window.ScenarioDelta[pkg][item]) {
                                 window.ScenarioDelta[pkg][item] = parsed[pkg][item];
                             }
                        });
                    }
                });
                console.log("[DeltaLearning] Loaded learned deltas from storage.");
            } catch (e) {
                console.error("[DeltaLearning] Failed to load deltas", e);
            }
        }
    }
};

window.DeltaLearningEngine = DeltaLearningEngine;

// Auto-init
window.addEventListener('DOMContentLoaded', () => {
    DeltaLearningEngine.init();
});


// --- Merged from participationPredictor.js ---
/**
 * assets/participationPredictor.js
 * Predicts Usage, Participation, and Willingness-to-Pay.
 * Uses explainable probabilistic models (Logistic/Score-based).
 */

const ParticipationPredictor = {
    
    predict(regionBaseline, finalResult) {
        AuditLogger.log('PREDICTOR', 'INPUT', 'Starting prediction', { region: regionBaseline, result: finalResult });

        // 1. Inputs
        const CGS = finalResult.final.CGS;
        const PTS = finalResult.final.PTS;
        const LSI = finalResult.final.LSI;
        const SUS = finalResult.final.SUS;

        // 2. Models

        // A. Facility Usage Rate (Monthly)
        // Logic: LSI (Convenience) drives access, PTS (Relation) drives frequency.
        // Formula: (LSI * 0.6 + PTS * 0.4) / 100 -> %
        const usageRate = (LSI * 0.6 + PTS * 0.4);
        
        // B. Governance Participation Size
        // Logic: CGS directly correlates to active participation.
        // CGS 0-100. expected active core % = CGS * 0.15 (Max 15% of pop)
        const participationRate = CGS * 0.15;

        // C. Willingness to Pay (Fee Acceptance)
        // Logic: High Service Quality (LSI) + High Sustainability Awareness (SUS)
        // Formula: (LSI * 0.5 + SUS * 0.5)
        // Threshold: > 60 usually pays.
        const willingnessScore = (LSI * 0.5 + SUS * 0.5);

        // 3. Uncertainty / Reliability Check
        // If CGS is very low, participation prediction is volatile.
        // If Data Sync was not used (mock check), reliability is lower.
       let reliability = 'HIGH';
        let items = [];

        if (CGS < 40) {
            reliability = 'LOW';
            items.push("CGS(주민신뢰) 40점 미만으로 예측 변동성 큼");
        }
        
        // Output Construction
        const prediction = {
            usage: {
                label: '거점 시설 이용률(월)',
                value: usageRate.toFixed(1) + '%',
                range: `${(usageRate * 0.9).toFixed(1)}~${(usageRate * 1.1).toFixed(1)}%`
            },
            participation: {
                label: '공동운영 참여 규모',
                value: participationRate.toFixed(1) + '% (전체 주민 대비)',
                grade: participationRate > 10 ? 'High' : participationRate > 5 ? 'Med' : 'Low'
            },
            payment: {
                label: '유료화 수용 가능성',
                value: willingnessScore.toFixed(1) + '점',
                verdict: willingnessScore > 60 ? '긍정적' : '부정적'
            },
            meta: {
                reliability: reliability,
                notes: items
            }
        };

        AuditLogger.log('PREDICTOR', 'OUTPUT', 'Prediction generated', prediction);
        return prediction;
    }
};

window.ParticipationPredictor = ParticipationPredictor;


// --- Merged from policyRecommender.js ---
/**
 * assets/policyRecommender.js
 * Rule-based + Scoring Hybrid Recommendation Engine.
 * Generates Top 3 Scenarios based on fixed Phase 2 formula.
 */

const PolicyRecommender = {
    
    // Config
    CANDIDATE_COUNT: 40, // Generate this many, then rank
    MAX_PER_BLOCK: 2,
    MIN_TOTAL: 4,
    MAX_TOTAL: 6,

    /**
     * Generate Top 3 Recommendations
     * @param {string} regionKey 
     * @param {Object} currentBaseline 
     * @param {number} budget 
     */
    recommend(regionKey, currentBaseline, budget) {
        AuditLogger.log('RECOMMENDER', 'INPUT', 'Starting recommendation', { region: regionKey });
        
        const validCandidates = [];
        const packages = window.ScenarioDelta 
            ? Object.keys(window.ScenarioDelta).flatMap(g => Object.keys(window.ScenarioDelta[g])) 
            : []; // ['A1', 'A2', ... 'D4']

        // 1. Candidate Generation (Heuristic Random)
        for(let i=0; i<this.CANDIDATE_COUNT; i++) {
            const selection = this._generateRandomSelection(packages);
            if (selection) validCandidates.push(selection);
        }

        // 2. Scoring & Simulation
        const scoredResults = validCandidates.map(sel => {
            // Setup Engine Context (Save/Restore)
            const prevSelections = PolicyEngine.selections;
            PolicyEngine.selections = sel;
            // setBudget for RTEI calc
            PolicyEngine.setBudget(budget);
            
            // Run Simulation
            const result = PolicyEngine.calculate(currentBaseline);
            
            // Restore
            PolicyEngine.selections = prevSelections;

            // Score Logic (Fixed Formula)
            // RecScore = 0.55*dRTRI + 0.20*d(LSI_norm) + 0.15*RTEI + 0.10*Feas
            // Note: User prompt says d(1-SII/100) which is d(LSI_norm). 
            // result.delta.LSI is 0-100 scale. d(LSI_norm) is 0-1 scale.
            // Let's use result.delta.LSI / 100 for proper scale if RTRI is 0-100?
            // Wait, RTRI is 0-100. dRTRI is e.g. 5.
            // RTEI is 0-X (e.g. 50).
            // Feas is 80 (0-100).
            // If we use raw numbers: 0.55*5 + 0.20*0.05 + ... -> Term 2 vanishes.
            // User likely meant "Delta SII Point" or "Delta LSI Point".
            // Prompt: "0.20 ?(1 - SII/100)". 
            // If SII goes 40 -> 35 (Improvement 5).
            // (1 - 0.35) - (1 - 0.40) = 0.65 - 0.60 = 0.05.
            // 0.20 * 0.05 = 0.01. Negligible.
            // I will assume they meant "Delta LSI Score" (Improvement in SII 5 points = +5 LSI).
            // Let's use `result.delta.LSI` (which is roughly -delta.SII).
            // Let's use `Math.abs(result.delta.SII)` or `result.delta.LSI`.
            
            const score = (0.55 * result.delta.RTRI) + 
                          (0.20 * result.delta.LSI) + // Assuming LSI point change
                          (0.15 * result.rtei.value) + 
                          (0.10 * result.feasibility);

            return {
                selection: sel,
                result: result,
                totalScore: score,
                isRisky: result.final.SUS < 50
            };
        });

        // 3. Filtering & Ranking
        // Filter out SUS < 50 (unless we want to show risk)
        // User: "Exclude if SUS < 50 (default)".
        const filtered = scoredResults.filter(r => !r.isRisky);
        
        // Sort DESC
        filtered.sort((a,b) => b.totalScore - a.totalScore);

        // Pick Top 3
        const top3 = filtered.slice(0, 3).map((item, index) => {
            return {
                rank: index + 1,
                ...item,
                reasoning: [
                    `RTRI 개선 효과 탁월 (+${item.result.delta.RTRI.toFixed(1)})`,
                    `투자 효율(RTEI) ${item.result.rtei.grade} 등급`,
                    `구조적 불균형(SII) ${Math.abs(item.result.delta.SII).toFixed(1)}점 완화`
                ]
            };
        });

        AuditLogger.log('RECOMMENDER', 'OUTPUT', 'Generated Top 3', { count: top3.length });
        return top3;
    },

    _generateRandomSelection(allPackages) {
        const sel = {};
        const count = Math.floor(Math.random() * (this.MAX_TOTAL - this.MIN_TOTAL + 1)) + this.MIN_TOTAL;
        
        // Shuffle
        const shuffled = [...allPackages].sort(() => 0.5 - Math.random());
        
        let added = 0;
        const blockCounts = { A:0, B:0, C:0, D:0 };

        for(let pkg of shuffled) {
            if(added >= count) break;
            const block = pkg.charAt(0);
            if(blockCounts[block] < this.MAX_PER_BLOCK) {
                // Determine Intensity: mostly MID(1.0), rare HIGH(1.3)
                // 80% MID, 20% HIGH
                const intensity = Math.random() > 0.8 ? 'HIGH' : 'MID';
                sel[pkg] = intensity;
                blockCounts[block]++;
                added++;
            }
        }
        
        return sel;
    }
};

window.PolicyRecommender = PolicyRecommender;


// --- Merged from multiYearSimulator.js ---
/**
 * assets/multiYearSimulator.js
 * Project 2-5 year trajectory of KPIs based on investment plan.
 */

const MultiYearSimulator = {
    
    /**
     * Run Simulation
     * @param {number} years - Duration (e.g. 3)
     * @param {Object} initialBaseline 
     * @param {Object} basePlan - { selections, budget } to repeat/apply
     */
    simulate(years, initialBaseline, basePlan) {
        AuditLogger.log('SIMULATOR', 'INPUT', 'Starting Multi-Year Sim', { years });
        
        const trajectory = [];
        let currentBase = JSON.parse(JSON.stringify(initialBaseline)); // Deep copy start

        for(let y=1; y<=years; y++) {
            // Setup Engine
            const prevSelections = PolicyEngine.selections;
            PolicyEngine.selections = basePlan.selections; // Assume constant strategy for now
            PolicyEngine.setBudget(basePlan.budget);

            // Calculate Year Result
            // Note: We need a way to apply the delta PERMANENTLY to the base for the next year.
            // PolicyEngine.calculate returns { base, final, delta }.
            // The 'final' is what we want as next year's base.
            const result = PolicyEngine.calculate(currentBase);
            
            // Store
            trajectory.push({
                year: `Y+${y}`,
                metrics: result.final,
                rtei: result.rtei,
                phase: result.final.Phase,
                sii: result.final.SII
            });

            // Update Base for next loop
            currentBase = {
                LSI: result.final.LSI,
                CGS: result.final.CGS,
                PTS: result.final.PTS,
                SUS: result.final.SUS,
                SII_components: result.final.SII_components 
            };
            
            // Restore Engine
            PolicyEngine.selections = prevSelections;
        }

        AuditLogger.log('SIMULATOR', 'OUTPUT', 'Trajectory generated', { length: trajectory.length });
        return trajectory;
    }
};

window.MultiYearSimulator = MultiYearSimulator;


// --- Merged from scenario_engine.js ---
/**
 * assets/scenario_engine.js
 * Policy Insight Engine - Core Logic & Data
 */

const PolicyEngine = {
    // =========================================================================
    // 1. Policy Package Definitions (Immutable)
    // =========================================================================
    // =========================================================================
    // 1. Policy Package Definitions (Dynamic from ScenarioDelta)
    // =========================================================================
    get PACKAGES() {
        // Transform ScenarioDelta into the structure expected by UI rendering
        if(!window.ScenarioDelta) return {};
        const packages = {};
        Object.entries(window.ScenarioDelta).forEach(([pkgId, items]) => {
            packages[pkgId] = {
                id: pkgId,
                name: this.getPackageName(pkgId),
                items: Object.entries(items).map(([itemId, data]) => ({
                    id: itemId,
                    name: data.name,
                    delta: data // Keep full delta object
                }))
            };
        });
        return packages;
    },

    getPackageName(id) {
        const names = { A: 'Life Service 패키지', B: 'Governance 패키지', C: 'Transition 패키지', D: 'Sustainability 패키지' };
        return names[id] || `${id} 패키지`;
    },

    // =========================================================================
    // 2. Region Definitions (Phase 2 Ri-Unit Separation)
    // =========================================================================
    REGIONS: {
        'ALL': { name: '소원면 전체', baseline: { LSI: 65, CGS: 60, PTS: 50, SUS: 45, SII_components: { SI: 35, LAI: 40, DI: 40 } } },
        'UIHANG': { name: '의항리',   baseline: { LSI: 58, CGS: 68, PTS: 42, SUS: 32, SII_components: { SI: 42, LAI: 32, DI: 48 } } }, // Uihang 1+2 Avg
        'MOHANG': { name: '모항리',   baseline: { LSI: 70, CGS: 50, PTS: 60, SUS: 60, SII_components: { SI: 30, LAI: 50, DI: 30 } } }  // Mohang 3
    },

    currentRegion: 'ALL',

    setRegion(regionKey) {
        if (this.REGIONS[regionKey]) {
            this.currentRegion = regionKey;
        }
    },

    INTENSITY: {
        LOW: { val: 0.7, label: '약' },
        MID: { val: 1.0, label: '중' },
        HIGH: { val: 1.3, label: '강' }
    },

    // Current State Selection: { 'A1': 'MID', 'B2': 'LOW' ... }
    selections: {},

    // =========================================================================
    // 2. Calculation Engine
    // =========================================================================
    
    /**
     * Calculate Scenario Result based on current selections and baseline data
     * Formula: Delta = MatrixValue * Intensity(0.7|1.0|1.3) * Feasibility(0.8)
     */
    calculate(baseline) {
        // 0. Base Feasibility
        // Phase 2 Req: "湲곕낯 0.8"
        // Also: "異뷀썑 由??⑥쐞蹂??곸씠 ?곸슜 媛??. For now, fixed 0.8.
        // 0. Base Feasibility
        // Dynamic Calculation in Phase 4 

        // 1. Initialize Deltas
        let delta = {
            LSI: 0, CGS: 0, PTS: 0, SUS: 0,
            SI: 0, LAI: 0, DI: 0,
            M: 0 
        };

        // 2. Sum up Deltas from Selected Items
        Object.entries(this.selections).forEach(([itemId, intensityKey]) => {
            const intensity = this.INTENSITY[intensityKey]?.val || 0;
            const packageId = itemId.charAt(0);
            
            // SUS Specific Intensity Multipliers (Phase 2 Refinement)
            const susMultipliers = { LOW: 0.4, MID: 0.8, HIGH: 1.1 };
            const susIntensity = susMultipliers[intensityKey] || 0;

            // Look up in ScenarioDelta directly
            const itemData = window.ScenarioDelta?.[packageId]?.[itemId];

            if (itemData) {
                // Apply Formula: Value * Intensity * Feasibility
                // Exclude 'name' and 'weightImpact' from summing
                Object.entries(itemData).forEach(([key, val]) => {
                    if(['name', 'weightImpact'].includes(key)) return;

                    // Apply SUS-specific intensity if key is SUS
                    const AppliedIntensity = (key === 'SUS') ? susIntensity : intensity;
                    const effectiveDelta = val * AppliedIntensity;

                    // Mapping
                    if (key === 'SII_base') {
                         // Legacy handler
                         delta.SI += (effectiveDelta * 0.5);
                         delta.LAI += (effectiveDelta * 0.5);
                    } else if (delta.hasOwnProperty(key)) {
                        delta[key] += effectiveDelta;
                    }
                });
            }
        });
        
        // SUS Cap Enforcement (Max Delta +25)
        if (delta.SUS > 25) delta.SUS = 25;

        // 3. Calculate New Values (Clamped 0-100 where appropriate)
        const clamp = (v) => Math.max(0, Math.min(100, v));

        // Baseline Deconstruction
        const base_SI = baseline.SII_components?.SI || 0;
        const base_LAI = baseline.SII_components?.LAI || 0;
        const base_DI = baseline.SII_components?.DI || 0;

        // New Component Values
        const new_SI = clamp(base_SI + delta.SI);
        const new_LAI = clamp(base_LAI + delta.LAI);
        const new_DI = clamp(base_DI + delta.DI);
        
        // CGS, PTS, SUS
        const final_CGS = clamp(baseline.CGS + delta.CGS);
        const final_PTS = clamp(baseline.PTS + delta.PTS);
        const final_SUS = clamp(baseline.SUS + delta.SUS);

        // CoreLogic: SII
        const base_SII = CoreCalc.calculateSII(base_SI, base_LAI, base_DI);
        const final_SII = CoreCalc.calculateSII(new_SI, new_LAI, new_DI);
        const delta_SII = final_SII - base_SII;

        // CoreLogic: LSI
        // Phase 2 Precision: LSI might have its own delta from LAI improvements or explicit LSI delta?
        // Matrix has LAI. Improving LAI improves LSI.
        // Let's deduce LSI delta from LAI delta + explicit LSI delta?
        // Matrix doesn't have explicit LSI key, it has LAI. 
        // LSI is roughly 100 - LAI? Or just a score.
        // Let's apply LAI delta inverse to LSI? Or just use what we have.
        // Current Matrix: A1 has LAI: -5. Negative LAI is good.
        // Improving LAI (lower val) should increase LSI (higher val).
        // Let's assume LSI += (Delta LAI * -1) * Weight?
        // Or simply: LSI += delta.LSI (if exists) + (delta.LAI * -1).
        
        // Matrix has no LSI key. It has LAI.
        // Let's assume LSI improves by the amount LAI decreases.
        const derived_LSI_delta = (delta.LAI * -1); 
        const final_LSI = clamp(baseline.LSI + derived_LSI_delta); 

        // 4. RTRI Calculation (Phase 2: Auto-Transition)
        
        // A. Base RTRI & Phase
        // First calc with Phase 1 logic to determine entry phase
        let base_RTRI = CoreCalc.calculateRTRI(base_SII, baseline.CGS, baseline.PTS, baseline.SUS, 'PHASE1');
        const base_Phase = CoreCalc.detectPhase(base_RTRI);
        // Optional: Re-calc Base with its detected phase weights? 
        base_RTRI = CoreCalc.calculateRTRI(base_SII, baseline.CGS, baseline.PTS, baseline.SUS, base_Phase);

        // B. Final RTRI & Phase
        let final_RTRI = CoreCalc.calculateRTRI(final_SII, final_CGS, final_PTS, final_SUS, 'PHASE1');
        const final_Phase = CoreCalc.detectPhase(final_RTRI);
        final_RTRI = CoreCalc.calculateRTRI(final_SII, final_CGS, final_PTS, final_SUS, final_Phase);

        const delta_RTRI = final_RTRI - base_RTRI;

        // 5. Scenario Score (SS) - New Logic Phase 4
        // Calculate Feasibility dynamically
        const feasibilityScore = CoreCalc.calculateFeasibility(final_CGS, final_SII, final_SUS);
        
        // Calculate SS
        const score_SS = CoreCalc.calculateScenarioScore(delta_RTRI, base_SII, final_SII, final_CGS, final_SUS);

        // 6. RTEI Calculation (Return on Transition Investment)
        // Formula: (Delta RTRI / Budget) * 100
        const budget = this.currentBudget || 10; // Default 10??(1 Billion KRW)
        const RTEI = budget > 0 ? (delta_RTRI / budget) * 100 : 0;
        
        let efficiencyGrade = 'D';
        if (RTEI >= 20) efficiencyGrade = 'A';
        else if (RTEI >= 10) efficiencyGrade = 'B';
        else if (RTEI >= 5) efficiencyGrade = 'C';

        return {
            base: { 
                SII: base_SII, RTRI: base_RTRI, LSI: baseline.LSI, CGS: baseline.CGS, PTS: baseline.PTS, SUS: baseline.SUS, Phase: base_Phase,
                SII_components: { SI: base_SI, LAI: base_LAI, DI: base_DI }
            },
            final: { 
                SII: final_SII, RTRI: final_RTRI, LSI: final_LSI, CGS: final_CGS, PTS: final_PTS, SUS: final_SUS, Phase: final_Phase,
                SII_components: { SI: new_SI, LAI: new_LAI, DI: new_DI }
            },
            delta: { SII: delta_SII, RTRI: delta_RTRI, LSI: final_LSI - baseline.LSI, CGS: final_CGS - baseline.CGS, PTS: final_PTS - baseline.PTS, SUS: final_SUS - baseline.SUS },
            score: score_SS,
            feasibility: feasibilityScore,
            isSusWarning: final_SUS < 50,
            rtei: { value: RTEI, grade: efficiencyGrade, budget: budget }
        };
    },

    currentBudget: 10, // Default State
    setBudget(val) {
        this.currentBudget = parseFloat(val) || 0;
    },

    calculateFeasibility() {
        // Deprecated in favor of fixed coefficient in calculate() for Phase 2,
        // but kept for compatibility if needed.
        return 80;
    },

    // =========================================================================
    // 3. Text Generation & Management
    // =========================================================================

    generateInsight(result) {
        // Return Insight Cards Data
        return {
            life: `생활서비스 ${Math.abs(result.delta.LSI).toFixed(1)}점 ${result.delta.LSI >= 0 ? '개선' : '하락'}`,
            gov: `주민거버넌스 ${Math.abs(result.delta.CGS).toFixed(1)}점 ${result.delta.CGS >= 0 ? '강화' : '약화'}`,
            trans: `전환역량 ${Math.abs(result.delta.PTS).toFixed(1)}점 ${result.delta.PTS >= 0 ? '확보' : '손실'}`,
            sus: `지속가능성 ${result.final.SUS.toFixed(1)}점 (${result.delta.SUS >= 0 ? '+' : ''}${result.delta.SUS.toFixed(1)})`
        };
    },

    // Phase 2: Structural Report Generation (JSON)
    generateReportJSON(result) {
        const d = result.delta;
        const f = result.final;
        const regionName = this.REGIONS[this.currentRegion]?.name || '전체';
        
        // Logic for Strategy Selection
        let strategyFocus = '';
        if(f.Phase === 'PHASE1') strategyFocus = '기초 인프라 정비 및 주민 신뢰(CGS) 확보';
        else if(f.Phase === 'PHASE2') strategyFocus = '관계인구 유입 확대(PTS) 및 생활 서비스 고도화';
        else strategyFocus = '자생적 수익 구조(SUS) 확립 및 정주 전환 가속화';

        return {
            summary: `[${regionName}] ${strategyFocus}를 위한 전략 시뮬레이션 결과`,
            imbalance: `서비스 및 편의시설 부족으로 인한 구조적 불편(SII)이 ${f.SII.toFixed(1)}로 ${d.SII < 0 ? '완화' : '여전히 높음'}.`,
            strategy: `선택된 정책 조합은 ${d.RTRI.toFixed(1)}점의 RTRI 상승을 견인하며, ${f.Phase} 단계 진입을 목표로 함.`,
            phase: `현재 단계: ${f.Phase} / 목표 가중치 적용: ${f.Phase === 'PHASE1' ? '생활/거버넌스 집중' : f.Phase === 'PHASE2' ? '균형 성장' : '수익성 강화'}`,
            sustainability: `재정 건전성(SUS)은 ${f.SUS.toFixed(1)}점으로 ${f.isSusWarning ? '보완 투자 필요' : '안정적'}`,
            fullText: '' // Will be filled by combine
        };
    },

    generatePolicySentence(result) {
        // Expanded 12-15 line logic
        const r = this.generateReportJSON(result);
        
        let sent = `📄 [운영계획서 초안 - ${this.REGIONS[this.currentRegion].name}]\n\n`;
        sent += `1. **지역 진단 및 목표**\n`;
        sent += `   - 본 지역은 ${r.summary}가 요구됩니다.\n`;
        sent += `   - 현재 구조적 불균형(SII) 지수는 ${result.final.SII.toFixed(1)}이며, 이를 해결하기 위한 인프라 투자가 선행되어야 합니다.\n\n`;
        
        sent += `2. **전략적 시뮬레이션 결과**\n`;
        sent += `   - 종합 정주 전환 준비도(RTRI)는 ${result.final.RTRI.toFixed(1)}점(▲${result.delta.RTRI.toFixed(1)})으로 향상되었습니다.\n`;
        sent += `   - ${r.strategy}\n`;
        sent += `   - 특히 관계인구 전환 역량(PTS)이 ${result.final.PTS.toFixed(1)}점으로 확보되어, 잠재 수요를 실거주로 유도할 기반이 마련되었습니다.\n\n`;

        sent += `3. **단계별 이행 로드맵 (${result.final.Phase})**\n`;
        sent += `   - ${r.phase}\n`;
        sent += `   - ${result.final.Phase === 'PHASE1' ? '주민 협의체의 주도권 확보가 우선' : '프로그램 수익화 및 체류형 상품 개발 권장'}.\n\n`;

        sent += `4. **재무적 타당성 검토**\n`;
        sent += `   - 예상 지속가능성 지수(SUS): ${result.final.SUS.toFixed(1)}점.\n`;
        
        // SUS Warning Logic (Phase 2 Refinement)
        if (result.final.SUS >= 95) {
            sent += `   - ⚠ **[경고]** 지속가능성 수치가 과도하게 높습니다(${result.final.SUS.toFixed(1)}). 현실성과 정합성에 대한 재검토가 필요합니다.\n`;
        } else if (result.final.SUS >= 80) {
            sent += `   - ℹ **[알림]** 재정 지속가능성은 안정권이나, 생활서비스 기반 정주 전환과의 균형 점검이 필요합니다.\n`;
        } else {
            sent += `   - ${r.sustainability}.\n`;
        }

        sent += `   - 초기 국비 지원 의존도를 낮추기 위해 마을 기업 기반의 수익 모델(${result.final.SUS < 40 ? '필수 도입' : '확장'})이 제안됩니다.\n`;
        
        // ROI info
        if(result.rtei) {
            sent += `   - 투입 예산 대비 효율(RTEI)은 ${result.rtei.value.toFixed(1)}점(등급 ${result.rtei.grade})으로 분석됩니다.`;
        }
        
        return sent;
    },

    // Phase 3: Public Report Generation (Automated Format)
    generatePublicReport(result) {
        const r = this.generateReportJSON(result); // Reuse base logic
        const f = result.final;
        const d = result.delta;
        
        return {
             title: `2025년 ${this.REGIONS[this.currentRegion].name} 정주환경 전환 계획서`,
             executiveSummary: r.summary,
             imbalanceAnalysis: `구조적 불편지수(SII) ${f.SII.toFixed(1)} (변동 ${d.SII.toFixed(1)}). 주거/서비스 빈틈을 메우기 위한 인프라 확충 시급.`,
             strategy4Block: `LSI(${d.LSI.toFixed(1)}↑), CGS(${d.CGS.toFixed(1)}↑), PTS(${d.PTS.toFixed(1)}↑), SUS(${d.SUS.toFixed(1)}↑)의 4축 균형 성장 전략 수립.`,
             phaseStrategy: `${f.Phase} 단계 진입 목표. ${f.Phase === 'PHASE1' ? '기반항목(LSI/CGS) 우선 투자' : '성장항목(PTS/SUS) 중심 고도화'}.`,
             financialSupport: `예상 소요 예산 ${this.currentBudget}억원. 예상 RTEI ${result.rtei?.value.toFixed(1) || 0}점.`,
             conclusion: `본 시나리오는 주민 삶의 질 개선과 관계인구 유입을 동시에 달성할 수 있는 최적안으로 판단됨.`
        };
    },
    // =========================================================================
    // 4. Save & Compare (Phase 2)
    // =========================================================================
    savedScenarios: [],

    saveScenario(result) {
        const id = Date.now().toString().slice(-4);
        const snapshot = {
            id: id,
            timestamp: new Date(),
            region: this.currentRegion,
            selections: JSON.parse(JSON.stringify(this.selections)),
            result: JSON.parse(JSON.stringify(result))
        };
        this.savedScenarios.push(snapshot);
        alert(`시나리오(ID: ${id})가 저장되었습니다.`);
        return snapshot;
    },

    compareScenarios(idA, idB) {
        const a = this.savedScenarios.find(s => s.id === idA);
        const b = this.savedScenarios.find(s => s.id === idB);
        if(!a || !b) return null;

        return {
            a: a,
            b: b,
            delta_RTRI: b.result.final.RTRI - a.result.final.RTRI,
            delta_SII: b.result.final.SII - a.result.final.SII,
            delta_SS: b.result.score - a.result.score,
            recommendation: b.result.score > a.result.score ? b.id : a.id
        };
    }
};

window.PolicyEngine = PolicyEngine;


// --- Consolidated Engine Namespace ---
window.Engine = {
    CoreCalc: window.CoreCalc,
    ScenarioDelta: window.ScenarioDelta,
    DeltaLearningEngine: window.DeltaLearningEngine,
    ParticipationPredictor: window.ParticipationPredictor,
    PolicyRecommender: window.PolicyRecommender,
    MultiYearSimulator: window.MultiYearSimulator,
    PolicyEngine: window.PolicyEngine
};

