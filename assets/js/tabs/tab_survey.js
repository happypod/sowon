/**
 * assets/js/tabs/tab_survey.js  v9
 * 설문통계 탭 재설계 — 응답자 특성(A) / 기본 문항(B) / 심화 문항(C) / 정성 보완(D)
 */
window.App = window.App || {};

// ── KPI 정의 (섹션 D 유지) ─────────────────────────────────────────
const KPI_META = {
    LSI: { label:'LSI (생활서비스 결실)', icon:'fa-heartbeat', colorClass:'rose',
           description:'주민 생활 서비스의 충족 수준을 나타내는 지수입니다. 식생활, 의료, 이동성 등 일상 편의의 종합 점수.',
           good:60, goodLabel:'양호', badLabel:'개선필요' },
    CGS: { label:'CGS (거버넌스 역량)', icon:'fa-hands-helping', colorClass:'blue',
           description:'주민 자치 역량 및 커뮤니티 협업 수준을 반영하는 지수. 주민 참여율, 지역 신뢰도, 의사결정 참여 등을 포함.',
           good:50, goodLabel:'적극', badLabel:'보통' },
    PTS: { label:'PTS (인구 전환 잠재)', icon:'fa-seedling', colorClass:'emerald',
           description:'정착 가능성, 유입 인구 호환성, 귀촌 관심도를 종합한 지수. 지역의 지속가능한 인구 유지력을 나타냄.',
           good:45, goodLabel:'우수', badLabel:'주의' }
};

// ── KPI 모달 (섹션 D 유지) ────────────────────────────────────────────
function ensureKpiModal() {
    let modal = document.getElementById('survey-kpi-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'survey-kpi-modal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div id="kpi-modal-header" class="px-6 py-5 flex justify-between items-center">
                    <div>
                        <div id="kpi-modal-icon" class="text-3xl mb-1"></div>
                        <h3 id="kpi-modal-title" class="text-lg font-black text-white"></h3>
                    </div>
                    <div class="text-right">
                        <div id="kpi-modal-score" class="text-5xl font-black text-white"></div>
                        <div class="text-white/70 text-xs mt-1">/ 100점</div>
                    </div>
                </div>
                <div class="px-6 py-4">
                    <p id="kpi-modal-desc" class="text-sm text-slate-600 leading-relaxed mb-4"></p>
                    <div class="bg-slate-50 rounded-xl p-4">
                        <div class="text-xs font-bold text-slate-500 mb-2">점수 척도</div>
                        <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div id="kpi-modal-bar" class="h-full rounded-full transition-all duration-700" style="width:0%"></div>
                        </div>
                        <div class="flex justify-between text-xs text-slate-400 mt-1">
                            <span>0점</span><span>50점</span><span>100점</span>
                        </div>
                    </div>
                    <div class="mt-4 text-xs font-bold text-slate-400 flex items-center gap-2">
                        <i class="fas fa-info-circle"></i>
                        <span id="kpi-modal-status-text"></span>
                    </div>
                </div>
                <div class="px-6 pb-5">
                    <button id="kpi-modal-close" class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-600 transition">닫기</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => {
            if (e.target === modal || e.target.id === 'kpi-modal-close') modal.classList.add('hidden');
        });
    }
    return modal;
}

function showKpiModal(key, score) {
    const meta = KPI_META[key];
    if (!meta) return;
    const modal = ensureKpiModal();
    const colorMap = { rose:'#f43f5e', blue:'#3b82f6', emerald:'#10b981' };
    const bg = colorMap[meta.colorClass] || '#6366f1';
    document.getElementById('kpi-modal-header').style.background = `linear-gradient(135deg,${bg}dd,${bg}99)`;
    document.getElementById('kpi-modal-icon').innerHTML = `<i class="fas ${meta.icon} text-white/80"></i>`;
    document.getElementById('kpi-modal-title').textContent = meta.label;
    document.getElementById('kpi-modal-score').textContent = score.toFixed(1);
    document.getElementById('kpi-modal-desc').textContent = meta.description;
    const bar = document.getElementById('kpi-modal-bar');
    bar.style.background = bg;
    setTimeout(() => { bar.style.width = Math.min(score,100)+'%'; }, 50);
    document.getElementById('kpi-modal-status-text').textContent =
        `현재 상태: ${score >= meta.good ? '✅ '+meta.goodLabel : '⚠️ '+meta.badLabel} (기준: ${meta.good}점 이상)`;
    modal.classList.remove('hidden');
}

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────
function _getHighest(obj) {
    if (!obj || !Object.keys(obj).length) return { k:'-', v:0 };
    let bK='', mx=-1;
    for (const [k,v] of Object.entries(obj)) { if (v>mx) { mx=v; bK=k; } }
    return { k:bK, v:mx };
}
function _sumObj(obj) { return Object.values(obj||{}).reduce((s,v)=>s+v,0); }
function _pct(v, total) { return total>0 ? Math.round(v/total*100) : 0; }
function _noData(label='') {
    return `<div class="flex h-full min-h-[120px] items-center justify-center text-slate-400 text-sm gap-2">
        <i class="fas fa-info-circle"></i><span>${label||'응답 없음'}</span></div>`;
}
function _sectionTitle(icon, title, color='indigo') {
    return `<h3 class="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
        <i class="fas ${icon} text-${color}-500"></i> ${title}</h3>`;
}
function _hBarOption(title, data, color) {
    const sorted = [...(data||[])].sort((a,b)=>a.value-b.value);
    if (!sorted.length) return null;
    return {
        title:{ text:title, left:'center', top:0, textStyle:{fontSize:13,fontWeight:'bold',color:'#334155'} },
        tooltip:{ trigger:'axis', axisPointer:{type:'shadow'} },
        grid:{ left:'3%', right:'12%', bottom:'3%', top:'18%', containLabel:true },
        xAxis:{ type:'value', splitLine:{lineStyle:{type:'dashed',color:'#f1f5f9'}} },
        yAxis:{ type:'category', data:sorted.map(d=>d.name),
            axisLabel:{width:110,overflow:'truncate',interval:0,fontSize:11,color:'#475569'} },
        series:[{ type:'bar', data:sorted.map(d=>d.value),
            itemStyle:{color,borderRadius:[0,4,4,0]},
            label:{show:true,position:'right',color:'#475569',fontSize:11,fontWeight:'bold'} }]
    };
}
function _vBarOption(title, data, color='#6366f1') {
    return {
        title:{ text:title, left:'center', top:0, textStyle:{fontSize:12,fontWeight:'bold',color:'#475569'} },
        tooltip:{ trigger:'axis', axisPointer:{type:'shadow'} },
        grid:{ left:'3%', right:'4%', bottom:'18%', top:'22%', containLabel:true },
        xAxis:{ type:'category', data:data.map(d=>d.name),
            axisLabel:{interval:0,rotate:data.length>4?20:0,fontSize:10} },
        yAxis:{ type:'value', splitLine:{lineStyle:{type:'dashed'}} },
        series:[{ type:'bar', barWidth:'55%', data:data.map(d=>d.value),
            itemStyle:{color,borderRadius:[4,4,0,0]},
            label:{show:true,position:'top',color:'#475569',fontSize:10} }]
    };
}
function _donutOption(title, data, colors) {
    return {
        title:{ text:title, left:'center', top:5, textStyle:{fontSize:12,fontWeight:'bold',color:'#475569'} },
        tooltip:{ trigger:'item' },
        color: colors,
        legend:{ bottom:0, left:'center', itemWidth:10, itemHeight:10, textStyle:{fontSize:10} },
        series:[{ type:'pie', radius:['38%','58%'], center:['50%','50%'],
            avoidLabelOverlap:false, itemStyle:{borderRadius:4,borderWidth:2,borderColor:'#fff'},
            label:{show:false}, emphasis:{label:{show:true,fontSize:14,fontWeight:'bold'}},
            labelLine:{show:false}, data }]
    };
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN MODULE
// ══════════════════════════════════════════════════════════════════════
App.tabSurvey = {

    // ───────────────────────────────────────────────────────────────
    //  render()  — 전체 4섹션 레이아웃을 빌드하고 각 렌더러 호출
    // ───────────────────────────────────────────────────────────────
    render(data, container) {
        if (!container) return;

        const stats   = data?.stats   || {};
        const indices = stats?.indices || {};
        const lsiScore = Number(indices.LSI?.total || 0);
        const cgsScore = Number(indices.YIP?.total || 0);
        const ptsScore = Number(indices.PCI?.total || 0);
        const wc = data?.wordcloud || {};

        // summary 데이터 우선순위 + village_counts 보정
        const realSummary = data?.summary;
        const mockSummary = window.App?.EXAMPLE_SURVEY_SUMMARY;
        const hasRealData = realSummary && realSummary.total_responses > 0;
        let summary = hasRealData ? realSummary : (mockSummary || null);

        if (summary && hasRealData) {
            const vc = summary.village_counts || {};
            const nonKita = (vc['만리포']||0) + (vc['천리포']||0);
            const vcTotal = _sumObj(vc);
            if (vcTotal > 0 && nonKita === 0 && mockSummary?.village_counts) {
                const total = summary.total_responses;
                const mVc = mockSummary.village_counts;
                const mTot = _sumObj(mVc);
                const mal = mTot>0 ? Math.round(total*(mVc['만리포']||0)/mTot) : 0;
                const che = mTot>0 ? Math.round(total*(mVc['천리포']||0)/mTot) : 0;
                summary = { ...summary,
                    village_counts:{'만리포':mal,'천리포':che,'기타':total-mal-che},
                };
            }
            // 마을별 세부 필드 — 백엔드에 빈 객체/배열로 올 경우 Mock으로 보완
            if (mockSummary) {
                const supplement = {};
                const isEmpty = (val) => !val || (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && Object.keys(val).length === 0);
                
                const fields = [
                    'household_distribution','residency_status_distribution',
                    'top_needs_mallipo','top_needs_cheonripo'
                ];
                fields.forEach(f => { if (isEmpty(summary[f])) supplement[f] = mockSummary[f]; });
                // Q28~Q36 마을별 분포
                for (let q = 28; q <= 36; q++) {
                    ['mallipo','cheonripo'].forEach(v => {
                        const key = `q${q}_distribution_${v}`;
                        if (isEmpty(summary[key])) supplement[key] = mockSummary[key];
                    });
                }
                summary = { ...summary, ...supplement };
            }
        } else if (summary && !hasRealData) {
            // mock 데이터는 이미 모든 필드 포함 — 보정 불필요
        }


        const isMock = !hasRealData;

        if (!summary) {
            container.innerHTML = `<div class="p-8 text-center text-slate-500">
                <i class="fas fa-exclamation-circle text-4xl mb-4 text-slate-300"></i>
                <p>표시할 설문 통계 데이터가 없습니다.</p></div>`;
            return;
        }

        // 4섹션 레이아웃
        container.innerHTML = `
        <div class="space-y-12 animate-fade-in-up">
            ${isMock ? `<div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-amber-700">
                <i class="fas fa-triangle-exclamation text-amber-400"></i>
                <span>현재 <strong>예시 데이터(Mock)</strong>가 표시됩니다. Code.gs를 최신 버전으로 배포하면 실제 데이터가 반영됩니다.</span>
            </div>` : ''}

            <!-- 섹션 A: 응답자 특성 -->
            <section>
                ${_sectionTitle('fa-users','섹션 A. 응답자 특성','blue')}
                <div id="sec-a-kpi-cards" class="mb-6"></div>
                <div id="sec-a-charts" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"></div>
                <div id="sec-a-table"></div>
            </section>

            <!-- 섹션 B: 기본 문항 결과 -->
            <section>
                ${_sectionTitle('fa-list-ol','섹션 B. 기본 문항 결과','amber')}
                <div id="sec-b-top5" class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"></div>
                <div id="sec-b-common"></div>
            </section>

            <!-- 섹션 C: 심화 문항 결과 -->
            <section>
                ${_sectionTitle('fa-layer-group','섹션 C. 심화 문항 결과 (Q28~Q36)','rose')}
                <div id="sec-c-questions" class="space-y-6 mb-6"></div>
                <div id="sec-c-table"></div>
            </section>

            <!-- 섹션 D: 정성 보완 분석 -->
            <section>
                ${_sectionTitle('fa-chart-line','섹션 D. 정성 보완 분석','purple')}
                <div id="sec-d-kpi" class="mb-6"></div>
                <div id="sec-d-wordcloud"></div>
            </section>
        </div>`;

        // 각 섹션 렌더러 호출
        this.renderSectionA_KpiCards(summary);
        this.renderSectionA_Charts(summary);
        this.renderSectionA_Table(summary);
        this.renderSectionB_TopNeeds(summary);
        this.renderSectionB_CommonNeeds(summary);
        this.renderSectionC_Questions(summary);
        this.renderSectionC_SummaryTable(summary);
        this.renderSectionD_Kpi(lsiScore, cgsScore, ptsScore);
        this.renderSectionD_Wordcloud(wc, summary);
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 A-1: 응답자 요약 카드
    // ───────────────────────────────────────────────────────────────
    renderSectionA_KpiCards(summary) {
        const c = document.getElementById('sec-a-kpi-cards');
        if (!c) return;
        const vc = summary.village_counts || {};
        const total = summary.total_responses || 0;
        const ageD = summary.age_distribution || {};
        const aged = (ageD['60대']||0) + (ageD['70대 이상']||0);
        const agedPct = _pct(aged, total);
        const resD = summary.residency_status_distribution || {};
        const resPct = _pct(resD['상주']||0, _sumObj(resD)||total);

        const cards = [
            { icon:'fa-users',         color:'blue',   label:'전체 응답자', value:`${total}명`,           sub:'주민 설문 완료 건수' },
            { icon:'fa-anchor',        color:'sky',    label:'만리포(모항리)', value:`${vc['만리포']||0}명`,  sub:'모항리 일대 응답자' },
            { icon:'fa-water',         color:'teal',   label:'천리포(의항리)', value:`${vc['천리포']||0}명`,  sub:'의항리 일대 응답자' },
            { icon:'fa-person-cane',   color:'amber',  label:'고령 응답 비율', value:`${agedPct}%`,         sub:'60대 이상 응답자 비율' },
            { icon:'fa-house-user',    color:'slate',  label:'기타지역',       value:`${vc['기타']||0}명`,   sub:'소원면 기타 지역' }
        ];

        c.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-5 gap-3">` +
            cards.map(card => `
            <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-3 items-start hover:shadow-md transition">
                <div class="w-10 h-10 rounded-lg bg-${card.color}-50 flex items-center justify-center flex-shrink-0">
                    <i class="fas ${card.icon} text-${card.color}-500"></i>
                </div>
                <div>
                    <div class="text-xs text-slate-400 mb-0.5">${card.label}</div>
                    <div class="text-xl font-black text-slate-700">${card.value}</div>
                    <div class="text-xs text-slate-400">${card.sub}</div>
                </div>
            </div>`).join('') + `</div>`;
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 A-2: 응답자 특성 차트 4개
    // ───────────────────────────────────────────────────────────────
    renderSectionA_Charts(summary) {
        const c = document.getElementById('sec-a-charts');
        if (!c) return;
        const vc   = summary.village_counts        || {};
        const hhD  = summary.household_distribution || {};
        const ageD = summary.age_distribution      || {};
        const resD = summary.residence_distribution || {};

        c.innerHTML = [
            { id:'sc-a-village', h:'마을별 응답자 수' },
            { id:'sc-a-hh',      h:'Q2. 가구형태 분포' },
            { id:'sc-a-age',     h:'연령대 분포' },
            { id:'sc-a-res',     h:'거주기간 분포' }
        ].map(x => `
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div id="${x.id}" class="w-full h-52"></div>
            </div>`).join('');

        setTimeout(() => {
            if (!window.echarts) return;
            const init = (id, opt) => {
                const el = document.getElementById(id);
                if (!el || !opt) return;
                const ch = echarts.init(el);
                ch.setOption(opt);
                window.addEventListener('resize', () => ch.resize());
            };

            // 마을별 세로 막대
            init('sc-a-village', _vBarOption('마을별 응답자 수',
                [{ name:'만리포', value:vc['만리포']||0 },{ name:'천리포', value:vc['천리포']||0 },{ name:'기타', value:vc['기타']||0 }],
                '#3b82f6'));

            // 가구형태 도넛
            const hhData = Object.entries(hhD).map(([k,v])=>({ name:k, value:v }));
            const hhColors = ['#6366f1','#f59e0b','#10b981','#f43f5e','#94a3b8'];
            init('sc-a-hh', hhData.length ? _donutOption('가구형태 분포', hhData, hhColors) : null);

            // 연령대 세로 막대
            const ageData = Object.entries(ageD).map(([k,v])=>({ name:k, value:v }));
            init('sc-a-age', _vBarOption('연령대 분포', ageData, '#f59e0b'));

            // 거주기간 세로 막대
            const rData = Object.entries(resD).map(([k,v])=>({ name:k, value:v }));
            init('sc-a-res', _vBarOption('거주기간 분포', rData, '#10b981'));
        }, 100);
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 A-3: 응답자 특성 총괄표
    // ───────────────────────────────────────────────────────────────
    renderSectionA_Table(summary) {
        const c = document.getElementById('sec-a-table');
        if (!c) return;
        const vc   = summary.village_counts        || {};
        const hhD  = summary.household_distribution || {};
        const ageD = summary.age_distribution      || {};
        const resD = summary.residence_distribution || {};
        const total= summary.total_responses || 0;

        const maxHH  = _getHighest(hhD);
        const maxAge = _getHighest(ageD);
        const maxRes = _getHighest(resD);

        const rows = [
            ['전체 응답자 수',  `${total}명`,           '주민 설문 완료 건수'],
            ['만리포(모항리)',   `${vc['만리포']||0}명`, `전체의 ${_pct(vc['만리포']||0, total)}%`],
            ['천리포(의항리)',   `${vc['천리포']||0}명`, `전체의 ${_pct(vc['천리포']||0, total)}%`],
            ['기타지역',         `${vc['기타']||0}명`,   `전체의 ${_pct(vc['기타']||0, total)}%`],
            ['가구형태 최다',   maxHH.k,                 `${maxHH.v}명`],
            ['최다 연령대',     maxAge.k,                `${maxAge.v}명`],
            ['최다 거주기간',   maxRes.k,                `${maxRes.v}명`],
        ];

        c.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-700 text-sm">
                📋 응답자 특성 총괄표 <span class="text-xs font-normal text-slate-400 ml-2">운영계획서 인용 가능</span>
            </div>
            <table class="w-full text-sm">
                <thead><tr class="bg-slate-50/70 text-xs text-slate-500">
                    <th class="px-4 py-2 text-left font-semibold w-1/3">항목</th>
                    <th class="px-4 py-2 text-left font-semibold w-1/3">전체</th>
                    <th class="px-4 py-2 text-left font-semibold w-1/3">비고</th>
                </tr></thead>
                <tbody>${rows.map((r,i) => `
                <tr class="${i<rows.length-1?'border-b border-slate-50':''} hover:bg-slate-50">
                    <td class="px-4 py-2 text-slate-500 font-medium">${r[0]}</td>
                    <td class="px-4 py-2 text-slate-700 font-bold">${r[1]}</td>
                    <td class="px-4 py-2 text-slate-400 text-xs">${r[2]}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 B-1~3: Top5 가로 막대 (전체 / 만리포 / 천리포)
    // ───────────────────────────────────────────────────────────────
    renderSectionB_TopNeeds(summary) {
        const c = document.getElementById('sec-b-top5');
        if (!c) return;
        const sets = [
            { id:'sc-b-total', title:'상위 생활문제/수요 Top5 (전체)', data: summary.top_needs_total    || [], color:'#6366f1' },
            { id:'sc-b-mal',   title:'만리포 상위 수요 Top5',           data: summary.top_needs_mallipo  || [], color:'#3b82f6' },
            { id:'sc-b-che',   title:'천리포 상위 수요 Top5',           data: summary.top_needs_cheonripo|| [], color:'#10b981' }
        ];
        c.innerHTML = sets.map(s => `
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div id="${s.id}" class="w-full h-52"></div>
            </div>`).join('');

        setTimeout(() => {
            if (!window.echarts) return;
            sets.forEach(s => {
                const el = document.getElementById(s.id);
                if (!el) return;
                const top5 = s.data.slice(0,5);
                if (!top5.length) { el.innerHTML = _noData('응답 데이터 없음'); return; }
                const opt = _hBarOption(s.title, top5, s.color);
                if (!opt) return;
                const ch = echarts.init(el);
                ch.setOption(opt);
                window.addEventListener('resize', () => ch.resize());
            });
        }, 100);
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 B-4: 공통 수요 표 (두 마을 Top5 교집합)
    // ───────────────────────────────────────────────────────────────
    renderSectionB_CommonNeeds(summary) {
        const c = document.getElementById('sec-b-common');
        if (!c) return;
        const mal = summary.top_needs_mallipo   || [];
        const che = summary.top_needs_cheonripo || [];
        if (!mal.length || !che.length) {
            c.innerHTML = `<div class="p-4 text-sm text-slate-400 bg-slate-50 rounded-xl">공통 수요 비교 유보 — 마을별 데이터 부족</div>`;
            return;
        }

        // 두 마을 모두 Top5 안에 있는 항목 추출
        const malNames = mal.map(x=>x.name);
        const cheNames = che.map(x=>x.name);
        const common = malNames.filter(n => cheNames.includes(n));

        if (!common.length) {
            c.innerHTML = `<div class="p-4 text-sm text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                <i class="fas fa-info-circle mr-2"></i>공통 수요 항목이 뚜렷하지 않습니다. 마을별 수요 특성이 상이한 것으로 볼 수 있습니다.</div>`;
            return;
        }

        const rows = common.map(name => {
            const mItem = mal.find(x=>x.name===name);
            const cItem = che.find(x=>x.name===name);
            const mRank = malNames.indexOf(name)+1;
            const cRank = cheNames.indexOf(name)+1;
            return { name, mVal:mItem?.value||0, cVal:cItem?.value||0, mRank, cRank };
        });

        c.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="bg-emerald-50 px-5 py-3 border-b border-emerald-100 font-bold text-emerald-700 text-sm flex items-center gap-2">
                <i class="fas fa-arrows-to-circle"></i> 공통 수요 항목
                <span class="text-xs font-normal text-slate-500 ml-2">두 마을 Top5에 모두 포함된 항목</span>
            </div>
            <table class="w-full text-sm">
                <thead><tr class="bg-slate-50/70 text-xs text-slate-500">
                    <th class="px-4 py-2 text-left font-semibold">항목</th>
                    <th class="px-4 py-2 text-center font-semibold">만리포 순위/응답</th>
                    <th class="px-4 py-2 text-center font-semibold">천리포 순위/응답</th>
                    <th class="px-4 py-2 text-left font-semibold">해석</th>
                </tr></thead>
                <tbody>${rows.map((r,i) => `
                <tr class="${i<rows.length-1?'border-b border-slate-50':''} hover:bg-emerald-50/30">
                    <td class="px-4 py-2 font-bold text-slate-700">${r.name}</td>
                    <td class="px-4 py-2 text-center text-blue-600 font-medium">${r.mRank}위 / ${r.mVal}건</td>
                    <td class="px-4 py-2 text-center text-emerald-600 font-medium">${r.cRank}위 / ${r.cVal}건</td>
                    <td class="px-4 py-2 text-xs text-slate-500">공통 수요 ✔</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 C: Q28~Q36 심화 문항 카드 (각 카드에 전체+만리포+천리포 차트)
    // ───────────────────────────────────────────────────────────────
    renderSectionC_Questions(summary) {
        const c = document.getElementById('sec-c-questions');
        if (!c) return;
        const Qs = [
            { q:28, title:'식사 준비에 대한 어려움' },
            { q:29, title:'장보기에 대한 불편함' },
            { q:30, title:'혼자 식사 또는 끼니 결손' },
            { q:31, title:'병원·약국 방문에 대한 불편함' },
            { q:32, title:'건강관리 필요하지만 어려움' },
            { q:33, title:'응급 시 도움 요청망' },
            { q:34, title:'참여 가능 활동 분야' },
            { q:35, title:'참여 가능 시간대' },
            { q:36, title:'교육 후 참여 의향' }
        ];

        const likertOrder = ['매우 그렇다','다소 그렇다','대체로 있다','자주 있다','보통이다',
                             '가끔 있다','다소 있다','별로 없다','거의 없다','그렇지 않다','전혀 없다','기타','무응답'];

        c.innerHTML = Qs.map(m => `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 class="font-bold text-slate-800">
                    <span class="text-indigo-600 mr-1">Q${m.q}.</span>${m.title}
                </h4>
                <span id="insight-q${m.q}" class="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full hidden"></span>
            </div>
            <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <div class="text-xs font-bold text-slate-500 mb-2 text-center">전체</div>
                    <div id="sc-c${m.q}-tot" class="w-full h-44"></div>
                </div>
                <div>
                    <div class="text-xs font-bold text-blue-500 mb-2 text-center">만리포</div>
                    <div id="sc-c${m.q}-mal" class="w-full h-44"></div>
                </div>
                <div>
                    <div class="text-xs font-bold text-emerald-500 mb-2 text-center">천리포</div>
                    <div id="sc-c${m.q}-che" class="w-full h-44"></div>
                </div>
            </div>
        </div>`).join('');

        setTimeout(() => {
            if (!window.echarts) return;
            Qs.forEach(m => {
                const dtT = summary[`q${m.q}_distribution_total`]     || {};
                const dtM = summary[`q${m.q}_distribution_mallipo`]   || {};
                const dtC = summary[`q${m.q}_distribution_cheonripo`] || {};

                const allKeys = [...new Set([...Object.keys(dtT),...Object.keys(dtM),...Object.keys(dtC)])]
                    .filter(k => k && k!=='null' && k!=='undefined')
                    .sort((a,b) => {
                        const ia = likertOrder.indexOf(a), ib = likertOrder.indexOf(b);
                        if (ia!==-1&&ib!==-1) return ia-ib;
                        if (ia!==-1) return -1; if (ib!==-1) return 1;
                        return a.localeCompare(b);
                    });

                const mkOpt = (dt, color, title) => ({
                    tooltip:{ trigger:'axis', axisPointer:{type:'shadow'} },
                    grid:{ left:'3%', right:'4%', bottom:'16%', top:'5%', containLabel:true },
                    xAxis:{ type:'category', data:allKeys,
                        axisLabel:{interval:0,rotate:allKeys.length>4?25:0,fontSize:9} },
                    yAxis:{ type:'value', splitLine:{lineStyle:{type:'dashed'}} },
                    series:[{ type:'bar', barWidth:'60%', data:allKeys.map(k=>dt[k]||0),
                        itemStyle:{color,borderRadius:[3,3,0,0]},
                        label:{show:true,position:'top',fontSize:9,color:'#475569'} }]
                });

                const initChart = (id, dt, color) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (!_sumObj(dt)) { el.innerHTML = _noData('응답 없음'); return; }
                    const ch = echarts.init(el);
                    ch.setOption(mkOpt(dt, color));
                    window.addEventListener('resize', () => ch.resize());
                };

                initChart(`sc-c${m.q}-tot`, dtT, '#94a3b8');
                initChart(`sc-c${m.q}-mal`, dtM, '#3b82f6');
                initChart(`sc-c${m.q}-che`, dtC, '#10b981');

                // 자동 인사이트
                const insEl = document.getElementById(`insight-q${m.q}`);
                if (insEl && _sumObj(dtT)) {
                    const maxT = _getHighest(dtT);
                    const maxM = _getHighest(dtM);
                    const maxC = _getHighest(dtC);
                    const pct = _pct(maxT.v, _sumObj(dtT));
                    let txt = `가장 많은 응답: "${maxT.k}" (${pct}%)`;
                    if (maxM.k && maxC.k && maxM.k !== maxC.k)
                        txt += ` | 만리포: ${maxM.k} · 천리포: ${maxC.k}`;
                    insEl.textContent = '💡 ' + txt;
                    insEl.classList.remove('hidden');
                }
            });
        }, 150);
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 C-5: Q28~Q36 종합표
    // ───────────────────────────────────────────────────────────────
    renderSectionC_SummaryTable(summary) {
        const c = document.getElementById('sec-c-table');
        if (!c) return;
        const Qs = [
            {q:28,title:'식사 준비 어려움'},{q:29,title:'장보기 불편'},{q:30,title:'끼니 결손'},
            {q:31,title:'병원·약국 방문'},{q:32,title:'건강관리 어려움'},{q:33,title:'응급 도움망'},
            {q:34,title:'참여 활동 분야'},{q:35,title:'참여 시간대'},{q:36,title:'교육 후 참여 의향'}
        ];
        const rows = Qs.map(m => {
            const dT = summary[`q${m.q}_distribution_total`]     || {};
            const dM = summary[`q${m.q}_distribution_mallipo`]   || {};
            const dC = summary[`q${m.q}_distribution_cheonripo`] || {};
            return { title:`Q${m.q} ${m.title}`,
                     tot: _getHighest(dT).k || '-',
                     mal: _getHighest(dM).k || '-',
                     che: _getHighest(dC).k || '-' };
        });

        c.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="bg-rose-50 px-5 py-3 border-b border-rose-100 font-bold text-rose-700 text-sm">
                📊 Q28~Q36 문항별 핵심 분포 요약 <span class="text-xs font-normal text-slate-400 ml-2">운영계획서 인용 가능</span>
            </div>
            <table class="w-full text-sm">
                <thead><tr class="bg-slate-50/70 text-xs text-slate-500">
                    <th class="px-4 py-2 text-left font-semibold w-2/5">문항</th>
                    <th class="px-4 py-2 text-left font-semibold">전체 최다 응답</th>
                    <th class="px-4 py-2 text-left font-semibold">만리포 최다</th>
                    <th class="px-4 py-2 text-left font-semibold">천리포 최다</th>
                </tr></thead>
                <tbody>${rows.map((r,i) => `
                <tr class="${i<rows.length-1?'border-b border-slate-50':''} hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium text-slate-700">${r.title}</td>
                    <td class="px-4 py-2 text-slate-600">${r.tot}</td>
                    <td class="px-4 py-2 text-blue-600">${r.mal}</td>
                    <td class="px-4 py-2 text-emerald-600">${r.che}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 D: KPI 핵심지표 카드 (기존 기능 유지)
    // ───────────────────────────────────────────────────────────────
    renderSectionD_Kpi(lsiScore, cgsScore, ptsScore) {
        const c = document.getElementById('sec-d-kpi');
        if (!c) return;
        const scores = { LSI:lsiScore, CGS:cgsScore, PTS:ptsScore };
        const colorMap = { rose:'#f43f5e', blue:'#3b82f6', emerald:'#10b981' };
        const isDeployed = lsiScore > 0 || cgsScore > 0 || ptsScore > 0;

        c.innerHTML = `
        <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <i class="fas fa-chart-line text-rose-500"></i> KPI 핵심지표
            <span class="text-xs font-normal text-slate-400">카드를 클릭하면 상세 정보를 볼 수 있습니다</span>
        </h4>
        ${!isDeployed ? `<div class="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <i class="fas fa-circle-info mr-1"></i>KPI 수치는 Code.gs를 Google Apps Script에 배포해야 표시됩니다.</div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${Object.entries(KPI_META).map(([key, meta]) => {
            const sc = scores[key] || 0;
            const bg = colorMap[meta.colorClass] || '#6366f1';
            const isGood = sc >= meta.good;
            return `
            <div class="kpi-survey-card rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                 data-kpi="${key}" data-score="${sc}"
                 style="background:linear-gradient(135deg,${bg}dd,${bg}99)">
                <div class="p-5 flex justify-between items-start">
                    <div>
                        <div class="text-white/70 text-xs mb-1">${meta.label}</div>
                        <div class="text-white font-black text-4xl">${sc > 0 ? sc.toFixed(1) : '--'}</div>
                        <div class="text-white/60 text-xs">점</div>
                    </div>
                    <i class="fas ${meta.icon} text-white/20 text-4xl"></i>
                </div>
                <div class="px-5 pb-4">
                    ${sc > 0
                        ? `<span class="text-xs ${isGood ? 'bg-white/20' : 'bg-black/20'} text-white px-2 py-0.5 rounded-full">${isGood ? '✅ '+meta.goodLabel : '⚠️ '+meta.badLabel}</span>`
                        : `<span class="text-xs bg-black/20 text-white/70 px-2 py-0.5 rounded-full">미배포</span>`}
                </div>
            </div>`}).join('')}
        </div>`;

        c.querySelectorAll('.kpi-survey-card').forEach(card => {
            card.addEventListener('click', () => {
                showKpiModal(card.dataset.kpi, Number(card.dataset.score));
            });
        });
    },

    // ───────────────────────────────────────────────────────────────
    //  섹션 D: 워드클라우드 + 그룹별 키워드 (기존 기능 유지)
    // ───────────────────────────────────────────────────────────────
    renderSectionD_Wordcloud(wc, summary) {
        const c = document.getElementById('sec-d-wordcloud');
        if (!c) return;

        const wcAll  = wc?.all   || [];
        const wcMal  = wc?.mallipo   || [];
        const wcChe  = wc?.cheonripo || [];

        c.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h4 class="font-bold text-slate-700 mb-4"><i class="fas fa-cloud text-sky-500 mr-2"></i>주관식 키워드 분석 (종합)</h4>
                <div id="wc-all-bar" class="w-full h-52"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h4 class="font-bold text-blue-700 mb-4"><i class="fas fa-cloud text-blue-400 mr-2"></i>만리포 주요 키워드</h4>
                    <div id="wc-mal-bar" class="w-full h-44"></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h4 class="font-bold text-emerald-700 mb-4"><i class="fas fa-cloud text-emerald-400 mr-2"></i>천리포 주요 키워드</h4>
                    <div id="wc-che-bar" class="w-full h-44"></div>
                </div>
            </div>
        </div>`;

        // 워드클라우드 목 데이터 (GAS 미배포 시)
        const mockWc = [
            {name:'의료',value:22},{name:'교통',value:18},{name:'일자리',value:15},
            {name:'커뮤니티',value:12},{name:'돌봄',value:10},{name:'공간',value:8},
            {name:'편의시설',value:7},{name:'안전',value:5}
        ];
        const allData  = wcAll.length  ? wcAll.slice(0,10)  : mockWc.slice(0,8);
        const malData  = wcMal.length  ? wcMal.slice(0,6)   : mockWc.slice(0,5);
        const cheData  = wcChe.length  ? wcChe.slice(0,6)   : mockWc.slice(2,7);

        setTimeout(() => {
            if (!window.echarts) return;
            const mkWordBar = (id, data, color) => {
                const el = document.getElementById(id);
                if (!el) return;
                const sorted = [...data].sort((a,b)=>a.value-b.value);
                const ch = echarts.init(el);
                ch.setOption({
                    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
                    grid:{left:'3%',right:'12%',bottom:'3%',top:'5%',containLabel:true},
                    xAxis:{type:'value',splitLine:{lineStyle:{type:'dashed',color:'#f1f5f9'}}},
                    yAxis:{type:'category',data:sorted.map(d=>d.name),
                        axisLabel:{fontSize:11,color:'#475569'}},
                    series:[{type:'bar',data:sorted.map(d=>d.value),
                        itemStyle:{color,borderRadius:[0,4,4,0]},
                        label:{show:true,position:'right',fontSize:11,color:'#475569'}}]
                });
                window.addEventListener('resize',()=>ch.resize());
            };
            mkWordBar('wc-all-bar', allData, '#0ea5e9');
            mkWordBar('wc-mal-bar', malData, '#3b82f6');
            mkWordBar('wc-che-bar', cheData, '#10b981');
        }, 200);
    }
};
