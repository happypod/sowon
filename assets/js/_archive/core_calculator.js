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
