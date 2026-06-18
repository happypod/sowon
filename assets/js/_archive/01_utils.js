/**
 * 01_utils.js
 * Common General Utilities
 * Ticket 01: Core 분리
 */

window.App = window.App || {};

App.utils = {
    /**
     * Number Formatter (e.g. 1000 -> 1,000)
     */
    fmt(val) {
        if(val === null || val === undefined || isNaN(val)) return '-';
        return Number(val).toLocaleString();
    },

    /**
     * Render a standard Progress Bar HTML string
     */
    renderBar(label, count, max, colorClass = 'bg-ocean-500') {
        const pct = max > 0 ? (count / max * 100) : 0;
        return `
            <div class="mb-2">
                <div class="flex items-center justify-between mb-1">
                    <span class="truncate w-2/3 text-xs text-slate-600" title="${label}">${label}</span>
                    <span class="font-bold text-ocean-600 text-xs">${count}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="${colorClass} h-1.5 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    },

    /**
     * Show a standardized Error Toast
     */
    showError(msg, retryCallback = null) {
        // Remove existing errors
        document.querySelectorAll('.fixed-error-toast').forEach(e => e.remove());

        const errDiv = document.createElement('div');
        errDiv.className = 'fixed-error-toast fixed top-5 right-5 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded shadow-xl z-50 flex items-center gap-3 animate-bounce';
        
        let retryBtnHtml = '';
        if (retryCallback) {
            // Generate a unique ID for the retry button to attach event listener safely
            const btnId = 'err-retry-btn-' + Date.now();
            retryBtnHtml = `<button id="${btnId}" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded font-bold transition-colors mt-2">다시 시도</button>`;
            
            // Attach event listener after injecting HTML
            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if (btn) btn.addEventListener('click', retryCallback);
            }, 0);
        }

        errDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle text-2xl"></i>
            <div>
                <strong class="font-bold block">시스템 알림</strong>
                <span class="text-sm block mb-1">${msg}</span>
                ${retryBtnHtml}
            </div>
            <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 ml-2 self-start"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(errDiv);
        
        // Auto remove after 5s if no retry button
        if(!retryCallback) setTimeout(() => errDiv.remove(), 5000);
    },

    /**
     * Show a standardized Success Toast
     */
    showSuccess(msg) {
        document.querySelectorAll('.fixed-success-toast').forEach(e => e.remove());

        const div = document.createElement('div');
        div.className = 'fixed-success-toast fixed top-5 right-5 bg-green-100 border border-green-400 text-green-800 px-6 py-4 rounded shadow-xl z-[100] flex items-center gap-3 animate-fade-in-down';
        
        div.innerHTML = `
            <i class="fas fa-check-circle text-2xl text-green-500"></i>
            <div>
                <strong class="font-bold block text-sm">성공</strong>
                <span class="text-sm block">${msg}</span>
            </div>
            <button onclick="this.parentElement.remove()" class="text-green-500 hover:text-green-700 ml-2 self-start"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
};
