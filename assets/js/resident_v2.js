const RESIDENT_V2_SECTIONS = [
  {
    title: "I. 기본 생활환경 여건",
    intro: "귀하의 일반적 배경과 생활 여건에 해당하는 항목을 선택해 주세요.",
    questions: [
      { q: 1, type: "single", label: "성별", options: ["남자", "여자"] },
      { q: 2, type: "single", label: "연령", options: ["20대 이하", "30대", "40대", "50대", "60대", "70대", "80대 이상"] },
      { q: 3, type: "single", label: "거주지역(마을)", options: ["의항리", "모항3리", "기타"], other: true },
      { q: 4, type: "single", label: "세대유형", options: ["1인 가구", "부부 가구", "부부+자녀 가구", "3세대 이상 가구", "기타"], other: true },
      { q: 5, type: "single", label: "거주기간", options: ["태어날 때부터 계속 거주", "5년 미만", "5년~10년 미만", "10년~20년 미만", "20년 이상"] },
      { q: 6, type: "single", label: "생업 및 경제활동", options: ["어업", "양식업", "관광숙박업(민박)", "상업(자영업/식당)", "농업", "직장인", "은퇴(무직)", "기타"], other: true },
      { q: 7, type: "single", label: "연 소득", options: ["1천만원 이하", "1천만원~3천만원 미만", "3천만원 이상"] },
      { q: 8, type: "single", label: "최대 지출 항목", options: ["식비(생활비)", "의료비", "여가(여행/오락)", "기타"], other: true },
      { q: 9, type: "single", label: "주요 이동수단", options: ["자가용", "버스", "택시", "오토바이", "기타"], other: true },
      { q: 10, type: "single", label: "마을공공시설 이용횟수", options: ["1달에 1번", "1주일에 1번", "1주일에 3번 이상", "이용안함"] },
      { q: 11, type: "single", label: "건강", options: ["양호함", "양호하지 않음"] },
      { q: 12, type: "single", label: "병원 방문 횟수", options: ["1달에 1번", "1주일에 1번", "1주일에 3번 이상", "기타"], other: true },
      { q: 13, type: "single", label: "1일 식사 횟수", options: ["1끼니", "2끼니", "3끼니", "기타"], other: true },
      { q: 14, type: "single", label: "식사해결", options: ["집에서 자체 해결", "외식으로 해결", "도시락 또는 반찬 서비스 이용", "기타"], other: true },
      { q: 15, type: "single", label: "응급상황", options: ["도움을 요청할 사람이 가까이 있다", "도움을 요청할 사람이 거의 없다", "도움을 요청할 사람이 전혀 없다"] },
      { q: 16, type: "multi", label: "사회복지 서비스 현황", options: ["노인돌봄종합서비스", "가사간병방문서비스", "기초노령연금", "장애인활동보조지원", "해당 없음", "기타"], other: true, exclusive: "해당 없음" },
      { q: 17, type: "single", label: "청년인구 유입에 대한 의견", options: ["청년들이 우리 마을로 이주(유입)하는 것에 대체로 환영한다", "청년들이 우리 마을로 이주(유입)하는 것에 다소 부담된다", "청년들이 우리 마을로 이주(유입)하는 것에 반대한다", "청년들이 우리 마을로 이주(유입)하는 것에 잘 모르겠다(관심 없다)"] },
    ],
  },
  {
    title: "II. 생활 만족도 및 개선사항",
    intro: "생활 만족도는 5점 척도로 선택하고, 필요한 개선사항은 모두 선택해 주세요.",
    questions: [
      {
        type: "satisfaction",
        items: [
          { q: 18, label: "전반적인 생활만족도" },
          { q: 19, label: "교통환경" },
          { q: 20, label: "어업환경" },
          { q: 21, label: "주거환경" },
          { q: 22, label: "보건/의료환경" },
          { q: 23, label: "근린생활편의시설" },
          { q: 24, label: "복지/돌봄 서비스" },
          { q: 25, label: "소득사업 및 취업환경" },
        ],
      },
      { q: 26, type: "multi", label: "생활여건 개선·필요사항", options: ["대중교통(시간, 횟수) 증가", "주차시설 확대", "주/야간 보행환경 개선", "생활쓰레기 처리 개선", "주거환경(노후주택) 개선", "교육 환경 개선", "의료시설(병원/약국 등) 접근성 확대", "근린생활시설(대형마트/목욕탕/미용실) 접근성 확대", "찾아오는 복지서비스(돌봄) 확대", "주민 복지(문화/여가) 이용시설 확충", "일자리 창출 확대", "마을 소득사업의 다양화", "기타"], other: true },
      { q: 27, type: "multi", label: "관광여건 개선·필요사항", options: ["관광편의시설(화장실, 샤워장 등) 확충", "관광 프로그램 확대(4계절 운영 가능한)", "천리포위판장 시설 개선", "지역상권 활성화"] },
    ],
  },
  {
    title: "III. 어촌신활력증진사업 인식도",
    intro: "사업 인식과 공간 활용 수요, 기대효과와 우려사항을 선택해 주세요.",
    questions: [
      { q: 28, type: "single", label: "본 사업에 대해 들어본 적 있으신가요?", options: ["잘 알고 있다", "들어본적 있음", "잘 모름"] },
      { q: 29, type: "multi", label: "만리포 어촌스테이션에 필요하다고 생각하시는 시설", options: ["노인 돌봄/복지 활동을 위한 커뮤니티 공간", "주민 생활/문화 활동을 위한 커뮤니티 공간", "마을공유주방(만리포-천리포 연계)", "마을 소득사업을 위한 사무실", "주민 교육을 위한 교육장", "기타"], other: true },
      { q: 30, type: "multi", label: "천리포 어촌스테이션(리모델링)에 필요하다고 생각하시는 시설", options: ["수산물 판매장", "관광 체험 공간", "생활편의 공간", "기타"], other: true },
      { q: 31, type: "multi", label: "본 사업을 통해 기대하는 긍정적인 변화", options: ["일자리 창출 및 소득 증대", "생활환경 개선(시설, 경관 등)", "관광 활성화 및 방문객 증가", "청년 인구 유입", "마을 공동체 회복", "특별한 기대 없음", "기타"], other: true },
      { q: 32, type: "multi", label: "본 사업을 통해 우려되는 부정적인 변화", options: ["주민 간의 갈등 발생", "특정 주민들에게만 혜택", "쓰레기/소음 등 생활환경 악화", "실효성 부족(건물만 짓고 사업종료)", "주민 의견 미반영(행정 중심 운영)", "기타"], other: true },
    ],
  },
  {
    title: "IV. 주민 참여 의향",
    intro: "향후 사업 참여 방식과 프로그램 이용 의향을 선택해 주세요.",
    questions: [
      { q: 33, type: "single", label: "본 사업에 참여하실 의향은 어느 정도 있으신가요?", options: ["모든 활동에 참여", "일부 활동에 참여", "의견만 제시", "주민설명회 및 사업설명회 정도만 참여", "참여의사 없음"] },
      { q: 34, type: "multi", label: "참여 가능 활동", options: ["주민설명회 참석", "설문조사나 의견서 작성", "소모임/동아리 활동", "현장 활동(봉사, 캠페인 등)", "온라인 참여(SNS, 단톡방)", "잘 모르겠음"] },
      { q: 35, type: "multi", label: "참여 가능 시간대", options: ["평일 낮", "평일 저녁", "주말", "수시 가능", "불규칙"] },
      { q: 36, type: "single", label: "향후 어촌스테이션 프로그램을 월 1회 이상 이용할 의향", options: ["매우 있음", "있음", "보통", "없음", "전혀없음"] },
      { q: 37, type: "single", label: "유료 프로그램 운영 시 부담없는 금액 범위", options: ["1만원 미만", "1~3만원", "3~5만원", "5만원 이상", "유료일 경우 이용 안함"] },
      { q: 38, type: "textarea", label: "설문 외 마을 및 관련 사업에 대한 추가 의견", optional: true },
    ],
  },
];

const RESIDENT_V2_SCALE = ["매우 만족", "만족", "보통", "불만족", "매우 불만족"];
const RESIDENT_V2_COUPON_TEMPLATE_URL = "assets/coupon-sample.svg";

document.addEventListener("DOMContentLoaded", async () => {
  UI.init("resident_v2");
  renderResidentV2Form();
  initResidentV2Progress();
  fetchResidentV2Stats();
  setInterval(fetchResidentV2Stats, 60000);

  const isOpen = await APP.guardSurveyOpen("resident_v2");
  if (!isOpen) return;

  const form = document.getElementById("residentV2Form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitResidentV2Form();
    });
  }
});

function renderResidentV2Form() {
  const root = document.getElementById("resident-v2-form-root");
  if (!root) return;

  root.innerHTML = RESIDENT_V2_SECTIONS.map((section, index) => `
    <section class="survey-section" id="section-${index + 1}">
      <div class="section-heading">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <h2>${section.title}</h2>
          <p>${section.intro}</p>
        </div>
      </div>
      <div class="space-y-4">
        ${section.questions.map(renderQuestion).join("")}
      </div>
    </section>
  `).join("") + renderCouponSection();

  root.querySelectorAll("[data-exclusive]").forEach(setupExclusiveChoice);
}

function renderQuestion(question) {
  if (question.type === "satisfaction") {
    return `
      <div class="question-card">
        <div class="question-title">
          <span class="q-badge">Q18-25</span>
          <div>
            <h3>생활 만족도</h3>
            <p>각 항목별 만족도를 선택해 주세요.</p>
          </div>
        </div>
        <div class="satisfaction-list">
          ${question.items.map((item) => renderSatisfactionItem(item)).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "textarea") {
    return `
      <div class="question-card" data-question="Q${question.q}">
        <div class="question-title">
          <span class="q-badge">Q${question.q}</span>
          <h3>${question.label}</h3>
        </div>
        <textarea name="entry.Q${question.q}" rows="5" class="text-area" placeholder="자유롭게 작성해 주세요."></textarea>
      </div>
    `;
  }

  const isMulti = question.type === "multi";
  const inputType = isMulti ? "checkbox" : "radio";
  const inputName = `entry.Q${question.q}`;

  return `
    <div class="question-card" data-question="Q${question.q}">
      <div class="question-title">
        <span class="q-badge">Q${question.q}</span>
        <div>
          <h3>${question.label}</h3>
          <p>${isMulti ? "해당되는 항목을 모두 선택해 주세요." : "하나만 선택해 주세요."}</p>
        </div>
      </div>
      <div class="option-grid ${question.options.length <= 2 ? "two" : ""}">
        ${question.options.map((option, index) => {
          const id = `q${question.q}_${index}`;
          const isOther = option === "기타";
          const exclusiveAttr = question.exclusive === option ? `data-exclusive="${inputName}"` : "";
          return `
            <label class="choice-pill ${isOther ? "other-choice" : ""}" for="${id}">
              <input type="${inputType}" name="${inputName}" value="${option}" id="${id}" ${exclusiveAttr}>
              <span>${option}</span>
            </label>
          `;
        }).join("")}
      </div>
      ${question.other ? `<input class="other-input" name="entry.Q${question.q}_OTHER" type="text" placeholder="기타 내용을 입력해 주세요.">` : ""}
    </div>
  `;
}

function renderSatisfactionItem(item) {
  return `
    <div class="satisfaction-card" data-question="Q${item.q}">
      <div>
        <p class="sat-title">Q${item.q}. ${item.label}</p>
      </div>
      <div class="sat-scale">
        ${RESIDENT_V2_SCALE.map((value, index) => {
          const id = `q${item.q}_sat_${index}`;
          return `
            <label for="${id}">
              <input type="radio" name="entry.Q${item.q}" value="${value}" id="${id}">
              <span>${value}</span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderCouponSection() {
  return `
    <section class="survey-section">
      <div class="section-heading">
        <span>05</span>
        <div>
          <h2>기념품 교환권 발급</h2>
          <p>중복 발급 방지를 위해 휴대폰 뒷자리 4자리만 수집합니다.</p>
        </div>
      </div>
      <div class="question-card">
        <label class="block text-sm font-black text-slate-700 mb-2" for="resident_v2_phone_last4">휴대폰 뒷자리 4자리</label>
        <input id="resident_v2_phone_last4" class="phone-input" type="tel" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="예: 1649">
        <p class="mt-2 text-xs text-slate-500">설문 완료 후 생성되는 이미지에는 이 4자리만 표시됩니다.</p>
      </div>
      <label class="consent-card">
        <input id="resident_v2_consent" type="checkbox">
        <span>
          <strong>개인정보 수집 및 통계자료 활용에 동의합니다.</strong>
          <small>수집 항목은 설문 응답과 휴대폰 뒷자리 4자리이며, 사업 기초자료 및 교환권 중복 확인 용도로만 활용됩니다.</small>
        </span>
      </label>
      <button type="submit" class="submit-button">
        <i class="fas fa-paper-plane"></i>
        설문 제출 및 교환권 받기
      </button>
    </section>
  `;
}

function initResidentV2Progress() {
  const form = document.getElementById("residentV2Form");
  const count = document.getElementById("resident-v2-progress-count");
  const bar = document.getElementById("resident-v2-progress-bar");
  if (!form || !count || !bar) return;

  const update = () => {
    const steps = getResidentV2RequiredSteps();
    const completed = steps.filter(isResidentV2StepComplete).length;
    const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;
    count.textContent = `${completed}/${steps.length}`;
    bar.style.width = `${pct}%`;
  };

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
}

function getResidentV2RequiredSteps() {
  const steps = [];
  RESIDENT_V2_SECTIONS.forEach((section) => {
    section.questions.forEach((question) => {
      if (question.type === "satisfaction") {
        question.items.forEach((item) => steps.push({ kind: "choice", name: `entry.Q${item.q}`, label: `Q${item.q}. ${item.label}` }));
      } else if (!question.optional) {
        steps.push({ kind: "choice", name: `entry.Q${question.q}`, label: `Q${question.q}. ${question.label}` });
      }
    });
  });
  steps.push({ kind: "phone", selector: "#resident_v2_phone_last4", label: "휴대폰 뒷자리 4자리" });
  steps.push({ kind: "checked", selector: "#resident_v2_consent", label: "개인정보 수집 및 활용 동의" });
  return steps;
}

function isResidentV2StepComplete(step) {
  if (step.kind === "choice") {
    return Array.from(document.querySelectorAll(`[name="${step.name}"]`)).some((el) => el.checked);
  }

  const el = document.querySelector(step.selector);
  if (!el) return false;
  if (step.kind === "phone") return /^\d{4}$/.test(el.value.trim());
  if (step.kind === "checked") return el.checked;
  return false;
}

function validateResidentV2Form() {
  for (const step of getResidentV2RequiredSteps()) {
    if (!isResidentV2StepComplete(step)) {
      alert(step.kind === "choice" ? `${step.label} 항목을 선택해 주세요.` : `${step.label}를 확인해 주세요.`);
      scrollToResidentV2Step(step);
      return false;
    }
  }
  return true;
}

function scrollToResidentV2Step(step) {
  let target = null;
  if (step.kind === "choice") {
    const input = document.querySelector(`[name="${step.name}"]`);
    target = input ? input.closest("[data-question]") || input.closest(".question-card") : null;
  } else {
    const input = document.querySelector(step.selector);
    target = input ? input.closest(".question-card") || input.closest(".survey-section") : null;
  }
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitResidentV2Form() {
  if (!validateResidentV2Form()) return;

  const submitBtn = document.querySelector(".submit-button");
  const original = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 제출 중...';
  }

  const phoneLast4 = document.getElementById("resident_v2_phone_last4").value.trim();
  const couponCode = makeResidentV2CouponCode(phoneLast4);
  const formData = {};
  for (let q = 1; q <= 38; q++) {
    formData[`Q${q}`] = getResidentV2Value(`entry.Q${q}`);
  }
  [3, 4, 6, 8, 9, 12, 13, 14, 16, 26, 29, 30, 31, 32].forEach((q) => {
    formData[`Q${q}_OTHER`] = getResidentV2Value(`entry.Q${q}_OTHER`);
  });
  formData.PHONE_LAST4 = phoneLast4;
  formData.COUPON_CODE = couponCode;
  formData.consent = document.getElementById("resident_v2_consent").checked;

  try {
    await APP.submitSurvey("resident_v2", formData, { skipReload: true, silent: true });
    disableResidentV2Form();
    await showResidentV2Coupon(phoneLast4, couponCode);
    await fetchResidentV2Stats();
  } catch (error) {
    const message = error?.message || "";
    if (message === "DUPLICATE_PHONE_LAST4") {
      alert("이미 해당 휴대폰 뒷자리로 발급된 교환권이 있습니다. 현장 담당자에게 확인해 주세요.");
    } else if (message === "INVALID_PHONE_LAST4") {
      alert("휴대폰 뒷자리 4자리를 숫자로 입력해 주세요.");
    } else if (message === "SURVEY_CLOSED") {
      alert("현재 접수 중인 설문이 아닙니다.");
    } else {
      alert("제출 중 오류가 발생했습니다. 현장 담당자에게 문의해 주세요.");
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = original;
    }
  }
}

function getResidentV2Value(name) {
  const els = document.querySelectorAll(`[name="${name}"]`);
  if (els.length === 0) return "";

  const first = els[0];
  if (first.type === "radio") {
    const checked = Array.from(els).find((el) => el.checked);
    return checked ? checked.value : "";
  }
  if (first.type === "checkbox") {
    return Array.from(els)
      .filter((el) => el.checked)
      .map((el) => el.value)
      .join(", ");
  }
  return first.value || "";
}

function setupExclusiveChoice(exclusiveInput) {
  const groupName = exclusiveInput.dataset.exclusive;
  const group = Array.from(document.querySelectorAll(`[name="${groupName}"]`));
  group.forEach((input) => {
    input.addEventListener("change", () => {
      if (input === exclusiveInput && input.checked) {
        group.forEach((el) => {
          if (el !== exclusiveInput) el.checked = false;
        });
      }
      if (input !== exclusiveInput && input.checked) {
        exclusiveInput.checked = false;
      }
    });
  });
}

function disableResidentV2Form() {
  const form = document.getElementById("residentV2Form");
  if (!form) return;
  form.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = true;
  });
}

async function fetchResidentV2Stats() {
  const stats = await APP.fetchStats("stats_resident_v2", { period: "all" });
  const totalEl = document.getElementById("resident-v2-total-count");
  if (totalEl && stats) totalEl.textContent = Number(stats.total || 0).toLocaleString();
}

function makeResidentV2CouponCode(phoneLast4) {
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SR-${date}-${phoneLast4}-${token}`;
}

async function showResidentV2Coupon(phoneLast4, couponCode) {
  const dataUrl = await buildResidentV2CouponImage(phoneLast4, couponCode);
  const modal = ensureResidentV2CouponModal();
  const img = modal.querySelector("[data-coupon-image]");
  const link = modal.querySelector("[data-coupon-download]");
  img.src = dataUrl;
  link.href = dataUrl;
  link.download = `sowon-resident-v2-coupon-${phoneLast4}.png`;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function ensureResidentV2CouponModal() {
  let modal = document.getElementById("resident-v2-coupon-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "resident-v2-coupon-modal";
  modal.className = "fixed inset-0 z-[200] hidden items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm";
  modal.innerHTML = `
    <div class="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
      <div class="flex items-center justify-between pb-3">
        <div>
          <p class="text-xs font-black text-ocean-600 uppercase">Coupon Ready</p>
          <h2 class="text-lg font-black text-slate-900">기념품 교환권이 생성되었습니다</h2>
        </div>
        <button type="button" class="h-10 w-10 rounded-full bg-slate-100 text-slate-600" onclick="document.getElementById('resident-v2-coupon-modal').classList.add('hidden')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <img data-coupon-image alt="감사 기념품 교환권" class="max-h-[62vh] w-full rounded-2xl object-contain bg-slate-100">
      <a data-coupon-download class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-black text-white" href="#" download>
        <i class="fas fa-download"></i>
        이미지 저장하기
      </a>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

async function buildResidentV2CouponImage(phoneLast4, couponCode) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  try {
    const image = await loadResidentV2Image(RESIDENT_V2_COUPON_TEMPLATE_URL);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch (_) {
    drawResidentV2CouponFallback(ctx);
  }

  drawRoundedRect(ctx, 210, 1040, 660, 260, 38, "#0f172a");
  ctx.fillStyle = "#bae6fd";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("휴대폰 뒷자리", 540, 1134);
  drawTrackedDigits(ctx, phoneLast4, 540, 1238);

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 34px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`교환권 코드 ${couponCode}`, 540, 1390);

  ctx.fillStyle = "#64748b";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText(new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }), 540, 1548);
  return canvas.toDataURL("image/png");
}

function drawTrackedDigits(ctx, text, centerX, baselineY) {
  const chars = String(text).split("");
  ctx.font = "900 88px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  const tracking = 24;
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (chars.length - 1);
  let x = centerX - total / 2;
  chars.forEach((char, index) => {
    ctx.fillText(char, x, baselineY);
    x += widths[index] + tracking;
  });
}

function drawResidentV2CouponFallback(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#0c4a6e");
  gradient.addColorStop(0.55, "#0284c7");
  gradient.addColorStop(1, "#0f766e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);
  drawRoundedRect(ctx, 86, 170, 908, 1580, 72, "#f8fcff");
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 16]);
  roundRectPath(ctx, 130, 214, 820, 1492, 48);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#075985";
  ctx.font = "800 42px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("소원권역 어촌신활력증진사업", 540, 365);
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 82px Arial, sans-serif";
  ctx.fillText("감사 기념품", 540, 475);
  ctx.fillText("교환권", 540, 570);
  drawRoundedRect(ctx, 210, 690, 660, 220, 36, "#e0f2fe");
  ctx.fillStyle = "#0369a1";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("주민 설문조사 참여 완료", 540, 782);
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillText("현장 확인 후 기념품과 교환해 주세요", 540, 846);
}

function loadResidentV2Image(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
