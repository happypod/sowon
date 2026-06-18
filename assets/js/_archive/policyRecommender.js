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
            // Prompt: "0.20 Δ(1 - SII/100)". 
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
