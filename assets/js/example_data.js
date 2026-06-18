window.App = window.App || {};

window.App.EXAMPLE_PROG_EXEC = {
  total: 150,
  lastUpdated: new Date().toISOString(),
  villageCounts: { "모항리": 85, "의항리": 60, "기타": 5 },
  ageCounts: { "40대 이하": 15, "50대": 35, "60대": 50, "70대 이상": 50 },
  typeCounts: { "독거가구": 45, "부부가구": 60, "기타": 45 },
  needsTop: [{name: "마을 인프라 확충", value: 33}, {name: "여가문화 취약", value: 21}, {name: "식생활 지원", value: 16}, {name: "의료/건강", value: 11}, {name: "이동수단 마련", value: 9}],
  needsDist: { "마을 인프라 확충": 33, "여가문화 취약": 21, "식생활 지원": 16, "의료/건강": 11, "이동수단 마련": 9 },
  keywords: [
      {keyword: "주차장", count: 12}, {keyword: "쓰레기", count: 10}, {keyword: "병원", count: 8}, {keyword: "반찬", count: 7}, {keyword: "프로그램", count: 5}
  ],
  rawOpinions: [
      "쓰레기가 너무 안치워져서 지저분합니다.",
      "경로당 외에 마땅히 모일 곳이 없고 프로그램도 부족해요.",
      "장보기가 힘들어요.", "끼니를 거르는 경우가 자주 있어요.",
      "차 없는 노인들은 병원 가기가 힘듭니다."
  ],
  avgScores: { "의료": 62.1, "일자리": 45.2, "편의시설": 38.5, "공동체": 55.4, "교통": 40.0, "잘 모르겠다": 10.0, "기타": 5.0 },
  highRiskCounts: { pilot2026: 45 },
  villageAverages: {
      "모항리": { "의료": 65, "일자리": 40, "편의시설": 35, "공동체": 50, "교통": 45, "잘 모르겠다": 5, "기타": 5 },
      "의항리": { "의료": 60, "일자리": 50, "편의시설": 40, "공동체": 60, "교통": 50, "잘 모르겠다": 15, "기타": 5 },
      "기타": { "의료": 58, "일자리": 42, "편의시설": 38, "공동체": 52, "교통": 38, "잘 모르겠다": 12, "기타": 8 }
  },
  workshopData: {
      topThemesByVillage: {
          "만리포": ["의료·이동", "돌봄", "경관·환경"],
          "천리포": ["의료·이동", "돌봄", "생활환경"],
          "소원권역 공통": ["안전·교통(주차)", "경관·환경(쓰레기)", "생활환경(시설)"]
      },
      matrixPoints: [
          { area: "의료·이동", needScore: 85, feasScore: 55, basisNote: "설문 상위 + 워크숍 반복" },
          { area: "식생활", needScore: 60, feasScore: 70, basisNote: "생활서비스로 연결 가능" },
          { area: "돌봄", needScore: 55, feasScore: 50, basisNote: "주민모임 접근 가능" },
          { area: "공동체", needScore: 50, feasScore: 75, basisNote: "필요도 높으나 추가 검토" }
      ],
      representativeOpinions: [
          "어르신 병원 이동수단이 부족해 진료 접근이 어렵다",
          "반찬 지원과 안부 확인이 함께 이루어질 필요가 있다",
          "주차공간 부족과 쓰레기 문제가 생활환경의 가장 큰 불편으로 나타난다"
      ]
  },
  planDirections: [
      { area: "의료·이동", basis: "설문 상위 + 워크숍 반복", shortTerm: "병원 이동지원 연계 시범", midTerm: "어르신 동행형 서비스", partner: "자원봉사센터" },
      { area: "식생활/생활서비스", basis: "장보기·식사 불편 호소 다수", shortTerm: "반찬 지원 또는 공동식사 연계 시범", midTerm: "생활서비스 검토", partner: "부녀회/협동조합" },
      { area: "돌봄/공동체", basis: "고령·독거·안부확인 필요성 체감", shortTerm: "안부확인 및 생활지원형 주민 돌봄", midTerm: "공동체 회복 프로그램", partner: "노인회" },
      { area: "생활환경·안전", basis: "시설 노후화 및 보행 불편", shortTerm: "주차/보행안전 개선 우선구간 검토", midTerm: "단계적 정비", partner: "지자체" }
  ]
};

// Sparse Exampe for Tab 8 Testing (Low data conditions)
window.App.EXAMPLE_PROG_EXEC_SPARSE = {
  total: 10,
  lastUpdated: new Date().toISOString(),
  villageCounts: { "모항리": 2, "파도리": 8 }, // None >= 5 except one
  ageCounts: { "20대 이하": 5, "70대 이상": 5, "50대": 0 },
  typeCounts: { "기타": 10, "부부가구": 0 },
  needsTop: [{name: "기타", value: 10}],
  needsDist: { "기타": 10, "교통": 0, "의료": 0 },
  keywords: [],
  rawOpinions: ["길이 안좋아요."],
  avgScores: { "의료": 10, "일자리": 10, "편의시설": 10, "공동체": 5, "교통": 5, "잘 모르겠다": 2, "기타": 0 },
  highRiskCounts: { pilot2026: 0 },
  villageAverages: {
      "모항리": { "의료": 10, "일자리": 10, "편의시설": 5, "공동체": 5, "교통": 5, "잘 모르겠다": 2, "기타": 0 },
      "파도리": { "의료": 5, "일자리": 5, "편의시설": 10, "공동체": 2, "교통": 8, "잘 모르겠다": 0, "기타": 0 }
  },
  workshopData: {
      topThemesByVillage: {
          "파도리": ["의료·이동", "경관·환경"]
      },
      matrixPoints: [],
      representativeOpinions: [
          "해안가 쓰레기 방치 문제가 심각합니다."
      ]
  },
  planDirections: [] // Test AI fallback or empty states
};

window.App.EXAMPLE_LINKER_BASE = {
  totalCount: 150,
  metrics: {
      linkerPotentialHigh: 45,
      partIntentHighRatio: 62.5,
      communityAcceptanceAvg: 75.4,
      postTrainingParticipationHigh: 55,
      immediateExecutionHigh: 30
  },
  villageAverages: {
      "모항리": { exec: 68.5, commAcc: 78.2, linker: 65.4 },
      "의항리": { exec: 55.2, commAcc: 65.4, linker: 52.1 },
      "파도리": { exec: 62.4, commAcc: 72.5, linker: 60.3 }
  },
  timeDist: { weekday_day: 40, weekday_evening: 20, weekend: 50, flexible: 30, irregular: 10 },
  fieldDist: { care: 45, tourism: 55, environment: 30, community: 15, simple: 5, unknown: 0 },
  trainingDist: { vHigh: 25, high: 30, normal: 60, none: 35 },
  lastUpdated: new Date().toISOString()
};

// [FIX v2] 실제 응답 수(80명) 기준으로 예시 데이터 갱신
// 만리포(모항리) 40명, 천리포(의항리) 35명, 기타(소원면 타 지역) 5명
window.App.EXAMPLE_SURVEY_SUMMARY = {
  updatedAt: new Date().toISOString(),
  total_responses: 80,
  village_counts: { "만리포": 40, "천리포": 35, "기타": 5 },
  // [FIX] Q2 = 가구형태 (남/여 구분 안함)
  household_distribution: { "부부가구": 37, "1인가구(노인)": 20, "부부+자녀": 11, "기타": 7, "3세대 이상": 5 },
  // 상주 여부 (Q3 또는 별도 문항 기준)
  residency_status_distribution: { "상주": 62, "비상주(계절)": 13, "비상주(기타)": 5 },
  age_distribution: { "40대 이하": 8, "50대": 15, "60대": 30, "70대 이상": 27 },
  residence_distribution: { "5년 미만": 5, "5~10년": 15, "10~20년": 25, "20년 이상": 35 },
  top_needs_total: [
    { name: "생활/편의시설 확충", value: 28 },
    { name: "의료기관 접근성 개선", value: 21 },
    { name: "대중교통망 정비", value: 16 },
    { name: "문화/여가 프로그램", value: 10 },
    { name: "주거환경 개선", value: 5 }
  ],
  top_needs_mallipo: [
    { name: "생활/편의시설 확충", value: 16 },
    { name: "대중교통망 정비", value: 12 },
    { name: "주거환경 개선", value: 7 },
    { name: "의료기관 접근성 개선", value: 3 },
    { name: "문화/여가 프로그램", value: 2 }
  ],
  top_needs_cheonripo: [
    { name: "의료기관 접근성 개선", value: 18 },
    { name: "생활/편의시설 확충", value: 12 },
    { name: "문화/여가 프로그램", value: 8 },
    { name: "대중교통망 정비", value: 4 },
    { name: "주거환경 개선", value: 2 }
  ],
  // Q28: 식사 준비 어려움
  q28_distribution_total: { "자주 있다": 15, "가끔 있다": 35, "거의 없다": 40, "전혀 없다": 10 },
  q28_distribution_mallipo: { "자주 있다": 5, "가끔 있다": 20, "거의 없다": 20, "전혀 없다": 5 },
  q28_distribution_cheonripo: { "자주 있다": 10, "가끔 있다": 15, "거의 없다": 10, "전혀 없다": 5 },
  
  // Q29: 장보기 불편
  q29_distribution_total: { "매우 그렇다": 25, "다소 그렇다": 45, "보통이다": 20, "그렇지 않다": 10 },
  q29_distribution_mallipo: { "매우 그렇다": 10, "다소 그렇다": 25, "보통이다": 10, "그렇지 않다": 5 },
  q29_distribution_cheonripo: { "매우 그렇다": 15, "다소 그렇다": 20, "보통이다": 5, "그렇지 않다": 5 },

  // Q30: 혼자 식사/끼니 결손
  q30_distribution_total: { "자주 있다": 10, "가끔 있다": 30, "거의 없다": 50, "전혀 없다": 10 },
  q30_distribution_mallipo: { "자주 있다": 3, "가끔 있다": 15, "거의 없다": 27, "전혀 없다": 5 },
  q30_distribution_cheonripo: { "자주 있다": 7, "가끔 있다": 15, "거의 없다": 13, "전혀 없다": 5 },

  // Q31: 병원·약국 방문 불편
  q31_distribution_total: { "매우 그렇다": 30, "다소 그렇다": 40, "보통이다": 20, "그렇지 않다": 10 },
  q31_distribution_mallipo: { "매우 그렇다": 10, "다소 그렇다": 25, "보통이다": 10, "그렇지 않다": 5 },
  q31_distribution_cheonripo: { "매우 그렇다": 20, "다소 그렇다": 15, "보통이다": 5, "그렇지 않다": 0 },

  // Q32: 건강관리 필요하지만 어려움
  q32_distribution_total: { "매우 그렇다": 20, "다소 그렇다": 35, "보통이다": 30, "그렇지 않다": 15 },
  q32_distribution_mallipo: { "매우 그렇다": 8, "다소 그렇다": 18, "보통이다": 16, "그렇지 않다": 8 },
  q32_distribution_cheonripo: { "매우 그렇다": 12, "다소 그렇다": 17, "보통이다": 10, "그렇지 않다": 1 },

  // Q33: 응급 시 도움 요청망
  q33_distribution_total: { "대체로 있다": 40, "거의 없다": 35, "전혀 없다": 25 },
  q33_distribution_mallipo: { "대체로 있다": 25, "거의 없다": 15, "전혀 없다": 10 },
  q33_distribution_cheonripo: { "대체로 있다": 10, "거의 없다": 15, "전혀 없다": 15 },

  // Q34: 참여 가능 활동 분야
  q34_distribution_total: { "돌봄 보조": 15, "관광 안내/행사 지원": 25, "환경정비": 35, "공동체 모임 운영": 15, "단순 참여만 가능": 10 },
  q34_distribution_mallipo: { "돌봄 보조": 5, "관광 안내/행사 지원": 15, "환경정비": 15, "공동체 모임 운영": 10, "단순 참여만 가능": 5 },
  q34_distribution_cheonripo: { "돌봄 보조": 10, "관광 안내/행사 지원": 10, "환경정비": 15, "공동체 모임 운영": 0, "단순 참여만 가능": 5 },

  // Q35: 참여 가능 시간대
  q35_distribution_total: { "오전": 30, "오후": 40, "평일 저녁": 20, "주말": 10 },
  q35_distribution_mallipo: { "오전": 15, "오후": 20, "평일 저녁": 10, "주말": 5 },
  q35_distribution_cheonripo: { "오전": 15, "오후": 15, "평일 저녁": 5, "주말": 5 },

  // Q36: 교육 후 참여 의향
  q36_distribution_total: { "매우 있다": 15, "다소 있다": 35, "보통이다": 30, "별로 없다": 20 },
  q36_distribution_mallipo: { "매우 있다": 8, "다소 있다": 20, "보통이다": 15, "별로 없다": 7 },
  q36_distribution_cheonripo: { "매우 있다": 7, "다소 있다": 10, "보통이다": 10, "별로 없다": 13 }
};
