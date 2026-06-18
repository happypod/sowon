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
            label: '디지털 기기 활용 어려움'
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
                             // Let's assume input is raw Won. 1000만원 = 10점?
        }
    }
};

window.KpiMapping = KpiMapping;
