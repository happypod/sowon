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
