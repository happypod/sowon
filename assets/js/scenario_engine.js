/**
 * scenario_engine.js
 * 시나리오 랩 엔진 - KPI 임팩트 테이블, 시뮬레이션, Drivers 계산
 * Tickets: SL-ENGINE-01 ~ SL-ENGINE-05
 */

// ============================================================
// 1. KPI 영향 테이블 (SL-ENGINE-01/02)
// ============================================================
const KPI_IMPACT_TABLE = {
  // 생활서비스 패키지 (A)
  MEDICAL_UPGRADE:     { LSI: +3.5, SII: -2.0, RTRI: +1.5 },
  VACANT_HOME_RENEW:   { PTS: +4.0, RTRI: +2.0, SUS: +1.5 },
  REGIONAL_TRANSIT:    { LSI: +2.5, SII: -1.5 },
  DAILY_CONVENIENCE:   { LSI: +3.0, SUS: +1.0 },

  // 거버넌스 패키지 (B)
  RESIDENT_COUNCIL:    { CGS: +4.0, RTRI: +1.0 },
  CONFLICT_MANAGEMENT: { CGS: +2.5, SII: -1.0 },
  COMMUNITY_FUND:      { CGS: +2.0, SUS: +2.5 },
  LEADER_TRAINING:     { CGS: +3.0, RTRI: +1.5 },

  // 전환 패키지 (C)
  RENTAL_HOUSING:      { PTS: +5.0, RTRI: +2.5, SUS: +1.0 },
  JOB_LINKAGE:         { SUS: +3.5, CGS: +1.5 },
  RETURN_TRAINING:     { PTS: +3.0, CGS: +1.0, RTRI: +1.5 },
  STAY_PROGRAM:        { PTS: +4.5, SUS: +2.0 },

  // 지속가능 패키지 (D)
  ROOM_CONVERSION:     { PTS: +3.5, RTRI: +2.0 },
  OCCUPANCY_IMPROVE:   { PTS: +2.5, SUS: +1.5, RTRI: +1.0 },
  HUB_REVENUE_EXPAND:  { SUS: +4.0, CGS: +1.0 },
  COST_OPTIMIZATION:   { SUS: +3.0 }
};

// 정책 패키지별 그룹핑 (UI 렌더용)
const POLICY_PACKAGES = [
  {
    id: 'A', label: '생활서비스', icon: 'fa-house-medical', color: 'blue',
    items: [
      { id: 'MEDICAL_UPGRADE',   label: '의료기관 접근성 강화' },
      { id: 'VACANT_HOME_RENEW', label: '빈집 리노베이션 지원' },
      { id: 'REGIONAL_TRANSIT',  label: '마을 순환 교통 운영' },
      { id: 'DAILY_CONVENIENCE', label: '생활편의시설 확충' }
    ]
  },
  {
    id: 'B', label: '거버넌스', icon: 'fa-people-group', color: 'violet',
    items: [
      { id: 'RESIDENT_COUNCIL',    label: '주민협의체 활성화' },
      { id: 'CONFLICT_MANAGEMENT', label: '갈등관리 시스템 구축' },
      { id: 'COMMUNITY_FUND',      label: '마을공동기금 조성' },
      { id: 'LEADER_TRAINING',     label: '주민 리더십 교육' }
    ]
  },
  {
    id: 'C', label: '전환(PTS)', icon: 'fa-rotate', color: 'emerald',
    items: [
      { id: 'RENTAL_HOUSING',  label: '이주민 임대주택 공급' },
      { id: 'JOB_LINKAGE',    label: '일자리 연계 프로그램' },
      { id: 'RETURN_TRAINING', label: '귀촌 정착교육 운영' },
      { id: 'STAY_PROGRAM',   label: '체류형 관계인구 프로그램' }
    ]
  },
  {
    id: 'D', label: '지속가능(SUS)', icon: 'fa-seedling', color: 'amber',
    items: [
      { id: 'ROOM_CONVERSION',    label: '빈방 숙박 전환 지원' },
      { id: 'OCCUPANCY_IMPROVE',  label: '입실률 개선 마케팅' },
      { id: 'HUB_REVENUE_EXPAND', label: '거점 수익 다각화' },
      { id: 'COST_OPTIMIZATION',  label: '운영비 절감 구조화' }
    ]
  }
];

// ============================================================
// 2. 리(Ri) 단위 멀티플라이어 (SL-ENGINE-03)
// ============================================================
const RI_MULTIPLIER = {
  '모항리': { RTRI: 1.0, SII: 1.0, LSI: 1.0, CGS: 1.0, PTS: 1.2, SUS: 1.0 },
  '의항리': { RTRI: 1.0, SII: 1.0, LSI: 1.2, CGS: 1.0, PTS: 0.9, SUS: 1.0 }
};

// ============================================================
// 3. 시뮬레이션 엔진 (SL-ENGINE-04/05)
// ============================================================
const ScenarioEngine = {

  // clamp 유틸
  _clamp: (v, min = 0, max = 100) => Math.max(min, Math.min(max, v)),

  /**
   * 메인 시뮬레이션 함수
   * @param {Object} params
   * @param {Object} params.baselineKpi  { RTRI, SII, LSI, CGS, PTS, SUS }
   * @param {string[]} params.selectedPolicyIds  ex) ['MEDICAL_UPGRADE', 'RESIDENT_COUNCIL']
   * @param {Object} params.assumptions  { intensity, reach, durationWeight }
   * @param {string} params.ri  '모항리' | '의항리'
   * @returns {{ afterKpi, deltaKpi, drivers }}
   */
  simulate({ baselineKpi, selectedPolicyIds, assumptions, ri }) {
    const { intensity = 1.0, reach = 0.5, durationWeight = 1.0 } = assumptions || {};
    const riMult = RI_MULTIPLIER[ri] || RI_MULTIPLIER['모항리'];
    const clamp = this._clamp;

    const KPI_KEYS = ['RTRI', 'SII', 'LSI', 'CGS', 'PTS', 'SUS'];

    // 정책별 각 KPI에 대한 기여도 누적
    // drivers[kpiKey] = [ {policyId, contribution}, ... ]
    const contributionMap = {};
    KPI_KEYS.forEach(k => contributionMap[k] = {});

    selectedPolicyIds.forEach(pid => {
      const impacts = KPI_IMPACT_TABLE[pid];
      if (!impacts) return;

      Object.entries(impacts).forEach(([kpiKey, baseImpact]) => {
        const mult = riMult[kpiKey] || 1.0;
        const effectiveImpact = baseImpact * intensity * reach * durationWeight * mult;
        contributionMap[kpiKey][pid] = (contributionMap[kpiKey][pid] || 0) + effectiveImpact;
      });
    });

    // After KPI 계산
    const afterKpi = {};
    const deltaKpi = {};
    KPI_KEYS.forEach(kpiKey => {
      const total = Object.values(contributionMap[kpiKey] || {}).reduce((s, v) => s + v, 0);
      const base = baselineKpi[kpiKey] || 0;
      afterKpi[kpiKey] = clamp(base + total);
      deltaKpi[kpiKey] = parseFloat((afterKpi[kpiKey] - base).toFixed(2));
    });

    // Drivers 계산 (SL-ENGINE-05): 각 KPI별 상위 5개 정책
    const drivers = {};
    KPI_KEYS.forEach(kpiKey => {
      const contributions = contributionMap[kpiKey];
      const sorted = Object.entries(contributions)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5)
        .map(([policyId, contribution]) => ({
          policyId,
          label: this._getPolicyLabel(policyId),
          contribution: parseFloat(contribution.toFixed(2))
        }));
      drivers[kpiKey] = sorted;
    });

    return { afterKpi, deltaKpi, drivers };
  },

  _getPolicyLabel(policyId) {
    for (const pkg of POLICY_PACKAGES) {
      const item = pkg.items.find(i => i.id === policyId);
      if (item) return item.label;
    }
    return policyId;
  },

  /**
   * 운영루틴 권장조치 생성 (SL-UI-05)
   */
  generateRoutineRecommendations(deltaKpi) {
    const recs = [];
    if ((deltaKpi.CGS || 0) < 1) {
      recs.push({
        section: 'CGS',
        message: 'CGS 개선 효과가 미미합니다. 거버넌스 루틴을 강화하세요.',
        icon: 'fa-people-group',
        color: 'violet'
      });
    }
    if ((deltaKpi.RTRI || 0) > 3) {
      recs.push({
        section: 'PTS',
        message: 'RTRI가 크게 상승합니다. 파일럿 실행 루틴을 추가하세요.',
        icon: 'fa-rotate',
        color: 'emerald'
      });
    }
    if ((deltaKpi.PTS || 0) > 3) {
      recs.push({
        section: 'DATA',
        message: 'PTS 효과가 높습니다. 관광 관리 및 모니터링 루틴을 강화하세요.',
        icon: 'fa-chart-bar',
        color: 'blue'
      });
    }
    if ((deltaKpi.SUS || 0) < 1 && (deltaKpi.CGS || 0) >= 1) {
      recs.push({
        section: 'SUS',
        message: '지속가능성 지표가 낮습니다. 수익 다각화 루틴을 점검하세요.',
        icon: 'fa-seedling',
        color: 'amber'
      });
    }
    return recs;
  }
};

window.KPI_IMPACT_TABLE = KPI_IMPACT_TABLE;
window.POLICY_PACKAGES  = POLICY_PACKAGES;
window.RI_MULTIPLIER    = RI_MULTIPLIER;
window.ScenarioEngine   = ScenarioEngine;
