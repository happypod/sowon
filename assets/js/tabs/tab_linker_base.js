/**
 * Tab 8.2: Linker Base Summary -> 참여기반 공동체 분석
 * 목적: 운영계획서 삽입용 도표·표·문장 세트로 변환
 */

window.App = window.App || {};

window.App.tabLinkerBase = {
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
        const rawData = this.isExampleMode && window.App.EXAMPLE_LINKER_BASE ? window.App.EXAMPLE_LINKER_BASE : this.realData;
        const container = this.currentContainer;

        // Cleanup old charts
        this.charts.forEach(c => c && c.dispose());
        this.charts = [];

        if (!rawData) {
            container.innerHTML = `<div class="p-8 text-center text-slate-500">데이터가 없습니다.</div>`;
            return;
        }

        const data = rawData.data || rawData;
        
        const total = data.totalCount || 0;
        const metrics = data.metrics || {};
        const partIntentRatio = metrics.partIntentHighRatio || 0;
        const commAcceptAvg = metrics.communityAcceptanceAvg || 0;
        
        const eduIntentRatio = total ? ((metrics.postTrainingParticipationHigh / total) * 100) : 0;
        const immediateRatio = total ? ((metrics.immediateExecutionHigh / total) * 100) : 0;

        const commObj = data.villageAverages || {};
        const villageNames = Object.keys(commObj);

        const finalVils = villageNames.length ? villageNames : [];
        const finalCommAvg = finalVils.map(v => commObj[v].commAcc || 0);
        const finalExecAvg = finalVils.map(v => commObj[v].exec || 0);

        // Narratives mapped exactly to 04_참여기반탭 수정.md
        const topVillage = finalVils.length ? finalVils.reduce((a, b) => {
             const mAV = commObj[a].commAcc + commObj[a].exec;
             const mBV = commObj[b].commAcc + commObj[b].exec;
             return (mAV > mBV) ? a : b;
        }, finalVils[0]) : "데이터 부족";

        const text1 = `주민 응답 결과를 종합한 바, 참여 의향과 공동체 활동 수용성이 일정 수준 확인되었으며, 특히 교육 또는 안내 이후 참여 가능성을 보인 응답군(${eduIntentRatio.toFixed(1)}%)도 적지 않게 나타났다. 이는 소원권역 내 주민참여 기반이 전혀 부재한 상태는 아니며, 적절한 설명과 단계적 조직화를 통해 링커 발굴 가능성이 존재함을 보여준다.`;
        const text2 = `다만 마을별로 참여 실행의사와 공동체 수용성에는 차이가 나타났으며, 일부 지역(${topVillage} 등)은 상대적으로 참여기반이 높게 나타난 반면, 일부 응답군에서는 외지인 유입 및 공동체 활동에 대한 우려도 확인되었다. 따라서 동일한 방식의 일괄 모집보다는 마을별 설명회, 소규모 모임, 공감대 형성 절차를 병행하는 접근이 필요하다.`;
        const text3 = `특히 ‘즉시 활동 가능한 인력’으로 단정하기보다는, 교육과 안내 이후 참여 가능성을 보인 응답군이 일정 규모 확인된 점에 주목할 필요가 있다. 이는 초기 단계에서 공개모집 중심 방식보다 기초교육, 현장체험, 소모임 연계형 육성 전략이 보다 적절할 수 있음을 시사한다.`;
        const text4 = `이에 따라 앵커조직은 링커 발굴 전략을 단순 모집이 아닌 ‘참여 잠재 응답군 발굴 → 기초교육 및 설명회 운영 → 소규모 실천활동 연계 → 단계적 역할 부여’의 구조로 설정하고, 참여기반이 상대적으로 높은 마을은 시범 소모임 운영을, 수용성 우려가 존재하는 구간은 주민설명회 및 갈등예방 절차를 우선 추진하는 방향으로 운영계획에 반영할 필요가 있다.`;
        const text5 = `본 분석은 주민 응답자료를 기초로 한 참여기반 및 수용성 참고분석으로, 전체 인구의 확정적 분류나 실제 투입 인력 규모를 의미하지 않는다. 향후 사업 추진 과정에서는 추가 설명회, 심층면담, 리더그룹 조사, 실제 참여 등록 절차를 통해 보다 정교한 운영 기반을 보완해 나갈 예정이다.`;

        const html = `
            <div class="mb-4 bg-ocean-50 border border-ocean-200 text-ocean-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div class="flex items-start gap-3">
                    <i class="fas fa-file-alt mt-1 text-ocean-600"></i>
                    <div class="text-sm">
                        <strong>참여기반 공동체 분석 리포트</strong><br>
                        <span class="text-ocean-700 opacity-90">운영계획서에 바로 첨부 가능한 요약 도표 및 서술식 분석 정보입니다. 흰색 배경의 '인쇄' 지원 포맷을 채택했습니다.</span>
                    </div>
                </div>
                <!-- Data Toggle Button -->
                <button onclick="if(window.App && window.App.tabLinkerBase) window.App.tabLinkerBase.toggleMode()" class="px-3 py-1.5 ${this.isExampleMode ? 'bg-white text-ocean-800 border-ocean-200 hover:bg-ocean-100' : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'} font-bold text-sm rounded-lg transition-colors flex items-center gap-2 border shadow-sm whitespace-nowrap">
                    <i class="${this.isExampleMode ? 'fas fa-database text-ocean-500' : 'fas fa-lightbulb text-yellow-500'}"></i> ${this.isExampleMode ? '실제 데이터 보기' : '기획안 보기 (예시)'}
                </button>
            </div>

            <!-- Print Target Area -->
            <div class="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-slate-800" id="report-print-target">
                
                <h3 class="text-xl font-bold mb-6 text-center">조사결과 기반 참여기반 및 공동체 수용성 분석</h3>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <!-- Chart 1 -->
                    <div>
                        <p class="text-sm font-bold bg-slate-100 px-3 py-1 border-l-4 border-slate-600 mb-4 inline-block">[도표 1] 주문 응답 기반 참여 잠재 지표</p>
                        <div class="border border-slate-200 rounded p-2 bg-white">
                            <div id="lb-chart-intent" class="w-full h-64"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 text-center mt-2">단위: % (응답자 기준 백분율)</p>
                    </div>

                    <!-- Chart 2 -->
                    <div>
                        <p class="text-sm font-bold bg-slate-100 px-3 py-1 border-l-4 border-slate-600 mb-4 inline-block">[도표 2] 마을별 참여기반 및 수용성 비교</p>
                        <div class="border border-slate-200 rounded p-2 bg-white">
                            <div id="lb-chart-village" class="w-full h-64"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 text-center mt-2">참여율(%) 및 수용성(5점 척도)</p>
                    </div>
                </div>

                <!-- Narrative -->
                <div class="bg-slate-50 p-6 rounded border border-slate-200 mb-8 max-w-4xl mx-auto leading-relaxed text-sm text-slate-700">
                    <p class="mb-3"><span class="mr-2 text-ocean-600"><i class="fas fa-quote-left"></i></span>${text1}</p>
                    <p class="mb-3">${text2}</p>
                    <p class="mb-3">${text3}</p>
                    <p class="mb-3 font-medium text-slate-800">${text4}</p>
                    <p class="text-xs text-slate-400 mt-4 border-t border-slate-200 pt-3">${text5}</p>
                </div>

                <!-- Table -->
                <div class="max-w-4xl mx-auto">
                    <p class="text-sm font-bold bg-slate-100 px-3 py-1 border-l-4 border-slate-600 mb-4 inline-block">[표 1] 조사결과 기반 링커 발굴 및 주민참여 운영 방향(안)</p>
                    <table class="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr class="bg-slate-100 text-slate-700">
                                <th class="border border-slate-300 p-2 font-bold w-1/4">구분</th>
                                <th class="border border-slate-300 p-2 font-bold w-1/4">조사 지표 요약</th>
                                <th class="border border-slate-300 p-2 font-bold w-1/2">운영 계획 반영(안)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="border border-slate-300 p-2 font-bold text-center bg-slate-50">참여 잠재 응답군</td>
                                <td class="border border-slate-300 p-2 text-center">참여 의향 및 활동 가능성 지표 확인됨</td>
                                <td class="border border-slate-300 p-2 text-slate-600">초기 링커 발굴은 공개모집보다 설명회·소모임형 접근을 우선 검토</td>
                            </tr>
                            <tr>
                                <td class="border border-slate-300 p-2 font-bold text-center bg-slate-50">교육 후 참여 가능 응답군</td>
                                <td class="border border-slate-300 p-2 text-center">비교적 높은 교육 수용성 비율 확인</td>
                                <td class="border border-slate-300 p-2 text-slate-600">기초교육, 현장설명, 활동 체험형 프로그램 중심의 육성체계 연계</td>
                            </tr>
                            <tr>
                                <td class="border border-slate-300 p-2 font-bold text-center bg-slate-50">마을별 참여기반 편차</td>
                                <td class="border border-slate-300 p-2 text-center">일부 지역에서 참여 수용성이 상대적으로 높음</td>
                                <td class="border border-slate-300 p-2 text-slate-600">참여기반이 높은 지역은 시범 소모임부터, 낮은 지역은 공감대 형성 중심으로 차등 접근</td>
                            </tr>
                            <tr>
                                <td class="border border-slate-300 p-2 font-bold text-center bg-slate-50">갈등 및 소극적 수용 응답</td>
                                <td class="border border-slate-300 p-2 text-center">일부 외지인 유입 우려 확인</td>
                                <td class="border border-slate-300 p-2 text-slate-600">사업안내 시 갈등관리 메시지와 의견수렴 절차 병행</td>
                            </tr>
                            <tr>
                                <td class="border border-slate-300 p-2 font-bold text-center bg-slate-50">활동 가능 분야 분포</td>
                                <td class="border border-slate-300 p-2 text-center">공동체, 생활밀착 등 분포 확인됨</td>
                                <td class="border border-slate-300 p-2 text-slate-600">공동체·환경 기반 소규모 실행에서 돌봄 보조형 단계적 확장 검토</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="text-right mt-8">
                    <button class="px-4 py-2 bg-slate-800 text-white font-bold rounded shadow hover:bg-slate-700 transition inline-flex items-center gap-2" onclick="window.print()">
                        <i class="fas fa-print"></i> 이 보고서만 인쇄
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        setTimeout(() => {
            this._renderCharts(partIntentRatio, eduIntentRatio, immediateRatio, commAcceptAvg, finalVils, finalCommAvg, finalExecAvg);
        }, 50);
    },

    _renderCharts(partIntentRatio, eduIntentRatio, immediateRatio, commAcceptAvg, villageNames, commAvg, execAvg) {
        if(typeof echarts === 'undefined') return;

        try {
            // Chart 1: Gauge or Bar for Intent
            const el1 = document.getElementById('lb-chart-intent');
            if(el1) {
                const c1 = echarts.init(el1);
                c1.setOption({
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { top: 30, right: 30, bottom: 20, left: 100 },
                    xAxis: { type: 'value', max: 100 },
                    yAxis: { type: 'category', data: ['공동체 수용성 (점수)', '즉시 참여 가능 (%)', '교육 후 참여 가능 (%)', '참여 잠재 비율 (%)'] },
                    series: [{
                        type: 'bar',
                        data: [commAcceptAvg.toFixed(1), immediateRatio.toFixed(1), eduIntentRatio.toFixed(1), partIntentRatio.toFixed(1)],
                        label: { show: true, position: 'right', formatter: function(p) { return p.dataIndex === 0 ? p.value + '점' : p.value + '%'; } },
                        itemStyle: {
                            color: function(params) {
                                const colors = ['#8b5cf6', '#f43f5e', '#3b82f6', '#10b981'];
                                return colors[params.dataIndex];
                            }
                        }
                    }]
                });
                this.charts.push(c1);
            }

            // Chart 2: Dual Axis for Village Comparison
            const el2 = document.getElementById('lb-chart-village');
            if(el2) {
                const c2 = echarts.init(el2);
                c2.setOption({
                    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
                    legend: { data: ['참여실행(지수)', '수용성(평점)'] },
                    xAxis: { type: 'category', data: villageNames },
                    yAxis: [
                        { type: 'value', name: '점수/지수 (0~100)', min: 0, max: 100 }
                    ],
                    series: [
                        {
                            name: '참여실행(지수)',
                            type: 'bar',
                            data: execAvg,
                            itemStyle: { color: '#0ea5e9' }
                        },
                        {
                            name: '수용성(평점)',
                            type: 'bar',
                            data: commAvg,
                            itemStyle: { color: '#fb923c' }
                        }
                    ]});
                this.charts.push(c2);
            }
        } catch (e) {
            console.error("Tab9 Charts Error", e);
        }
    }
};
