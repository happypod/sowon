/**
 * 00_config.js
 * App Namespace Initialization & Global Configuration
 * Ticket 01: Core 분리
 */

window.App = window.App || {};

App.config = {
    // GAS WebApp URL
    SURVEY_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxeY5HTUDkYZgU2_8ICI4XpJp3IepkWTw53dyPaNLXCcpV41xQypIiOdxeB-l538sg/exec",
    
    // Feature Flags
    ENABLE_MOCK_DATA: false,
    
    // Future optional flags (Ticket 07)
    features: {
        kpiTrend6m: true,
        opsRoutineGas: true // Enabled backend integration
    },

    // Ticket OPS-02 & TOOL-01: Default Routine Items
    opsSeed: {
        owners: ["센터장", "현장센터", "링커", "외부협력"],
        // [4] Task tags — configurable list
        tags: ["회의", "데이터", "홍보", "협력", "점검"],
        // [3] Risk level definitions (used as tooltip text in UI)
        riskLevels: {
            HIGH: "즉각 조치 필요. 사업 목표 달성에 직접 위협.",
            MID:  "2주 내 모니터링 필요. 방치 시 리스크 확대.",
            LOW:  "관찰 수준. 월말 정기 점검으로 충분."
        },
        sections: [
            { id: 'data', title: '데이터 점검 루틴 (RTRI 연결)', kpi: 'RTRI' },
            { id: 'cgs', title: '주민 접촉·거버넌스 루틴 (CGS 연결)', kpi: 'CGS' },
            { id: 'pts', title: '전환 실험·파일럿 루틴 (PTS 연결)', kpi: 'PTS' },
            { id: 'sus', title: '지속가능·재원/파트너 루틴 (SUS 연결)', kpi: 'SUS' }
        ],
        items: [
            // Data (RTRI)
            { section: 'data', title: '설문 응답 수/응답률 점검(리별)', weight: 1, defaultOwner: '현장센터' },
            { section: 'data', title: '결측/중복 응답 확인 및 정리', weight: 1, defaultOwner: '현장센터' },
            { section: 'data', title: 'KPI 재산출 실행(업데이트 로그 확인)', weight: 3, defaultOwner: '현장센터' },
            { section: 'data', title: '3개월 추이 급변 항목 확인(경고)', weight: 2, defaultOwner: '센터장' },
            { section: 'data', title: '워드클라우드 상위 이슈 변동 확인', weight: 1, defaultOwner: '현장센터' },
            { section: 'data', title: '리별 샘플 수 최소 기준 충족 여부 확인', weight: 1, defaultOwner: '현장센터' },
            
            // CGS
            { section: 'cgs', title: '주민협의체/추진협의체 정례회의 1회 진행', weight: 2, defaultOwner: '링커' },
            { section: 'cgs', title: '민원/갈등 이슈 수집 및 분류', weight: 1, defaultOwner: '링커' },
            { section: 'cgs', title: '중재·합의 필요 안건 1건 이상 처리', weight: 2, defaultOwner: '센터장' },
            { section: 'cgs', title: '참여자(신규/재참여) 데이터 기록', weight: 1, defaultOwner: '현장센터' },
            { section: 'cgs', title: '링커/리더 활동 점검(출석/역할)', weight: 1, defaultOwner: '현장센터' },
            { section: 'cgs', title: '공지/안내 콘텐츠 1회 이상 발행', weight: 1, defaultOwner: '링커' },
            
            // PTS
            { section: 'pts', title: '전환 가능한 공간/자원 목록 업데이트', weight: 1, defaultOwner: '현장센터' },
            { section: 'pts', title: '파일럿 1건 이상 실행', weight: 3, defaultOwner: '현장센터' },
            { section: 'pts', title: '참여 사업자/기관 1곳 이상 접촉', weight: 2, defaultOwner: '센터장' },
            { section: 'pts', title: '실험 결과 회고(좋았던 점/개선점)', weight: 1, defaultOwner: '현장센터' },
            { section: 'pts', title: '다음 실험 설계(대상/기간/측정지표 확정)', weight: 1, defaultOwner: '현장센터' },
            
            // SUS
            { section: 'sus', title: '이번달 예산 집행 점검(계획 대비)', weight: 1, defaultOwner: '현장센터' },
            { section: 'sus', title: '협력기관/민간 파트너 1곳 이상 미팅', weight: 2, defaultOwner: '센터장' },
            { section: 'sus', title: '외부재원/공모 탐색 1건 이상', weight: 1, defaultOwner: '현장센터' },
            { section: 'sus', title: '운영인력 스케줄/업무 배분 점검', weight: 1, defaultOwner: '센터장' },
            { section: 'sus', title: '시설/장비 유지관리 점검', weight: 1, defaultOwner: '현장센터' },
            { section: 'sus', title: '다음달 운영계획 확정', weight: 2, defaultOwner: '센터장' }
        ]
    }
};

// For backward compatibility during migration
window.CONFIG = App.config;
