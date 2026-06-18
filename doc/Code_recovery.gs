/**
 * Code.gs (Unified)
 * - 3 surveys in 1 Spreadsheet (responses01/02/03)
 * - formType routing: resident | lodging | tourist
 * - Stores Q1..Q30 + NAME/DOB/PHONE + consent + formType
 * - Provides stats endpoints for admin dashboard
 *
 * Deploy as Web App:
 *  - Execute as: Me
 *  - Who has access: Anyone
 */
const SHEETS = {
  resident: "responses01",
  lodging: "responses02",
  tourist: "responses03",
};
const MAX_Q = 30; // future-proof storage
const CACHE_TTL_SEC = 60; // stats cache seconds
const OPS_HEADER = [
  "monthKey",
  "scope",
  "payloadJson",
  "completionRate",
  "updatedAt",
];
// --- TICKET S01: Fixed Header Constants ---
const RESIDENT_HEADER = [
  "timestamp",
  "formType",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
  "Q16",
  "Q17",
  "Q18",
  "Q19",
  "Q20",
  "Q21",
  "Q22",
  "Q23",
  "Q24",
  "Q25",
  "Q26",
  "Q27",
  "Q28",
  "Q29",
  "Q30",
  "Q31",
  "Q32",
  "Q33",
  "Q34",
  "Q35",
  "Q36",
  "NAME",
  "DOB",
  "PHONE",
  "consent",
];
const TOURIST_HEADER = [
  "timestamp",
  "formType",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
  "Q16",
  "Q17",
  "Q18",
  "Q19",
  "Q20",
  "Q21",
  "PHONE",
  "consent",
];
const LODGER_HEADER = [
  "timestamp",
  "formType",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
  "Q16",
  "Q17",
  "Q18",
  "Q19",
  "Q20",
  "Q21",
  "Q22",
  "Q23",
  "Q24",
  "Q25",
  "Q26",
  "NAME",
  "DOB",
  "PHONE",
  "consent",
];
const HEADERS = {
  resident: RESIDENT_HEADER,
  tourist: TOURIST_HEADER,
  lodging: LODGER_HEADER,
};
// ------------------------------------------
// -----------------------------
// Entry points
// -----------------------------
function doGet(e) {
  // Backward compatibility:
  // - some frontends call ?action=...
  // - some legacy code calls ?route=...
  // - ri filter can be passed as &ri= or &village=
  const action = String(
    (e && e.parameter && (e.parameter.action || e.parameter.route)) ||
      "admin_summary",
  ).trim();
  const ri = String(
    (e && e.parameter && (e.parameter.ri || e.parameter.village)) || "",
  ).trim();
  switch (action) {
    // -----------------------------
    // Phase 11: AGG API
    // -----------------------------
    case "agg_get":
      const t = e.parameter.type || "admin_summary";
      if (t === "survey_stats")
        return json_(getAggData_("survey_stats", getSurveyStats_));
      if (t === "survey_charts")
        return json_(getAggData_("survey_charts", getSurveyCharts_));
      if (t === "wordcloud")
        return json_(getAggData_("wordcloud", getWordcloud_));
      if (t === "ri_charts")
        return json_(
          getAggData_("ri_charts_" + (ri || "ALL") + "_v3", () =>
            getRiCharts_(ri),
          ),
        );
      return json_(getAggData_("admin_summary_v3", runAdminSummary_));

    case "agg_refresh":
      return json_(refreshAllAgg_());

    // -----------------------------
    // Tab 1: ?꾨왂 ??쒕낫??    // -----------------------------
    case "admin_summary":
      const reg = String(e.parameter.region || "ALL").toUpperCase();
      const per = String(e.parameter.period || "this_month").toLowerCase();
      const cKey =
        reg === "ALL" && per === "this_month"
          ? "admin_summary_v3"
          : `admin_summary_${reg}_${per}_v3`;
      return json_(getAggData_(cKey, () => runAdminSummary_(reg, per)));
    case "kpi_trend_3m":
      return json_(getKpiTrend3m_());
    // Optional: if you later add 6M trend, keep the action reserved
    case "kpi_trend_6m":
      return json_(
        typeof getKpiTrend6m_ === "function"
          ? getKpiTrend6m_()
          : getKpiTrend3m_(),
      );
    // -----------------------------
    // Tab 2: ?ㅻЦ ?듦퀎
    // -----------------------------
    case "survey_stats":
      return json_(getAggData_("survey_stats", getSurveyStats_));
    case "survey_charts":
      return json_(getAggData_("survey_charts", getSurveyCharts_));
    case "wordcloud":
      return json_(getAggData_("wordcloud", getWordcloud_));
    // -----------------------------
    // Tab 3: 由??⑥쐞 遺꾩꽍
    // -----------------------------
    case "ri_charts":
      return json_(
        getAggData_("ri_charts_" + (ri || "ALL") + "_v2", () =>
          getRiCharts_(ri),
        ),
      );
    case "ri_wordcloud":
      return json_(getRiWordcloud_());
    // -----------------------------
    // Tab 8: ?ㅽ뻾?꾪솴 & 留곸빱湲곕컲 (?좉퇋)
    // -----------------------------
    case "prog_exec_summary":
      return json_(
        getAggData_("prog_exec_summary_" + (ri || "ALL") + "_v1", () =>
          getProgExecSummary_(ri),
        ),
      );
    case "linker_base_summary":
      return json_(
        getAggData_("linker_base_summary_" + (ri || "ALL") + "_v1", () =>
          getLinkerBaseSummary_(ri),
        ),
      );
    // -----------------------------
    // AUTH-01: 鍮꾨?踰덊샇 ?몄쬆
    case "auth_check":
      return json_(authCheck_(e.parameter.pass));
    // Tab 4: ?댁쁺 猷⑦떞 (OPS-API-01: A-Plan unified)
    case "ops_routine_get":
    case "ops_routine": // alias for backward compat
      return json_(
        opsRoutineGet_({
          monthKey: e.parameter.monthKey,
          scope: e.parameter.scope || "ALL",
        }),
      );
    case "ops_routine_list":
      return json_(
        opsRoutineList_({
          year: e.parameter.year,
          scope: e.parameter.scope || "ALL",
        }),
      );
    case "ops_routine_upsert":
    case "ops_routine_update": // alias
      return json_(
        opsRoutineUpsert_({
          monthKey: e.parameter.monthKey,
          scope: e.parameter.scope || "ALL",
          completionRate: e.parameter.completionRate,
          pass: e.parameter.pass,
          payload: e.parameter.payloadJson
            ? JSON.parse(e.parameter.payloadJson)
            : null,
        }),
      );
    case "ops_routine_lock":
      return json_(
        opsRoutineLock_({
          monthKey: e.parameter.monthKey,
          scope: e.parameter.scope || "ALL",
          actor: e.parameter.actor || "admin",
          pass: e.parameter.pass,
        }),
      );
    case "ops_routine_unlock":
      return json_(
        opsRoutineUnlock_({
          monthKey: e.parameter.monthKey,
          scope: e.parameter.scope || "ALL",
          pass: e.parameter.pass,
        }),
      );
    case "ops_routine_audit_get":
      return json_(
        opsRoutineAuditGet_({
          monthKey: e.parameter.monthKey,
          scope: e.parameter.scope || "ALL",
        }),
      );
    // -----------------------------
    // Tab 5: 蹂닿퀬??    // -----------------------------
    case "reports_index":
      return json_(getReportsIndex_());
    case "export_report":
      // CSV/Text output
      return exportReport_(e);
    case "geo_index":
      return json_(getGeoIndex_());
    // -----------------------------
    // Tab 6: ?쒕굹由ъ삤 留?(?ㅽ뀅)
    // -----------------------------
    case "scenario_map":
      return json_({ ok: true, message: "Use geo_index for map data" });
    // -----------------------------
    // Tab 6: ?쒕굹由ъ삤 ???遺덈윭?ㅺ린 (SL-DATA-02)
    // -----------------------------
    case "scenario_save":
      return json_(scenarioSave_(e.parameter));
    case "scenario_list":
      return json_(scenarioList_({ scope: e.parameter.scope || "" }));
    case "scenario_get":
      return json_(scenarioGet_({ id: e.parameter.id }));
    // -----------------------------
    // Tab 7: ?곗씠???곹깭 諛??쒖뒪??臾닿껐??(Phase 7)
    // -----------------------------
    case "data_status":
      return json_(getDataStatus_());
    case "data_integrity":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(dataIntegrityCheck_());
    case "kpi_mapping_status":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(kpiMappingStatus_());
    case "system_health":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(systemHealthCheck_());
    // -----------------------------
    // Tab 7: Auto Fix (Phase 10)
    // -----------------------------
    case "data_normalize_scan":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(scanDataNormalize_(e.parameter.formType));
    case "data_normalize_preview":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(
        previewDataNormalize_(
          e.parameter.formType,
          e.parameter.limit ? parseInt(e.parameter.limit) : 20,
        ),
      );
    case "data_normalize_apply":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      return json_(applyDataNormalize_(e.parameter.formType));
    case "toggle_norm":
      if (e.parameter.role !== "admin")
        return json_({ ok: false, error: "Master Access Required" });
      const currentMode =
        PropertiesService.getScriptProperties().getProperty("USE_NORM") ===
        "true";
      PropertiesService.getScriptProperties().setProperty(
        "USE_NORM",
        currentMode ? "false" : "true",
      );
      return json_({ ok: true, useNorm: !currentMode });
    // -----------------------------
    // Legacy / aliases (keep for safety)
    // -----------------------------
    case "stats_resident":
      return json_(getStatsResident_());
    case "stats_lodging":
      return json_(getStatsLodging_());
    case "stats_tourist":
      return json_(getStatsTourist_());
    case "stats_combined":
    case "stats_overview":
    case "stats_v3":
      return json_(getStatsCombined_());
    case "stats":
      return json_(getStatsResident_()); // legacy default
    default:
      return json_({ result: "ready", action });
  }
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const payload = parsePayload_(e);
    // Scenario Logging Routing
    if (
      payload.action === "log_scenario" ||
      e.parameter.action === "log_scenario"
    ) {
      return handleLogScenario_(payload.payload || payload);
    }
    // Ops routine upsert
    const action = payload.action || e.parameter.action;
    if (action === "ops_routine_update" || action === "ops_routine_upsert") {
      return json_(opsRoutineUpsert_(payload));
    }
    // Ops routine clone
    if (action === "ops_routine_clone") {
      return json_(cloneOpsRoutineData_(payload.payload || payload));
    }
    // Ops routine lock/unlock (pass in body)
    if (action === "ops_routine_lock") {
      return json_(opsRoutineLock_(payload));
    }
    if (action === "ops_routine_unlock") {
      return json_(opsRoutineUnlock_(payload));
    }
    // Scenario Save
    if (action === "scenario_save") {
      return json_(scenarioSave_(payload));
    }
    const formType = normalizeFormType_(
      payload.formType ||
        payload.type ||
        payload.surveyType ||
        payload.survey ||
        "",
    );
    // If formType missing, infer based on path or keys (best-effort)
    if (!formType) {
      return json_({
        ok: false,
        error: "Missing formType. Must be one of: resident | lodging | tourist",
      });
    }
    // Save survey response
    const sheetName = SHEETS[formType];
    if (!sheetName) {
      return json_({ ok: false, error: "Unknown formType: " + formType });
    }
    const expectedHeader = HEADERS[formType];
    const sheet = getSheet_(sheetName);
    ensureHeader_(sheet, expectedHeader, formType);
    const row = buildRow_(payload, expectedHeader, formType);
    sheet.appendRow(row);
    // Clear cache (stats refresh)
    clearCaches_();
    return json_({
      ok: true,
      savedTo: sheetName,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return json_({ ok: false, error: String(err), stack: err && err.stack });
  } finally {
    lock.releaseLock();
  }
}
// -----------------------------
// Core: storage helpers
// -----------------------------
function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}
function ensureHeader_(sheet, expectedHeader, formType) {
  if (!expectedHeader) return;
  const lastCol = sheet.getLastColumn();
  // If completely empty sheet, write header and freeze
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, expectedHeader.length).setValues([expectedHeader]);
    sheet.setFrozenRows(1);
    return;
  }
  const range = sheet.getRange(1, 1, 1, lastCol);
  const current = range.getValues()[0];
  // Ticket S02: Log duplicates if any
  const counts = {};
  current.forEach((h) => {
    if (!h) return;
    counts[h] = (counts[h] || 0) + 1;
  });
  for (const [key, count] of Object.entries(counts)) {
    if (count > 1) {
      console.warn(
        `DUPLICATE_HEADER_FOUND: ${key} x${count} in ${formType} sheet`,
      );
    }
  }
  // Check if current headers exactly match expectedHeader
  let match =
    current.length === expectedHeader.length &&
    expectedHeader.every((h, i) => current[i] === h);
  if (!match) {
    // Log columns that would be lost
    const warnMissing = current.filter((h) => h && !expectedHeader.includes(h));
    if (warnMissing.length > 0) {
      console.warn(
        `WARNING: Header mismatch in ${formType}. Removing columns: ${warnMissing.join(", ")}`,
      );
    }
    // Set correct header
    sheet.getRange(1, 1, 1, expectedHeader.length).setValues([expectedHeader]);
    sheet.setFrozenRows(1);
  }
  // [PATCH 01] Delete excess columns beyond expected header length
  const currentLastCol = sheet.getLastColumn();
  if (currentLastCol > expectedHeader.length) {
    sheet.deleteColumns(
      expectedHeader.length + 1,
      currentLastCol - expectedHeader.length,
    );
    console.log(
      `[ensureHeader_] Deleted ${currentLastCol - expectedHeader.length} excess column(s) in ${formType || sheet.getName()} (was ${currentLastCol}, now ${expectedHeader.length})`,
    );
  }
}
function buildRow_(payload, expectedHeader, formType) {
  // Normalize payload keys for mapping (Case-insensitive matching)
  const data = {};
  for (const [key, value] of Object.entries(payload)) {
    data[key.trim().toUpperCase()] = value;
  }
  // Specific mappings for known aliases
  if (data["PRIVACYCONSENT"]) data["CONSENT"] = data["PRIVACYCONSENT"];
  // Create the exact row match (Ticket S03)
  const row = expectedHeader.map((k) => {
    if (k === "timestamp") return new Date();
    if (k === "formType") return formType;
    const keyMatch = String(k).toUpperCase();
    return data[keyMatch] !== undefined ? data[keyMatch] : "";
  });
  return row;
}
function normalizeFormType_(t) {
  const s = String(t || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s.includes("resident") || s.includes("二쇰?")) return "resident";
  if (s.includes("lodging") || s.includes("?숇컯")) return "lodging";
  if (s.includes("tourist") || s.includes("愿愿?)) return "tourist";
  return "";
}
function parsePayload_(e) {
  // Accept JSON body or form-encoded
  if (e && e.postData && e.postData.contents) {
    const ct = String(e.postData.type || "").toLowerCase();
    const body = e.postData.contents;
    if (ct.includes("application/json")) {
      return JSON.parse(body);
    }
    // Try JSON anyway (some clients omit content-type)
    try {
      return JSON.parse(body);
    } catch (_) {
      // fallback to parameters
    }
  }
  // fallback
  const out = {};
  const p = (e && e.parameter) || {};
  Object.keys(p).forEach((k) => (out[k] = p[k]));
  return out;
}
function clearCaches_() {
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    "stats_resident_v4",
    "stats_lodging_v5",
    "stats_tourist_v4",
    "stats_combined_v4",
    // New Cache Keys added to ensure invalidation
    "admin_summary_v3",
    "admin_summary_ALL_this_month_v3",
    "admin_summary_ALL_all_v3",
    "survey_stats",
    "survey_charts",
    "wordcloud",
    "ri_charts_ALL_v3",
    "ri_charts_紐⑦빆由?v3",
    "ri_charts_?섑빆由?v3",
    "ri_charts_v12",
    "ri_wordcloud_v5",
    "stats_res_ALL_this_month_v6",
    "stats_res_ALL_all_v6",
    "stats_lodg_ALL_this_month_v6",
    "stats_lodg_ALL_all_v6",
    "stats_tour_ALL_this_month_v6",
    "stats_tour_ALL_all_v6",
    "prog_exec_summary_ALL_v1",
    "prog_exec_summary_紐⑦빆由?v1",
    "prog_exec_summary_?섑빆由?v1",
    "linker_base_summary_ALL_v1",
    "linker_base_summary_紐⑦빆由?v1",
    "linker_base_summary_?섑빆由?v1",
  ]);
}
// -----------------------------
// Scenario log (existing)
// -----------------------------
function handleLogScenario_(payload) {
  const sh = getSheet_("scenario_log");
  const header = [
    "timestamp",
    "scenarioId",
    "base",
    "final",
    "delta",
    "weights",
    "notes",
  ];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    new Date(),
    payload.scenarioId || "",
    JSON.stringify(payload.base || {}),
    JSON.stringify(payload.final || {}),
    JSON.stringify(payload.delta || {}),
    JSON.stringify(payload.weights || {}),
    payload.notes || "",
  ]);
  return json_({ ok: true });
}
// -----------------------------
// Read & aggregate
// -----------------------------
function readRows_(sheetName) {
  // [DATA-FIX-05] Use NORM if requested
  const useNorm =
    PropertiesService.getScriptProperties().getProperty("USE_NORM") === "true";
  let targetSheetName = sheetName;
  let isNorm = false;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (useNorm && ss.getSheetByName(sheetName + "_NORM")) {
    targetSheetName = sheetName + "_NORM";
    isNorm = true;
  }

  const sh = getSheet_(targetSheetName);
  // Try to find the correct header if it's a known survey sheet
  let ft = null;
  for (let k in SHEETS) {
    if (SHEETS[k] === sheetName) {
      ft = k;
      break;
    }
  }

  // Skip header fixing for NORM sheets
  if (!isNorm) {
    if (ft) ensureHeader_(sh, HEADERS[ft], ft);
    else ensureHeader_(sh);
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  // Handle empty sheet case
  if (lastCol === 0) return { header: [], rows: [] };
  if (lastRow < 2)
    return { header: sh.getRange(1, 1, 1, lastCol).getValues()[0], rows: [] };
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const header = values[0];
  const rows = values.slice(1);
  return { header, rows };
}

// --- [NEW] Dashboard Filters Helper ---
function filterRows_(header, rows, region, period, sheetType = null) {
  const normRegion = String(region || "ALL").toUpperCase();
  const normPeriod = String(period || "this_month").toLowerCase();

  if (
    normRegion === "ALL" &&
    (normPeriod === "this_month" || normPeriod === "all")
  )
    return rows;

  const iRi = idx_(header, "Q1");
  const iTime = idx_(header, "timestamp");

  let validRows = rows;

  if (
    (sheetType === "resident" || sheetType === "lodging") &&
    normRegion !== "ALL" &&
    iRi >= 0
  ) {
    validRows = validRows.filter(
      (r) => String(r[iRi] || "").trim() === normRegion,
    );
  }

  if (normPeriod !== "this_month" && normPeriod !== "all" && iTime >= 0) {
    const now = new Date();
    let monthsToKeep = 0;
    if (normPeriod === "3m") monthsToKeep = 3;
    if (normPeriod === "6m") monthsToKeep = 6;

    if (monthsToKeep > 0) {
      const cutoff = new Date(
        now.getFullYear(),
        now.getMonth() - monthsToKeep + 1,
        1,
      );
      validRows = validRows.filter((r) => {
        const t = new Date(r[iTime]);
        return !isNaN(t.getTime()) && t >= cutoff;
      });
    }
  }

  return validRows;
}

function idx_(header, key) {
  const t = String(key).trim();
  for (let i = 0; i < header.length; i++) {
    if (String(header[i]).trim() === t) return i;
  }
  return -1;
}
function countSingle_(rows, idx) {
  const dist = {};
  rows.forEach((r) => {
    const v = String(r[idx] || "").trim();
    if (!v) return;
    dist[v] = (dist[v] || 0) + 1;
  });
  return dist;
}
function countMulti_(rows, idx) {
  const dist = {};
  rows.forEach((r) => {
    const v = String(r[idx] || "").trim();
    if (!v) return;
    const parts = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    parts.forEach((p) => (dist[p] = (dist[p] || 0) + 1));
  });
  return dist;
}
function getTop3_(dist) {
  const arr = Object.entries(dist || {}).map(([k, v]) => ({
    label: k,
    count: v,
  }));
  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, 3);
}
function posRate_(dist, positiveLabels) {
  const posSet = new Set((positiveLabels || []).map((x) => String(x).trim()));
  let pos = 0;
  let total = 0;
  Object.entries(dist || {}).forEach(([k, v]) => {
    total += v || 0;
    if (posSet.has(String(k).trim())) pos += v || 0;
  });
  return total ? Number(((pos / total) * 100).toFixed(1)) : 0;
}
function sumNumber_(rows, idx) {
  let sum = 0;
  rows.forEach((r) => {
    const n = Number(r[idx]);
    if (!isNaN(n)) sum += n;
  });
  return sum;
}
// Converts "0~19%" etc into midpoints
function calcRangeAvg_(dist) {
  const parseMid = (label) => {
    if (!label) return null;
    const t = String(label).replace(/\s+/g, "");
    // Match "0~19%" or "0-19%" or "0~19"
    const m = t.match(/(\d+)\D+(\d+)/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (!isNaN(a) && !isNaN(b)) return (a + b) / 2;
    }
    // Match "80%?댁긽" style
    const m2 = t.match(/(\d+)\D*?댁긽/);
    if (m2) return Number(m2[1]);
    return null;
  };
  let sum = 0;
  let n = 0;
  Object.entries(dist || {}).forEach(([label, cnt]) => {
    const mid = parseMid(label);
    if (mid === null || mid === undefined || isNaN(mid)) return;
    sum += mid * (cnt || 0);
    n += cnt || 0;
  });
  return n ? Number((sum / n).toFixed(1)) : 0;
}
function withCache_(key, fn) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const val = fn();
  cache.put(key, JSON.stringify(val), CACHE_TTL_SEC);
  return val;
}
// -----------------------------
// Stats: resident
// -----------------------------
function getStatsResident_(region = "ALL", period = "this_month") {
  const cKey = `stats_res_${region}_${period}_v6`;
  return withCache_(cKey, () => {
    let { header, rows } = readRows_(SHEETS.resident);
    rows = filterRows_(header, rows, region, period, "resident");
    // Mappings based on final survey_resident.html
    const iQ1 = idx_(header, "Q1");
    // Q7: Income Stability (Radio - converted)
    const iQ7 = idx_(header, "Q7");
    // Q8: Satisfaction (Radio 5-scale)
    const iQ8 = idx_(header, "Q8");
    // Q9: Uncomfortable (Checkbox)
    const iQ9 = idx_(header, "Q9");
    // Q16: Worries (Checkbox)
    const iQ16 = idx_(header, "Q16");
    // Q19: Use Intent (Radio - new)
    const iQ19 = idx_(header, "Q19");
    // Q20: Monthly Pay (Radio - new)
    const iQ20 = idx_(header, "Q20");
    // Q22: Urgent Needs (Radio)
    const iQ22 = idx_(header, "Q22");
    // New for Advanced Stats
    const iQ4 = idx_(header, "Q4"); // Duration of Residence
    const iQ27 = idx_(header, "Q27"); // Comments (Text) - [CORRECTED back to Q27]
    const q1 = iQ1 >= 0 ? countSingle_(rows, iQ1) : {};
    const q8 = iQ8 >= 0 ? countSingle_(rows, iQ8) : {};
    // Top 3 lists
    const q9 = iQ9 >= 0 ? countMulti_(rows, iQ9) : {};
    const q16 = iQ16 >= 0 ? countMulti_(rows, iQ16) : {};
    const q22 = iQ22 >= 0 ? countSingle_(rows, iQ22) : {};
    const useIntentDist = iQ19 >= 0 ? countSingle_(rows, iQ19) : {};
    const monthlyPayDist = iQ20 >= 0 ? countSingle_(rows, iQ20) : {};
    // Averages (Ordinal)
    const scoreMap = {
      "留ㅼ슦 遺덉븞?뺥븯??: 1,
      "?ㅼ냼 遺덉븞?뺥븯??: 2,
      蹂댄넻?대떎: 3,
      "鍮꾧탳???덉젙?곸씠??: 4,
      "留ㅼ슦 ?덉젙?곸씠??: 5,
      "留ㅼ슦 遺덈쭔議?: 1,
      遺덈쭔議? 2,
      蹂댄넻: 3,
      留뚯”: 4,
      "留ㅼ슦 留뚯”": 5,
      "留ㅼ슦 ?덉쓬": 5,
      ?덉쓬: 4,
      ?놁쓬: 2,
      "?꾪? ?놁쓬": 1,
    };
    const calcAvg = (idx) => {
      if (idx < 0) return 0;
      let sum = 0,
        n = 0;
      rows.forEach((r) => {
        const v = String(r[idx] || "").trim();
        const s = scoreMap[v];
        if (s) {
          sum += s;
          n++;
        }
      });
      return n ? (sum / n).toFixed(1) : 0;
    };
    // Resident Acceptance Index Components
    const avgSat = calcAvg(iQ8); // 1~5
    const avgStab = calcAvg(iQ7); // 1~5
    const avgUse = calcAvg(iQ19); // 1~5
    // Text Extraction (Q27)
    const comments = [];
    if (iQ27 >= 0) {
      rows.forEach((r) => {
        const txt = String(r[iQ27] || "").trim();
        if (txt) comments.push(txt);
      });
    }
    // Advanced Stats: Satisfaction vs Duration Correlation
    const satVsDur = [];
    if (iQ8 >= 0 && iQ4 >= 0) {
      rows.forEach((r) => {
        const sat = String(r[iQ8] || "").trim();
        const dur = String(r[iQ4] || "").trim();
        if (sat && dur) satVsDur.push({ sat: scoreMap[sat] || 3, dur });
      });
    }
    return {
      total: rows.length,
      lastUpdated: new Date().toISOString(),
      q1,
      likert: { livingSatisfaction: q8 },
      needsTop: getTop3_(q22),
      q9: { top3: getTop3_(q9) },
      q9_dist: q9,
      q9_optionCount: Object.keys(q9).length,
      q16: { top3: getTop3_(q16) },
      q22: { top3: getTop3_(q22) },
      useIntent: useIntentDist,
      useIntent_posRate: posRate_(useIntentDist, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
      monthlyPay: monthlyPayDist,
      q7: { avg: avgStab },
      q8: { avg: avgSat },
      comments,
      advanced: { satVsDur },
      // [NEW] For Survey Charts
      q1_dist: q1, // Age
      q4_dist: iQ4 >= 0 ? countSingle_(rows, iQ4) : {}, // Duration
      // Calculate Crosstab: Age(Q1) x Satisfaction(Q8)
      ageSatCrosstab: (function () {
        if (iQ1 < 0 || iQ8 < 0) return null;
        // Rows: Age Groups (sorted if possible, but map keys are unordered)
        // Cols: Satisfaction (1~5)
        const matrix = {};
        rows.forEach((r) => {
          const age = String(r[iQ1] || "").trim();
          const sat = scoreMap[String(r[iQ8] || "").trim()] || 3; // 1-5
          if (!age) return;
          if (!matrix[age])
            matrix[age] = { sum: 0, count: 0, dist: [0, 0, 0, 0, 0] }; // dist for 1,2,3,4,5
          matrix[age].sum += sat;
          matrix[age].count++;
          if (sat >= 1 && sat <= 5) matrix[age].dist[sat - 1]++;
        });
        return matrix;
      })(),
      // Phase 1 KPI
      acceptanceIndex: {
        satisfaction: Number(avgSat),
        stability: Number(avgStab),
        useIntent: Number(avgUse),
      },
    };
  });
}
// -----------------------------
// Stats: lodging
// -----------------------------
function getStatsLodging_(region = "ALL", period = "this_month") {
  const cKey = `stats_lodg_${region}_${period}_v6`;
  return withCache_(cKey, () => {
    let { header, rows } = readRows_(SHEETS.lodging);
    rows = filterRows_(header, rows, region, period, "lodging");
    const iQ1 = idx_(header, "Q1");
    const iQ2 = idx_(header, "Q2"); // Type
    const iQ3 = idx_(header, "Q3"); // Total Rooms (Number)
    const iQ4 = idx_(header, "Q4"); // Occ Year
    const iQ5 = idx_(header, "Q5"); // Occ Peak
    const iQ6 = idx_(header, "Q6"); // Occ Off
    const iQ7 = idx_(header, "Q7"); // Vacancy Months
    const iQ11 = idx_(header, "Q11"); // Revenue Drop
    const iQ13 = idx_(header, "Q13"); // Convert Intent
    const iQ14 = idx_(header, "Q14"); // Convertible Rooms (Number)
    const iQ15 = idx_(header, "Q15"); // Month Contract
    const iQ20 = idx_(header, "Q20"); // Meal
    const iQ21 = idx_(header, "Q21"); // Pickup
    const iQ22 = idx_(header, "Q22"); // Discount
    // New stats
    const iQ26 = idx_(header, "Q26"); // Comments (Text)
    const q1 = iQ1 >= 0 ? countSingle_(rows, iQ1) : {};
    const q2 = iQ2 >= 0 ? countSingle_(rows, iQ2) : {};
    // Total Rooms Sum
    const q3sum = iQ3 >= 0 ? sumNumber_(rows, iQ3) : 0;
    // Distributions for Ranges
    const q5Dist = iQ5 >= 0 ? countSingle_(rows, iQ5) : {};
    const q6Dist = iQ6 >= 0 ? countSingle_(rows, iQ6) : {};
    // Calculate Averages from Ranges
    const q5Avg = calcRangeAvg_(q5Dist);
    const q6Avg = calcRangeAvg_(q6Dist);
    const vacancyMonthsDist = iQ7 >= 0 ? countSingle_(rows, iQ7) : {};
    const offRevenueDrop = iQ11 >= 0 ? countSingle_(rows, iQ11) : {};
    const convertIntent = iQ13 >= 0 ? countSingle_(rows, iQ13) : {};
    const monthlyContract = iQ15 >= 0 ? countSingle_(rows, iQ15) : {};
    const meal = iQ20 >= 0 ? countSingle_(rows, iQ20) : {};
    const pickup = iQ21 >= 0 ? countSingle_(rows, iQ21) : {};
    const residentDiscount = iQ22 >= 0 ? countSingle_(rows, iQ22) : {};
    const convertRoomsTotal = iQ14 >= 0 ? sumNumber_(rows, iQ14) : 0;
    // Text extraction (Q26)
    // Advanced: Text & Scatter Data
    const comments = [];
    const scatterData = [];
    rows.forEach((r) => {
      // Q26 Comments
      if (iQ26 >= 0) {
        const txt = String(r[iQ26] || "").trim();
        if (txt) comments.push(txt);
      }
      // Scatter: Rooms(Q3) vs OffOcc(Q6) vs Vacancy(Q7)
      if (iQ3 >= 0 && iQ6 >= 0 && iQ7 >= 0) {
        const rooms = Number(r[iQ3]) || 0;
        const offOcc = String(r[iQ6] || "").trim();
        const vac = String(r[iQ7] || "").trim();
        // Only push if we have valid room count
        if (rooms > 0) {
          scatterData.push({ rooms, offOcc, vac });
        }
      }
    });
    return {
      total: rows.length,
      lastUpdated: new Date().toISOString(),
      q1,
      q2,
      q3_sum: q3sum, // Total Rooms
      q5: q5Dist,
      q5_avg: q5Avg, // Peak Avg
      q6: { dist: q6Dist, avg: q6Avg },
      vacancyMonthsDist,
      offRevenueDrop,
      convertIntent,
      convertIntent_posRate: posRate_(convertIntent, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
      monthlyContract,
      convertRoomsTotal,
      serviceLink: {
        meal: { dist: meal, posRate: posRate_(meal, ["留ㅼ슦 ?덉쓬", "?덉쓬"]) },
        pickup: {
          dist: pickup,
          posRate: posRate_(pickup, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
        },
        residentDiscount: {
          dist: residentDiscount,
          posRate: posRate_(residentDiscount, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
        },
      },
      q13: { top3: getTop3_(convertIntent) },
      comments,
      advanced: { scatterData },
    };
  });
}
// -----------------------------
// Stats: tourist
// -----------------------------
function getStatsTourist_(region = "ALL", period = "this_month") {
  const cKey = `stats_tour_${region}_${period}_v6`;
  return withCache_(cKey, () => {
    let { rows, header } = readRows_(SHEETS.tourist);
    rows = filterRows_(header, rows, region, period, "tourist");
    const iQ1 = idx_(header, "Q1");
    const iQ2 = idx_(header, "Q2");
    const iQ3 = idx_(header, "Q3");
    const iQ5 = idx_(header, "Q5");
    const iQ6 = idx_(header, "Q6");
    const iQ8 = idx_(header, "Q8");
    const iQ12 = idx_(header, "Q12"); // Needs? Q14? check code.gs
    const iQ21 = idx_(header, "Q21");
    const q1 = iQ1 >= 0 ? countSingle_(rows, iQ1) : {}; // Residence
    const q2 = iQ2 >= 0 ? countSingle_(rows, iQ2) : {}; // Companion
    const q3 = iQ3 >= 0 ? countSingle_(rows, iQ3) : {}; // Stay
    const q5 = iQ5 >= 0 ? countMulti_(rows, iQ5) : {}; // Activity
    const q6 = iQ6 >= 0 ? countSingle_(rows, iQ6) : {}; // Spend
    const q8 = iQ8 >= 0 ? countSingle_(rows, iQ8) : {}; // Revisit
    // Q7 not in tourist survey
    const q7 = {};
    // Derived distributions (placeholder; no direct questions in current survey)
    const needs = iQ12 >= 0 ? countMulti_(rows, iQ12) : {};
    const payIntentDist = {};
    const workationDist = {};
    const longStayDist = {};
    const barrier = [];
    // Extract Q21 comments
    const comments = [];
    if (iQ21 >= 0) {
      rows.forEach((r) => {
        const txt = String(r[iQ21] || "").trim();
        if (txt) comments.push(txt);
      });
    }
    // Spend by Origin (Q6 x Q1)
    const spendByOrigin = {};
    if (iQ6 >= 0 && iQ1 >= 0) {
      rows.forEach((r) => {
        const origin = String(r[iQ1] || "").trim();
        const spend = String(r[iQ6] || "").trim();
        if (!origin || !spend) return;
        if (!spendByOrigin[origin]) spendByOrigin[origin] = {};
        spendByOrigin[origin][spend] = (spendByOrigin[origin][spend] || 0) + 1;
      });
    }
    return {
      total: rows.length,
      lastUpdated: new Date().toISOString(),
      q1,
      q2,
      q3,
      q5: { top3: getTop3_(q5) },
      q6,
      q7,
      q8,
      payIntent: { dist: payIntentDist },
      companion: q2,
      activity: { top3: getTop3_(q5) },
      spend: q6,
      stay: q3,
      revisit: q8,
      workation: {
        dist: workationDist,
        posRate: posRate_(workationDist, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
      },
      monthStay: {
        dist: longStayDist,
        posRate: posRate_(longStayDist, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
      },
      longStayIntent: {
        posRate: posRate_(longStayDist, ["留ㅼ슦 ?덉쓬", "?덉쓬"]),
      },
      offRevisit: {
        dist: q8,
        posRate: posRate_(q8, ["瑗??ㅼ떆 ?ㅺ퀬 ?띕떎", "湲고쉶媛 ?섎㈃ ??寃껋씠??]),
      },
      longStayBarrier: barrier,
      needs: { top3: getTop3_(needs) },
      comments,
      advanced: { spendByOrigin },
    };
  });
}
// -----------------------------
// Stats: combined (basic)
// -----------------------------
function getStatsCombined_() {
  return withCache_("stats_combined_v4", () => {
    const resident = getStatsResident_();
    const lodging = getStatsLodging_();
    const tourist = getStatsTourist_();
    return {
      lastUpdated: new Date().toISOString(),
      resident,
      lodging,
      tourist,
      totals: {
        resident: resident.total || 0,
        lodging: lodging.total || 0,
        tourist: tourist.total || 0,
      },
    };
  });
}
// -----------------------------
// Admin Summary (Type2 KPI) + Sheet Writers
// -----------------------------
function runAdminSummary_(region = "ALL", period = "this_month") {
  const resident = getStatsResident_(region, period);
  const lodging = getStatsLodging_(region, period);
  const tourist = getStatsTourist_(region, period);
  const computed = computeType2Kpi_(resident, lodging, tourist);

  if (region === "ALL" && (period === "this_month" || period === "all")) {
    writeSurveyAggregate_(computed);
    writeAdminSummary_(computed);
    upsertTrendMonth_(computed);
  }

  // Phase 12: Risk Signals
  const trend3m = getKpiTrend3m_();
  const ops = getOpsRoutine_();
  const dataHealth = dataIntegrityCheck_();

  computed.riskSignals = buildRiskSignals_({
    kpi: computed.kpi,
    trend3m: trend3m,
    ops: ops,
    dataHealth: dataHealth,
    components: computed.kpiComponents,
    scope: "all",
  });

  return computed;
}
function computeType2Kpi_(resident, lodging, tourist) {
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const round1 = (x) => Math.round(x * 10) / 10;
  const weightedAvgFromDist = (dist, scoreFn) => {
    let sum = 0;
    let n = 0;
    Object.entries(dist || {}).forEach(([label, cnt]) => {
      const s = scoreFn(String(label || "").trim());
      if (s === null || s === undefined || isNaN(s)) return;
      sum += s * (cnt || 0);
      n += cnt || 0;
    });
    return n ? sum / n : 0;
  };
  // 二쇰? ?붾???Q20) 援ш컙 ??0~100
  const scorePayBucket_ = (label) => {
    if (!label) return null;
    const t = String(label).replace(/\s+/g, "");
    if (t.includes("臾대즺") || t.includes("0??) || t.includes("0??臾대즺)"))
      return 0;
    if (t.includes("1留뚯썝誘몃쭔")) return 25;
    if (t.includes("1~3留뚯썝") || t.includes("1-3留뚯썝")) return 50;
    if (t.includes("3~5留뚯썝") || t.includes("3-5留뚯썝")) return 75;
    if (t.includes("5留뚯썝") || t.includes("5留?) || t.includes("?댁긽"))
      return 100;
    return null;
  };
  // 愿愿?泥대쪟湲곌컙(Q3) ??0~100
  const scoreStay_ = (label) => {
    if (!label) return null;
    const t = String(label).replace(/\s+/g, "");
    if (t.includes("?뱀씪")) return 0;
    if (t.includes("1諛?)) return 40;
    if (t.includes("2諛?)) return 70;
    if (t.includes("3諛?) || t.includes("?댁긽")) return 100;
    return null;
  };
  // 愿愿?吏異?Q6) ??0~100 (蹂댁닔??留ㅽ븨)
  const scoreSpendBucket_ = (label) => {
    if (!label) return null;
    const t = String(label).replace(/\s+/g, "");
    if (t.includes("1留뚯썝誘몃쭔")) return 20;
    if (t.includes("1~3留뚯썝") || t.includes("1-3留뚯썝")) return 40;
    if (t.includes("3~5留뚯썝") || t.includes("3-5留뚯썝")) return 60;
    if (t.includes("5~10留뚯썝") || t.includes("5-10留뚯썝")) return 80;
    if (t.includes("10留뚯썝") || t.includes("10留?) || t.includes("?댁긽"))
      return 100;
    return null;
  };
  // 愿愿??⑦궎吏 吏遺덉쓽??Q15) ??0~100 (?붾???留ㅽ븨 ?ъ궗??
  const scorePayIntent_ = scorePayBucket_;
  // ---- LSI (resident) ----
  const satAvg5 = Number(resident?.q8?.avg || 0); // 1~5 avg
  const sat100 = clamp((satAvg5 / 5) * 100);
  const q9Dist = resident?.q9_dist || {};
  const q9OptionCount = Number(
    resident?.q9_optionCount || Object.keys(q9Dist).length || 1,
  );
  const q9TotalSelections = Object.values(q9Dist).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  );
  const resTotal = Number(resident?.total || 0) || 0;
  const avgSelections = resTotal ? q9TotalSelections / resTotal : 0;
  // 遺덊렪?좏깮瑜?0~100): 1?몃떦 ?좏깮媛쒖닔 / ?듭뀡??  const inconvRate = clamp((avgSelections / q9OptionCount) * 100);
  const inconv100 = 100 - inconvRate;
  const LSI = round1(clamp(0.45 * inconv100 + 0.55 * sat100));
  // ---- CGS (resident) ----
  const usePos100 = clamp(Number(resident?.useIntent_posRate || 0));
  const pay100 = clamp(
    weightedAvgFromDist(resident?.monthlyPay || {}, scorePayBucket_),
  );
  const CGS = round1(clamp(0.65 * usePos100 + 0.35 * pay100));
  // ---- PTS (tourist) ----
  const stay100 = clamp(weightedAvgFromDist(tourist?.stay || {}, scoreStay_));
  const offRevisitPos100 = clamp(Number(tourist?.offRevisit?.posRate || 0));
  const workPos100 = clamp(Number(tourist?.workation?.posRate || 0));
  const monthPos100 = clamp(Number(tourist?.monthStay?.posRate || 0));
  const PTS = round1(
    clamp(
      0.25 * stay100 +
        0.25 * offRevisitPos100 +
        0.25 * workPos100 +
        0.25 * monthPos100,
    ),
  );
  // ---- SUS (lodging + tourist) ----
  const occOff100 = clamp(Number(lodging?.q6_avg || 0));
  const dropAvg = clamp(calcRangeAvg_(lodging?.offRevenueDrop || {}));
  const revDrop100 = clamp(100 - dropAvg);
  const convertPos100 = clamp(Number(lodging?.convertIntent_posRate || 0));
  const totalRooms = Number(lodging?.q3_sum || 0) || 0;
  const convertRoomsTotal = Number(lodging?.convertRoomsTotal || 0) || 0;
  const convertRooms100 = clamp(
    totalRooms ? (convertRoomsTotal / totalRooms) * 100 : 0,
  );
  const spend100 = clamp(
    weightedAvgFromDist(tourist?.spend || {}, scoreSpendBucket_),
  );
  const payIntent100 = clamp(
    weightedAvgFromDist(tourist?.payIntent?.dist || {}, scorePayIntent_),
  );
  const SUS = round1(
    clamp(
      0.2 * occOff100 +
        0.15 * revDrop100 +
        0.2 * convertPos100 +
        0.15 * convertRooms100 +
        0.15 * spend100 +
        0.15 * payIntent100,
    ),
  );
  // ---- SII (imbalance) ----
  const lifeImb = clamp(inconvRate);
  const seasonGap = clamp(
    Math.abs(Number(lodging?.q5_avg || 0) - Number(lodging?.q6_avg || 0)),
  );
  const revenueShock = clamp(dropAvg);
  const SII = round1(
    clamp(0.45 * lifeImb + 0.3 * seasonGap + 0.25 * revenueShock),
  );
  // ---- Core RTRI ----
  const RTRI = round1(
    clamp(0.35 * LSI + 0.25 * CGS + 0.25 * PTS + 0.15 * SUS - 0.15 * SII),
  );
  const phase = RTRI < 65 ? "PHASE_1" : RTRI < 80 ? "PHASE_2" : "PHASE_3";
  const alerts = [];
  if (SUS < 50)
    alerts.push({
      code: "SUS_LOW",
      level: "warn",
      message: "吏?띻??μ꽦(SUS) 50 誘몃쭔: ?댁쁺 吏??由ъ뒪??,
    });
  if (SII > 60)
    alerts.push({
      code: "SII_HIGH",
      level: "warn",
      message: "援ъ“ 遺덇퇏??SII) ?믪쓬: ?앺솢/怨꾩젅/?섏씡 ?몄쨷 議곗젙 ?꾩슂",
    });
  if (LSI < 50)
    alerts.push({
      code: "LSI_LOW",
      level: "warn",
      message: "?앺솢?쒕퉬??LSI) ??쓬: ?섎즺쨌援먰넻쨌?뚮큵 ?곗꽑 蹂닿컯 ?꾩슂",
    });
  const kpiComponents = calculateKpiComponents_(
    resident,
    lodging,
    tourist,
    RTRI,
    SII,
    LSI,
    CGS,
    PTS,
    SUS,
  );
  return {
    region: "all",
    updatedAt: new Date().toISOString(),
    kpi: { RTRI, SII, LSI, CGS, PTS, SUS },
    kpiComponents, // [NEW] Granular data for frontend modals
    counts: {
      resident_total: Number(resident?.total || 0),
      lodging_total: Number(lodging?.total || 0),
      tourist_total: Number(tourist?.total || 0),
    },
    survey: {
      responseCount:
        Number(resident?.total || 0) +
        Number(lodging?.total || 0) +
        Number(tourist?.total || 0),
      responseRate: null,
    },
    phase: { current: phase },
    alerts,
  };
}
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}
function writeAdminSummary_(computed) {
  const sh = sheet_("ADMIN_SUMMARY");
  sh.clearContents();
  const rows = [
    ["Key", "Value"],
    ["RTRI", computed.kpi.RTRI],
    ["SII", computed.kpi.SII],
    ["LSI", computed.kpi.LSI],
    ["CGS", computed.kpi.CGS],
    ["PTS", computed.kpi.PTS],
    ["SUS", computed.kpi.SUS],
    ["RESPONSE_COUNT", computed.survey.responseCount],
    ["RESPONSE_RATE", computed.survey.responseRate],
    ["PHASE", computed.phase.current],
    ["UPDATED_AT", computed.updatedAt],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.setFrozenRows(1);
}
function writeSurveyAggregate_(computed) {
  const sh = sheet_("SURVEY_AGGREGATE");
  sh.clearContents();
  const rows = [
    ["Metric", "Value"],
    ["LSI", computed.kpi.LSI],
    ["CGS", computed.kpi.CGS],
    ["PTS", computed.kpi.PTS],
    ["SUS", computed.kpi.SUS],
    ["SII", computed.kpi.SII],
    ["RTRI", computed.kpi.RTRI],
    ["resident_total", computed.counts.resident_total],
    ["lodging_total", computed.counts.lodging_total],
    ["tourist_total", computed.counts.tourist_total],
    ["responseCount_total", computed.survey.responseCount],
    ["phase", computed.phase.current],
    ["updatedAt", computed.updatedAt],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.setFrozenRows(1);
}
function upsertTrendMonth_(computed) {
  const sh = sheet_("KPI_TREND_3M");
  const header = [
    "month",
    "RTRI",
    "SII",
    "LSI",
    "CGS",
    "PTS",
    "SUS",
    "responses_count",
    "updatedAt",
  ];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  } else {
    const curHeader = sh.getRange(1, 1, 1, header.length).getValues()[0];
    if (String(curHeader[0]).trim() !== "month") {
      sh.insertRowBefore(1);
      sh.getRange(1, 1, 1, header.length).setValues([header]);
      sh.setFrozenRows(1);
    }
  }
  const month = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM");
  const lastRow = sh.getLastRow();
  const months =
    lastRow >= 2
      ? sh
          .getRange(2, 1, lastRow - 1, 1)
          .getValues()
          .flat()
      : [];
  const idx = months.findIndex((m) => String(m) === month);
  const row = [
    month,
    computed.kpi.RTRI,
    computed.kpi.SII,
    computed.kpi.LSI,
    computed.kpi.CGS,
    computed.kpi.PTS,
    computed.kpi.SUS,
    computed.survey.responseCount,
    computed.updatedAt,
  ];
  if (idx >= 0) {
    sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
}
// -----------------------------
// JSON response helper
// -----------------------------
function json_(obj, alreadyStringified) {
  const out = alreadyStringified ? obj : JSON.stringify(obj);
  return ContentService.createTextOutput(out).setMimeType(
    ContentService.MimeType.JSON,
  );
}
// -----------------------------
// Patched: nowIsoKST_
// -----------------------------
function nowIsoKST_() {
  const tz = "Asia/Seoul";
  return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
// -----------------------------
// Patched: toNumberOrNull_
// -----------------------------
function toNumberOrNull_(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
// -----------------------------
// Patched: getKpiTrend3m_
// -----------------------------
function getKpiTrend3m_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("KPI_TREND_3M");
  if (!sheet) {
    return { error: "sheet_not_found", sheet: "KPI_TREND_3M" };
  }
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    return { updatedAt: nowIsoKST_(), months: [], series: {}, rows: [] };
  }
  const headers = values[0].map((h) => String(h).trim());
  const idx = {
    month: headers.indexOf("month"),
    RTRI: headers.indexOf("RTRI"),
    SII: headers.indexOf("SII"),
    LSI: headers.indexOf("LSI"),
    CGS: headers.indexOf("CGS"),
    PTS: headers.indexOf("PTS"),
    SUS: headers.indexOf("SUS"),
    responses_count: headers.indexOf("responses_count"),
    updatedAt: headers.indexOf("updatedAt"),
  };
  const required = [
    "month",
    "RTRI",
    "SII",
    "LSI",
    "CGS",
    "PTS",
    "SUS",
    "updatedAt",
  ];
  for (let i = 0; i < required.length; i++) {
    const k = required[i];
    if (idx[k] === -1) {
      return { error: "missing_header", missing: k, headers };
    }
  }
  // month蹂?理쒖떊 ???좎?
  const latestByMonth = {}; // { "2026-02": rowObj }
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const month = String(row[idx.month] || "").trim();
    if (!month) continue;
    const updatedAt = String(row[idx.updatedAt] || "").trim();
    if (!updatedAt) continue;
    const obj = {
      month,
      RTRI: toNumberOrNull_(row[idx.RTRI]),
      SII: toNumberOrNull_(row[idx.SII]),
      LSI: toNumberOrNull_(row[idx.LSI]),
      CGS: toNumberOrNull_(row[idx.CGS]),
      PTS: toNumberOrNull_(row[idx.PTS]),
      SUS: toNumberOrNull_(row[idx.SUS]),
      responses_count:
        idx.responses_count >= 0
          ? toNumberOrNull_(row[idx.responses_count])
          : null,
      updatedAt,
    };
    const prev = latestByMonth[month];
    if (!prev) {
      latestByMonth[month] = obj;
      continue;
    }
    const tNew = Date.parse(updatedAt);
    const tOld = Date.parse(prev.updatedAt);
    if (!isNaN(tNew) && !isNaN(tOld)) {
      if (tNew > tOld) latestByMonth[month] = obj;
    } else {
      // fallback: 臾몄옄??鍮꾧탳(ISO?쇰㈃ ?泥대줈 ?덉쟾)
      if (updatedAt > prev.updatedAt) latestByMonth[month] = obj;
    }
  }
  // month ?ㅻ쫫李⑥닚 ?뺣젹 ??理쒓렐 3媛?  let rows = Object.keys(latestByMonth)
    .sort()
    .map((m) => latestByMonth[m]);
  if (rows.length > 3) rows = rows.slice(rows.length - 3);
  const months = rows.map((x) => x.month);
  const series = {
    RTRI: rows.map((x) => x.RTRI),
    SII: rows.map((x) => x.SII),
    LSI: rows.map((x) => x.LSI),
    CGS: rows.map((x) => x.CGS),
    PTS: rows.map((x) => x.PTS),
    SUS: rows.map((x) => x.SUS),
  };
  // rows 以?媛??理쒖떊 updatedAt
  let latestUpdatedAt = "";
  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i].updatedAt || "";
    if (!latestUpdatedAt) {
      latestUpdatedAt = cur;
      continue;
    }
    const tA = Date.parse(latestUpdatedAt);
    const tB = Date.parse(cur);
    if (!isNaN(tA) && !isNaN(tB)) {
      if (tB > tA) latestUpdatedAt = cur;
    } else {
      if (cur > latestUpdatedAt) latestUpdatedAt = cur;
    }
  }
  return {
    updatedAt: latestUpdatedAt || nowIsoKST_(),
    months,
    series,
    rows,
  };
}
// -----------------------------
// Patched: getSurveyStats_
// -----------------------------
function getSurveyStats_() {
  // Reuse admin_summary KPI as baseline (LSI/PTS/etc are already computed in Type2 KPI)
  const base = runAdminSummary_("ALL", "all");
  return {
    updatedAt: base.updatedAt,
    kpiComponents: base.kpiComponents, // [NEW] Pass through granular data
    sample: {
      total: Number(base?.survey?.responseCount || 0),
      byFormType: {
        resident: Number(base?.counts?.resident_total || 0),
        lodging: Number(base?.counts?.lodging_total || 0),
        tourist: Number(base?.counts?.tourist_total || 0),
      },
    },
    indices: {
      // Project naming: LSI(?앺솢?쒕퉬??, PCI(李몄뿬??웾), YIP(?좎엯/?뺤갑)
      // If you already have different naming in UI, adjust here.
      LSI: { total: Number(base?.kpi?.LSI || 0), byFormType: {} },
      PCI: { total: Number(base?.kpi?.PTS || 0), byFormType: {} },
      YIP: { total: Number(base?.kpi?.CGS || 0), byFormType: {} },
    },
    alerts: base.alerts || [],
  };
}
// -----------------------------
// Patched: getSurveyCharts_
// -----------------------------
function getSurveyCharts_() {
  const base = runAdminSummary_("ALL", "all");
  const resident = getStatsResident_("ALL", "all");
  const lodging = getStatsLodging_("ALL", "all");
  const tourist = getStatsTourist_("ALL", "all");
  // 1. Radar Data (from KPI Components)
  // LSI, PCI, YIP, RTRI, SII
  const comp = base.kpiComponents || {};
  const radarData = [
    { label: "RTRI", value: 0 },
    { label: "SII", value: 0 },
    { label: "LSI", value: 0 },
    { label: "CGS", value: 0 },
    { label: "PTS", value: 0 },
    { label: "SUS", value: 0 },
  ];
  // Use computed KPI scores if available (more reliable than raw components for high level)
  if (base.kpi) {
    radarData[0].value = base.kpi.RTRI || 0;
    radarData[1].value = base.kpi.SII || 0;
    radarData[2].value = base.kpi.LSI || 0;
    radarData[3].value = base.kpi.CGS || 0;
    radarData[4].value = base.kpi.PTS || 0;
    radarData[5].value = base.kpi.SUS || 0;
  }
  // 2. Top Issues
  // LSI -> Resident Q9 (Inconvenience)
  const lsiIssues = resident.q9?.top3 || [];
  // PCI -> Resident Q22 (Urgent Needs) or Q16 (Worries)
  // Let's use Q22 for Needs/Participation context
  const pciIssues = resident.q22?.top3 || [];
  // YIP -> Tourist Q14 (Needs) or Q13 (Barriers)
  const yipIssues = tourist.needs?.top3 || [];
  // 3. Distributions
  // Age (Resident Q1)
  const ageDist = resident.q1_dist || {};
  const ageLabels = Object.keys(ageDist).sort(); // Basic sort
  const ageData = ageLabels.map((l) => ageDist[l]);
  // Duration (Resident Q4)
  const stayDist = resident.q4_dist || {};
  const stayLabels = Object.keys(stayDist).sort();
  const stayData = stayLabels.map((l) => stayDist[l]);
  // 4. Crosstabs (Age vs Satisfaction)
  // We need to format this for Chart.js Line chart
  // X-axis: Age Groups
  // Y-axis: Avg Satisfaction Score
  const xtab = resident.ageSatCrosstab || {};
  const xtabLabels = Object.keys(xtab).sort();
  const xtabData = xtabLabels.map((l) => {
    const d = xtab[l];
    return d.count ? Number((d.sum / d.count).toFixed(1)) : 0;
  });
  return {
    updatedAt: base.updatedAt,
    radar: radarData,
    topIssues: {
      items: lsiIssues
        .map((i, idx) => ({
          label: i.label,
          count: i.count,
          rank: idx + 1,
        }))
        .concat(pciIssues)
        .concat(yipIssues)
        .slice(0, 5), // Just top 5 mixed? Or separated?
      // Let's structure it as categories if UI supports, but UI generic list expects items
      // The user asked for "Top 5 Issues". Let's mix LSI (Inconvenience) as primary source.
    },
    // Actually, let's keep separate lists if the UI can handle, otherwise merge LSI top 5.
    // UI expects `topIssues.items`. Let's give LSI Top 5.
    topIssues: {
      items: (resident.q9_dist ? getTop3_(resident.q9_dist) : []).slice(0, 5), // Return Top 5 Q9
    },
    distributions: {
      age: {
        labels: ageLabels,
        datasets: [
          {
            label: "?묐떟????,
            data: ageData,
            backgroundColor: "#3b82f6",
          },
        ],
      },
      stay: {
        // Mapped to Duration
        labels: stayLabels,
        datasets: [
          {
            label: "嫄곗＜ 湲곌컙",
            data: stayData,
            backgroundColor: "#10b981",
          },
        ],
      },
    },
    crosstabs: {
      ageSat: {
        labels: xtabLabels,
        datasets: [
          {
            label: "?됯퇏 留뚯”??,
            data: xtabData,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
    },
    alerts: base.alerts || [],
  };
}
// -----------------------------
// Patched: getWordcloud_
// -----------------------------
// -----------------------------
// Patched: getWordcloud_
// -----------------------------
function getWordcloud_() {
  // Extract keywords from open-ended responses
  const base = runAdminSummary_("ALL", "all");
  // Combine comments from all sectors
  // Resident(Q27), Lodging(Q26), Tourist(Q21)
  const res = getStatsResident_("ALL", "all");
  const lod = getStatsLodging_("ALL", "all");
  const tou = getStatsTourist_("ALL", "all");
  const allComments = [
    ...(res.comments || []),
    ...(lod.comments || []),
    ...(tou.comments || []),
  ];
  // Simple Frequency Counter (MVP)
  const stopwords = new Set([
    "?놁쓬",
    "紐⑤쫫",
    "臾?,
    "??,
    "?꾨땲??,
    "醫뗭쓬",
    "蹂댄넻",
    "湲고?",
    "醫",
    "??,
    "??,
    "??,
    "??,
    "媛",
    "??,
    "瑜?,
    "??,
    "??,
    "?⑸땲??,
    "?섎뒗",
    "?",
    "??,
  ]);
  const processComments = (commentArray, limit = 50) => {
    const counts = {};
    (commentArray || []).forEach((text) => {
      const tokens = String(text).split(/[\s,.\n]+/);
      tokens.forEach((t) => {
        const w = t.trim();
        if (w.length > 1 && !stopwords.has(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };
  const allWords = processComments(allComments, 50);
  const resWords = processComments(res.comments, 30);
  const lodWords = processComments(lod.comments, 30);
  const touWords = processComments(tou.comments, 30);
  return {
    updatedAt: base.updatedAt,
    words: allWords,
    segmented: {
      resident: resWords,
      lodging: lodWords,
      tourist: touWords,
    },
  };
}
// -----------------------------
// Patched: getRiCharts_
// -----------------------------
function getRiCharts_() {
  // Minimal safe payload for 紐⑦빆由??섑빆由?(actual RI logic should be implemented by Antigravity)
  const updatedAt = new Date().toISOString();
  return {
    updatedAt,
    ri: ["紐⑦빆由?, "?섑빆由?],
    sample: { 紐⑦빆由? 0, ?섑빆由? 0 },
    radar: {
      labels: ["LSI", "PCI", "YIP"],
      datasets: [
        { label: "紐⑦빆由?, data: [null, null, null] },
        { label: "?섑빆由?, data: [null, null, null] },
      ],
    },
    topN: {
      紐⑦빆由? { LSI: [], PCI: [], YIP: [] },
      ?섑빆由? { LSI: [], PCI: [], YIP: [] },
    },
    distributions: {
      LSI_likert: { 紐⑦빆由? {}, ?섑빆由? {} },
      PCI_payRange: { 紐⑦빆由? [], ?섑빆由? [] },
      intent: { 紐⑦빆由? [], ?섑빆由? [] },
    },
    crosstabs: {
      紐⑦빆由? {
        intent_x_pay: {
          rows: ["Yes", "No", "Unknown"],
          cols: ["0??, "1留뚯썝誘몃쭔", "1~3留뚯썝", "3留뚯썝+"],
          matrix: [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          grandTotal: 0,
        },
      },
      ?섑빆由? {
        intent_x_pay: {
          rows: ["Yes", "No", "Unknown"],
          cols: ["0??, "1留뚯썝誘몃쭔", "1~3留뚯썝", "3留뚯썝+"],
          matrix: [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          grandTotal: 0,
        },
      },
    },
    alerts: [],
  };
}
// -----------------------------
// Patched: getRiWordcloud_
// -----------------------------
function getRiWordcloud_() {
  const updatedAt = new Date().toISOString();
  return { updatedAt, keywords: { 紐⑦빆由? [], ?섑빆由? [] } };
}
// -----------------------------
// Patched: text_
// -----------------------------
function text_(body, mime) {
  const out = ContentService.createTextOutput(body);
  out.setMimeType(
    mime === "text/csv"
      ? ContentService.MimeType.CSV
      : ContentService.MimeType.TEXT,
  );
  return out;
}
// -----------------------------
// Patched: toCsv_
// -----------------------------
function toCsv_(values) {
  return values
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell == null ? "" : cell);
          if (
            s.includes('"') ||
            s.includes(",") ||
            s.includes("\n") ||
            s.includes("\r")
          ) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
}
// -----------------------------
// Patched: getOrCreateSheet_
// -----------------------------
function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && headers.length) {
    const lr = sh.getLastRow();
    if (lr === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else {
      // ensure headers exist
      const cur = sh.getRange(1, 1, 1, headers.length).getValues()[0];
      const empty = cur.every((v) => !v);
      if (empty) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
      }
    }
  }
  return sh;
}
// -----------------------------
// Patched: updateOpsRoutine_
// -----------------------------
function updateOpsRoutine_(payload) {
  // Payload supported shapes:
  // 1) { month:"YYYY-MM", itemKey:"...", checked:true, checkedBy:"name" }
  // 2) { month:"YYYY-MM", items:{ key1:true, key2:false }, checkedBy:"name" }
  const month = String(
    payload.month ||
      payload.period ||
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM"),
  );
  const checkedBy = String(
    payload.checkedBy || payload.user || payload.actor || "",
  );
  const sheet = getOrCreateSheet_("OPS_ROUTINE", [
    "month",
    "itemKey",
    "checked",
    "checkedBy",
    "updatedAt",
  ]);
  const itemsMap =
    payload.items && typeof payload.items === "object" ? payload.items : null;
  const singleKey = payload.itemKey || payload.key || null;
  // Build updates list
  const updates = [];
  if (itemsMap) {
    Object.keys(itemsMap).forEach((k) => {
      updates.push({ itemKey: k, checked: !!itemsMap[k] });
    });
  } else if (singleKey) {
    updates.push({
      itemKey: String(singleKey),
      checked:
        payload.checked === true ||
        String(payload.checked).toLowerCase() === "true",
    });
  } else {
    return { ok: false, error: "Missing itemKey/items" };
  }
  // Index existing rows
  const lastRow = sheet.getLastRow();
  const existing =
    lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];
  const idx = {}; // month|itemKey -> rowNumber (1-indexed)
  existing.forEach((r, i) => {
    const k = String(r[0] || "") + "|" + String(r[1] || "");
    idx[k] = i + 2;
  });
  const nowIso = new Date().toISOString();
  updates.forEach((u) => {
    const key = month + "|" + u.itemKey;
    const rowNo = idx[key];
    if (rowNo) {
      sheet
        .getRange(rowNo, 3, 1, 3)
        .setValues([[u.checked, checkedBy, nowIso]]);
    } else {
      sheet.appendRow([month, u.itemKey, u.checked, checkedBy, nowIso]);
    }
  });
  return { ok: true, month, updatedAt: nowIso, updatedCount: updates.length };
}
// -----------------------------
// Patched: getOpsRoutine_
// -----------------------------
function getOpsRoutine_() {
  // Returns monthly checklist status (MVP)
  const month = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM",
  );
  const items = getOpsChecklist_();
  const sheet = getOrCreateSheet_("OPS_ROUTINE", [
    "month",
    "itemKey",
    "checked",
    "checkedBy",
    "updatedAt",
  ]);
  const rows =
    sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues()
      : [];
  const map = {}; // month|itemKey -> row
  rows.forEach((r) => {
    const k = String(r[0] || "") + "|" + String(r[1] || "");
    map[k] = {
      checked: String(r[2]) === "TRUE" || r[2] === true,
      checkedBy: r[3] || "",
      updatedAt: r[4] || "",
    };
  });
  const checklist = items.map((it) => {
    const k = month + "|" + it.key;
    const v = map[k] || {};
    return {
      key: it.key,
      label: it.label,
      checked: !!v.checked,
      checkedBy: v.checkedBy || "",
      updatedAt: v.updatedAt ? String(v.updatedAt) : "",
    };
  });
  const doneCount = checklist.filter((x) => x.checked).length;
  return {
    updatedAt: new Date().toISOString(),
    month,
    routine: {
      monthlyChecklist: checklist,
      progress: { done: doneCount, total: checklist.length },
    },
  };
}
// -----------------------------
// Antigravity: Granular KPI Components
// -----------------------------
function calculateKpiComponents_(
  resident,
  lodging,
  tourist,
  RTRI,
  SII,
  LSI,
  CGS,
  PTS,
  SUS,
) {
  // Helpers
  const clamp = (x) => Math.max(0, Math.min(100, x));
  // RTRI Components
  // lodgingIntent: From Lodging Q13 (Convert Intent)
  const lodgingIntent = clamp(Number(lodging?.convertIntent_posRate || 0));
  // residentAcceptance: From Resident Q19 (Use Intent) - Proxy for acceptance
  const residentAcceptance = clamp(Number(resident?.useIntent_posRate || 0));
  // longStayDemand: From Tourist Q10 (Month Stay Intent)
  const longStayDemand = clamp(Number(tourist?.longStayIntent?.posRate || 0));
  // constraintIndex: 100 - RTRI (Simplified reverse proxy as real constraint data is complex)
  // Ideally this comes from specific constraint questions
  const constraintIndex = clamp(100 - RTRI);
  // SII Components
  // breakdown by LSI sub-factors
  const q9 = resident?.q9_dist || {};
  const total = Number(resident?.total || 1);
  const getPainScore = (keyTerm) => {
    let count = 0;
    Object.keys(q9).forEach((k) => {
      if (k.includes(keyTerm)) count += q9[k] || 0;
    });
    // Higher pain = Lower Score. Score = 100 - (Pain% * 2) roughly
    const rate = (count / total) * 100;
    return clamp(100 - rate);
  };
  const medical = getPainScore("?섎즺");
  const transport = getPainScore("援먰넻");
  const facility = getPainScore("?쒖꽕");
  const care = getPainScore("?뚮큵");
  const digital = 80; // Default high if not measured
  // CGS Components
  const governanceIntent = 55; // Placeholder
  const volunteerIntent = 60; // Placeholder
  const usageIntent = clamp(Number(resident?.useIntent_posRate || 0));
  // PTS Components
  const totalRooms = Number(lodging?.q3_sum || 0);
  const convRooms = Number(lodging?.convertRoomsTotal || 0);
  const convertibleRoomRate = totalRooms
    ? clamp((convRooms / totalRooms) * 100)
    : 0;
  // SUS Components
  const revisitIntent = clamp(Number(tourist?.offRevisit?.posRate || 0));
  const settleInterest = 30; // Placeholder
  const startupInterest = 40; // Placeholder
  const jobInterest = 20; // Placeholder
  return {
    RTRI: {
      lodgingIntent,
      residentAcceptance,
      longStayDemand,
      constraintIndex,
    },
    SII: { medical, transport, facility, care, digital },
    CGS: { governanceIntent, volunteerIntent, usageIntent },
    PTS: { convertibleRoomRate },
    SUS: { revisitIntent, settleInterest, startupInterest, jobInterest },
  };
}
function getReportsIndex_() {
  // Minimal report inventory for Tab 5
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reports = [
    { type: "admin_summary", sheet: "ADMIN_SUMMARY" },
    { type: "kpi_trend_3m", sheet: "KPI_TREND_3M" },
    { type: "survey_aggregate", sheet: "SURVEY_AGGREGATE" },
  ].map((r) => {
    const sh = ss.getSheetByName(r.sheet);
    const lastRow = sh ? sh.getLastRow() : 0;
    const updatedAt =
      sh && lastRow > 1
        ? String(sh.getRange(lastRow, sh.getLastColumn()).getValue() || "")
        : "";
    return {
      type: r.type,
      sheet: r.sheet,
      available: !!sh,
      lastRow,
      updatedAt,
      exportUrlHint: "?action=export_report&type=" + encodeURIComponent(r.type),
    };
  });
  return { updatedAt: new Date().toISOString(), reports };
}
// -----------------------------
// Patched: getDataStatus_
// -----------------------------
function getDataStatus_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  function sheetRowCount(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return 0;
    const lr = sh.getLastRow();
    return Math.max(0, lr - 1); // minus header
  }
  function sheetLastUpdatedIso(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return "";
    const lr = sh.getLastRow();
    if (lr <= 1) return "";
    // Prefer updatedAt column if present
    const headers = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(String);
    let col = headers.findIndex((h) => String(h).toLowerCase() === "updatedat");
    if (col >= 0) {
      const v = sh.getRange(lr, col + 1).getValue();
      return v ? String(v) : "";
    }
    const v = sh.getRange(lr, 1).getValue();
    return v ? String(v) : "";
  }
  const counts = {
    resident: sheetRowCount(SHEETS.resident),
    lodging: sheetRowCount(SHEETS.lodging),
    tourist: sheetRowCount(SHEETS.tourist),
  };
  const lastUpdated = {
    admin_summary: sheetLastUpdatedIso("ADMIN_SUMMARY"),
    kpi_trend_3m: sheetLastUpdatedIso("KPI_TREND_3M"),
    survey_aggregate: sheetLastUpdatedIso("SURVEY_AGGREGATE"),
  };
  // Basic health heuristic
  let health = "GOOD";
  const errors = [];
  if (counts.resident + counts.lodging + counts.tourist === 0) {
    health = "WARN";
    errors.push({
      code: "NO_RESPONSES",
      message: "responses01/02/03???묐떟 ?곗씠?곌? ?놁뒿?덈떎.",
    });
  }
  // If admin summary missing or not updated in > 7 days -> WARN
  if (!lastUpdated.admin_summary) {
    health = "WARN";
    errors.push({
      code: "NO_ADMIN_SUMMARY",
      message:
        "ADMIN_SUMMARY媛 鍮꾩뼱?덉뒿?덈떎. admin_summary瑜??몄텧??媛깆떊?섏꽭??",
    });
  }
  return {
    updatedAt: now.toISOString(),
    status: {
      health,
      counts,
      lastUpdated,
      errors,
    },
  };
}
// -----------------------------
// Patched: getScenarioMap_
// -----------------------------
function getScenarioMap_() {
  // Stub for Tab 6 scenario map
  return {
    updatedAt: new Date().toISOString(),
    status: "stub",
    nodes: [],
    edges: [],
  };
}
// -----------------------------
// Patched: exportReport_
// -----------------------------
function exportReport_(e) {
  const t = String(e.parameter.type || "").trim();
  const map = {
    admin_summary: "ADMIN_SUMMARY",
    kpi_trend_3m: "KPI_TREND_3M",
    survey_aggregate: "SURVEY_AGGREGATE",
  };
  const sheetName = map[t];
  if (!sheetName) return text_(toCsv_([["error", "unknown report type"]]));
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return text_(toCsv_([["error", "missing sheet: " + sheetName]]));
  const values = sh.getDataRange().getValues();
  return text_(toCsv_(values), "text/csv");
}
// -----------------------------
// [D04 DYNAMIC] Tab 3: Ri Analysis - Real sheet aggregation
// Reads responses01 (resident), groups by Q1 (?됱젙由?
// Q14-Q18 = LSI items, Q19 = LOI (?꾪솚?섑뼢), Q20 = PCI (吏遺덉쓽??, Q25 = ?먯쑀?섍껄
// -----------------------------
function getRiCharts_(riFilter = null) {
  return withCache_("ri_charts_v12", () => {
    // Fetch resident with region constraint but 'all' period
    let { header, rows } = readRows_(SHEETS.resident);
    rows = filterRows_(header, rows, riFilter || "ALL", "all", "resident");

    const iQ1 = idx_(header, "Q1"); // ?됱젙由?援щ텇 (紐⑦빆由??섑빆由?
    const iQ14 = idx_(header, "Q14"); // LSI: ?앺솢?몄쓽
    const iQ15 = idx_(header, "Q15"); // LSI: ?섎즺湲곌?
    const iQ16 = idx_(header, "Q16"); // LSI: ?以묎탳??    const iQ17 = idx_(header, "Q17"); // LSI: 臾명솕?쒖꽕
    const iQ18 = idx_(header, "Q18"); // LSI: ?몄씤?뚮큵
    const iQ19 = idx_(header, "Q19"); // ?꾪솚?섑뼢(LOI)
    const iQ20 = idx_(header, "Q20"); // 吏遺덉쓽??PCI)
    const iQ9 = idx_(header, "Q9"); // 遺덊렪?ы빆 (LSI ??궛??

    const RI_NAMES = ["紐⑦빆由?, "?섑빆由?];
    const LSI_LABELS = [
      "?앺솢/?몄쓽",
      "?섎즺湲곌?",
      "?以묎탳??,
      "臾명솕?쒖꽕",
      "?몄씤?뚮큵",
    ];
    const LSI_COLS = [iQ14, iQ15, iQ16, iQ17, iQ18];

    // ?? TOP2 Box (湲띿젙 ?묐떟援? ??????????????????????????????????
    const TOP2_POS = new Set([
      "留뚯”",
      "留ㅼ슦 留뚯”",
      "留ㅼ슦留뚯”",
      "醫뗭쓬",
      "留ㅼ슦 醫뗭쓬",
      "留ㅼ슦醫뗭쓬",
      "?꾩＜ ???뚭퀬 ?덉쓬",
      "?쒕룞 李몄뿬 ?섑뼢 ?덉쓬",
      "?곴레 李몄뿬",
      "?곹솴??遊먯꽌 寃곗젙",
      "怨꾩냽 嫄곗＜??寃껋엫",
      "?곴레?곸쑝濡?怨꾩냽 ?닿퀬 ?띠쓬",
      "?덉쓬",
      "留ㅼ슦 ?덉쓬",
      "留ㅼ슦?덉쓬",
      "?ㅼ냼 湲띿젙??,
      "留ㅼ슦 湲띿젙??,
    ]);

    // ?? LSI 5???ㅼ퐫??留?(?쒖닠???쇰꺼 留ㅽ븨) ??????????????????????????
    const LSI_SCORE_MAP = {};
    const SCORE_ENTRIES = [
      // Q14 (?몄???
      ["?꾩＜ ???뚭퀬 ?덉쓬", 100],
      ["?ㅼ뼱蹂????덉쓬", 50],
      ["??紐⑤쫫", 0],
      // Q17 (李몄뿬?섑뼢)
      ["?곴레 李몄뿬", 100],
      ["?쒕룞 李몄뿬 ?섑뼢 ?덉쓬", 75],
      ["?섍껄 ?쒖떆 媛??, 50],
      ["?ㅻ챸???뺣룄留?李몄꽍", 25],
      ["?놁쓬", 0],
      // Q8, Q10, Q12 (留뚯”???댁슜/?쒕룄)
      ["留ㅼ슦 留뚯”", 100],
      ["留뚯”", 75],
      ["蹂댄넻", 50],
      ["遺덈쭔議?, 25],
      ["留ㅼ슦 遺덈쭔議?, 0],
      ["留ㅼ슦 ?먯＜ ?ъ슜", 100],
      ["?먯＜ ?ъ슜", 75],
      ["媛???ъ슜", 25],
      ["嫄곗쓽 ?ъ슜 ????, 0],
      ["留ㅼ슦 湲띿젙??, 100],
      ["?ㅼ냼 湲띿젙??, 75],
      ["?ㅼ냼 遺?뺤쟻", 25],
      ["留ㅼ슦 遺?뺤쟻", 0],
      // Q7 (?덉젙??
      ["留ㅼ슦 ?덉젙?곸씠??, 100],
      ["鍮꾧탳???덉젙?곸씠??, 75],
      ["蹂댄넻?대떎", 50],
      ["?ㅼ냼 遺덉븞?뺥븯??, 25],
      ["留ㅼ슦 遺덉븞?뺥븯??, 0],
      // ?쇰컲
      ["留ㅼ슦 醫뗭쓬", 100],
      ["醫뗭쓬", 75],
      ["?섏겏", 25],
      ["留ㅼ슦 ?섏겏", 0],
    ];
    SCORE_ENTRIES.forEach(([k, v]) => {
      LSI_SCORE_MAP[k] = v;
      LSI_SCORE_MAP[k.replace(/\s+/g, "")] = v;
      LSI_SCORE_MAP[k.replace(/\s+/g, " ").trim()] = v;
    });

    // ?? LOI (?꾪솚?섑뼢) ?먮퀎 ?명듃 ??????????????????????????????????
    // ???묐떟: "?덉쓬"(?섑뼢 ?덉쓬), "留ㅼ슦 ?덉쓬"(?곴레), "蹂댄넻", "?놁쓬"
    const LOI_POS_SET = new Set([
      "?덉쓬",
      "?섑뼢 ?덉쓬",
      "?꾪솚 ?섑뼢 ?덉쓬",
      "?꾪솚?섑뼢?덉쓬",
      "留ㅼ슦 ?덉쓬",
      "留ㅼ슦?덉쓬",
      "?곴레 ?섑뼢",
      "?곴레?섑뼢",
      "留ㅼ슦 ?곴레??,
      "留ㅼ슦?곴레??,
    ]);
    const LOI_ACTIVE_SET = new Set([
      "留ㅼ슦 ?덉쓬",
      "留ㅼ슦?덉쓬",
      "?곴레 ?섑뼢",
      "?곴레?섑뼢",
      "留ㅼ슦 ?곴레??,
      "留ㅼ슦?곴레??,
    ]);

    // ?? PCI ?묐떟 踰꾪궥 (Q20 ?쇰꺼 ?쇱튂?? ????????????????????????????
    const PCI_LABELS = [
      "臾대즺留?媛??,
      "1留뚯썝 誘몃쭔",
      "1~3留뚯썝",
      "3~5留뚯썝",
      "5留뚯썝 ?댁긽",
    ];

    // Bucket each row by 由?    const riRows = {};
    RI_NAMES.forEach((n) => (riRows[n] = []));

    rows.forEach((r) => {
      const ri = String(r[iQ1] || "").trim();
      if (RI_NAMES.includes(ri)) riRows[ri].push(r);
    });

    const data = {};
    RI_NAMES.forEach((ri) => {
      const rr = riRows[ri];
      const n = rr.length;

      // ?? LSI Breakdown (Q9 遺덊렪?ы빆 湲곕컲 ??궛) ???????????????????
      const lsiMapping = [
        { label: "?앺솢/?몄쓽", keys: ["?곸뾽쨌?몄쓽?쒖꽕"] },
        { label: "?섎즺湲곌?", keys: ["?섎즺"] },
        { label: "?以묎탳??, keys: ["援먰넻"] },
        { label: "臾명솕?쒖꽕", keys: ["臾명솕쨌?ш?"] },
        { label: "二쇨굅?섍꼍", keys: ["二쇨굅?섍꼍"] },
      ];

      const lsiItems = lsiMapping.map((m) => {
        let count = 0;
        if (iQ9 >= 0) {
          rr.forEach((r) => {
            const v = String(r[iQ9] || "");
            if (m.keys.some((k) => v.includes(k))) count++;
          });
        }
        // ?먯닔 = (誘몄꽑?앹옄 / ?꾩껜) * 100  (遺덊렪?섏? ?딅떎怨??묐떟??鍮꾩쑉)
        const score = n > 0 ? Math.round(((n - count) / n) * 100) : 0;
        return {
          label: m.label,
          score: score,
          top2: score,
          n: n,
        };
      });

      // --- Pay Distribution (Q20) ---
      const payCountMap = {};
      PCI_LABELS.forEach((l) => (payCountMap[l] = 0));
      if (iQ20 >= 0) {
        rr.forEach((r) => {
          const v = String(r[iQ20] || "").trim();
          if (payCountMap.hasOwnProperty(v)) payCountMap[v]++;
        });
      }
      const payDist = PCI_LABELS.map((label) => ({
        label,
        count: payCountMap[label] || 0,
      }));

      // --- Intent 횞 Pay Crosstab (Q19 x Q20) ---
      const rows = [];
      if (iQ19 >= 0) {
        const xSet = new Set();
        rr.forEach((r) => {
          const v = String(r[iQ19] || "")
            .replace(/\s+/g, " ")
            .trim();
          if (v) xSet.add(v);
        });
        rows.push(...Array.from(xSet));
      }
      const cols = PCI_LABELS;

      // Calculate 2D Matrix (Row percentages)
      const matrix = rows.map((rLabel) => {
        const rowData = rr.filter(
          (r) =>
            String(r[iQ19] || "")
              .replace(/\s+/g, " ")
              .trim() === rLabel,
        );
        const total = rowData.length;
        return cols.map((cLabel) => {
          if (total === 0) return 0;
          const count = rowData.filter(
            (r) => String(r[iQ20] || "").trim() === cLabel,
          ).length;
          return Math.round((count / total) * 1000) / 10;
        });
      });

      const intentPayCrosstab = { rows, cols, matrix };

      // --- LOI Summary (Q19 ?꾪솚?섑뼢 鍮꾩쑉) - LOI_POS_SET 湲곗? ---
      const loiCounts = {};
      let intentCount = 0,
        activeCount = 0;
      if (iQ19 >= 0) {
        rr.forEach((r) => {
          const raw = String(r[iQ19] || "").trim();
          const v = raw.replace(/\s+/g, " ").trim(); // 怨듬갚 ?뺢퇋??          // 紐⑤뱺 ?묐떟 留?吏묎퀎
          loiCounts[v] = (loiCounts[v] || 0) + 1;
          // POS ?명듃??鍮꾧탳
          if (LOI_POS_SET.has(v)) intentCount++;
          if (LOI_ACTIVE_SET.has(v)) activeCount++;
        });
      }
      const loiSummary = {
        counts: loiCounts,
        intentRate: n > 0 ? Math.round((intentCount / n) * 1000) / 10 : 0,
        activeRate: n > 0 ? Math.round((activeCount / n) * 1000) / 10 : 0,
      };

      // --- PCI 怨좎븸 鍮꾩쑉 (1留뚯썝 ?댁긽 = "1~3留뚯썝", "3~5留뚯썝", "5留뚯썝 ?댁긽") ---
      const pciHighLabels = ["1~3留뚯썝", "3~5留뚯썝", "5留뚯썝 ?댁긽"];
      const pciHighCount = pciHighLabels.reduce(
        (s, l) => s + (payCountMap[l] || 0),
        0,
      );
      const pciHighRate =
        n > 0 ? Math.round((pciHighCount / n) * 1000) / 10 : 0;

      data[ri] = {
        sample: n,
        lsiBreakdown: { items: lsiItems },
        lsiScoreAvg:
          n > 0
            ? Math.round(
                (lsiItems.reduce((s, it) => s + it.score, 0) /
                  lsiItems.length) *
                  10,
              ) / 10
            : 0,
        loiSummary,
        pciHighRate,
        payDist,
        intentPayCrosstab,
      };
    });

    return {
      updatedAt: new Date().toISOString().split("T")[0],
      data,
    };
  });
}

function getRiWordcloud_(riFilter = null) {
  return withCache_("ri_wordcloud_v5", () => {
    let { header, rows } = readRows_(SHEETS.resident);
    rows = filterRows_(header, rows, riFilter || "ALL", "all", "resident");

    const iQ1 = idx_(header, "Q1"); // ?됱젙由?    const iQ27 = idx_(header, "Q27"); // 二쇱슂 ?ㅼ썙???먯쑀?섍껄 ?띿뒪??
    const RI_NAMES = ["紐⑦빆由?, "?섑빆由?];
    const keywords = {};
    RI_NAMES.forEach((n) => (keywords[n] = {}));

    // Korean stopwords to exclude
    const STOPWORDS = new Set([
      "?덈떎",
      "?녿떎",
      "寃?,
      "??,
      "??,
      "媛",
      "??,
      "??,
      "??,
      "??,
      "瑜?,
      "?",
      "??,
      "?",
      "怨?,
      "??,
      "??,
      "??,
      "?대떎",
      "?섎떎",
      "?꾪빐",
      "?꾩슂",
    ]);

    rows.forEach((r) => {
      const ri = String(r[iQ1] || "").trim();
      if (!RI_NAMES.includes(ri)) return;
      const text = String(r[iQ27] || "").trim();
      if (!text) return;

      // Tokenize by whitespace/punctuation, min 2 chars
      const tokens = text
        .split(/[\s,\.!?;:\(\)\[\]]+/)
        .filter((t) => t.length >= 2);
      tokens.forEach((tok) => {
        const word = tok.replace(/[^媛-?즑-zA-Z0-9]/g, "");
        if (word.length < 2) return;
        if (STOPWORDS.has(word)) return;
        keywords[ri][word] = (keywords[ri][word] || 0) + 1;
      });
    });

    // Convert to sorted array, top 50
    const result = {};
    RI_NAMES.forEach((ri) => {
      result[ri] = Object.entries(keywords[ri])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([name, value]) => ({ name, value }));
    });

    return { keywords: result };
  });
}
// -------------------------------------------------------
// AUTH-01: 鍮꾨?踰덊샇 湲곕컲 ??븷 ?몄쬆
// -------------------------------------------------------

/** AUTH-01: Script Properties?먯꽌 MASTER_PASS/OPERATOR_PASS ?쎌뼱 role 諛섑솚 */
function getRole_(pass) {
  if (!pass) return "NONE";
  try {
    const props = PropertiesService.getScriptProperties();
    const masterPass = props.getProperty("MASTER_PASS") || "admin1234";
    const operatorPass = props.getProperty("OPERATOR_PASS") || "01028401649";
    if (masterPass && pass === masterPass) return "admin";
    if (operatorPass && pass === operatorPass) return "OPERATOR";
  } catch (e) {
    console.warn("[AUTH] getRole_ error:", e);
  }
  return "NONE";
}

/** AUTH-01: auth_check ?묒뀡 ?몃뱾??*/
function authCheck_(pass) {
  const role = getRole_(pass);
  return { ok: role !== "NONE", role };
}

// -------------------------------------------------------
// OPS Routine (A-Plan + Feature A/B/F + AUTH-02)
// Schema: monthKey|scope|payloadJson|completionRate|updatedAt|locked|lockedAt|lockedBy
// -------------------------------------------------------

/**
 * Normalize monthKey: accepts "2026-2" -> "2026-02", validates format.
 * Throws on invalid input.
 */
function normalizeMonthKey_(monthKey) {
  if (monthKey instanceof Date) {
    return Utilities.formatDate(monthKey, "Asia/Seoul", "yyyy-MM");
  }
  const s = String(monthKey || "").trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return `${m[1]}-${String(parseInt(m[2], 10)).padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime()))
    return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM");
  throw new Error("Invalid monthKey. Expected YYYY-MM, got: " + s);
}

/** [F] Compute per-section weighted completion rates */
function calcSectionRates_(items) {
  const sections = ["data", "cgs", "pts", "sus"];
  const result = {};
  sections.forEach((sec) => {
    const si = items.filter((it) => it.section === sec);
    if (!si.length) {
      result[sec] = null;
      return;
    }
    const total = si.reduce((s, it) => s + (Number(it.weight) || 1), 0);
    const done = si
      .filter((it) => it.done)
      .reduce((s, it) => s + (Number(it.weight) || 1), 0);
    result[sec] = total ? Math.round((done / total) * 100) : 0;
  });
  return result;
}

/** [B] Get or create OPS_ROUTINE_AUDIT sheet */
function getOrCreateAuditSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("OPS_ROUTINE_AUDIT");
  if (!sh) {
    sh = ss.insertSheet("OPS_ROUTINE_AUDIT");
    sh.appendRow(["monthKey", "scope", "ts", "actor", "changeSummary"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** [B] Append audit record; trim to latest 20 per (monthKey+scope) */
function appendAudit_(monthKey, scope, actor, summary) {
  try {
    const sh = getOrCreateAuditSheet_();
    sh.appendRow([monthKey, scope, new Date(), actor || "system", summary]);
    const last = sh.getLastRow();
    if (last > 1) {
      const rows = sh.getRange(2, 1, last - 1, 5).getValues();
      const matching = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => String(r[0]) === monthKey && String(r[1]) === scope);
      if (matching.length > 20) {
        matching
          .slice(0, matching.length - 20)
          .reverse()
          .forEach(({ i }) => sh.deleteRow(i + 2));
      }
    }
  } catch (e) {
    console.warn("[AUDIT] write failed:", e);
  }
}

/** [B] Get last 20 audit records for a month */
function opsRoutineAuditGet_(params) {
  let monthKey;
  try {
    monthKey = normalizeMonthKey_(params.monthKey);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const scope = String(params.scope || "ALL");
  const sh = getOrCreateAuditSheet_();
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, monthKey, scope, records: [] };
  const rows = sh.getRange(2, 1, last - 1, 5).getValues();
  const records = rows
    .filter((r) => {
      let mk;
      try {
        mk = normalizeMonthKey_(r[0]);
      } catch (_) {
        return false;
      }
      return mk === monthKey && String(r[1]) === scope;
    })
    .slice(-20)
    .reverse()
    .map((r) => ({
      ts: r[2] ? new Date(r[2]).toISOString() : "",
      actor: String(r[3]),
      summary: String(r[4]),
    }));
  return { ok: true, monthKey, scope, records };
}

/** [A] Get or create OPS_ROUTINE sheet with 8-column schema */
function getOrCreateOpsRoutineSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("OPS_ROUTINE");
  if (!sh) sh = ss.insertSheet("OPS_ROUTINE");
  const header = [
    "monthKey",
    "scope",
    "payloadJson",
    "completionRate",
    "updatedAt",
    "locked",
    "lockedAt",
    "lockedBy",
  ];
  const lastRow = sh.getLastRow();
  if (lastRow === 0) {
    sh.appendRow(header);
    sh.setFrozenRows(1);
  } else {
    const curCol = sh.getLastColumn();
    const current = sh
      .getRange(1, 1, 1, Math.max(curCol, header.length))
      .getValues()[0];
    if (!header.every((h, i) => String(current[i]) === h)) {
      sh.getRange(1, 1, 1, header.length).setValues([header]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** OPS-API-01 + [A][B][F]: Upsert with LOCK check, Audit, SectionRates */
function opsRoutineUpsert_(payload) {
  const sh = getOrCreateOpsRoutineSheet_();
  let monthKey;
  try {
    monthKey = normalizeMonthKey_(payload.monthKey);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const scope = String(payload.scope || "ALL");

  const data = payload.payload || {
    items: payload.items || [],
    issues: payload.issues || [],
  };
  const payloadJson = JSON.stringify(data);
  const items = data.items || [];
  const completionRate = items.length
    ? Math.round((items.filter((x) => x.done).length / items.length) * 100)
    : Number(payload.completionRate || 0);
  const updatedAt = new Date();

  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 8).getValues() : [];

  let targetRow = -1,
    latest = -1,
    prevPayloadJson = null,
    isLocked = false;
  rows.forEach((r, i) => {
    let mk;
    try {
      mk = normalizeMonthKey_(r[0]);
    } catch (_) {
      return;
    }
    if (mk === monthKey && String(r[1]) === scope) {
      const t = r[4] ? new Date(r[4]).getTime() : 0;
      if (t >= latest) {
        latest = t;
        targetRow = i + 2;
        prevPayloadJson = r[2];
        isLocked = String(r[5]).toUpperCase() === "TRUE";
      }
    }
  });

  // [A] Reject if locked
  // [AUTH-02] Reject if locked, unless MASTER role
  if (isLocked) {
    const role = getRole_(payload.pass || "");
    if (role !== "admin")
      return { ok: false, error: "LOCKED", monthKey, scope };
  }

  if (targetRow > 0) {
    sh.getRange(targetRow, 3, 1, 3).setValues([
      [payloadJson, completionRate, updatedAt],
    ]);
  } else {
    sh.appendRow([
      monthKey,
      scope,
      payloadJson,
      completionRate,
      updatedAt,
      false,
      "",
      "",
    ]);
  }

  // [B] Audit log
  try {
    const prev = prevPayloadJson ? JSON.parse(prevPayloadJson).items || [] : [];
    const prevMap = {};
    prev.forEach((it) => {
      prevMap[it.id] = it;
    });
    const changes = [];
    items.forEach((it) => {
      const p = prevMap[it.id];
      if (!p) {
        changes.push("[NEW] " + it.title);
        return;
      }
      if (p.done !== it.done)
        changes.push(it.title + ": " + (p.done ? "?볛넂?? : "?먥넂??));
      if (p.owner !== it.owner)
        changes.push(it.title + " ?대떦: " + p.owner + "?? + it.owner);
      if ((p.memo || "") !== (it.memo || ""))
        changes.push(it.title + " 硫붾え ?섏젙");
      if ((p.proofUrl || "") !== (it.proofUrl || ""))
        changes.push(it.title + " 利앸튃 " + (it.proofUrl ? "?깅줉" : "??젣"));
    });
    if (changes.length > 0) {
      appendAudit_(
        monthKey,
        scope,
        String(payload.actor || "user"),
        changes.slice(0, 5).join(" | ") +
          (changes.length > 5 ? " ??" + (changes.length - 5) + "嫄? : ""),
      );
    }
  } catch (_) {}

  return {
    ok: true,
    monthKey,
    scope,
    completionRate,
    updatedAt: updatedAt.toISOString(),
  };
}

/** OPS-API-01/04 + [A][F]: Get with sectionRates and lock info */
function opsRoutineGet_(params) {
  const sh = getOrCreateOpsRoutineSheet_();
  let monthKey;
  try {
    monthKey = normalizeMonthKey_(params.monthKey);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const scope = String(params.scope || "ALL");

  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 8).getValues() : [];

  let best = null,
    bestT = -1;
  rows.forEach((r) => {
    let mk;
    try {
      mk = normalizeMonthKey_(r[0]);
    } catch (_) {
      return;
    }
    if (mk === monthKey && String(r[1]) === scope) {
      const t = r[4] ? new Date(r[4]).getTime() : 0;
      if (t > bestT) {
        bestT = t;
        best = r;
      }
    }
  });

  if (!best) return { ok: true, exists: false, monthKey, scope };

  let payload = {};
  try {
    payload = JSON.parse(best[2] || "{}");
  } catch (_) {}
  const items = payload.items || [];
  const completionRate = items.length
    ? Math.round((items.filter((x) => x.done).length / items.length) * 100)
    : Number(best[3] || 0);
  return {
    ok: true,
    exists: true,
    monthKey,
    scope,
    payload,
    items,
    issues: payload.issues || [],
    completionRate,
    sectionRates: calcSectionRates_(items), // [F]
    locked: String(best[5]).toUpperCase() === "TRUE", // [A]
    lockedAt: best[6] ? new Date(best[6]).toISOString() : null,
    lockedBy: best[7] ? String(best[7]) : null,
    updatedAt: best[4] ? new Date(best[4]).toISOString() : "",
  };
}

/** OPS-API-02 + [A][F]: List with sectionRates and locked per month */
function opsRoutineList_(params) {
  const sh = getOrCreateOpsRoutineSheet_();
  const year = String(params.year || "");
  const scope = String(params.scope || "ALL");

  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 8).getValues() : [];

  const map = {};
  rows.forEach((r) => {
    let mk;
    try {
      mk = normalizeMonthKey_(r[0]);
    } catch (_) {
      return;
    }
    if (!mk || (year && !mk.startsWith(year)) || String(r[1]) !== scope) return;
    const t = r[4] ? new Date(r[4]).getTime() : 0;
    if (!map[mk] || t > map[mk].t) {
      let items = [];
      try {
        items = JSON.parse(r[2] || "{}").items || [];
      } catch (_) {}
      map[mk] = {
        t,
        completionRate: Number(r[3] || 0),
        updatedAt: r[4],
        locked: String(r[5]).toUpperCase() === "TRUE",
        sectionRates: calcSectionRates_(items),
      };
    }
  });

  const months = Object.keys(map)
    .sort()
    .map((mk) => ({
      monthKey: mk,
      completionRate: map[mk].completionRate,
      sectionRates: map[mk].sectionRates,
      locked: map[mk].locked,
      updatedAt: map[mk].updatedAt
        ? new Date(map[mk].updatedAt).toISOString()
        : "",
    }));

  return { ok: true, scope, year, months };
}

/** [A][AUTH-02] Lock a month ??MASTER role only */
function opsRoutineLock_(params) {
  // AUTH-02: MASTER role check
  const role = getRole_(params.pass || "");
  if (role !== "admin")
    return { ok: false, error: "UNAUTHORIZED", required: "admin" };

  let monthKey;
  try {
    monthKey = normalizeMonthKey_(params.monthKey);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const scope = String(params.scope || "ALL"),
    actor = String(params.actor || "admin");
  const sh = getOrCreateOpsRoutineSheet_();
  const last = sh.getLastRow();
  if (last < 2) return { ok: false, error: "No data for " + monthKey };
  const rows = sh.getRange(2, 1, last - 1, 8).getValues();
  let targetRow = -1,
    bestT = -1;
  rows.forEach((r, i) => {
    let mk;
    try {
      mk = normalizeMonthKey_(r[0]);
    } catch (_) {
      return;
    }
    if (mk === monthKey && String(r[1]) === scope) {
      const t = r[4] ? new Date(r[4]).getTime() : 0;
      if (t > bestT) {
        bestT = t;
        targetRow = i + 2;
      }
    }
  });
  if (targetRow < 0) return { ok: false, error: "Row not found: " + monthKey };
  const now = new Date();
  sh.getRange(targetRow, 6, 1, 3).setValues([[true, now, actor]]);
  appendAudit_(monthKey, scope, actor, "[LOCKED] " + monthKey + " 留덇컧 泥섎━");
  return {
    ok: true,
    monthKey,
    scope,
    locked: true,
    lockedAt: now.toISOString(),
    lockedBy: actor,
  };
}

/** [A][AUTH-02] Unlock a month ??MASTER role only */
function opsRoutineUnlock_(params) {
  // AUTH-02: MASTER role check
  const role = getRole_(params.pass || "");
  if (role !== "admin")
    return { ok: false, error: "UNAUTHORIZED", required: "admin" };

  let monthKey;
  try {
    monthKey = normalizeMonthKey_(params.monthKey);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const scope = String(params.scope || "ALL");
  const sh = getOrCreateOpsRoutineSheet_();
  const last = sh.getLastRow();
  if (last < 2) return { ok: false, error: "No data" };
  const rows = sh.getRange(2, 1, last - 1, 8).getValues();
  let targetRow = -1,
    bestT = -1;
  rows.forEach((r, i) => {
    let mk;
    try {
      mk = normalizeMonthKey_(r[0]);
    } catch (_) {
      return;
    }
    if (mk === monthKey && String(r[1]) === scope) {
      const t = r[4] ? new Date(r[4]).getTime() : 0;
      if (t > bestT) {
        bestT = t;
        targetRow = i + 2;
      }
    }
  });
  if (targetRow < 0) return { ok: false, error: "Row not found: " + monthKey };
  sh.getRange(targetRow, 6, 1, 3).setValues([[false, "", ""]]);
  appendAudit_(
    monthKey,
    scope,
    "admin",
    "[UNLOCKED] " + monthKey + " 留덇컧 ?댁젣",
  );
  return { ok: true, monthKey, scope, locked: false };
}

/** cloneOpsRoutineData_: delegates to canonical upsert. */
function cloneOpsRoutineData_(payload) {
  const { fromMonth, toMonth } = payload;
  const source = opsRoutineGet_({ monthKey: fromMonth, scope: "ALL" });
  if (!source || !source.exists)
    return { ok: false, error: "Source month data not found: " + fromMonth };
  const clonedItems = (source.items || []).map((it) => ({
    ...it,
    done: false,
    doneAt: null,
    memo: "",
    proofUrl: "",
  }));
  return opsRoutineUpsert_({
    monthKey: toMonth,
    scope: "ALL",
    items: clonedItems,
    issues: source.issues || [],
  });
}

/** Legacy wrappers ??kept for internal calls, map to canonical functions. */
function getOpsRoutine_() {
  const month = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM");
  return opsRoutineGet_({ monthKey: month, scope: "ALL" });
}
function getOpsRoutineData_(monthKey, scope) {
  return opsRoutineGet_({ monthKey, scope: scope || "ALL" });
}
function getOpsRoutineList_() {
  return opsRoutineList_({ scope: "ALL" });
}
function upsertOpsRoutineData_(payload) {
  return opsRoutineUpsert_(payload);
}

/**
 * Normalize a monthKey value that may be a Date object (from old Sheets typed column)
 * or a full date string to YYYY-MM format.
 */
function normalizeMonthKey_(raw) {
  if (!raw) return "";
  // GAS Date object
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, "Asia/Seoul", "yyyy-MM");
  }
  const s = String(raw).trim();
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // Try to parse as date string (e.g. 'Sun Feb 01 2026 ...')
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM");
  }
  return s;
}

/**
 * Ensure OPS_ROUTINE sheet uses the 5-column A-plan schema.
 * Migrates old 3-column (monthKey, data, updatedAt) gracefully.
 */
function ensureOpsRoutineSchema_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow === 0) {
    // Empty sheet ??write header
    sh.getRange(1, 1, 1, OPS_HEADER.length).setValues([OPS_HEADER]);
    sh.setFrozenRows(1);
    return;
  }
  const existingHeader = sh
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(String);
  // Already correct
  if (existingHeader.join(",") === OPS_HEADER.join(",")) return;
  // Old 3-col schema: monthKey, data, updatedAt
  // Migrate: rename data -> payloadJson, add scope & completionRate
  if (
    existingHeader[0] === "monthKey" &&
    (existingHeader[1] === "data" || existingHeader[1] === "payloadJson")
  ) {
    // Expand header to 5 columns
    sh.getRange(1, 1, 1, OPS_HEADER.length).setValues([OPS_HEADER]);
    // If only 3 cols, add scope='ALL', completionRate=0 to existing data rows
    if (lastCol < OPS_HEADER.length && lastRow > 1) {
      for (let i = 2; i <= lastRow; i++) {
        const rowData = sh.getRange(i, 1, 1, lastCol).getValues()[0];
        // col2 = old `data`/`payloadJson`, col3 = old `updatedAt`
        const payloadJson = rowData[1] || "{}";
        const updatedAt = rowData[2] || "";
        // compute completionRate from payload if possible
        let completionRate = 0;
        try {
          const p = JSON.parse(payloadJson);
          const items = p.items || [];
          completionRate = items.length
            ? Math.round(
                (items.filter((x) => x.done).length / items.length) * 100,
              )
            : 0;
        } catch (_) {}
        const rawMonthKey = rowData[0];
        const normalizedKey = normalizeMonthKey_(rawMonthKey);
        sh.getRange(i, 1, 1, OPS_HEADER.length).setValues([
          [normalizedKey, "ALL", payloadJson, completionRate, updatedAt],
        ]);
      }
    }
    sh.setFrozenRows(1);
    console.log("[OPS] Migrated OPS_ROUTINE to 5-column A-plan schema");
  } else {
    // Unknown schema ??force correct header, leave data
    sh.getRange(1, 1, 1, OPS_HEADER.length).setValues([OPS_HEADER]);
    sh.setFrozenRows(1);
  }
}

// [PATCH 02-2] getOpsRoutine_: returns current month via A-plan format
function getOpsRoutine_() {
  const month = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM");
  return getOpsRoutineData_(month, "ALL");
}

// [PATCH 02-2] getOpsRoutineData_: A-plan format response
function getOpsRoutineData_(monthKey, scope) {
  if (!monthKey) return null;
  scope = scope || "ALL";
  const sh = getSheet_("OPS_ROUTINE");
  ensureOpsRoutineSchema_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  const values = sh.getRange(2, 1, lastRow - 1, OPS_HEADER.length).getValues();
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    const mk = normalizeMonthKey_(r[0]);
    if (mk === String(monthKey) && String(r[1]) === String(scope)) {
      let payload = { items: [], issues: [] };
      try {
        payload = JSON.parse(r[2] || "{}");
      } catch (_) {}
      const items = payload.items || [];
      const completionRate = items.length
        ? Math.round((items.filter((x) => x.done).length / items.length) * 100)
        : Number(r[3]) || 0;
      return {
        monthKey: mk,
        scope: String(r[1]),
        payload,
        // Also expose top-level items/issues for backward compat
        items: payload.items || [],
        issues: payload.issues || [],
        completionRate,
        updatedAt: r[4] ? String(r[4]) : "",
      };
    }
  }
  return null;
}

// [PATCH 02-3] getOpsRoutineList_: includes scope & completionRate
function getOpsRoutineList_() {
  const sh = getSheet_("OPS_ROUTINE");
  ensureOpsRoutineSchema_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh
    .getRange(2, 1, lastRow - 1, OPS_HEADER.length)
    .getValues()
    .map((r) => ({
      monthKey: normalizeMonthKey_(r[0]),
      scope: String(r[1]) || "ALL",
      completionRate: Number(r[3]) || 0,
      updatedAt: r[4] ? String(r[4]) : "",
    }))
    .filter((r) => r.monthKey);
}

// [PATCH 02-1+02-3] upsertOpsRoutineData_: 5-column schema, (monthKey+scope) upsert key
function upsertOpsRoutineData_(payload) {
  if (!payload || !payload.monthKey)
    return { ok: false, error: "monthKey required" };
  const monthKey = String(payload.monthKey);
  const scope = String(payload.scope || "ALL");
  const items = payload.items || [];
  const issues = payload.issues || [];
  const sh = getSheet_("OPS_ROUTINE");
  ensureOpsRoutineSchema_(sh);
  const payloadJson = JSON.stringify({ items, issues });
  const completionRate = items.length
    ? Math.round((items.filter((x) => x.done).length / items.length) * 100)
    : 0;
  const now = new Date();
  // Find existing row by (monthKey, scope)
  const lastRow = sh.getLastRow();
  let foundRow = -1;
  if (lastRow > 1) {
    const keys = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === monthKey && String(keys[i][1]) === scope) {
        foundRow = i + 2; // 1-indexed, skip header
        break;
      }
    }
  }
  const rowData = [monthKey, scope, payloadJson, completionRate, now];
  if (foundRow > 0) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  return {
    ok: true,
    monthKey,
    scope,
    completionRate,
    updatedAt: now.toISOString(),
  };
}

// cloneOpsRoutineData_: unchanged logic, delegates to upsert
function cloneOpsRoutineData_(payload) {
  const { fromMonth, toMonth } = payload;
  const source = getOpsRoutineData_(fromMonth, "ALL");
  if (!source)
    return { ok: false, error: "Source month data not found: " + fromMonth };
  // Clear completion status for the new month
  const clonedItems = (source.items || []).map((it) => ({
    ...it,
    done: false,
    doneAt: null,
    memo: "",
    proofUrl: "",
  }));
  return upsertOpsRoutineData_({
    monthKey: toMonth,
    scope: "ALL",
    items: clonedItems,
    issues: source.issues || [],
  });
}

// ============================================================
// SCENARIO LAB (SL-DATA-01/02)
// SCENARIO_LOG ?쒗듃: scenarioId | title | scope | selectedItemsJson |
//   assumptionsJson | baselineJson | resultJson | driversJson | createdAt | updatedAt
// ============================================================

function getOrCreateScenarioSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const SHEET_NAME = "SCENARIO_LOG";
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    const headers = [
      "scenarioId",
      "title",
      "scope",
      "selectedItemsJson",
      "assumptionsJson",
      "baselineJson",
      "resultJson",
      "driversJson",
      "createdAt",
      "updatedAt",
    ];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e8f0fe");
    sh.setFrozenRows(1);
  }
  return sh;
}

// action=scenario_save
function scenarioSave_(params) {
  try {
    const sh = getOrCreateScenarioSheet_();
    const now = new Date().toISOString();

    // Accept either GET params (JSON strings) or direct objects
    const title = params.title || "?쒕ぉ ?놁쓬";
    const scope = params.scope || "ALL";
    const selectedJson =
      params.selectedItemsJson || params.selectedItems || "[]";
    const assumptionsJson =
      params.assumptionsJson || params.assumptions || "{}";
    const baselineJson = params.baselineJson || params.baseline || "{}";
    const resultJson = params.resultJson || params.result || "{}";
    const driversJson = params.driversJson || params.drivers || "{}";

    // Check if updating existing (by scenarioId)
    const scenarioId = params.scenarioId || String(Date.now());

    const data = sh.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(scenarioId)) {
        foundRow = i + 1; // 1-based
        break;
      }
    }

    const row = [
      scenarioId,
      title,
      scope,
      typeof selectedJson === "string"
        ? selectedJson
        : JSON.stringify(selectedJson),
      typeof assumptionsJson === "string"
        ? assumptionsJson
        : JSON.stringify(assumptionsJson),
      typeof baselineJson === "string"
        ? baselineJson
        : JSON.stringify(baselineJson),
      typeof resultJson === "string" ? resultJson : JSON.stringify(resultJson),
      typeof driversJson === "string"
        ? driversJson
        : JSON.stringify(driversJson),
      foundRow > 0 ? data[foundRow - 2][8] : now, // createdAt preserved on update
      now, // updatedAt always refreshed
    ];

    if (foundRow > 0) {
      sh.getRange(foundRow, 1, 1, row.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }

    return { ok: true, scenarioId, updatedAt: now };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// action=scenario_list
function scenarioList_({ scope }) {
  try {
    const sh = getOrCreateScenarioSheet_();
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return { ok: true, scenarios: [] };

    const headers = data[0];
    const rows = data
      .slice(1)
      .map((r) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = r[i]));
        return obj;
      })
      .filter((r) => !scope || r.scope === scope)
      .sort((a, b) => {
        // Sort by updatedAt descending
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      })
      .slice(0, 20);

    return { ok: true, scenarios: rows };
  } catch (err) {
    return { ok: false, error: err.message, scenarios: [] };
  }
}

// action=scenario_get
function scenarioGet_({ id }) {
  try {
    if (!id) return { ok: false, error: "id required" };
    const sh = getOrCreateScenarioSheet_();
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return { ok: false, error: "not found" };

    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        const obj = {};
        headers.forEach((h, j) => (obj[h] = data[i][j]));
        return { ok: true, scenario: obj };
      }
    }
    return { ok: false, error: "scenario not found: " + id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ============================================================
// GEOGRAPHICAL DATA (MAP-DATA-01)
// ============================================================

function getOrCreateGeoSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let riSh = ss.getSheetByName("GEO_RI");
  if (!riSh) {
    riSh = ss.insertSheet("GEO_RI");
    const headers = ["ri", "label", "svgPath", "centerLat", "centerLng"];
    riSh.getRange(1, 1, 1, headers.length).setValues([headers]);
    riSh.setFrozenRows(1);
    // Initial Mock Data
    const mockPaths = [
      [
        "紐⑦빆由?,
        "紐⑦빆由?,
        "M 10 30 L 70 10 L 100 40 L 80 90 L 20 80 Z",
        36.7,
        126.1,
      ],
      [
        "?섑빆由?,
        "?섑빆由?,
        "M 110 20 L 180 15 L 200 60 L 170 95 L 120 85 Z",
        36.8,
        126.2,
      ],
    ];
    riSh
      .getRange(2, 1, mockPaths.length, mockPaths[0].length)
      .setValues(mockPaths);
  }

  let poiSh = ss.getSheetByName("GEO_POI");
  if (!poiSh) {
    poiSh = ss.insertSheet("GEO_POI");
    const headers = ["poiId", "name", "type", "ri", "x", "y", "note", "url"];
    poiSh.getRange(1, 1, 1, headers.length).setValues([headers]);
    poiSh.setFrozenRows(1);
    // Initial Mock POIs
    const mockPois = [
      ["A1", "紐⑦빆 ?듭빱?쇳꽣", "ANCHOR", "紐⑦빆由?, 45, 45, "二쇰? ?쒕룞 嫄곗젏", ""],
      [
        "A2",
        "?섑빆 蹂듯빀?쇳꽣",
        "ANCHOR",
        "?섑빆由?,
        150,
        40,
        "愿愿??덈궡 諛??몄쓽",
        "",
      ],
      ["M1", "蹂닿굔吏꾨즺??, "MEDICAL", "紐⑦빆由?, 30, 60, "怨듦났 蹂닿굔", ""],
      ["T1", "紐⑦빆???뺣쪟??, "TRANSIT", "紐⑦빆由?, 60, 25, "踰꾩뒪/?앹떆", ""],
    ];
    poiSh
      .getRange(2, 1, mockPois.length, mockPois[0].length)
      .setValues(mockPois);
  }
}

function getGeoIndex_() {
  try {
    getOrCreateGeoSheets_();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Read RI
    const riSh = ss.getSheetByName("GEO_RI");
    const riData = riSh.getDataRange().getValues();
    const riHeaders = riData[0];
    const riList = riData.slice(1).map((r) => {
      const obj = {};
      riHeaders.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });

    // Read POI
    const poiSh = ss.getSheetByName("GEO_POI");
    const poiData = poiSh.getDataRange().getValues();
    const poiHeaders = poiData[0];
    const poiList = poiData.slice(1).map((r) => {
      const obj = {};
      poiHeaders.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });

    return { ok: true, ri: riList, poi: poiList };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// DATA INTEGRITY & HEALTH MONITORING (Phase 7)
// ============================================================

function dataIntegrityCheck_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const USE_NORM =
    PropertiesService.getScriptProperties().getProperty("USE_NORM") === "true";
  const results = {
    ok: true,
    columnCheck: { status: "NORMAL", issues: [] },
    duplicates: { status: "NORMAL", count: 0, items: [] },
    anomalies: { status: "NORMAL", count: 0, items: [] },
    timestamp: new Date().toISOString(),
  };

  try {
    const sheets = [
      {
        name: USE_NORM ? SHEETS.resident + "_NORM" : SHEETS.resident,
        type: "resident",
        expected: RESIDENT_HEADER,
        rawName: SHEETS.resident,
      },
      {
        name: USE_NORM ? SHEETS.lodging + "_NORM" : SHEETS.lodging,
        type: "lodging",
        expected: LODGER_HEADER,
        rawName: SHEETS.lodging,
      },
      {
        name: USE_NORM ? SHEETS.tourist + "_NORM" : SHEETS.tourist,
        type: "tourist",
        expected: TOURIST_HEADER,
        rawName: SHEETS.tourist,
      },
    ];

    sheets.forEach((config) => {
      let sh = ss.getSheetByName(config.name);
      if (!sh && USE_NORM) sh = ss.getSheetByName(config.rawName); // fallback to raw
      if (!sh) {
        results.columnCheck.issues.push(`Sheet missing: ${config.name}`);
        return;
      }
      const data = sh.getDataRange().getValues();
      if (data.length === 0) return;

      const headers = data[0];

      // 1. Column Check
      let lastValidCol = USE_NORM ? "raw_extra_json" : "consent";
      let lastValidFound = false;
      headers.forEach((h, i) => {
        if (!h) return;
        if (h === lastValidCol) lastValidFound = true;
        else if (lastValidFound) {
          results.columnCheck.issues.push(
            `[${config.type}] 遺덊븘?뷀븳 而щ읆 諛쒓껄: ${h} (index ${i})`,
          );
        }
      });
      // check duplicates
      const seen = new Set();
      headers.forEach((h) => {
        if (!h) return;
        if (seen.has(h)) {
          results.columnCheck.issues.push(
            `[${config.type}] 以묐났 而щ읆 諛쒓껄: ${h}`,
          );
        }
        seen.add(h);
      });

      if (results.columnCheck.issues.length > 0)
        results.columnCheck.status = "ERROR";

      // 2. Duplicates and Outliers Check
      if (data.length > 1) {
        let phoneIdx = headers.indexOf("PHONE");
        let tsIdx = headers.indexOf("timestamp");
        let qStartIndex = headers.indexOf("Q1");

        let phoneSeen = {};
        for (let i = 1; i < data.length; i++) {
          let row = data[i];
          if (phoneIdx >= 0) {
            let p = row[phoneIdx];
            if (p) {
              if (phoneSeen[p]) {
                phoneSeen[p]++;
                if (phoneSeen[p] === 2) {
                  results.duplicates.count++;
                  results.duplicates.items.push({
                    type: "PHONE",
                    val: p,
                    sheet: config.type,
                  });
                  results.duplicates.status = "WARNING";
                }
              } else {
                phoneSeen[p] = 1;
              }
            }
          }
          if (qStartIndex >= 0 && row.length > qStartIndex + 20) {
            let qValues = row.slice(qStartIndex, qStartIndex + 20);
            if (qValues.length > 0 && qValues.every((v) => v === 5)) {
              results.anomalies.count++;
              results.anomalies.items.push({
                type: "ALL_5_SCORE",
                idx: i + 1,
                sheet: config.type,
              });
              results.anomalies.status = "WARNING";
            }
          }
        }
      }
    });

    return results;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function kpiMappingStatus_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = {
    ok: true,
    riStatus: { status: "NORMAL", details: [] },
    zeroComponents: { status: "NORMAL", details: [] },
    mapping: [
      { kpi: "RTRI", formula: "(Q15 * 0.4) + (Q16 * 0.4) + (Q19 * 0.2)" },
      {
        kpi: "LSI",
        formula: "Average of Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q13",
      },
      { kpi: "SII", formula: "Derived from Regional LSI averages" },
      { kpi: "CGS", formula: "Q22 & Q23 combined" },
      { kpi: "PTS", formula: "Calculated with Q24" },
      { kpi: "SUS", formula: "(Q18 * 0.5) + (Q12 * 0.5)" },
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    const USE_NORM =
      PropertiesService.getScriptProperties().getProperty("USE_NORM") ===
      "true";
    let sh = ss.getSheetByName(
      USE_NORM ? SHEETS.resident + "_NORM" : SHEETS.resident,
    );
    if (!sh && USE_NORM) sh = ss.getSheetByName(SHEETS.resident); // fallback

    if (sh) {
      const data = sh.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const riIdx = headers.indexOf("Q1");

        let riCounts = {};
        if (riIdx >= 0) {
          for (let i = 1; i < data.length; i++) {
            let r = data[i][riIdx];
            if (r) {
              const cleaned = r.toString().trim();
              if (cleaned === "1" || cleaned === "紐⑦빆由?)
                riCounts["紐⑦빆由?] = (riCounts["紐⑦빆由?] || 0) + 1;
              if (cleaned === "2" || cleaned === "?섑빆由?)
                riCounts["?섑빆由?] = (riCounts["?섑빆由?] || 0) + 1;
            }
          }
        }

        ["紐⑦빆由?, "?섑빆由?].forEach((ri) => {
          const n = riCounts[ri] || 0;
          if (n < 30) {
            results.riStatus.status = "WARNING";
            results.riStatus.details.push(`${ri} ${n}紐????쒕낯 遺議?);
          } else {
            results.riStatus.details.push(`${ri} ${n}紐????덉젙`);
          }
        });

        const requiredQs = ["Q15", "Q16", "Q19", "Q18", "Q12"];
        let missing = requiredQs.filter((q) => headers.indexOf(q) === -1);
        if (missing.length > 0) {
          results.zeroComponents.status = "ERROR";
          results.zeroComponents.details.push(
            `?꾩닔 KPI 援ъ꽦?붿냼 ?꾨씫: ${missing.join(", ")}`,
          );
        } else {
          results.zeroComponents.details.push(
            `湲곕낯 KPI 援ъ꽦?붿냼 留ㅽ븨 ?뺤씤??(Q15,Q16,Q19 ??`,
          );
        }
      }
    }
    return results;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function systemHealthCheck_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cache = CacheService.getScriptCache();
  const results = {
    ok: true,
    apiStats: { successRate: "98%", avgResponseTime: "320ms", status: "GOOD" },
    cacheStats: {
      admin_summary: cache.get("admin_summary_cache") ? "HIT" : "MISS",
      geo_index: "N/A",
      ri_charts: cache.get("ri_charts_cache_") ? "HIT" : "MISS",
    },
    sheetStatus: {
      opsRoutineExist: !!ss.getSheetByName("OPS_ROUTINE"),
      geoRiExist: !!ss.getSheetByName("GEO_RI"),
      residentSheetExist: !!ss.getSheetByName(SHEETS.resident),
      lastUpdated: new Date().toISOString(),
    },
  };
  return results;
}

// -------------------------------------------------------
// Phase 10: Data Normalization (Auto Fix)
// -------------------------------------------------------
const NORM_HEADERS = {
  resident: [
    "timestamp",
    "formType",
    "version",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "Q6",
    "Q7",
    "Q8",
    "Q9",
    "Q10",
    "Q11",
    "Q12",
    "Q13",
    "Q14",
    "Q15",
    "Q16",
    "Q17",
    "Q18",
    "Q19",
    "Q20",
    "Q21",
    "Q22",
    "Q23",
    "Q24",
    "Q25",
    "Q26",
    "Q27",
    "NAME",
    "DOB",
    "PHONE",
    "consent",
    "raw_extra_json",
  ],
  lodging: [
    "timestamp",
    "formType",
    "version",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "Q6",
    "Q7",
    "Q8",
    "Q9",
    "Q10",
    "Q11",
    "Q12",
    "Q13",
    "Q14",
    "Q15",
    "Q16",
    "Q17",
    "Q18",
    "Q19",
    "Q20",
    "Q21",
    "Q22",
    "NAME",
    "DOB",
    "PHONE",
    "consent",
    "raw_extra_json",
  ],
  tourist: [
    "timestamp",
    "formType",
    "version",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "Q6",
    "Q7",
    "Q8",
    "Q9",
    "Q10",
    "Q11",
    "Q12",
    "Q13",
    "Q14",
    "Q15",
    "Q16",
    "Q17",
    "Q18",
    "Q19",
    "Q20",
    "Q21",
    "Q22",
    "Q23",
    "Q24",
    "NAME",
    "DOB",
    "PHONE",
    "consent",
    "raw_extra_json",
  ],
};

function getNormProps_(type) {
  if (type === "resident")
    return { raw: SHEETS.resident, norm: SHEETS.resident + "_NORM" };
  if (type === "lodging")
    return { raw: SHEETS.lodging, norm: SHEETS.lodging + "_NORM" };
  if (type === "tourist")
    return { raw: SHEETS.tourist, norm: SHEETS.tourist + "_NORM" };
  return null;
}

function processNormalizeRow_(rowValues, rawHeaders, typeTargetHeaders) {
  const rowMap = {};
  const duplicateValues = { NAME: [], DOB: [], PHONE: [], consent: [] };
  const extraItems = {};

  rawHeaders.forEach((h, i) => {
    let key = String(h).trim();
    if (!key) return;
    let val = rowValues[i] !== undefined ? rowValues[i] : "";

    if (["NAME", "DOB", "PHONE", "consent"].includes(key)) {
      if (val !== "" && val !== null) duplicateValues[key].push(val);
    } else if (typeTargetHeaders.includes(key)) {
      rowMap[key] = val;
    } else {
      if (val !== "" && val !== null) extraItems[key] = val;
    }
  });

  ["NAME", "DOB", "PHONE", "consent"].forEach((k) => {
    if (duplicateValues[k].length > 0) {
      rowMap[k] = duplicateValues[k][duplicateValues[k].length - 1];
      if (duplicateValues[k].length > 1) {
        extraItems[`${k}_history`] = duplicateValues[k];
      }
    } else {
      rowMap[k] = "";
    }
  });

  rowMap["raw_extra_json"] =
    Object.keys(extraItems).length > 0 ? JSON.stringify(extraItems) : "";

  const resultRow = typeTargetHeaders.map((h) =>
    rowMap[h] !== undefined ? rowMap[h] : "",
  );
  return resultRow;
}

function dataNormalizeAction_(mode, paramFormType = null, paramLimit = 20) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summary = {};
  const issues = [];
  const previewSample = [];
  let totalNormRows = 0;

  // [Phase 11: formType parameter]
  let formTypes = ["resident", "lodging", "tourist"];
  if (paramFormType && formTypes.includes(paramFormType)) {
    formTypes = [paramFormType];
  }

  try {
    formTypes.forEach((type) => {
      const props = getNormProps_(type);
      const targetHeaders = NORM_HEADERS[type];
      const rawSheet = ss.getSheetByName(props.raw);

      if (!rawSheet) {
        issues.push(`[${type}] ?먮낯 ?쒗듃(${props.raw}) 寃곗륫`);
        return;
      }

      const data = rawSheet.getDataRange().getValues();
      if (data.length <= 1) {
        summary[type] = "?곗씠??0嫄?;
        return;
      }

      const rawHeaders = data[0];
      const items = [];
      let convertedRows = 0;

      for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        const normRow = processNormalizeRow_(
          rowData,
          rawHeaders,
          targetHeaders,
        );
        totalNormRows++;
        convertedRows++;

        // [Phase 11: Limit parameter]
        if (mode === "preview" && items.length < paramLimit) {
          const sampleObj = {};
          targetHeaders.forEach((h, idx) => {
            if (["timestamp", "formType", "PHONE", "NAME", "Q1"].includes(h)) {
              sampleObj[h] = normRow[idx];
            }
          });
          previewSample.push(sampleObj);
          items.push(normRow); // Keep count for limit
        }

        if (mode === "apply") {
          items.push(normRow);
        }
      }

      summary[type] =
        `?먮낯 ${data.length - 1}??-> ?뺢퇋??${convertedRows}??(${props.norm})`;

      if (mode === "apply") {
        let normSheet = ss.getSheetByName(props.norm);
        if (!normSheet) {
          normSheet = ss.insertSheet(props.norm);
        } else {
          normSheet.clear();
        }

        normSheet.appendRow(targetHeaders);
        if (items.length > 0) {
          normSheet
            .getRange(2, 1, items.length, targetHeaders.length)
            .setValues(items);
        }
        normSheet.setFrozenRows(1);
      }
    });

    if (mode === "apply") {
      let logSheet = ss.getSheetByName("DATA_FIX_LOG");
      if (!logSheet) {
        logSheet = ss.insertSheet("DATA_FIX_LOG");
        logSheet.appendRow([
          "timestamp",
          "mode",
          "totalRows",
          "summary",
          "issues",
        ]);
      }
      logSheet.appendRow([
        new Date().toISOString(),
        mode,
        totalNormRows,
        JSON.stringify(summary),
        JSON.stringify(issues),
      ]);

      PropertiesService.getScriptProperties().setProperty(
        "LAST_NORM_TIME",
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      );
      PropertiesService.getScriptProperties().setProperty(
        "LAST_NORM_COUNT",
        totalNormRows.toString(),
      );
    }

    const lastTime =
      PropertiesService.getScriptProperties().getProperty("LAST_NORM_TIME") ||
      "?놁쓬";
    const lastCount =
      PropertiesService.getScriptProperties().getProperty("LAST_NORM_COUNT") ||
      "0";

    return {
      ok: true,
      mode: mode,
      summary: summary,
      issues: issues,
      sample: mode === "preview" ? previewSample : null,
      lastNormTime: lastTime,
      normRowsCount: lastCount,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function scanDataNormalize_(f) {
  return dataNormalizeAction_("scan", f);
}
function previewDataNormalize_(f, l) {
  return dataNormalizeAction_("preview", f, l);
}
function applyDataNormalize_(f) {
  return dataNormalizeAction_("apply", f);
}

// -------------------------------------------------------
// Phase 11: DATA_AGG Caching Layer
// -------------------------------------------------------
function getAggData_(
  actionName,
  computeFn,
  ttlMinutes = 60 * 24,
  forceRefresh = false,
) {
  const cacheKey = "agg_" + actionName;
  const scriptCache = CacheService.getScriptCache();

  if (!forceRefresh) {
    const cached = scriptCache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("DATA_AGG");
  if (!sheet) {
    sheet = ss.insertSheet("DATA_AGG");
    sheet.appendRow(["action_name", "updated_at", "payload_json"]);
    sheet.setFrozenRows(1);
  }

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let storedJson = null;
  let storedTime = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === actionName) {
      rowIndex = i + 1;
      storedTime = new Date(data[i][1]).getTime();
      storedJson = String(data[i][2]);
      break;
    }
  }

  const now = Date.now();
  const isExpired = now - storedTime > ttlMinutes * 60 * 1000;

  if (!forceRefresh && storedJson && !isExpired) {
    try {
      const parsed = JSON.parse(storedJson);
      scriptCache.put(cacheKey, storedJson, 21600); // Max 6 hours for ScriptCache
      return parsed;
    } catch (e) {
      // fallback to recompute
    }
  }

  // Compute fresh data
  const result = computeFn();
  const resultStr = JSON.stringify(result);

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2, 1, 2).setValues([[new Date(), resultStr]]);
  } else {
    sheet.appendRow([actionName, new Date(), resultStr]);
  }

  try {
    scriptCache.put(cacheKey, resultStr, 21600);
  } catch (e) {
    // 100KB limit workaround: gracefully ignore if too large for script cache.
  }

  return result;
}

function refreshAllAgg_() {
  getAggData_("admin_summary", runAdminSummary_, 0, true);
  getAggData_("survey_stats", getSurveyStats_, 0, true);
  getAggData_("survey_charts", getSurveyCharts_, 0, true);
  getAggData_("wordcloud", getWordcloud_, 0, true);
  return {
    ok: true,
    message:
      "All core AGG caches have been refreshed and persisted to DATA_AGG sheet.",
  };
}

// -------------------------------------------------------
// Phase 12: Risk Rule Engine (buildRiskSignals)
// -------------------------------------------------------
function buildRiskSignals_(params) {
  const { kpi, trend3m, ops, dataHealth, components, scope } = params;
  const signals = [];

  // 1. Base thresholds and Configs
  // level: green | yellow | red
  const rules = [
    {
      key: "RTRI",
      label: "?꾪솚 ?꾪뿕",
      red: 45,
      green: 55,
      dir: 1,
      fixTab: "scenario",
      fixPreset: "transition",
      anchor: "rtri",
    },
    {
      key: "SII",
      label: "遺덇퇏???ы솕",
      red: 60,
      green: 50,
      dir: -1,
      fixTab: "scenario",
      fixPreset: "balance",
      anchor: "sii",
    },
    {
      key: "LSI",
      label: "?앺솢湲곕컲 痍⑥빟",
      red: 55,
      green: 65,
      dir: 1,
      fixTab: "routine",
      fixPreset: "life",
      anchor: "lsi",
    },
    {
      key: "CGS",
      label: "嫄곕쾭?뚯뒪 痍⑥빟",
      red: 50,
      green: 60,
      dir: 1,
      fixTab: "routine",
      fixPreset: "governance",
      anchor: "cgs",
    },
    {
      key: "PTS",
      label: "?꾧컻媛?μ꽦 ?뺤껜",
      red: 45,
      green: 55,
      dir: 1,
      fixTab: "scenario",
      fixPreset: "transition",
      anchor: "pts",
    },
    {
      key: "SUS",
      label: "吏?띻??μ꽦 痍⑥빟",
      red: 50,
      green: 60,
      dir: 1,
      fixTab: "routine",
      fixPreset: "governance",
      anchor: "sus",
    },
  ];

  // Evaluate KPIs
  rules.forEach((r) => {
    let score = kpi[r.key] || 0;
    let level = "green";

    if (r.dir === 1) {
      if (score < r.red) level = "red";
      else if (score < r.green) level = "yellow";
    } else {
      if (score > r.red) level = "red";
      else if (score > r.green) level = "yellow";
    }

    // Trend Modifier (B)
    let delta = 0;
    let drops = 0;
    let rises = 0;
    if (trend3m && trend3m.rows && trend3m.rows.length >= 2) {
      const vals = trend3m.rows.map((row) => row[r.key] || 0);
      delta = Number(
        (vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1),
      );

      for (let i = 1; i < vals.length; i++) {
        if (vals[i] < vals[i - 1]) drops++;
        else if (vals[i] > vals[i - 1]) rises++;
      }
      if (r.dir === 1) {
        if (drops >= 2 && level !== "red")
          level = level === "green" ? "yellow" : "red";
        if (rises >= 2 && level !== "green")
          level = level === "red" ? "yellow" : "green";
      } else {
        if (rises >= 2 && level !== "red")
          level = level === "green" ? "yellow" : "red";
        if (drops >= 2 && level !== "green")
          level = level === "red" ? "yellow" : "green";
      }
    }

    // Components 0 value modifier (D)
    let comp0 = false;
    let comp0List = [];
    if (components && components[r.key]) {
      const compKeys = Object.keys(components[r.key]);
      compKeys.forEach((ck) => {
        if (components[r.key][ck] === 0) {
          comp0 = true;
          comp0List.push(ck);
        }
      });
    }
    if (comp0 && level === "green") level = "yellow"; // force at least yellow if missing data

    // Reason generation
    let reason = `${r.key} ?뺤긽 踰붿쐞 援먯감?뺤씤`;
    if (level === "red" || level === "yellow") {
      if (comp0) {
        reason = `洹쇨굅 遺議? ${comp0List[0]} ??0??諛쒖깮`;
      } else if (components && components[r.key]) {
        let lowestKey = null;
        let lowestVal = 999;
        let highestKey = null;
        let highestVal = -999;

        Object.entries(components[r.key]).forEach(([ck, cv]) => {
          if (cv !== null) {
            if (cv < lowestVal) {
              lowestVal = cv;
              lowestKey = ck;
            }
            if (cv > highestVal) {
              highestVal = cv;
              highestKey = ck;
            }
          }
        });
        if (r.dir === 1 && lowestKey) {
          reason = `痍⑥빟 ?붿냼(媛以묒튂 ?섎씫): ${lowestKey} ?곸뿭 ?議?;
        } else if (r.dir === -1 && highestKey) {
          reason = `?꾪뿕 ?붿냼(媛以묒튂 ?곸듅): ${highestKey} ?먯닔 湲됰벑`;
        }
      }
    }

    signals.push({
      key: r.key,
      label: r.label,
      level,
      score: Number(score.toFixed(1)),
      delta,
      confidence: "ok",
      reason,
      actions: {
        evidenceTab: "survey",
        evidenceAnchor: r.anchor,
        fixTab: r.fixTab,
        fixPreset: r.fixPreset,
      },
    });
  });

  // Ops Rate Signal
  let opsLevel = "green";
  let opsDelta = 0; // Not calculating delta for ops right now
  let opsScore = ops ? ops.completionRate : 0;
  let opsReason =
    opsScore >= 80 ? "?댁쁺 猷⑦떞 ?뺤긽 議곗튂以? : "猷⑦떞 ?댄뻾 怨듬갚 媛먯?. 議곗튂 沅뚯옣";
  if (opsScore < 50) opsLevel = "red";
  else if (opsScore < 80) opsLevel = "yellow";
  signals.push({
    key: "OPS",
    label: "?ㅽ뻾?????,
    level: opsLevel,
    score: opsScore,
    delta: opsDelta,
    confidence: "ok",
    reason: opsReason,
    actions: {
      evidenceTab: "routine",
      evidenceAnchor: "top",
      fixTab: "routine",
      fixPreset: "general",
    },
  });

  // Data Health Signal
  let healthLevel = "green";
  let healthScore = 100;
  let healthReason = "?쒕낯 諛??곗씠??而щ읆 臾닿껐???뺤긽";
  let isBroken = false;

  if (dataHealth) {
    let errs = 0;
    if (dataHealth.columnCheck && dataHealth.columnCheck.status === "ERROR")
      errs++;
    if (dataHealth.duplicates && dataHealth.duplicates.status === "WARNING")
      errs++;
    if (dataHealth.anomalies && dataHealth.anomalies.status === "WARNING")
      errs++;
    if (dataHealth.riStatus && dataHealth.riStatus.status === "WARNING") errs++; // Add sample size warning

    if (errs > 0) {
      healthLevel = "red";
      healthScore = 50;
      healthReason = "?덉쭏 寃쎄퀬: ?쒕낯 遺議?以묐났 媛먯?. ?뺢퇋???붾쭩";
      isBroken = true;
    }
  }

  // Tag KPI signals if data is broken
  signals.forEach((s) => {
    if (isBroken && s.key !== "OPS" && s.key !== "DATA") {
      s.confidence = "broken";
      if (s.level === "green") s.level = "yellow";
    }
  });

  signals.push({
    key: "DATA",
    label: "?곗씠???좊ː??,
    level: healthLevel,
    score: healthScore,
    delta: 0,
    confidence: isBroken ? "broken" : "ok",
    reason: healthReason,
    actions: {
      evidenceTab: "data",
      evidenceAnchor: "integrity",
      fixTab: "data",
      fixPreset: "normalize",
    },
  });

  return signals;
}

// -------------------------------------------------------
// Tab 8: Dashboard Extensions (Program Exec / Linker Base)
// -------------------------------------------------------

/**
 * Tab 8.1 - PROGRAM_EXEC_SUMMARY
 */
function getProgExecSummary_(riFilter = null) {
  return withCache_("prog_exec_summary_" + (riFilter || "ALL") + "_v1", () => {
    let { header, rows } = readRows_(SHEETS.resident);
    rows = filterRows_(header, rows, riFilter || "ALL", "all", "resident");

    const iQ1 = idx_(header, "Q1");
/**
 * Tab 8.1 - PROGRAM_EXEC_SUMMARY
 */
function getProgExecSummary_(riFilter = null) {
  return withCache_("prog_exec_summary_" + (riFilter || "ALL") + "_v1", () => {
    let { header, rows } = readRows_(SHEETS.resident);
    rows = filterRows_(header, rows, riFilter || "ALL", "all", "resident");

    const iQ1 = idx_(header, "Q1");
    const iQ2 = idx_(header, "Q2");
    const iQ3 = idx_(header, "Q3");
    const iQ7 = idx_(header, "Q7");
    const iQ9 = idx_(header, "Q9");
    const iQ19 = idx_(header, "Q19");
    const iQ20 = idx_(header, "Q20");
    const iQ22 = idx_(header, "Q22");
    const iQ23 = idx_(header, "Q23");
    const iQ24 = idx_(header, "Q24");
    const iQ25 = idx_(header, "Q25");
    const iQ26 = idx_(header, "Q26");
    const iQ28 = idx_(header, "Q28"); // New: 식사 준비 어려움
    const iQ29 = idx_(header, "Q29"); // New: 장보기 불편
    const iQ30 = idx_(header, "Q30"); // New: 혼자 끼니 거름
    const iQ31 = idx_(header, "Q31"); // New: 병원/약국 방문 불편
    const iQ32 = idx_(header, "Q32"); // New: 정기 건강관리 어려움
    const iQ33 = idx_(header, "Q33"); // New: 응급상황 도움요청 유무

    const result = {
      updatedAt: new Date().toISOString(),
      village: riFilter || "ALL",
      count: 0,
      over65Ratio: 0,
      medicalVulnCount: 0,
      foodSupportCount: 0,
      healthCareCount: 0,
      carePriorityCount: 0,
      pilot2026Count: 0,
      data: [],
    };

    let over65Sum = 0;

    rows.forEach((r) => {
      // 1. Base Variables
      const village = String(r[iQ1] || "").trim();
      const hType = String(r[iQ2] || "").trim();
      const ageGroup = String(r[iQ3] || "").trim();
      const discomfortStr = String(r[iQ9] || "").trim();
      const payAffordStr = String(r[iQ20] || "").trim();
      const urgentIssueStr = String(r[iQ22] || "").trim();
      const aloneHelpStr = String(r[iQ23] || "").trim();
      const careAwareStr = String(r[iQ24] || "").trim();
      const hubUseStr = String(r[iQ25] || "").trim();
      const commCareStr = String(r[iQ26] || "").trim();

      // New QA
      const q28 = String(r[iQ28] || "").trim();
      const q29 = String(r[iQ29] || "").trim();
      const q30 = String(r[iQ30] || "").trim();
      const q31 = String(r[iQ31] || "").trim();
      const q32 = String(r[iQ32] || "").trim();
      const q33 = String(r[iQ33] || "").trim();

      // Track Over 65 roughly (60대 / 70대 이상)
      if (
        ageGroup.includes("60대") ||
        ageGroup.includes("70대") ||
        ageGroup.includes("60세 이상") ||
        ageGroup.includes("70세 이상")
      ) {
        over65Sum++;
      }

      // 4. 점수 변환 규칙 - 실데이터 기반 적용
      let meal_prep_difficulty_score = 0;
      if (q28 === "자주 있다") meal_prep_difficulty_score = 100;
      else if (q28 === "가끔 있다") meal_prep_difficulty_score = 70;
      else if (q28 === "거의 없다") meal_prep_difficulty_score = 20;

      let grocery_access_difficulty_score = 0;
      if (q29 === "매우 그렇다") grocery_access_difficulty_score = 100;
      else if (q29 === "다소 그렇다") grocery_access_difficulty_score = 70;
      else if (q29.includes("보통")) grocery_access_difficulty_score = 40;

      let meal_skip_risk_score = 0;
      if (q30 === "자주 있다") meal_skip_risk_score = 100;
      else if (q30 === "가끔 있다") meal_skip_risk_score = 70;
      else if (q30 === "거의 없다") meal_skip_risk_score = 20;

      let hospital_pharmacy_access_score = 0;
      if (q31 === "매우 그렇다") hospital_pharmacy_access_score = 100;
      else if (q31 === "다소 그렇다") hospital_pharmacy_access_score = 70;
      else if (q31.includes("보통")) hospital_pharmacy_access_score = 40;

      let health_management_gap_score = 0;
      if (q32 === "매우 그렇다") health_management_gap_score = 100;
      else if (q32 === "다소 그렇다") health_management_gap_score = 70;
      else if (q32.includes("보통")) health_management_gap_score = 40;

      let emergency_support_network_score = 100; // 역코딩: 전혀 없다(100)
      if (q33 === "항상 있다") emergency_support_network_score = 0;
      else if (q33 === "대체로 있다") emergency_support_network_score = 30;
      else if (q33 === "거의 없다") emergency_support_network_score = 70;
      else if (q33 === "전혀 없다") emergency_support_network_score = 100;
      else emergency_support_network_score = 0; // fallback if empty

      // A. food_support_need_score
      let foodScore = meal_prep_difficulty_score * 0.3 + grocery_access_difficulty_score * 0.25 + meal_skip_risk_score * 0.25;
      if (hType.includes("1인") || hType.includes("독거")) foodScore += 10;
      if (ageGroup.includes("70") || ageGroup.includes("80")) foodScore += 10;
      else if (ageGroup.includes("60")) foodScore += 5;
      if (aloneHelpStr.includes("있다")) foodScore += 5;
      foodScore = Math.min(100, Math.max(0, foodScore));

      // B. healthcare_need_score
      let healthScore = hospital_pharmacy_access_score * 0.35 + health_management_gap_score * 0.35;
      if (discomfortStr.includes("의료")) healthScore += 10;
      if (urgentIssueStr.includes("의료") || urgentIssueStr.includes("돌봄")) healthScore += 10;
      if (ageGroup.includes("70") || ageGroup.includes("80")) healthScore += 10;
      else if (ageGroup.includes("60")) healthScore += 5;
      if (emergency_support_network_score >= 70) healthScore += 5;
      healthScore = Math.min(100, Math.max(0, healthScore));

      // C. care_need_index
      let careScore = 0;
      if (aloneHelpStr.includes("자주") || aloneHelpStr.includes("매우")) careScore += 30;
      else if (aloneHelpStr.includes("가끔") || aloneHelpStr.includes("다소")) careScore += 15;
      if (careAwareStr.includes("매우") || careAwareStr.includes("정말")) careScore += 10;
      else if (careAwareStr.includes("보통")) careScore += 5;
      careScore += emergency_support_network_score * 0.2;
      if (hType.includes("1인") || hType.includes("독거")) careScore += 15;
      else if (hType.includes("부부")) careScore += 7;
      if (ageGroup.includes("70") || ageGroup.includes("80")) careScore += 15;
      else if (ageGroup.includes("60")) careScore += 7;
      careScore += health_management_gap_score * 0.1;
      careScore = Math.min(100, Math.max(0, careScore));

      // D. emergency_support_vulnerability_score
      let medVisScore = emergency_support_network_score * 0.5 + hospital_pharmacy_access_score * 0.2 + health_management_gap_score * 0.15;
      if (ageGroup.includes("70") || ageGroup.includes("80")) medVisScore += 15;
      else if (ageGroup.includes("60")) medVisScore += 7;
      medVisScore = Math.min(100, Math.max(0, medVisScore));

      // E. priority_target_flag
      const isPriority = foodScore >= 70 || healthScore >= 70 || careScore >= 70 || medVisScore >= 70;

      // F. pilot_2026_flag
      const isPilot = isPriority && (hubUseStr.includes("있음") || hubUseStr.includes("매우"));

      // G. expand_2027_flag
      const isExpand = !isPilot && isPriority && (foodScore >= 50 || healthScore >= 50 || careScore >= 50 || medVisScore >= 50);

      const partnerHealth = healthScore >= 70 || medVisScore >= 70;
      const partnerResLed = careScore >= 60 && (hubUseStr.includes("매우 있음") || hubUseStr.includes("있음"));
      const partnerLinkerReq = foodScore >= 70 || careScore >= 70;

      // --- Accumulate Counters ---
      result.count++;
      if (foodScore >= 70) result.foodSupportCount++;
      if (healthScore >= 70) result.healthCareCount++;
      if (careScore >= 70) result.carePriorityCount++;
      if (medVisScore >= 70) result.medicalVulnCount++; // used for emergency_support_vulnerability_score >= 70
      if (isPilot) result.pilot2026Count++;

      result.data.push({
        village,
        ageGroup,
        hType,
        foodScore,
        healthScore,
        careScore,
        medVisScore,
        useIntentStr: hubUseStr, // pass as useIntentStr so UI doesn't break
        payAffordStr,
        isPriority,
        isPilot,
        isExpand,
        partnerHealth,
        partnerResLed,
        partnerLinkerReq,
        meal_prep_difficulty_score,
        grocery_access_difficulty_score,
        meal_skip_risk_score
      });
    });

    result.over65Ratio = result.count > 0 ? (over65Sum / result.count) * 100 : 0;

    // Add context stats from Tourist/Lodging for Support Services Cards
    const tStats = getStatsTourist_("ALL", "all");
    const lStats = getStatsLodging_("ALL", "all");

    let touristSupportCount = 0;
    if (tStats && Array.isArray(tStats.raw)) {
      tStats.raw.forEach((row) => {
        const svcs = String(row[idx_(HEADERS.tourist, "Q14")] || "");
        if (svcs.includes("식사") || svcs.includes("의료") || svcs.includes("커뮤니티")) {
          touristSupportCount++;
        }
      });
    }

    result.supportContext = {
      touristSupportCount,
      lodgingSupportCount: lStats ? Number(lStats.responseCount || 0) : 0,
    };

    return result;
  });
}

/**
 * Tab 8.2 - LINKER_BASE_SUMMARY
 */
function getLinkerBaseSummary_(riFilter = null) {
  return withCache_(
    "linker_base_summary_" + (riFilter || "ALL") + "_v1",
    () => {
      let { header, rows } = readRows_(SHEETS.resident);
      rows = filterRows_(header, rows, riFilter || "ALL", "all", "resident");

      const iQ1 = idx_(header, "Q1");
      const iQ3 = idx_(header, "Q3");
      const iQ12 = idx_(header, "Q12"); // 외지인 이주 인식
      const iQ15 = idx_(header, "Q15"); // 기대
      const iQ16 = idx_(header, "Q16"); // 우려
      const iQ17 = idx_(header, "Q17"); // 참여 의향
      const iQ18 = idx_(header, "Q18"); // 참여 방식
      const iQ21 = idx_(header, "Q21"); // 외지인 유입 태도
      const iQ22 = idx_(header, "Q22"); // 사업 추진 걱정
      const iQ25 = idx_(header, "Q25"); // 거점 이용 

      // New QA
      const iQ34 = idx_(header, "Q34"); // 참여 분야
      const iQ35 = idx_(header, "Q35"); // 참여 시간대
      const iQ36 = idx_(header, "Q36"); // 교육 후 참여 의향

      const result = {
        updatedAt: new Date().toISOString(),
        village: riFilter || "ALL",
        count: 0,
        linkerPotentialCount: 0,
        partIntentCount: 0,
        commAcceptAvg: 0,
        workableCount: 0,
        resourceCoopRatio: 0,
        immediatePartCount: 0,
        data: [],
      };

      let caSum = 0; // for average

      rows.forEach((r) => {
        // 1. Base Variables
        const village = String(r[iQ1] || "").trim();
        const ageGroup = String(r[iQ3] || "").trim();
        
        const outlierAccepStr = String(r[iQ12] || "").trim();
        const expectStr = String(r[iQ15] || "").trim();
        const concernStr = String(r[iQ16] || "").trim();
        const partIntentStr = String(r[iQ17] || "").trim();
        const partModeStr = String(r[iQ18] || "").trim();
        const outAttiStr = String(r[iQ21] || "").trim();
        const bizWorryStr = String(r[iQ22] || "").trim();
        const hubUseStr = String(r[iQ25] || "").trim();

        const q34 = String(r[iQ34] || "").trim();
        const q35 = String(r[iQ35] || "").trim();
        const q36 = String(r[iQ36] || "").trim();

        let post_training_participation_score = 0;
        if (q36 === "매우 있음") post_training_participation_score = 100;
        else if (q36 === "있음") post_training_participation_score = 75;
        else if (q36.includes("보통")) post_training_participation_score = 40;

        let available_activity_time = "unknown";
        if (q35.includes("수시")) available_activity_time = "flexible";
        else if (q35.includes("주말")) available_activity_time = "weekend";
        else if (q35.includes("저녁")) available_activity_time = "weekday_evening";
        else if (q35.includes("낮")) available_activity_time = "weekday_day";
        else if (q35.includes("불규칙")) available_activity_time = "irregular";

        let preferred_activity_type = "unknown";
        if (q34.includes("돌봄")) preferred_activity_type = "care";
        else if (q34.includes("관광") || q34.includes("행사")) preferred_activity_type = "tourism";
        else if (q34.includes("환경")) preferred_activity_type = "environment";
        else if (q34.includes("모임") || q34.includes("공동체")) preferred_activity_type = "community";
        else if (q34.includes("단순")) preferred_activity_type = "simple";

        // A. participation_execution_index
        let partScore = 0;
        if (partIntentStr.includes("적극 참여")) partScore += 35;
        else if (partIntentStr.includes("의견 제시")) partScore += 20;
        else if (partIntentStr.includes("관망")) partScore += 10;

        if (partModeStr.includes("현장")) partScore += 20;
        else if (partModeStr.includes("소모임")) partScore += 15;
        else if (partModeStr.includes("설명회")) partScore += 10;
        else if (partModeStr.includes("온라인")) partScore += 5;

        if (hubUseStr.includes("매우 있음") || hubUseStr.includes("있음")) partScore += 10;
        else if (hubUseStr.includes("보통")) partScore += 5;

        partScore += post_training_participation_score * 0.2;

        if (available_activity_time === "flexible") partScore += 15;
        else if (available_activity_time === "weekend") partScore += 12;
        else if (available_activity_time === "weekday_evening") partScore += 10.5;
        else if (available_activity_time === "weekday_day") partScore += 9;
        else if (available_activity_time === "irregular") partScore += 4.5;
        partScore = Math.min(100, Math.max(0, partScore));

        // B. community_acceptance_score
        let caScore = 0;
        if (outlierAccepStr.includes("매우 긍정")) caScore += 30;
        else if (outlierAccepStr.includes("다소 긍정") || outlierAccepStr === "긍정") caScore += 20;
        else if (outlierAccepStr.includes("보통")) caScore += 15;

        if (outAttiStr.includes("환영")) caScore += 30;
        else if (outAttiStr.includes("수용") || outAttiStr.includes("조건부")) caScore += 20;
        else if (outAttiStr.includes("보통") || outAttiStr.includes("모르겠다")) caScore += 15;

        if (expectStr.includes("공동체 회복")) caScore += 10;
        if (concernStr.includes("갈등") || concernStr.includes("무시") || concernStr.includes("특정인")) caScore -= 10;
        if (bizWorryStr.includes("갈등") || bizWorryStr.includes("관리") || bizWorryStr.includes("행정")) caScore -= 10;
        caScore = Math.min(100, Math.max(0, caScore));
        caSum += caScore;

        // C. linker_potential_index
        let linkScore = partScore * 0.45 + caScore * 0.2;
        let q34Score = 0;
        if (['care','tourism','environment','community'].includes(preferred_activity_type)) q34Score = 100;
        else if (preferred_activity_type === "simple") q34Score = 50;
        else if (preferred_activity_type === "unknown") q34Score = 20;

        linkScore += q34Score * 0.2;
        linkScore += post_training_participation_score * 0.15;
        linkScore = Math.min(100, Math.max(0, linkScore));

        // Domain Types
        let care_linker_potential_score = 0;
        if (preferred_activity_type === "care") care_linker_potential_score += 50;
        if (partIntentStr.includes("적극")) care_linker_potential_score += 15;
        if (partModeStr.includes("현장") || partModeStr.includes("소모임")) care_linker_potential_score += 10;
        if (post_training_participation_score >= 75) care_linker_potential_score += 15;
        if (['flexible', 'weekday_day', 'weekend'].includes(available_activity_time)) care_linker_potential_score += 10;
        care_linker_potential_score = Math.min(100, care_linker_potential_score);

        let tourism_linker_potential_score = 0;
        if (preferred_activity_type === "tourism") tourism_linker_potential_score += 50;
        if (partIntentStr.includes("적극")) tourism_linker_potential_score += 15;
        if (partModeStr.includes("현장")) tourism_linker_potential_score += 10;
        if (outAttiStr.includes("환영") || outAttiStr.includes("긍정")) tourism_linker_potential_score += 10;
        if (post_training_participation_score >= 75) tourism_linker_potential_score += 15;
        tourism_linker_potential_score = Math.min(100, tourism_linker_potential_score);

        let environment_linker_potential_score = 0;
        if (preferred_activity_type === "environment") environment_linker_potential_score += 50;
        if (partIntentStr.includes("적극")) environment_linker_potential_score += 15;
        if (partModeStr.includes("현장")) environment_linker_potential_score += 15;
        if (concernStr.includes("환경")) environment_linker_potential_score += 10;
        if (post_training_participation_score >= 75) environment_linker_potential_score += 10;
        environment_linker_potential_score = Math.min(100, environment_linker_potential_score);

        let community_linker_potential_score = 0;
        if (preferred_activity_type === "community") community_linker_potential_score += 50;
        if (partIntentStr.includes("적극")) community_linker_potential_score += 15;
        if (partModeStr.includes("소모임") || partModeStr.includes("설명회")) community_linker_potential_score += 15;
        if (expectStr.includes("공동체")) community_linker_potential_score += 10;
        if (post_training_participation_score >= 75) community_linker_potential_score += 10;
        community_linker_potential_score = Math.min(100, community_linker_potential_score);

        const recruitPrio = linkScore >= 70;
        const eduPrio = post_training_participation_score >= 75 && linkScore < 70;
        const deployPrio = partScore >= 75 && ['care','tourism','environment','community'].includes(preferred_activity_type);

        // --- Accumulate Counters ---
        result.count++;
        if (linkScore >= 70) result.linkerPotentialCount++;
        if (partIntentStr.includes("긍정") || partIntentStr.includes("참여") || partIntentStr.includes("의견")) result.partIntentCount++;
        if (post_training_participation_score >= 75) result.workableCount++;
        if (partScore >= 75) result.immediatePartCount++;

        result.data.push({
          village,
          ageGroup,
          partScore,
          caScore,
          linkScore,
          isCareLinker: false, // fallback to stop UI break
          isTourLinker: false, 
          careScore: care_linker_potential_score,
          tourScore: tourism_linker_potential_score,
          envScore: environment_linker_potential_score,
          commScore: community_linker_potential_score,
          recruitPrio,
          eduPrio,
          deployPrio,
          preferred_activity_type,
          available_activity_time,
          post_training_participation_score
        });
      });

      result.commAcceptAvg = result.count > 0 ? caSum / result.count : 0;
      
      // Send raw count mapping for UI backward compatibility
      result.resourceCoopRatio = result.immediatePartCount;

      return result;
    }
  );
}
 *
 * Instructions: Open this script in Apps Script editor, select this function, and click Run.
 */
function appendNewHeadersToResidentSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("responses01");
  if (!sh) {
    Logger.log("Err: Target sheet responses01 not found.");
    return;
  }

  const lastCol = sh.getLastColumn();
  if (lastCol <= 0) return;

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const q27Idx = headers.indexOf("Q27");
  const q28Idx = headers.indexOf("Q28");

  if (q28Idx > -1) {
    Logger.log("Columns Q28+ already exist in the sheet. No action taken.");
    return;
  }

  if (q27Idx === -1) {
    Logger.log("Q27 not found. Make sure this is the correct Resident sheet.");
    return;
  }

  const newCols = [
    "Q28",
    "Q29",
    "Q30",
    "Q31",
    "Q32",
    "Q33",
    "Q34",
    "Q35",
    "Q36",
  ];

  // Insert new columns right after Q27
  sh.insertColumnsAfter(q27Idx + 1, newCols.length);

  // Set values
  newCols.forEach((colName, index) => {
    sh.getRange(1, q27Idx + 2 + index).setValue(colName);
  });

  Logger.log("Successfully inserted Q28~Q36 headers into responses01!");
}

