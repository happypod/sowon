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
