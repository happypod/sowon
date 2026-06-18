
document.addEventListener('DOMContentLoaded', async () => {
    UI.init('tourist');
    fetchStats();
    setInterval(fetchStats, 60000);

    const isOpen = await APP.guardSurveyOpen('tourist');
    if (!isOpen) return;

    const form = document.getElementById('touristForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitForm();
        });
    }
});

async function submitForm() {
    const phone = document.getElementById('p_phone').value.trim();
    const consent = document.getElementById('consent_chk').checked;

    if (phone && !consent) {
        alert('연락처를 입력하셨다면 개인정보 수집 동의에 체크해주세요.\n(입력하지 않으려면 연락처를 비워주세요)');
        return;
    }

    // Required questions: Q1~Q20 (Q21은 서술형이라 선택)
    for (let i = 1; i <= 20; i++) {
        const els = document.querySelectorAll(`[name="entry.Q${i}"]`);
        if (els.length === 0) continue;

        const t = els[0].type;
        if (t === 'radio') {
            if (!Array.from(els).some(e => e.checked)) {
                alert(`Q${i} 문항에 답변해주세요.`);
                els[0].scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
        } else if (t === 'checkbox') {
            // Q5, Q12, Q14, Q18, Q19 등 체크박스는 최소 1개 선택 권장.
            if (!Array.from(els).some(e => e.checked)) {
                alert(`Q${i} 문항에서 1개 이상 선택해주세요.`);
                els[0].scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
        } else {
            // input/textarea
            if (!els[0].value?.trim()) {
                alert(`Q${i} 문항에 답변해주세요.`);
                els[0].scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
        }
    }

    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "제출 중...";

    const getVal = (name) => {
        const els = document.querySelectorAll(`[name="${name}"]`);
        if (els.length === 0) return '';
        const t = els[0].type;
        if (t === 'radio') {
            const checked = Array.from(els).find(e => e.checked);
            return checked ? checked.value : '';
        }
        if (t === 'checkbox') {
            return Array.from(els).filter(e => e.checked).map(e => e.value).join(', ');
        }
        return els[0].value || '';
    };

    const formData = {};
    for (let i = 1; i <= 21; i++) formData[`Q${i}`] = getVal(`entry.Q${i}`);

    formData['PHONE'] = phone; // Optional
    formData['consent'] = consent;

    try {
        await APP.submitSurvey('tourist', formData);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

async function fetchStats() {
    const stats = await APP.fetchStats('stats_tourist', { period: 'all' });
    if (stats) {
        renderStats(stats);
        document.getElementById('last-update').innerText = '업데이트: ' + new Date().toLocaleTimeString();
    }
}

function renderStats(stats) {
    if (!APP.renderBar && App && App.utils && App.utils.renderBar) {
        APP.renderBar = App.utils.renderBar;
    }
    const renderList = (id, dataObj, color) => {
        const container = document.getElementById(id);
        if (!dataObj) { container.innerHTML = '<p class="text-gray-400">데이터 없음</p>'; return; }
        const items = Array.isArray(dataObj)
            ? dataObj
            : Object.entries(dataObj).map(([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count);
        if (items.length === 0) { container.innerHTML = '<p class="text-gray-400">데이터 없음</p>'; return; }
        const max = Math.max(...items.map(i => i.count));
        container.innerHTML = items.map(i => APP.renderBar(i.label, i.count, max, color)).join('');
    };

    if (stats.total != null) document.getElementById('stat-total').innerText = stats.total + " 명";

    renderList('stat-residence', stats.q1, 'bg-emerald-500');
    renderList('stat-companion', stats.q2, 'bg-emerald-500');
    renderList('stat-stay', stats.q3, 'bg-emerald-500');
    renderList('stat-activity', stats.q5 ? stats.q5.top3 : [], 'bg-emerald-500');
    renderList('stat-revisit', stats.q8, 'bg-emerald-500');
}
