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
        // Phase 2 Req: "기본 0.8"
        // Also: "추후 리 단위별 상이 적용 가능". For now, fixed 0.8.
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
        const budget = this.currentBudget || 10; // Default 10억 (1 Billion KRW)
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
