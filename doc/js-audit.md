# JS File Audit & Reorganization Plan

This document outlines the current state and future destination of all JavaScript files in the `assets/` and `assets/js` directories, fulfilling the `CLEANUP-01` objective.

## Audit Inventory

| File Name                   | Loaded In      | Actual Usage                   | Decision & Destination                                                                                                                                                                                                                   |
| :-------------------------- | :------------- | :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adminDataService.js`       | `admin.html`   | Dashboard Data Fetching        | **Keep** -> `/assets/js/adminDataService.js`                                                                                                                                                                                             |
| `app.js`                    | All HTMLs      | Global initialization, routing | **Keep** -> `/assets/js/app.js`                                                                                                                                                                                                          |
| `auditLogger.js`            | `admin.html`   | Logging inside engines         | **Archive** (Will be absorbed or removed)                                                                                                                                                                                                |
| `chart.js`                  | None           | None (abandoned)               | **Archive** -> `/assets/js/_archive/`                                                                                                                                                                                                    |
| `config.js`                 | `index`, forms | Basic config for forms         | **Keep** -> `/assets/js/config.js` (Merge with `00_config.js`)                                                                                                                                                                           |
| `core_calculator.js`        | `admin.html`   | KPI Calculations               | **Merge** -> `/assets/js/core.js`                                                                                                                                                                                                        |
| `dataSyncEngine.js`         | `admin.html`   | Mock data sync                 | **Archive** -> `/assets/js/_archive/`                                                                                                                                                                                                    |
| `deltaLearningEngine.js`    | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `docGenerator.js`           | `admin.html`   | Mock Report Generation         | **Archive** -> `/assets/js/_archive/`                                                                                                                                                                                                    |
| `home.js`                   | `index.html`   | Landing page UI logic          | **Keep** -> `/assets/js/home.js`                                                                                                                                                                                                         |
| `kpiMappingTable.js`        | `admin.html`   | KPI Schema                     | **Merge** -> `/assets/js/core.js`                                                                                                                                                                                                        |
| `multiYearSimulator.js`     | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `participationPredictor.js` | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `policyRecommender.js`      | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `resident.js`               | `survey*.html` | Form validation logic          | **Archive** -> Move out of root/Keep in `_archive` and update references. (Actually, user said preserve functionality. We will move to `assets/js/_archive/` and update `survey_*.html` paths to maintain function while cleaning root). |
| `scenario_delta_matrix.js`  | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `scenario_engine.js`        | `admin.html`   | Simulation Engine              | **Merge** -> `/assets/js/engine.js`                                                                                                                                                                                                      |
| `tourist.js`                | `survey*.html` | Form validation logic          | **Archive** -> Move to `_archive` and update path.                                                                                                                                                                                       |
| `ui.js`                     | All HTMLs      | Shared UI utilities            | **Keep** -> `/assets/js/ui.js`                                                                                                                                                                                                           |
| `js/00_config.js`           | `admin.html`   | Admin config                   | **Merge** -> `/assets/js/config.js`                                                                                                                                                                                                      |
| `js/06_chartManager.js`     | `admin.html`   | Chart management               | **Rename** -> `/assets/js/charts.js`                                                                                                                                                                                                     |

## Target Structure

```
/assets/js/
  app.js (Main App)
  config.js (Combined Config)
  core.js (KPI + Core Math)
  engine.js (Simulators + Scenario)
  adminDataService.js (Data Fetch)
  ui.js (UI Utils)
  charts.js (Renamed from 06_chartManager.js)
  home.js (Landing)
  _archive/ (Deprecated & Form-specific scripts)
```
