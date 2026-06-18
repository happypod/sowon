const VISITOR_SATISFACTION_ITEMS = [
  { q: 8, label: "교통 접근성", hint: "도로, 주차, 대중교통 등" },
  { q: 9, label: "자전거도로/산책로 상태", hint: "포장, 안전성 등" },
  { q: 10, label: "자연경관의 아름다움", hint: "강 주변 풍경 등" },
  { q: 11, label: "휴게공간 및 편의시설", hint: "벤치, 쉼터 등" },
  { q: 12, label: "관광 편의시설 이용", hint: "공중화장실, 주차장 등" },
  { q: 13, label: "쓰레기 처리 상태", hint: "청결도, 분리수거 여부 등" },
  { q: 14, label: "프로그램 / 전시 내용", hint: "지역행사 등" },
  { q: 15, label: "지역 상점 만족도", hint: "친절도, 상품 구성 등" },
];

const SATISFACTION_SCALE = [
  { value: "매우 만족", emoji: "😀" },
  { value: "만족",     emoji: "🙂" },
  { value: "보통",     emoji: "😐" },
  { value: "불만족",   emoji: "🙁" },
  { value: "매우 불만족", emoji: "😞" },
];
const INTENT_SCALE = ["매우 있다", "있다", "보통이다", "별로 없다", "전혀 없다"];
const COUPON_TEMPLATE_URL = "assets/coupon-sample.svg";
const VISITOR_REQUIRED_STEPS = [
  { kind: "choice", name: "entry.Q1", label: "Q1. 성별" },
  { kind: "choice", name: "entry.Q2", label: "Q2. 연령" },
  { kind: "choice", name: "entry.Q3", label: "Q3. 거주지역" },
  { kind: "choice", name: "entry.Q4", label: "Q4. 방문횟수" },
  { kind: "choice", name: "entry.Q5", label: "Q5. 동반자 유형" },
  { kind: "choice", name: "entry.Q6", label: "Q6. 방문동기" },
  { kind: "choice", name: "entry.Q7", label: "Q7. 체류기간" },
  ...VISITOR_SATISFACTION_ITEMS.map((item) => ({
    kind: "choice",
    name: `entry.Q${item.q}`,
    label: `Q${item.q}. ${item.label}`,
  })),
  { kind: "choice", name: "entry.Q16", label: "Q16. 방문 만족" },
  { kind: "choice", name: "entry.Q17", label: "Q17. 재방문 의향" },
  { kind: "choice", name: "entry.Q18", label: "Q18. 추천 의향" },
  { kind: "choice", name: "entry.Q19", label: "Q19. 필요시설 수요" },
  { kind: "phone", selector: "#phone_last4", label: "기념품 교환권 발급용 휴대폰 뒷자리 4자리" },
  { kind: "checked", selector: "#consent_chk", label: "통계자료 활용 동의" },
];

document.addEventListener("DOMContentLoaded", async () => {
  UI.init("visitor");
  renderSatisfactionGrid();
  renderIntentGroups();
  initVisitorMobileProgress();
  fetchStats();
  setInterval(fetchStats, 60000);

  const isOpen = await APP.guardSurveyOpen("visitor");
  if (!isOpen) return;

  const form = document.getElementById("visitorForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitForm();
    });
  }
});

function renderSatisfactionGrid() {
  const container = document.getElementById("satisfaction-grid");
  if (!container) return;

  container.innerHTML = VISITOR_SATISFACTION_ITEMS.map((item) => {
    const options = SATISFACTION_SCALE.map((s, idx) => `
      <div class="sat-option sat-${idx + 1}">
        <input type="radio" name="entry.Q${item.q}" value="${s.value}" id="q${item.q}_sat${idx + 1}" ${idx === 0 ? "required" : ""}>
        <label for="q${item.q}_sat${idx + 1}">
          <span class="emoji">${s.emoji}</span>
          <span>${s.value}</span>
        </label>
      </div>
    `).join("");

    return `
      <div class="satisfaction-card">
        <p class="card-title">Q${item.q}. ${item.label}</p>
        <p class="card-hint">${item.hint}</p>
        <div class="satisfaction-scale grid grid-cols-5 gap-2">${options}</div>
      </div>
    `;
  }).join("");
}

function renderIntentGroups() {
  document.querySelectorAll("[data-likert]").forEach((container) => {
    const q = container.dataset.likert;
    container.classList.add("intent-scale");
    container.innerHTML = INTENT_SCALE.map((value, idx) => `
      <div class="intent-option int-${idx + 1}">
        <input type="radio" name="entry.${q}" value="${value}" id="${q}_int${idx + 1}" ${idx === 0 ? "required" : ""}>
        <label for="${q}_int${idx + 1}">
          <span class="intent-dot"></span>
          <span>${value}</span>
        </label>
      </div>
    `).join("");
  });
}

function initVisitorMobileProgress() {
  const form = document.getElementById("visitorForm");
  const progressCount = document.getElementById("visitor-progress-count");
  const progressBar = document.getElementById("visitor-progress-bar");
  if (!form || !progressCount || !progressBar) return;

  const updateProgress = () => {
    const completed = VISITOR_REQUIRED_STEPS.filter(isStepComplete).length;
    const total = VISITOR_REQUIRED_STEPS.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    progressCount.textContent = `${completed}/${total}`;
    progressBar.style.width = `${pct}%`;
  };

  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);
  updateProgress();
}

async function submitForm() {
  if (!validateForm()) return;

  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.disabled = true;
  submitBtn.innerText = "제출 중...";
  let completed = false;

  const formData = {};
  for (let i = 1; i <= 20; i++) {
    formData[`Q${i}`] = getVal(`entry.Q${i}`);
  }

  ["Q3_OTHER", "Q4_OTHER", "Q5_OTHER", "Q7_OTHER", "Q16_OTHER", "Q19_OTHER"].forEach((key) => {
    formData[key] = getVal(`entry.${key}`);
  });

  const phoneLast4 = document.getElementById("phone_last4").value.trim();
  const couponCode = makeCouponCode(phoneLast4);
  formData.PHONE_LAST4 = phoneLast4;
  formData.COUPON_CODE = couponCode;
  formData.consent = document.getElementById("consent_chk").checked;

  try {
    await APP.submitSurvey("visitor", formData, { skipReload: true, silent: true });
    completed = true;
    disableFormAfterSubmit();
    await showCoupon(phoneLast4, couponCode);
    await fetchStats();
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
  } finally {
    if (!completed) {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  }
}

function getVal(name) {
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

function validateForm() {
  for (const step of VISITOR_REQUIRED_STEPS) {
    if (!isStepComplete(step)) {
      if (step.kind === "choice") {
        alert(`${step.label}에서 1개 이상 선택해 주세요.`);
      } else if (step.kind === "phone") {
        alert("휴대폰 뒷자리 4자리를 숫자로 입력해 주세요.");
      } else {
        alert("통계자료 활용 동의에 체크해 주세요.");
      }
      scrollToStep(step);
      return false;
    }
  }

  return true;
}

function isStepComplete(step) {
  if (step.kind === "choice") {
    const options = document.querySelectorAll(`[name="${step.name}"]`);
    return Array.from(options).some((option) => option.checked);
  }

  const el = document.querySelector(step.selector);
  if (!el) return false;
  if (step.kind === "phone") return /^\d{4}$/.test(el.value.trim());
  if (step.kind === "checked") return !!el.checked;
  return false;
}

function scrollToStep(step) {
  const el = step.selector
    ? document.querySelector(step.selector)
    : document.querySelector(`[name="${step.name}"]`);
  if (!el) return;

  const target =
    el.closest(".satisfaction-card") ||
    el.closest(".visitor-final-block") ||
    el.closest(".mb-8") ||
    el.closest(".mb-2") ||
    el.closest(".survey-section") ||
    el;
  target.scrollIntoView({ behavior: "smooth", block: "center" });

  if (step.kind !== "choice" && typeof el.focus === "function") {
    setTimeout(() => el.focus({ preventScroll: true }), 350);
  }
}

function makeCouponCode(phoneLast4) {
  const d = new Date();
  const ymd = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  const seed = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SW-${ymd}-${phoneLast4}-${seed}`;
}

function disableFormAfterSubmit() {
  const form = document.getElementById("visitorForm");
  if (!form) return;
  form.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = true;
  });
}

async function showCoupon(phoneLast4, couponCode) {
  const dataUrl = await buildCouponImage(phoneLast4, couponCode);
  const existing = document.getElementById("coupon-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "coupon-modal";
  modal.className = "fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 class="text-lg font-black text-slate-900">설문 제출 완료</h2>
          <p class="text-xs text-slate-500 mt-1">감사 기념품 교환권을 저장해 주세요.</p>
        </div>
        <button type="button" onclick="document.getElementById('coupon-modal')?.remove()" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-5">
        <img src="${dataUrl}" alt="감사 기념품 교환권" class="w-full max-h-[60vh] object-contain rounded-xl border border-slate-100 bg-slate-50">
        <div class="mt-4 grid grid-cols-1 gap-2">
          <a href="${dataUrl}" download="sowon-coupon-${phoneLast4}.png" class="w-full text-center bg-ocean-600 hover:bg-ocean-700 text-white font-black py-3 rounded-xl transition">
            <i class="fas fa-download mr-2"></i>교환권 이미지 다운로드
          </a>
          <p class="text-[11px] text-slate-500 text-center">표기 정보: 휴대폰 뒷자리 ${phoneLast4} / 코드 ${couponCode}</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function buildCouponImage(phoneLast4, couponCode) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  const img = await loadCouponTemplate().catch(() => null);
  if (img) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0c4a6e");
    gradient.addColorStop(0.55, "#0284c7");
    gradient.addColorStop(1, "#0f766e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 86, 170, 908, 1580, 72, true);
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 92px Pretendard, Arial, sans-serif";
  ctx.fillText(phoneLast4, 540, 1238);
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 34px Pretendard, Arial, sans-serif";
  ctx.fillText(`교환권 코드 ${couponCode}`, 540, 1365);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 26px Pretendard, Arial, sans-serif";
  ctx.fillText(new Date().toLocaleDateString("ko-KR"), 540, 1548);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function loadCouponTemplate() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = COUPON_TEMPLATE_URL;
  });
}

function roundRect(ctx, x, y, width, height, radius, fill) {
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
  if (fill) ctx.fill();
}

async function fetchStats() {
  const stats = await APP.fetchStats("stats_visitor", { period: "all" });
  if (stats && stats.total != null) {
    renderStats(stats);
    const lastUpdate = document.getElementById("last-update");
    if (lastUpdate) lastUpdate.innerText = "업데이트: " + new Date().toLocaleTimeString();
  }
}

function renderStats(stats) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };
  const setBar = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  };

  setText("stat-total", `${stats.total}명`);
  setText("stat-satisfaction", stats.satisfactionAvg ? `${stats.satisfactionAvg}` : "-");

  const revisit = Number(stats.revisit?.posRate || 0).toFixed(1);
  const recommend = Number(stats.recommend?.posRate || 0).toFixed(1);
  setText("stat-revisit", `${revisit}%`);
  setText("stat-recommend", `${recommend}%`);
  setBar("bar-revisit", revisit);
  setBar("bar-recommend", recommend);

  const needs = document.getElementById("stat-needs");
  const topNeeds = stats.needs?.top3 || [];
  if (needs) {
    if (!topNeeds.length) {
      needs.innerHTML = '<p class="text-slate-400">데이터 없음</p>';
      return;
    }
    const max = Math.max(...topNeeds.map((item) => item.count));
    needs.innerHTML = topNeeds
      .map((item) => APP.renderBar(item.label, item.count, max, "bg-ocean-500"))
      .join("");
  }
}
