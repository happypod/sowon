/**
 * 07_modal.js
 * Standardized Modal Controller for KPI/Help data
 * Ticket 03: Modal 공통화 + cardHelp 데이터 분리
 */

window.App = window.App || {};

App.modal = {
    MODAL_ID: 'app-standard-modal',

    _createContainerIfMissing() {
        let container = document.getElementById(this.MODAL_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = this.MODAL_ID;
            container.className = 'fixed inset-0 bg-slate-900/50 hidden z-[200] flex items-center justify-center backdrop-blur-sm';
            container.onclick = (e) => {
                if (e.target === container) this.close();
            };
            document.body.appendChild(container);
        }
        return container;
    },

    /**
     * Show Modal
     * @param {string} kpiKey 
     * @param {number|string} currentScore Optional displayed score
     */
    show(kpiKey, currentScore = '-') {
        const container = this._createContainerIfMissing();
        
        // Show immediately with loading state (or render directly if data exists)
        this._renderContent(container, kpiKey, currentScore);
        
        container.classList.remove('hidden');
    },

    close() {
        const container = document.getElementById(this.MODAL_ID);
        if (container) container.classList.add('hidden');
        
        // [Ticket 07] Clean up modal chart instance to prevent memory leaks
        if (window.App?.chartManager) {
            window.App.chartManager.destroyByTab('modal');
        }
    },

    _renderContent(container, key, score) {
        // Fallback for missing HelpData
        const help = (window.App.helpData && window.App.helpData[key]) || {
            title: key,
            summary: "해당 지표에 대한 설명 데이터가 없습니다.",
            formula: "-",
            components: [],
            source: "-",
            notes: "-"
        };

        let compHtml = '';
        
        // [Ticket 06] Try to fetch real component scores from global state
        const extComps = window.App?.admin?.data?.combined?.kpiComponents?.[key];
        
        if (extComps && typeof extComps === 'object') {
            // Render Real Component Scores
            compHtml = Object.entries(extComps).map(([compKey, val]) => {
                // Find matching human-readable label or use key
                const matchLabel = help.components.find(c => c.toLowerCase().includes(compKey.toLowerCase()) || c.replace(/\s+/g, '') === compKey) || compKey;
                
                // Color mapping logic (Higher is usually better, but SII/Constraint might be inverted depending on context)
                // We'll use a neutral primary color (ocean-500) for components.
                const color = key === 'SII' ? 'rose' : 'ocean';
                const pct = Math.min(100, Math.max(0, val));
                
                return `
                    <div class="px-3 py-2 bg-slate-50 border border-slate-100 rounded mb-2">
                        <div class="flex justify-between items-center text-sm mb-1">
                            <span class="text-slate-600 font-medium">${matchLabel} <span class="text-xs text-slate-400 font-normal">(${compKey})</span></span>
                            <span class="font-bold text-slate-800">${parseFloat(val).toFixed(1)}</span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-1.5">
                            <div class="bg-${color}-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Fallback to Static Text if Data is Missing
            compHtml = help.components && help.components.length > 0 
                ? help.components.map(c => `
                    <div class="px-3 py-2 bg-slate-50 border border-slate-100 rounded text-slate-600 text-sm mb-1 last:mb-0">
                        <i class="fas fa-cube text-ocean-400 mr-2"></i>${c}
                    </div>
                  `).join('')
                : '<span class="text-sm text-slate-400">구성 요소 데이터 없음</span>';
        }

        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <!-- Header -->
                <div class="bg-slate-800 p-6 flex justify-between items-center">
                    <div>
                        <h3 class="text-xl font-bold text-white">${help.title}</h3>
                        <p class="text-slate-400 text-sm">지표 정의 및 설명 (도움말)</p>
                    </div>
                    <button onclick="App.modal.close()" class="text-slate-400 hover:text-white transition group">
                        <i class="fas fa-times text-xl group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>
                
                <!-- Body -->
                <div class="p-6 overflow-y-auto max-h-[80vh]">
                    <!-- Optional Score Display above definition if requested by context -->
                    ${score !== '-' ? `
                        <div class="mb-6 text-center pb-4 border-b border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">현재 대시보드 할당 값</span>
                            <span class="text-4xl font-black text-ocean-600">${score}</span>
                            <span class="text-sm text-slate-500 ml-1">점</span>
                        </div>
                    ` : ''}

                    ${window.App?.config?.features?.kpiTrend6m && score !== '-' ? `
                    <div class="mb-5">
                        <h4 class="font-bold text-slate-800 text-sm mb-2"><i class="fas fa-chart-line mr-2 text-slate-400"></i>최근 6개월 추이</h4>
                        <div id="modal-trend-chart" class="w-full h-40 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                             <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-ocean-500"></div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="mb-5">
                        <h4 class="font-bold text-slate-800 text-sm mb-2"><i class="fas fa-book mr-2 text-slate-400"></i>개요</h4>
                        <p class="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">${help.summary}</p>
                    </div>

                    <div class="mb-5">
                        <h4 class="font-bold text-slate-800 text-sm mb-2"><i class="fas fa-calculator mr-2 text-slate-400"></i>산출 공식</h4>
                        <code class="block w-full p-3 bg-slate-50 text-slate-700 text-xs rounded border border-slate-200 font-mono break-words">${help.formula}</code>
                    </div>

                    <div class="mb-5">
                        <h4 class="font-bold text-slate-800 text-sm mb-2"><i class="fas fa-database mr-2 text-slate-400"></i>데이터 참조</h4>
                        <p class="text-xs text-slate-500">${help.source}</p>
                    </div>

                    <div class="mb-5">
                        <h4 class="font-bold text-slate-800 text-sm mb-2"><i class="fas fa-layer-group mr-2 text-slate-400"></i>주요 구성 요소</h4>
                        <div>${compHtml}</div>
                    </div>
                    
                    ${help.notes !== '-' ? `
                    <div class="mt-4 pt-4 border-t border-slate-100">
                        <h4 class="font-bold text-ocean-700 text-xs uppercase mb-1">💡 분석 참고 사항</h4>
                        <p class="text-xs text-slate-500 leading-relaxed">${help.notes}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // [Ticket 07] Render Trend Chart if enabled
        if (window.App?.config?.features?.kpiTrend6m && score !== '-') {
            setTimeout(async () => {
                try {
                    const trendData = await window.AdminDataService.loadKpiTrend6m(key, score);
                    const chartEl = document.getElementById('modal-trend-chart');
                    if (!chartEl) return;
                    
                    chartEl.innerHTML = ''; // basic clean to remove spinner
                    chartEl.classList.remove('flex', 'items-center', 'justify-center');
                    
                    const option = {
                        grid: { top: 10, right: 10, bottom: 20, left: 30 },
                        xAxis: { 
                            type: 'category', 
                            data: trendData.labels, 
                            axisLine: { lineStyle: { color: '#cbd5e1' } }, 
                            axisLabel: { color: '#64748b', fontSize: 10 } 
                        },
                        yAxis: { 
                            type: 'value', 
                            min: function (value) { return Math.max(0, Math.floor(value.min - 5)); },
                            max: function (value) { return Math.min(100, Math.ceil(value.max + 5)); },
                            splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }, 
                            axisLabel: { color: '#94a3b8', fontSize: 10 } 
                        },
                        series: [{
                            data: trendData.data,
                            type: 'line',
                            smooth: true,
                            symbolSize: 6,
                            itemStyle: { color: '#3b82f6' },
                            areaStyle: {
                                color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    {offset: 0, color: 'rgba(59,130,246,0.3)'}, 
                                    {offset: 1, color: 'rgba(59,130,246,0)'}
                                ])
                            }
                        }],
                        tooltip: { 
                            trigger: 'axis', 
                            formatter: '{b}: <b>{c}점</b>' 
                        }
                    };
                    
                    if (window.App?.chartManager) {
                        window.App.chartManager.renderEChart('modal-trend-chart', option, 'modal');
                    }
                } catch(e) {
                    console.error("Modal Trend Chart Error", e);
                    const chartEl = document.getElementById('modal-trend-chart');
                    if(chartEl) chartEl.innerHTML = '<span class="text-xs text-slate-400">데이터를 불러올 수 없습니다.</span>';
                }
            }, 50);
        }
    }
};
