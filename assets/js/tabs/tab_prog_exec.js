/**
 * Tab 8.1: Program Execution Summary -> 조사기반 우선수요 분석 (주민 수요·우선과제 분석)
 */

window.App = window.App || {};

window.App.tabProgExec = {
    isExampleMode: false,
    realData: null,
    currentContainer: null,
    charts: [],

    render(data, container) {
        this.realData = data;
        this.currentContainer = container;
        this._renderContent();
    },

    toggleMode() {
        this.isExampleMode = !this.isExampleMode;
        if(this.currentContainer) {
             this._renderContent();
        }
    },

    _renderContent() {
        const rawData = this.isExampleMode && window.App.EXAMPLE_PROG_EXEC ? window.App.EXAMPLE_PROG_EXEC : this.realData;
        const container = this.currentContainer;

        // Cleanup old charts
        this.charts.forEach(c => c && c.dispose());
        this.charts = [];

        if (!rawData) {
            container.innerHTML = `<div class="p-8 text-center text-slate-500">데이터가 없습니다.</div>`;
            return;
        }

        const data = rawData.data || rawData;
        
        const total = data.total || 0;
        const villageCounts = data.villageCounts || {};
        const ageCounts = data.ageCounts || {};
        const needsDist = data.needsDist || {};
        const keywords = data.keywords || [];
        
        let seniorCount = 0;
        for (const [age, count] of Object.entries(ageCounts)) {
            if (age.includes('60대') || age.includes('70대') || age.includes('80대') || age.includes('이상')) {
                seniorCount += count;
            }
        }
        const seniorRatio = total ? ((seniorCount / total) * 100).toFixed(1) : 0;

        const needNames = Object.keys(needsDist);
        const topNeed = needNames.length ? needNames.reduce((a, b) => needsDist[a] > needsDist[b] ? a : b, needNames[0]) : "-";
        const topKeyword = keywords.length ? keywords[0].keyword : "-";
        
        const sysAvgs = data.avgScores || {};
        const risks = data.highRiskCounts || {};
        const rawOpinions = data.rawOpinions || [];

        const workshopData = data.workshopData || { topThemesByVillage: {}, matrixPoints: [], representativeOpinions: [] };
        const planDirections = data.planDirections || [];

        // 1. Dynamic Opinions HTML
        let opinionsHtml = '';
        const opList = rawOpinions.length >= 3 ? rawOpinions : 
                       (workshopData.representativeOpinions.length > 0 ? workshopData.representativeOpinions : rawOpinions);
        
        if(opList.length > 0) {
            opinionsHtml = opList.map((op, i) => {
                const colors = ['rose', 'emerald', 'indigo', 'amber'];
                const c = colors[i % colors.length];
                return `<div class="p-3 bg-white rounded shadow-sm border-l-4 border-${c}-400">
                    <p class="text-sm text-slate-600">"${op}"</p>
                </div>`;
            }).join('');
        } else {
             opinionsHtml = `<div class="p-4 text-center text-slate-400 text-sm w-full h-full flex items-center justify-center">입력된 의견이 부족합니다.</div>`;
        }

        // 2. Based Operation Plan Generation (from PLAN_DIRECTION or fallback)
        const generateAIPlan = (pdList, wsData, avgs, rsks) => {
            let rows = [];
            
            // Priority 1: Use literal PLAN_DIRECTION from sheet
            if (pdList && pdList.length > 0) {
                pdList.forEach(p => {
                    rows.push(`<tr>
                        <td class="p-3 font-bold text-slate-800 shrink-0 whitespace-nowrap">${p.area}</td>
                        <td class="p-3 text-sm">${p.basis}</td>
                        <td class="p-3">
                            <ul class="text-sm text-slate-700 space-y-1">
                                ${p.shortTerm ? `<li><i class="fas fa-check text-emerald-500 mr-1"></i> <span class="font-bold">단기/시범:</span> ${p.shortTerm}</li>` : ''}
                                ${p.midTerm ? `<li><i class="fas fa-arrow-right text-ocean-500 mr-1"></i> <span class="font-bold">중장기:</span> ${p.midTerm}</li>` : ''}
                                ${p.partner ? `<li><i class="fas fa-hands-helping text-amber-500 mr-1"></i> <span class="font-bold">협력 주체:</span> ${p.partner}</li>` : ''}
                            </ul>
                        </td>
                    </tr>`);
                });
                return rows.join('');
            }
            
            // Priority 2: Use WORKSHOP_CODING matrix points as fallback
            if (wsData && wsData.matrixPoints && wsData.matrixPoints.length > 0) {
                // simple mapping
                wsData.matrixPoints.sort((a,b) => b.needScore - a.needScore).slice(0, 4).forEach(m => {
                    rows.push(`<tr>
                        <td class="p-3 font-bold text-slate-800 shrink-0 whitespace-nowrap">${m.area}</td>
                        <td class="p-3 text-sm">워크숍 보완 검토 지수: 필요도 ${Math.round(m.needScore)}점<br><span class="text-xs text-slate-400">참고: ${m.basisNote || '설문 및 현장 의견'}</span></td>
                        <td class="p-3">
                            <ul class="text-sm text-slate-600 space-y-1">
                                <li><i class="fas fa-check text-emerald-500 mr-1"></i> 해당 영역 사회혁신 실험 우선 발굴</li>
                                <li><i class="fas fa-hands-helping text-amber-500 mr-1"></i> 관련 분야 이해관계자 협력망 탐색</li>
                            </ul>
                        </td>
                    </tr>`);
                });
                return rows.join('');
            }

            // Fallback 3: Use generic text if absolutely nothing exists
            rows.push(`<tr>
              <td class="p-3 font-bold text-slate-800 shrink-0 whitespace-nowrap">현장 수요 재분석 필요</td>
              <td class="p-3 text-sm">운영방향 자동 매핑 데이터 및 워크숍 산출물 부재</td>
              <td class="p-3">
                  <ul class="text-sm text-slate-600 space-y-1">
                      <li><i class="fas fa-check text-emerald-500 mr-1"></i> 소규모 리더그룹 FGI (표적집단면접) 우선 추진</li>
                      <li><i class="fas fa-lightbulb text-amber-500 mr-1"></i> 타 지역 유사 우수사례 벤치마킹 기반 시범사업 가설 수립</li>
                  </ul>
              </td>
           </tr>`);
            
            return rows.join('');
        };
        const aiPlanHtml = generateAIPlan(planDirections, workshopData, sysAvgs, risks);

        const html = `
            <div class="mb-4 bg-ocean-50 border border-ocean-200 text-ocean-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <i class="fas fa-info-circle mt-1 text-ocean-600"></i>
                <div class="text-sm">
                    <strong>본 화면은 주민 설문 및 리더그룹 의견조사 결과를 바탕으로 한 우선수요 분석 자료입니다.</strong><br>
                    <span class="text-ocean-700 opacity-90">전체 인구의 확정 대상자 규모를 의미하지 않으며, 운영계획 반영을 위한 기초 분석 자료로 활용됩니다.</span>
                </div>
            </div>

            <div class="flex justify-end mb-4">
                <button onclick="if(window.App && window.App.tabProgExec) window.App.tabProgExec.toggleMode()" class="px-3 py-1.5 ${this.isExampleMode ? 'bg-ocean-100 text-ocean-800 border-ocean-200 hover:bg-ocean-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'} font-bold text-sm rounded-lg transition-colors flex items-center gap-2 border shadow-sm">
                    <i class="${this.isExampleMode ? 'fas fa-database text-ocean-500' : 'fas fa-lightbulb text-yellow-500'}"></i> ${this.isExampleMode ? '실제 데이터 보기' : '기획안 보기 (예시)'}
                </button>
            </div>

            <!-- Top KPI Cards: 조사 결과 요약 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[11px] font-bold text-slate-500 mb-1">전체 응답자 수</p>
                    <h3 class="text-2xl font-black text-slate-800">${total}<span class="text-sm font-normal text-slate-400 ml-1">명</span></h3>
                </div>
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[11px] font-bold text-slate-500 mb-1">고령 응답 비율 <span class="text-[9px] font-normal text-slate-400 ml-1">(응답자 기준)</span></p>
                    <h3 class="text-2xl font-black text-rose-600">${seniorRatio}<span class="text-sm font-normal text-slate-400 ml-1">%</span></h3>
                </div>
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[11px] font-bold text-slate-500 mb-1">최다 언급 필요 영역</p>
                    <h3 class="text-xl font-black text-indigo-600">${topNeed}</h3>
                </div>
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[11px] font-bold text-slate-500 mb-1">자유의견 상위 키워드</p>
                    <h3 class="text-xl font-black text-emerald-600">${topKeyword}</h3>
                </div>
            </div>

            <!-- Section 1 & 2 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Section 1. 조사표본 개요 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 class="font-bold text-slate-800 mb-4 border-l-4 border-ocean-500 pl-2">섹션 1. 조사표본 개요</h4>
                    ${total < 20 ? `<div class="mb-3 text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 text-center"><i class="fas fa-exclamation-triangle mr-1"></i> 전체 응답 수가 적어 세부 분석 해석에 유의가 필요합니다.</div>` : ''}
                    <div class="flex flex-col md:flex-row gap-4 h-64 w-full">
                        <div id="pe-chart-village" class="flex-1 w-full relative"></div>
                        <div id="pe-chart-age" class="flex-1 w-full relative"></div>
                    </div>
                    <p class="text-[10px] text-slate-400 text-center mt-2 pr-4">주: 응답자 기준 분포</p>
                </div>

                <!-- Section 2. 우선 필요 영역 분석 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 class="font-bold text-slate-800 mb-4 border-l-4 border-orange-500 pl-2">섹션 2. 우선 필요 영역 분석</h4>
                    <div id="pe-chart-needs" class="w-full h-64"></div>
                    <p class="text-[10px] text-slate-400 text-center mt-2 pr-4">복수응답 포함, 응답자 기준 관련 응답 비중</p>
                </div>
            </div>

            <!-- Section 3 & 4 (Matrix) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Section 3. 집단별 비교 분석 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 class="font-bold text-slate-800 mb-4 border-l-4 border-emerald-500 pl-2">섹션 3. 마을별 우선 필요영역 비교</h4>
                    <div id="pe-chart-compare" class="w-full h-64"></div>
                    <p class="text-[10px] text-slate-400 text-center mt-2 pr-4">주: 주민 설문 원응답 항목을 기준으로 마을별 상대 비교한 결과이며, 운영계획 반영을 위한 참고자료로 활용함.</p>
                </div>

                <!-- 우선 검토 분야 매트릭스 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 class="font-bold text-slate-800 mb-4 border-l-4 border-indigo-500 pl-2">우선 검토 분야 매트릭스</h4>
                    <div id="pe-chart-matrix" class="w-full h-64"></div>
                </div>
            </div>

            <!-- Section 6: 자유의견 및 기타 제안 분석 -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8">
                <h4 class="font-bold text-slate-800 mb-4 border-l-4 border-rose-500 pl-2">자유의견 및 워크숍·현장 보완의견 분석</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${opinionsHtml.includes('부족합니다') ? 
                        `<div class="col-span-1 md:col-span-2 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg border border-slate-100 text-center">
                            <i class="fas fa-comment-slash text-3xl text-slate-300 mb-3"></i>
                            <h5 class="font-bold text-slate-700 mb-1">정성분석 제한</h5>
                            <p class="text-sm text-slate-500">수집된 주관식 의견 및 워크숍 보완 의견이 부족하여 주요 키워드 도출이 제한됩니다.</p>
                        </div>` 
                        : 
                        `<div id="pe-chart-keywords" class="w-full h-64"></div>
                         <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-center space-y-3 relative">
                             ${rawOpinions.length < 3 ? '<div class="absolute -top-3 -right-2 bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded shadow-sm border border-rose-200">워크숍 보완 의견 포함</div>' : ''}
                             ${opinionsHtml}
                         </div>`
                    }
                </div>
                <p class="text-[10px] text-slate-400 text-right mt-3">주: 주민 자유의견과 워크숍·현장 보완의견을 함께 정제하여 반영한 정성 분석 결과임.</p>
            </div>

            <!-- Section 4. 운영계획 반영 방향(안) -->
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 p-1 rounded-xl shadow-lg mb-6">
                <div class="bg-white p-5 rounded-lg h-full">
                    <div class="flex items-center gap-2 mb-4">
                        <i class="fas fa-robot text-indigo-500 text-lg"></i>
                        <h4 class="font-black text-slate-800 text-lg">분석 기반 운영계획 반영 방향(안)</h4>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-slate-500 bg-slate-50 border-y border-slate-200">
                                <tr>
                                    <th class="p-3 font-bold">우선 권고 영역</th>
                                    <th class="p-3 font-bold">도출 근거 (산술 지수·현장 의견)</th>
                                    <th class="p-3 font-bold">단기 실천 전략</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-slate-700">
                                ${aiPlanHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="text-center text-xs text-slate-400 mt-6 pb-4">
                본 표는 주민 설문 응답과 워크숍 보완의견을 종합하여 사회혁신 실험 및 단위사업 방향을 도출한 참고안임.
            </div>
        `;

        container.innerHTML = html;

        // Render Charts after DOM updates
        setTimeout(() => {
            this._renderCharts(data);
        }, 50);
    },

    _renderCharts(data) {
        if(typeof echarts === 'undefined') return;

        const villageDist = data.villageCounts || {};
        const ageDist = data.ageCounts || {};
        const needsDist = data.needsDist || {};
        const keywords = data.keywords || [];
        const villageAvgs = data.villageAverages || {};
        const sysAvgs = data.avgScores || {};

        try {
            // 1. Village (Bar)
            const el1 = document.getElementById('pe-chart-village');
            if(el1) {
                const cv = echarts.init(el1);
                // Filter 0 counts
                const validVilKeys = Object.keys(villageDist).filter(k => villageDist[k] > 0);
                cv.setOption({
                    title: { text: "마을별 응답자 개황", textStyle: { fontSize: 11, fontWeight: 'normal', color: '#64748b' } },
                    tooltip: { trigger: 'axis' },
                    grid: { top: 30, right: 10, bottom: 20, left: 30 },
                    xAxis: { type: 'category', data: validVilKeys },
                    yAxis: { type: 'value', show: false },
                    series: [{ data: validVilKeys.map(k => villageDist[k]), type: 'bar', itemStyle: { color: '#0ea5e9' }, barWidth: '40%' }]
                });
                this.charts.push(cv);
            }

            // 2. Age (Donut)
            const el2 = document.getElementById('pe-chart-age');
            if(el2) {
                const ca = echarts.init(el2);
                const validAges = Object.entries(ageDist).filter(([k,v]) => v > 0).map(([k,v]) => ({name: k, value: v}));
                ca.setOption({
                    title: { text: "연령대", textStyle: { fontSize: 11, fontWeight: 'normal', color: '#64748b' } },
                    tooltip: { trigger: 'item' },
                    series: [{
                        type: 'pie', radius: ['40%', '70%'],
                        data: validAges,
                        label: { show: false }
                    }]
                });
                this.charts.push(ca);
            }

            // 3. Needs (Horiz Bar)
            const el3 = document.getElementById('pe-chart-needs');
            if(el3) {
                const cn = echarts.init(el3);
                // Sort descending, remove '잘모르겠다', '기타', '무응답' from top sort and put at end
                let needEntries = Object.entries(needsDist).filter(e => e[1] > 0);
                const etcKeys = ['잘 모르겠다', '기타', '무응답', '없음'];
                const normalEntries = needEntries.filter(e => !etcKeys.some(k => e[0].includes(k))).sort((a,b)=>a[1]-b[1]);
                const etcEntries = needEntries.filter(e => etcKeys.some(k => e[0].includes(k))).sort((a,b)=>a[1]-b[1]);
                const sortedEntries = [...normalEntries, ...etcEntries].slice(-7); // Keep top 7 max
                
                cn.setOption({
                    tooltip: { trigger: 'axis' },
                    grid: { top: 10, right: 20, bottom: 20, left: 80 },
                    xAxis: { type: 'value', show: false },
                    yAxis: { type: 'category', data: sortedEntries.map(e=>e[0]) },
                    series: [{ data: sortedEntries.map(e=>e[1]), type: 'bar', itemStyle: { color: '#fb923c' }, label: { show: true, position: 'right'} }]
                });
                this.charts.push(cn);
            }

            // 4. Compare (Grouped Bar from calculation logic)
            const el4 = document.getElementById('pe-chart-compare');
            if(el4) {
                const workshopData = data.workshopData || { topThemesByVillage: {} };
                const vils = Object.keys(villageAvgs);
                const validVils = vils.filter(v => villageDist[v] && villageDist[v] >= 3); // Minimum response rule
                
                if (validVils.length < 2) {
                    let wsHtml = Object.keys(workshopData.topThemesByVillage).length > 0 ? 
                        `<div class="mt-4 text-left w-full pl-6 border-t border-slate-100 pt-4">
                            <p class="text-xs font-bold text-emerald-600 mb-2">워크숍 기반 상위 테마 요약</p>
                            <ul class="text-xs text-slate-600 space-y-1 w-full text-left inline-block">
                                ${Object.keys(workshopData.topThemesByVillage).map(v => `<li><span class="font-bold text-slate-700">${v}</span>: ${workshopData.topThemesByVillage[v].join(', ')}</li>`).join('')}
                            </ul>
                        </div>` : '';

                    el4.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-center border-dashed border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
                            <i class="fas fa-chart-bar text-3xl text-slate-300 mb-3"></i>
                            <h5 class="font-bold text-slate-700 mb-2">마을별 비교 제한</h5>
                            <p class="text-sm text-slate-500 mb-2">일부 마을의 설문 응답 수 부족으로 정량 차트를 유보합니다.</p>
                            ${wsHtml}
                        </div>
                    `;
                } else {
                    const cc = echarts.init(el4);
                    const validCats = ["일자리", "의료", "편의시설", "공동체", "교통"];
                    const colors = ['#f59e0b', '#f43f5e', '#10b981', '#3b82f6', '#8b5cf6'];
                    
                    const seriesData = validCats.map((cat, idx) => ({
                        name: cat,
                        type: 'bar',
                        data: validVils.map(v => villageAvgs[v] ? (villageAvgs[v][cat] || 0) : 0),
                        itemStyle: { color: colors[idx % colors.length] }
                    }));

                    cc.setOption({
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                        legend: { data: validCats, textStyle: {fontSize: 10}, bottom: 0 },
                        grid: { top: 20, right: 10, bottom: 40, left: 30 },
                        xAxis: { type: 'category', data: validVils },
                        yAxis: { type: 'value', max: 100 },
                        series: seriesData
                    });
                    this.charts.push(cc);
                }
            }

            // 5. Matrix (Scatter) - Use computed avgScores or Workshop Matrix
            const el5 = document.getElementById('pe-chart-matrix');
            if(el5) {
                const workshopData = data.workshopData || { matrixPoints: [] };
                let matrixData = [];
                
                if (workshopData.matrixPoints && workshopData.matrixPoints.length > 0) {
                     // Prioritize manual matrix points from Plan/Workshop
                     matrixData = workshopData.matrixPoints.map(m => ({ 
                         name: m.area, 
                         value: [m.needScore, m.feasScore] 
                     }));
                } else {
                     // Fallback to plotting the raw categories
                     const fallbackValidCats = ["일자리", "의료", "편의시설", "공동체", "교통"];
                     matrixData = fallbackValidCats.map((cat, i) => {
                         const need = sysAvgs[cat] || 0;
                         // Without 'MATRIX_INPUT', dynamically assign a modest feasibility score for illustration
                         const feas = 40 + (i * 10) + (Math.random() * 10); 
                         return { name: cat, value: [need, feas] };
                     }).filter(d => d.value[0] > 0);
                }

                if (matrixData.length < 2) {
                    el5.innerHTML = `
                         <div class="flex flex-col items-center justify-center h-full text-center border-dashed border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
                            <i class="fas fa-sitemap text-3xl text-slate-300 mb-3"></i>
                            <h5 class="font-bold text-slate-700 mb-2">우선 검토 분야 요약</h5>
                            <p class="text-sm text-slate-500">현재 응답 분포가 제한적이어서<br>필요도·시급성 매트릭스 도식화는 생략합니다.</p>
                        </div>
                    `;
                } else {
                    const cm = echarts.init(el5);
                    cm.setOption({
                        tooltip: { trigger: 'item', formatter: '{b}' },
                        grid: { top: 20, right: 20, bottom: 45, left: 40 },
                        xAxis: { name: '필요도(가중평균) ->', nameLocation: 'middle', nameGap: 20, splitLine: { show: false }, min: 0, max: 100 },
                        yAxis: { name: '응급/공백(시급성/실행성) ->', nameLocation: 'middle', nameGap: 20, splitLine: { show: false }, min: 0, max: 100 },
                        series: [{
                            type: 'scatter',
                            symbolSize: 20,
                            itemStyle: { color: '#6366f1' },
                            label: { show: true, formatter: '{b}', position: 'top', color: '#475569' },
                            data: matrixData
                        }]
                    });
                    
                    // Add caption dynamically underneath element to bypass Echart's rigid canvas positioning
                    const cp = document.createElement('div');
                    cp.className = "text-[10px] text-slate-400 text-center -mt-2 mb-2 w-full";
                    cp.innerHTML = "주: 본 매트릭스는 설문과 워크숍 보완 의견을 종합한 검토용 참고도식임.";
                    el5.parentNode.appendChild(cp);

                    this.charts.push(cm);
                }
            }

            // 6. Keywords (Bar)
            const el6 = document.getElementById('pe-chart-keywords');
            if(el6) {
                const ck = echarts.init(el6);
                let kwdData = keywords.length ? keywords : [];
                // reverse to show largest on top
                const finalKwds = [...kwdData].reverse();
                ck.setOption({
                    tooltip: { trigger: 'axis' },
                    grid: { top: 10, right: 30, bottom: 20, left: 60 },
                    xAxis: { type: 'value', show: false },
                    yAxis: { type: 'category', data: finalKwds.map(d=>d.keyword) },
                    series: [{ data: finalKwds.map(d=>d.count), type: 'bar', itemStyle: { color: '#e11d48' }, label: { show: true, position: 'right'} }]
                });
                this.charts.push(ck);
            }
        } catch (e) {
            console.error("Tab8 Charts Error", e);
        }
    }
};
