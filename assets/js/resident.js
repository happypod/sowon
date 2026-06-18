
window.toggleQ20 = function(show) {
    const container = document.getElementById('q20-container');
    if(container) {
        container.style.display = show ? 'block' : 'none';
        const q20Radios = document.querySelectorAll('input[name="entry.Q20"]');
        q20Radios.forEach(r => show ? r.setAttribute('required', 'required') : r.removeAttribute('required'));
    }
};

// Init UI
document.addEventListener('DOMContentLoaded', async () => {
    UI.init('resident');
    fetchStats();
    setInterval(fetchStats, 60000);
    toggleQ20(false); // Initialize Q20 as hidden/disabled

    const isOpen = await APP.guardSurveyOpen('resident');
    if (!isOpen) return;

    const form = document.getElementById('surveyForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitForm();
        });
    }
});

// --- Validation & Submission Logic ---
async function submitForm() {
    if (!validateForm()) return;

    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "제출 중...";

    const formData = {};
    const getVal = (name) => {
        const els = document.querySelectorAll(`[name="${name}"]`);
        if (els.length === 0) return '';
        if (els[0].type === 'radio') {
            const checked = Array.from(els).find(e => e.checked);
            return checked ? checked.value : '';
        }
        if (els[0].type === 'checkbox') {
             return Array.from(els).filter(e => e.checked).map(e => e.value).join(', ');
        }
        return els[0].value;
    };

    for (let i = 1; i <= 27; i++) {
        formData[`Q${i}`] = getVal(`entry.Q${i}`);
    }
    
    formData['NAME'] = document.getElementById('p_name').value;
    formData['DOB'] = document.getElementById('p_dob').value;
    formData['PHONE'] = document.getElementById('p_phone').value;
    formData['consent'] = true;

    // Delegated to APP.js
    await APP.submitSurvey('resident', formData);
    
    submitBtn.disabled = false;
    submitBtn.innerText = originalText;
}

function validateForm() {
    const name = document.getElementById('p_name').value.trim();
    const dob = document.getElementById('p_dob').value.trim();
    const phone = document.getElementById('p_phone').value.trim();

    if (!name) { alert('성명을 입력해주세요.'); document.getElementById('p_name').focus(); return false; }
    if (dob.length !== 6) { alert('생년월일 6자리를 정확히 입력해주세요.'); document.getElementById('p_dob').focus(); return false; }
    if (phone.length !== 4) { alert('휴대폰 뒷자리 4자리를 정확히 입력해주세요.'); document.getElementById('p_phone').focus(); return false; }

    for (let i = 1; i <= 27; i++) {
         // Q27 is a textarea, no need to check for checked/selected
         if(i === 27) continue;

         const qName = `entry.Q${i}`;
         const options = document.querySelectorAll(`[name="${qName}"]`);
         if (options.length > 0) {
              // If it's a radio or checkbox group
              if (options[0].type === 'radio' || options[0].type === 'checkbox') {
                 // If Q20 is hidden, skip its validation
                 if (i === 20 && document.getElementById('q20-container').style.display === 'none') {
                     continue;
                 }
                 if (!Array.from(options).some(opt => opt.checked)) {
                      alert(`Q${i} 항목을 답변해주세요.`);
                      options[0].scrollIntoView({behavior: "smooth", block: "center"});
                      return false;
                 }
             }
         }
    }
     return true;
}

// --- Stats Dashboard Logic ---
async function fetchStats() {
    const stats = await APP.fetchStats('stats_resident', { period: 'all' });
    if(stats) {
        renderStats(stats);
        document.getElementById('last-update').innerText = '업데이트: ' + new Date().toLocaleTimeString();
    }
}

function renderStats(stats) {
    // Helpers (Fallback if APP.renderBar is missing)
    if (!APP.renderBar && App && App.utils && App.utils.renderBar) {
        APP.renderBar = App.utils.renderBar;
    }
    const renderList = (id, dataObj) => {
        const container = document.getElementById(id);
        if(!dataObj) { container.innerHTML = '<p class="text-gray-400">데이터 없음</p>'; return; }
        
        let items = [];
        if(Array.isArray(dataObj)) items = dataObj; 
        else items = Object.entries(dataObj).map(([k,v]) => ({label:k, count:v})).sort((a,b)=>b.count-a.count);
        
        if(items.length === 0) { container.innerHTML = '<p class="text-gray-400">데이터 없음</p>'; return; }
        
        const max = Math.max(...items.map(i=>i.count));
        container.innerHTML = items.map(i => APP.renderBar(i.label, i.count, max)).join('');
    };

    if(stats.total) document.getElementById('stat-total').innerText = stats.total + " 명";

    renderList('stat-villages', stats.q1);
    renderList('stat-urgent', stats.q22 ? stats.q22.top3 : []);
    renderList('stat-worries', stats.q16 ? stats.q16.top3 : []);
    renderList('stat-uncomfortable', stats.q9 ? stats.q9.top3 : []);

    if(stats.q8) document.getElementById('stat-satisfaction-avg').innerText = stats.q8.avg;
    if(stats.q7) document.getElementById('stat-income-avg').innerText = stats.q7.avg;
}
