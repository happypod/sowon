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
        // Fetch summary data from GAS Backend
        const res = await App.api.callAction('admin_summary', { region: 'all', period: 'all' });
        if(res && res.survey) {
            const counts = res.counts || {};
            const total = res.survey.responseCount || 0;
            const resident = counts.resident_total || 0;
            const tourist = counts.tourist_total || 0;
            const lodging = counts.lodging_total || 0;
            const visitor = counts.visitor_total || 0;

            // Animate each counter
            animateCounter('hero-total', total);
            animateCounter('hero-resident', resident);
            animateCounter('hero-tourist', tourist);
            animateCounter('hero-lodging', lodging);
            animateCounter('hero-visitor', visitor);
        }
    } catch(err) {
        console.warn('Failed to load real counter data, using fallbacks', err);
        // Fallback or just leave as 0
    }
}

async function applySurveyCardStatus() {
    const settings = await APP.fetchSurveySettings();
    if (!settings || !settings.surveys) return;

    document.querySelectorAll('[data-survey-type]').forEach((card) => {
        const type = card.dataset.surveyType;
        const item = settings.surveys[type];
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
