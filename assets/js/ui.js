/**
 * assets/ui.js
 * Common UI logic: Nav, Footer, Mobile Menu
 */

const UI = {
  init: function (activeKey) {
    this.renderNav(activeKey);
    this.renderFooter();
    this.bindEvents();
  },

  renderNav: function (activeKey) {
    const navContainer = document.getElementById("app-nav");
    if (!navContainer) return;

    const menuItems = [
      { key: "home", label: "홈", url: "index.html", icon: "fa-home" },
      { key: "resident", label: "주민", url: "survey_resident.html", icon: "fa-user" },
      { key: "tourist", label: "관광객", url: "survey_tourist.html", icon: "fa-plane" },
      { key: "visitor", label: "방문객", url: "survey_visitor.html", icon: "fa-location-dot" },
      { key: "lodging", label: "숙박관계자", url: "survey_lodging.html", icon: "fa-hotel" },
      { key: "admin", label: "관리자", url: "#", icon: "fa-cog", onclick: "APP.auth.handleAdminNav(event)" },
    ];

    // Helper to generate class string
    const getClass = (key) => {
      const base = "text-gray-600 hover:text-ocean-600 font-medium transition";
      const active = "text-ocean-700 font-bold";
      return key === activeKey ? active : base;
    };

    const getMobileClass = (key) => {
      const base =
        "block p-4 mb-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-700 font-bold flex items-center justify-between hover:border-ocean-300 hover:shadow-md transition-all active:scale-[0.98]";
      const active =
        "block p-4 mb-3 bg-ocean-50 rounded-2xl shadow-sm border border-ocean-200 text-ocean-700 font-black flex items-center justify-between";
      return key === activeKey ? active : base;
    };

    const navHTML = `
      <nav class="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-200 shadow-sm">
        <div class="container mx-auto px-6 h-16 flex justify-between items-center">
          <!-- Logo -->
          <a href="index.html" class="font-black text-xl text-ocean-800 tracking-tight flex items-center gap-2">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ocean-600 text-white"><i class="fas fa-water"></i></span>
            <span>소원권역 <span class="text-ocean-500 font-bold hidden sm:inline">어촌신활력증진사업</span></span>
          </a>

          <div class="hidden md:flex space-x-6 items-center">
            ${menuItems.map((item) => `<a href="${item.url}" ${item.onclick ? `onclick="${item.onclick}"` : ''} class="${getClass(item.key)}">${item.label}</a>`).join("")}
            ${activeKey === 'admin' ? 
              `<button onclick="APP.auth.logout()" class="ml-4 px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded-lg transition border border-red-200">
                 <i class="fas fa-sign-out-alt mr-1"></i> 로그아웃
               </button>` : ''
            }
          </div>

          <!-- Mobile Menu Button -->
          <button id="mobileBtn" class="md:hidden text-gray-600 text-2xl p-2 rounded-lg hover:bg-gray-100 transition" aria-label="메뉴 열기">
            <i class="fas fa-bars"></i>
          </button>
        </div>

        <!-- Mobile Menu (Fullscreen overlay style) -->
        <!-- Fixed relative to viewport, z-index managed carefully -->
        <div id="mobileMenu" class="md:hidden hidden fixed inset-0 top-16 bg-slate-50 z-[60] overflow-y-auto pb-20 border-t border-gray-200 h-[calc(100vh-4rem)]">
          <div class="container mx-auto px-6 py-6 flex flex-col min-h-full">
            ${menuItems
              .map(
                (item) => `
              <a href="${item.url}" ${item.onclick ? `onclick="${item.onclick}"` : ''} class="mobile-nav-link ${getMobileClass(item.key)}">
                <span class="flex items-center gap-3">
                   <span class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-lg ${item.key === activeKey ? 'bg-ocean-100 text-ocean-600' : ''}">
                     <i class="fas ${item.icon || 'fa-chevron-right'}"></i>
                   </span>
                   <span class="text-lg">${item.label}</span>
                </span>
                <i class="fas fa-chevron-right text-gray-300"></i>
              </a>`
              )
              .join("")}
              
            ${activeKey === 'admin' ? `
              <div class="mt-4 pt-4 border-t border-gray-100">
                <button onclick="APP.auth.logout()" class="w-full p-4 mb-3 bg-red-50 rounded-2xl border border-red-100 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100">
                  <i class="fas fa-sign-out-alt"></i> 로그아웃
                </button>
              </div>` : ''}
              
              <div class="mt-auto pt-8 pb-10 text-center text-gray-400 text-sm">
                <p>© 2026. Sowon Area Anchor Center.</p>
              </div>
          </div>
        </div>
      </nav>
    `;

    navContainer.innerHTML = navHTML;
  },

  renderFooter: function () {
    const footerContainer = document.getElementById("app-footer");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
      <footer class="bg-slate-50 border-t border-gray-200 py-10 text-center text-slate-500 text-sm">
        <div class="container mx-auto px-4">
          <p class="font-bold text-slate-700 mb-2">태안군 소원권역 어촌신활력증진사업 앵커현장센터</p>
          <p>충청남도 태안군 소원면 서해로 33-31 (만리포 복지회관)</p>
          <p class="mt-4 text-xs text-slate-400">© 2026. Sowon Area Anchor Center. All rights reserved.</p>
        </div>
      </footer>
    `;
  },

  bindEvents: function () {
    const btn = document.getElementById("mobileBtn");
    const menu = document.getElementById("mobileMenu");

    if (btn && menu) {
      // Toggle Menu
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
        const isOpen = !menu.classList.contains("hidden");
        btn.innerHTML = isOpen
          ? '<i class="fas fa-times"></i>'
          : '<i class="fas fa-bars"></i>';
        
        // Prevent body scroll when menu is open
        if(isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
      });

      // Close when clicking a link
      const links = menu.querySelectorAll('.mobile-nav-link');
      links.forEach(link => {
          link.addEventListener('click', () => {
              menu.classList.add("hidden");
              btn.innerHTML = '<i class="fas fa-bars"></i>';
              document.body.style.overflow = '';
          });
      });

      // Handle Resize (Reset state)
      window.addEventListener('resize', () => {
          if (window.innerWidth >= 768) { // md breakpoint
              if(!menu.classList.contains('hidden')) {
                  menu.classList.add("hidden");
                  btn.innerHTML = '<i class="fas fa-bars"></i>';
                  document.body.style.overflow = '';
              }
          }
      });
      } else {
        console.warn("[UI] Mobile menu elements not found.");
    }
  },

  setVal: function(id, value) {
      const el = document.getElementById(id);
      if (el) {
          el.textContent = value;
      } else {
          // console.warn(`[UI] Element ${id} not found.`);
      }
  }
};

/**
 * App.modal
 * Reusable modal controller for KPI details and Help content
 * integrated from archived 07_modal.js
 */
window.App = window.App || {};
App.modal = {
    MODAL_ID: 'app-standard-modal',

    _createContainerIfMissing() {
        let container = document.getElementById(this.MODAL_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = this.MODAL_ID;
            container.className = 'fixed inset-0 bg-slate-900/50 hidden z-[200] flex items-center justify-center backdrop-blur-sm transition-opacity duration-300';
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
        
        // Render content using App.helpData (from core.js) and current score
        this._renderContent(container, kpiKey, currentScore);
        
        container.classList.remove('hidden');
        container.classList.add('flex');
    },

    close() {
        const container = document.getElementById(this.MODAL_ID);
        if (container) {
            container.classList.add('hidden');
            container.classList.remove('flex');
        }
        
        // Clean up modal chart instance to prevent memory leaks
        if (window.App?.charts) {
            window.App.charts.destroyByTab('modal');
        }
    },

    _renderContent(container, key, score) {
        // Fallback for missing HelpData (HelpData is merged into App.helpData in core.js)
        const help = (window.App && window.App.helpData && window.App.helpData[key]) || {
            title: key,
            summary: "해당 지표에 대한 설명 데이터가 없습니다.",
            formula: "-",
            components: [],
            source: "-",
            notes: "-"
        };

        let compHtml = '';
        
        // Try to fetch real component scores from global store
        // summary.kpiComponents contains breakdown
        const summary = window.App?.store?.get('summary');
        const extComps = summary?.kpiComponents?.[key];
        
        if (extComps && typeof extComps === 'object') {
            compHtml = Object.entries(extComps).map(([compKey, val]) => {
                // Find matching human-readable label from helpData components if possible, or use raw key
                const matchLabel = (help.components || []).find(c => c.includes(compKey) || compKey.includes(c)) || compKey;
                
                const color = key === 'SII' ? 'rose' : 'ocean';
                const pct = Math.min(100, Math.max(0, val));
                
                return `
                    <div class="px-3 py-2 bg-slate-50 border border-slate-100 rounded mb-2">
                        <div class="flex justify-between items-center text-sm mb-1">
                            <span class="text-slate-600 font-medium">${matchLabel}</span>
                            <span class="font-bold text-slate-800">${parseFloat(val).toFixed(1)}</span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-1.5">
                            <div class="bg-${color}-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            compHtml = help.components && help.components.length > 0 
                ? help.components.map(c => `
                    <div class="px-3 py-2 bg-slate-50 border border-slate-100 rounded text-slate-600 text-sm mb-1 last:mb-0">
                        <i class="fas fa-cube text-ocean-400 mr-2"></i>${c}
                    </div>
                  `).join('')
                : '<span class="text-sm text-slate-400">구성 요소 데이터 없음</span>';
        }

        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out] m-4">
                <!-- Header -->
                <div class="bg-slate-800 p-5 flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold text-white">${help.title}</h3>
                        <p class="text-slate-400 text-[10px] uppercase tracking-wider">지표 정의 및 상세 분석</p>
                    </div>
                    <button onclick="App.modal.close()" class="text-slate-400 hover:text-white transition group w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                        <i class="fas fa-times text-lg group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>
                
                <!-- Body -->
                <div class="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                    <!-- Score Display -->
                    ${score !== '-' ? `
                        <div class="mb-6 text-center pb-5 border-b border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">현재 지표 점수</span>
                            <span class="text-5xl font-black text-ocean-600">${score}</span>
                            <span class="text-sm text-slate-500 ml-1">점</span>
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-1 gap-5">
                        <section>
                            <h4 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                                <i class="fas fa-info-circle text-ocean-500"></i> 개요
                            </h4>
                            <p class="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">${help.summary}</p>
                        </section>

                        <section>
                            <h4 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                                <i class="fas fa-calculator text-ocean-500"></i> 산출 공식/방식
                            </h4>
                            <div class="p-3 bg-slate-900 text-slate-300 text-[11px] rounded-lg font-mono break-all leading-relaxed border border-slate-800">
                                ${help.formula}
                            </div>
                        </section>

                        <section>
                            <h4 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                                <i class="fas fa-layer-group text-ocean-500"></i> 지표 구성 요소 (Breakdown)
                            </h4>
                            <div class="space-y-1">${compHtml}</div>
                        </section>
                        
                        ${help.notes && help.notes !== '-' ? `
                        <section class="mt-2 p-4 bg-ocean-50 rounded-xl border border-ocean-100">
                            <h4 class="font-bold text-ocean-800 text-[11px] uppercase mb-1 flex items-center gap-2">
                                <i class="fas fa-lightbulb text-ocean-600"></i> 분석 참고 가이드
                            </h4>
                            <p class="text-[12px] text-ocean-900/70 leading-relaxed font-medium">${help.notes}</p>
                        </section>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
};

