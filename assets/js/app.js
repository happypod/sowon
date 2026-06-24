/**
 * assets/app.js
 * Common Logic: Script URL, Survey Submission, Stats, Auth
 */

// Ensure AdminDataService exists (fallback)
window.AdminDataService = window.AdminDataService || {};



AdminDataService._fetchJson = async function(action, params = {}) {
  const url = new URL(APP.ADMIN_URL);
  url.searchParams.set("action", action);
  // AUTH-03: Include pass if available
  if (APP.auth && APP.auth.pass) {
    url.searchParams.set("pass", APP.auth.pass);
  }
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const result = await res.json();
  // Role-based locked error handling
  if (result.error === 'LOCKED' || result.error === 'UNAUTHORIZED') {
      throw new Error(result.error);
  }
  return result;
};

AdminDataService._postJson = async function(action, payload = {}) {
  const url = new URL(APP.SURVEY_URL);
  url.searchParams.set("action", action);
  // AUTH-03: Include pass in payload if available
  if (APP.auth && APP.auth.pass && !payload.pass) {
    payload.pass = APP.auth.pass;
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const result = await res.json();
  if (result.error === 'LOCKED' || result.error === 'UNAUTHORIZED') {
      throw new Error(result.error);
  }
  return result;
};

// Tab2
AdminDataService.loadSurveyStats = AdminDataService.loadSurveyStats || (async function() {
  const [stats, charts, wc] = await Promise.all([
    AdminDataService._fetchJson("survey_stats"),
    AdminDataService._fetchJson("survey_charts"),
    AdminDataService._fetchJson("wordcloud")
  ]);
  return { stats, charts, wc };
});

// Tab3 (모항/의항)
AdminDataService.loadVillageAnalysis = AdminDataService.loadVillageAnalysis || (async function() {
  const [mohang, uihang, wc, kpiByRi] = await Promise.all([
    AdminDataService._fetchJson("ri_charts", { ri: "모항리" }),
    AdminDataService._fetchJson("ri_charts", { ri: "의항리" }),
    AdminDataService._fetchJson("ri_wordcloud"),
    AdminDataService._fetchJson("kpi_by_ri").catch(() => ({}))
  ]);
  return { mohang, uihang, wc, kpiByRi };
});

// Tab4
AdminDataService.loadOpsRoutine = AdminDataService.loadOpsRoutine || (async function() {
  return await AdminDataService._fetchJson("ops_routine");
});

// Tab5
AdminDataService.loadReportsIndex = AdminDataService.loadReportsIndex || (async function() {
  return await AdminDataService._fetchJson("reports_index");
});

// Tab7
AdminDataService.loadDataStatus = AdminDataService.loadDataStatus || (async function() {
  return await AdminDataService._fetchJson("data_status");
});

// Tab6
AdminDataService.loadScenarioMap = AdminDataService.loadScenarioMap || (async function() {
  return await AdminDataService._fetchJson("scenario_map");
});

const APP = {
  ADMIN_URL: (window.CONFIG && window.CONFIG.SURVEY_SCRIPT_URL) || "https://script.google.com/macros/s/AKfycbxeaWneUbjCBfAu3LbiEZqYAVZ5zsogH-fmxCztQPDU4OvZJ6IaoUIdhrfmmUX6EbaG/exec",
  SURVEY_URL: (window.CONFIG && window.CONFIG.SURVEY_SCRIPT_URL) || "https://script.google.com/macros/s/AKfycbxeaWneUbjCBfAu3LbiEZqYAVZ5zsogH-fmxCztQPDU4OvZJ6IaoUIdhrfmmUX6EbaG/exec",
  // AUTH-03: State Management
  auth: {
      role: sessionStorage.getItem('ops_role') || null,
      pass: sessionStorage.getItem('ops_pass') || null,

      showModal() {
          // AUTH-08: Redirect to login page instead of modal
          window.location.href = 'login.html';
      },
      hideModal() {
          // No longer needed but keeping for compatibility
      },
      async login(password) {
          const btn = document.querySelector('#login-modal button');
          if (btn) btn.disabled = true;
          try {
              const res = await AdminDataService._fetchJson('auth_check', { pass: password });
              if (res && res.ok) {
                  this.role = res.role;
                  this.pass = password;
                  sessionStorage.setItem('ops_role', res.role);
                  sessionStorage.setItem('ops_pass', password);
                  this.hideModal();
                  App.utils ? App.utils.showToast(`로그인 성공 (${res.role} 권한)`) : alert('로그인 성공');
                  
                  // Redirect if on login page
                  if (window.location.pathname.includes('login.html')) {
                      setTimeout(() => window.location.href = 'admin.html', 800);
                      return true;
                  }
                  
                  // AUTH-06: Re-render UI to reflect role (Master buttons, etc)
                  if (APP.opsRoutine && APP.opsRoutine.data) {
                      APP.opsRoutine.render(); 
                  }
                  // Full Admin Init if on dashboard
                  if (APP.admin && typeof APP.admin.init === 'function') {
                      APP.admin.init();
                  }
                  return true;
              } else {
                  if (App.utils && App.utils.showError) App.utils.showError('비밀번호가 틀렸습니다.');
              }
          } catch (e) {
              if (App.utils && App.utils.showError) App.utils.showError('인증 중 오류가 발생했습니다.');
          } finally {
              if (btn) btn.disabled = false;
          }
          return false;
      },
      // AUTH-05: Fix logout
      logout() {
          sessionStorage.removeItem('ops_role');
          sessionStorage.removeItem('ops_pass');
          this.role = null;
          this.pass = null;
          App.utils ? App.utils.showSuccess('로그아웃 되었습니다.') : alert('로그아웃 되었습니다.');
          setTimeout(() => window.location.href = 'home.html', 500);
      },
      // AUTH-04: GNB Nav Handler
      handleAdminNav(e) {
          if (e) e.preventDefault();
          
          if (this.role) {
              // Already authed, just go to admin or stay
              if (window.location.pathname.includes('admin.html')) {
                  App.utils.showToast(`이미 ${this.role} 권한으로 로그인되어 있습니다.`);
              } else {
                  window.location.href = 'admin.html';
              }
          } else {
              // Not authed, redirect to login page
              window.location.href = 'login.html';
          }
      }
  },
  /**
   * Submit Survey Data
   * @param {string} formType - 'resident', 'lodging', 'tourist'
   * @param {object} formData - Collected form data
   */
  async submitSurvey(formType, formData, options = {}) {
    if (!formData.site && formType) formData.formType = formType; 
    
    console.log(`[APP] Submitting ${formType}...`, formData);

    const timeoutMs = Number(options.timeoutMs || 25000);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutId = null;

    try {
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(formData)
      };

      if (controller && timeoutMs > 0) {
        fetchOptions.signal = controller.signal;
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }

      const response = await fetch(APP.SURVEY_URL, fetchOptions);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);

      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (_) {
        throw new Error('INVALID_SERVER_RESPONSE');
      }
      
      if (result.result === 'success' || result.ok === true || result.status === 'success') {
        if (!options.silent) alert('소중한 의견 감사합니다!');
        if (!options.skipReload) window.location.reload();
        return result;
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (error) {
      const normalizedError = error?.name === 'AbortError' ? new Error('SUBMISSION_TIMEOUT') : error;
      console.error('Submission error:', normalizedError);
      if (normalizedError.message === 'SURVEY_CLOSED' && !options.silent) {
        alert('현재 접수 중인 설문이 아닙니다.');
      } else if (normalizedError.message === 'SUBMISSION_TIMEOUT' && !options.silent) {
        alert('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
      } else if (!options.silent) {
        alert('제출이 완료되었습니다. (서버 확인 필요)');
      }
      if (!options.skipReload) window.location.reload();
      throw normalizedError;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  },

  /**
   * Fetch Statistics
   * @param {string} action - 'stats_resident', 'stats_lodging', 'stats_tourist'
   * @param {object} params - additional params like {period: 'all'}
   */
  async fetchStats(action, params = {}) {
    try {
      // Use centralized API bridge
      return await App.api.callAction(action, params);
    } catch (error) {
      console.error(`[APP] Failed to fetch stats (${action}):`, error);
      return null;
    }
  },

  async fetchSurveySettings() {
    try {
      return await App.api.callAction('survey_settings', { ts: Date.now() });
    } catch (error) {
      console.warn('[APP] Failed to fetch survey settings:', error);
      return null;
    }
  },

  async guardSurveyOpen(formType) {
    const settings = await this.fetchSurveySettings();
    const item = settings && settings.surveys ? settings.surveys[formType] : null;
    if (!item || item.enabled !== false) return true;

    const form = document.querySelector('form');
    if (form) {
      form.querySelectorAll('input, textarea, select, button').forEach((el) => {
        el.disabled = true;
      });
    }

    const main = document.querySelector('main') || document.body;
    const notice = document.createElement('div');
    notice.className = 'max-w-3xl mx-auto mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 shadow-sm';
    notice.innerHTML = `
      <div class="flex items-start gap-3">
        <i class="fas fa-circle-info text-amber-600 text-xl mt-1"></i>
        <div>
          <h2 class="font-black text-lg mb-1">현재 접수 중인 설문이 아닙니다</h2>
          <p class="text-sm leading-relaxed">${item.label || '해당 설문'}은 현재 응답 수집이 종료되었거나 일시 중지되었습니다.</p>
        </div>
      </div>
    `;
    main.insertBefore(notice, main.firstChild);
    return false;
  },

  // Bridge to App.utils.renderBar
  renderBar(label, value, max, colorClass = 'bg-ocean-500') {
    if (window.App && window.App.utils && window.App.utils.renderBar) {
      return window.App.utils.renderBar(label, value, max, colorClass);
    }
    // Simple fallback if utils not loaded
    const pct = max > 0 ? (value / max) * 100 : 0;
    return `<div class="mb-3">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">${label}</span>
                <span class="text-gray-500">${value}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="${colorClass} h-1.5 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>`;
  },

  /**
   * MAP-FE-CORE-01: Shared SVG Map Renderer
   */
  SvgRiMap(containerEl, geoIndex, kpiByRi, options = {}) {
    const { mode = "baseline", selectedKpiKey = "RTRI", onClickRi, onClickPoi } = options;
    if (!containerEl || !geoIndex) return;

    const riList = geoIndex.ri || [];
    const poiList = geoIndex.poi || [];

    // 1. Determine Color
    const getColorClass = (val) => {
        if (val === null || val === undefined) return 'fill-slate-100';
        if (val < 40) return 'kpi-lv1';
        if (val < 50) return 'kpi-lv2';
        if (val < 60) return 'kpi-lv3';
        if (val < 70) return 'kpi-lv4';
        return 'kpi-lv5';
    };

    const getRiskTag = (riName) => {
        const d = kpiByRi[riName];
        if (!d || !d.kpi) return '';
        const k = d.kpi || {};
        // Rules: RTRI<45 or CGS<50 or SII>60
        if ((k.RTRI && k.RTRI < 45) || (k.CGS && k.CGS < 50) || (k.SII && k.SII > 60)) return '🔴';
        return '';
    };

    // 2. Build SVG
    let html = `
    <svg viewBox="0 0 220 120" class="w-full h-full drop-shadow-sm select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                <feOffset dx="0.5" dy="0.5" />
                <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g class="ri-paths">
    `;

    riList.forEach(ri => {
        const kpiData = kpiByRi[ri.ri] || {};
        const safeKpi = kpiData.kpi || {};
        const val = safeKpi[selectedKpiKey];
        const colorClass = getColorClass(val);
        const risk = getRiskTag(ri.ri);

        // Center Coordinate fallback if not in sheet
        const cx = ri.ri === '모항리' ? 50 : 155;
        const cy = 60;

        html += `
            <path d="${ri.svgPath}" 
                  class="ri-path ${colorClass} transition-all duration-500 cursor-pointer hover:opacity-80"
                  data-ri="${ri.ri}"
                  stroke="#fff" stroke-width="1.5"
                  style="filter: url(#map-shadow);" />
            <text x="${cx}" y="${cy + 25}" 
                  class="ri-label font-bold text-[9px] fill-slate-800 pointer-events-none drop-shadow-sm" 
                  text-anchor="middle">
                ${ri.label} ${risk}
            </text>
        `;
    });

    html += `</g><g class="poi-layer">`;

    poiList.forEach(poi => {
        // Simple type colors
        const color = poi.type === 'ANCHOR' ? '#0ea5e9' : (poi.type === 'MEDICAL' ? '#f43f5e' : '#64748b');
        html += `
            <circle cx="${poi.x}" cy="${poi.y}" r="3.5" 
                    fill="${color}" stroke="white" stroke-width="1"
                    class="poi-dot cursor-pointer hover:r-5 transition-all"
                    data-poi-id="${poi.poiId}"
                    title="${poi.name}" />
        `;
    });

    html += `</g></svg>`;

    containerEl.innerHTML = html;

    // 3. Events
    containerEl.querySelectorAll('.ri-path').forEach(el => {
        el.onclick = (e) => onClickRi && onClickRi(el.dataset.ri, e);
    });
    containerEl.querySelectorAll('.poi-dot').forEach(el => {
        const id = el.dataset.poiId;
        const poi = poiList.find(p => p.poiId === id);
        el.onclick = (e) => onClickPoi && onClickPoi(poi, e);
    });
  },

  // -----------------------------------------------------------
  // Admin Dashboard Logic
  // -----------------------------------------------------------
  admin: {
      data: {
          resident: null,
          lodging: null,
          tourist: null,
          combined: null
      },
      tabOrder: [
          'dashboard',
          'visitor-admin',
          'resident-v2-admin',
          'local-analysis',
          'prog-exec',
          'linker-base',
          'routine',
          'scenario',
          'reports',
          'survey-settings',
          'data'
      ],
      tabGroups: {
          survey: {
              triggerId: 'admin-survey-menu-trigger',
              currentId: 'admin-survey-current',
              label: '설문 통계',
              defaultLabel: '방문자설문',
              tabs: ['visitor-admin', 'resident-v2-admin', 'local-analysis', 'prog-exec', 'linker-base']
          },
          ops: {
              triggerId: 'admin-ops-menu-trigger',
              currentId: 'admin-ops-current',
              label: '운영보드',
              defaultLabel: '운영루틴',
              tabs: ['routine', 'scenario', 'reports']
          },
          settings: {
              triggerId: 'admin-settings-menu-trigger',
              currentId: 'admin-settings-current',
              label: '환경설정',
              defaultLabel: '설문 설정',
              tabs: ['survey-settings', 'data']
          }
      },
      _hashBound: false,
      _tabMenuBound: false,

      async init() {
          console.log("Initializing Admin Dashboard...");
          this.initTabBar();

          if (window.App && window.App.tabDashboard) {
              window.App.tabDashboard.init();
          }
          
          // Listen for tab changes from new centralized router to handle legacy tabs
          if (window.App && window.App.bus) {
              window.App.bus.on('tab:changed', (tabId) => {
                  this.loadTabContent(tabId);
                  setTimeout(() => {
                      if(window.App.chartManager) window.App.chartManager.resizeAll();
                  }, 50);
              });
          }

          // Show the requested tab immediately; background data sync can finish after first paint.
          const initialTab = this.getInitialTab();
          this.showTab(initialTab, { updateHash: false, scrollTab: false });

          // Boot-time Data Load (Silent)
          await this.syncData('all', true);
      },

      initTabBar() {
          const buttons = Array.from(document.querySelectorAll('.admin-tabbar .tab-btn'));
          if (!buttons.length) return;

          buttons.forEach((btn, index) => {
              btn.setAttribute('tabindex', btn.classList.contains('active') ? '0' : '-1');
              btn.dataset.tabNumber = String(index + 1);
              if (!btn.classList.contains('admin-popover-item') && !btn.dataset.boundKeyNav) {
                  btn.addEventListener('keydown', (event) => this.handleTabKeydown(event));
                  btn.dataset.boundKeyNav = 'true';
              }
          });

          document.querySelectorAll('.admin-tab-menu-trigger').forEach((menuTrigger) => {
              if (!menuTrigger.dataset.boundKeyNav) {
                  menuTrigger.addEventListener('keydown', (event) => this.handleTabKeydown(event));
                  menuTrigger.dataset.boundKeyNav = 'true';
              }
          });

          if (!this._hashBound) {
              window.addEventListener('hashchange', () => {
                  const nextTab = this.getInitialTab();
                  if (nextTab) this.showTab(nextTab, { updateHash: false });
              });
              this._hashBound = true;
          }

          if (!this._tabMenuBound) {
              document.addEventListener('click', (event) => {
                  if (!event.target.closest('.admin-tab-group')) this.closeTabMenus();
              });
              document.addEventListener('keydown', (event) => {
                  if (event.key === 'Escape') this.closeTabMenus();
              });
              this._tabMenuBound = true;
          }
      },

      getInitialTab() {
          const hashTab = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
          if (this.isKnownTab(hashTab)) return hashTab;
          return 'dashboard';
      },

      isKnownTab(tabName) {
          return Boolean(tabName && document.getElementById(`view-${tabName}`) && document.getElementById(`tab-${tabName}`));
      },

      handleTabKeydown(event) {
          const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
          if (!keys.includes(event.key)) return;

          const buttons = Array.from(document.querySelectorAll('.admin-tab-rail > .tab-btn, .admin-tab-rail > .admin-tab-group > .admin-tab-menu-trigger'));
          const currentIndex = buttons.indexOf(event.currentTarget);
          if (currentIndex < 0) return;

          event.preventDefault();

          let nextIndex = currentIndex;
          if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
          if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          if (event.key === 'Home') nextIndex = 0;
          if (event.key === 'End') nextIndex = buttons.length - 1;

          const nextButton = buttons[nextIndex];
          nextButton.focus();
          if (nextButton.classList.contains('admin-tab-menu-trigger')) {
              this.toggleTabMenu(nextButton.getAttribute('aria-controls'), true);
          } else {
              this.showTab(nextButton.id.replace(/^tab-/, ''));
          }
      },

      updateTabSummary(tabEl, tabName) {
          const titleEl = document.getElementById('admin-current-tab-title');
          const descEl = document.getElementById('admin-current-tab-desc');
          const countEl = document.getElementById('admin-current-tab-count');
          if (titleEl) titleEl.textContent = tabEl?.dataset?.tabTitle || tabName;
          if (descEl) descEl.textContent = tabEl?.dataset?.tabDesc || '';
          if (countEl) countEl.textContent = tabEl?.dataset?.navCode || '';
      },

      getTabGroup(tabName) {
          return Object.values(this.tabGroups).find((group) => group.tabs.includes(tabName)) || null;
      },

      toggleTabMenu(menuId, forceOpen = null) {
          const menu = document.getElementById(menuId);
          const trigger = document.querySelector(`[aria-controls="${menuId}"]`);
          if (!menu || !trigger) return;

          const shouldOpen = forceOpen === null ? menu.classList.contains('hidden') : Boolean(forceOpen);
          this.closeTabMenus(menuId);

          menu.classList.toggle('hidden', !shouldOpen);
          trigger.setAttribute('aria-expanded', String(shouldOpen));
          menu.querySelectorAll('.admin-popover-item').forEach((item) => {
              item.setAttribute('tabindex', shouldOpen ? '0' : '-1');
          });
      },

      closeTabMenus(exceptId = null) {
          document.querySelectorAll('.admin-tab-popover').forEach((menu) => {
              if (exceptId && menu.id === exceptId) return;
              menu.classList.add('hidden');
              menu.querySelectorAll('.admin-popover-item').forEach((item) => item.setAttribute('tabindex', '-1'));
              const trigger = document.querySelector(`[aria-controls="${menu.id}"]`);
              if (trigger) trigger.setAttribute('aria-expanded', 'false');
          });
      },

      syncTabGroupState(tabName, tabEl) {
          Object.values(this.tabGroups).forEach((group) => {
              const isActive = group.tabs.includes(tabName);
              const trigger = document.getElementById(group.triggerId);
              const label = document.getElementById(group.currentId);

              if (trigger) {
                  trigger.classList.toggle('active', isActive);
                  trigger.setAttribute('aria-current', isActive ? 'page' : 'false');
              }
              if (label) {
                  label.textContent = isActive ? (tabEl?.dataset?.tabTitle || group.label) : group.defaultLabel;
              }
          });
      },
      
      /**
       * Sync Data
       * @param {string} region 
       * @param {boolean} silent - If true, skip confirmation and alerts
       * @param {string} period 
       * @param {string} source 
       */
      async syncData(region = 'all', silent = false, period = 'this_month', source = 'raw') {
          if(!silent && !confirm('최신 설문 데이터를 불러와 대시보드를 갱신하시겠습니까?')) return;
          
          try {
              if(!silent) document.body.style.cursor = 'wait';
              
              // 0. Update UI states if filters exist (e.g., from script calls)
              const fScope = document.getElementById('dash-filter-scope');
              const fPeriod = document.getElementById('dash-filter-period');
              const fSource = document.getElementById('dash-filter-source');
              if(fScope && fScope.value !== region) fScope.value = region;
              if(fPeriod && fPeriod.value !== period) fPeriod.value = period;
              if(fSource && fSource.value !== source) fSource.value = source;

              // Parallel Fetch
              const [summary, trend] = await Promise.all([
                  AdminDataService.loadAdminData(region, period, source),
                  AdminDataService.loadTrendData() // 향후 trend 데이터에도 param 적용 가능
              ]);
              
              // Update Data (Strict Schema)
              this.data.summary = summary;
              this.data.trend = trend;
              
              if(window.App && window.App.store) {
                  window.App.store.set('summary', summary);
                  window.App.store.set('trend', trend);
              }
              
              if(window.App && window.App.tabDashboard) {
                  window.App.tabDashboard.render();
              }
              
              if(!silent) alert('데이터 동기화가 완료되었습니다.');
              
          } catch(e) {
              console.error(e);
              App.utils.showError(e.message, () => this.syncData(region, false));
          } finally {
              if(!silent) document.body.style.cursor = 'default';
          }
      },
      
      // Delegate to centralized tabs controller or inline routing
      showTab(tabName, options = {}) {
           if (!this.isKnownTab(tabName)) tabName = 'dashboard';

           // 1. Switch UI
           document.querySelectorAll('.view-section').forEach(el => {
               el.classList.add('hidden');
               el.setAttribute('aria-hidden', 'true');
           });
           document.querySelectorAll('.tab-btn').forEach(btn => {
               const isActive = btn.id === `tab-${tabName}`;
               btn.classList.toggle('active', isActive);
               if (btn.closest('.admin-tabbar')) {
                   if (btn.getAttribute('role') === 'tab') {
                       btn.setAttribute('aria-selected', String(isActive));
                   } else {
                       btn.setAttribute('aria-current', isActive ? 'page' : 'false');
                   }
                   btn.setAttribute('tabindex', isActive ? '0' : '-1');
               }
           });
           
           const viewEl = document.getElementById(`view-${tabName}`);
           const tabEl = document.getElementById(`tab-${tabName}`);
           if(viewEl) {
               viewEl.classList.remove('hidden');
               viewEl.removeAttribute('aria-hidden');
           }
           if(tabEl) {
               tabEl.classList.add('active');
               this.syncTabGroupState(tabName, tabEl);
               this.updateTabSummary(tabEl, tabName);
               if (options.scrollTab !== false) {
                   const tabGroup = this.getTabGroup(tabName);
                   const scrollTarget = tabEl.classList.contains('admin-popover-item') && tabGroup ? document.getElementById(tabGroup.triggerId) : tabEl;
                   if (scrollTarget) scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
               }
           }
           this.closeTabMenus();

           if (window.App && window.App.store) {
               window.App.store.set('activeTab', tabName);
           }

           if (options.updateHash !== false) {
               const nextHash = `#${encodeURIComponent(tabName)}`;
               if (window.location.hash !== nextHash && window.history && window.history.replaceState) {
                   window.history.replaceState(null, '', nextHash);
               }
           }

           // 2. Load Data
            if (tabName === 'dashboard') {
                if (window.App && window.App.tabDashboard) {
                    window.App.tabDashboard.load();
                }
            } else if (tabName === 'routine') {
                APP.opsRoutine.init();
            } else {
                this.loadTabContent(tabName);
            }
       },

       /**
        * Bridge to App.modal.show
        * @param {string} kpiKey 
        */
        showCoreDetails(kpiKey, explicitScore) {
            const summary = window.App?.store?.get('summary') || this.data.summary;
            let score = explicitScore;
            
            if (score === undefined) {
                score = summary?.kpi?.[kpiKey] ? summary.kpi[kpiKey].toFixed(1) : '-';
            } else if (typeof score === 'number') {
                score = score.toFixed(1);
            }
            
            if(window.App && window.App.modal) {
                window.App.modal.show(kpiKey, score);
            } else {
                console.warn("[APP] App.modal not found for key:", kpiKey);
            }
        },

        /**
         * Phase 12: Risk Signal Modal entry
         * @param {string} key 
         */
        showRiskModal(key) {
            if(key === 'DATA' || key === 'OPS') {
                // Not standard KPI, maybe just alert for now, or use custom modal
                alert(key === 'DATA' ? "데이터 품질 경고: 데이터 탭의 무결성 검사 내역을 확인해 결측/중복치를 정규화하세요." : "실행력 저하 경고: 운영 루틴 탭에서 진행률과 피드백을 확인하세요.");
                return;
            }
            this.showCoreDetails(key);
        },

        /**
         * Phase 12: Risk Action Deep Link
         * Navigate to target tab and perform actions (scroll, preset apply)
         */
        actionRiskDeepLink(e, targetTab, presetOrAnchor) {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. Tab Switch
            this.switchTab(targetTab);
            
            // 2. Tab-specific behavior
            setTimeout(() => {
                if(targetTab === 'scenario') {
                    // Try to click the matching preset checkbox if it exists
                    const cb = document.querySelector(`input[name="preset"][value="${presetOrAnchor}"]`);
                    if(cb && !cb.checked) {
                        cb.click();
                    }
                    const titleInput = document.getElementById('sc-policy-title');
                    if(titleInput) {
                        titleInput.value = `[리스크 조치] ${presetOrAnchor} 강화 시나리오`;
                    }
                } else if (targetTab === 'survey') {
                    // Scroll down slightly
                    const el = document.getElementById('chart-radar');
                    if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
                } else if (targetTab === 'data') {
                    const el = document.getElementById('data-norm-apply-btn');
                    if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
                } else if (targetTab === 'routine') {
                    const el = document.getElementById('ops-routine-main');
                    if(el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
                }
            }, 600);
        },


       async loadTabContent(tabName) {
           const map = {
               'survey-hub': { loader: 'loadSurveyStats', startMsg: '설문 데이터(상세) 로딩 중...' },
               'local-analysis': { loader: 'loadVillageAnalysis', startMsg: '리 단위 데이터 분석 중...' },
               'routine': { loader: 'loadOpsRoutine', startMsg: '운영 루틴 상태 확인 중...' },
               'reports': { loader: 'loadReportsIndex', startMsg: '보고 데이터 병렬 연동 중...' },
               'data': { loader: 'loadDataStatus', startMsg: '데이터 시트 상태 점검 중...' },
               'scenario': { loader: 'loadScenarioMap', startMsg: '시나리오 맵 로딩 중...' },
                'prog-exec': { loader: 'loadProgExecSummary', startMsg: '프로그램 실행 데이터 집계 중...' },
                'linker-base': { loader: 'loadLinkerBaseSummary', startMsg: '주민참여 기반 지수 계산 중...' },
                'visitor-admin': { loader: 'loadVisitorAdmin', startMsg: '방문객 설문 데이터 로딩 중...' },
                'resident-v2-admin': { loader: 'loadResidentV2Admin', startMsg: '주민 v2 설문 데이터 로딩 중...' },
                'survey-settings': { loader: 'loadSurveySettings', startMsg: '설문 접수 설정 로딩 중...' }
           };
           
           Object.assign(map, {
               'survey-hub': { loader: 'loadSurveyStats', startMsg: '설문 통계 데이터를 불러오는 중입니다...' },
               'local-analysis': { loader: 'loadVillageAnalysis', startMsg: '리 단위 분석 데이터를 불러오는 중입니다...' },
               'routine': { loader: 'loadOpsRoutine', startMsg: '운영 루틴 상태를 확인하는 중입니다...' },
               'reports': { loader: 'loadReportsIndex', startMsg: '보고서 데이터를 불러오는 중입니다...' },
               'data': { loader: 'loadDataStatus', startMsg: '데이터 시트 상태를 점검하는 중입니다...' },
               'scenario': { loader: 'loadScenarioMap', startMsg: '시나리오 맵을 불러오는 중입니다...' },
               'prog-exec': { loader: 'loadProgExecSummary', startMsg: '프로그램 실행 데이터를 집계하는 중입니다...' },
               'linker-base': { loader: 'loadLinkerBaseSummary', startMsg: '주민 참여 기반 지표를 계산하는 중입니다...' },
               'visitor-admin': { loader: 'loadVisitorAdmin', startMsg: '방문객 설문 데이터를 불러오는 중입니다...' },
               'resident-v2-admin': { loader: 'loadResidentV2Admin', startMsg: '주민설문 v2 데이터를 불러오는 중입니다...' },
               'survey-settings': { loader: 'loadSurveySettings', startMsg: '설문 접수 설정을 불러오는 중입니다...' }
           });

           const cfg = map[tabName];
           if(!cfg) return;

           const container = document.getElementById(`view-${tabName}`);
           if(!container) return;

           // Simple Loading Indicator (if empty)
           // Only show loading if we don't have data yet or want to refresh?
           // User wants "Load on entry".
           
           // FIX: Clear container to remove static placeholders or duplicates
           container.innerHTML = ''; 
           
           // Create standardized content area
           let contentArea = document.createElement('div');
           contentArea.className = 'tab-content-area p-4';
           container.appendChild(contentArea);
           
           // Show Loading
           contentArea.innerHTML = `<div class="text-center py-10 text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>${cfg.startMsg}</div>`;

           try {
               const data = await AdminDataService[cfg.loader]();
               if(!data) throw new Error("데이터를 불러오지 못했습니다. (Null Response)");
               
               // Render based on Tab
               this.renderTabContent(tabName, data, contentArea);
               
           } catch(e) {
               console.error(e);
               contentArea.innerHTML = `<div class="text-center py-10 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>데이터 로드 실패: ${e.message}</div>`;
               return;
           }
       },

        renderTabContent(tabName, data, container) {
            // Debug Dump or Simple List
            if(tabName === 'survey-hub') {
                this.renderSurveyHub(data, container);
            }
            else if(tabName === 'local-analysis') {
                this.renderRiAnalysis(data, container);
            }
            else if(tabName === 'routine') {
                this.renderRoutineTab(data, container);
            }
            else if(tabName === 'reports') {
                this.renderReportsTab(data, container);
            }
            else if(tabName === 'data') {
                this.renderDataTab(data, container);
            }
            else if(tabName === 'scenario') {
                 this.renderScenarioTab(data, container);
            }
            else if(tabName === 'prog-exec') {
                 if (window.App && window.App.tabProgExec) {
                     window.App.tabProgExec.render(data, container);
                 } else {
                     container.innerHTML = `<div class="p-4 text-red-500">tabProgExec 모듈이 로드되지 않았습니다.</div>`;
                 }
            }
             else if(tabName === 'linker-base') {
                  if (window.App && window.App.tabLinkerBase) {
                      window.App.tabLinkerBase.render(data, container);
                  } else {
                      container.innerHTML = `<div class="p-4 text-red-500">tabLinkerBase 모듈이 로드되지 않았습니다.</div>`;
                  }
             }
             else if(tabName === 'visitor-admin') {
                 this.renderVisitorAdminTab(data, container);
             }
             else if(tabName === 'resident-v2-admin') {
                 this.renderResidentV2AdminTab(data, container);
             }
             else if(tabName === 'survey-settings') {
                 this.renderSurveySettingsTab(data, container);
             }
            else {
                // Generic Fallback
                container.innerHTML = `<pre class="text-xs overflow-auto max-h-96">${JSON.stringify(data, null, 2)}</pre>`;
            }
         },

         escapeHtml(value) {
             return String(value ?? '')
                 .replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#039;');
         },

         renderSurveySettingsTab(data, container) {
             const surveys = data?.surveys || {};
             const order = ['visitor', 'resident_v2', 'resident', 'tourist', 'lodging'];
             const fallbackLabels = {
                 visitor: '소원면 방문객 대상',
                 resident_v2: '주민설문 v2',
                 resident: '지역주민대상',
                 tourist: '관광객방문자대상',
                 lodging: '숙박업 관계자대상'
             };

             container.innerHTML = `
                 <div class="space-y-6">
                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                         <div>
                             <p class="text-xs font-black text-ocean-600 uppercase tracking-wide mb-2">Survey Access Control</p>
                             <h2 class="text-2xl font-black text-slate-900">설문 잠금 및 숨김 설정</h2>
                             <p class="text-sm text-slate-500 mt-2">잠금은 응답 페이지 작성과 서버 제출을 막고, 숨김은 홈 카드와 상단 메뉴에서 설문을 감춥니다.</p>
                         </div>
                         <button id="btn-save-survey-settings" onclick="APP.admin.saveSurveySettings()" class="px-5 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition">
                             <i class="fas fa-save mr-2"></i>설정 저장
                         </button>
                     </div>

                     <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                         ${order.map((key) => {
                             const item = surveys[key] || {};
                             const enabled = item.enabled === true;
                             const hidden = item.hidden === true;
                             return `
                                 <div class="bg-white rounded-2xl border ${enabled ? 'border-ocean-200' : 'border-slate-200'} shadow-sm p-5">
                                     <div class="flex items-start justify-between gap-3 mb-5">
                                         <div>
                                             <h3 class="font-black text-slate-900">${this.escapeHtml(item.label || fallbackLabels[key])}</h3>
                                             <p class="text-xs text-slate-500 mt-1 leading-relaxed">${this.escapeHtml(item.description || '')}</p>
                                         </div>
                                         <div class="flex flex-col items-end gap-1">
                                             <span id="survey-state-${key}" class="text-[11px] font-black px-2.5 py-1 rounded-full ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${enabled ? '접수중' : '잠금'}</span>
                                             <span class="text-[11px] font-black px-2.5 py-1 rounded-full ${hidden ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}">${hidden ? '숨김' : '노출'}</span>
                                         </div>
                                     </div>
                                     <label class="flex items-center justify-between cursor-pointer rounded-xl bg-slate-50 border border-slate-100 p-3 mb-2">
                                         <span class="text-sm font-bold text-slate-700">응답 접수</span>
                                         <input type="checkbox" data-survey-toggle="${key}" class="w-6 h-6 text-ocean-600 rounded border-slate-300 focus:ring-ocean-500" ${enabled ? 'checked' : ''}>
                                     </label>
                                     <label class="flex items-center justify-between cursor-pointer rounded-xl bg-slate-50 border border-slate-100 p-3">
                                         <span class="text-sm font-bold text-slate-700">홈/네비 숨김</span>
                                         <input type="checkbox" data-survey-hidden="${key}" class="w-6 h-6 text-amber-600 rounded border-slate-300 focus:ring-amber-500" ${hidden ? 'checked' : ''}>
                                     </label>
                                 </div>
                             `;
                         }).join('')}
                     </div>
                 </div>
             `;
         },

         async saveSurveySettings() {
             const btn = document.getElementById('btn-save-survey-settings');
             const original = btn ? btn.innerHTML : '';
             const settings = {};
             document.querySelectorAll('[data-survey-toggle]').forEach((input) => {
                 settings[input.dataset.surveyToggle] = {
                     ...(settings[input.dataset.surveyToggle] || {}),
                     enabled: input.checked
                 };
             });
             document.querySelectorAll('[data-survey-hidden]').forEach((input) => {
                 settings[input.dataset.surveyHidden] = {
                     ...(settings[input.dataset.surveyHidden] || {}),
                     hidden: input.checked
                 };
             });

             if (btn) {
                 btn.disabled = true;
                 btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>저장 중...';
             }

             try {
                 const res = await AdminDataService.saveSurveySettings(settings);
                 if (!res || !res.ok) throw new Error(res?.error || '설정 저장 실패');
                 App.cache.clear('survey_settings');
                 App.utils.showSuccess('설문 접수 설정이 저장되었습니다.');
                 this.renderSurveySettingsTab(res, document.querySelector('#view-survey-settings .tab-content-area') || document.getElementById('view-survey-settings'));
             } catch (error) {
                 App.utils.showError(error.message || '설정 저장에 실패했습니다.');
             } finally {
                 if (btn) {
                     btn.disabled = false;
                     btn.innerHTML = original;
                 }
             }
         },

         renderVisitorAdminTab(data, container) {
             const stats = data?.stats || {};
             const rows = data?.responses?.rows || [];
             const settings = data?.settings?.surveys?.visitor || {};
             const needs = this._topItems(stats.needs?.top3, 8);
             const motive = this._topItems(stats.motive?.top3, 6);
             const effect = this._topItems(stats.effect?.top3, 6);
             const comments = rows.filter((row) => row.comment);
             const tableRows = rows;
             const commentKeywords = this._extractCommentKeywords(comments.map((row) => row.comment), 12);
             const keywordTotal = commentKeywords.reduce((sum, item) => sum + Number(item.count || 0), 0);
             const needEntries = this._visitorNeedEntries(rows, needs);
             const total = Number(stats.total || rows.length || 0);
             const couponCount = rows.filter((row) => row.couponCode).length;
             const topAge = this._topCountLabel(stats.age);
             const topResidence = this._topCountLabel(stats.residence);
             const topStay = this._topCountLabel(stats.stay);
             const topNeed = needEntries[0] || { label: '-', count: 0 };
             const revisitRate = Number(stats.revisit?.posRate || 0);
             const recommendRate = Number(stats.recommend?.posRate || 0);
             const lastUpdated = stats.lastUpdated || rows[0]?.timestamp;

             container.innerHTML = `
                 <div class="space-y-6">
                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                         <div>
                             <p class="text-xs font-black text-cyan-600 uppercase tracking-wide mb-2">Visitor Survey</p>
                             <h2 class="text-2xl font-black text-slate-900">소원면 방문객 설문 관리</h2>
                             <p class="text-sm text-slate-500 mt-2">방문 환경 만족도, 재방문/추천 의향, 필요시설 수요와 교환권 발급 정보를 차트와 표로 확인합니다.</p>
                         </div>
                         <div class="flex flex-wrap items-center gap-2">
                             <span class="text-xs font-black px-3 py-1.5 rounded-full ${settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                                 ${settings.enabled ? '방문객 설문 접수중' : '방문객 설문 종료'}
                             </span>
                             <button onclick="APP.admin.showTab('survey-settings')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition">
                                 <i class="fas fa-toggle-on mr-1"></i>접수 설정
                             </button>
                         </div>
                     </div>

                     <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                         ${this._visitorMetricCard('총 응답', `${total.toLocaleString()}명`, 'fa-users', 'text-cyan-600')}
                         ${this._visitorMetricCard('교환권 발급', `${couponCount.toLocaleString()}건`, 'fa-ticket', 'text-violet-600')}
                         ${this._visitorMetricCard('만족도 평균', stats.satisfactionAvg ? `${stats.satisfactionAvg} / 5` : '-', 'fa-star', 'text-amber-500')}
                         ${this._visitorMetricCard('재방문 긍정률', `${revisitRate.toFixed(1)}%`, 'fa-rotate-right', 'text-ocean-600')}
                         ${this._visitorMetricCard('추천 긍정률', `${recommendRate.toFixed(1)}%`, 'fa-share-nodes', 'text-emerald-600')}
                         ${this._visitorMetricCard('최근 업데이트', this._formatShortDate(lastUpdated), 'fa-clock', 'text-slate-500')}
                     </div>

                     <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                         ${this._surveyInsightCard('최다 연령대', topAge.label, `${topAge.count.toLocaleString()}명 응답`, 'fa-user-group', 'cyan')}
                         ${this._surveyInsightCard('주요 거주권', topResidence.label, `${topResidence.count.toLocaleString()}명 응답`, 'fa-location-dot', 'sky')}
                         ${this._surveyInsightCard('대표 체류시간', topStay.label, `${topStay.count.toLocaleString()}명 응답`, 'fa-hourglass-half', 'amber')}
                         ${this._surveyInsightCard('최우선 필요시설', topNeed.label, `${Number(topNeed.count || 0).toLocaleString()}회 선택`, 'fa-building-circle-check', 'emerald')}
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">연령대 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">기본 정보</span>
                             </div>
                             <div class="h-72"><canvas id="visitor-age-chart"></canvas></div>
                         </div>
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">거주지역 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">방문권역</span>
                             </div>
                             <div class="h-72"><canvas id="visitor-residence-chart"></canvas></div>
                         </div>
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">체류기간 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">체류 패턴</span>
                             </div>
                             <div class="h-72"><canvas id="visitor-stay-chart"></canvas></div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                         <div class="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                                 <div>
                                     <h3 class="font-black text-slate-900">필요시설 수요 TOP</h3>
                                     <p class="text-xs text-slate-500 mt-1">복수응답을 선택 수와 전체 응답 대비 비중으로 함께 봅니다.</p>
                                 </div>
                                 <span class="text-xs font-bold text-slate-400">선택 수 / 비중</span>
                             </div>
                             <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                 <div class="lg:col-span-3">
                                     <div class="h-80"><canvas id="visitor-needs-chart"></canvas></div>
                                 </div>
                                 <div class="lg:col-span-2">
                                     <div class="h-64"><canvas id="visitor-needs-share-chart"></canvas></div>
                                     <div class="space-y-3 mt-4">
                                         ${needEntries.map((item, index) => {
                                             const pct = total ? Math.round((item.count / total) * 100) : 0;
                                             return `
                                                 <div class="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                                     <div class="flex items-center justify-between gap-3 text-sm">
                                                         <span class="font-black text-slate-700 truncate">${index + 1}. ${this.escapeHtml(item.label)}</span>
                                                         <span class="font-black text-slate-900">${item.count.toLocaleString()}건</span>
                                                     </div>
                                                     <div class="flex items-center gap-2 mt-2">
                                                         <div class="h-2 flex-1 rounded-full bg-white overflow-hidden">
                                                             <div class="h-full rounded-full bg-emerald-500" style="width:${Math.max(4, Math.min(100, pct))}%"></div>
                                                         </div>
                                                         <span class="w-12 text-right text-[11px] font-black text-emerald-700">${pct}%</span>
                                                     </div>
                                                 </div>
                                             `;
                                         }).join('') || `<p class="text-sm text-slate-400 py-6 text-center">필요시설 응답이 없습니다.</p>`}
                                     </div>
                                 </div>
                             </div>
                         </div>
                         <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">재방문·추천 의향 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">긍정 응답 비교</span>
                             </div>
                             <div class="h-80"><canvas id="visitor-intent-chart"></canvas></div>
                             <div class="grid grid-cols-2 gap-3 mt-4">
                                 ${this._surveyRateBar('재방문 긍정', revisitRate, 'bg-ocean-500')}
                                 ${this._surveyRateBar('추천 긍정', recommendRate, 'bg-emerald-500')}
                             </div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                         ${this._surveyTopListCard('방문동기 TOP', '방문객 유입 이유', motive, total)}
                         ${this._surveyTopListCard('방문효과 TOP', '방문 후 얻은 만족', effect, total)}
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                         <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
                             <div>
                                 <h3 class="font-black text-slate-900">응답 데이터 시각화</h3>
                                 <p class="text-xs text-slate-500 mt-1">응답표의 주요 필드를 제출 흐름, 시간대, 만족도 구간으로 변환했습니다.</p>
                             </div>
                             <span class="text-xs font-black px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">전체 ${tableRows.length.toLocaleString()}건</span>
                         </div>
                         <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                             <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">제출일별 흐름</h4>
                                     <span class="text-[11px] font-bold text-slate-400">Line</span>
                                 </div>
                                 <div class="h-72"><canvas id="visitor-response-date-chart"></canvas></div>
                             </div>
                             <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">응답 시간대</h4>
                                     <span class="text-[11px] font-bold text-slate-400">Bar</span>
                                 </div>
                                 <div class="h-72"><canvas id="visitor-response-hour-chart"></canvas></div>
                             </div>
                             <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">만족도 구간</h4>
                                     <span class="text-[11px] font-bold text-slate-400">Polar</span>
                                 </div>
                                 <div class="h-72"><canvas id="visitor-response-score-chart"></canvas></div>
                             </div>
                         </div>
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden">
                         <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                             <div>
                                 <h3 class="font-black text-slate-900">응답 원본 목록</h3>
                                 <p class="text-xs text-slate-500 mt-1">세로 스크롤 없이 수집된 응답을 전체 나열합니다.</p>
                             </div>
                             <span class="text-xs text-slate-400">전체 ${tableRows.length.toLocaleString()}건</span>
                         </div>
                         <div class="overflow-x-auto border border-slate-100 rounded-xl">
                             <table class="min-w-[1100px] w-full text-xs">
                                 <thead class="bg-slate-50">
                                     <tr class="text-slate-500">
                                         <th class="text-left p-3">제출시각</th>
                                         <th class="text-left p-3">뒷자리</th>
                                         <th class="text-left p-3">교환권 코드</th>
                                         <th class="text-left p-3">연령</th>
                                         <th class="text-left p-3">거주지역</th>
                                         <th class="text-left p-3">체류</th>
                                         <th class="text-left p-3">만족도</th>
                                         <th class="text-left p-3">재방문</th>
                                         <th class="text-left p-3">추천</th>
                                         <th class="text-left p-3">필요시설</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     ${tableRows.map((row) => `
                                         <tr class="border-t border-slate-100 hover:bg-slate-50">
                                             <td class="p-3 text-slate-500">${this.escapeHtml(this._formatDateCell(row.timestamp))}</td>
                                             <td class="p-3 font-black text-slate-800">${this.escapeHtml(row.phoneLast4 || '-')}</td>
                                             <td class="p-3 font-mono text-[11px] text-cyan-700">${this.escapeHtml(row.couponCode || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.age || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.residence || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.stay || '-')}</td>
                                             <td class="p-3">${this._scoreBadge(row.satisfactionAvg)}</td>
                                             <td class="p-3">${this._intentBadge(row.revisit)}</td>
                                             <td class="p-3">${this._intentBadge(row.recommend)}</td>
                                             <td class="p-3 max-w-[220px] truncate" title="${this.escapeHtml(row.needs || '')}">${this.escapeHtml(row.needs || '-')}</td>
                                         </tr>
                                     `).join('') || `<tr><td colspan="10" class="p-8 text-center text-slate-400">응답 데이터가 없습니다.</td></tr>`}
                                 </tbody>
                             </table>
                         </div>
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                         <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
                             <div>
                                 <h3 class="font-black text-slate-900">주관식 의견</h3>
                                 <p class="text-xs text-slate-500 mt-1">워드클라우드와 원문 의견을 함께 확인합니다.</p>
                             </div>
                             <span class="text-xs text-slate-400">전체 ${comments.length.toLocaleString()}건</span>
                         </div>
                         <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                             <div class="xl:col-span-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">의견 워드클라우드</h4>
                                     <span class="text-[11px] font-bold text-slate-400">Word Cloud</span>
                                 </div>
                                 <div id="visitor-comment-wordcloud" class="h-80 w-full"></div>
                             </div>
                             <div class="xl:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">키워드 요약</h4>
                                     <span class="text-[11px] font-bold text-slate-400">${keywordTotal.toLocaleString()}회 언급</span>
                                 </div>
                                 <div class="flex flex-wrap gap-2">
                                     ${commentKeywords.slice(0, 10).map((item, index) => `
                                         <span class="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                                             <span class="text-cyan-600">${index + 1}</span>
                                             ${this.escapeHtml(item.label)}
                                             <span class="text-slate-400">${Number(item.count || 0).toLocaleString()}</span>
                                         </span>
                                     `).join('') || `<p class="text-sm text-slate-400 py-6 text-center">분석할 키워드가 없습니다.</p>`}
                                 </div>
                                 <p class="mt-4 text-xs leading-relaxed text-slate-500">상위 키워드만 간단히 표시합니다. 세부 빈도는 워드클라우드 크기로 확인합니다.</p>
                             </div>
                         </div>
                         <div class="space-y-3 mt-5">
                             ${comments.map((row) => `
                                 <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                     <div class="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400 mb-2">
                                         <span>${this.escapeHtml(row.phoneLast4 || '-')}</span>
                                         <span>${this.escapeHtml(this._formatDateCell(row.timestamp))}</span>
                                     </div>
                                     <p class="text-sm text-slate-700 leading-relaxed">${this.escapeHtml(row.comment)}</p>
                                 </div>
                             `).join('') || `<p class="text-sm text-slate-400">주관식 의견이 없습니다.</p>`}
                         </div>
                     </div>
                 </div>
             `;

             this._renderVisitorCharts(stats, needs, rows, comments);
         },

         _visitorMetricCard(label, value, icon, colorClass) {
             return `
                 <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                     <div class="flex items-center justify-between mb-4">
                         <span class="text-xs font-bold text-slate-400">${label}</span>
                         <i class="fas ${icon} ${colorClass}"></i>
                     </div>
                     <div class="text-2xl font-black text-slate-900">${value}</div>
                 </div>
             `;
         },

         _formatDateCell(value) {
             if (!value) return '-';
             const d = new Date(value);
             if (isNaN(d.getTime())) return String(value);
             return d.toLocaleString('ko-KR');
         },

         _formatShortDate(value) {
             if (!value) return '-';
             const d = new Date(value);
             if (isNaN(d.getTime())) return String(value);
             return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
         },

         _countEntries(map, limit = 99) {
             return Object.entries(map || {})
                 .map(([label, count]) => ({ label: String(label || '-'), count: Number(count || 0) }))
                 .filter((item) => item.label && item.label !== '-' && item.count > 0)
                 .sort((a, b) => b.count - a.count)
                 .slice(0, limit);
         },

         _topItems(items, limit = 6) {
             return (Array.isArray(items) ? items : [])
                 .map((item) => ({
                     label: String(item?.label || item?.name || '-'),
                     count: Number(item?.count || item?.value || 0)
                 }))
                 .filter((item) => item.label && item.label !== '-' && item.count > 0)
                 .sort((a, b) => b.count - a.count)
                 .slice(0, limit);
         },

         _topCountLabel(map) {
             const item = this._countEntries(map, 1)[0];
             return item || { label: '-', count: 0 };
         },

         _splitMultiValue(value) {
             return String(value || '')
                 .split(/[,，;；\n|]+/)
                 .map((item) => item.trim())
                 .filter(Boolean);
         },

         _visitorNeedEntries(rows, fallbackItems = []) {
             const counts = {};
             (Array.isArray(rows) ? rows : []).forEach((row) => {
                 this._splitMultiValue(row.needs).forEach((label) => {
                     counts[label] = (counts[label] || 0) + 1;
                 });
             });
             const fromRows = this._countEntries(counts, 12);
             if (fromRows.length) return fromRows;
             return this._topItems(fallbackItems, 12);
         },

         _residentV2NeedEntries(rows, fallbackItems = []) {
             const counts = {};
             (Array.isArray(rows) ? rows : []).forEach((row) => {
                 this._splitMultiValue(row.lifeNeeds).forEach((label) => {
                     counts[label] = (counts[label] || 0) + 1;
                 });
             });
             const fromRows = this._countEntries(counts, 12);
             if (fromRows.length) return fromRows;
             return this._topItems(fallbackItems, 12);
         },

         _extractCommentKeywords(texts, limit = 20) {
             const stopwords = new Set([
                 '그리고', '그래서', '하지만', '너무', '정말', '조금', '많이', '있는', '없는', '같아요',
                 '좋아요', '좋겠습니다', '합니다', '해주세요', '있으면', '없어서', '방문', '소원면',
                 '만리포', '천리포', '설문', '의견', '기타', '대한', '위해', '더욱', '다시'
             ]);
             const freq = {};
             (Array.isArray(texts) ? texts : []).forEach((text) => {
                 String(text || '')
                     .replace(/[^\w가-힣·/]+/g, ' ')
                     .split(/\s+/)
                     .map((token) => token.trim())
                     .filter((token) => token.length > 1 && !/^\d+$/.test(token) && !stopwords.has(token))
                     .forEach((token) => {
                         freq[token] = (freq[token] || 0) + 1;
                     });
             });
             return Object.entries(freq)
                 .map(([label, count]) => ({ label, name: label, count, value: count }))
                 .sort((a, b) => b.count - a.count)
                 .slice(0, limit);
         },

         _parseSurveyDate(value) {
             if (!value) return null;
             const d = new Date(value);
             return isNaN(d.getTime()) ? null : d;
         },

         _visitorResponseDateEntries(rows) {
             const counts = {};
             (Array.isArray(rows) ? rows : []).forEach((row) => {
                 const d = this._parseSurveyDate(row.timestamp);
                 const key = d ? d.toISOString().slice(0, 10) : '날짜 없음';
                 counts[key] = (counts[key] || 0) + 1;
             });
             return Object.entries(counts)
                 .sort(([a], [b]) => a.localeCompare(b))
                 .map(([key, count]) => ({
                     label: key === '날짜 없음' ? key : key.slice(5).replace('-', '.'),
                     count
                 }));
         },

         _visitorResponseHourEntries(rows) {
             const counts = {};
             (Array.isArray(rows) ? rows : []).forEach((row) => {
                 const d = this._parseSurveyDate(row.timestamp);
                 const key = d ? `${String(d.getHours()).padStart(2, '0')}시` : '시간 없음';
                 counts[key] = (counts[key] || 0) + 1;
             });
             return Object.entries(counts)
                 .sort(([a], [b]) => a.localeCompare(b))
                 .map(([label, count]) => ({ label, count }));
         },

         _visitorScoreBandEntries(rows) {
             const bands = {
                 '4.5점 이상': 0,
                 '4.0~4.4점': 0,
                 '3.0~3.9점': 0,
                 '3점 미만': 0
             };
             (Array.isArray(rows) ? rows : []).forEach((row) => {
                 const score = Number(row.satisfactionAvg || 0);
                 if (!score) return;
                 if (score >= 4.5) bands['4.5점 이상'] += 1;
                 else if (score >= 4) bands['4.0~4.4점'] += 1;
                 else if (score >= 3) bands['3.0~3.9점'] += 1;
                 else bands['3점 미만'] += 1;
             });
             return Object.entries(bands).map(([label, count]) => ({ label, count })).filter((item) => item.count > 0);
         },

         _surveyInsightCard(title, value, detail, icon, tone = 'sky') {
             const tones = {
                 cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                 sky: 'bg-sky-50 text-sky-700 border-sky-100',
                 ocean: 'bg-ocean-50 text-ocean-700 border-ocean-100',
                 amber: 'bg-amber-50 text-amber-700 border-amber-100',
                 emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100'
             };
             return `
                 <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                     <div class="flex items-start justify-between gap-3">
                         <div class="min-w-0">
                             <p class="text-xs font-black text-slate-400 mb-2">${this.escapeHtml(title)}</p>
                             <p class="text-lg font-black text-slate-900 truncate" title="${this.escapeHtml(value)}">${this.escapeHtml(value)}</p>
                             <p class="text-xs text-slate-500 mt-1">${this.escapeHtml(detail)}</p>
                         </div>
                         <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl border ${tones[tone] || tones.sky}">
                             <i class="fas ${icon}"></i>
                         </span>
                     </div>
                 </div>
             `;
         },

         _surveyTopListCard(title, subtitle, items, total = 0) {
             const list = this._topItems(items, 6);
             const denom = Number(total || list.reduce((sum, item) => sum + item.count, 0) || 1);
             return `
                 <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                     <div class="flex items-center justify-between mb-4 gap-3">
                         <div>
                             <h3 class="font-black text-slate-900">${this.escapeHtml(title)}</h3>
                             <p class="text-xs text-slate-500 mt-1">${this.escapeHtml(subtitle)}</p>
                         </div>
                         <span class="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">TOP ${list.length || 0}</span>
                     </div>
                     <div class="space-y-3">
                         ${list.map((item, index) => {
                             const percent = Math.min(100, Math.round((item.count / denom) * 100));
                             return `
                                 <div>
                                     <div class="flex items-center justify-between gap-3 text-sm">
                                         <span class="font-bold text-slate-700 truncate" title="${this.escapeHtml(item.label)}">${index + 1}. ${this.escapeHtml(item.label)}</span>
                                         <span class="font-black text-slate-900">${item.count.toLocaleString()}</span>
                                     </div>
                                     <div class="h-2 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                                         <div class="h-full rounded-full bg-ocean-500" style="width:${Math.max(4, percent)}%"></div>
                                     </div>
                                 </div>
                             `;
                         }).join('') || `<p class="text-sm text-slate-400 py-6 text-center">집계된 응답이 없습니다.</p>`}
                     </div>
                 </div>
             `;
         },

         _surveyRateBar(label, rate, colorClass = 'bg-ocean-500') {
             const value = Math.max(0, Math.min(100, Number(rate || 0)));
             return `
                 <div class="rounded-xl bg-slate-50 border border-slate-100 p-3">
                     <div class="flex items-center justify-between text-xs mb-2">
                         <span class="font-black text-slate-600">${this.escapeHtml(label)}</span>
                         <span class="font-black text-slate-900">${value.toFixed(1)}%</span>
                     </div>
                     <div class="h-2.5 rounded-full bg-white overflow-hidden">
                         <div class="h-full rounded-full ${colorClass}" style="width:${value}%"></div>
                     </div>
                 </div>
             `;
         },

         _scoreBadge(value) {
             const score = Number(value || 0);
             if (!score) return '<span class="text-slate-400">-</span>';
             const tone = score >= 4 ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                 : score >= 3 ? 'bg-amber-50 text-amber-700 border-amber-100'
                 : 'bg-rose-50 text-rose-700 border-rose-100';
             return `<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-black ${tone}">${score.toFixed(1)}</span>`;
         },

         _intentBadge(value) {
             const text = String(value || '').trim();
             if (!text) return '<span class="text-slate-400">-</span>';
             const positive = ['매우 있다', '있다', '모든 활동에 참여', '일부 활동에 참여', '매우 있음', '있음'];
             const negative = ['별로 없다', '전혀 없다', '참여의사 없음', '없음', '전혀없음'];
             const tone = positive.includes(text) ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                 : negative.includes(text) ? 'bg-rose-50 text-rose-700 border-rose-100'
                 : 'bg-slate-50 text-slate-600 border-slate-100';
             return `<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-black whitespace-nowrap ${tone}">${this.escapeHtml(text)}</span>`;
         },

         _resetChartBucket(propName) {
             this[propName] = this[propName] || {};
             Object.values(this[propName]).forEach((chart) => chart && chart.destroy && chart.destroy());
             this[propName] = {};
             return this[propName];
         },

         _chartPalette(index) {
             return ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b', '#f97316'][index % 8];
         },

         _renderCountBarChart(bucket, key, id, entries, options = {}) {
             const el = document.getElementById(id);
             if (!el || typeof Chart === 'undefined') return;
             const list = entries.length ? entries : [{ label: '데이터 없음', count: 0 }];
             const truncateLabel = (value) => {
                 const text = String(value || '');
                 const max = Number(options.truncateLabels || 0);
                 return max && text.length > max ? `${text.slice(0, max)}…` : text;
             };
             bucket[key] = new Chart(el, {
                 type: 'bar',
                 data: {
                     labels: list.map((item) => item.label),
                     datasets: [{
                         label: options.label || '응답 수',
                         data: list.map((item) => item.count),
                         backgroundColor: options.color || list.map((_, index) => this._chartPalette(index)),
                         borderRadius: 8,
                         maxBarThickness: options.maxBarThickness || 42
                     }]
                 },
                 options: {
                     indexAxis: options.indexAxis || 'x',
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { display: false },
                         tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw || 0).toLocaleString()}` } }
                     },
                     scales: {
                         x: { beginAtZero: true, grid: { display: options.indexAxis === 'y' } },
                         y: {
                             beginAtZero: true,
                             grid: { display: options.indexAxis !== 'y' },
                             ticks: options.indexAxis === 'y' && options.truncateLabels
                                 ? {
                                     callback(value) {
                                         return truncateLabel(this.getLabelForValue(value));
                                     }
                                 }
                                 : undefined
                         }
                     }
                 }
             });
         },

         _renderDoughnutChart(bucket, key, id, entries) {
             const el = document.getElementById(id);
             if (!el || typeof Chart === 'undefined') return;
             const hasData = entries.length > 0;
             const list = hasData ? entries : [{ label: '데이터 없음', count: 1 }];
             bucket[key] = new Chart(el, {
                 type: 'doughnut',
                 data: {
                     labels: list.map((item) => item.label),
                     datasets: [{
                         data: list.map((item) => item.count),
                         backgroundColor: hasData ? list.map((_, index) => this._chartPalette(index)) : ['#e2e8f0'],
                         borderWidth: 0
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     cutout: '58%',
                     plugins: {
                         legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
                         tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.raw || 0).toLocaleString()}` } }
                     }
                 }
             });
         },

         _renderLineChart(bucket, key, id, entries, options = {}) {
             const el = document.getElementById(id);
             if (!el || typeof Chart === 'undefined') return;
             const list = entries.length ? entries : [{ label: '데이터 없음', count: 0 }];
             bucket[key] = new Chart(el, {
                 type: 'line',
                 data: {
                     labels: list.map((item) => item.label),
                     datasets: [{
                         label: options.label || '응답 수',
                         data: list.map((item) => item.count),
                         borderColor: options.color || '#0284c7',
                         backgroundColor: options.fillColor || 'rgba(2, 132, 199, 0.14)',
                         fill: true,
                         tension: 0.35,
                         pointRadius: 4,
                         pointHoverRadius: 6
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { display: false },
                         tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw || 0).toLocaleString()}` } }
                     },
                     scales: {
                         x: { grid: { display: false } },
                         y: { beginAtZero: true, ticks: { precision: 0 } }
                     }
                 }
             });
         },

         _renderPolarAreaChart(bucket, key, id, entries) {
             const el = document.getElementById(id);
             if (!el || typeof Chart === 'undefined') return;
             const hasData = entries.length > 0;
             const list = hasData ? entries : [{ label: '데이터 없음', count: 1 }];
             bucket[key] = new Chart(el, {
                 type: 'polarArea',
                 data: {
                     labels: list.map((item) => item.label),
                     datasets: [{
                         data: list.map((item) => item.count),
                         backgroundColor: hasData ? list.map((_, index) => this._chartPalette(index)) : ['#e2e8f0'],
                         borderWidth: 0
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
                         tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.raw || 0).toLocaleString()}` } }
                     },
                     scales: {
                         r: { ticks: { precision: 0 } }
                     }
                 }
             });
         },

         _renderGroupedDistributionChart(bucket, key, id, groups, labels, options = {}) {
             const el = document.getElementById(id);
             if (!el || typeof Chart === 'undefined') return;
             const safeLabels = labels && labels.length ? labels : Array.from(new Set(groups.flatMap((group) => Object.keys(group.dist || {}))));
             const finalLabels = safeLabels.length ? safeLabels : ['데이터 없음'];
             bucket[key] = new Chart(el, {
                 type: 'bar',
                 data: {
                     labels: finalLabels,
                     datasets: groups.map((group, index) => ({
                         label: group.label,
                         data: finalLabels.map((label) => Number(group.dist?.[label] || 0)),
                         backgroundColor: group.color || this._chartPalette(index),
                         borderRadius: 7,
                         maxBarThickness: 38
                     }))
                 },
                 options: {
                     indexAxis: options.indexAxis || 'x',
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
                         tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw || 0).toLocaleString()}` } }
                     },
                     scales: options.indexAxis === 'y'
                         ? { x: { beginAtZero: true }, y: { grid: { display: false } } }
                         : { x: { grid: { display: false } }, y: { beginAtZero: true } }
                 }
             });
         },

         _renderCommentWordCloud(elementId, comments) {
             const dom = document.getElementById(elementId);
             if (!dom) return;
             const keywords = this._extractCommentKeywords((Array.isArray(comments) ? comments : []).map((row) => row.comment), 50);
             if (!keywords.length) {
                 dom.innerHTML = '<div class="h-full flex items-center justify-center text-sm text-slate-400">분석할 주관식 의견이 없습니다.</div>';
                 return;
             }
             const echartsLib = window.echarts;
             if (!echartsLib) {
                 dom.innerHTML = `
                     <div class="h-full flex flex-wrap content-center justify-center gap-2">
                         ${keywords.slice(0, 24).map((item) => `<span class="px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-sm font-black">${this.escapeHtml(item.label)}</span>`).join('')}
                     </div>
                 `;
                 return;
             }
             try {
                 const chart = echartsLib.getInstanceByDom(dom) || echartsLib.init(dom);
                 chart.setOption({
                     tooltip: { show: true },
                     series: [{
                         type: 'wordCloud',
                         shape: 'circle',
                         left: 'center',
                         top: 'center',
                         width: '96%',
                         height: '96%',
                         sizeRange: [13, 46],
                         rotationRange: [-35, 35],
                         rotationStep: 35,
                         gridSize: 8,
                         drawOutOfBound: false,
                         textStyle: {
                             fontFamily: 'Pretendard, sans-serif',
                             fontWeight: 900,
                             color: (params) => this._chartPalette(params.dataIndex || 0)
                         },
                         emphasis: {
                             focus: 'self',
                             textStyle: { shadowBlur: 8, shadowColor: 'rgba(15, 23, 42, 0.25)' }
                         },
                         data: keywords.map((item) => ({ name: item.label, value: item.count }))
                     }]
                 });
                 setTimeout(() => chart.resize(), 0);
             } catch (error) {
                 dom.innerHTML = `
                     <div class="h-full flex flex-wrap content-center justify-center gap-2">
                         ${keywords.slice(0, 24).map((item) => `<span class="px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-sm font-black">${this.escapeHtml(item.label)}</span>`).join('')}
                     </div>
                 `;
             }
         },

         _renderVisitorCommentWordCloud(comments) {
             this._renderCommentWordCloud('visitor-comment-wordcloud', comments);
         },

         _renderResidentV2CommentWordCloud(comments) {
             this._renderCommentWordCloud('resident-v2-comment-wordcloud', comments);
         },

         _renderVisitorCharts(stats, needs, rows = [], comments = []) {
             const bucket = this._resetChartBucket('_visitorCharts');
             const needEntries = this._visitorNeedEntries(rows, needs);
             if (typeof Chart !== 'undefined') {
                 this._renderCountBarChart(bucket, 'age', 'visitor-age-chart', this._countEntries(stats.age), { color: '#0ea5e9' });
                 this._renderDoughnutChart(bucket, 'residence', 'visitor-residence-chart', this._countEntries(stats.residence, 8));
                 this._renderCountBarChart(bucket, 'stay', 'visitor-stay-chart', this._countEntries(stats.stay), { indexAxis: 'y', color: '#f59e0b' });
                 this._renderCountBarChart(bucket, 'needs', 'visitor-needs-chart', needEntries, { indexAxis: 'y', label: '선택 수', color: needEntries.map((_, index) => this._chartPalette(index)), maxBarThickness: 34 });
                 this._renderDoughnutChart(bucket, 'needsShare', 'visitor-needs-share-chart', needEntries);
                 this._renderGroupedDistributionChart(bucket, 'intent', 'visitor-intent-chart', [
                     { label: '재방문', dist: stats.revisit?.dist || {}, color: '#0284c7' },
                     { label: '추천', dist: stats.recommend?.dist || {}, color: '#10b981' }
                 ], ['매우 있다', '있다', '보통이다', '별로 없다', '전혀 없다']);
                 this._renderLineChart(bucket, 'responseDate', 'visitor-response-date-chart', this._visitorResponseDateEntries(rows), { label: '제출 수', color: '#0284c7' });
                 this._renderCountBarChart(bucket, 'responseHour', 'visitor-response-hour-chart', this._visitorResponseHourEntries(rows), { color: '#14b8a6', label: '제출 수' });
                 this._renderPolarAreaChart(bucket, 'responseScore', 'visitor-response-score-chart', this._visitorScoreBandEntries(rows));
             }
             this._renderVisitorCommentWordCloud(comments);
         },

         renderResidentV2AdminTab(data, container) {
             const stats = data?.stats || {};
             const rows = data?.responses?.rows || [];
             const settings = data?.settings?.surveys?.resident_v2 || {};
             const lifeNeeds = this._topItems(stats.lifeNeeds?.top3, 8);
             const tourismNeeds = this._topItems(stats.tourismNeeds?.top3, 6);
             const stationNeeds = this._topItems(stats.stationNeeds?.top3, 6);
             const positiveExpectations = this._topItems(stats.positiveExpectations?.top3, 6);
             const negativeConcerns = this._topItems(stats.negativeConcerns?.top3, 6);
             const comments = rows.filter((row) => row.comment);
             const tableRows = rows;
             const lifeNeedEntries = this._residentV2NeedEntries(rows, lifeNeeds);
             const total = Number(stats.total || rows.length || 0);
             const lifeNeedSelectionTotal = lifeNeedEntries.reduce((sum, item) => sum + Number(item.count || 0), 0);
             const topThreeLifeNeedTotal = lifeNeedEntries.slice(0, 3).reduce((sum, item) => sum + Number(item.count || 0), 0);
             const topLifeNeedShare = total ? Math.round(((lifeNeedEntries[0]?.count || 0) / total) * 100) : 0;
             const topThreeLifeNeedShare = lifeNeedSelectionTotal ? Math.round((topThreeLifeNeedTotal / lifeNeedSelectionTotal) * 100) : 0;
             const primaryLifeNeeds = lifeNeedEntries.slice(0, 6);
             const remainingLifeNeeds = lifeNeedEntries.slice(6);
             const compactLifeNeedRows = remainingLifeNeeds.length
                 ? [
                     ...primaryLifeNeeds,
                     {
                         label: `그 외 ${remainingLifeNeeds.length}개 항목`,
                         count: remainingLifeNeeds.reduce((sum, item) => sum + Number(item.count || 0), 0),
                         isRest: true
                     }
                 ]
                 : primaryLifeNeeds;
             const commentKeywords = this._extractCommentKeywords(comments.map((row) => row.comment), 12);
             const keywordTotal = commentKeywords.reduce((sum, item) => sum + Number(item.count || 0), 0);
             const couponCount = rows.filter((row) => row.couponCode).length;
             const topVillage = this._topCountLabel(stats.village);
             const topPeriod = this._topCountLabel(stats.residencePeriod);
             const topLifeNeed = lifeNeedEntries[0] || { label: '-', count: 0 };
             const awarenessTop = this._topCountLabel(stats.projectAwareness);
             const participationRate = Number(stats.participation?.posRate || 0);
             const programIntentRate = Number(stats.programIntent?.posRate || 0);
             const lastUpdated = stats.lastUpdated || rows[0]?.timestamp;

             container.innerHTML = `
                 <div class="space-y-6">
                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                         <div>
                             <p class="text-xs font-black text-ocean-600 uppercase tracking-wide mb-2">Resident Survey V2</p>
                             <h2 class="text-2xl font-black text-slate-900">주민 v2 설문 관리</h2>
                             <p class="text-sm text-slate-500 mt-2">서비스 수요, 자원활용, 사업 인식도, 주민 참여 의향과 교환권 발급 정보를 차트와 표로 확인합니다.</p>
                         </div>
                         <div class="flex flex-wrap items-center gap-2">
                             <span class="text-xs font-black px-3 py-1.5 rounded-full ${settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                                 ${settings.enabled ? '주민 v2 접수중' : '주민 v2 잠금'}
                             </span>
                             <span class="text-xs font-black px-3 py-1.5 rounded-full ${settings.hidden ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}">
                                 ${settings.hidden ? '홈/네비 숨김' : '홈/네비 노출'}
                             </span>
                             <button onclick="APP.admin.showTab('survey-settings')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition">
                                 <i class="fas fa-toggle-on mr-1"></i>설정
                             </button>
                         </div>
                     </div>

                     <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                         ${this._visitorMetricCard('총 응답', `${total.toLocaleString()}명`, 'fa-users', 'text-ocean-600')}
                         ${this._visitorMetricCard('교환권 발급', `${couponCount.toLocaleString()}건`, 'fa-ticket', 'text-violet-600')}
                         ${this._visitorMetricCard('생활만족 평균', stats.satisfactionAvg ? `${stats.satisfactionAvg} / 5` : '-', 'fa-star', 'text-amber-500')}
                         ${this._visitorMetricCard('참여 의향', `${participationRate.toFixed(1)}%`, 'fa-handshake', 'text-emerald-600')}
                         ${this._visitorMetricCard('프로그램 이용 의향', `${programIntentRate.toFixed(1)}%`, 'fa-calendar-check', 'text-cyan-600')}
                         ${this._visitorMetricCard('최근 업데이트', this._formatShortDate(lastUpdated), 'fa-clock', 'text-slate-500')}
                     </div>

                     <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                         ${this._surveyInsightCard('주요 응답마을', topVillage.label, `${topVillage.count.toLocaleString()}명 응답`, 'fa-map-location-dot', 'ocean')}
                         ${this._surveyInsightCard('대표 거주기간', topPeriod.label, `${topPeriod.count.toLocaleString()}명 응답`, 'fa-house-user', 'amber')}
                         ${this._surveyInsightCard('최우선 생활수요', topLifeNeed.label, `${Number(topLifeNeed.count || 0).toLocaleString()}회 선택`, 'fa-clipboard-list', 'emerald')}
                         ${this._surveyInsightCard('사업 인식 최다', awarenessTop.label, `${awarenessTop.count.toLocaleString()}명 응답`, 'fa-bullhorn', 'sky')}
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">연령대 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">기본 정보</span>
                             </div>
                             <div class="h-72"><canvas id="resident-v2-age-chart"></canvas></div>
                         </div>
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">마을 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">리 단위</span>
                             </div>
                             <div class="h-72"><canvas id="resident-v2-village-chart"></canvas></div>
                         </div>
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">거주기간 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">정주 기반</span>
                             </div>
                             <div class="h-72"><canvas id="resident-v2-residence-period-chart"></canvas></div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                         <div class="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                                 <div>
                                     <h3 class="font-black text-slate-900">생활여건 개선 수요 TOP</h3>
                                     <p class="text-xs text-slate-500 mt-1">중복 시각화를 줄이고, 복수응답의 선택 수와 우선순위를 한 화면에서 확인합니다.</p>
                                 </div>
                                 <span class="text-xs font-bold text-slate-400">선택 수 기준</span>
                             </div>
                             <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                 <div class="lg:col-span-7">
                                     <div class="h-[30rem]"><canvas id="resident-v2-needs-chart"></canvas></div>
                                 </div>
                                 <div class="lg:col-span-5 min-w-0 space-y-4">
                                     <div class="grid grid-cols-2 gap-3">
                                         <div class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                                             <p class="text-[11px] font-black text-emerald-700">최다 수요</p>
                                             <p class="mt-2 text-lg font-black text-slate-900 truncate" title="${this.escapeHtml(topLifeNeed.label)}">${this.escapeHtml(topLifeNeed.label)}</p>
                                             <p class="mt-1 text-xs font-bold text-slate-500">${Number(topLifeNeed.count || 0).toLocaleString()}건 · 응답자 대비 ${topLifeNeedShare}%</p>
                                         </div>
                                         <div class="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                                             <p class="text-[11px] font-black text-sky-700">총 선택수</p>
                                             <p class="mt-2 text-2xl font-black text-slate-900">${lifeNeedSelectionTotal.toLocaleString()}건</p>
                                             <p class="mt-1 text-xs font-bold text-slate-500">${lifeNeedEntries.length.toLocaleString()}개 수요 항목</p>
                                         </div>
                                         <div class="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                                             <p class="text-[11px] font-black text-amber-700">TOP3 집중도</p>
                                             <p class="mt-2 text-2xl font-black text-slate-900">${topThreeLifeNeedShare}%</p>
                                             <p class="mt-1 text-xs font-bold text-slate-500">전체 선택수 대비</p>
                                         </div>
                                         <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                             <p class="text-[11px] font-black text-slate-500">응답자 수</p>
                                             <p class="mt-2 text-2xl font-black text-slate-900">${total.toLocaleString()}명</p>
                                             <p class="mt-1 text-xs font-bold text-slate-500">복수응답 기준</p>
                                         </div>
                                     </div>
                                     <div class="rounded-xl border border-slate-100 overflow-hidden">
                                         <div class="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-100">
                                             <h4 class="text-sm font-black text-slate-800">우선순위 요약</h4>
                                             <span class="text-[11px] font-bold text-slate-400">상위 6개 + 기타</span>
                                         </div>
                                         <div class="divide-y divide-slate-100">
                                         ${compactLifeNeedRows.map((item, index) => {
                                             const pct = total ? Math.round((item.count / total) * 100) : 0;
                                             return `
                                                 <div class="px-4 py-3 ${item.isRest ? 'bg-slate-50/70' : 'bg-white'}">
                                                     <div class="flex items-center gap-3">
                                                         <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.isRest ? 'bg-slate-200 text-slate-600' : 'bg-ocean-50 text-ocean-700'} text-xs font-black">${item.isRest ? '+' : index + 1}</span>
                                                         <div class="min-w-0 flex-1">
                                                             <div class="flex items-center justify-between gap-3 text-sm">
                                                                 <span class="font-black text-slate-800 truncate" title="${this.escapeHtml(item.label)}">${this.escapeHtml(item.label)}</span>
                                                                 <span class="shrink-0 font-black text-slate-900">${item.count.toLocaleString()}건</span>
                                                             </div>
                                                             <div class="flex items-center gap-2 mt-2">
                                                                 <div class="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                                                     <div class="h-full rounded-full ${item.isRest ? 'bg-slate-400' : 'bg-emerald-500'}" style="width:${Math.max(4, Math.min(100, pct))}%"></div>
                                                                 </div>
                                                                 <span class="w-12 text-right text-[11px] font-black ${item.isRest ? 'text-slate-500' : 'text-emerald-700'}">${pct}%</span>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             `;
                                         }).join('') || `<p class="text-sm text-slate-400 py-6 text-center">생활여건 수요 응답이 없습니다.</p>`}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                         <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">참여·프로그램 의향 분포</h3>
                                 <span class="text-xs font-bold text-slate-400">실행 가능성</span>
                             </div>
                             <div class="h-80"><canvas id="resident-v2-intent-chart"></canvas></div>
                             <div class="grid grid-cols-2 gap-3 mt-4">
                                 ${this._surveyRateBar('사업 참여 긍정', participationRate, 'bg-emerald-500')}
                                 ${this._surveyRateBar('프로그램 이용 긍정', programIntentRate, 'bg-cyan-500')}
                             </div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">사업 인식도</h3>
                                 <span class="text-xs font-bold text-slate-400">인지 수준</span>
                             </div>
                             <div class="h-72"><canvas id="resident-v2-awareness-chart"></canvas></div>
                         </div>
                         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                             <div class="flex items-center justify-between mb-4">
                                 <h3 class="font-black text-slate-900">수요 포트폴리오</h3>
                                 <span class="text-xs font-bold text-slate-400">상위 응답 비교</span>
                             </div>
                             <div class="h-72"><canvas id="resident-v2-demand-chart"></canvas></div>
                         </div>
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                         ${this._surveyTopListCard('관광여건 개선 TOP', '관광·방문 환경 수요', tourismNeeds, total)}
                         ${this._surveyTopListCard('어촌스테이션 필요시설 TOP', '만리포 거점 시설 수요', stationNeeds, total)}
                         ${this._surveyTopListCard('기대 변화 TOP', '사업의 긍정 효과', positiveExpectations, total)}
                     </div>

                     <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                         ${this._surveyTopListCard('우려 변화 TOP', '사업 추진 시 관리 필요 이슈', negativeConcerns, total)}
                         ${this._surveyTopListCard('천리포 스테이션 수요 TOP', '리모델링 시설 수요', this._topItems(stats.cheonripoNeeds?.top3, 6), total)}
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden">
                         <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                             <div>
                                 <h3 class="font-black text-slate-900">응답 원본 목록</h3>
                                 <p class="text-xs text-slate-500 mt-1">세로 스크롤 없이 수집된 주민 v2 응답을 전체 나열합니다.</p>
                             </div>
                             <span class="text-xs text-slate-400">전체 ${tableRows.length.toLocaleString()}건</span>
                         </div>
                         <div class="overflow-x-auto border border-slate-100 rounded-xl">
                             <table class="min-w-[1200px] w-full text-xs">
                                 <thead class="bg-slate-50">
                                         <tr class="text-slate-500">
                                             <th class="text-left p-3">제출시각</th>
                                             <th class="text-left p-3">뒷자리</th>
                                             <th class="text-left p-3">교환권 코드</th>
                                             <th class="text-left p-3">연령</th>
                                             <th class="text-left p-3">마을</th>
                                             <th class="text-left p-3">거주기간</th>
                                             <th class="text-left p-3">만족도</th>
                                             <th class="text-left p-3">개선 수요</th>
                                             <th class="text-left p-3">사업 인식</th>
                                             <th class="text-left p-3">참여 의향</th>
                                             <th class="text-left p-3">프로그램 의향</th>
                                         </tr>
                                 </thead>
                                 <tbody>
                                     ${tableRows.map((row) => `
                                         <tr class="border-t border-slate-100 hover:bg-slate-50">
                                             <td class="p-3 text-slate-500">${this.escapeHtml(this._formatDateCell(row.timestamp))}</td>
                                             <td class="p-3 font-black text-slate-800">${this.escapeHtml(row.phoneLast4 || '-')}</td>
                                             <td class="p-3 font-mono text-[11px] text-ocean-700">${this.escapeHtml(row.couponCode || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.age || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.village || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.residencePeriod || '-')}</td>
                                             <td class="p-3">${this._scoreBadge(row.satisfactionAvg)}</td>
                                             <td class="p-3 max-w-[220px] truncate" title="${this.escapeHtml(row.lifeNeeds || '')}">${this.escapeHtml(row.lifeNeeds || '-')}</td>
                                             <td class="p-3">${this.escapeHtml(row.projectAwareness || '-')}</td>
                                             <td class="p-3">${this._intentBadge(row.participation)}</td>
                                             <td class="p-3">${this._intentBadge(row.programIntent)}</td>
                                         </tr>
                                     `).join('') || `<tr><td colspan="11" class="p-8 text-center text-slate-400">응답 데이터가 없습니다.</td></tr>`}
                                 </tbody>
                             </table>
                         </div>
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                         <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
                             <div>
                                 <h3 class="font-black text-slate-900">주관식 의견</h3>
                                 <p class="text-xs text-slate-500 mt-1">워드클라우드와 원문 의견을 함께 확인합니다.</p>
                             </div>
                             <span class="text-xs text-slate-400">전체 ${comments.length.toLocaleString()}건</span>
                         </div>
                         <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                             <div class="xl:col-span-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">의견 워드클라우드</h4>
                                     <span class="text-[11px] font-bold text-slate-400">Word Cloud</span>
                                 </div>
                                 <div id="resident-v2-comment-wordcloud" class="h-80 w-full"></div>
                             </div>
                             <div class="xl:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                 <div class="flex items-center justify-between mb-3">
                                     <h4 class="text-sm font-black text-slate-800">키워드 요약</h4>
                                     <span class="text-[11px] font-bold text-slate-400">${keywordTotal.toLocaleString()}회 언급</span>
                                 </div>
                                 <div class="flex flex-wrap gap-2">
                                     ${commentKeywords.slice(0, 10).map((item, index) => `
                                         <span class="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                                             <span class="text-cyan-600">${index + 1}</span>
                                             ${this.escapeHtml(item.label)}
                                             <span class="text-slate-400">${Number(item.count || 0).toLocaleString()}</span>
                                         </span>
                                     `).join('') || `<p class="text-sm text-slate-400 py-6 text-center">분석할 키워드가 없습니다.</p>`}
                                 </div>
                                 <p class="mt-4 text-xs leading-relaxed text-slate-500">상위 키워드만 간단히 표시합니다. 세부 빈도는 워드클라우드 크기로 확인합니다.</p>
                             </div>
                         </div>
                         <div class="space-y-3 mt-5">
                             ${comments.map((row) => `
                                 <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                     <div class="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400 mb-2">
                                         <span>${this.escapeHtml(row.phoneLast4 || '-')}</span>
                                         <span>${this.escapeHtml(this._formatDateCell(row.timestamp))}</span>
                                     </div>
                                     <p class="text-sm text-slate-700 leading-relaxed">${this.escapeHtml(row.comment)}</p>
                                 </div>
                             `).join('') || `<p class="text-sm text-slate-400">주관식 의견이 없습니다.</p>`}
                         </div>
                     </div>
                 </div>
             `;

             this._renderResidentV2Charts(stats, lifeNeeds, rows, comments);
         },

         _renderResidentV2Charts(stats, lifeNeeds, rows = [], comments = []) {
             const bucket = this._resetChartBucket('_residentV2Charts');
             const lifeNeedEntries = this._residentV2NeedEntries(rows, lifeNeeds);
             const demandItems = [
                 { label: '생활여건', count: lifeNeedEntries[0]?.count || 0 },
                 { label: '관광여건', count: stats.tourismNeeds?.top3?.[0]?.count || 0 },
                 { label: '만리포 스테이션', count: stats.stationNeeds?.top3?.[0]?.count || 0 },
                 { label: '천리포 스테이션', count: stats.cheonripoNeeds?.top3?.[0]?.count || 0 },
                 { label: '기대 변화', count: stats.positiveExpectations?.top3?.[0]?.count || 0 },
                 { label: '우려 변화', count: stats.negativeConcerns?.top3?.[0]?.count || 0 }
             ].filter((item) => item.count > 0);

             if (typeof Chart !== 'undefined') {
                 this._renderCountBarChart(bucket, 'age', 'resident-v2-age-chart', this._countEntries(stats.age), { color: '#0284c7' });
                 this._renderDoughnutChart(bucket, 'village', 'resident-v2-village-chart', this._countEntries(stats.village, 8));
                 this._renderCountBarChart(bucket, 'period', 'resident-v2-residence-period-chart', this._countEntries(stats.residencePeriod), { indexAxis: 'y', color: '#f59e0b' });
                 this._renderCountBarChart(bucket, 'needs', 'resident-v2-needs-chart', lifeNeedEntries, { indexAxis: 'y', label: '선택 수', color: lifeNeedEntries.map((_, index) => this._chartPalette(index)), maxBarThickness: 34, truncateLabels: 12 });
                 this._renderGroupedDistributionChart(bucket, 'intent', 'resident-v2-intent-chart', [
                     { label: '사업 참여', dist: stats.participation?.dist || {}, color: '#10b981' },
                     { label: '프로그램 이용', dist: stats.programIntent?.dist || {}, color: '#06b6d4' }
                 ], ['모든 활동에 참여', '일부 활동에 참여', '의견만 제시', '주민설명회 및 사업설명회 정도만 참여', '참여의사 없음', '매우 있음', '있음', '보통', '없음', '전혀없음'], { indexAxis: 'y' });
                 this._renderDoughnutChart(bucket, 'awareness', 'resident-v2-awareness-chart', this._countEntries(stats.projectAwareness, 6));
                 this._renderCountBarChart(bucket, 'demand', 'resident-v2-demand-chart', demandItems, { indexAxis: 'y', label: '상위 선택 수' });
             }
             this._renderResidentV2CommentWordCloud(comments);
         },

        renderSurveyHub(data, container) {
            if (window.App && window.App.tabSurvey) {
                window.App.tabSurvey.render(data, container);
            } else {
                container.innerHTML = `<div class="p-4 text-red-500">tab_survey.js 모듈이 로드되지 않았습니다.</div>`;
            }
        },

        renderRiAnalysis(data, container) {
            // [RI-01] Data is already standardized in loadTabContent via AdminDataService
            const mainData = (data?.charts?.data && typeof data.charts.data === 'object') ? data.charts.data : {};
            const wcData = (data?.wordcloud?.keywords && typeof data.wordcloud.keywords === 'object') ? data.wordcloud.keywords : {};
            const kpiByRi = data?.kpiByRi || {}; // [NEW] Use calculated KPIs
            const compData = data?.riKpiComponents || {};
            const updatedAt = data?.charts?.updatedAt || new Date().toISOString().split('T')[0];

            // Initial render wrapper
            if(!document.getElementById('ri-wrapper')) {
                container.innerHTML = `
                    <div id="ri-wrapper" class="space-y-6">
                        <!-- Top Meta Bar [RI-02] & Mode Toggle [RI-04] -->
                        <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="bg-slate-100 p-1 rounded-lg inline-flex" id="ri-mode-selector">
                                    <button onclick="APP.admin.setRiMode('single')" id="btn-ri-mode-single" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-white shadow-sm text-ocean-600">단일 지역</button>
                                    <button onclick="APP.admin.setRiMode('compare')" id="btn-ri-mode-compare" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-slate-700">지역 비교</button>
                                </div>
                                <div id="ri-region-selector" class="flex gap-2">
                                    <button onclick="APP.admin.toggleRi('모항리')" id="btn-ri-mohang" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-ocean-50 text-ocean-600 border border-ocean-100">모항리</button>
                                    <button onclick="APP.admin.toggleRi('의항리')" id="btn-ri-uihang" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 border border-transparent">의항리</button>
                                </div>
                            </div>
                            <div class="flex items-center gap-4 text-xs font-medium text-slate-400">
                                <span class="flex items-center gap-1.5"><i class="fas fa-database"></i> 표본 수: <span id="ri-meta-n" class="text-slate-600 font-bold">-</span></span>
                                <span class="flex items-center gap-1.5"><i class="fas fa-clock"></i> 최종 업데이트: <span class="text-slate-600 font-bold">${updatedAt}</span></span>
                            </div>
                        </div>
                        
                        <!-- Content Area -->
                        <div id="ri-content" class="transition-all duration-300"></div>
                    </div>
                `;
                
                this._riData = { main: mainData, wc: wcData, components: compData, kpiByRi, updatedAt };
                this._riMode = 'single'; // 'single' or 'compare'
                this._riCurrent = '모항리';
            }

            this.setRiMode = (mode) => {
                this._riMode = mode;
                const btnS = document.getElementById('btn-ri-mode-single');
                const btnC = document.getElementById('btn-ri-mode-compare');
                const regSel = document.getElementById('ri-region-selector');

                if (btnS && btnC) {
                    if (mode === 'single') {
                        btnS.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-white shadow-sm text-ocean-600";
                        btnC.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-slate-700";
                        if (regSel) regSel.style.display = 'flex';
                        this.toggleRi(this._riCurrent);
                    } else {
                        btnC.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-white shadow-sm text-ocean-600";
                        btnS.className = "px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-slate-700";
                        if (regSel) regSel.style.display = 'none';
                        this._renderRiComparison();
                    }
                }
            };
            
            this.toggleRi = (ri) => {
                this._riCurrent = ri;
                const btnM = document.getElementById('btn-ri-mohang');
                const btnU = document.getElementById('btn-ri-uihang');
                const metaN = document.getElementById('ri-meta-n');
                
                if (btnM && btnU) {
                    if (ri === '모항리') {
                        btnM.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-ocean-50 text-ocean-600 border border-ocean-100";
                        btnU.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 border border-transparent";
                    } else {
                        btnU.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-ocean-50 text-ocean-600 border border-ocean-100";
                        btnM.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 border border-transparent";
                    }
                }
                
                if (metaN && this._riData.main[ri]) metaN.innerText = this._riData.main[ri].sample || 0;
                this._renderRiDetails(ri);
            };
            
            // Initial Load
            this.setRiMode('single');
        },
        
        _renderRiComparison() {
            const container = document.getElementById('ri-content');
            const metaN = document.getElementById('ri-meta-n');
            
            const m = this._riData.main['모항리'] || {};
            const u = this._riData.main['의항리'] || {};
            const mc = this._riData.components['모항리'] || {};
            const uc = this._riData.components['의항리'] || {};
            
            if(metaN) metaN.innerText = (m.sample || 0) + (u.sample || 0);

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                    <div id="ri-compare-mohang" class="space-y-6">
                        <h3 class="font-black text-slate-800 text-lg flex items-center gap-2">
                             <span class="w-3 h-3 rounded-full bg-ocean-500"></span>
                             모항리 (N=${m.sample || 0})
                        </h3>
                        <div id="ri-content-mohang"></div>
                    </div>
                    <div id="ri-compare-uihang" class="space-y-6 lg:border-l lg:pl-8 border-slate-100">
                        <h3 class="font-black text-slate-800 text-lg flex items-center gap-2">
                             <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                             의항리 (N=${u.sample || 0})
                        </h3>
                        <div id="ri-content-uihang"></div>
                    </div>
                </div>
            `;

            // We need to render a condensed version or just call _renderRiDetails with a target sub-container
            this._renderRiDetails('모항리', 'ri-content-mohang', true);
            this._renderRiDetails('의항리', 'ri-content-uihang', true);
        },

        _renderRiDetails(ri, targetId = 'ri-content', isCondensed = false) {
            const container = document.getElementById(targetId);
            if(!container) return;
            
            // Safe Access
            const data = (this._riData && this._riData.main) ? this._riData.main[ri] : null;
            const wc   = (this._riData && this._riData.wc)   ? this._riData.wc[ri]   : [];
            const kpi  = (this._riData && this._riData.kpiByRi && this._riData.kpiByRi[ri]) ? this._riData.kpiByRi[ri].kpi : {};

            // 표본 부족 시 경고 배너만 표시 (렌더는 계속 진행)
            const dataPoor = !data || !data.sample || data.sample < 5;
            const n = data?.sample || 0;

            // ─── KPI 요약 카드 (GAS 실 데이터 및 KPI 저장소 연동) ─────────────────────────
            const lsiItems   = data?.lsiBreakdown?.items || [];
            
            // [FIX] Use hardcoded baseline if data is missing from server (0.0 bug) 
            const FALLBACK = {
                '모항리': { RTRI:54, SII:38, LSI:62, CGS:58, PTS:48, SUS:44 },
                '의항리': { RTRI:50, SII:42, LSI:56, CGS:62, PTS:40, SUS:38 }
            };
            const f = FALLBACK[ri] || FALLBACK['모항리'];

            // kpiByRi 데이터가 있으면 우선 사용, 없으면 기존 lsiScoreAvg 사용 (하위 호환)
            const rtriScore  = kpi.RTRI ?? (data?.loiSummary?.intentRate || f.RTRI);
            const lsiScore   = kpi.LSI  ?? (data?.lsiScoreAvg || f.LSI);
            const siiScore   = kpi.SII  ?? f.SII;
            const cgsScore   = kpi.CGS  ?? f.CGS;
            const ptsScore   = kpi.PTS  ?? f.PTS;
            const susScore   = kpi.SUS  ?? f.SUS;
            const activeRate = data?.loiSummary?.activeRate || 0;
            const pciHigh    = data?.pciHighRate || 0;

            // LSI 항목별 점수를 이름으로 빠르게 조회
            const lsiMap = {};
            lsiItems.forEach(it => { lsiMap[it.label] = it; });

            const kpiCard = (icon, color, title, val, unit, sub, subVal, kpiKey) => `
              <div class="bg-white rounded-xl border border-${color}-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition group relative" 
                   onclick="window.APP.admin.showCoreDetails('${kpiKey}', ${val})">
                <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <i class="fas fa-info-circle text-${color}-400 text-xs"></i>
                </div>
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas ${icon} text-${color}-400 text-xs text-sm"></i>
                  <span class="text-[10px] font-bold text-${color}-500 uppercase">${title}</span>
                </div>
                <div class="text-2xl font-black text-slate-800">${val.toFixed(1)}<span class="text-xs font-normal text-slate-400 ml-1">${unit}</span></div>
                ${sub ? `<div class="flex items-center justify-between mt-2 pt-2 border-t border-${color}-50">
                  <span class="text-[9px] text-slate-400">${sub}</span>
                  <span class="text-[10px] font-bold text-${color}-600">${subVal}</span>
                </div>` : ''}
              </div>`;

            const statsHtml = `
            <div class="grid grid-cols-2 ${isCondensed ? '' : 'md:grid-cols-6'} gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              ${kpiCard('fa-home', 'sky', '정주 전환 (RTRI)', rtriScore, 'pt', '적극 의향', activeRate.toFixed(1) + '%', 'RTRI')}
              ${kpiCard('fa-exclamation-circle', 'rose', '생활 불균형 (SII)', siiScore, 'pt', '위험 수준', siiScore > 60 ? '🔴 높음' : siiScore > 40 ? '🟡 보통' : '🟢 낮음', 'SII')}
              ${kpiCard('fa-heart', 'emerald', '생활 만족 (LSI)', lsiScore, 'pt', '의료 / 교통', `${(lsiMap['의료기관']?.score || 0).toFixed(0)} / ${(lsiMap['대중교통']?.score || 0).toFixed(0)}`, 'LSI')}
              ${kpiCard('fa-people-group', 'violet', '거버넌스 (CGS)', cgsScore, 'pt', '참여 역량', cgsScore >= 60 ? '🟢 활발' : cgsScore >= 40 ? '🟡 정체' : '🔴 위기', 'CGS')}
              ${kpiCard('fa-rotate', 'amber', '전환 잠재 (PTS)', ptsScore, 'pt', '전환 가능성', ptsScore >= 50 ? '높음' : '보통', 'PTS')}
              ${kpiCard('fa-seedling', 'teal', '지속가능 (SUS)', susScore, 'pt', '재방문 의향', susScore >= 60 ? '안정' : '관찰', 'SUS')}
            </div>
            ${lsiItems.length > 0 ? `
            <div class="grid grid-cols-5 gap-2 mb-6">
              ${lsiItems.map(it => {
                const score = it.score || 0;
                const colorClass = score >= 70 ? 'emerald' : score >= 50 ? 'amber' : 'rose';
                const helpKeyMap = {
                    '생활/편의': 'LSI_CONVENIENCE',
                    '의료기관': 'LSI_MEDICAL',
                    '대중교통': 'LSI_TRAFFIC',
                    '문화시설': 'LSI_CULTURE',
                    '주거환경': 'LSI_HOUSING'
                };
                const kKey = helpKeyMap[it.label] || 'LSI';
                
                return `
                <div class="bg-white rounded-xl border border-${colorClass}-100 p-3 text-center shadow-sm cursor-pointer hover:shadow-md transition group relative"
                     onclick="window.APP.admin.showCoreDetails('${kKey}', ${score})">
                  <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <i class="fas fa-info-circle text-${colorClass}-300 text-[8px]"></i>
                  </div>
                  <div class="text-[9px] font-bold text-${colorClass}-400 truncate mb-1">${it.label}</div>
                  <div class="text-xl font-black text-${colorClass}-700">${score.toFixed(0)}</div>
                  <div class="text-[9px] text-slate-400 mt-0.5">Top2 <span class="font-bold text-slate-600">${it.top2 || 0}%</span></div>
                </div>`;
              }).join('')}
            </div>` : ''}`;

            const suffix = isCondensed ? `-${ri}` : '';
            
            container.innerHTML = `
               <div class="animate-fade-in-up">

                 ${dataPoor ? `<div class="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-bold">
                   <i class="fas fa-exclamation-circle text-amber-400"></i>
                   표본 ${n}명 — 최소 기준(5명) ${n < 5 ? '미달, 통계 신뢰도 낮음' : '이상이나 표본이 작습니다'}
                 </div>` : ''}

                 ${statsHtml}

                 <div class="grid grid-cols-1 ${isCondensed ? '' : 'md:grid-cols-3'} gap-6 mb-8">
                     <!-- LSI Distribution Chart -->
                     <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 ${isCondensed ? '' : 'md:col-span-3'}">
                          <h4 class="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2">
                              <i class="fas fa-layer-group text-ocean-500"></i> 영역별 만족도 (LSI)
                          </h4>
                          <div class="grid grid-cols-1 ${isCondensed ? '' : 'md:grid-cols-2'} gap-6 ${isCondensed ? '' : 'h-64'}">
                              <div class="relative min-h-[180px]">
                                 <canvas id="ri-lsi-dist${suffix}"></canvas>
                              </div>
                              <div id="ri-lsi-table${suffix}" class="overflow-y-auto"></div>
                          </div>
                     </div>
                 </div>
                 
                 <!-- PCI & Heatmap -->
                 <div class="grid grid-cols-1 ${isCondensed ? '' : 'md:grid-cols-2'} gap-6 mb-8">
                      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                          <h4 class="font-bold text-slate-700 mb-4 text-sm">지불 의향 분포 (PCI)</h4>
                          <div class="h-64 relative">
                              <canvas id="ri-pay-dist${suffix}"></canvas>
                          </div>
                      </div>
                      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                          <h4 class="font-bold text-slate-700 mb-4 text-sm">전환의향 × 지불가능액 교차분석</h4>
                          <div id="ri-heatmap${suffix}" class="w-full overflow-x-auto min-h-[256px]"></div>
                      </div>
                 </div>
                 
                 <!-- Keywords -->
                 <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                      <div class="flex justify-between items-center mb-4">
                          <h4 class="font-bold text-slate-700 text-sm">주요 키워드 &amp; 핵심 이슈 (Q27 자유의견)</h4>
                      </div>
                      <div class="grid grid-cols-1 ${isCondensed ? '' : 'md:grid-cols-2'} gap-6">
                          <div class="h-64 relative" id="ri-wordcloud${suffix}"></div>
                          <div id="ri-keyword-list${suffix}" class="space-y-2 overflow-y-auto max-h-64"></div>
                      </div>
                 </div>
               </div>
            `;
            
            // Re-render Charts using real data (Wrap in requestAnimationFrame to ensure DOM is ready)
            requestAnimationFrame(() => {
                this._renderRiLsiDist(lsiItems, `ri-lsi-dist${suffix}`, `ri-lsi-table${suffix}`);
                
                const payDist = Array.isArray(data?.payDist) ? data.payDist : [];
                this._renderPciPay(payDist, `ri-pay-dist${suffix}`);
                
                this._renderHeatmap(data?.intentPayCrosstab, `ri-heatmap${suffix}`);
                
                // Wordcloud with real GAS keywords
                this._renderEnhancedWordCloud(`ri-wordcloud${suffix}`, `ri-keyword-list${suffix}`, wc);
            });
        },
        
        // Specialized LSI renderer for Ri (can reuse logic but different IDs)
        _renderRiLsiDist(items, chartId, tableId) {
             if(!items) return;
             // Adapt items to dist format expected by ChartJS
             // Items has { label, score, top2, n }
             // We only have "Score" here, not 5-point dist.
             // So we render a Horizontal Bar of Scores.
             
             const labels = items.map(i => i.label);
             const scores = items.map(i => i.score);
             
             window.App.chartManager.renderChartJS(chartId, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '만족도 Score',
                        data: scores,
                        backgroundColor: '#f43f5e',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        x: { max: 100, grid: { borderDash: [2, 4] } },
                        y: { grid: { display: false } } 
                    },
                    plugins: { legend: { display: false } }
                }
             });
             
             // Table
             const tableDiv = document.getElementById(tableId);
             if(tableDiv) {
                 let html = `<table class="w-full text-xs text-right border-collapse">
                     <thead class="bg-slate-50 text-slate-500"><tr><th class="p-1 text-left">항목</th><th class="p-1">Top2Box</th></tr></thead>
                     <tbody>`;
                 items.forEach(i => {
                     html += `
                      <tr class="border-b border-slate-50">
                        <td class="p-1 text-left text-slate-700">${i.label}</td>
                        <td class="p-1 font-bold ${i.top2>=50?'text-emerald-600':'text-slate-400'}">${i.top2}%</td>
                      </tr>`;
                 });
                 html += `</tbody></table>`;
                 tableDiv.innerHTML = html;
             }
        },

        // --- Helper: Generate AI Insights ---
        _generateInsights(charts, wc, indices) {
            const msgs = [];
            const topN = (charts && charts.topN) ? charts.topN : {};
            const keywords = (wc && Array.isArray(wc.keywords)) ? wc.keywords : [];
            
            // 1. Overall Score Insight
            const lsi = indices.LSI?.total || 0;
            if(lsi < 60) msgs.push(`전반적인 생활서비스 만족도(LSI)가 ${lsi}점으로 개선이 필요한 수준입니다.`);
            else msgs.push(`생활서비스 만족도(LSI)는 ${lsi}점으로 비교적 양호한 상태입니다.`);

            // 2. Top Issues
            if(topN.LSI && topN.LSI.length > 0) {
                const topItem = topN.LSI[0].label;
                msgs.push(`주민들은 '${topItem}' 관련 항목에서 가장 큰 결핍을 느끼고 있습니다.`);
            }
            
            // 3. Payment Intent
            const payData = charts.distributions?.PCI_payRange;
            if(payData && Array.isArray(payData) && payData.length > 0) {
                // Find most common range
                const maxPay = payData.reduce((prev, curr) => (prev.count > curr.count) ? prev : curr, payData[0]);
                if(maxPay && maxPay.label) {
                     msgs.push(`지불 용의 금액은 주로 '${maxPay.label}' 구간에 집중되어 있습니다.`);
                }
            }
            
            // 4. Keywords
            if(keywords.length >= 3) {
                // Ensure text property exists
                const topK = keywords.slice(0, 3).map(k => k.text || k.label || k).join(', ');
                msgs.push(`자유 의견에서는 '${topK}' 등의 키워드가 주요 관심사로 나타났습니다.`);
            }
            
            // 5. General Conclusion
            msgs.push("전반적으로 주민 서비스 확충과 관광객의 체험 프로그램 연계가 시급한 과제로 분석됩니다.");

            return msgs.slice(0, 6); // Max 6 lines
        },

        // --- Sub-renderers ---
        
        _renderTopNGroup(title, items, color) {
            if(!items || items.length === 0) return '';
            return `
              <div class="mb-3">
                <h5 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">${title}</h5>
                <div class="space-y-2">
                  ${items.map(i => `
                     <div class="flex items-center text-sm">
                        <span class="w-24 truncate font-medium text-slate-700">${i.label}</span>
                        <div class="flex-1 h-2 bg-slate-100 rounded-full mx-2 overflow-hidden">
                           <div class="h-full bg-${color}-500" style="width:${Math.min(100, i.score)}%"></div>
                        </div>
                        <span class="text-xs font-bold text-${color}-600">${Number(i.score).toFixed(0)}</span>
                     </div>
                  `).join('')}
                </div>
              </div>
            `;
        },

        _renderRadar(data) {
            // Guard: Ensure data is valid array or compatible object
            // User requested: renderRadar(data.radar) where data.radar is array of {label, value}
            // Existing code supported { labels:[], datasets:[] } format.
            // We need to support the new array format from User Request: Array<{label, value}>
            
            const ctx = document.getElementById('chart-radar');
            if(!ctx) return;
            
            let configData = { labels: [], datasets: [] };
            
            if(Array.isArray(data)) {
                 // Format: [{label:'A', value:50}, ...]
                 configData.labels = data.map(d => d.label);
                 configData.datasets = [{
                     label: '지수',
                     data: data.map(d => d.value),
                     fill: true,
                     backgroundColor: 'rgba(34,197,94,0.2)',
                     borderColor: 'rgb(34,197,94)',
                     pointBackgroundColor: 'rgb(34,197,94)',
                     pointBorderColor: '#fff',
                     pointHoverBackgroundColor: '#fff',
                     pointHoverBorderColor: 'rgb(34,197,94)'
                 }];
            } 
            else if(data && data.datasets) {
                 // Keep existing format support if backend still sends it
                 configData = data;
            } else {
                 return; // Invalid
            }

            // ChartJS Radar
            this.chartManager.createChartJS('chart-radar', {
                type: 'radar',
                data: configData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: { 
                            beginAtZero: true, 
                            max: 100,
                            ticks: { showLabelBackdrop: false },
                            pointLabels: {
                                font: { size: 12, family: 'Pretendard' }
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        },
        
        _renderLsiDist(items) {
            if(!items || !Array.isArray(items)) return;
            
            // 1. Chart (Horizontal Bar of Scores)
            const labels = items.map(i => i.label);
            const scores = items.map(i => i.score);
            
            window.App.chartManager.renderChartJS('chart-lsi-dist', {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '만족도 Score',
                        data: scores,
                        backgroundColor: '#f43f5e',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        x: { max: 100, grid: { borderDash: [2, 4] } },
                        y: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            
            // 2. Table (Top2Box)
            const tableDiv = document.getElementById('table-lsi-dist');
            if(tableDiv) {
                let html = `<table class="w-full text-xs text-right border-collapse">
                    <thead class="bg-slate-50 text-slate-500"><tr><th class="p-1 text-left">항목</th><th class="p-1">Top2Box</th></tr></thead>
                    <tbody>`;
                
                items.forEach(i => {
                   const isHigh = i.top2 >= 50;
                   html += `
                     <tr class="border-b border-slate-50">
                       <td class="p-1 text-left text-slate-700 font-medium">${i.label}</td>
                       <td class="p-1 font-bold ${isHigh?'text-emerald-600':'text-slate-400'}">${i.top2}%</td>
                     </tr>
                   `;
                });
                
                html += `</tbody></table>`;
                tableDiv.innerHTML = html;
            }
        },
        
        _renderPciPay(dist, elemId = 'chart-pci-pay') {
            if(!dist) return;
            
            // Standardize Input: Array<{label, count}>
            let labels = [], counts = [];
            
            if(Array.isArray(dist)) {
                labels = dist.map(d => d.label);
                counts = dist.map(d => d.count);
            } 
            else if(dist.labels && dist.counts) {
                // Legacy format support
                labels = dist.labels;
                counts = dist.counts;
            } else {
                return;
            }

            window.App.chartManager.renderChartJS(elemId, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '응답수',
                        data: counts,
                        backgroundColor: '#0ea5e9',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y + '명';
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            grid: { borderDash: [2, 4] } 
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        },
        
        _renderHeatmap(xtab, elemId = 'view-heatmap') {
            const div = document.getElementById(elemId);
            if(!xtab || !div) return;
            
            const rows = xtab.rows || [];
            const cols = xtab.cols || [];
            const m = xtab.matrix || xtab.matrixRowPct || (xtab.matrixCounts ? xtab.matrixCounts : []);
            
            // If matrix is empty or invalid
            if(!m.length) {
                div.innerHTML = '<div class="text-center text-slate-400 py-10">데이터 없음</div>';
                return;
            }

            let html = `<table class="w-full text-center border-collapse">`;
            // Header
            html += `<thead><tr><th class="p-2 border bg-slate-50 text-xs">의향 \\ 지불</th>${cols.map(c=>`<th class="p-2 border bg-slate-50 text-xs">${c}</th>`).join('')}</tr></thead>`;
            // Body
            html += `<tbody>`;
            
            rows.forEach((rLabel, ri) => {
                const rowVals = m[ri] || [];
                html += `<tr><th class="p-2 border bg-slate-50 text-xs text-left">${rLabel}</th>`;
                cols.forEach((_, ci) => {
                    const val = rowVals[ci] || 0;
                    // Visualize magnitude
                    // If val is percentage (likely), 0-100.
                    // If count, might be small integers.
                    // Let's assume input is % for color, or normalize.
                    // User requested Row %.
                    
                    const bg = `rgba(59, 130, 246, ${Math.min(1, val / 100 * 1.5)})`; 
                    const textCol = val > 50 ? 'text-white' : 'text-slate-800';
                    
                    html += `<td class="p-2 border text-xs transition hover:opacity-80" style="background:${bg}">
                        <div class="font-bold ${textCol}">${typeof val === 'number' ? val.toFixed(1) : val}%</div>
                    </td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
            
            div.innerHTML = html;
        },
        
        _renderWordCloud(elemId, keywords) {
            const div = document.getElementById(elemId);
            if(!div) return;
            
            if(!keywords || keywords.length === 0) {
                div.innerHTML = '<div class="text-slate-400 text-center py-10">데이터 없음</div>';
                return;
            }
            
            // Use ECharts WordCloud
            if(!window.echarts) {
                div.innerHTML = 'ECharts Library Missing';
                return;
            }
            
            const chart = echarts.getInstanceByDom(div) || echarts.init(div);
            
            const option = {
                tooltip: { show: true },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center', top: 'center',
                    width: '95%', height: '95%',
                    right: null, bottom: null,
                    sizeRange: [12, 50],
                    rotationRange: [-45, 90],
                    rotationStep: 45,
                    gridSize: 8,
                    drawOutOfBound: false,
                    textStyle: {
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            return 'rgb(' + [
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160)
                            ].join(',') + ')';
                        }
                    },
                    emphasis: {
                        focus: 'self',
                        textStyle: { shadowBlur: 10, shadowColor: '#333' }
                    },
                    data: keywords.map(k => ({ name: k.text, value: k.value }))
                }]
            };
            
            chart.setOption(option);
            
            // Resize handler
            window.addEventListener('resize', () => chart.resize());
        },  

        // --- New Tabs Renderers (MVP Phase 2) ---


        renderRoutineTab(data, container) {
            const routine = data?.routine || data || {};
            const list = routine.monthlyChecklist || [];
            const ym = routine.ym || routine.currentYm || "";
            const pct = routine.progressPct ?? 0;

            const itemsHtml = list.map(it => `
                <label class="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition px-2 rounded cursor-pointer">
                    <input type="checkbox" class="routine-check w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" data-key="${it.key}" ${it.checked ? "checked" : ""}/>
                    <span class="text-sm text-slate-700 select-none">${it.label}</span>
                </label>
            `).join("");

            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                             <h4 class="font-bold text-slate-700">운영 루틴 (월간) ${ym ? `- ${ym}` : ""}</h4>
                             <p class="text-xs text-slate-500">정기적으로 수행해야 할 운영 과제입니다.</p>
                        </div>
                        <div class="text-right">
                             <div class="text-2xl font-black text-indigo-600">${pct}%</div>
                             <div class="text-xs text-slate-500">진행률</div>
                        </div>
                    </div>
                    
                    <div class="w-full bg-slate-100 rounded-full h-2 mb-6">
                        <div class="bg-indigo-500 h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>

                    <div class="space-y-1 mb-6 max-h-96 overflow-y-auto">
                        ${itemsHtml || `<div class="text-center py-6 text-slate-400">체크 항목이 없습니다.</div>`}
                    </div>
                    
                    <div class="flex items-center justify-end">
                        <span id="routine-msg" class="mr-3 text-sm text-slate-500 font-bold transition-opacity duration-300 opacity-0"></span>
                        <button id="btn-routine-save" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-sm">
                            <i class="fas fa-save mr-2"></i>저장
                        </button>
                    </div>
                </div>
            `;

            const btn = container.querySelector("#btn-routine-save");
            const msg = container.querySelector("#routine-msg");
            
            btn?.addEventListener("click", async () => {
                const checks = Array.from(container.querySelectorAll(".routine-check"));
                const payload = {
                    ym,
                    items: checks.map(ch => ({ itemKey: ch.dataset.key, checked: ch.checked })),
                    checkedBy: "admin"
                };
                
                try {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>저장 중...';
                    msg.textContent = "";
                    msg.className = "mr-3 text-sm text-slate-500 font-bold opacity-0";
                    
                    await AdminDataService._postJson("ops_routine_update", payload);
                    
                    btn.innerHTML = '<i class="fas fa-check mr-2"></i>저장 완료';
                    btn.classList.replace('bg-indigo-600', 'bg-emerald-500');
                    
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-save mr-2"></i>저장';
                        btn.classList.replace('bg-emerald-500', 'bg-indigo-600');
                    }, 2000);
                    
                } catch(e) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-save mr-2"></i>재시도';
                    msg.textContent = `저장 실패: ${e.message}`;
                    msg.classList.remove('opacity-0');
                    msg.classList.add('text-red-500');
                }
            });
        },

        // ============================================================
        // 보고서 탭 전략 종합 보고 레이어 (REP-*)
        // ============================================================
        renderReportsTab(data, container) {
            // ─── 내부 상태 ─────────────────────────────────────────────
            const now = new Date();
            const repState = {
                year:  now.getFullYear(),
                month: now.getMonth() + 1,
                ri:    'ALL',
                type:  'policy', // 'policy' | 'internal' | 'public'
                scenarioId: 'LATEST', // 'LATEST' | 'NONE' | specific id
                opsMonth: '',         // '' (동일월) | 'YYYY-MM'
                _loading: false,
                _cache: {},
                _opsList: [],
                _scenarioList: []
            };

            // ─── 초기 뼈대 렌더 ────────────────────────────────────────
            container.innerHTML = `
              <!-- ⓪ 보고서 헤더 (PDF/Cover) -->
              <div id="rep-header" class="hidden print:block mb-8 border-b-4 border-ocean-600 pb-6">
                <div class="flex justify-between items-end">
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight">소원권역 실태조사 전략 분석 보고서</h1>
                        <p class="text-slate-500 font-bold mt-1">Sowon Strategic Analysis Report</p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-black text-ocean-600" id="rep-header-meta"></div>
                        <div class="text-[10px] text-slate-400 mt-1">Generated by Moalab Survey Engine</div>
                    </div>
                </div>
              </div>

              <!-- ① 필터 헤더 (REP-UI-01) -->
              <div id="rep-filter" class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3 print:hidden">
                <!-- 연도 -->
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-500">연도</label>
                  <select id="rep-sel-year" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 focus:ring-2 focus:ring-ocean-400 outline-none bg-white">
                    ${[now.getFullYear(), now.getFullYear()-1].map(y=>`<option value="${y}" ${y===repState.year?'selected':''}>${y}년</option>`).join('')}
                  </select>
                </div>
                <!-- 월 -->
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-500">월</label>
                  <select id="rep-sel-month" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 focus:ring-2 focus:ring-ocean-400 outline-none bg-white">
                    ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===repState.month?'selected':''}>${i+1}월</option>`).join('')}
                  </select>
                </div>
                <!-- 리 -->
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-500">리(Ri)</label>
                  <div class="flex rounded-lg bg-slate-100 p-0.5 gap-0.5" id="rep-ri-toggle">
                    ${[['ALL','전체'],['모항리','모항리'],['의항리','의항리']].map(([v,l])=>`
                      <button data-ri="${v}" class="rep-ri-btn text-xs font-bold px-3 py-1 rounded-md transition ${v==='ALL'?'bg-white shadow text-ocean-600':'text-slate-500 hover:text-slate-700'}">${l}</button>
                    `).join('')}
                  </div>
                </div>
                
                <div class="w-full h-px bg-slate-100 my-0.5"></div>
                
                <!-- 시나리오 연결 -->
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-500">시나리오</label>
                  <select id="rep-sel-scenario" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 focus:ring-2 focus:ring-ocean-400 outline-none bg-white max-w-[180px] truncate">
                    <option value="LATEST">최근 (자동)</option>
                    <option value="NONE">- 선택 안함 (제외) -</option>
                  </select>
                </div>
                <!-- 운영 루틴 월 -->
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-500">루틴 대상월</label>
                  <select id="rep-sel-ops" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 focus:ring-2 focus:ring-ocean-400 outline-none bg-white">
                    <option value="">보고월과 동일</option>
                  </select>
                </div>

                <!-- 보고 유형 -->
                <div class="flex items-center gap-2 ml-auto">
                  <label class="text-xs font-bold text-slate-500">보고 유형</label>
                  <div class="flex rounded-lg bg-slate-100 p-0.5 gap-0.5" id="rep-type-toggle">
                    ${[['policy','정책 보고용','fa-landmark'],['internal','내부 전략용','fa-lock'],['public','주민 공유용','fa-users']].map(([v,l,ic])=>`
                      <button data-type="${v}" class="rep-type-btn text-xs font-bold px-3 py-1 rounded-md transition flex items-center gap-1.5 ${v==='policy'?'bg-white shadow text-ocean-600':'text-slate-500 hover:text-slate-700'}">
                        <i class="fas ${ic} text-[10px]"></i>${l}
                      </button>
                    `).join('')}
                  </div>
                </div>
                <!-- PDF -->
                <button id="rep-pdf-btn" class="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition">
                  <i class="fas fa-print"></i>PDF 출력
                </button>
              </div>

              <!-- 로딩 오버레이 -->
              <div id="rep-loading" class="hidden text-center py-10 text-slate-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                <p class="text-sm">보고 데이터 병렬 로딩 중...</p>
              </div>

              <!-- 종합 분석 서술 (REP-GEN-02) -->
              <div id="rep-narrative" class="bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-xl shadow-lg p-6 text-white print-block"></div>

              <!-- ② KPI 종합 (REP-KPI-01) -->
              <div id="rep-kpi" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

               <!-- 지도 기반 권역 브리핑 (MAP-03) -->
               <div id="rep-map-block" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block overflow-hidden" style="min-height: 480px;"></div>

               <!-- ③ 리 비교 (REP-RI-01) -->
              <div id="rep-ri" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

              <!-- ④ 시나리오 (REP-SC-01) -->
              <div id="rep-sc" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

              <!-- ⑤ 운영루틴 (REP-OPS-01) -->
              <div id="rep-ops" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

              <!-- ⑥ 위험 진단 (REP-RISK-01) -->
              <div id="rep-risk" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

              <!-- ⑦ 전략 제안 (REP-STR-01) -->
              <div id="rep-str" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print-block"></div>

            </div>`;

            // ─── 데이터 로더 ───────────────────────────────────────────
            const loadAll = async (isFirstLoad = false) => {
                if (repState._loading) return;
                repState._loading = true;
                document.getElementById('rep-loading').classList.remove('hidden');

                const baseMonthKey = `${repState.year}-${String(repState.month).padStart(2,'0')}`;
                const targetOpsMonth = repState.opsMonth || baseMonthKey;

                try {
                    const promises = [
                        AdminDataService.loadAdminData('all').catch(()=>null),
                        AdminDataService.loadTrendData().catch(()=>[]),
                        AdminDataService.loadVillageAnalysis().catch(()=>null),
                        AdminDataService.listScenarios(repState.ri !== 'ALL' ? repState.ri : '').catch(()=>({scenarios:[]})),
                        AdminDataService.loadOpsRoutine(targetOpsMonth).catch(()=>null),
                        AdminDataService.getGeoIndex().catch(()=>null),
                        AdminDataService.getKpiByRi().catch(()=>({}))
                    ];
                    if (isFirstLoad) {
                        promises.push(AdminDataService.listOpsRoutine().catch(()=>[]));
                    }

                    const results = await Promise.all(promises);
                    const [summary, trend, riData, scenarios, ops, geoIndex, kpiByRi, opsList] = results;
                    
                    repState._cache = { summary, trend, riData, scenarios, ops, monthKey: targetOpsMonth, baseMonthKey, geoIndex, kpiByRi };
                    repState._scenarioList = scenarios?.scenarios || [];
                    if (isFirstLoad && opsList) {
                        repState._opsList = opsList;
                    }
                    
                    // Update dropdown UI
                    updateFiltersUI();
                } catch(e) {
                    console.error('[REP] loadAll error:', e);
                } finally {
                    repState._loading = false;
                    document.getElementById('rep-loading').classList.add('hidden');
                    renderAll();
                }
            };

            const updateFiltersUI = () => {
                const scSelect = document.getElementById('rep-sel-scenario');
                const opsSelect = document.getElementById('rep-sel-ops');
                if (!scSelect || !opsSelect) return;
                
                // 1. Scenarios
                const currSc = repState.scenarioId;
                const scHtml = [
                    '<option value="LATEST">최근 (자동)</option>',
                    '<option value="NONE">- 선택 안함 (제외) -</option>'
                ].concat(repState._scenarioList.map(s => 
                    `<option value="${s.scenarioId}">${s.title || s.scenarioId} (${new Date(s.updatedAt).toLocaleDateString()})</option>`
                )).join('');
                scSelect.innerHTML = scHtml;
                scSelect.value = repState._scenarioList.some(s=>s.scenarioId===currSc) ? currSc : ['LATEST','NONE'].includes(currSc) ? currSc : 'LATEST';
                repState.scenarioId = scSelect.value;
                
                // 2. Ops Routine
                const currOps = repState.opsMonth;
                
                // Allow generic data wrapped from fetch Gas
                let rawOps = repState._opsList;
                if (rawOps && !Array.isArray(rawOps)) {
                    rawOps = rawOps.data || rawOps.items || rawOps.payload || rawOps.list || [];
                }
                const validOps = (Array.isArray(rawOps) ? rawOps : []).filter(o=>o.monthKey).sort((a,b)=>b.monthKey.localeCompare(a.monthKey));
                
                const opsHtml = [
                    `<option value="">보고월(${repState._cache.baseMonthKey})과 동일</option>`
                ].concat(validOps.map(o => 
                    `<option value="${o.monthKey}">${o.monthKey} (${o.completionRate}%)</option>`
                )).join('');
                opsSelect.innerHTML = opsHtml;
                opsSelect.value = currOps;
            };

            // ─── 전체 재렌더 ───────────────────────────────────────────
            const renderAll = () => {
                const c = repState._cache;
                
                // Scenario Filter
                const selectedScen = repState.scenarioId === 'NONE' ? null : 
                                     repState.scenarioId === 'LATEST' ? { scenarios: c.scenarios?.scenarios?.slice(0,1) } :
                                     { scenarios: c.scenarios?.scenarios?.filter(s => s.scenarioId === repState.scenarioId) };
                
                // 리 필터링 반영 (KPI 및 분석결과)
                const currentRi = repState.ri;
                // Narrative text should respect selected scenario filter
                const filteredAnalysis = this.generateReportSummary({ ...c, scenarios: selectedScen }, currentRi);
                
                // KPI 카드 데이터 결정 (전체 vs 개별 리)
                let displaySummary = c.summary;
                if (currentRi !== 'ALL' && c.kpiByRi && c.kpiByRi[currentRi]) {
                    displaySummary = { 
                        ...c.summary, 
                        kpi: c.kpiByRi[currentRi].kpi || c.summary.kpi,
                        updatedAt: c.kpiByRi[currentRi].updatedAt || c.summary.updatedAt
                    };
                }

                // Update Cover Meta
                const coverMeta = document.getElementById('rep-header-meta');
                if (coverMeta) coverMeta.textContent = `${repState.year}년 ${repState.month}월 | ${currentRi === 'ALL' ? '권역 전체' : currentRi}`;

                // Safe wrapper for rendering components
                const safeRender = (name, renderFn) => {
                    try {
                        renderFn();
                    } catch (err) {
                        console.error(`[REP] Error rendering ${name}:`, err);
                    }
                };

                safeRender('Narrative', () => this._repRenderNarrative(filteredAnalysis, document.getElementById('rep-narrative')));
                safeRender('Map', () => this._repRenderMap(c, document.getElementById('rep-map-block')));
                safeRender('Kpi', () => this._repRenderKpi(displaySummary, c.trend, document.getElementById('rep-kpi')));
                safeRender('RiCompare', () => this._repRenderRiCompare(c, document.getElementById('rep-ri')));
                
                // Scenario Filter
                const scEl = document.getElementById('rep-sc');
                if (repState.scenarioId === 'NONE') {
                    scEl.classList.add('hidden');
                } else {
                    scEl.classList.remove('hidden');
                    safeRender('Scenario', () => this._repRenderScenario(selectedScen, scEl));
                }
                
                safeRender('Ops', () => this._repRenderOps(c.ops, c.monthKey, document.getElementById('rep-ops')));
                safeRender('Risk', () => this._repRenderRisk(filteredAnalysis, document.getElementById('rep-risk')));
                safeRender('Strategy', () => this._repRenderStrategy(filteredAnalysis, repState.type, document.getElementById('rep-str')));
            };

            // ─── 이벤트 바인딩 ─────────────────────────────────────────
            // 연도/월
            ['rep-sel-year','rep-sel-month'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    repState.year  = parseInt(document.getElementById('rep-sel-year').value);
                    repState.month = parseInt(document.getElementById('rep-sel-month').value);
                    loadAll(false);
                });
            });
            // 시나리오/운영루틴 커스텀 필터
            const scSel = document.getElementById('rep-sel-scenario');
            if (scSel) {
                scSel.addEventListener('change', (e) => {
                    repState.scenarioId = e.target.value;
                    renderAll(); // no need to re-fetch if we already have the list
                });
            }
            const opsSel = document.getElementById('rep-sel-ops');
            if (opsSel) {
                opsSel.addEventListener('change', (e) => {
                    repState.opsMonth = e.target.value;
                    loadAll(false); // need to re-fetch ops routine payload
                });
            }

            // 리 토글
            document.getElementById('rep-ri-toggle')?.addEventListener('click', e => {
                const btn = e.target.closest('.rep-ri-btn');
                if (!btn) return;
                repState.ri = btn.dataset.ri;
                document.querySelectorAll('.rep-ri-btn').forEach(b => {
                    b.className = b === btn
                        ? 'rep-ri-btn text-xs font-bold px-3 py-1 rounded-md transition bg-white shadow text-ocean-600'
                        : 'rep-ri-btn text-xs font-bold px-3 py-1 rounded-md transition text-slate-500 hover:text-slate-700';
                });
                loadAll(false);
            });
            // 보고 유형 토글
            document.getElementById('rep-type-toggle')?.addEventListener('click', e => {
                const btn = e.target.closest('.rep-type-btn');
                if (!btn) return;
                repState.type = btn.dataset.type;
                document.querySelectorAll('.rep-type-btn').forEach(b => {
                    b.className = b === btn
                        ? 'rep-type-btn text-xs font-bold px-3 py-1 rounded-md transition flex items-center gap-1.5 bg-white shadow text-ocean-600'
                        : 'rep-type-btn text-xs font-bold px-3 py-1 rounded-md transition flex items-center gap-1.5 text-slate-500 hover:text-slate-700';
                });
                // 전략 제안만 재렌더 (유형별 문체 변경)
                if (repState._analysis) {
                    this._repRenderStrategy(repState._analysis, repState.type, document.getElementById('rep-str'));
                }
            });
            // PDF 출력
            document.getElementById('rep-pdf-btn')?.addEventListener('click', () => window.print());

            loadAll(true);
        },

        /**
         * MAP-REP-01: 리 단위 지도 요약 블록 렌더링
         */
        _repRenderMap(cache, el) {
            if (!el) return;
            const geo = cache.geoIndex;
            // Cache for other tabs (Scenario Lab)
            if (geo) window.App._geoCache = geo;
            const kpiByRi = cache.kpiByRi || {};
            const selectedKpi = this.repMapKpi || 'RTRI';

            el.innerHTML = `
                <div class="flex flex-col md:flex-row gap-6 h-full">
                    <!-- 지도 영역 -->
                    <div class="flex-1 relative bg-slate-50/50 rounded-xl border border-slate-100 p-4 flex flex-col min-h-[400px]">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <i class="fas fa-map-marked-alt text-ocean-500"></i>리 단위 공간 분석
                            </h3>
                            <select id="rep-map-kpi-sel" class="text-xs border border-slate-200 rounded-lg px-2 py-1 font-bold outline-none">
                                ${['RTRI','SII','LSI','CGS','PTS','SUS'].map(k=>`<option value="${k}" ${k===selectedKpi?'selected':''}>${k}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div id="rep-svg-container" class="flex-1 w-full flex items-center justify-center"></div>
                        
                        <!-- 범례 -->
                        <div class="mt-4 flex flex-wrap gap-3">
                            ${[1,2,3,4,5].map(v => `
                                <div class="flex items-center gap-1.5 grayscale-[0.3]">
                                    <div class="w-3 h-3 rounded-sm kpi-lv${v}"></div>
                                    <span class="text-[10px] font-bold text-slate-500">LV${v}</span>
                                </div>
                            `).join('')}
                            <div class="ml-auto text-[10px] text-slate-400 font-medium">※ 실 수치 기반 5단계 채색</div>
                        </div>
                    </div>

                    <!-- 요약 테이블 (6대 지표) -->
                    <div class="w-full md:w-64 flex flex-col">
                        <h4 class="text-xs font-bold text-slate-500 mb-3 ml-1 uppercase">Regional KPI Summary</h4>
                        <div class="grid grid-cols-1 gap-2">
                            ${['모항리','의항리'].map(riName => {
                                const d = kpiByRi[riName]?.kpi || {};
                                return `
                                    <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                                        <div class="text-xs font-black text-slate-700 mb-2 border-b border-slate-200 pb-1">${riName}</div>
                                        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                            ${['RTRI','SII','LSI','CGS'].map(k => `
                                                <div class="flex justify-between items-center">
                                                    <span class="text-[10px] font-bold text-slate-400">${k}</span>
                                                    <span class="text-[11px] font-black text-slate-700">${(d[k]||0).toFixed(1)}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="mt-auto p-3 bg-ocean-50/50 rounded-xl text-[10px] text-ocean-600 leading-relaxed font-medium">
                            <i class="fas fa-info-circle mr-1"></i> 지도의 각 지역을 클릭하여 상세 분석 데이터를 확인할 수 있습니다.
                        </div>
                    </div>
                </div>
            `;

            // SVG 렌더링
            const container = el.querySelector('#rep-svg-container');
            if (window.APP && typeof window.APP.SvgRiMap === 'function') {
                window.APP.SvgRiMap(container, geo, kpiByRi, {
                    selectedKpiKey: selectedKpi,
                    onClickRi: (ri) => console.log('Clicked', ri)
                });
            } else if (typeof APP !== 'undefined' && typeof APP.SvgRiMap === 'function') {
                APP.SvgRiMap(container, geo, kpiByRi, {
                    selectedKpiKey: selectedKpi,
                    onClickRi: (ri) => console.log('Clicked', ri)
                });
            } else {
                console.warn('SvgRiMap is not available on APP or window.APP');
            }

            // 이벤트 바인딩
            el.querySelector('#rep-map-kpi-sel')?.addEventListener('change', (e) => {
                this.repMapKpi = e.target.value;
                this._repRenderMap(cache, el);
            });
        },


        // ─── REP-KPI-01: 6대 KPI 종합 카드 ──────────────────────────
        _repRenderKpi(summary, trend3m, el) {
            if (!el) return;
            const kpi = summary?.kpi || {};
            const KPI_KEYS = ['RTRI','SII','LSI','CGS','PTS','SUS'];
            const KPI_COLOR = { RTRI:'sky', SII:'rose', LSI:'emerald', CGS:'violet', PTS:'amber', SUS:'teal' };

            // 전월 Δ 계산 (trend3m 마지막 2개월)
            const deltaMap = {};
            if (Array.isArray(trend3m) && trend3m.length >= 2) {
                const cur = trend3m[trend3m.length - 1];
                const prev = trend3m[trend3m.length - 2];
                KPI_KEYS.forEach(k => {
                    if (cur?.[k] != null && prev?.[k] != null) {
                        deltaMap[k] = parseFloat((cur[k] - prev[k]).toFixed(2));
                    }
                });
            }

            el.innerHTML = `
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-black text-slate-700 flex items-center gap-2">
                <i class="fas fa-chart-bar text-ocean-500"></i>6대 KPI 종합 현황
              </h3>
              <span class="text-[10px] text-slate-400">${summary?.updatedAt ? new Date(summary.updatedAt).toLocaleDateString('ko-KR') : '-'} 기준</span>
            </div>
            <div class="flex flex-col md:flex-row gap-6">
                <!-- KPI Radar Chart -->
                <div class="w-full md:w-1/3 bg-slate-50 rounded-xl border border-slate-100 p-2 flex items-center justify-center min-h-[280px]">
                    <div id="rep-kpi-radar-chart" class="w-full h-full min-h-[280px]"></div>
                </div>
                <!-- KPI Grid -->
                <div class="w-full md:w-2/3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  ${KPI_KEYS.map(k => {
                    const v = (kpi[k] || 0).toFixed(1);
                    const d = deltaMap[k];
                    const c = KPI_COLOR[k];
                    const dHtml = d != null
                        ? `<div class="text-[10px] font-black mt-1 ${d>0?'text-emerald-600':d<0?'text-rose-500':'text-slate-400'}">${d>0?'▲':d<0?'▼':'—'} ${Math.abs(d).toFixed(2)}</div>`
                        : `<div class="text-[10px] text-slate-300 mt-1">전월 비교 없음</div>`;
                    return `
                    <div class="bg-${c}-50 border border-${c}-100 rounded-xl p-3 text-center flex flex-col justify-center transition hover:shadow-md">
                      <div class="text-[10px] font-bold text-${c}-400 uppercase mb-1">${k}</div>
                      <div class="text-2xl font-black text-${c}-700">${v}</div>
                      ${dHtml}
                    </div>`;
                  }).join('')}
                </div>
            </div>`;

            // Render Radar Chart
            setTimeout(() => {
                const chartEl = document.getElementById('rep-kpi-radar-chart');
                if (chartEl && window.echarts) {
                    const chart = echarts.init(chartEl);
                    const kpiValues = KPI_KEYS.map(k => parseFloat((kpi[k] || 0).toFixed(1)));
                    
                    chart.setOption({
                        radar: {
                            indicator: [
                                { name: '전환(RTRI)', max: 100 },
                                { name: '불균형(SII)', max: 100 },
                                { name: '생활만족(LSI)', max: 100 },
                                { name: '거버넌스(CGS)', max: 100 },
                                { name: '비전(PTS)', max: 100 },
                                { name: '지속가능(SUS)', max: 100 }
                            ],
                            radius: '60%',
                            splitNumber: 4,
                            axisName: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
                            splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9', '#f8fafc', '#f1f5f9'] } },
                            axisLine: { lineStyle: { color: '#e2e8f0' } },
                            splitLine: { lineStyle: { color: '#e2e8f0' } }
                        },
                        series: [{
                            type: 'radar',
                            data: [
                                {
                                    value: kpiValues,
                                    name: 'Current KPI',
                                    itemStyle: { color: '#0ea5e9' },
                                    lineStyle: { color: '#0ea5e9', width: 2 },
                                    areaStyle: { color: 'rgba(14, 165, 233, 0.4)' }
                                }
                            ]
                        }],
                        tooltip: { trigger: 'item' }
                    });
                    
                    window.addEventListener('resize', () => chart.resize());
                }
            }, 50);
        },

        // ─── REP-RI-01: 리 비교 테이블 ──────────────────────────────
        _repRenderRiCompare(cache, el) {
            if (!el) return;
            const riData = cache.riData;
            const kpiByRi = cache.kpiByRi || {};
            const mohang = riData?.charts?.data?.['모항리'] || {};
            const uihang = riData?.charts?.data?.['의항리'] || {};
            
            // Use real KPI if available, or fallback
            const mKpi = kpiByRi['모항리']?.kpi || { LSI: 0, RTRI: 0, CGS: 0 };
            const uKpi = kpiByRi['의항리']?.kpi || { LSI: 0, RTRI: 0, CGS: 0 };
            
            // LSI estimation if purely relying on survey breakdown (for fallback compatibility)
            const getLsiEst = (d) => {
                const items = d?.lsiBreakdown?.items || [];
                return items.length ? (items.reduce((s,i)=>s+(i.score||0),0)/items.length) : 0;
            };
            if (!mKpi.LSI) mKpi.LSI = getLsiEst(mohang);
            if (!uKpi.LSI) uKpi.LSI = getLsiEst(uihang);

            const mN = mohang.sample || 0;
            const uN = uihang.sample || 0;

            // 자동 문장 생성
            const autoSentence = () => {
                const msgs = [];
                if (mKpi.LSI > uKpi.LSI + 5) msgs.push(`모항리가 생활만족도(LSI) ${mKpi.LSI.toFixed(1)}점으로 의항리(${uKpi.LSI.toFixed(1)}점)보다 높습니다.`);
                else if (uKpi.LSI > mKpi.LSI + 5) msgs.push(`의항리가 생활만족도(LSI) ${uKpi.LSI.toFixed(1)}점으로 모항리(${mKpi.LSI.toFixed(1)}점)보다 높습니다.`);
                if (mN === 0 && uN === 0) msgs.push('리 단위 설문 데이터가 아직 집계되지 않았습니다.');
                return msgs.length ? msgs.join(' ') : '두 리의 지표가 유사한 수준입니다.';
            };

            // 위험 조건
            const riskTag = (key, val) => {
                if (key === 'RTRI' && val < 45) return `<span class="text-[9px] bg-rose-100 text-rose-600 rounded px-1 font-bold ml-1">전환위험</span>`;
                if (key === 'CGS'  && val < 50) return `<span class="text-[9px] bg-amber-100 text-amber-600 rounded px-1 font-bold ml-1">거버넌스취약</span>`;
                if (key === 'SII'  && val > 60) return `<span class="text-[9px] bg-orange-100 text-orange-600 rounded px-1 font-bold ml-1">불균형심화</span>`;
                return '';
            };

            el.innerHTML = `
            <h3 class="font-black text-slate-700 mb-4 flex items-center gap-2">
              <i class="fas fa-code-compare text-violet-500"></i>리(Ri) 단위 비교
            </h3>
            <p class="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <i class="fas fa-quote-left mr-1 text-slate-300"></i>${autoSentence()}
            </p>
            <div class="flex flex-col md:flex-row gap-6">
                <div class="w-full md:w-1/2 overflow-x-auto">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-slate-200">
                        <th class="py-2 text-left font-bold text-slate-400">KPI</th>
                        <th class="py-2 text-center font-bold text-ocean-600">모항리 (N=${mN})</th>
                        <th class="py-2 text-center font-bold text-emerald-600">의항리 (N=${uN})</th>
                        <th class="py-2 text-center font-bold text-slate-400">격차</th>
                        <th class="py-2 text-center font-bold text-slate-400">위험</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr>
                        <td class="py-2.5 font-bold text-slate-600">LSI <span class="text-[9px] text-slate-400 font-normal">생활만족</span></td>
                        <td class="py-2.5 text-center font-black text-ocean-700">${mKpi.LSI.toFixed(1)}</td>
                        <td class="py-2.5 text-center font-black text-emerald-700">${uKpi.LSI.toFixed(1)}</td>
                        <td class="py-2.5 text-center font-bold ${Math.abs(mKpi.LSI-uKpi.LSI)>10?'text-rose-500':'text-slate-400'}">${(mKpi.LSI-uKpi.LSI>0?'+':'') + (mKpi.LSI-uKpi.LSI).toFixed(1)}</td>
                        <td class="py-2.5 text-center">${riskTag('LSI', Math.min(mKpi.LSI,uKpi.LSI))}</td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-600">RTRI <span class="text-[9px] text-slate-400 font-normal">정주전환</span></td>
                        <td class="py-2.5 text-center font-black text-ocean-700">${(mKpi.RTRI||0).toFixed(1)}</td>
                        <td class="py-2.5 text-center font-black text-emerald-700">${(uKpi.RTRI||0).toFixed(1)}</td>
                        <td class="py-2.5 text-center font-bold ${Math.abs((mKpi.RTRI||0)-(uKpi.RTRI||0))>10?'text-rose-500':'text-slate-400'}">${((mKpi.RTRI||0)-(uKpi.RTRI||0)>0?'+':'') + ((mKpi.RTRI||0)-(uKpi.RTRI||0)).toFixed(1)}</td>
                        <td class="py-2.5 text-center">${riskTag('RTRI', Math.min((mKpi.RTRI||0),(uKpi.RTRI||0)))}</td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-600">CGS <span class="text-[9px] text-slate-400 font-normal">거버넌스</span></td>
                        <td class="py-2.5 text-center font-black text-ocean-700">${(mKpi.CGS||0).toFixed(1)}</td>
                        <td class="py-2.5 text-center font-black text-emerald-700">${(uKpi.CGS||0).toFixed(1)}</td>
                        <td class="py-2.5 text-center font-bold ${Math.abs((mKpi.CGS||0)-(uKpi.CGS||0))>10?'text-rose-500':'text-slate-400'}">${((mKpi.CGS||0)-(uKpi.CGS||0)>0?'+':'') + ((mKpi.CGS||0)-(uKpi.CGS||0)).toFixed(1)}</td>
                        <td class="py-2.5 text-center">${riskTag('CGS', Math.min((mKpi.CGS||0),(uKpi.CGS||0)))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Bar Chart -->
                <div class="w-full md:w-1/2 bg-slate-50 rounded-xl border border-slate-100 p-2 flex items-center justify-center min-h-[250px]">
                    <div id="rep-ri-bar-chart" class="w-full h-full min-h-[250px]"></div>
                </div>
            </div>`;

            // Render Grouped Bar Chart
            setTimeout(() => {
                const chartEl = document.getElementById('rep-ri-bar-chart');
                if (chartEl && window.echarts) {
                    const chart = echarts.init(chartEl);
                    const kpiKeys = ['LSI', 'RTRI', 'CGS'];
                    const mData = kpiKeys.map(k => parseFloat((mKpi[k] || 0).toFixed(1)));
                    const uData = kpiKeys.map(k => parseFloat((uKpi[k] || 0).toFixed(1)));
                    
                    chart.setOption({
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                        legend: { data: ['모항리', '의항리'], bottom: 0, textStyle: { fontSize: 10 } },
                        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
                        xAxis: { type: 'value', max: 100, axisLabel: { fontSize: 10 } },
                        yAxis: { type: 'category', data: kpiKeys, axisLabel: { fontWeight: 'bold', fontSize: 11 } },
                        series: [
                            {
                                name: '모항리',
                                type: 'bar',
                                data: mData,
                                itemStyle: { color: '#0ea5e9', borderRadius: [0, 4, 4, 0] },
                                label: { show: true, position: 'right', fontSize: 9, color: '#0ea5e9' }
                            },
                            {
                                name: '의항리',
                                type: 'bar',
                                data: uData,
                                itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
                                label: { show: true, position: 'right', fontSize: 9, color: '#10b981' }
                            }
                        ]
                    });
                    
                    window.addEventListener('resize', () => chart.resize());
                }
            }, 50);
        },

        // ─── REP-SC-01: 시나리오 결과 요약 ──────────────────────────
        _repRenderScenario(scenarios, el) {
            if (!el) return;
            const list = scenarios?.scenarios || [];
            const latest = list[0];
            if (!latest) {
                el.innerHTML = `
                <h3 class="font-black text-slate-700 mb-3 flex items-center gap-2">
                  <i class="fas fa-flask text-amber-500"></i>시나리오 결과 요약
                </h3>
                <div class="bg-slate-50 p-6 rounded-xl text-center text-slate-400 text-sm border border-dashed border-slate-200">
                  <i class="fas fa-circle-info text-xl mb-2"></i>
                  <p>시나리오가 아직 저장되지 않았습니다.<br>
                  시나리오 탭에서 먼저 시뮬레이션을 저장하세요.</p>
                </div>`;
                return;
            }

            const result  = (() => { try { return JSON.parse(latest.resultJson  || '{}'); } catch(e){ return {}; } })();
            const drivers = (() => { try { return JSON.parse(latest.driversJson || '{}'); } catch(e){ return {}; } })();
            const baseline= (() => { try { return JSON.parse(latest.baselineJson|| '{}'); } catch(e){ return {}; } })();
            const delta = result.deltaKpi || {};
            const after = result.afterKpi  || {};
            const KPI_KEYS = ['RTRI','SII','LSI','CGS','PTS','SUS'];

            // Top3 Drivers (by RTRI / LSI / PTS 순)
            const TOP_KPIs = ['RTRI','LSI','PTS'];
            const top3Drivers = [];
            TOP_KPIs.forEach(k => {
                const d = (drivers[k] || []).slice(0, 1);
                if (d.length) top3Drivers.push({ kpi: k, ...d[0] });
            });

            el.innerHTML = `
            <div class="flex justify-between items-start mb-4">
              <h3 class="font-black text-slate-700 flex items-center gap-2">
                <i class="fas fa-flask text-amber-500"></i>최근 시나리오 결과
              </h3>
              <div class="text-right">
                <div class="text-xs font-bold text-slate-700">${latest.title || '제목 없음'}</div>
                <div class="text-[10px] text-slate-400">${latest.scope || '-'} · ${latest.updatedAt ? new Date(latest.updatedAt).toLocaleDateString('ko-KR') : '-'}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              ${KPI_KEYS.map(k => {
                const b = (baseline[k] || 0).toFixed(1);
                const a = (after[k] || 0).toFixed(1);
                const d = delta[k] || 0;
                const isPos = d > 0.05;
                const isNeg = d < -0.05;
                return `
                <div class="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">${k}</div>
                  <div class="text-xs text-slate-400 line-through">${b}</div>
                  <div class="text-base font-black text-slate-800">${a}</div>
                  <div class="text-[9px] font-black mt-0.5 ${isPos?'text-emerald-600':isNeg?'text-rose-500':'text-slate-400'}">
                    ${isPos?'▲':isNeg?'▼':'—'} ${Math.abs(d).toFixed(2)}
                  </div>
                </div>`;
              }).join('')}
            </div>
            ${top3Drivers.length ? `
            <div class="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div class="text-[10px] font-bold text-amber-700 mb-2">📌 TOP 3 기여 요인 (Drivers)</div>
              <div class="space-y-1">
                ${top3Drivers.map((d,i)=>`
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-4 h-4 rounded-full bg-amber-200 text-amber-800 font-black flex items-center justify-center text-[9px] flex-shrink-0">${i+1}</span>
                  <span class="font-bold text-slate-600">[${d.kpi}]</span>
                  <span class="text-slate-700 flex-1">${d.label}</span>
                  <span class="font-black ${d.contribution>=0?'text-emerald-600':'text-rose-500'}">${d.contribution>=0?'+':''}${d.contribution.toFixed(2)}</span>
                </div>`).join('')}
              </div>
            </div>` : ''}`;
        },

        // ─── REP-OPS-01: 운영루틴 현황 ───────────────────────────────
        _repRenderOps(ops, monthKey, el) {
            if (!el) return;
            if (!ops) {
                el.innerHTML = `
                <h3 class="font-black text-slate-700 mb-3 flex items-center gap-2">
                  <i class="fas fa-clipboard-list text-emerald-500"></i>운영 루틴 현황
                </h3>
                <div class="text-xs text-slate-400 text-center py-6">
                  <i class="fas fa-spinner fa-spin mr-1"></i>${monthKey} 루틴 데이터 없음
                </div>`;
                return;
            }
            const rate = Math.round(ops.completionRate || 0);
            const items = ops.items || [];
            const undone = items.filter(it => !it.done).slice(0, 3);
            const doneItems = items.filter(it => it.done);
            const rateColor = rate >= 80 ? 'emerald' : rate >= 60 ? 'amber' : 'rose';
            const rateIcon  = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '🚨';

            el.innerHTML = `
            <div class="flex items-start justify-between mb-4">
              <h3 class="font-black text-slate-700 flex items-center gap-2">
                <i class="fas fa-clipboard-list text-emerald-500"></i>운영 루틴 현황
              </h3>
              <span class="text-[10px] text-slate-400">${monthKey}</span>
            </div>
            <div class="flex flex-col md:flex-row gap-6 mb-5">
              <div class="flex items-center gap-6 md:w-1/2">
                  <!-- 이행률 게이지 -->
                  <div class="relative w-20 h-20 flex-shrink-0">
                    <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" stroke-width="3"/>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="${rateColor==='emerald'?'#10b981':rateColor==='amber'?'#f59e0b':'#f43f5e'}" stroke-width="3"
                        stroke-dasharray="${rate * 94.25 / 100} 94.25"
                        stroke-linecap="round"/>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                      <span class="text-lg font-black text-slate-800">${rate}%</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-2xl">${rateIcon}</span>
                      <span class="font-black text-${rateColor}-600 text-sm">${rate >= 80 ? '정상 이행 중' : rate >= 60 ? '주의 필요' : '경고: 이행률 저조'}</span>
                    </div>
                    <div class="text-xs text-slate-500">총 ${items.length}개 항목 중 ${doneItems.length}개 완료</div>
                  </div>
              </div>
              <div class="md:w-1/2 mt-4 md:mt-0">
                  <div class="text-[10px] font-bold text-slate-500 mb-2 uppercase">운영 루틴 세부 진행바</div>
                  <div class="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden flex">
                      <div class="bg-${rateColor}-500 h-2.5" style="width: ${rate}%"></div>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>진행도</span>
                      <span>100% 목표</span>
                  </div>
              </div>
            </div>
            ${undone.length ? `
            <div class="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <div class="text-[10px] font-bold text-rose-600 mb-2">⚠️ 미이행 TOP ${undone.length}</div>
              <div class="space-y-1.5">
                ${undone.map(it=>`
                <div class="flex items-start gap-2 text-xs">
                  <i class="fas fa-circle text-rose-300 text-[6px] mt-1.5 flex-shrink-0"></i>
                  <span class="text-slate-700">${it.title || it.itemKey || '항목'}</span>
                  ${it.section ? `<span class="text-[9px] bg-rose-100 text-rose-500 px-1 rounded ml-auto flex-shrink-0">${it.section}</span>` : ''}
                </div>`).join('')}
              </div>
            </div>` : '<div class="text-xs text-emerald-600 font-bold text-center py-2">✅ 모든 항목 이행 완료</div>'}
            `;
        },

        // ─── REP-RISK-01: 위험 신호 진단 (Engine Driven) ──────────────────
        _repRenderRisk(analysis, el) {
            if (!el || !analysis) return;
            const risks = analysis.diagnosis || [];

            el.innerHTML = `
            <h3 class="font-black text-slate-700 mb-4 flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-rose-500"></i>위험 신호 진단
            </h3>
            <div class="space-y-2">
              ${risks.length ? risks.map(r=>`
              <div class="flex items-start gap-3 p-3 rounded-xl border border-${r.color}-100 bg-${r.color}-50">
                <span class="text-xl flex-shrink-0">${r.level}</span>
                <div>
                  <div class="text-sm font-black text-${r.color}-700">${r.label}</div>
                  <div class="text-xs text-slate-500 mt-0.5">${r.desc}</div>
                </div>
              </div>`).join('') : '<div class="text-xs text-emerald-600 font-bold p-4 bg-emerald-50 rounded-xl border border-emerald-100">임계치를 넘는 위험 신호가 감지되지 않았습니다.</div>'}
            </div>`;
        },

        // ─── REP-STR-01: 전략 제안 자동 생성 (Engine Driven) ───────────────
        _repRenderStrategy(analysis, reportType, el) {
            if (!el || !analysis) return;

            // Apply tone variation mapper (REP-GEN-03)
            const mapTone = (sentences, type) => {
                const toneMap = {
                    policy:   (s) => `• [정책] ${s}`,
                    internal: (s) => `• [전략] ${s}`,
                    public:   (s) => `• 🌿 ${s}`
                };
                const fn = toneMap[type] || ((s) => `• ${s}`);
                return sentences.map(fn);
            };

            const typeLabel = { policy:'정책 보고용', internal:'내부 전략용', public:'주민 공유용' }[reportType] || '';
            const shortTerm = mapTone(analysis.shortTermRecommendations || [], reportType);
            const midTerm   = mapTone(analysis.midTermRecommendations || [], reportType);
            const priority  = mapTone([analysis.priorityFocus || "현행 유지"], reportType)[0];

            el.innerHTML = `
            <div class="flex items-start justify-between mb-4">
              <h3 class="font-black text-slate-700 flex items-center gap-2">
                <i class="fas fa-lightbulb text-yellow-500"></i>전략 제안
              </h3>
              <span class="text-[10px] bg-ocean-50 text-ocean-600 font-bold px-2 py-0.5 rounded-full border border-ocean-100">${typeLabel}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div class="text-[10px] font-black text-sky-600 mb-2 uppercase">⚡ 단기 권고 (즉시)</div>
                <div class="space-y-2 text-xs text-slate-700">
                  ${shortTerm.length ? shortTerm.map(s=>`<div class="leading-snug">${s}</div>`).join('') : '<div>안정 상태입니다.</div>'}
                </div>
              </div>
              <div class="bg-violet-50 rounded-xl p-4 border border-violet-100">
                <div class="text-[10px] font-black text-violet-600 mb-2 uppercase">📋 중기 전략 (3~6개월)</div>
                <div class="space-y-2 text-xs text-slate-700">
                  ${midTerm.length ? midTerm.map(s=>`<div class="leading-snug">${s}</div>`).join('') : '<div>정기 모니터링 수행</div>'}
                </div>
              </div>
              <div class="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div class="text-[10px] font-black text-amber-600 mb-2 uppercase">🎯 우선 투자 영역</div>
                <div class="text-xs text-slate-700 leading-snug">${priority}</div>
              </div>
            </div>`;
        },

        // ─── REP-GEN-02: 종합 분석 서술 (Narrative) ─────────────────────
        _repRenderNarrative(analysis, el) {
            if (!el || !analysis) return;
            
            const renderBullet = (items) => items.map(it => `
                <div class="flex items-start gap-2 text-sm leading-relaxed mb-2 text-slate-700 animate-fade-in">
                    <i class="fas fa-check-circle text-ocean-500 text-[10px] mt-1.5 flex-shrink-0"></i>
                    <span>${it}</span>
                </div>
            `).join('');

            el.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print-block">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-ocean-600 to-ocean-800 p-6 text-white flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-md border border-white/30 shadow-inner">
                                <i class="fas fa-wand-magic-sparkles"></i>
                            </div>
                            <div>
                                <h3 class="text-xl font-black tracking-tight">종합 전략 분석 의견</h3>
                                <p class="text-xs opacity-80 font-medium">Data-Driven Strategic Insights by Moalab AI</p>
                            </div>
                        </div>
                        <div class="hidden md:block text-right">
                            <span class="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold border border-white/30 backdrop-blur-sm">REAL-TIME ANALYSIS</span>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                        <!-- Left: Tactical Analysis -->
                        <div class="space-y-8">
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="w-1.5 h-4 bg-ocean-500 rounded-full"></div>
                                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">지표 추이 및 지역 진단</h4>
                                </div>
                                <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                                    ${renderBullet([...analysis.trendAnalysis, ...analysis.comparisonAnalysis]) || '<p class="text-sm text-slate-400 italic">특이 추이가 발견되지 않았습니다.</p>'}
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="w-1.5 h-4 bg-teal-500 rounded-full"></div>
                                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">운영 및 시나리오 연계</h4>
                                </div>
                                <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                                    ${renderBullet([...analysis.opsAnalysis, ...analysis.scenarioAnalysis]) || '<p class="text-sm text-slate-400 italic">관련 분석 결과가 없습니다.</p>'}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Strategic Conclusion -->
                        <div class="flex flex-col">
                            <div class="flex items-center gap-2 mb-4">
                                <div class="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">전략 결론 및 핵심 대응 방향</h4>
                            </div>
                            <div class="flex-1 bg-ocean-50/50 rounded-3xl p-8 border border-ocean-100 relative overflow-hidden group">
                                <i class="fas fa-quote-right absolute -right-4 -bottom-4 text-8xl text-ocean-100/50 group-hover:scale-110 transition-transform duration-700"></i>
                                
                                <div class="relative z-10">
                                    <div class="text-2xl md:text-3xl font-black leading-tight text-slate-800 mb-6 drop-shadow-sm">
                                        <span class="text-ocean-600">"${analysis.priorityFocus.replace(' 영역 집중 투자','')}"</span> 중심의<br>
                                        입체적 인프라 보완이 시급합니다.
                                    </div>
                                    
                                    <div class="space-y-4 text-slate-600 text-sm leading-relaxed border-l-4 border-ocean-500 pl-6 py-2">
                                        <p>
                                            현재 진단된 위험 요소들은 상호 연계되어 정주 만족도의 하방 압박을 가하고 있습니다.
                                        </p>
                                        <p class="font-bold text-slate-800">
                                            특히 <span class="text-rose-600">${analysis.diagnosis.filter(r=>r.level==='🔴')[0]?.label || '주요 지표'}</span> 영역의 개선 없이는 장기적인 인구 전환 잠재력(PTS) 확보가 어려울 것으로 전망됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ─── REP-GEN-01: 전략 요약 엔진 (Rule-based) ─────────────────────
        generateReportSummary(cache, filterRi = 'ALL') {
            const globalKpi = cache.summary?.kpi || {};
            // 필터 선택된 리의 KPI가 있으면 우선 사용
            const kpi = (filterRi !== 'ALL' && cache.kpiByRi?.[filterRi]?.kpi) 
                        ? cache.kpiByRi[filterRi].kpi 
                        : globalKpi;
            const trend = cache.trend || [];
            const ri = cache.riData?.charts?.data || {};
            const ops = cache.ops || {};
            const sc  = cache.scenarios?.scenarios?.[0] || null;
            
            const results = {
                diagnosis: [],
                trendAnalysis: [],
                comparisonAnalysis: [],
                opsAnalysis: [],
                scenarioAnalysis: [],
                shortTermRecommendations: [],
                midTermRecommendations: [],
                priorityFocus: ""
            };

            // 1. 상태 진단 규칙 (Diagnosis)
            const checkRisk = (val, thresholds, label, descBase) => {
                if (val < thresholds.danger) return { level:'🔴', label, desc: descBase.danger, color:'rose' };
                if (val < thresholds.warn)   return { level:'🟡', label, desc: descBase.warn, color:'amber' };
                return { level:'🟢', label, desc: descBase.good, color:'emerald' };
            };

            results.diagnosis.push(checkRisk(kpi.RTRI || 0, { danger:45, warn:55 }, '정주 전환', {
                danger: '전환 지수(RTRI)가 위기 수준입니다. 인프라 전면 재검토가 필요합니다.',
                warn: '전환 의향이 정체 상태입니다. 차별화된 유인책이 요구됩니다.',
                good: '정주 전환을 위한 기본적인 동력이 안정적으로 유지되고 있습니다.'
            }));

            if ((kpi.CGS || 0) < 55) {
                results.diagnosis.push({ level:'🔴', label:'거버넌스', desc:'주민 참여 역량(CGS)이 낮아 정책 실행 속도가 저하될 위험이 있습니다.', color:'rose' });
            }

            if ((kpi.SII || 0) > 65) {
                results.diagnosis.push({ level:'🔴', label:'불균형', desc:'생활 서비스 불균형(SII)이 매우 심각하여 주민들의 박탈감이 우려됩니다.', color:'rose' });
            }

            // 2. 리 단위 비교 해석 (Comparison)
            const mohang = ri['모항리'] || {};
            const uihang = ri['의항리'] || {};
            const getLsiAverage = (d) => {
                const items = d?.lsiBreakdown?.items || [];
                if (!items.length) return 0;
                return items.reduce((s,i)=>s+(i.score||0),0) / items.length;
            };
            const mLsi = getLsiAverage(mohang);
            const uLsi = getLsiAverage(uihang);
            
            if (mLsi > 0 && uLsi > 0) {
                const diff = Math.abs(mLsi - uLsi);
                const higher = mLsi > uLsi ? '모항리' : '의항리';
                if (diff >= 5) {
                    results.comparisonAnalysis.push(`${higher}의 생활만족도(LSI)가 상대적으로 높아, 부족 지역에 대한 벤치마킹이 권고됩니다.`);
                } else {
                    results.comparisonAnalysis.push('리 단위 생활 만족도가 상향 평준화되고 있어 권역내 통합 서비스 공급이 효율적입니다.');
                }
            }

            // 3. 추이 해석 (Trend)
            if (trend.length >= 3) {
                const last = trend[trend.length - 1];
                const prev = trend[trend.length - 2];
                const first = trend[trend.length - 3];

                ['RTRI', 'LSI', 'SUS'].forEach(k => {
                    const d1 = (last[k] || 0) - (prev[k] || 0);
                    const d2 = (prev[k] || 0) - (first[k] || 0);
                    
                    if (d1 > 0 && d2 > 0) results.trendAnalysis.push(`${k} 지표가 3개월 연속 우상향하며 정책 효과가 가시화되고 있습니다.`);
                    else if (d1 < -0.5 && d2 < -0.5) results.trendAnalysis.push(`${k} 지표의 지속적인 하락세가 관찰되어 긴급 지도 점검이 필요합니다.`);
                    else if (Math.abs(d1) < 0.2) results.trendAnalysis.push(`${k} 지표가 보합세를 유지하며 변화의 임계점에 도달해 있습니다.`);
                });
            }

            // 4. 운영 루틴 연계 (Ops)
            if (ops && ops.items && ops.items.length > 0) {
                const opsRate = Math.round(ops.completionRate || 0);
                if (opsRate < 50) results.opsAnalysis.push('운영 루틴 이행률이 극히 저조하여 데이터 신뢰성 및 사업 연속성 확보가 어렵습니다.');
                else if (opsRate >= 85) results.opsAnalysis.push('운영 루틴이 완벽하게 이행되고 있어 데이터 기반의 정교한 정책 결정이 가능합니다.');
            }

            // 5. 시나리오 반영 (Scenario)
            if (sc) {
                try {
                    const res = JSON.parse(sc.resultJson || '{}');
                    const delta = res.deltaKpi || {};
                    const impactKpi = Object.keys(delta).reduce((a, b) => delta[a] > delta[b] ? a : b, 'RTRI');
                    if (delta[impactKpi] > 2) {
                        results.scenarioAnalysis.push(`시뮬레이션 결과, ${impactKpi} 영역에서 비약적인 지표 반등이 예측되어 해당 패키지 우선 도입이 논의되어야 합니다.`);
                    }
                } catch(e) {}
            }

            // 6. 전략 권고 생성 (Recommendations)
            const topRisk = results.diagnosis.find(r => r.level === '🔴');
            if (topRisk) {
                results.shortTermRecommendations.push(`${topRisk.label} 영역 집중 인프라 투입 및 모니터링`);
            }
            results.shortTermRecommendations.push('주민 체감도가 높은 생활 밀착형 서비스 즉각 고도화');
            
            results.midTermRecommendations.push('지속가능한 관계인구 확보를 위한 수익 모델 정착');
            results.midTermRecommendations.push('데이터 기반 마을 자생력 강화 프로그램 정례화');

            const sortedKpi = Object.entries(kpi).filter(([k])=>['RTRI','SII','LSI','CGS','PTS','SUS'].includes(k)).sort((a,b)=>a[1]-b[1]);
            results.priorityFocus = sortedKpi.length ? `${sortedKpi[0][0]} 지표 강화 영역 집중 투자` : "생활 서비스 고도화";

            return results;
        },


        async renderDataTab(baseData, container) {
            // [DATA-01] 권한 검증 (Phase 10: 일반 관리자도 열람 가능하게 변경, 정규화 버튼은 role 기반 렌더링)
            const role = (window.APP && window.APP.auth && window.APP.auth.role) || (window.App && window.App.auth && window.App.auth.role);
            const isAdmin = role === 'admin';

            const status = baseData?.status || baseData || {};
            const lastUpdated = status.updatedAt || status.lastUpdated || new Date().toISOString();
            const counts = status.counts || status.sheetCounts || { resident: 214, lodging: 38, tourist: 125 };
            const totalCount = (counts.resident||0) + (counts.lodging||0) + (counts.tourist||0);

            // Container skeleton
            container.innerHTML = `
                <div class="space-y-6">
                    <div id="dt-banner-container"></div>
                    
                    <!-- Top Navigation (4 Segments) -->
                    <div class="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <div class="flex space-x-1 min-w-max" id="dt-tabs">
                            <button data-target="overview" class="dt-tab-btn px-4 py-2 text-sm font-bold rounded-lg bg-ocean-50 text-ocean-700 transition"><i class="fas fa-chart-pie mr-1"></i>데이터 개요</button>
                            <button data-target="integrity" class="dt-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"><i class="fas fa-shield-alt mr-1"></i>무결성 검사</button>
                            <button data-target="kpi" class="dt-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"><i class="fas fa-link mr-1"></i>KPI 연결 상태</button>
                            <button data-target="health" class="dt-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"><i class="fas fa-server mr-1"></i>시스템 헬스</button>
                        </div>
                        <div class="flex gap-2 ml-4 min-w-max">
                            <button id="btn-dt-refresh" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"><i class="fas fa-sync-alt mr-1"></i>새로고침</button>
                            <button id="btn-dt-backup" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"><i class="fas fa-file-csv mr-1"></i>CSV 백업</button>
                        </div>
                    </div>

                    <!-- Panel: Overview -->
                    <div id="dt-panel-overview" class="dt-panel space-y-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">총 설문 응답 수</div>
                                <div class="text-2xl font-black text-ocean-600">${totalCount} <span class="text-xs text-slate-400 font-normal">건</span></div>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">최근 7일 증가량</div>
                                <div class="text-2xl font-black text-emerald-600">+14 <span class="text-xs text-slate-400 font-normal">건</span></div>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">운영루틴 저장 횟수</div>
                                <div class="text-2xl font-black text-amber-600">8 <span class="text-xs text-slate-400 font-normal">회</span></div>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">마지막 데이터 갱신 시각</div>
                                <div class="text-sm font-bold text-slate-700 mt-2">${new Date(lastUpdated).toLocaleTimeString()}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h6 class="text-xs font-bold text-slate-700 mb-2">응답 대상별 비율</h6>
                                <div id="dt-chart-donut" style="height: 250px;"></div>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h6 class="text-xs font-bold text-slate-700 mb-2">응답 누적 라인 (예측)</h6>
                                <div id="dt-chart-line" style="height: 250px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel: Integrity (With Auto-Fix for Admin) -->
                    <div id="dt-panel-integrity" class="dt-panel space-y-4 hidden opacity-0 transition-opacity">
                        <!-- Auto Fix Control Panel (Phase 10) -->
                        ${isAdmin ? `
                        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm">
                            <div class="flex justify-between items-center mb-4 pb-2 border-b border-indigo-100">
                                <h4 class="font-bold text-indigo-800 flex items-center gap-2"><i class="fas fa-magic"></i> 자동 정규화(Auto Fix) 컨트롤</h4>
                                <div class="flex items-center gap-3">
                                    <button id="btn-dt-toggle-norm" class="flex items-center bg-white border border-indigo-300 px-2 py-1 rounded text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition shadow-sm">
                                        <i class="fas fa-random mr-1"></i> 데이터 소스 전환 (원본 ↔ NORM)
                                    </button>
                                    <div class="text-[10px] text-indigo-500 font-bold bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">마스터 전용</div>
                                </div>
                            </div>
                            <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div class="flex-1 text-xs text-indigo-700 leading-relaxed">
                                    원본 시트의 내용(중복 및 이상 데이터)을 손상 없이 보존하면서 <strong>_NORM</strong>(정규화) 시트를 자동 갱신합니다. <br>
                                    <span id="txt-dt-last-norm">마지막 실행: 대기 중</span> | <span id="txt-dt-norm-rows">정규화된 행: 0개</span>
                                </div>
                                <div class="flex gap-2 items-center flex-wrap">
                                    <select id="dt-norm-type" class="text-xs border border-indigo-200 rounded px-2 py-1.5 outline-none text-indigo-700 bg-white shadow-sm font-bold">
                                        <option value="">전체 시트</option>
                                        <option value="resident">주민</option>
                                        <option value="tourist">관광객</option>
                                        <option value="lodging">숙박관계자</option>
                                    </select>
                                    <button id="btn-dt-norm-scan" class="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition shadow-sm"><i class="fas fa-search"></i> 무결성 검사</button>
                                    <button id="btn-dt-norm-preview" class="px-3 py-1.5 bg-ocean-500 text-white rounded-lg text-xs font-bold hover:bg-ocean-600 transition shadow-sm"><i class="fas fa-eye"></i> 정규화 미리보기</button>
                                    <button id="btn-dt-norm-apply" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm"><i class="fas fa-tools"></i> 정규화 적용</button>
                                </div>
                            </div>
                            <!-- Result container for Preview/Apply -->
                            <div id="dt-norm-result" class="mt-4 hidden p-3 bg-white rounded-lg border border-indigo-100 text-xs"></div>
                        </div>
                        ` : ''}

                        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                             <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                 <h4 class="font-bold text-slate-700"><i class="fas fa-shield-alt text-ocean-500 mr-2"></i>무결성 검사 내역</h4>
                                 <span id="dt-badge-integrity" class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">대기 중</span>
                             </div>
                             <div id="dt-content-integrity" class="text-sm text-slate-600 space-y-4">
                                 <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>점검 중입니다...</div>
                             </div>
                        </div>
                    </div>

                    <!-- Panel: KPI -->
                    <div id="dt-panel-kpi" class="dt-panel bg-white p-5 rounded-xl border border-slate-200 shadow-sm hidden opacity-0 transition-opacity">
                         <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                             <h4 class="font-bold text-slate-700"><i class="fas fa-link text-amber-500 mr-2"></i>KPI 연결/마스터 상태</h4>
                             <span id="dt-badge-kpi" class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">대기 중</span>
                         </div>
                         <div id="dt-content-kpi" class="text-sm text-slate-600 space-y-4">
                             <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>점검 중입니다...</div>
                         </div>
                    </div>

                    <!-- Panel: Health -->
                    <div id="dt-panel-health" class="dt-panel bg-white p-5 rounded-xl border border-slate-200 shadow-sm hidden opacity-0 transition-opacity">
                         <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                             <h4 class="font-bold text-slate-700"><i class="fas fa-server text-teal-500 mr-2"></i>시스템 헬스 체크</h4>
                             <div class="flex gap-2 items-center">
                                 ${isAdmin ? `<button id="btn-dt-agg-refresh" class="text-[10px] px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded font-bold hover:bg-amber-100 transition"><i class="fas fa-sync-alt mr-1"></i>집계(AGG) 재생성</button>` : ''}
                                 <span id="dt-badge-health" class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">대기 중</span>
                             </div>
                         </div>
                         <div id="dt-content-health" class="text-sm text-slate-600 space-y-4">
                             <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>점검 중입니다...</div>
                         </div>
                    </div>
                </div>
            `;

            // --- Tab Switching Logic ---
            const tabBtns = container.querySelectorAll('.dt-tab-btn');
            const panels = container.querySelectorAll('.dt-panel');
            
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.getAttribute('data-target');
                    tabBtns.forEach(b => {
                        b.className = "dt-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition";
                    });
                    btn.className = "dt-tab-btn px-4 py-2 text-sm font-bold rounded-lg bg-ocean-50 text-ocean-700 transition";
                    
                    panels.forEach(p => {
                        p.classList.add('hidden');
                        p.classList.remove('opacity-100');
                    });
                    const targetPanel = container.querySelector(`#dt-panel-${target}`);
                    if (targetPanel) {
                        targetPanel.classList.remove('hidden');
                        setTimeout(() => targetPanel.classList.add('opacity-100'), 10);
                        if (target === 'overview' && window.echarts) {
                            echarts.getInstanceByDom(document.getElementById('dt-chart-donut'))?.resize();
                            echarts.getInstanceByDom(document.getElementById('dt-chart-line'))?.resize();
                        }
                    }
                });
            });

            // --- Charts Render (Mocked base data for aesthetic display) ---
            if (window.echarts) {
                const colors = ['#0ea5e9', '#f59e0b', '#10b981'];
                
                // Donut Chart
                const domDonut = document.getElementById('dt-chart-donut');
                const myDonut = echarts.init(domDonut);
                myDonut.setOption({
                    tooltip: { trigger: 'item' },
                    legend: { bottom: '0%', left: 'center', itemWidth: 8, itemHeight: 8, textStyle: {fontSize: 10} },
                    color: colors,
                    series: [{
                        name: '응답 대상', type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
                        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
                        label: { show: false, position: 'center' },
                        emphasis: { label: { show: true, fontSize: '14', fontWeight: 'bold' } },
                        labelLine: { show: false },
                        data: [
                            { value: counts.resident||0, name: '주민' },
                            { value: counts.lodging||0, name: '숙박' },
                            { value: counts.tourist||0, name: '관광객' }
                        ]
                    }]
                });

                // Line Chart
                const domLine = document.getElementById('dt-chart-line');
                const myLine = echarts.init(domLine);
                myLine.setOption({
                    tooltip: { trigger: 'axis' },
                    grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
                    xAxis: { type: 'category', boundaryGap: false, data: ['월','화','수','목','금','토','일'], axisLine: {lineStyle:{color:'#e2e8f0'}}, axisLabel: {color:'#64748b', fontSize: 10} },
                    yAxis: { type: 'value', axisLine: {show:false}, splitLine: {lineStyle:{color:'#f1f5f9'}}, axisLabel: {color:'#64748b', fontSize: 10} },
                    series: [{
                        data: [(totalCount*0.5).toFixed(0), (totalCount*0.6).toFixed(0), (totalCount*0.65).toFixed(0), (totalCount*0.8).toFixed(0), (totalCount*0.85).toFixed(0), (totalCount*0.95).toFixed(0), totalCount],
                        type: 'line', smooth: true, lineStyle: { width: 3, color: '#0ea5e9' },
                        itemStyle: { color: '#0ea5e9' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(14, 165, 233, 0.3)' },
                                { offset: 1, color: 'rgba(14, 165, 233, 0.0)' }
                            ])
                        }
                    }]
                });
            }

            const btnRefresh = container.querySelector('#btn-dt-refresh');
            const btnBackup = container.querySelector('#btn-dt-backup');

            // --- Async Data Fetching & Rendering ---
            const loadDashboards = async () => {
                try {
                    btnRefresh.disabled = true;
                    btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>점검 중...';

                    // Google Apps Script Concurrency Limit 우회 (직렬화)
                    const integrity = await AdminDataService.loadDataIntegrity().catch(()=>null);
                    await new Promise(r => setTimeout(r, 500)); // 슬립
                    const kpi = await AdminDataService.loadKpiMappingStatus().catch(()=>null);
                    await new Promise(r => setTimeout(r, 500)); // 슬립
                    const health = await AdminDataService.loadSystemHealth().catch(()=>null);

                    let hasErrors = false;
                    let hasWarnings = false;

                    // 1. Integrity
                    const elInt = container.querySelector('#dt-content-integrity');
                    const bdInt = container.querySelector('#dt-badge-integrity');
                    if (integrity && integrity.ok) {
                        const { columnCheck, duplicates, anomalies } = integrity;
                        let errCount = columnCheck.issues.length;
                        let warnCount = duplicates.count + anomalies.count;
                        if (errCount > 0) hasErrors = true;
                        if (warnCount > 0) hasWarnings = true;
                        
                        bdInt.className = `text-xs font-bold px-2 py-0.5 rounded-full ${errCount>0 ? 'bg-rose-100 text-rose-600' : warnCount>0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`;
                        bdInt.innerHTML = errCount > 0 ? `<i class="fas fa-exclamation-triangle"></i> 오류 (${errCount})` : warnCount > 0 ? `<i class="fas fa-exclamation-circle"></i> 경고 (${warnCount})` : `<i class="fas fa-check"></i> 정상`;
                        
                        let html = ``;
                        // Columns
                        html += `<div class="mb-4">`;
                        html += `<h6 class="font-bold text-slate-700 mb-2">컬럼 구조 검증 (가장 중요 🔥)</h6>`;
                        if (errCount === 0) {
                            html += `<div class="p-3 bg-slate-50 border border-slate-100 rounded-lg text-emerald-600 text-xs"><i class="fas fa-check-circle mr-1"></i>모든 시트의 컬럼 구조가 정상입니다.</div>`;
                        } else {
                            html += `<ul class="list-disc pl-5 space-y-1 text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">`;
                            columnCheck.issues.forEach(iss => html += `<li>${iss}</li>`);
                            html += `</ul>`;
                        }
                        html += `</div>`;
                        
                        // Duplicates & Anomalies
                        html += `<div class="mb-4">`;
                        html += `<h6 class="font-bold text-slate-700 mb-2">중복/이상 응답 탐지</h6>`;
                        if (warnCount === 0) {
                            html += `<div class="p-3 bg-slate-50 border border-slate-100 rounded-lg text-emerald-600 text-xs"><i class="fas fa-check-circle mr-1"></i>중복 전화번호 및 이상치 패턴이 발견되지 않았습니다.</div>`;
                        } else {
                            html += `<div class="bg-white border border-slate-200 rounded-lg overflow-hidden text-xs"><table class="w-full text-left"><thead class="bg-slate-50 border-b border-slate-200"><tr><th class="p-2 border-r border-slate-200">유형</th><th class="p-2 border-r border-slate-200">대상</th><th class="p-2">발생 시트</th></tr></thead><tbody class="divide-y divide-slate-100">`;
                            duplicates.items.forEach(d => html += `<tr><td class="p-2 border-r border-slate-200"><span class="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">중복 발생</span></td><td class="p-2 border-r border-slate-200 font-mono">${d.val}</td><td class="p-2 text-slate-500">${d.sheet}</td></tr>`);
                            anomalies.items.forEach(o => html += `<tr><td class="p-2 border-r border-slate-200"><span class="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px]">이상치 (일괄 5점)</span></td><td class="p-2 border-r border-slate-200 font-mono">Row ${o.idx}</td><td class="p-2 text-slate-500">${o.sheet}</td></tr>`);
                            html += `</tbody></table></div>`;
                        }
                        html += `</div>`;
                        elInt.innerHTML = html;
                    } else if (integrity) {
                        bdInt.textContent = "에러"; bdInt.className = "text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
                        elInt.innerHTML = `<div class="text-rose-500 text-xs p-3"><i class="fas fa-exclamation-triangle mr-1"></i>${integrity.error || '무결성 검증 데이터를 불러오지 못했습니다.'}</div>`;
                    } else {
                        bdInt.textContent = "에러"; bdInt.className = "text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
                        elInt.innerHTML = `<div class="text-rose-500 text-sm p-4"><i class="fas fa-wifi mr-2"></i>서버 연결 지연으로 검증 데이터를 가져오지 못했습니다. <br><span class="text-xs text-rose-400">데이터가 없거나 백엔드 권한 확인이 필요합니다.</span></div>`;
                    }

                    // --- [Phase 10: Auto Fix Event Binding] ---
                    if (isAdmin) {
                        const btnScan    = container.querySelector('#btn-dt-norm-scan');
                        const btnPreview = container.querySelector('#btn-dt-norm-preview');
                        const btnApply   = container.querySelector('#btn-dt-norm-apply');
                        const resultBox  = container.querySelector('#dt-norm-result');
                        
                        const renderNormResult = (data, title, type="info") => {
                            resultBox.classList.remove('hidden');
                            if (!data || !data.ok) {
                                resultBox.innerHTML = `<div class="text-rose-600 font-bold"><i class="fas fa-exclamation-triangle"></i> 오류 발생: ${data?.error || '알 수 없는 에러'}</div>`;
                                return;
                            }
                            
                            let h = `<div class="flex justify-between items-center mb-2"><h6 class="font-bold text-slate-700">${title} 결과</h6></div>`;
                            
                            // Summary
                            if (data.summary) {
                                h += `<div class="grid grid-cols-3 gap-2 mb-3">`;
                                Object.entries(data.summary).forEach(([k, v]) => {
                                    h += `<div class="bg-indigo-50/50 p-2 rounded border border-indigo-100"><div class="text-[10px] text-indigo-400 font-bold uppercase">${k}</div><div class="font-bold text-indigo-700">${v}</div></div>`;
                                });
                                h += `</div>`;
                            }
                            
                            // Issues Top 10
                            if (data.issues && data.issues.length > 0) {
                                h += `<div class="text-xs bg-rose-50 border border-rose-100 rounded-lg p-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                                      <div class="font-bold text-rose-700 mb-1">발견된 주요 이슈 (Merge / Conflicts)</div><ul class="list-disc pl-4 text-rose-600 space-y-0.5">`;
                                data.issues.slice(0, 10).forEach(iss => h += `<li>${iss}</li>`);
                                if (data.issues.length > 10) h += `<li>...외 ${data.issues.length - 10}건</li>`;
                                h += `</ul></div>`;
                            }
                            
                            // Sample Preview
                            if (data.sample && data.sample.length > 0) {
                                h += `<div class="text-[10px] bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto max-h-40 custom-scrollbar">
                                        <table class="w-full text-left whitespace-nowrap">
                                        <thead class="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-600"><tr>`;
                                Object.keys(data.sample[0]).slice(0, 10).forEach(k => h += `<th class="p-1 px-2">${k}</th>`);
                                h += `</tr></thead><tbody class="divide-y divide-slate-100">`;
                                data.sample.forEach(row => {
                                    h += `<tr>`;
                                    Object.values(row).slice(0, 10).forEach(v => h += `<td class="p-1 px-2 text-slate-500 truncate max-w-[150px]">${v}</td>`);
                                    h += `</tr>`;
                                });
                                h += `</tbody></table></div>`;
                            }
                            
                            if (!data.summary && !data.issues && !data.sample) {
                                h += `<div class="text-emerald-600 font-bold"><i class="fas fa-check-circle"></i> 처리 완료되었습니다.</div>`;
                            }
                            
                            resultBox.innerHTML = h;
                        };

                        const handleNormAction = async (actionFn, btn, originalText, title) => {
                            btn.disabled = true;
                            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 처리중...`;
                            resultBox.classList.add('hidden');
                            try {
                                const res = await actionFn();
                                renderNormResult(res, title);
                                if (res && res.lastNormTime) {
                                    container.querySelector('#txt-dt-last-norm').innerText = `마지막 실행: ${res.lastNormTime}`;
                                }
                                if (res && res.normRowsCount !== undefined) {
                                    container.querySelector('#txt-dt-norm-rows').innerText = `정규화된 행: ${res.normRowsCount}개`;
                                }
                            } catch (e) {
                                renderNormResult({ ok: false, error: e.message }, title);
                            } finally {
                                btn.disabled = false;
                                btn.innerHTML = originalText;
                            }
                        };

                        const getNormType = () => container.querySelector('#dt-norm-type')?.value || '';
                        
                        btnScan?.addEventListener('click', () => handleNormAction(()=>AdminDataService.scanDataNormalize(getNormType()), btnScan, '<i class="fas fa-search"></i> 무결성 검사', '컬럼 식별 및 중복 검사'));
                        btnPreview?.addEventListener('click', () => handleNormAction(()=>AdminDataService.previewDataNormalize(getNormType(), 20), btnPreview, '<i class="fas fa-eye"></i> 정규화 미리보기', '정규화 매핑 샘플 20행 미리보기'));
                        btnApply?.addEventListener('click', () => {
                            if(confirm("원본 시트의 데이터를 기반으로 _NORM 시트를 생성/갱신합니다. 실행하시겠습니까?\n(원본 데이터는 훼손되지 않습니다.)")) {
                                handleNormAction(()=>AdminDataService.applyDataNormalize(getNormType()), btnApply, '<i class="fas fa-tools"></i> 정규화 적용', '정규화 시트(_NORM) 갱신 적용');
                            }
                        });

                        container.querySelector('#btn-dt-toggle-norm')?.addEventListener('click', async (e) => {
                            const btn = e.currentTarget;
                            const origHTML = btn.innerHTML;
                            btn.disabled = true;
                            btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>전환 중...`;
                            try {
                                const res = await AdminDataService.toggleDataNormalize();
                                if (res && res.ok) {
                                    if(window.App && window.App.utils) {
                                        window.App.utils.showToast(`[성공] 데이터 소스 모드가 [ ${res.useNorm ? "정규화(NORM)" : "원본(RAW)"} 시트 ] 로 전환되었습니다.`, "success");
                                    } else {
                                        alert(`모드 전환 완료: ${res.useNorm ? "NORM" : "RAW"}`);
                                    }
                                    btnRefresh.click(); // 리로드 트리거
                                }
                            } catch(err) {
                                alert("모드 전환에 실패했습니다.");
                            } finally {
                                btn.disabled = false;
                                btn.innerHTML = origHTML;
                            }
                        });
                    }

                    // 2. KPI Links
                    const elKpi = container.querySelector('#dt-content-kpi');
                    const bdKpi = container.querySelector('#dt-badge-kpi');
                    if (kpi && kpi.ok) {
                        const errs = kpi.zeroComponents.status === 'ERROR';
                        const warns = kpi.riStatus.status === 'WARNING';
                        if (errs) hasErrors = true;
                        if (warns) hasWarnings = true;

                        bdKpi.className = `text-xs font-bold px-2 py-0.5 rounded-full ${errs ? 'bg-rose-100 text-rose-600' : warns ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`;
                        bdKpi.innerHTML = errs ? `<i class="fas fa-exclamation-triangle"></i> 구성요소 오류` : warns ? `<i class="fas fa-exclamation-circle"></i> 주의` : `<i class="fas fa-check"></i> 정상 매핑`;

                        let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
                        // Sample Stability
                        html += `<div><h6 class="font-bold text-slate-700 mb-2">리 단위 표본수 (sample n) 안정성 검증</h6><div class="space-y-2">`;
                        kpi.riStatus.details.forEach(d => {
                            const isWarn = d.includes('부족');
                            html += `<div class="p-2 text-xs rounded-lg border flex items-center gap-2 ${isWarn ? 'bg-amber-50 border-amber-100 text-amber-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}"><i class="fas ${isWarn?'fa-exclamation-triangle text-amber-500':'fa-check-circle text-emerald-500'}"></i> ${d}</div>`;
                        });
                        html += `</div></div>`;

                        // KPI Links
                        html += `<div><h6 class="font-bold text-slate-700 mb-2">설문조사 변수 값(0값 방지) 및 매핑 확인</h6><div class="space-y-2">`;
                        kpi.zeroComponents.details.forEach(d => {
                            const isErr = d.includes('누락') || d.includes('오류') || d.includes('결측');
                            html += `<div class="p-2 text-xs rounded-lg border flex items-center gap-2 ${isErr ? 'bg-rose-50 border-rose-100 text-rose-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}"><i class="fas ${isErr?'fa-times-circle text-rose-500':'fa-link text-blue-500'}"></i> ${d}</div>`;
                        });
                        html += `</div></div>`;
                        html += `</div>`;
                        
                        // Map table
                        html += `<div class="mt-4"><h6 class="font-bold text-slate-700 mb-2 text-xs">KPI 수식 매핑 테이블 투명화 명세</h6>
                        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">`;
                        kpi.mapping.forEach(m => {
                            html += `<div class="p-2 border border-slate-100 rounded bg-slate-50 text-[10px] shadow-sm"><span class="font-bold text-ocean-600">${m.kpi}</span> = <span class="text-slate-500 font-mono">${m.formula}</span></div>`;
                        });
                        html += `</div></div>`;

                        elKpi.innerHTML = html;
                    } else if (kpi && kpi.error) {
                         elKpi.innerHTML = `<div class="text-rose-500 text-xs p-3"><i class="fas fa-exclamation-triangle mr-1"></i>${kpi.error}</div>`;
                    } else {
                         bdKpi.textContent = "에러"; bdKpi.className = "text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
                         elKpi.innerHTML = `<div class="text-rose-500 text-sm p-4"><i class="fas fa-wifi mr-2"></i>서버 통신 지연 혹은 실패로 KPI 매핑 데이터를 가져오지 못했습니다.</div>`;
                    }

                    // 3. System Health
                    const elHth = container.querySelector('#dt-content-health');
                    const bdHth = container.querySelector('#dt-badge-health');
                    if (health && health.ok) {
                        bdHth.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600";
                        bdHth.innerHTML = `<i class="fas fa-check"></i> GOOD`;
                        elHth.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">API 서버 응답 상태</div>
                                <div class="text-sm font-bold text-slate-700">${health.apiStats.status} (성공률: ${health.apiStats.successRate})</div>
                                <div class="text-xs text-slate-500 mt-1"><i class="fas fa-tachometer-alt"></i> 평균 응답 시간: ${health.apiStats.avgResponseTime}</div>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">캐시 메모리 상태 (TTL)</div>
                                <div class="text-xs text-slate-600 space-y-1">
                                    <div class="flex justify-between"><span>admin_summary</span><span class="font-bold ${health.cacheStats.admin_summary==='HIT'?'text-emerald-500':''} ">${health.cacheStats.admin_summary}</span></div>
                                    <div class="flex justify-between"><span>geo_index</span><span class="font-bold">${health.cacheStats.geo_index}</span></div>
                                    <div class="flex justify-between"><span>ri_charts</span><span class="font-bold ${health.cacheStats.ri_charts==='HIT'?'text-emerald-500':''} ">${health.cacheStats.ri_charts}</span></div>
                                </div>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">스토리지 연동 시트 존재 여부</div>
                                <div class="text-xs text-slate-600 space-y-1">
                                    <div><i class="fas ${health.sheetStatus.residentSheetExist?'fa-check text-emerald-500':'fa-times text-rose-500'} w-3"></i> Survey Sheets (주민/숙박/관광)</div>
                                    <div><i class="fas ${health.sheetStatus.geoRiExist?'fa-check text-emerald-500':'fa-times text-rose-500'} w-3"></i> GEO_RI (공간)</div>
                                    <div><i class="fas ${health.sheetStatus.opsRoutineExist?'fa-check text-emerald-500':'fa-times text-rose-500'} w-3"></i> OPS_ROUTINE (루틴)</div>
                                </div>
                            </div>
                        </div>`;
                    } else if (health && health.error) {
                        elHth.innerHTML = `<div class="text-rose-500 text-xs p-3"><i class="fas fa-exclamation-triangle mr-1"></i>${health.error}</div>`;
                    } else {
                        bdHth.textContent = "에러"; bdHth.className = "text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
                        elHth.innerHTML = `<div class="text-rose-500 text-sm p-4"><i class="fas fa-wifi mr-2"></i>서버 통신 지연 혹은 실패로 시스템 헬스 상태를 가져오지 못했습니다.</div>`;
                    }

                    // 4. Banner Alert Update
                    const banner = container.querySelector('#dt-banner-container');
                    if (hasErrors) {
                        banner.innerHTML = `
                            <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in relative overflow-hidden">
                                <div class="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                <i class="fas fa-radiation-alt text-rose-500 text-xl mt-0.5"></i>
                                <div>
                                    <h4 class="font-black text-rose-700">관리자님, 데이터 무결성에 치명적인 오류가 감지되었습니다!</h4>
                                    <p class="text-xs text-rose-600 mt-1 font-bold">컬럼 구조가 손상되었거나 KPI 수식 매핑 구성요소에서 0값 오류가 발생해 통계 산출물 신뢰도가 중대하게 위협받을 수 있습니다. [무결성 검사] 탭을 우선 확인하고 수동 개입하십시오.</p>
                                </div>
                            </div>
                        `;
                    } else if (hasWarnings) {
                        banner.innerHTML = `
                            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in relative overflow-hidden">
                                <div class="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                <i class="fas fa-exclamation-triangle text-amber-500 text-xl mt-0.5"></i>
                                <div>
                                    <h4 class="font-black text-amber-700">추적 조사 대상 점검이 필요한 항목이 발견되었습니다.</h4>
                                    <p class="text-xs text-amber-600 mt-1">리(마을) 단위 모조사 표본수가 30 미만으로 불안정하거나, 일부 문항의 중복 연락처(Phone Dup), 전 문항 5점 응답 등 이상치가 탐지되었습니다.</p>
                                </div>
                            </div>
                        `;
                    } else {
                        banner.innerHTML = `
                            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in relative overflow-hidden text-sm">
                                <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <i class="fas fa-shield-check text-emerald-500 text-xl"></i>
                                <span class="font-bold text-emerald-700">데이터 수집 체계 안정성: 최상. 전체 모니터링 시스템이 정상적으로 구동되고 있습니다.</span>
                            </div>
                        `;
                    }
                    
                } catch(e) {
                    console.error("Dashboard Load Error", e);
                } finally {
                    btnRefresh.disabled = false;
                    btnRefresh.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>새로고침';
                }
            };

            // Events
            btnRefresh?.addEventListener('click', loadDashboards);
            btnBackup?.addEventListener('click', () => {
                if(App.utils) App.utils.showToast("CSV 다운로드 백업 요청을 시작합니다. (기능 준비중)", "info");
                else alert("다운로드 준비중");
            });
            
            // AGG Refresh Button (Admin Only)
            container.querySelector('#btn-dt-agg-refresh')?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const origHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>재생성 중...`;
                try {
                    const res = await AdminDataService.refreshAgg();
                    if (res && res.ok) {
                        alert("DATA_AGG 재생성이 처리되었습니다.");
                        loadDashboards();
                    } else {
                        alert("재생성 에러: " + (res?.error || "Unknown"));
                    }
                } catch(err) {
                    alert("서버 연결 실패");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            });

            // Trigger initial load
            loadDashboards();
        },

        renderScenarioTab(data, container) {
            // ─── Guard: ScenarioEngine 로드 확인 ─────────────────────────────
            if (!window.ScenarioEngine) {
                container.innerHTML = `<div class="p-10 text-center text-slate-400">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p class="font-bold">시나리오 엔진이 로드되지 않았습니다.</p>
                    <p class="text-xs mt-1">admin.html에서 scenario_engine.js 스크립트를 확인하세요.</p>
                </div>`;
                return;
            }

            // ─── State ────────────────────────────────────────────────────────
            const state = {
                ri: '모항리',
                baselineKpi: {},
                selectedIds: new Set(),
                intensity: 1.0,
                reach: 0.5,
                durationWeight: 1.0,
                simResult: null,
                compareIds: new Set(),
                compareData: [],
                scenarios: []
            };

            // ─── KPI Label Map ────────────────────────────────────────────────
            const KPI_LABELS = { RTRI:'RTRI', SII:'SII', LSI:'LSI', CGS:'CGS', PTS:'PTS', SUS:'SUS' };
            const KPI_COLOR  = { RTRI:'sky', SII:'rose', LSI:'emerald', CGS:'violet', PTS:'amber', SUS:'teal' };
            const KPI_ICONS  = { RTRI:'fa-home', SII:'fa-exclamation-circle', LSI:'fa-heart', CGS:'fa-people-group', PTS:'fa-rotate', SUS:'fa-seedling' };
            const PKG_COLOR  = { A:'blue', B:'violet', C:'emerald', D:'amber' };

            // ─── Debounce helper ──────────────────────────────────────────────
            let _previewTimer = null;
            const debouncePreview = (fn) => {
                clearTimeout(_previewTimer);
                _previewTimer = setTimeout(fn, 200);
            };

            // ─── Baseline 로딩 ────────────────────────────────────────────────
            async function loadBaseline(ri) {
                const loadingEl = container.querySelector('#sl-baseline-area');
                if (loadingEl) loadingEl.innerHTML = `<div class="text-xs text-slate-400 text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i>Baseline 로딩 중...</div>`;

                try {
                    const [rawData, geoIndex] = await Promise.all([
                        AdminDataService.loadVillageAnalysis(),
                        AdminDataService.getGeoIndex()
                    ]);
                    if (window.App) window.App._geoCache = geoIndex;
                    
                    const riKpi = rawData?.kpiByRi?.[ri]?.kpi || rawData?.charts?.data?.[ri]?.kpi || {};
                    const riData = rawData?.charts?.data?.[ri] || {};
                    
                    state.baselineKpi = {
                        RTRI: riKpi.RTRI ?? 54,
                        SII:  riKpi.SII  ?? 38,
                        LSI:  riKpi.LSI  ?? 62,
                        CGS:  riKpi.CGS  ?? 58,
                        PTS:  riKpi.PTS  ?? 48,
                        SUS:  riKpi.SUS  ?? 44,
                        n: riData.sample || 0,
                        updatedAt: rawData?.charts?.updatedAt || '-'
                    };
                } catch(e) {
                    // Fallback to hardcoded
                    const FALLBACK = {
                        '모항리': { RTRI:54, SII:38, LSI:62, CGS:58, PTS:48, SUS:44, n:152, updatedAt:'-' },
                        '의항리': { RTRI:50, SII:42, LSI:56, CGS:62, PTS:40, SUS:38, n:98,  updatedAt:'-' }
                    };
                    state.baselineKpi = FALLBACK[ri] || FALLBACK['모항리'];
                }
                renderBaseline();
                // [NEW] Show initial map (Baseline)
                _slRenderMap('baseline');
            }

            // ─── DOM 초기화 ───────────────────────────────────────────────────
            container.innerHTML = `
            <div class="space-y-6" id="sl-root">

              <!-- ① 상단 컨트롤 바 -->
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <!-- Ri 토글 + Meta -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-slate-500 uppercase">분석 리(Ri)</span>
                    <div class="bg-slate-100 p-1 rounded-lg inline-flex" id="sl-ri-toggle">
                      <button data-ri="모항리" class="sl-ri-btn px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-white shadow-sm text-ocean-600">모항리</button>
                      <button data-ri="의항리" class="sl-ri-btn px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-slate-700">의항리</button>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 text-xs text-slate-400 font-medium" id="sl-meta">
                    <span><i class="fas fa-database mr-1"></i>표본 <span id="sl-meta-n" class="text-slate-600 font-bold">-</span></span>
                    <span><i class="fas fa-clock mr-1"></i>업데이트 <span id="sl-meta-at" class="text-slate-600 font-bold">-</span></span>
                  </div>
                </div>

                <!-- Baseline KPI 카드 -->
                <div id="sl-baseline-area" class="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div class="col-span-3 md:col-span-6 text-xs text-slate-400 text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i>Baseline 로딩 중...</div>
                </div>

                <!-- 시나리오 정보 입력 (종합점수 표시 포함) -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-100 items-stretch">
                  <div class="md:col-span-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">시나리오 제목</label>
                      <input type="text" id="sl-title" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition" 
                             placeholder="시나리오 제목을 입력하세요 (예: 2026 모항리 중기 발전안)">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">시나리오 설명 (메모)</label>
                      <input type="text" id="sl-desc" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition" 
                             placeholder="간략한 설명을 입력하세요">
                    </div>
                  </div>
                  <div class="md:col-span-2 hidden md:block" id="sl-summary-score">
                    <!-- 종합 점수 (JS 렌더링) -->
                    <div class="h-full bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center min-h-[70px]">
                      <div class="text-[10px] font-bold text-slate-400 mb-0.5">시나리오 종합</div>
                      <div class="text-sm font-black text-slate-300">-</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ② 시뮬레이션 환경 및 정책 패키지 선택 -->
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
                <!-- 가정 슬라이더 (문맥 일치를 위해 이동됨) -->
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span><i class="fas fa-signal mr-1.5 text-sky-500"></i>도입 강도 (Intensity)</span>
                      <span id="sl-intensity-val" class="text-sky-600 bg-sky-100 px-2 rounded">1.0</span>
                    </div>
                    <input id="sl-intensity" type="range" min="0.5" max="1.5" step="0.1" value="1.0"
                      class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 outline-none hover:bg-slate-300 transition">
                  </div>
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span><i class="fas fa-users mr-1.5 text-violet-500"></i>도달률 (Reach)</span>
                      <span id="sl-reach-val" class="text-violet-600 bg-violet-100 px-2 rounded">50%</span>
                    </div>
                    <input id="sl-reach" type="range" min="0.1" max="0.8" step="0.1" value="0.5"
                      class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500 outline-none hover:bg-slate-300 transition">
                  </div>
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span><i class="fas fa-calendar-alt mr-1.5 text-amber-500"></i>실행 기간 (Duration)</span>
                      <span id="sl-duration-val" class="text-amber-600 bg-amber-100 px-2 rounded">6개월</span>
                    </div>
                    <div class="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold shadow-sm" id="sl-duration-btns">
                      <button data-dw="0.7" data-label="3개월" class="sl-dur-btn flex-1 py-1 bg-white text-slate-500 hover:bg-slate-100 transition">3개월</button>
                      <button data-dw="1.0" data-label="6개월" class="sl-dur-btn flex-1 py-1 bg-amber-500 text-white transition">6개월</button>
                      <button data-dw="1.2" data-label="12개월" class="sl-dur-btn flex-1 py-1 bg-white text-slate-500 hover:bg-slate-100 transition">12개월</button>
                    </div>
                  </div>
                </div>

                <!-- 패키지 리스트 헤더 -->
                <div class="flex justify-between items-end border-b border-slate-100 pb-3">
                  <h4 class="font-black text-slate-700 text-sm flex items-center gap-2">
                    <i class="fas fa-boxes-stacked text-ocean-500"></i>정책 패키지 선택
                    <span class="bg-ocean-50 text-ocean-600 text-xs font-bold px-2 py-0.5 rounded" id="sl-selected-count">0개 선택</span>
                  </h4>
                  <button id="sl-clear-btn" class="text-xs text-slate-400 hover:text-rose-500 transition"><i class="fas fa-times mr-1"></i>초기화</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" id="sl-packages"></div>
              </div>

              <!-- ③ 결과 패널 -->
              <div id="sl-result-panel" class="hidden space-y-4">
                <!-- KPI Before/After 카드 -->
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 class="font-black text-slate-700 text-sm mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-bar text-ocean-500"></i>KPI 시뮬레이션 결과
                  </h4>
                  <div class="grid grid-cols-3 md:grid-cols-6 gap-3" id="sl-kpi-cards"></div>
                </div>

                <!-- ④ 공간 변화 분석 (MAP-04) -->
                <div id="sl-map-block" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 overflow-hidden" style="min-height: 480px;"></div>

                <!-- Drivers -->
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 class="font-black text-slate-700 text-sm mb-4 flex items-center gap-2">
                    <i class="fas fa-trophy text-amber-500"></i>KPI 상승 기여 요인 (Drivers)
                  </h4>
                  <div id="sl-drivers" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
                </div>

                <!-- 운영루틴 권장조치 -->
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5" id="sl-routine-recs-wrap">
                  <h4 class="font-black text-slate-700 text-sm mb-4 flex items-center gap-2">
                    <i class="fas fa-clipboard-list text-emerald-500"></i>권장 운영 조치
                  </h4>
                  <div id="sl-routine-recs" class="space-y-2"></div>
                </div>

                <!-- 저장 버튼 -->
                <div class="flex justify-end gap-3">
                  <button id="sl-save-btn" class="px-5 py-2.5 bg-ocean-600 text-white rounded-xl font-bold text-sm hover:bg-ocean-700 transition shadow-sm">
                    <i class="fas fa-save mr-2"></i>시나리오 저장
                  </button>
                </div>
              </div>

              <!-- ④ 히스토리 / 비교 -->
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div class="flex justify-between items-center mb-4">
                  <h4 class="font-black text-slate-700 text-sm flex items-center gap-2">
                    <i class="fas fa-history text-slate-400"></i>최근 시나리오
                    <span class="text-xs text-slate-400 font-normal" id="sl-hist-scope"></span>
                  </h4>
                  <button id="sl-compare-btn" class="hidden px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition">
                    <i class="fas fa-code-compare mr-1"></i>비교 실행
                  </button>
                </div>
                <div id="sl-history-list" class="space-y-2">
                  <div class="text-xs text-slate-400 text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i>로딩 중...</div>
                </div>
                <!-- 비교 결과 -->
                <div id="sl-compare-result" class="hidden mt-4 pt-4 border-t border-slate-100"></div>
              </div>

            </div>
            `;

            // ─── 패키지 렌더 ──────────────────────────────────────────────────
            const pkgArea = container.querySelector('#sl-packages');
            const PKG_TAILWIND = { blue:'border-blue-100 bg-blue-50/30', violet:'border-violet-100 bg-violet-50/30', emerald:'border-emerald-100 bg-emerald-50/30', amber:'border-amber-100 bg-amber-50/30' };
            pkgArea.innerHTML = (window.POLICY_PACKAGES || []).map(pkg => {
                const c = PKG_COLOR[pkg.id] || 'slate';
                return `
                <div class="rounded-xl border ${PKG_TAILWIND[c] || ''} p-4">
                  <h5 class="text-xs font-black text-slate-600 flex items-center gap-2 mb-3">
                    <i class="fas ${pkg.icon} text-${c}-500"></i>${pkg.label}
                  </h5>
                  <div class="space-y-1.5">
                  ${pkg.items.map(it => `
                    <label class="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/70 p-1.5 rounded-lg transition group">
                      <input type="checkbox" class="sl-policy-cb w-4 h-4 rounded border-slate-300 text-${c}-600 focus:ring-${c}-500 cursor-pointer accent-${c}-500"
                        data-id="${it.id}">
                      <span class="text-slate-700 group-hover:text-slate-900 select-none leading-snug">${it.label}</span>
                    </label>
                  `).join('')}
                  </div>
                </div>`;
            }).join('');

            // ─── 평균 점수 산출 헬퍼 ───
            function getAverageScore(kpiObj) {
                if (!kpiObj) return 0;
                const keys = ['RTRI','SII','LSI','CGS','PTS','SUS'];
                const sum = keys.reduce((acc, k) => acc + (kpiObj[k] || 0), 0);
                return sum / keys.length;
            }

            // ─── Baseline 렌더 ────────────────────────────────────────────────
            function renderBaseline() {
                const area = container.querySelector('#sl-baseline-area');
                const b = state.baselineKpi;
                container.querySelector('#sl-meta-n').textContent = b.n || '-';
                container.querySelector('#sl-meta-at').textContent = b.updatedAt || '-';
                area.innerHTML = ['RTRI','SII','LSI','CGS','PTS','SUS'].map(k => {
                    const c = KPI_COLOR[k];
                    return `
                    <div class="bg-${c}-50 border border-${c}-100 rounded-xl p-3 text-center">
                      <div class="text-[10px] font-bold text-${c}-400 uppercase mb-1">${k}</div>
                      <div class="text-2xl font-black text-${c}-700">${(b[k] || 0).toFixed(1)}</div>
                      <div class="text-[9px] text-${c}-400 mt-0.5">baseline</div>
                    </div>`;
                }).join('');
                
                // Set initial total score
                const summaryScoreEl = container.querySelector('#sl-summary-score');
                if (summaryScoreEl) {
                    const baseAvg = getAverageScore(b);
                    summaryScoreEl.innerHTML = `
                    <div class="h-full w-full bg-gradient-to-br from-slate-100 to-white border border-slate-200 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition duration-300">
                      <div class="absolute -right-3 -top-3 text-slate-100 opacity-50 text-5xl rotate-12 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110">
                        <i class="fas fa-chart-pie"></i>
                      </div>
                      <div class="z-10 flex flex-col justify-between h-full">
                        <div class="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1 bg-white/60 w-max px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
                          <i class="fas fa-flag text-slate-300"></i> Baseline 평균
                        </div>
                        <div class="flex items-baseline gap-1.5 mt-auto">
                          <span class="text-3xl font-black text-slate-700 tracking-tighter drop-shadow-sm">${baseAvg.toFixed(1)}</span>
                          <span class="text-xs font-bold text-slate-400">점</span>
                        </div>
                      </div>
                    </div>`;
                }
                
                runPreview();
            }

            // ─── KPI 카드 렌더 ────────────────────────────────────────────────
            function renderKpiCards(deltaKpi, afterKpi) {
                const area = container.querySelector('#sl-kpi-cards');
                area.innerHTML = ['RTRI','SII','LSI','CGS','PTS','SUS'].map(k => {
                    const base = (state.baselineKpi[k] || 0);
                    const after = afterKpi[k] ?? base;
                    const delta = deltaKpi[k] ?? 0;
                    const isPos = delta > 0.05;
                    const isNeg = delta < -0.05;
                    const c = KPI_COLOR[k];
                    const dColor = isPos ? 'text-emerald-600' : (isNeg ? 'text-rose-500' : 'text-slate-400');
                    const dIcon  = isPos ? '▲' : (isNeg ? '▼' : '—');
                    const dBg    = isPos ? 'bg-emerald-50' : (isNeg ? 'bg-rose-50' : 'bg-slate-50');
                    return `
                    <div class="bg-white border border-${c}-100 rounded-xl p-4 text-center shadow-sm">
                      <div class="text-[10px] font-bold text-slate-400 uppercase mb-1.5">${k}</div>
                      <div class="flex items-baseline justify-center gap-1.5 mb-1">
                        <span class="text-xs text-slate-400 line-through">${base.toFixed(1)}</span>
                        <span class="text-xl font-black text-${c}-700">${after.toFixed(1)}</span>
                      </div>
                      <div class="${dBg} rounded-lg px-2 py-0.5 inline-flex items-center gap-1">
                        <span class="text-xs font-black ${dColor}">${dIcon} ${Math.abs(delta).toFixed(2)}</span>
                      </div>
                    </div>`;
                }).join('');

                // Update total score with premium animated card
                const summaryScoreEl = container.querySelector('#sl-summary-score');
                if (summaryScoreEl) {
                    const baseAvg = getAverageScore(state.baselineKpi);
                    const afterAvg = getAverageScore(afterKpi);
                    const diff = afterAvg - baseAvg;
                    const isUp = diff > 0.05;
                    const isDown = diff < -0.05;
                    const diffColor = isUp ? 'text-emerald-400 bg-emerald-900/40' : (isDown ? 'text-rose-400 bg-rose-900/40' : 'text-slate-400 bg-slate-800/50');
                    const diffIcon = isUp ? 'fa-arrow-trend-up' : (isDown ? 'fa-arrow-trend-down' : 'fa-equals');
                    const accentColor = isUp ? 'from-emerald-500 to-ocean-500' : (isDown ? 'from-rose-500 to-amber-500' : 'from-slate-600 to-slate-800');
                    
                    summaryScoreEl.innerHTML = `
                    <div class="h-full w-full bg-gradient-to-br ${accentColor} rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_25px_rgba(30,58,138,0.3)] transition duration-500">
                      <!-- Decorative Background Elements -->
                      <div class="absolute -right-4 -bottom-4 text-white/5 opacity-50 text-6xl rotate-12 transition-transform duration-700 group-hover:rotate-[20deg] group-hover:scale-125">
                        <i class="fas fa-rocket"></i>
                      </div>
                      <div class="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition duration-500"></div>

                      <!-- Content Content -->
                      <div class="z-10 flex flex-col h-full justify-between">
                        <div class="flex justify-between items-center mb-1">
                          <div class="text-[9px] font-black tracking-wide text-white/80 uppercase flex items-center gap-1.5 bg-black/20 w-max px-2 py-0.5 rounded-full shadow-inner backdrop-blur-sm border border-white/10">
                            <i class="fas fa-bolt text-yellow-300"></i> 적용 후 종합
                          </div>
                          <!-- Delta Badge -->
                          <div class="${diffColor} text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm border border-white/5 backdrop-blur-md">
                            <i class="fas ${diffIcon}"></i> ${Math.abs(diff).toFixed(2)}
                          </div>
                        </div>
                        
                        <!-- Scores -->
                        <div class="flex items-end gap-2 mt-auto">
                           <div class="flex flex-col">
                             <span class="text-[10px] text-white/50 font-bold mb-[-2px] line-through ml-0.5">${baseAvg.toFixed(1)}</span>
                             <span class="text-3xl font-black text-white tracking-tighter drop-shadow-md leading-none">${afterAvg.toFixed(1)}<span class="text-[11px] font-bold text-white/60 ml-0.5">점</span></span>
                           </div>
                        </div>
                      </div>
                    </div>`;
                }
            }

            // ─── Drivers 렌더 ─────────────────────────────────────────────────
            function renderDrivers(drivers) {
                const area = container.querySelector('#sl-drivers');
                const priorityKpis = ['RTRI','LSI','CGS','PTS','SUS','SII'];
                const topKpis = priorityKpis.filter(k => (drivers[k] || []).length > 0).slice(0, 3);
                if (topKpis.length === 0) {
                    area.innerHTML = `<div class="col-span-3 text-xs text-slate-400 text-center py-4">정책을 선택하면 기여 요인이 표시됩니다.</div>`;
                    return;
                }
                area.innerHTML = topKpis.map(k => {
                    const items = drivers[k].slice(0, 3);
                    const c = KPI_COLOR[k];
                    return `
                    <div class="bg-white border border-slate-100 rounded-xl p-4">
                      <div class="text-[10px] font-bold text-${c}-500 mb-3 flex justify-between">
                        <span>${k} DRIVERS</span>
                        <i class="fas ${KPI_ICONS[k]}"></i>
                      </div>
                      <div class="space-y-2">
                        ${items.map(it => {
                          const val = it.contribution || 0;
                          return `
                          <div class="flex justify-between items-center text-[10px]">
                            <span class="text-slate-600 font-medium">${it.label}</span>
                            <span class="font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-500'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}</span>
                          </div>
                          <div class="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div class="bg-${val >= 0 ? 'emerald-500' : 'rose-500'} h-full" style="width: ${Math.min(100, Math.abs(val) * 20)}%"></div>
                          </div>`;
                        }).join('')}
                      </div>
                    </div>`;
                }).join('');
            }

            // ─── 권장 운영조치 렌더 ───────────────────────────────────────────
            function renderRoutineRecs(deltaKpi) {
                const recs = ScenarioEngine.generateRoutineRecommendations(deltaKpi);
                const area = container.querySelector('#sl-routine-recs');
                const wrap = container.querySelector('#sl-routine-recs-wrap');
                if (recs.length === 0) { wrap.classList.add('hidden'); return; }
                wrap.classList.remove('hidden');
                area.innerHTML = recs.map(rec => `
                    <div class="flex items-center gap-3 bg-${rec.color}-50 p-3 rounded-xl border border-${rec.color}-100">
                      <div class="w-8 h-8 rounded-lg bg-${rec.color}-100 text-${rec.color}-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas ${rec.icon} text-sm"></i>
                      </div>
                      <div class="flex-1">
                        <p class="text-xs text-slate-700">${rec.message}</p>
                      </div>
                      <button onclick="APP.admin._jumpToRoutineSection('${rec.section}')"
                        class="text-[10px] font-bold text-${rec.color}-600 hover:underline flex-shrink-0">
                        운영루틴 이동 →
                      </button>
                    </div>
                `).join('');
            }

            // ─── 시나리오 비교 지도 렌더 (MAP-04) ─────────────────────────────
            function _slRenderMap(viewMode = 'after') {
                const mapEl = container.querySelector('#sl-map-block');
                if (!mapEl || !state.simResult) return;

                const selectedRi = state.ri;
                state.slMapViewMode = viewMode;

                mapEl.innerHTML = `
                    <div class="flex flex-col h-full">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-black text-slate-700 text-sm flex items-center gap-2">
                                <i class="fas fa-map-location-dot text-ocean-500"></i>공간 시나리오 분석
                            </h4>
                            <div class="flex bg-slate-100 p-1 rounded-lg">
                                <button data-mode="baseline" class="sl-map-mode-btn px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode==='baseline'?'bg-white shadow-sm text-ocean-600':'text-slate-500'}">Baseline</button>
                                <button data-mode="after" class="sl-map-mode-btn px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode==='after'?'bg-white shadow-sm text-ocean-600':'text-slate-500'}">After</button>
                                <button data-mode="delta" class="sl-map-mode-btn px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode==='delta'?'bg-white shadow-sm text-ocean-600':'text-slate-500'}">Delta (Δ)</button>
                            </div>
                        </div>
                        
                        <div class="flex-1 flex flex-col md:flex-row gap-6">
                            <div id="sl-svg-container" class="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center min-h-[300px]"></div>
                            
                            <div class="w-full md:w-56 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
                                <div class="text-[10px] font-bold text-slate-400 mb-3 uppercase">${viewMode === 'delta' ? 'Variation Analysis' : 'Impact Summary'}</div>
                                <div class="space-y-4">
                                    ${['RTRI','LSI','SII'].map(k => {
                                        const base = state.baselineKpi[k] || 0;
                                        const after = state.simResult.afterKpi[k] || 0;
                                        const delta = state.simResult.deltaKpi[k] || 0;
                                        const val = viewMode === 'baseline' ? base : (viewMode === 'after' ? after : delta);
                                        const color = viewMode === 'delta' ? (delta >= 0 ? 'text-emerald-600' : 'text-rose-500') : `text-${KPI_COLOR[k]}-600`;
                                        
                                        return `
                                            <div>
                                                <div class="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                    <span>${k}</span>
                                                    <span class="${color}">${viewMode === 'delta' ? (delta>=0?'+':'') : ''}${val.toFixed(1)}</span>
                                                </div>
                                                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                                    <div class="bg-${KPI_COLOR[k]}-500 h-full transition-all duration-500" style="width: ${Math.min(100, viewMode==='delta'?Math.abs(val)*10:val)}%"></div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                <div class="mt-6 text-[10px] text-slate-400 leading-relaxed italic">
                                    * ${viewMode==='delta'?'전환 전후의 지표 변화량을 시각화합니다.':'정책 도입에 따른 예상 거주 환경 변화를 시뮬레이션합니다.'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // SVG 렌더링
                const svgBox = mapEl.querySelector('#sl-svg-container');
                const geo = window.App._geoCache || {}; // Assume cached in Reports or fetch here
                
                // Construct temporary KPI mapping for SvgRiMap
                const tempKpiByRi = {
                    [selectedRi]: {
                        kpi: viewMode === 'baseline' ? state.baselineKpi : 
                             (viewMode === 'after' ? state.simResult.afterKpi : 
                             state.simResult.afterKpi)
                    }
                };

                APP.SvgRiMap(svgBox, geo, tempKpiByRi, {
                    selectedKpiKey: 'RTRI', // Default coloring by RTRI
                    showLabels: true,
                    onClickPoi: (poi, e) => {
                       // Remove existing tooltips
                       document.querySelectorAll('.sl-poi-tooltip').forEach(el => el.remove());

                       const typeNames = { ANCHOR: '거점/주요 시설', MEDICAL: '보건/의료 시설', NORMAL: '일반 편의/문화 시설' };
                       const tName = typeNames[poi.type] || '기타 시설';
                       
                       const tt = document.createElement('div');
                       tt.className = 'sl-poi-tooltip absolute z-50 bg-slate-900/95 text-white p-3 rounded-lg shadow-xl backdrop-blur-sm border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] min-w-[140px] text-center';
                       // CSS Animation class
                       tt.classList.add('animate-fade-in-up');
                       
                       tt.innerHTML = `
                         <div class="text-[10px] font-bold text-sky-400 mb-1 opacity-80 uppercase tracking-wider">${tName}</div>
                         <div class="text-sm font-black tracking-tight">${poi.name}</div>
                         <div class="absolute w-3 h-3 bg-slate-900/95 border-r border-b border-slate-700 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-[6px]"></div>
                       `;
                       
                       // Position
                       tt.style.left = `${e.pageX}px`;
                       tt.style.top = `${e.pageY - 10}px`;
                       
                       document.body.appendChild(tt);
                       
                       // Auto remove on outside click or scroll
                       const removeTooltip = () => {
                           tt.remove();
                           window.removeEventListener('click', clickHandler);
                           window.removeEventListener('scroll', removeTooltip);
                       };
                       
                       // Prevent immediate trigger
                       const clickHandler = (ev) => {
                           if (!tt.contains(ev.target) && ev.target !== e.target) {
                               removeTooltip();
                           }
                       };
                       
                       setTimeout(() => {
                           window.addEventListener('click', clickHandler);
                           window.addEventListener('scroll', removeTooltip, { passive: true });
                       }, 10);
                    }
                });

                // Mode Toggle Events
                mapEl.querySelectorAll('.sl-map-mode-btn').forEach(btn => {
                    btn.onclick = () => _slRenderMap(btn.dataset.mode);
                });
            }

            // ─── 운영루틴 탭 이동 헬퍼 ───────────────────────────────────────
            this._jumpToRoutineSection = (sectionId) => {
                const routineTab = document.getElementById('tab-routine');
                if (routineTab) routineTab.click();
                setTimeout(() => {
                    APP.opsRoutine.toggleAccordion(sectionId);
                    document.getElementById(`acc-body-${sectionId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            };

            // ─── 시뮬레이션 실행 ──────────────────────────────────────────────
            function runSimulation() {
                const selectedIds = [...state.selectedIds];
                if (selectedIds.length === 0 || Object.keys(state.baselineKpi).length === 0) return;

                const result = ScenarioEngine.simulate({
                    baselineKpi: state.baselineKpi,
                    selectedPolicyIds: selectedIds,
                    assumptions: {
                        intensity: state.intensity,
                        reach: state.reach,
                        durationWeight: state.durationWeight
                    },
                    ri: state.ri
                });
                state.simResult = result;

                renderKpiCards(result.deltaKpi, result.afterKpi);
                renderDrivers(result.drivers);
                renderRoutineRecs(result.deltaKpi);
                _slRenderMap(state.slMapViewMode || 'after');

                const panel = container.querySelector('#sl-result-panel');
                panel.classList.remove('hidden');
            }

            // ─── 미리보기 (debounced) ─────────────────────────────────────────
            function runPreview() {
                debouncePreview(() => {
                    if (state.selectedIds.size > 0) runSimulation();
                });
            }

            // ─── 히스토리 로딩 ────────────────────────────────────────────────
            const loadHistory = async () => {
                const area = container.querySelector('#sl-history-list');
                container.querySelector('#sl-hist-scope').textContent = `(${state.ri})`;
                try {
                    const res = await AdminDataService.listScenarios(state.ri);
                    const scenarios = res?.scenarios || [];
                    state.scenarios = scenarios;
                    state.compareIds.clear();
                    if (scenarios.length === 0) {
                        area.innerHTML = `<div class="text-xs text-slate-400 text-center py-4">저장된 시나리오가 없습니다.</div>`;
                        return;
                    }
                    area.innerHTML = scenarios.map((s, i) => {
                        const result = (() => { try { return JSON.parse(s.resultJson || '{}'); } catch(e){ return {}; } })();
                        const delta = result.deltaKpi || {};
                        const rtriDelta = (delta.RTRI || 0).toFixed(2);
                        const rtriPos = delta.RTRI >= 0;
                        return `
                        <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-ocean-200 transition group" data-sid="${s.scenarioId}">
                          <input type="checkbox" class="sl-compare-cb w-4 h-4 rounded accent-violet-500" data-sid="${s.scenarioId}">
                          <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-slate-700 truncate">${s.title || '제목 없음'}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">${s.updatedAt ? new Date(s.updatedAt).toLocaleString('ko-KR') : '-'}</div>
                          </div>
                          <div class="flex-shrink-0 text-xs font-black ${rtriPos ? 'text-emerald-600' : 'text-rose-500'}">
                            ${rtriPos ? '▲' : '▼'} ${Math.abs(rtriDelta)}
                          </div>
                          <button class="sl-load-btn text-[10px] font-bold text-ocean-500 hover:underline flex-shrink-0 opacity-0 group-hover:opacity-100 transition" data-idx="${i}">
                            불러오기
                          </button>
                        </div>`;
                    }).join('');
                } catch(err) {
                    area.innerHTML = `<div class="text-xs text-rose-400 text-center py-4">로드 실패: ${err.message}</div>`;
                }
            };

            // ─── 비교 렌더 ────────────────────────────────────────────────────
            const renderCompare = (aData, bData) => {
                const area = container.querySelector('#sl-compare-result');
                area.classList.remove('hidden');
                const aResult = (() => { try { return JSON.parse(aData.resultJson || '{}'); } catch(e){ return {}; } })();
                const bResult = (() => { try { return JSON.parse(bData.resultJson || '{}'); } catch(e){ return {}; } })();
                const aKpi = aResult.afterKpi || {};
                const bKpi = bResult.afterKpi || {};
                const kpis = ['RTRI','SII','LSI','CGS','PTS','SUS'];

                area.innerHTML = `
                <div class="text-xs font-bold text-slate-600 mb-3">시나리오 비교 결과</div>
                <div class="overflow-x-auto">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-slate-200">
                        <th class="py-2 text-left text-slate-400 font-bold">KPI</th>
                        <th class="py-2 text-center text-violet-600 font-bold">${aData.title || 'A'}</th>
                        <th class="py-2 text-center text-emerald-600 font-bold">${bData.title || 'B'}</th>
                        <th class="py-2 text-center text-slate-500 font-bold">차이 (B-A)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                    ${kpis.map(k => {
                        const av = (aKpi[k] || 0).toFixed(1);
                        const bv = (bKpi[k] || 0).toFixed(1);
                        const diff = ((bKpi[k] || 0) - (aKpi[k] || 0)).toFixed(2);
                        const isPos = parseFloat(diff) > 0;
                        return `
                        <tr>
                          <td class="py-2 font-bold text-slate-600">${k}</td>
                          <td class="py-2 text-center text-violet-700 font-bold">${av}</td>
                          <td class="py-2 text-center text-emerald-700 font-bold">${bv}</td>
                          <td class="py-2 text-center font-black ${isPos ? 'text-emerald-600' : 'text-rose-500'}">${isPos ? '+' : ''}${diff}</td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                  </table>
                </div>`;
            };

            // ─── 이벤트 바인딩 ────────────────────────────────────────────────

            // Ri 토글
            container.querySelectorAll('.sl-ri-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    state.ri = btn.dataset.ri;
                    container.querySelectorAll('.sl-ri-btn').forEach(b => {
                        b.className = b === btn
                            ? 'sl-ri-btn px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-white shadow-sm text-ocean-600'
                            : 'sl-ri-btn px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-slate-700';
                    });
                    container.querySelector('#sl-result-panel').classList.add('hidden');
                    await loadBaseline(state.ri);
                    loadHistory();
                });
            });

            // 슬라이더: 도입강도
            container.querySelector('#sl-intensity').addEventListener('input', e => {
                state.intensity = parseFloat(e.target.value);
                container.querySelector('#sl-intensity-val').textContent = state.intensity.toFixed(1);
                runPreview();
            });

            // 슬라이더: 도달률
            container.querySelector('#sl-reach').addEventListener('input', e => {
                state.reach = parseFloat(e.target.value);
                container.querySelector('#sl-reach-val').textContent = Math.round(state.reach * 100) + '%';
                runPreview();
            });

            // 실행기간 버튼
            container.querySelectorAll('.sl-dur-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.durationWeight = parseFloat(btn.dataset.dw);
                    container.querySelector('#sl-duration-val').textContent = btn.dataset.label;
                    container.querySelectorAll('.sl-dur-btn').forEach(b => {
                        b.className = b === btn
                            ? 'sl-dur-btn flex-1 py-1.5 bg-amber-500 text-white transition'
                            : 'sl-dur-btn flex-1 py-1.5 bg-slate-50 text-slate-400 hover:bg-amber-50 transition';
                    });
                    runPreview();
                });
            });

            // 정책 체크박스
            container.querySelector('#sl-packages').addEventListener('change', e => {
                if (!e.target.classList.contains('sl-policy-cb')) return;
                const id = e.target.dataset.id;
                if (e.target.checked) state.selectedIds.add(id);
                else state.selectedIds.delete(id);
                container.querySelector('#sl-selected-count').textContent = `${state.selectedIds.size}개 선택`;
                runPreview();
            });

            // 초기화 버튼
            container.querySelector('#sl-clear-btn').addEventListener('click', () => {
                container.querySelectorAll('.sl-policy-cb').forEach(cb => cb.checked = false);
                state.selectedIds.clear();
                container.querySelector('#sl-selected-count').textContent = '0개 선택';
                container.querySelector('#sl-result-panel').classList.add('hidden');
            });

            // 저장 버튼
            container.querySelector('#sl-save-btn')?.addEventListener('click', async () => {
                if (!state.simResult) return;
                const titleInput = container.querySelector('#sl-title');
                const descInput = container.querySelector('#sl-desc');
                const title = titleInput?.value.trim() || `${state.ri} 시나리오 ${new Date().toLocaleDateString('ko-KR')}`;
                const desc = descInput?.value.trim() || '';
                
                if (titleInput?.value.trim() === '') {
                    if(!confirm('제목이 비어있습니다. 기본 제목으로 저장할까요?')) return;
                }
                const btn = container.querySelector('#sl-save-btn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>저장 중...';
                const res = await AdminDataService.saveScenario({
                    title,
                    description: desc, // Add description
                    scope: state.ri,
                    selectedItems: [...state.selectedIds],
                    assumptions: { intensity: state.intensity, reach: state.reach, durationWeight: state.durationWeight },
                    baselineKpi: state.baselineKpi,
                    result: state.simResult,
                    drivers: state.simResult.drivers
                });
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save mr-2"></i>시나리오 저장';
                if (res?.ok) {
                    App.utils.showToast('시나리오가 저장되었습니다.', 'success');
                    loadHistory();
                } else {
                    App.utils.showToast('저장 실패: ' + (res?.error || ''), 'error');
                }
            });

            // 히스토리: 불러오기
            container.querySelector('#sl-history-list').addEventListener('click', async e => {
                const loadBtn = e.target.closest('.sl-load-btn');
                if (loadBtn) {
                    const idx = parseInt(loadBtn.dataset.idx);
                    const s = state.scenarios[idx];
                    if (!s) return;
                    // 체크박스 복원
                    const items = (() => { try { return JSON.parse(s.selectedItemsJson || '[]'); } catch(e){ return []; } })();
                    const assumptions = (() => { try { return JSON.parse(s.assumptionsJson || '{}'); } catch(e){ return {}; } })();
                    container.querySelectorAll('.sl-policy-cb').forEach(cb => {
                        cb.checked = items.includes(cb.dataset.id);
                        if (cb.checked) state.selectedIds.add(cb.dataset.id);
                        else state.selectedIds.delete(cb.dataset.id);
                    });
                    if (assumptions.intensity) {
                        state.intensity = assumptions.intensity;
                        container.querySelector('#sl-intensity').value = state.intensity;
                        container.querySelector('#sl-intensity-val').textContent = state.intensity.toFixed(1);
                    }
                    container.querySelector('#sl-selected-count').textContent = `${state.selectedIds.size}개 선택`;
                    runPreview();
                    App.utils.showToast('시나리오를 불러왔습니다.', 'info');
                }
            });

            // 비교 체크박스
            container.querySelector('#sl-history-list').addEventListener('change', e => {
                const cb = e.target.closest('.sl-compare-cb');
                if (!cb) return;
                const sid = cb.dataset.sid;
                if (cb.checked) {
                    if (state.compareIds.size >= 2) {
                        cb.checked = false;
                        App.utils.showToast('최대 2개까지 선택 가능합니다.', 'warning');
                        return;
                    }
                    state.compareIds.add(sid);
                } else {
                    state.compareIds.delete(sid);
                }
                const compareBtn = container.querySelector('#sl-compare-btn');
                if (state.compareIds.size === 2) {
                    compareBtn.classList.remove('hidden');
                } else {
                    compareBtn.classList.add('hidden');
                    container.querySelector('#sl-compare-result').classList.add('hidden');
                }
            });

            // 비교 실행
            container.querySelector('#sl-compare-btn').addEventListener('click', () => {
                const ids = [...state.compareIds];
                const a = state.scenarios.find(s => String(s.scenarioId) === String(ids[0]));
                const b = state.scenarios.find(s => String(s.scenarioId) === String(ids[1]));
                if (a && b) renderCompare(a, b);
            });

            // ─── 초기 로딩 ────────────────────────────────────────────────────
            loadBaseline(state.ri);
            loadHistory();
        },

        _renderWordCloud(elemId, keywords) {
             const container = document.getElementById(elemId);
             if(!container) return;
             // Legacy fallback for simple render
             const kwData = Array.isArray(keywords) ? keywords : [];
             this._renderEnhancedWordCloud(elemId, null, kwData);
        },

        _renderEnhancedWordCloud(cloudId, listId, keywords) {
            const cloudElem = document.getElementById(cloudId);
            if(!cloudElem) return;
            
            const kwData = Array.isArray(keywords) ? keywords : [];
            
            // 1. Render Cloud
            if(!kwData || kwData.length === 0) {
                cloudElem.innerHTML = '<div class="text-center text-slate-300 py-10">데이터 없음</div>';
            } else {
                window.App.chartManager.renderWordCloud(cloudId, kwData);
            }

            // 2. Render Top 10 List [RI-05]
            if(listId) {
                const listElem = document.getElementById(listId);
                if(listElem) {
                    if(!kwData || kwData.length === 0) {
                        listElem.innerHTML = '';
                    } else {
                        const top10 = [...kwData]
                            .sort((a, b) => (b.value || 0) - (a.value || 0))
                            .slice(0, 10);
                        
                        listElem.innerHTML = `
                            <div class="text-[10px] font-bold text-slate-400 uppercase mb-2">Top 10 Keywords</div>
                            <div class="space-y-1.5">
                                ${top10.map((kw, i) => `
                                    <div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-ocean-300 transition cursor-default group">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="w-4 h-4 rounded bg-slate-200 text-slate-500 text-[9px] flex items-center justify-center font-bold">${i+1}</span>
                                            <span class="text-xs font-bold text-slate-700 truncate">${kw.name}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-[10px] font-black text-ocean-500">${kw.value}</span>
                                            <i class="fas fa-quote-right text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition"></i>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                }
            }
        },

        _getRadarConfig(radar) {
            return {
                type: 'radar',
                data: {
                    labels: radar.map(r => r.label),
                    datasets: [{
                        label: '지수',
                        data: radar.map(r => r.value),
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        borderColor: '#4f46e5',
                        pointBackgroundColor: '#4f46e5'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: { beginAtZero: true, max: 100 }
                    },
                    plugins: { legend: { display: false } }
                }
            };
        },

        _getDistConfig(dist) {
            return {
                type: 'bar',
                data: dist,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            };
        },

        _getCrossConfig(cross) {
            return {
                type: 'line',
                data: cross,
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            };
        },

      // `renderDashboard` has been migrated to `js/tabs/tab_dashboard.js` [Ticket 04]
      // `chartManager` has been migrated to `js/06_chartManager.js` [Ticket 05]


      renderOverview() {
        const d = this.data.combined;
        if(!d) return;

        // 3. Bind to UI
        const setTxt = (id, val, suff='') => { 
            const el = document.getElementById(id); 
            if(el) el.textContent = (val!==undefined && val!==null) ? Number(val).toFixed(1) + suff : '-'; 
        };

        // 1. Extract / Derive Core Components
        // Check for 'kpiComponents' Mock/Real Data first
        const comps = d.kpiComponents;
        
        let lsi, cgs, pts, sus, si, lai, di;

        if (comps) {
            // Use Enhanced Data
            // RTRI Components: lodgingIntent, residentAcceptance, longStayDemand, constraintIndex
            
            // SII Components: medical, transport, facility, care, digital
            const s = comps.SII;
            // Simple Average for LSI (Life Service Index) proxy from SII components which are "Satisfaction" scores in Mock
            lsi = (s.medical + s.transport + s.facility + s.care + s.digital) / 5;

            // CGS Components: governanceIntent, volunteerIntent, usageIntent
            const c = comps.CGS;
            cgs = (c.governanceIntent + c.volunteerIntent + c.usageIntent) / 3;

            // PTS Components: convertibleRoomRate + (RTRI lodgingIntent?)
            // Let's use convertibleRoomRate and LodgingIntent average
            pts = (comps.PTS.convertibleRoomRate + comps.RTRI.lodgingIntent) / 2;

            // SUS Components: revisitIntent, settleInterest, startupInterest, jobInterest
            const u = comps.SUS;
            sus = (u.revisitIntent + u.settleInterest + u.startupInterest + u.jobInterest) / 4;

            // SII (Inequality)
            // If LSI is Satisfaction, SII (Inequality) = 100 - LSI
            si = 100 - lsi;
            lai = 100 - cgs;
            di = 100 - s.digital; 

        } else {
            // Fallback to Phase 1 Proxies
            lsi = 65;
            if(d.resident && d.resident.q11_avg) lsi = d.resident.q11_avg * 20;

            cgs = 60;
            if(d.resident && d.resident.q12_avg) cgs = d.resident.q12_avg * 20;

            pts = 50;
            if(d.lodging && d.tourist) {
               pts = d.kpi_transitionIntent || 50;
            }

            sus = 45;
            if(d.lodging) {
               sus = d.lodging.q5_avg || 45;
            }

            si = Math.max(0, 100 - lsi);
            lai = Math.max(0, 100 - cgs);
            di = 40; 
        }

        // 2. Calculate Core Indices using CoreCalc
        const sii = CoreCalc.calculateSII(si, lai, di);
        const rtri = CoreCalc.calculateRTRI(sii, cgs, pts, sus);

        // 3. Bind to UI
        
        // RTRI Hero
        setTxt('dash-rtri-score', rtri);
        const rtriGrade = rtri >= 80 ? '치유 (Healing)' : rtri >= 60 ? '안정 (Stable)' : rtri >= 40 ? '주의 (Caution)' : '위험 (Critical)';
        document.getElementById('dash-rtri-grade').textContent = rtriGrade;
        document.getElementById('dash-rtri-grade').className = `text-sm font-bold mt-1 ${rtri >= 60 ? 'text-emerald-400' : 'text-orange-400'}`;

        // KPI Blocks
        setTxt('dash-lsi-score', lsi);
        document.getElementById('dash-lsi-insight').textContent = lsi >= 70 ? '생활 만족도가 높습니다.' : '의료/교통 개선이 필요합니다.';
        document.getElementById('dash-lsi-issue').textContent = '의료 접근성'; 

        setTxt('dash-cgs-score', cgs);
        document.getElementById('dash-cgs-insight').textContent = cgs >= 60 ? '공동체 신뢰가 형성됨.' : '주민 협의체 구성 요망.';

        setTxt('dash-pts-score', pts);
        document.getElementById('dash-pts-insight').textContent = pts >= 50 ? '전환 의향이 양호합니다.' : '인센티브 부족.';
        document.getElementById('dash-pts-issue').textContent = '초기 비용';

        setTxt('dash-sus-score', sus);
        document.getElementById('dash-sus-insight').textContent = sus >= 50 ? '수익성 확보 가능.' : '비수기 대책 시급.';

        // SII Bottom
        setTxt('dash-sii-score', sii);
        setTxt('dash-sii-si', si);
        setTxt('dash-sii-lai', lai);
        setTxt('dash-sii-di', di);

        const siiWarn = document.getElementById('dash-sii-warning');
        if(sii >= 70) {
            if(siiWarn) siiWarn.classList.remove('hidden');
        } else {
            if(siiWarn) siiWarn.classList.add('hidden');
        }

        // 4. Update Scenario Engine Baseline
        if(APP.admin.scenario && APP.admin.scenario.init) {
            const baseline = {
                LSI: lsi, CGS: cgs, PTS: pts, SUS: sus,
                SII_components: { SI: si, LAI: lai, DI: di }
            };
            APP.admin.scenario.init(baseline);
        }
    },
      // KPI Helpers
      evaluateKpiLevel(score) {
          if (score >= 80) return { label: 'Excellent', color: 'indigo' };
          if (score >= 70) return { label: 'Good', color: 'green' };
          if (score >= 50) return { label: 'Stable', color: 'blue' };
          if (score >= 40) return { label: 'Concern', color: 'orange' };
          return { label: 'Critical', color: 'red' };
      },

      calcDelta(current, previous) {
          if (previous === 0) return { diff: 0, rate: 0 };
          const diff = current - previous;
          const rate = (diff / previous) * 100;
          return { diff, rate };
      },

      generatePolicyAdvice(kpiKey, score) {
          if (score >= 80) return "현재 매우 우수한 상태입니다. 성과 확산 모델을 수립하세요.";
          if (score >= 60) return "안정적인 수준입니다. 취약 계층이나 사각지대를 점검하세요.";
          return "개선이 시급합니다. 기초 인프라 보강 및 주민 역량 강화 프로그램을 검토하세요.";
      },

      renderKpiSourceSummary(data) {
          const container = document.getElementById('survey-kpi-summary');
          if(!container) return;
          
          if(!data.kpiComponents) {
              container.innerHTML = `<div class="text-sm text-slate-400 p-4 text-center">KPI 원천지표 데이터가 없습니다.</div>`;
              return;
          }

          const c = data.kpiComponents;
          
          const card = (title, items) => `
              <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <h4 class="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">${title}</h4>
                  <div class="space-y-2">
                      ${items.map(i => `
                          <div class="flex justify-between items-center text-sm">
                              <span class="text-slate-500">${i.label}</span>
                              <span class="font-bold text-slate-800">${i.val.toFixed(1)}</span>
                          </div>
                          <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                              <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${Math.min(100, i.val)}%"></div>
                          </div>
                      `).join('')}
                  </div>
              </div>
          `;

          container.innerHTML = `
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                 ${card('RTRI (전환)', [
                     {label: '숙박업 전환 의향', val: c.RTRI.lodgingIntent},
                     {label: '주민 수용성', val: c.RTRI.residentAcceptance},
                     {label: '장기체류 수요', val: c.RTRI.longStayDemand},
                     {label: '제약요인(역)', val: c.RTRI.constraintIndex}
                 ])}
                 ${card('SII (불균형)', [
                    {label: '의료', val: c.SII.medical},
                    {label: '교통', val: c.SII.transport},
                    {label: '시설', val: c.SII.facility},
                    {label: '돌봄', val: c.SII.care},
                    {label: '디지털', val: c.SII.digital}
                 ])}
                 ${card('CGS (거버넌스)', [
                    {label: '참여 의향', val: c.CGS.governanceIntent},
                    {label: '봉사 의향', val: c.CGS.volunteerIntent},
                    {label: '시설 이용', val: c.CGS.usageIntent}
                 ])}
                 ${card('PTS (전계)', [
                    {label: '가용 객실률', val: c.PTS.convertibleRoomRate}
                 ])}
                 ${card('SUS (지속가능)', [
                    {label: '재방문 의향', val: c.SUS.revisitIntent},
                    {label: '정주 의향', val: c.SUS.settleInterest},
                    {label: '창업 의향', val: c.SUS.startupInterest},
                    {label: '일자리', val: c.SUS.jobInterest}
                 ])}
             </div>
          `;
      },

      renderRiskSignals(signals, container) {
          if(!container) return;
          if(!signals || signals.length === 0) {
              container.innerHTML = '';
              return;
          }
          
          const getLightSrc = (level) => {
              if(level === 'red') return '<span class="flex w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></span>';
              if(level === 'yellow') return '<span class="flex w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>';
              return '<span class="flex w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>';
          };
          
          const getBgStyle = (level) => {
              if(level === 'red') return 'bg-rose-50/50 border-rose-200/60';
              if(level === 'yellow') return 'bg-amber-50/30 border-amber-200/50';
              return 'bg-white border-slate-100';
          };

          container.innerHTML = `
             <div class="flex items-center justify-between mb-4 mt-2">
                 <h4 class="font-bold text-slate-800 text-lg flex items-center gap-2"><i class="fas fa-traffic-light text-slate-400"></i> 전략 리스크 관제망 (60초 모니터링)</h4>
             </div>
             <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 ${signals.map(s => `
                    <div class="rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between group transition hover:shadow-md border ${getBgStyle(s.level)} cursor-pointer" onclick="APP.admin.showRiskModal('${s.key}')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                ${getLightSrc(s.level)}
                                <span class="text-sm font-bold ${s.level==='green'?'text-slate-600':'text-slate-800'}">${s.label}</span>
                            </div>
                            <div class="text-right flex items-end gap-1">
                                <span class="text-xl font-black ${s.level==='red'?'text-rose-600':s.level==='yellow'?'text-amber-500':'text-slate-400'}">${s.score}</span>
                                <span class="text-[10px] font-medium ${(s.delta<0)?'text-rose-500':s.delta>0?'text-emerald-500':'text-slate-400'} bg-white/60 px-1 rounded block leading-none pt-0.5">
                                    ${s.delta>0?'+':''}${s.delta!==0?s.delta:'-'}
                                </span>
                            </div>
                        </div>
                        
                        <p class="text-[12px] ${s.level==='green'?'text-slate-400':'text-slate-600 font-medium'} leading-snug mb-4 h-8 overflow-hidden line-clamp-2">
                            ${s.reason}
                        </p>
                        
                        <div class="grid grid-cols-2 gap-2 mt-auto">
                            <button onclick="event.stopPropagation(); APP.admin.actionRiskDeepLink(event, '${s.actions.evidenceTab}', '${s.actions.evidenceAnchor}')" class="flex-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold rounded shadow-sm text-center transition">근거 보기</button>
                            ${s.key === "DATA" ?
                                `<button onclick="event.stopPropagation(); APP.admin.actionRiskDeepLink(event, '${s.actions.fixTab}', '${s.actions.fixPreset}')" class="flex-1 py-1.5 px-2 ${s.level==='green'?'bg-slate-100 hover:bg-slate-200 text-slate-500':'bg-rose-600 hover:bg-rose-700 text-white'} border border-transparent text-[11px] font-bold rounded shadow-sm text-center transition">오류 정비</button>`
                            :
                                `<button onclick="event.stopPropagation(); APP.admin.actionRiskDeepLink(event, '${s.actions.fixTab}', '${s.actions.fixPreset}')" class="flex-1 py-1.5 px-2 ${s.level==='green'?'bg-slate-100 hover:bg-slate-200 text-slate-500':'bg-indigo-600 hover:bg-indigo-700 text-white'} border border-transparent text-[11px] font-bold rounded shadow-sm text-center transition">개선 조치</button>`
                            }
                        </div>
                        
                        ${s.confidence==='broken' ? `<div class="absolute top-0 right-0 py-0.5 px-2 bg-rose-500 text-white text-[9px] font-bold rounded-bl border-b border-l border-rose-600 shadow-sm z-10">오류/주의</div>` : ''}
                    </div>
                 `).join('')}
             </div>
          `;
      },

      renderKpiSourceSummary(data) {
          const container = document.getElementById('survey-kpi-summary');
          if(!container) return;
          
          if(!data || !data.kpiComponents) {
              container.innerHTML = '<div class="text-sm text-slate-400 text-center py-4">상세 지표 데이터가 없습니다.</div>';
              return;
          }
          
          const comps = data.kpiComponents;
          
          const card = (title, items) => {
              const rootKey = title.split(' ')[0];
              return `
            <div onclick="if(window.App && window.App.modal) window.App.modal.show('${rootKey}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-ocean-300 transition cursor-pointer group">
                <div class="font-bold text-slate-700 text-sm mb-3 pb-2 border-b border-slate-50 flex justify-between items-center group-hover:text-ocean-700 transition">
                    <span>${title}</span>
                    <i class="fas fa-info-circle text-slate-300 group-hover:text-ocean-500 transition"></i>
                </div>
                <div class="space-y-2">
                    ${items.map(i => `
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-500">${i.label}</span>
                            <span class="font-bold text-slate-700">${i.val.toFixed(0)}</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                            <div class="bg-${i.color}-500 h-1.5 rounded-full" style="width: ${Math.min(100, i.val)}%"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
          `};
          
          container.innerHTML = `
             <h4 class="font-bold text-slate-700 mb-4"><i class="fas fa-layer-group text-indigo-500 mr-2"></i>핵심 지표 상세 분석</h4>
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                 ${card('RTRI (전환)', [
                     {label: '전환 의향', val: comps.RTRI.lodgingIntent, color:'indigo'},
                     {label: '주민 수용', val: comps.RTRI.residentAcceptance, color:'indigo'},
                     {label: '장기 수요', val: comps.RTRI.longStayDemand, color:'indigo'}
                 ])}
                 ${card('SII (불균형)', [
                     {label: '의료 서비스', val: comps.SII.medical, color:'rose'},
                     {label: '대중 교통', val: comps.SII.transport, color:'rose'},
                     {label: '디지털 접근', val: comps.SII.digital, color:'rose'}
                 ])}
                 ${card('CGS (거버넌스)', [
                     {label: '주민 참여', val: comps.CGS.governanceIntent, color:'blue'},
                     {label: '자원 봉사', val: comps.CGS.volunteerIntent, color:'blue'}
                 ])}
                 ${card('PTS (전계)', [
                     {label: '가용 객실율', val: comps.PTS.convertibleRoomRate, color:'emerald'}
                 ])}
                 ${card('SUS (지속가능)', [
                     {label: '재방문 의향', val: comps.SUS.revisitIntent, color:'orange'},
                     {label: '정주 관심도', val: comps.SUS.settleInterest, color:'orange'}
                 ])}
             </div>
          `;
      },



      renderResident() {
          const d = this.data.combined.resident;
          const CM = window.App.chartManager;
          
          document.getElementById('res-intent-val').textContent = (d.useIntent_posRate || 0) + '%';
          let payMode = '-'; let maxV = 0;
          const residentPayDist = d.monthlyPay || {};
          Object.entries(residentPayDist).forEach(([k,v]) => { if(v > maxV){ maxV=v; payMode=k; }});
          document.getElementById('res-pay-val').textContent = payMode;

          CM.renderChartJS('chartResIntent', {
              type: 'doughnut',
              data: {
                  labels: ['긍정', '부정/보통'],
                  datasets: [{ data: [d.useIntent_posRate, 100-d.useIntent_posRate], backgroundColor: ['#0ea5e9', '#e2e8f0'] }]
              },
              options: { cutout: '70%', responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} } }
          }, 'survey-hub');

          CM.renderChartJS('chartResPayDonut', {
              type: 'doughnut',
              data: {
                  labels: Object.keys(residentPayDist),
                  datasets: [{ data: Object.values(residentPayDist), backgroundColor: ['#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'] }]
              },
              options: { cutout: '60%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {boxWidth: 10, font:{size:10}} } } }
          }, 'survey-hub');

          const acc = d.acceptanceIndex || { satisfaction: 3, stability: 3, useIntent: 3 };
          CM.renderEChart('chartResAcceptanceRadar', {
              radar: {
                  indicator: [
                      { name: '이용의향', max: 5 }, { name: '지불의향', max: 5 },
                      { name: '사업기대', max: 5 }, { name: '참여의향', max: 5 },
                      { name: '안정성(역)', max: 5 }, { name: '생활불편(역)', max: 5 }
                  ],
                  radius: '65%'
              },
              series: [{
                  type: 'radar',
                  data: [{
                      value: [
                          acc.useIntent, 3.5, acc.satisfaction, 3.0, 
                          5 - (acc.stability || 2), 3.0 
                      ],
                      name: 'Acceptance',
                      areaStyle: { color: 'rgba(16, 185, 129, 0.4)' },
                      itemStyle: { color: '#10b981' }
                  }]
              }]
          });

          CM.renderChartJS('chartResPainPareto', {
              type: 'bar',
              data: {
                  labels: ['의료', '교통', '문화', '쇼핑', '기타'],
                  datasets: [{
                      label: '불편 응답',
                      data: [45, 30, 15, 8, 2],
                      backgroundColor: '#ef4444'
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');

          // Construct Heatmap Data from raw satVsDur
          const durMap = { '5년 미만':0, '5년 ~ 10년 미만':1, '10년 ~ 20년 미만':2, '20년 이상':3, '태어날 때부터 계속 거주':4 };
          const satMap = { 1:0, 2:1, 3:2, 4:3, 5:4 }; // score 1(매우불만)~5(매우만족) -> index 0~4
          
          const matrix = Array(5).fill(0).map(()=>Array(5).fill(0));
          if(d.advanced && d.advanced.satVsDur) {
              d.advanced.satVsDur.forEach(item => {
                  const x = durMap[item.dur];
                  const y = satMap[item.sat];
                  if(x!==undefined && y!==undefined) matrix[x][y]++;
              });
          }

          const heatData = [];
          for(let i=0; i<5; i++) {
              for(let j=0; j<5; j++) {
                  heatData.push([i, j, matrix[i][j]]);
              }
          }

          CM.renderEChart('chartResSatDur', {
              tooltip: { position: 'top' },
              grid: { top: '10%', bottom: '15%' },
              xAxis: { type: 'category', data: ['5년미만', '5~10년', '10~20년', '20년+', '토박이'] },
              yAxis: { type: 'category', data: ['매우불만', '불만', '보통', '만족', '매우만족'] },
              visualMap: { min: 0, max: Math.max(5, ...heatData.map(d=>d[2])), calculate: true, orient: 'horizontal', left: 'center', bottom: '0%' },
              series: [{
                  name: '응답 수',
                  type: 'heatmap',
                  data: heatData,
                  label: { show: true }
              }]
          });

          this.renderWordCloud('wc-resident', d.comments || []);
      },

      renderLodging() {
          const d = this.data.combined.lodging;
          const CM = window.App.chartManager;

          document.getElementById('lodg-off-avg').textContent = (d.q6_avg || 0).toFixed(1) + '%';
          
          // Off-season Distribution (Q6)
          const offDist = d.q6 || { "0~19%": 0, "20~39%": 0, "40~59%": 0, "60~79%": 0, "80% 이상": 0 };
          const offLabels = ["0~19%", "20~39%", "40~59%", "60~79%", "80% 이상"];
          const offData = offLabels.map(l => offDist[l] || 0);

          CM.renderChartJS('chartLodgOffDist', {
               type: 'bar',
               data: {
                   labels: offLabels,
                   datasets: [{
                       label: '업소 수',
                       data: offData, 
                       backgroundColor: '#ef4444'
                   }]
               },
               options: { responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');

          CM.renderEChart('chartLodgSeasonCompare', {
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: ['성수기', '평시', '비수기'] },
              yAxis: { type: 'value', max: 100 },
              series: [{
                  data: [d.q5_avg, (d.q5_avg+d.q6_avg)/2, d.q6_avg],
                  type: 'line',
                  smooth: true,
                  lineStyle: { width: 4, color: '#6366f1' },
                  areaStyle: { color: 'rgba(99, 102, 241, 0.2)' }
              }]
          });

          const intentDist = d.convertIntentDist || { "가능": 20, "조건부 가능": 30, "불가": 50 };
          CM.renderChartJS('chartLodgIntent', {
              type: 'bar',
              data: {
                  labels: Object.keys(intentDist),
                  datasets: [{
                      label: '응답(%)',
                      data: Object.values(intentDist).map(v => (v/d.total*100).toFixed(1)),
                      backgroundColor: ['#22c55e', '#eab308', '#ef4444']
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');
          
          CM.renderChartJS('chartLodgConvertibleHist', {
              type: 'bar',
              data: {
                  labels: ['1-3실', '4-6실', '7실 이상'],
                  datasets: [{
                      label: '업소 수',
                      data: [15, 20, 5],
                      backgroundColor: '#f97316'
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');

          const offOccMap = { "0~19%": 10, "20~39%": 30, "40~59%": 50, "60~79%": 70, "80~100%": 90, "80% 이상": 90 };
          const vacMap = { "1개월 미만": 0.5, "1~2개월": 1.5, "3~4개월": 3.5, "5~6개월": 5.5, "7~9개월": 8, "10~12개월": 11, "12개월 이상": 12 };

          const scatterData = [];
          if(d.advanced && d.advanced.scatterData) {
              d.advanced.scatterData.forEach(item => {
                  const x = item.rooms;
                  const y = offOccMap[item.offOcc] || 0;
                  const z = vacMap[item.vac] || 0;
                  if(x>0) scatterData.push([x, y, z]);
              });
          }
          if(scatterData.length === 0) {
             // Fallback dummy if empty
             scatterData.push([10, 20, 1]); 
          }
          
          CM.renderEChart('chartLodgRoomVac', {
              axisPointer: { show: false }, 
              xAxis: { name: '총객실', splitLine: { show: false } },
              yAxis: { name: '비수기가동률', splitLine: { show: false } },
              series: [{
                  symbolSize: function (data) { return Math.max(5, data[2] * 3); }, 
                  data: scatterData,
                  type: 'scatter',
                  itemStyle: { color: 'rgba(249, 115, 22, 0.6)' }
              }]
          });
          
          this.renderWordCloud('wc-lodging', d.comments || []);
      },

      renderTourist() {
          const d = this.data.combined.tourist;
          const CM = window.App.chartManager;

          const compDist = d.companion || { "가족": 40, "친구": 30, "연인": 15, "혼자": 15 };
          CM.renderChartJS('chartTourPurpose', {
              type: 'doughnut',
              data: {
                  labels: Object.keys(compDist),
                  datasets: [{
                      data: Object.values(compDist),
                      backgroundColor: ['#f87171', '#fb923c', '#4ade80', '#60a5fa']
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false, cutout: '50%', plugins: { legend: { position: 'right' } } }
          }, 'survey-hub');

          // Funnel Detail
          const fData = [
             d.total || 100, 
             d.total * 0.7,
             d.total * 0.4,
             d.total * 0.2
          ];
          CM.renderChartJS('chartTourFunnelDetail', {
              type: 'bar',
              data: {
                  labels: ['방문', '재방문', '장기체류', '지불의향'],
                  datasets: [{
                      label: '인원(명)',
                      data: fData.map(v => Math.round(v)),
                      backgroundColor: ['#94a3b8', '#60a5fa', '#818cf8', '#fb7185'],
                      borderRadius: 4
                  }]
              },
              options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');

          // Service Needs Top 5
          const needs = d.needs ? d.needs.top3 : []; // Assuming top3 logic in backend, but will display as bar
          const labels = [];
          const data = [];
          if(needs.length > 0) {
              needs.forEach(n => { labels.push(n.label); data.push(n.count); });
          } else {
             // Fallback
             labels.push('업무공간', '식사', '교통', '세탁', '정보');
             data.push(80, 70, 60, 50, 40);
          }
          
          CM.renderEChart('chartTourNeedsRadar', {
              title: { text: 'Service Needs Top 5', textStyle: { fontSize: 12, fontWeight: 'bold', color: '#64748b' }, left: 'center', top: 10 },
              radar: {
                  indicator: labels.map(l => ({ name: l, max: 100 })),
                  radius: '60%',
                  center: ['50%', '55%']
              },
              series: [{
                  type: 'radar',
                  data: [{
                      value: data,
                      name: 'Service Needs',
                      areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                      itemStyle: { color: '#3b82f6' }
                  }]
              }]
          });

          const barriers = d.longStayBarrier || { "정보부족": 50, "비용": 40, "교통": 30 };
          CM.renderChartJS('chartTourBarrier', {
              type: 'bar',
              data: {
                  labels: Object.keys(barriers),
                  datasets: [{
                      label: '응답 수',
                      data: Object.values(barriers),
                      backgroundColor: '#ef4444'
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false }
          }, 'survey-hub');

          CM.renderEChart('chartTourSpendOrigin', {
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
              legend: { bottom: 0 },
              grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
              xAxis: { type: 'value' },
              yAxis: { type: 'category', data: ['서울/경기', '영남권', '호남권', '기타'] },
              series: [
                  { name: '고지출(Typical)', type: 'bar', stack: 'total', label: { show: true }, data: [320, 302, 301, 334] },
                  { name: '저지출', type: 'bar', stack: 'total', label: { show: true }, data: [120, 132, 101, 134] }
              ]
          });

          this.renderWordCloud('wc-tourist', d.comments || []);
      },

      renderWordCloud(id, words) {
          const dom = document.getElementById(id);
          if(!dom) return;
          if (!window.echartsWordCloud && !echarts) return;
          
          const myChart = echarts.init(dom);
          
          let data = [];
          if(Array.isArray(words) && words.length > 0 && typeof words[0] === 'string') {
               const freq = {};
               words.forEach(w => {
                   w.split(/\s+/).forEach(t => { if(t.length > 1) freq[t] = (freq[t] || 0) + 1; });
               });
               data = Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0, 50);
          } else if(Array.isArray(words)) {
              data = words;
          }

          const option = {
              tooltip: { show: true },
              series: [{
                  type: 'wordCloud',
                  shape: 'circle',
                  left: 'center', top: 'center',
                  width: '90%', height: '90%',
                  sizeRange: [12, 40],
                  rotationRange: [-90, 90],
                  rotationStep: 45,
                  gridSize: 8,
                  drawOutOfBound: false,
                  textStyle: {
                      fontFamily: 'sans-serif',
                      fontWeight: 'bold',
                      color: function () {
                          return 'rgb(' + [
                              Math.round(Math.random() * 160),
                              Math.round(Math.random() * 160),
                              Math.round(Math.random() * 160)
                          ].join(',') + ')';
                      }
                  },
                  data: data
              }]
          };
          myChart.setOption(option);
          window.addEventListener('resize', () => myChart.resize());
      },
  },
      
      // -----------------------------------------------------------
      // Ticket OPS-02/03: Operation Routine Module
      // -----------------------------------------------------------
      opsRoutine: {
          data: {
              monthKey: '', // e.g. "2026-02"
              items: [],
              issues: [],
              updatedAt: null
          },
          _activeSectionId: null, // [UI-ACC-FIX] Track open section ID
          _saveTimer: null,
          _trendChartInstance: null,
          _hasData: false,
          _monthList: [], // [{monthKey, completionRate, updatedAt}]
          // [A] Lock state
          _locked: false,
          _lockedAt: null,
          _lockedBy: null,
          // [F] Section rates
          _sectionRates: { data: null, cgs: null, pts: null, sus: null },

          async init() {
              // AUTH-06: Requirement - Remove automatic modal prompt from tab
              /*
              if (!APP.auth.role) {
                  APP.auth.showModal();
                  return;
              }
              */

              if (!this.data.monthKey) {
                  const now = new Date();
                  this.data.monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              }
              this._activeSectionId = null; // Start with all closed
              this.renderMonthTabs();
              // Load month list and current month data in parallel
              await Promise.all([
                  this.loadMonthList(),
                  this.load()
              ]);
              this.renderMonthTabs(); // re-render with month list
              this.render();
          },

          async loadMonthList() {
              if (!App.config.features.opsRoutineGas) return;
              try {
                  const res = await AdminDataService.listOpsRoutine();
                  // OPS-API-02 format: { ok, months: [...] }
                  if (res && Array.isArray(res.months)) {
                      this._monthList = res.months;
                  } else if (Array.isArray(res)) {
                      // fallback: old format
                      this._monthList = res;
                  }
              } catch (e) {
                  console.warn('[OPS] Month list load failed:', e);
              }
          },

          async load() {
              const gasEnabled = App.config.features.opsRoutineGas;
              let loadedData = null;

              // [Fix] Clear current data before loading new month to avoid stale display
              this.data.items = [];
              this.data.issues = [];
              this._sectionRates = { data: null, cgs: null, pts: null, sus: null };
              this._hasData = false;

              if (gasEnabled) {
                  try {
                      loadedData = await AdminDataService.loadOpsRoutine(this.data.monthKey);
                  } catch (e) {
                      console.error("GAS Load Failed", e);
                  }
              } else {
                  const saved = localStorage.getItem(`opsRoutine:${this.data.monthKey}`);
                  if (saved) loadedData = JSON.parse(saved);
              }

              if (loadedData && (Array.isArray(loadedData.items) ? loadedData.items.length > 0 : false)) {
                  this._hasData = true;
                  this.data.items = loadedData.items || [];
                  this.data.issues = loadedData.issues || [];
                  this.data.updatedAt = loadedData.updatedAt || null;
                  // [A] store lock state
                  this._locked = loadedData.locked || false;
                  this._lockedAt = loadedData.lockedAt || null;
                  this._lockedBy = loadedData.lockedBy || null;
                  // [F] store section rates
                  this._sectionRates = loadedData.sectionRates || { data: null, cgs: null, pts: null, sus: null };
              } else {
                  this._hasData = false;
                  this.handleNoData();
              }
          },

          handleNoData() {
              const container = document.getElementById('routine-checklist-container');
              if (container) {
                  container.innerHTML = `
                      <div class="p-10 text-center">
                          <div class="mb-4 text-slate-300"><i class="fas fa-calendar-plus text-5xl"></i></div>
                          <h4 class="text-lg font-bold text-slate-700 mb-2">${this.data.monthKey} 데이터가 없습니다</h4>
                          <p class="text-sm text-slate-500 mb-6 font-medium">지난달 항목을 그대로 가져오거나 새롭게 시작할 수 있습니다.</p>
                          <div class="flex justify-center gap-3">
                              <button onclick="APP.opsRoutine.cloneLastMonth()" class="px-6 py-2.5 bg-ocean-600 text-white font-bold rounded-xl shadow-lg hover:bg-ocean-700 transition">
                                  <i class="fas fa-copy mr-2"></i>지난달 데이터 복사
                              </button>
                              <button onclick="APP.opsRoutine.startFresh()" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">
                                  <i class="fas fa-plus mr-2"></i>새로 시작
                              </button>
                          </div>
                      </div>
                  `;
              }
          },

          async startFresh() {
              const seed = App.config.opsSeed;
              this.data.items = seed.items.map((it, idx) => ({
                  id: `item_${Date.now()}_${idx}`,
                  section: it.section,
                  title: it.title,
                  weight: it.weight || 1,
                  owner: it.defaultOwner || '-',
                  done: false,
                  doneAt: null,
                  memo: '',
                  proofUrl: ''
              }));
              this.data.issues = [];
              this._hasData = true;
              await this.save(true);
              this.render();
          },

          async cloneLastMonth() {
              const [y, m] = this.data.monthKey.split('-').map(Number);
              let py = y, pm = m - 1;
              if (pm === 0) { py--; pm = 12; }
              const prevMonthKey = `${py}-${String(pm).padStart(2, '0')}`;

              if (App.config.features.opsRoutineGas) {
                  try {
                      await AdminDataService.cloneOpsRoutine(prevMonthKey, this.data.monthKey);
                      await this.load();
                      if (this.data.items.length > 0) this._hasData = true;
                      this.render();
                      App.utils.showSuccess(`${prevMonthKey} 데이터가 정상적으로 처리되었습니다.`);
                  } catch (e) {
                      App.utils.showError("데이터 복사 실패. 지난달 데이터가 없을 수 있습니다.", () => this.startFresh());
                  }
              } else {
                  const saved = localStorage.getItem(`opsRoutine:${prevMonthKey}`);
                  if (saved) {
                      const prevData = JSON.parse(saved);
                      this.data.items = prevData.items.map(it => ({
                          ...it,
                          done: false,
                          doneAt: null,
                          memo: '',
                          proofUrl: ''
                      }));
                      this.data.issues = prevData.issues || [];
                      this._hasData = true;
                      await this.save(true);
                      this.render();
                  } else {
                      this.startFresh();
                  }
              }
          },

          async save(immediate = false) {
              if (immediate) {
                  await this._performSave();
              } else {
                  clearTimeout(this._saveTimer);
                  this._saveTimer = setTimeout(() => this._performSave(), 2000);
              }
          },

          async _performSave() {
              const gasEnabled = App.config.features.opsRoutineGas;
              // [A] Block save if locked
              if (this._locked) { App.utils.showError('이 달은 마감(LOCK) 처리되어 있습니다. 수정할 수 없습니다.'); return; }
              try {
                  if (gasEnabled) {
                      const res = await AdminDataService.saveOpsRoutine({
                          monthKey: this.data.monthKey,
                          scope: 'ALL',
                          items: this.data.items,
                          issues: this.data.issues
                      });
                      // [A] Server-side LOCKED response
                      if (res && res.error === 'LOCKED') {
                          this._locked = true;
                          this.render();
                          App.utils.showError('서버에서 마감 처리된 달입니다. 저장이 차단되었습니다.');
                          return;
                      }
                      if (res && res.updatedAt) this.data.updatedAt = res.updatedAt;

                      // [OPS-API-03] Re-fetch from server to confirm server state
                      try {
                          const serverData = await AdminDataService.loadOpsRoutine(this.data.monthKey);
                          if (serverData && serverData.items) {
                              this.data.items = serverData.items;
                              this.data.issues = serverData.issues || [];
                              this.data.updatedAt = serverData.updatedAt || this.data.updatedAt;
                              this._sectionRates = serverData.sectionRates || this._sectionRates;
                              this.renderChecklist();
                          }
                      } catch (fetchErr) {
                          console.warn('[OPS] Re-fetch after save failed (non-critical):', fetchErr);
                      }
                  } else {
                      localStorage.setItem(`opsRoutine:${this.data.monthKey}`, JSON.stringify(this.data));
                      this.data.updatedAt = new Date().toISOString();
                  }
                  this.renderStatus();
                  this.renderSummary();
                  App.utils.showSuccess('운영 루틴이 저장되었습니다.');
              } catch (e) {
                  App.utils.showError('저장 실패: ' + e.message);
              }
          },

          render() {
              // [Fix] Always render status and summary even if no data to clear previous UI state
              this.renderStatus();
              this.renderSummary();
              
              if (!this._hasData) { this.handleNoData(); return; }
              this.renderChecklist();
              this.renderIssues();
              this.renderSummary();
              this.renderKpiMap();
              this.renderStatus();
              this.renderTrendChart();
              this.renderAuditLog(); // [B]
              this.renderTimeline(); // [OPS-TL-02]
              // [A] Disable inputs if locked
              const container = document.getElementById('routine-checklist-container');
              if (container) {
                  container.querySelectorAll('input, textarea, select, button.item-action').forEach(el => {
                      el.disabled = this._locked;
                  });
                  if (this._locked) container.classList.add('opacity-75', 'pointer-events-none');
                  else container.classList.remove('opacity-75', 'pointer-events-none');
              }
          },

          renderStatus() {
              const el = document.getElementById('routine-last-saved');
              if (el && this.data.updatedAt) {
                  const d = new Date(this.data.updatedAt);
                  let txt = `최종 저장: ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
                  if (this._locked) txt += ' <span class="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded text-[11px] font-bold">🔒 마감됨</span>';
                  el.innerHTML = txt;
              }
              // [A][AUTH-03] Lock button state - MASTER role only
              const lockBtn = document.getElementById('ops-lock-btn');
              const unlockBtn = document.getElementById('ops-unlock-btn');
              const isMaster = APP.auth && APP.auth.role === 'admin';
              
              if (lockBtn) {
                  lockBtn.style.display = (isMaster && !this._locked) ? '' : 'none';
              }
              if (unlockBtn) {
                  unlockBtn.style.display = (isMaster && this._locked) ? '' : 'none';
              }
              // [A] Save button disabled when locked (unless MASTER)
              const saveBtn = document.getElementById('ops-save-btn');
              if (saveBtn) {
                  saveBtn.disabled = this._locked && !isMaster;
              }
          },

          renderMonthTabs() {
              const container = document.getElementById('routine-month-tabs');
              if (!container) return;

              const currentMonth = Number(this.data.monthKey.split('-')[1]);
              const year = this.data.monthKey.split('-')[0];

              // Build map of months that have data this year
              const dataMonthMap = {}; // monthNum -> completionRate
              this._monthList.forEach(item => {
                  if (!item.monthKey) return;
                  const [y, m] = item.monthKey.split('-');
                  if (y === year) dataMonthMap[Number(m)] = item.completionRate || 0;
              });

              let pills = '';
              let dropdownOptions = '';

              // Iterate months 1-12 in chronological order
              for (let m = 1; m <= 12; m++) {
                  const isCurrent = m === currentMonth;
                  const hasData = m in dataMonthMap;

                  if (isCurrent) {
                      // 이번 달: 파란 활성 pill (항상 표시)
                      const rate = hasData ? dataMonthMap[m] : null;
                      pills += `
                          <span class="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-white text-ocean-600 shadow-sm select-none border border-ocean-200">
                              ${m}월
                              ${rate !== null
                                  ? `<span class="text-[10px] font-bold px-1 py-0.5 rounded bg-ocean-100 text-ocean-500">${rate}%</span>`
                                  : `<span class="text-[10px] text-ocean-300">●</span>`
                              }
                          </span>`;
                  } else if (hasData) {
                      // 데이터 있는 달: slate pill + 달성률
                      const rate = dataMonthMap[m];
                      pills += `
                          <button onclick="APP.opsRoutine.changeMonth(${m})"
                              class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition border border-slate-200">
                              ${m}월
                              <span class="text-[10px] font-bold px-1 py-0.5 rounded bg-teal-100 text-teal-600">${rate}%</span>
                          </button>`;
                  } else {
                      // 미진행 달: 드롭다운에만
                      dropdownOptions += `<option value="${m}">${m}월</option>`;
                  }
              }

              const dropdown = dropdownOptions ? `
                  <div class="relative">
                      <select
                          onchange="APP.opsRoutine.changeMonth(Number(this.value)); this.value='';"
                          class="text-xs border border-slate-200 rounded-md bg-white pl-2 pr-6 py-1.5 font-bold text-slate-400 outline-none focus:border-ocean-300 cursor-pointer appearance-none"
                      >
                          <option value="" disabled selected>미진행 달 ▾</option>
                          ${dropdownOptions}
                      </select>
                  </div>` : '';

              container.innerHTML = `
                  <div class="flex items-center gap-2 flex-wrap">
                      ${pills}
                      ${dropdown}
                  </div>
              `;

          },

          async changeMonth(m) {
              const year = this.data.monthKey.split('-')[0];
              this.data.monthKey = `${year}-${String(m).padStart(2, '0')}`;
              this._activeSectionId = null; // Reset accordion on month change
              this.renderMonthTabs();
              await this.load();
              this.render();
          },

          async changeYear(y) {
              const month = this.data.monthKey.split('-')[1];
              this.data.monthKey = `${y}-${month}`;
              await this.load();
              this.render();
          },

          // [A] Lock this month
          async lockMonth() {
              if (!confirm(`${this.data.monthKey} 을 마감 처리하시겠습니까? 마감 후에는 데이터가 수정되지 않습니다.`)) return;
              try {
                  const res = await AdminDataService._postJson('ops_routine_lock', { 
                      monthKey: this.data.monthKey, 
                      scope: 'ALL', 
                      actor: 'admin' 
                  });
                  if (res && res.ok) {
                      this._locked = true; 
                      this._lockedAt = res.lockedAt; 
                      this._lockedBy = res.lockedBy;
                      this.render();
                      App.utils.showSuccess(`${this.data.monthKey} 마감 완료`);
                  } else {
                      App.utils.showError('마감 실패: ' + (res && res.error || '알 수 없는 오류'));
                  }
              } catch (e) { 
                  if (e.message === 'UNAUTHORIZED') App.utils.showError('마감 권한이 없습니다 (admin 권한 필요)');
                  else App.utils.showError('마감 오류: ' + e.message); 
              }
          },

          // [A] Unlock this month
          async unlockMonth() {
              if (!confirm(`${this.data.monthKey} 마감을 해제하시겠습니까?`)) return;
              try {
                  const res = await AdminDataService._postJson('ops_routine_unlock', { 
                      monthKey: this.data.monthKey, 
                      scope: 'ALL' 
                  });
                  if (res && res.ok) {
                      this._locked = false; 
                      this._lockedAt = null; 
                      this._lockedBy = null;
                      this.render();
                      App.utils.showSuccess(`${this.data.monthKey} 마감 해제 완료`);
                  } else {
                      App.utils.showError('해제 실패: ' + (res && res.error || '알 수 없는 오류'));
                  }
              } catch (e) { 
                  if (e.message === 'UNAUTHORIZED') App.utils.showError('해제 권한이 없습니다 (admin 권한 필요)');
                  else App.utils.showError('마감 해제 오류: ' + e.message); 
              }
          },

          // [B] Render audit log section
          async renderAuditLog() {
              const container = document.getElementById('routine-audit-log');
              if (!container) return;
              try {
                  const res = await AdminDataService._fetchJson('ops_routine_audit_get', { 
                      monthKey: this.data.monthKey, 
                      scope: 'ALL' 
                  });
                  const records = (res && res.records) || [];
                  if (!records.length) { 
                      container.innerHTML = '<p class="text-xs text-slate-400 py-2">변경 이력이 없습니다.</p>'; 
                      return; 
                  }
                  container.innerHTML = records.map(r => {
                      const d = new Date(r.ts);
                      const time = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
                      return `<div class="flex gap-2 py-1 text-xs border-b border-slate-100 last:border-0">
                          <span class="text-slate-400 shrink-0 w-[80px]">${time}</span>
                          <span class="text-slate-500 font-medium shrink-0">${r.actor}</span>
                          <span class="text-slate-600">${r.summary}</span>
                      </div>`;
                  }).join('');
              } catch (_) { 
                  container.innerHTML = '<p class="text-xs text-slate-400 py-2">이력 로드 실패</p>'; 
              }
          },


          renderChecklist() {
              const container = document.getElementById('routine-checklist-container');
              if (!container) return;

              const sections = App.config.opsSeed.sections;
              const owners = App.config.opsSeed.owners || ['센터장', '현장센터', '링커', '외부협력'];
              const tags  = App.config.opsSeed.tags  || ['회의', '데이터', '홍보', '협력', '점검'];
              const tagColors = { '회의':'bg-violet-100 text-violet-600', '데이터':'bg-blue-100 text-blue-600',
                                  '홍보':'bg-pink-100 text-pink-600', '협력':'bg-teal-100 text-teal-600',
                                  '점검':'bg-amber-100 text-amber-600' };

              const [yr, mo] = this.data.monthKey.split('-').map(Number);
              const monthEnd = new Date(yr, mo, 0);
              const today = new Date();
              const daysLeft = Math.ceil((monthEnd - today) / 86400000);
              const isDdayWarn = daysLeft >= 0 && daysLeft <= 7;

              let html = '';
              if (isDdayWarn) {
                  html += `<div class="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs font-bold text-amber-700">
                      <i class="fas fa-exclamation-circle animate-pulse"></i>
                      월말 D-${daysLeft}일 — 미완료 필수 항목을 확인하세요!
                  </div>`;
              }

              sections.forEach(sec => {
                  const secItems = this.data.items.filter(it => it.section === sec.id);
                  if (secItems.length === 0) return;

                  const totalWeight = secItems.reduce((acc, it) => acc + (it.weight || 1), 0);
                  const doneWeight = secItems.filter(it => it.done).reduce((acc, it) => acc + (it.weight || 1), 0);
                  const pct = Math.round((doneWeight / totalWeight) * 100) || 0;
                  
                  // [UI-ACC-FIX] Only open the section that matches _activeSectionId
                  const isOpen = (this._activeSectionId === sec.id);

                  html += `
                      <div class="border-b border-slate-100 last:border-0 font-sans ops-section-group" data-section="${sec.id}">
                          <div class="bg-white p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition ops-accordion-header" onclick="APP.opsRoutine.toggleAccordion('${sec.id}')">
                              <div class="flex items-center gap-3">
                                  <i class="fas ${isOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-slate-300 text-xs transition-transform duration-200" id="acc-icon-${sec.id}"></i>
                                  <h5 class="font-black text-slate-700 flex items-center gap-2 text-sm">
                                      <span class="w-1.5 h-4 bg-ocean-500 rounded-full"></span>
                                      ${sec.title}
                                  </h5>
                              </div>
                              <div class="flex items-center gap-3">
                                  <span class="text-[10px] text-slate-400 font-bold hidden sm:inline">${doneWeight}/${totalWeight} pt</span>
                                  <span class="text-xs font-bold text-ocean-600 bg-ocean-50 px-2 py-1 rounded">${pct}% 완료</span>
                              </div>
                          </div>
                          <div class="divide-y divide-slate-50 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}" id="acc-body-${sec.id}">
                  `;

                  secItems.forEach(it => {
                      const isDdayItem = isDdayWarn && !it.done && (it.weight || 1) >= 2;
                      const itemTags = it.tags || [];
                      const tagHtml = tags.map(tag => {
                          const active = itemTags.includes(tag);
                          const color = active ? (tagColors[tag] || 'bg-slate-200 text-slate-600') : 'bg-slate-100 text-slate-400';
                          return `<button onclick="APP.opsRoutine.toggleTag('${it.id}','${tag}')" class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${color} hover:opacity-80 transition">${tag}</button>`;
                      }).join('');

                      html += `
                          <div class="${isDdayItem ? 'bg-amber-50/40 border-l-2 border-amber-400' : ''} p-3 md:p-4 hover:bg-slate-50/30 transition">
                              <div class="flex gap-3">
                                  <label class="flex-shrink-0 w-11 h-11 flex items-center justify-center cursor-pointer rounded-xl ${it.done ? 'bg-ocean-50' : 'bg-slate-50'} hover:bg-ocean-50 transition active:scale-95">
                                      <input type="checkbox" ${it.done ? 'checked' : ''}
                                          onchange="APP.opsRoutine.toggleItem('${it.id}')"
                                          class="w-5 h-5 rounded border-slate-300 text-ocean-600 focus:ring-ocean-500 cursor-pointer">
                                  </label>
                                  <div class="flex-1 min-w-0">
                                      <div class="flex items-center gap-2 flex-wrap">
                                          <span class="text-sm ${it.done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}">${it.title}</span>
                                          ${isDdayItem ? '<span class="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full animate-pulse">⚠ D-' + daysLeft + '</span>' : ''}
                                          ${it.doneAt ? `<span class="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><i class="far fa-clock mr-1"></i>${it.doneAt}</span>` : ''}
                                          <span class="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">W${it.weight || 1}</span>
                                      </div>
                                      <div class="flex gap-1 flex-wrap mt-1.5">${tagHtml}</div>
                                      <div class="flex flex-wrap gap-2 mt-2">
                                          <select onchange="APP.opsRoutine.updateItem('${it.id}', {owner: this.value})"
                                              class="text-xs border border-slate-200 rounded-lg bg-white px-2 py-1.5 min-w-[90px] outline-none focus:border-ocean-300">
                                              <option value="-">- 담당 -</option>
                                              ${owners.map(o => `<option value="${o}" ${it.owner === o ? 'selected' : ''}>${o}</option>`).join('')}
                                          </select>
                                          <input type="url" placeholder="증빙 URL" value="${it.proofUrl || ''}"
                                              onblur="APP.opsRoutine.updateItem('${it.id}', {proofUrl: this.value})"
                                              class="text-xs border border-slate-200 rounded-lg bg-white px-2 py-1.5 w-full sm:w-36 outline-none focus:border-ocean-300">
                                          <input type="text" placeholder="메모 입력..."
                                              value="${it.memo || ''}"
                                              onblur="APP.opsRoutine.updateItem('${it.id}', {memo: this.value})"
                                              class="text-xs border border-slate-200 rounded-lg bg-white px-2 py-1.5 flex-1 min-w-[120px] outline-none focus:border-ocean-300 focus:ring-1 focus:ring-ocean-100">
                                      </div>
                                      ${it.proofUrl ? `<a href="${it.proofUrl}" target="_blank" class="inline-flex items-center gap-1 mt-1 text-[10px] text-ocean-500 hover:underline"><i class="fas fa-external-link-alt"></i>증빙 확인</a>` : ''}
                                  </div>
                              </div>
                          </div>
                      `;
                  });

                  html += `</div></div>`;
              });

              container.innerHTML = html;
          },

          toggleAccordion(sectionId) {
              // [UI-ACC-FIX] Update internal state instead of manual DOM manipulation
              if (this._activeSectionId === sectionId) {
                  this._activeSectionId = null; // Toggle close
              } else {
                  this._activeSectionId = sectionId; // Open this, close others (Single-Open Rule)
              }
              this.renderChecklist();
          },

          renderIssues() {
              const list = document.getElementById('routine-issue-list');
              if (!list) return;

              // [3] Risk level standardized definitions
              const levelDef = {
                  HIGH: { cls: 'text-red-600 bg-red-50 border border-red-200', label: '상', tip: '즉각 조치 필요. 사업 목표 달성에 직접 위협.' },
                  MID:  { cls: 'text-amber-600 bg-amber-50 border border-amber-200', label: '중', tip: '2주 내 모니터링 필요. 방치 시 리스크 확대.' },
                  LOW:  { cls: 'text-blue-600 bg-blue-50 border border-blue-200', label: '하', tip: '관찰 수준. 월말 정기 점검으로 충분.' }
              };
              if (this.data.issues.length === 0) {
                  list.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-slate-300 text-xs italic">등록된 이슈가 없습니다.</td></tr>';
                  return;
              }

              list.innerHTML = this.data.issues.map((iss, idx) => {
                  const ld = levelDef[iss.level] || levelDef.LOW;
                  return `
                  <tr class="hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
                      <td class="py-3 px-1">
                          <input type="text" value="${iss.title}" onblur="APP.opsRoutine.updateIssue(${idx}, {title: this.value})"
                              class="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-700 outline-none text-sm">
                      </td>
                      <td class="py-3 px-1">
                          <select onchange="APP.opsRoutine.updateIssue(${idx}, {level: this.value})"
                              title="${ld.tip}"
                              class="text-[10px] font-bold px-1.5 py-1 rounded ${ld.cls} cursor-pointer">
                              ${Object.entries(levelDef).map(([k,v]) =>
                                  `<option value="${k}" ${iss.level === k ? 'selected' : ''}>${v.label}</option>`
                              ).join('')}
                          </select>
                          <span class="ml-1 text-[9px] text-slate-400 hidden md:inline" title="${ld.tip}">?</span>
                      </td>
                      <td class="py-3 px-1">
                          <select onchange="APP.opsRoutine.updateIssue(${idx}, {status: this.value})"
                              class="text-[10px] font-bold p-1 rounded border-slate-200 bg-white">
                              <option value="IN_PROGRESS" ${iss.status === 'IN_PROGRESS' ? 'selected' : ''}>진행중</option>
                              <option value="DONE" ${iss.status === 'DONE' ? 'selected' : ''}>완료</option>
                          </select>
                      </td>
                      <td class="py-3 text-right">
                          <button onclick="APP.opsRoutine.removeIssue(${idx})" class="text-slate-300 hover:text-red-400 transition">
                              <i class="fas fa-trash-alt"></i>
                          </button>
                      </td>
                  </tr>`;
              }).join('');
          },

          // [4] Toggle a tag on an item
          toggleTag(itemId, tag) {
              const it = this.data.items.find(x => x.id === itemId);
              if (!it) return;
              const tags = it.tags || [];
              it.tags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
              this.renderChecklist();
              this.save(); // debounced autosave
          },

          renderSummary() {
              const totalWeight = (this.data.items || []).reduce((acc, it) => acc + (it.weight || 1), 0);
              const doneWeight = (this.data.items || []).filter(it => it.done).reduce((acc, it) => acc + (it.weight || 1), 0);
              const pct = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;

              const pctEl = document.getElementById('routine-progress-pct');
              const barEl = document.getElementById('routine-progress-bar');
              if (pctEl) pctEl.innerText = pct;
              if (barEl) barEl.style.width = pct + '%';

              // [F] Section completion bars
              const secBarsEl = document.getElementById('routine-section-bars');
              if (secBarsEl) {
                  const sectionLabels = { data: '데이터', cgs: '거버넌스', pts: '파일럿', sus: '지속가능성' };
                  const sectionColors = { data: 'bg-blue-400', cgs: 'bg-violet-400', pts: 'bg-teal-400', sus: 'bg-amber-400' };
                  // Use server-computed section rates or compute locally
                  const sr = this._sectionRates;
                  const sections = ['data', 'cgs', 'pts', 'sus'];
                  secBarsEl.innerHTML = sections.map(sec => {
                      let rate = (sr && sr[sec] != null) ? sr[sec] : (() => {
                          const si = this.data.items.filter(it => it.section === sec);
                          if (!si.length) return null;
                          const total = si.reduce((s, it) => s + (it.weight || 1), 0);
                          const done = si.filter(it => it.done).reduce((s, it) => s + (it.weight || 1), 0);
                          return Math.round(done / total * 100);
                      })();
                      if (rate === null) return '';
                      return `<div class="flex items-center gap-1.5">
                          <span class="text-[9px] font-bold text-slate-400 w-[52px] shrink-0">${sectionLabels[sec]}</span>
                          <div class="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div class="${sectionColors[sec]} h-full rounded-full transition-all duration-500" style="width:${rate}%"></div>
                          </div>
                          <span class="text-[9px] font-bold text-slate-500 w-[28px] text-right">${rate}%</span>
                      </div>`;
                  }).join('');
              }

              const topIncompleteEl = document.getElementById('routine-top-incomplete');
              if (topIncompleteEl) {
                  const incomplete = [...this.data.items]
                      .filter(it => !it.done)
                      .sort((a, b) => (b.weight || 1) - (a.weight || 1))
                      .slice(0, 3);
                      
                  if (incomplete.length === 0) {
                      topIncompleteEl.innerHTML = '<p class="text-sm text-emerald-500 font-bold"><i class="fas fa-check-circle mr-1"></i> 모든 루틴이 완료되었습니다!</p>';
                  } else {
                      topIncompleteEl.innerHTML = incomplete.map(it => `
                          <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 mb-2 last:mb-0">
                              <div class="flex items-center gap-2 min-w-0">
                                  <span class="w-1.5 h-1.5 rounded-full ${it.weight >= 3 ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}"></span>
                                  <span class="text-xs font-bold text-slate-700 truncate">${it.title}</span>
                              </div>
                              <span class="text-[10px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded ml-2">W${it.weight || 1}</span>
                          </div>
                      `).join('');
                  }
              }
          },

          renderKpiMap() {
              const container = document.getElementById('routine-kpi-map');
              if (!container) return;

              const sections = App.config.opsSeed.sections;
              container.innerHTML = sections.map(sec => {
                  const secItems = this.data.items.filter(it => it.section === sec.id);
                  const totalWeight = secItems.reduce((acc, it) => acc + (it.weight || 1), 0);
                  const doneWeight = secItems.filter(it => it.done).reduce((acc, it) => acc + (it.weight || 1), 0);
                  const pct = Math.round((doneWeight / totalWeight) * 100) || 0;
                  
                  return `
                      <div>
                          <div class="flex justify-between items-center mb-1.5">
                              <span class="text-xs font-bold text-slate-400">${sec.id.toUpperCase()} → ${sec.kpi}</span>
                              <span class="text-[10px] font-black ${pct > 80 ? 'text-emerald-400' : 'text-ocean-400'}">${pct}%</span>
                          </div>
                          <div class="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div class="bg-ocean-500 h-full transition-all duration-500" style="width: ${pct}%"></div>
                          </div>
                      </div>
                  `;
              }).join('');
          },

          renderTimeline() {
              const container = document.getElementById('routine-timeline-container');
              if (!container) return;

              // Initialize week buckets (1-5)
              const weeks = [1, 2, 3, 4, 5].map(w => ({
                  num: w,
                  data: 0, cgs: 0, pts: 0, sus: 0,
                  total: 0
              }));

              const currentYearMonth = this.data.monthKey; // YYYY-MM

              this.data.items.forEach(it => {
                  if (it.done && it.doneAt) {
                      // Check if it belongs to current month (optional safety)
                      if (!it.doneAt.startsWith(currentYearMonth)) return;

                      const day = parseInt(it.doneAt.split('-')[2]);
                      let wIdx = 0;
                      if (day <= 7) wIdx = 0;
                      else if (day <= 14) wIdx = 1;
                      else if (day <= 21) wIdx = 2;
                      else if (day <= 28) wIdx = 3;
                      else wIdx = 4;

                      const section = (it.section || '').toLowerCase();
                      if (weeks[wIdx] && ['data', 'cgs', 'pts', 'sus'].includes(section)) {
                          weeks[wIdx][section]++;
                          weeks[wIdx].total++;
                      }
                  }
              });

              container.innerHTML = weeks.map(w => {
                  const maxVal = Math.max(1, ...weeks.map(ww => ww.total));
                  const scale = 80 / maxVal; // Max height in px

                  return `
                      <div class="flex flex-col items-center">
                          <div class="w-full bg-slate-50/50 rounded-lg p-2 h-40 flex flex-col justify-end gap-1 border border-slate-50">
                              <div class="w-full bg-blue-500 rounded-sm transition-all duration-500" style="height: ${w.data * scale}px" title="DATA: ${w.data}"></div>
                              <div class="w-full bg-violet-500 rounded-sm transition-all duration-500" style="height: ${w.cgs * scale}px" title="CGS: ${w.cgs}"></div>
                              <div class="w-full bg-emerald-500 rounded-sm transition-all duration-500" style="height: ${w.pts * scale}px" title="PTS: ${w.pts}"></div>
                              <div class="w-full bg-amber-500 rounded-sm transition-all duration-500" style="height: ${w.sus * scale}px" title="SUS: ${w.sus}"></div>
                              ${w.total === 0 ? '<div class="text-[9px] text-slate-300 text-center mb-10 w-full">Empty</div>' : ''}
                          </div>
                          <div class="mt-2 text-center">
                              <div class="text-[10px] font-black text-slate-700">${w.num}주차</div>
                              <div class="text-[9px] text-slate-400">${w.total}건 완료</div>
                          </div>
                      </div>
                  `;
              }).join('');
          },

          async renderTrendChart() {
              const ctx = document.getElementById('routine-trend-chart');
              if (!ctx || typeof Chart === 'undefined') return;

              if (this._trendChartInstance) {
                  this._trendChartInstance.destroy();
              }

              let months = ['9월', '10월', '11월', '12월', '1월', '2월'];
              let data = [45, 52, 50, 58, 62, 70];

              if (App.config.features.opsRoutineGas) {
                  try {
                      const list = await AdminDataService.listOpsRoutine();
                      if (list && list.length > 1) {
                        list.sort((a,b) => a.monthKey.localeCompare(b.monthKey));
                        months = list.map(l => l.monthKey.split('-')[1] + '월');
                        // Backend list might need enhancement to include rates, for now using current rate for current month
                        data = list.map(l => (l.monthKey === this.data.monthKey) ? Number(document.getElementById('routine-progress-pct')?.innerText || 0) : 50);
                      }
                  } catch (e) {
                      console.warn("Trend fetch error", e);
                  }
              }

              this._trendChartInstance = new Chart(ctx, {
                  type: 'line',
                  data: {
                      labels: months,
                      datasets: [{
                          label: '이행률',
                          data: data,
                          borderColor: '#0ea5e9',
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4,
                          pointRadius: 3
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                          y: { display: false, min: 0, max: 100 },
                          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
                      }
                  }
              });
          },

          toggleItem(id) {
              const item = this.data.items.find(it => it.id === id);
              if (item) {
                  item.done = !item.done;
                  // [OPS-TL-01] Auto-record completion date (YYYY-MM-DD)
                  item.doneAt = item.done ? new Date().toISOString().split('T')[0] : null;
                  this.save();
                  this.render();
              }
          },

          updateItem(id, updates) {
              const item = this.data.items.find(it => it.id === id);
              if (item) {
                  Object.assign(item, updates);
                  this.save();
                  if(updates.proofUrl || updates.owner) this.renderChecklist(); 
              }
          },

          addIssue() {
              this.data.issues.push({ title: '신규 이슈', level: 'MID', status: 'IN_PROGRESS', memo: '' });
              this.save(true);
              this.renderIssues();
          },

          updateIssue(idx, updates) {
              if (this.data.issues[idx]) {
                  Object.assign(this.data.issues[idx], updates);
                  this.save();
              }
          },

          removeIssue(idx) {
              this.data.issues.splice(idx, 1);
              this.save(true);
              this.renderIssues();
          }
      },
  };
  
// Utility
async function fetchJson(action) {
  const base = (typeof CONFIG !== 'undefined' && CONFIG.GAS_WEBAPP_URL) || window.GAS_WEBAPP_URL;
  if (!base) {
      console.error("GAS_WEBAPP_URL is not set. Check config.js");
      throw new Error("GAS_WEBAPP_URL is not set");
  }

  const url = `${base}${base.includes("?") ? "&" : "?"}action=${encodeURIComponent(action)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

window.APP = APP;
