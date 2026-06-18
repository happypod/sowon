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
