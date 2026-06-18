/**
 * 06_chartManager.js
 * Centralized Chart Instance Manager (ECharts & Chart.js)
 * Ticket 05: ChartManager Separation and Optimization
 */

window.App = window.App || {};

App.chartManager = {
    // Registry: DOM_ID -> { type: 'echarts'|'chartjs', instance: Object, tabId: string }
    instances: {},
    
    init() {
        console.log("[App.chartManager] Initializing global resize listener...");
        // Use a slight debounce for resize to prevent rapid firing
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resizeAll(), 100);
        });
    },

    get(id) { 
        return this.instances[id] ? this.instances[id].instance : null; 
    },
    
    /**
     * Render or Update an ECharts instance.
     * Prioritizes setOption over dispose/init to prevent flicker and save memory.
     * 
     * @param {string} id - DOM Element ID
     * @param {object} option - ECharts option object
     * @param {string} tabId - (Optional) Tab namespace for scoped cleanup
     */
    renderEChart(id, option, tabId = 'global') {
        const dom = document.getElementById(id);
        if(!dom) {
            console.warn(`[App.chartManager] DOM element '${id}' not found.`);
            return null;
        }
        
        // ECharts has a built-in getInstanceByDom
        let chart = window.echarts.getInstanceByDom(dom);
        
        if (!chart) {
            // First time initialization
            chart = window.echarts.init(dom);
        }

        // Apply options (merge by default, use notMerge: false)
        chart.setOption(option);
        
        // Register in our manager mapping
        this.instances[id] = { type: 'echarts', instance: chart, tabId: tabId };
        
        return chart;
    },
    
    /**
     * Render or Update a Chart.js instance.
     */
    renderChartJS(id, config, tabId = 'global') {
        const ctx = document.getElementById(id);
        if(!ctx) return null;
        
        let existing = this.instances[id];
        
        if (existing && existing.type === 'chartjs') {
            // ChartJS is trickier to perfectly update deep config generically. 
            // Standard approach is destroy/recreate unless specifically updating data array.
            existing.instance.destroy();
        }
        
        const chart = new Chart(ctx, config);
        this.instances[id] = { type: 'chartjs', instance: chart, tabId: tabId };
        return chart;
    },
    
    /**
     * Destroy a specific chart by ID
     */
    destroy(id) {
        const record = this.instances[id];
        if(record) {
            if(record.type === 'echarts' && !record.instance.isDisposed()) {
                record.instance.dispose();
            } else if(record.type === 'chartjs') {
                record.instance.destroy();
            }
            delete this.instances[id];
        }
    },

    /**
     * Destroy all charts associated with a specific tab.
     * Useful for cleanup when leaving complex tabs.
     */
    destroyByTab(tabId) {
        Object.keys(this.instances).forEach(id => {
            if (this.instances[id].tabId === tabId) {
                this.destroy(id);
            }
        });
    },
    
    /**
     * Resize all active ECharts instances
     */
    resizeAll() {
        Object.values(this.instances).forEach(r => {
            if(r.type === 'echarts' && !r.instance.isDisposed()) {
                r.instance.resize();
            }
            // Chart.js handles generic resize natively based on container relative sizing.
        });
    },

    /**
     * Render ECharts-based WordCloud [RI-05]
     */
    renderWordCloud(id, data, tabId = 'global') {
        const dom = document.getElementById(id);
        if(!dom || !window.echarts) return null;

        const option = {
            tooltip: { show: true },
            series: [{
                type: 'wordCloud',
                shape: 'circle',
                left: 'center',
                top: 'center',
                width: '100%',
                height: '100%',
                sizeRange: [12, 60],
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
                emphasis: {
                    focus: 'self',
                    textStyle: { shadowBlur: 10, shadowColor: '#333' }
                },
                data: data
            }]
        };

        return this.renderEChart(id, option, tabId);
    }
};

// Auto-init early if script is loaded immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    App.chartManager.init();
} else {
    document.addEventListener('DOMContentLoaded', () => App.chartManager.init());
}
