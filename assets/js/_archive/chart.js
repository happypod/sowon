import React from "react";
import { fetchJson } from "./fetchJson"; // 경로 맞춰 수정

export function SurveyStatsPage() {
  const [state, setState] = React.useState({ loading: true, error: null, stats: null, charts: null, wc: null });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [stats, charts, wc] = await Promise.all([
          fetchJson("survey_stats"),
          fetchJson("survey_charts"),
          fetchJson("wordcloud"),
        ]);
        if (!alive) return;
        setState({ loading: false, error: null, stats, charts, wc });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, error: e?.message || String(e), stats: null, charts: null, wc: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (state.loading) return <div className="card">로딩 중...</div>;
  if (state.error) return <div className="card">데이터 로드 실패: {state.error}</div>;

  const { stats, charts, wc } = state;
  return (
    <div className="grid gap-6">
      {/* 상단 KPI 카드(이미 있으면 유지) */}
      {/* 추가 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RadarPanel radar={charts?.radar} />
        <TopNPanel topN={charts?.topN} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LikertStackedPanel data={charts?.distributions?.LSI_likert} title="LSI 리커트 분포(100%)" />
        <div className="grid gap-6">
          <PayRangePanel data={charts?.distributions?.PCI_payRange} />
          <YIPIntentPanel data={charts?.distributions?.YIP_revisit} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapPanel crosstab={charts?.crosstabs?.intent_x_pay} />
        <WordCloudPanel keywords={wc?.keywords} />
      </div>

      {/* alerts/insights */}
      <AlertsPanel alerts={charts?.alerts || stats?.alerts} />
    </div>
  );
}
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);


const SCRIPT_URL = "여기에_AppsScript_URL";

let statsCache = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadAllStats();
  initTabs();
  renderOverview();
});
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");

      switch(btn.dataset.tab) {
        case "overview": renderOverview(); break;
        case "resident": renderResident(); break;
        case "lodging": renderLodging(); break;
        case "tourist": renderTourist(); break;
      }
    });
  });
}
async function loadAllStats() {
  const actions = [
    "stats_combined",
    "stats_resident",
    "stats_lodging",
    "stats_tourist"
  ];

  const results = await Promise.all(
    actions.map(a =>
      fetch(`${SCRIPT_URL}?action=${a}`).then(r => r.json())
    )
  );

  statsCache = {
    combined: results[0],
    resident: results[1],
    lodging: results[2],
    tourist: results[3]
  };
}
function renderOverview() {
  const data = statsCache.combined;
  const el = document.getElementById("tab-overview");

  el.innerHTML = `
    <div class="grid md:grid-cols-4 gap-4 mb-6">
      <div class="card">주민 ${data.resident_total}</div>
      <div class="card">숙박 ${data.lodging_total}</div>
      <div class="card">관광 ${data.tourist_total}</div>
      <div class="card">비수기 점유율 ${data.lodging_off_avg}%</div>
    </div>
    <canvas id="overviewChart"></canvas>
  `;

  new Chart(document.getElementById("overviewChart"), {
    type: 'bar',
    data: {
      labels: ['주민','숙박','관광'],
      datasets: [{
        label: '응답수',
        data: [
          data.resident_total,
          data.lodging_total,
          data.tourist_total
        ]
      }]
    }
  });
}
function renderResident() {
  const d = statsCache.resident;
  const el = document.getElementById("tab-resident");

  el.innerHTML = `
    <div class="grid md:grid-cols-3 gap-4 mb-6">
      <div class="card">총 응답 ${d.total}</div>
    </div>
    <canvas id="residentChart1"></canvas>
    <div id="residentTable"></div>
  `;

  new Chart(document.getElementById("residentChart1"), {
    type: 'doughnut',
    data: {
      labels: Object.keys(d.q1),
      datasets: [{
        data: Object.values(d.q1)
      }]
    }
  });

  renderTable("residentTable", ["권역","응답수"], Object.entries(d.q1));
}
function renderLodging() {
  const d = statsCache.lodging;
  const el = document.getElementById("tab-lodging");

  el.innerHTML = `
    <div class="grid md:grid-cols-4 gap-4 mb-6">
      <div class="card">총 응답 ${d.total}</div>
      <div class="card">연중 ${d.occ.year}%</div>
      <div class="card">성수기 ${d.occ.peak}%</div>
      <div class="card">비수기 ${d.occ.off}%</div>
    </div>

    <canvas id="lodgingOccChart"></canvas>
    <canvas id="lodgingConvertChart"></canvas>
    <div id="lodgingTable"></div>
  `;

  new Chart(document.getElementById("lodgingOccChart"), {
    type: 'bar',
    data: {
      labels: ['연중','성수기','비수기'],
      datasets: [{
        label: '점유율',
        data: [d.occ.year, d.occ.peak, d.occ.off]
      }]
    }
  });

  new Chart(document.getElementById("lodgingConvertChart"), {
    type: 'bar',
    data: {
      labels: Object.keys(d.convertIntent),
      datasets: [{
        label: '전환 의향',
        data: Object.values(d.convertIntent)
      }]
    }
  });

  renderTable("lodgingTable",
    ["항목","값"],
    [
      ["전환 긍정률", d.convertIntent_posRate + "%"],
      ["월단위 계약 가능", d.monthlyContract["가능"]]
    ]
  );
}
function renderTourist() {
  const d = statsCache.tourist;
  const el = document.getElementById("tab-tourist");

  el.innerHTML = `
    <div class="grid md:grid-cols-4 gap-4 mb-6">
      <div class="card">총 응답 ${d.total}</div>
      <div class="card">비수기 재방문 ${d.offRevisit.posRate}%</div>
      <div class="card">워케이션 ${d.workation.posRate}%</div>
      <div class="card">한달살이 ${d.monthStay.posRate}%</div>
    </div>
    <canvas id="touristPurpose"></canvas>
  `;

  new Chart(document.getElementById("touristPurpose"), {
    type: 'doughnut',
    data: {
      labels: Object.keys(d.purpose),
      datasets: [{
        data: Object.values(d.purpose)
      }]
    }
  });
}
function renderTable(containerId, headers, rows) {
  const container = document.getElementById(containerId);

  let html = "<table class='w-full border text-sm'><thead><tr>";
  headers.forEach(h => html += `<th class='border p-2'>${h}</th>`);
  html += "</tr></thead><tbody>";

  rows.forEach(r => {
    html += "<tr>";
    r.forEach(cell => html += `<td class='border p-2'>${cell}</td>`);
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

import React from "react";
import { Radar } from "react-chartjs-2";

export function RadarPanel({ radar }) {
  if (!radar?.labels?.length || !radar?.datasets?.length) return <div className="card">Radar 데이터 없음</div>;

  const data = {
    labels: radar.labels,
    datasets: radar.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      fill: true,
    })),
  };

  const options = {
    responsive: true,
    scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
  };

  return (
    <div className="card">
      <div className="card-title">유형별 지수 비교 (Radar)</div>
      <Radar data={data} options={options} />
    </div>
  );
}

import React from "react";

function TopList({ title, items }) {
  if (!items?.length) return <div className="muted">데이터 없음</div>;
  return (
    <div className="grid gap-2">
      {items.slice(0, 3).map((it, idx) => (
        <div key={it.key || it.label || idx} className="flex items-center gap-3">
          <div className="badge">{idx + 1}</div>
          <div className="flex-1">
            <div className="font-semibold">{it.label}</div>
            <div className="progress">
              <div className="bar" style={{ width: `${Math.max(0, Math.min(100, it.score || 0))}%` }} />
            </div>
          </div>
          <div className="w-14 text-right">{(it.score ?? 0).toFixed(1)}</div>
        </div>
      ))}
    </div>
  );
}

export function TopNPanel({ topN }) {
  if (!topN) return <div className="card">TopN 데이터 없음</div>;
  return (
    <div className="card">
      <div className="card-title">항목별 Top 3</div>
      <div className="grid gap-5">
        <div>
          <div className="section-title">LSI</div>
          <TopList title="LSI" items={topN.LSI} />
        </div>
        <div>
          <div className="section-title">PCI</div>
          <TopList title="PCI" items={topN.PCI} />
        </div>
        <div>
          <div className="section-title">YIP</div>
          <TopList title="YIP" items={topN.YIP} />
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Bar } from "react-chartjs-2";

export function LikertStackedPanel({ data, title }) {
  if (!data || Object.keys(data).length === 0) return <div className="card">분포 데이터 없음</div>;

  const labels = Object.keys(data);
  const buckets = ["1", "2", "3", "4", "5"];

  // 100%로 변환
  const normalized = labels.map((k) => {
    const arr = data[k] || [0, 0, 0, 0, 0];
    const sum = arr.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
    return arr.map((v) => (Number(v) || 0) * 100 / sum);
  });

  const chartData = {
    labels,
    datasets: buckets.map((b, i) => ({
      label: b,
      data: normalized.map((arr) => arr[i]),
      stack: "likert",
    })),
  };

  const options = {
    responsive: true,
    plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
    },
  };

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <Bar data={chartData} options={options} />
    </div>
  );
}

import React from "react";
import { Bar } from "react-chartjs-2";

export function PayRangePanel({ data }) {
  if (!data?.length) return <div className="card">지불구간 데이터 없음</div>;
  const labels = data.map((x) => x.label);
  const counts = data.map((x) => Number(x.count) || 0);

  return (
    <div className="card">
      <div className="card-title">월 지불 가능 구간 분포</div>
      <Bar
        data={{ labels, datasets: [{ label: "응답수", data: counts }] }}
        options={{ responsive: true }}
      />
    </div>
  );
}

import React from "react";
import { Doughnut } from "react-chartjs-2";

export function YIPIntentPanel({ data }) {
  if (!data?.length) return <div className="card">의향 데이터 없음</div>;
  const labels = data.map((x) => x.label);
  const counts = data.map((x) => Number(x.count) || 0);

  return (
    <div className="card">
      <div className="card-title">재방문/의향 분포</div>
      <Doughnut data={{ labels, datasets: [{ data: counts }] }} />
    </div>
  );
}

import React from "react";

function cellAlpha(v, max) {
  if (!max) return 0.05;
  const t = Math.max(0, Math.min(1, v / max));
  return 0.08 + t * 0.35;
}

export function HeatmapPanel({ crosstab }) {
  if (!crosstab?.rows?.length || !crosstab?.cols?.length || !crosstab?.matrix?.length) {
    return <div className="card">교차표 데이터 없음</div>;
  }

  const { rows, cols, matrix } = crosstab;
  const max = Math.max(...matrix.flat().map((x) => Number(x) || 0), 1);

  return (
    <div className="card">
      <div className="card-title">거점 이용 의향 × 지불 구간 (Heatmap)</div>
      <div className="overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              {cols.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r}>
                <th>{r}</th>
                {cols.map((c, j) => {
                  const v = Number(matrix?.[i]?.[j]) || 0;
                  return (
                    <td
                      key={`${r}-${c}`}
                      style={{ background: `rgba(0, 0, 0, ${cellAlpha(v, max)})` }}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted">* 색 농도는 셀 값 기준(상대).</div>
    </div>
  );
}

import React from "react";
import { Bar } from "react-chartjs-2";

export function WordCloudPanel({ keywords }) {
  if (!keywords?.length) return <div className="card">워드클라우드 데이터 없음</div>;

  // Top 20만 표시(너무 많으면 UI 과밀)
  const top = keywords.slice(0, 20);
  const labels = top.map((x) => x.text);
  const values = top.map((x) => Number(x.value) || 0);

  return (
    <div className="card">
      <div className="card-title">자유의견 키워드 Top</div>
      <Bar data={{ labels, datasets: [{ label: "빈도", data: values }] }} options={{ responsive: true }} />
      <div className="muted">* 추후 wordcloud 라이브러리로 시각화 전환 가능</div>
    </div>
  );
}

import React from "react";

export function AlertsPanel({ alerts }) {
  const list = alerts || [];
  return (
    <div className="card">
      <div className="card-title">알림/주의</div>
      {list.length === 0 ? (
        <div className="ok">현재 경고가 없습니다. (정상)</div>
      ) : (
        <ul className="list">
          {list.map((a, i) => (
            <li key={`${a.code || "AL"}-${i}`} className={`alert ${a.level || "info"}`}>
              <b>{a.code}</b> — {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
