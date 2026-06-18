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
