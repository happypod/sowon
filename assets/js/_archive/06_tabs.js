/**
 * 06_tabs.js
 * Centralized Tab Router and View Manager
 * Ticket 04: Tab Separation
 */

window.App = window.App || {};

App.tabs = {
    // Registry of loaded tab controllers
    _controllers: {},
    
    /**
     * Initialize tab routing and event listeners
     */
    init() {
        // Find all tab buttons and attach generic click handlers
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = btn.id.replace('tab-', '');
                this.show(tabId);
            });
        });
        
        // Listen to global store changes if needed
        if (window.App.bus) {
            window.App.bus.on('auth:logout', () => this.hideAll());
        }
    },
    
    /**
     * Register a specific tab controller
     * @param {string} tabId 
     * @param {object} controller 
     */
    register(tabId, controller) {
        this._controllers[tabId] = controller;
        if(controller.init) controller.init();
    },

    /**
     * Switch to a specific tab
     * @param {string} tabId 
     */
    show(tabId) {
        // 1. Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        
        // 2. Deactivate all buttons
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('bg-ocean-600', 'text-white', 'shadow-md', 'active');
            el.classList.add('text-slate-600', 'bg-white', 'md:bg-transparent');
        });

        // 3. Show active view
        const view = document.getElementById(`view-${tabId}`);
        if(view) view.classList.remove('hidden');

        // 4. Activate button
        const btn = document.getElementById(`tab-${tabId}`);
        if(btn) {
            btn.classList.add('bg-ocean-600', 'text-white', 'shadow-md', 'active');
            btn.classList.remove('text-slate-600', 'bg-white', 'md:bg-transparent');
        }
        
        // 5. Update global state
        if(window.App.store) {
            App.store.set('activeTab', tabId);
        }

        // 6. Trigger Controller Render/Load if registered
        const controller = this._controllers[tabId];
        if (controller && controller.load) {
            controller.load();
        } else {
            console.warn(`[App.tabs] No dedicated controller registered for '${tabId}'. Firing generic event.`);
            // Fallback: Emit event for legacy `app.js` to pick up during transition
            if(window.App.bus) {
                App.bus.emit('tab:changed', tabId);
            }
        }
    },
    
    hideAll() {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    }
};
