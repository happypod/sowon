/**
 * tab_dashboard.js
 * Controller for Tab 1: Strategy Dashboard
 * Ticket 04: Tab Separation
 */

window.App = window.App || {};

App.tabDashboard = {
    init() {
        console.log("[Tab: Dashboard] Initialized");
        this._initEvents();
    },

    _initEvents() {
        const triggers = ['dash-filter-period', 'dash-filter-scope', 'dash-filter-source'];
        triggers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    const scope = document.getElementById('dash-filter-scope')?.value || 'all';
                    const period = document.getElementById('dash-filter-period')?.value || 'this_month';
                    const source = document.getElementById('dash-filter-source')?.value || 'raw';
                    if (window.App && window.App.admin) {
                        window.App.admin.syncData(scope, false, period, source);
                    }
                });
            }
        });

        const btnPdf = document.getElementById('btn-dash-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', () => {
                window.print();
            });
        }
    },
    
    /**
     * Called automatically by App.tabs.show('dashboard')
     */
    load() {
        this.render();
    },

    render() {
        const s = window.App.store ? window.App.store.get('summary') : null;
        if(!s) return;

        const kpi = s.kpi || {};
        
        // 1. KPI Cards (1 decimal) Use App.utils.fmt
        const fmt = window.App.utils ? window.App.utils.fmt : (v) => v;
        
        const setValSafely = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.innerText = val;
        };

        const trendData = window.App.store ? window.App.store.get('trend') : null;

        const renderKpiCard = (key, score) => {
            setValSafely(`dash-${key.toLowerCase()}`, fmt(score));
            
            // 1. Tag (Risk Logic)
            let tagStr = '🟢 안정';
            let tagColor = 'text-emerald-600 bg-emerald-50';
            const numScore = parseFloat(score) || 0;
            
            if (key === 'RTRI' && numScore < 45) { tagStr = '🔴 전환위험'; tagColor = 'text-rose-600 bg-rose-50'; }
            else if (key === 'CGS' && numScore < 50) { tagStr = '🔴 협력취약'; tagColor = 'text-amber-600 bg-amber-50'; }
            else if (key === 'SII' && numScore > 60) { tagStr = '🔴 불균형심화'; tagColor = 'text-orange-600 bg-orange-50'; }
            else if (key === 'LSI' && numScore < 55) { tagStr = '🟡 개선필요'; tagColor = 'text-amber-600 bg-amber-50'; }
            else if (key === 'PTS' && numScore < 50) { tagStr = '🟡 유인성부족'; tagColor = 'text-amber-600 bg-amber-50'; }
            else if (key === 'SUS' && numScore < 50) { tagStr = '🟡 지속성경고'; tagColor = 'text-amber-600 bg-amber-50'; }

            const tagEl = document.getElementById(`dash-tag-${key.toLowerCase()}`);
            if(tagEl) {
                tagEl.innerHTML = tagStr;
                tagEl.className = `text-[10px] px-1.5 py-0.5 rounded font-bold ${tagColor}`;
            }

            // 2. Trend Delta
            let deltaHtml = '<span class="text-slate-300">-</span>';
            if(trendData && trendData.length >= 2) {
                 const cur = trendData[trendData.length-1][key] || numScore;
                 const prev = trendData[trendData.length-2][key] || numScore;
                 const diff = (cur - prev).toFixed(1);
                 if(diff > 0) deltaHtml = `<span class="text-emerald-500"><i class="fas fa-caret-up"></i> ${diff}</span>`;
                 else if(diff < 0) deltaHtml = `<span class="text-rose-500"><i class="fas fa-caret-down"></i> ${Math.abs(diff)}</span>`;
                 // SII(불균형 지수) 역상관 처리
                 if(key === 'SII' && diff > 0) deltaHtml = `<span class="text-rose-500"><i class="fas fa-caret-up"></i> ${diff}</span>`;
                 if(key === 'SII' && diff < 0) deltaHtml = `<span class="text-emerald-500"><i class="fas fa-caret-down"></i> ${Math.abs(diff)}</span>`;
            }
            const deltaEl = document.getElementById(`dash-delta-${key.toLowerCase()}`);
            if(deltaEl) deltaEl.innerHTML = deltaHtml;

            // 3. Meta (Sample & Source)
            const sampleN = s.survey?.responseCount || 0;
            const metaStr = sampleN < 30 ? `<span class="text-amber-500"><i class="fas fa-exclamation-triangle"></i> 표본 부족 (${sampleN}명)</span>` : `<span class="text-emerald-500"><i class="fas fa-check-circle"></i> 신뢰도 확보 (${sampleN}명)</span>`;
            const metaEl = document.getElementById(`dash-meta-${key.toLowerCase()}`);
            if(metaEl) metaEl.innerHTML = metaStr;
        };

        ['RTRI','SII','LSI','CGS','PTS','SUS'].forEach(k => renderKpiCard(k, kpi[k] || 0));

        // 2. Phase & Survey Info / DASH-01: Metadata Info
        if(s.phase) setValSafely('dash-phase', s.phase.current || '-');
        if(s.survey) {
            const count = s.survey.responseCount || 0;
            setValSafely('dash-survey-rate', `${count}명`);
            setValSafely('dash-sample-n', count);
        }
        
        if(s.updatedAt) {
            try {
                const dt = new Date(s.updatedAt);
                setValSafely('dash-last-updated', dt.toLocaleString('ko-KR'));
            } catch(e) {
                setValSafely('dash-last-updated', '-');
            }
        } else {
             setValSafely('dash-last-updated', '-');
        }

        // 3. Risk Signals & Integrity Banner (DASH-03)
        this._renderRiskSignals(s);

        // 4. Trend Chart
        if(trendData) {
            this._renderTrendChart(trendData);
        }

        // 5. Routine Summary (DASH-04)
        this._renderRoutineSummary();

        // 6. DASH-06 & DASH-07
        this._renderMiniMap(s);
        this._renderPriorityMatrix(s);
    },

    /**
     * Render Risk Signals & Data Integrity (DASH-03)
     */
    _renderRiskSignals(s) {
        const integrityBanner = document.getElementById('dash-integrity-banner');
        const icon = document.getElementById('dash-integrity-icon');
        const title = document.getElementById('dash-integrity-title');
        const desc = document.getElementById('dash-integrity-desc');
        
        if(integrityBanner) {
            if(s.alerts && s.alerts.length > 0) {
                const dangerAlerts = s.alerts.filter(a => a.level === 'danger');
                if(dangerAlerts.length > 0) {
                    integrityBanner.className = "mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg flex items-start gap-2 transition-all";
                    icon.className = "fas fa-times-circle mt-0.5";
                    title.innerText = "데이터 품질: 오류 발견";
                    desc.innerText = dangerAlerts[0].message;
                } else {
                    integrityBanner.className = "mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-xs p-2.5 rounded-lg flex items-start gap-2 transition-all";
                    icon.className = "fas fa-exclamation-triangle mt-0.5";
                    title.innerText = "데이터 품질: 주의";
                    desc.innerText = s.alerts[0].message;
                }
                integrityBanner.classList.remove('hidden');
            } else {
                integrityBanner.className = "mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-2.5 rounded-lg flex items-start gap-2 transition-all";
                icon.className = "fas fa-check-circle mt-0.5";
                title.innerText = "데이터 품질: 양호";
                desc.innerText = "결측치 및 이상치가 발견되지 않았습니다.";
                integrityBanner.classList.remove('hidden');
            }
        }

        const signalsContainer = document.getElementById('dash-risk-signals');
        if(!signalsContainer) return;

        const kpi = s.kpi || {};
        const signals = [];

        if(kpi.RTRI < 45) {
            signals.push({ level: 'critical', title: '전환 타당성 낮음', desc: '현재 전환 의향 및 객실 확보가 저조합니다.', kpi: 'RTRI', val: kpi.RTRI.toFixed(1) });
        }
        if(kpi.CGS < 50) {
            signals.push({ level: 'critical', title: '거버넌스 협력 위험', desc: '주민 협의체 구성 및 참여율이 낮습니다.', kpi: 'CGS', val: kpi.CGS.toFixed(1) });
        }
        if(kpi.SII > 60) {
            signals.push({ level: 'critical', title: '수요-공급 불균형 심화', desc: '특정 지역/시기에 수요가 과도하게 집중됨.', kpi: 'SII', val: kpi.SII.toFixed(1) });
        }
        if(kpi.LSI < 55) {
            signals.push({ level: 'warning', title: '생활 인프라 개선 필요', desc: '의료 및 교통 접근성 불만족이 높습니다.', kpi: 'LSI', val: kpi.LSI.toFixed(1) });
        }
        if(kpi.SUS < 50) {
            signals.push({ level: 'warning', title: '비수기 수익성 경고', desc: '운영 지속성을 위한 추가 수익 모델 필요.', kpi: 'SUS', val: kpi.SUS.toFixed(1) });
        }
        
        const sampleN = s.survey?.responseCount || 0;
        if(sampleN < 30) {
            signals.push({ level: 'warning', title: '표본 부족', desc: `신뢰도 확보를 위한 추가 표본 수집 요망 (${sampleN}명)`, kpi: 'DATA', val: 'Req' });
        }

        if(signals.length === 0) {
             signalsContainer.innerHTML = `<div class="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-sm border border-slate-100 mt-4"><i class="fas fa-shield-alt text-xl mb-2 block text-slate-300"></i>발견된 위험 신호가 없습니다.</div>`;
             return;
        }

        signalsContainer.innerHTML = signals.map(sig => {
            const isWarn = sig.level === 'warning';
            const bg = isWarn ? 'bg-amber-50' : 'bg-rose-50';
            const border = isWarn ? 'border-amber-100' : 'border-rose-100';
            const iconColor = isWarn ? 'text-amber-500' : 'text-rose-500';
            const iconClass = isWarn ? 'fa-exclamation-triangle' : 'fa-skull-crossbones';
            
            return `
            <div class="p-3 ${bg} border ${border} rounded-lg flex items-start gap-3 transition hover:-translate-y-0.5 duration-200">
                <div class="${iconColor} mt-1"><i class="fas ${iconClass}"></i></div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-0.5">
                        <strong class="text-sm text-slate-800">${sig.title}</strong>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 bg-white rounded shadow-sm text-slate-600 border border-slate-100">${sig.kpi} ${sig.val}</span>
                    </div>
                    <p class="text-xs text-slate-500 leading-tight">${sig.desc}</p>
                </div>
            </div>`;
        }).join('');
    },

    /**
     * Render the 3-Month Trend Chart (ECharts layer)
     */
    _renderTrendChart(trendData) {
        const chartDom = document.getElementById('chart-trend');
        if(!chartDom || !window.echarts) return;
        
        if(!trendData || trendData.length === 0) {
            chartDom.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400 text-sm">월별 추이 데이터가 없습니다.</div>`;
            chartDom.removeAttribute('_echarts_instance_');
            return;
        }

        const months = trendData.map(d => d.month);
        const rtri = trendData.map(d => d.RTRI);
        const counts = trendData.map(d => d.responses_count);

        const option = {
            tooltip: { trigger: 'axis' },
            legend: { data: ['RTRI (종합지수)', '응답 수'] },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: months },
            yAxis: [
                { type: 'value', name: 'RTRI', min: 0, max: 100 },
                { type: 'value', name: '응답', position: 'right' }
            ],
            series: [
                { 
                    name: 'RTRI (종합지수)', type: 'line', data: rtri, smooth: true, 
                    itemStyle: { color: '#0ea5e9' }, lineStyle: { width: 3 } 
                },
                { 
                    name: '응답 수', type: 'bar', yAxisIndex: 1, data: counts, 
                    itemStyle: { color: '#cbd5e1', opacity: 0.5 }, barWidth: '30%'
                }
            ]
        };
        
        if (window.App && App.chartManager) {
            App.chartManager.renderEChart('chart-trend', option, 'dashboard');
        }
    },

    /**
     * Render Operations Routine Summary (DASH-04)
     */
    async _renderRoutineSummary() {
        const rateEl = document.getElementById('dash-routine-rate');
        const statEl = document.getElementById('dash-routine-stat');
        const missedEl = document.getElementById('dash-routine-missed');
        if(!rateEl || !statEl || !missedEl) return;

        try {
            // Load current month ops routine
            const data = await window.AdminDataService.loadOpsRoutine();
            if(!data) throw new Error("No data");

            const items = data.items || [];
            const total = items.length;
            const rate = Math.round(data.completionRate || 0);
            const completed = Math.round((rate / 100) * total);

            rateEl.innerText = `${rate}%`;
            statEl.innerText = `(${completed}/${total} 완료)`;

            // Get Top 3 missed items
            const missedItems = items.filter(it => !it.checked && !it.done).slice(0, 3);
            if(missedItems.length === 0) {
                missedEl.innerHTML = `<span class="text-emerald-500 text-xs font-bold"><i class="fas fa-check-double mr-1"></i>모든 주요 루틴이 완료되었습니다.</span>`;
            } else {
                missedEl.innerHTML = missedItems.map(it => `
                    <span class="bg-rose-500/20 text-rose-300 text-[10px] px-2 py-1 rounded border border-rose-500/30 truncate max-w-[150px]" title="${it.title}">
                        <i class="fas fa-exclamation-circle mr-1 opacity-70"></i>${it.title}
                    </span>
                `).join('');
            }
        } catch(e) {
            console.error("Routine Summary Error:", e);
            rateEl.innerText = "-";
            statEl.innerText = "";
            missedEl.innerHTML = '<span class="text-xs text-rose-400">데이터를 불러오지 못했습니다.</span>';
        }
    },

    /**
     * Render Mini Map (DASH-06): simplified to horizontal CGS bar chart if map is unavailable
     */
    _renderMiniMap(s) {
        const dom = document.getElementById('dash-mini-map');
        if(!dom || !window.echarts || !s.kpiByRi) return;

        const regions = Object.keys(s.kpiByRi).filter(r => r !== '전체' && r !== 'ALL');
        const cgsData = regions.map(r => s.kpiByRi[r].CGS || 0).map(v => Number(v.toFixed(1)));

        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { top: '5%', bottom: '15%', left: '20%', right: '10%' },
            xAxis: { type: 'value', min: 0, max: 100 },
            yAxis: { type: 'category', data: regions, axisLabel: { fontSize: 10 } },
            series: [{
                type: 'bar',
                data: cgsData,
                itemStyle: {
                    color: (params) => {
                        const val = params.value;
                        if(val < 50) return '#f43f5e'; // rose-500
                        if(val < 60) return '#f59e0b'; // amber-500
                        return '#10b981'; // emerald-500
                    },
                    borderRadius: [0, 4, 4, 0]
                },
                label: { show: true, position: 'right', fontSize: 10, color: '#64748b' }
            }]
        };

        if(window.App && App.chartManager) {
            App.chartManager.renderEChart('dash-mini-map', option, 'dashboard');
        } else {
            const chart = window.echarts.init(dom);
            chart.setOption(option);
        }
    },

    /**
     * Render Priority Matrix (DASH-07) - Scatter Plot
     */
    _renderPriorityMatrix(s) {
        const dom = document.getElementById('dash-priority-matrix');
        if(!dom || !window.echarts || !s.kpi) return;

        const kpi = s.kpi;
        // X-axis: Feasibility (Mock logic based on domain knowledge)
        // Y-axis: Risk Severity (100 - Score)
        const feasibilityMap = {
            'RTRI': 35, // Hard to change
            'SUS': 45,
            'SII': 55,
            'CGS': 65,
            'PTS': 75,
            'LSI': 85  // Easier to change
        };

        const scatterData = ['RTRI', 'SII', 'LSI', 'CGS', 'PTS', 'SUS'].map(key => {
            const score = kpi[key] || 0;
            const severity = Math.max(0, 100 - score); // higher is worse
            const feas = feasibilityMap[key];
            return {
                name: key,
                value: [feas, severity], // [x, y]
                score: score
            };
        });

        const option = {
            tooltip: {
                formatter: (p) => {
                    const d = p.data;
                    return `<b>${d.name}</b><br/>점수: ${d.score.toFixed(1)}점<br/>실행가능성: ${d.value[0]}<br/>위험도: ${d.value[1].toFixed(1)}`;
                }
            },
            grid: { top: '5%', bottom: '5%', left: '5%', right: '5%', containLabel: false },
            xAxis: { 
                type: 'value', min: 0, max: 100, show: false,
                splitLine: { show: false }
            },
            yAxis: { 
                type: 'value', min: 0, max: 100, show: false,
                splitLine: { show: false }
            },
            series: [{
                type: 'scatter',
                data: scatterData,
                symbolSize: 24,
                itemStyle: {
                    color: '#6366f1', // indigo-500
                    opacity: 0.8,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: '{b}',
                    position: 'inside',
                    fontSize: 8,
                    color: '#fff',
                    fontWeight: 'bold'
                }
            }]
        };

        if(window.App && App.chartManager) {
            App.chartManager.renderEChart('dash-priority-matrix', option, 'dashboard');
            // Transparent background to let matrix CSS show through
            const inst = window.echarts.getInstanceByDom(dom);
            if(inst) inst.setOption({ backgroundColor: 'transparent' });
        } else {
            const chart = window.echarts.init(dom);
            option.backgroundColor = 'transparent';
            chart.setOption(option);
        }
    }
};

// Auto-register to the router
if (window.App && App.tabs) {
    App.tabs.register('dashboard', App.tabDashboard);
}
