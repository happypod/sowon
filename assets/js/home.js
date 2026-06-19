// Initialize UI and Data
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize UI (Nav/Footer)
    UI.init('home');

    // 2. Fetch and initialize Counters
    await initCounters();
    await applySurveyCardStatus();
});

async function initCounters() {
    try {
        // Fetch summary data from GAS Backend. Visitor was added later, so fetch
        // its stats separately as a fallback while older admin_summary caches expire.
        const [summaryResult, visitorResult, residentV2Result] = await Promise.allSettled([
            App.api.callAction('admin_summary', { region: 'all', period: 'all' }),
            App.api.callAction('stats_visitor', { region: 'ALL', period: 'all' }),
            App.api.callAction('stats_resident_v2', { region: 'ALL', period: 'all' })
        ]);

        const res = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
        const visitorStats = visitorResult.status === 'fulfilled' ? visitorResult.value : null;
        const residentV2Stats = residentV2Result.status === 'fulfilled' ? residentV2Result.value : null;
        const counts = res?.counts || {};

        const resident = toCounterNumber(counts.resident_total);
        const tourist = toCounterNumber(counts.tourist_total);
        const lodging = toCounterNumber(counts.lodging_total);
        const residentV2 = Math.max(
            toCounterNumber(counts.resident_v2_total),
            toCounterNumber(residentV2Stats?.total)
        );
        const visitor = Math.max(
            toCounterNumber(counts.visitor_total),
            toCounterNumber(visitorStats?.total)
        );
        const total = Math.max(
            toCounterNumber(res?.survey?.responseCount),
            resident + tourist + lodging + visitor + residentV2
        );

        animateCounter('hero-total', total);
        animateCounter('hero-resident', resident);
        animateCounter('hero-resident-v2', residentV2);
        animateCounter('hero-tourist', tourist);
        animateCounter('hero-lodging', lodging);
        animateCounter('hero-visitor', visitor);
    } catch(err) {
        console.warn('Failed to load real counter data, using fallbacks', err);
        // Fallback or just leave as 0
    }
}

function toCounterNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
}

async function applySurveyCardStatus() {
    const settings = await APP.fetchSurveySettings();
    if (!settings || !settings.surveys) return;

    document.querySelectorAll('[data-survey-type]').forEach((card) => {
        const type = card.dataset.surveyType;
        const item = settings.surveys[type];
        if (item && item.hidden === true) {
            card.classList.add('hidden');
            card.setAttribute('aria-hidden', 'true');
            return;
        }
        if (!item || item.enabled !== false) return;

        card.classList.add('opacity-60');
        card.addEventListener('click', (event) => {
            event.preventDefault();
            alert(`${item.label || '해당 설문'}은 현재 접수 중이 아닙니다.`);
        });

        const badge = document.createElement('span');
        badge.className = 'absolute top-4 left-4 bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-full shadow';
        badge.textContent = '접수 종료';
        card.appendChild(badge);

        const ctaList = card.querySelectorAll('.flex.items-center');
        const cta = ctaList[ctaList.length - 1];
        if (cta) cta.innerHTML = '접수 종료 <i class="fas fa-lock ml-2 text-sm"></i>';
    });
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const duration = 1500; // ms
    const frameRate = 30; // ms
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const currentVal = Math.round(target * easeOutQuad(progress));
        
        el.innerText = currentVal.toLocaleString();

        if (frame >= totalFrames) {
            clearInterval(counter);
            el.innerText = target.toLocaleString();
        }
    }, frameRate);
}

function easeOutQuad(t) {
    return t * (2 - t);
}
