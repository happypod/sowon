/**
 * assets/docGenerator.js
 * Generates Reviewer Response Documents (Summary, Logic, Risk, Q&A).
 */

const DocGenerator = {
    
    generateAll(result, regionName) {
        AuditLogger.log('DOC_GEN', 'INPUT', 'Generating All Docs', { region: regionName });

        const summary = this.genSummary(result, regionName);
        const logic = this.genLogic(result);
        const risks = this.genRisks(result);
        const qna = this.genQnA(result);

        AuditLogger.log('DOC_GEN', 'OUTPUT', 'Docs Generated');

        return {
            summary,
            logic,
            risks,
            qna
        };
    },

    genSummary(result, region) {
        return `
[심사위원용 1페이지 요약 - ${region}]
본 계획은 유형2(생활거점형) 모델에 기반하여, ${region}의 구조적 불균형(SII ${result.final.SII.toFixed(1)})을 해소하고 정주 준비도(RTRI ${result.final.RTRI.toFixed(1)})를 단계적으로 제고하는 것을 목표로 합니다.
핵심 전략은 '${result.final.Phase}' 단계에 맞춰 ${result.final.Phase === 'PHASE1' ? '생활서비스(LSI)와 주민신뢰(CGS)' : '관계인구(PTS)와 수익모델(SUS)'}를 집중 육성하는 것입니다.
이를 통해 투입 대비 효율(RTEI) ${result.rtei.value.toFixed(1)}점을 달성하며, 재정 건전성(SUS ${result.final.SUS.toFixed(1)})을 확보한 지속 가능한 전환 모델을 제시합니다.
        `.trim();
    },

    genLogic(result) {
        return `
[논리 구조: 문제-해결-성과]
1. 문제 정의: 해당 지역은 생활서비스 및 디지털 접근성 부족으로 높은 구조적 불편지수(SII ${result.base.SII.toFixed(1)})를 보이고 있었습니다.
2. 해결 전략: 유형2 가이드라인에 따른 4축(LSI/CGS/PTS/SUS) 균형 전략을 도입하여, 특히 ${result.delta.SII.toFixed(1)}점의 불편 지수 감소를 유도했습니다.
3. 성과 연결: 이는 종합 정주 전환 준비도(RTRI)의 ${result.delta.RTRI.toFixed(1)}점 상승으로 직결되며, Phase 가중치 자동 전환 규칙에 따라 사업 단계가 고도화됨을 입증합니다.
* 데이터 출처: 주민 전수조사(Google Sheets 연동) 및 실측 데이터를 Baseline에 반영함.
        `.trim();
    },

    genRisks(result) {
        const suspectLow = result.final.SUS < 50;
        return `
[리스크 레지스터 및 대응]
1. 재정 지속가능성 위험: 예상 SUS ${result.final.SUS.toFixed(1)}점. ${suspectLow ? '⚠ (주의 단계) 국비 의존도가 높으므로 수익형 마을기업 전환 필수.' : '(안정 단계) 자체 수익 모델 확보됨.'}
2. 주민 갈등 위험: CGS ${result.final.CGS.toFixed(1)}점. ${result.final.CGS < 60 ? '주민협의체 역량 강화 교육 선행 필요.' : '안정적 거버넌스 구축 완료.'}
3. 사후 관리 대안: 연차별 KPI 모니터링 시스템(Multi-Year Simulator)을 가동하여 성과 미달 시 운영비를 즉각 조정하는 가변 예산제 도입.
        `.trim();
    },

    genQnA(result) {
        return `
[근거 기반 Q&A]
Q1. RTRI 점수 산정 근거는 무엇인가?
A1. Core Formula(생활서비스 30%, 거버넌스 30% 등 Phase별 가중치)를 준수하며, SUS는 게이트 지표로만 활용되었습니다.

Q2. 숙박(체류) 사업 비중이 높지 않은가?
A2. "유형2 정렬 선언"에 따라 숙박은 정주 전환을 위한 보조 수단으로 한정했으며, PTS(관계인구) 확보를 위한 게이트웨이 역할로만 설계되었습니다.

Q3. 예산 효율성(RTEI)은 적절한가?
A3. ${result.rtei.value.toFixed(1)}점(등급 ${result.rtei.grade})으로, 표준 가이드라인 대비 우수한 투자 효율을 보입니다.
        `.trim();
    }
};

window.DocGenerator = DocGenerator;
