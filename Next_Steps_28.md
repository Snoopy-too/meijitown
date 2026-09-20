# Project Meiji: Iteration 28 — Speed Recalibration & Cross-Platform Tool Inspection

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all files strictly under **500–600 lines**.
  * Place tool metadata in `public/js/config/toolCatalogData.js` (< 250 lines) rather than bloating `build_drawer.js` or `tools.js`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Simulation Speed Rebalancing (`simulation.js` & `header.js`)
Make current half-speed the new standard 1x baseline.

### Implementation Tasks
* **Tick Scale Adjustment (`simulation.js`):**
  * Update speed multiplier array/mapping:
    * `0`: Paused
    * `1`: Base interval = `old_base_interval * 2` (equivalent to old 0.5x, set as default on boot)
    * `2`: Equivalent to old 1x
    * `3`: Equivalent to old 2x
    * `5`: Equivalent to old 4x
* **UI Controls Update (`index.html` / `header.js`):**
  * Update header speed button labels: `[ ⏸ ] [ 1x ] [ 2x ] [ 3x ] [ 5x ]`.
  * Ensure the `[ 1x ]` button defaults to the active red/pressed state on startup.

---

## 3. Tool Effects & Purpose Data Layer (`toolCatalogData.js`)
Centralize clear gameplay mechanical summaries for every catalog item.

### Data Structure:
```javascript
export const TOOL_CATALOG = {
  well: {
    name: { en: "Well (Ido)", ja: "井戸" },
    cost: 80, upkeep: 2,
    effect: { 
      en: "Provides fresh water within 5 tiles. Eliminates disease risk and satisfies basic sanitation.",
      ja: "半径5タイルに生活用水を供給。伝染病を防ぎ衛生を確保。" 
    },
    category: "civic"
  },
  fire_watchtower: {
    name: { en: "Watchtower (Hinomi-yagura)", ja: "火の見櫓" },
    cost: 250, upkeep: 5,
    effect: { 
      en: "Detects blazes across 6 tiles. Rings alarm bell to summon nearby Hikeshi brigades.",
      ja: "半径6タイルの火災を早期発見。半鐘で消火隊を誘導。" 
    },
    category: "civic"
  },
  shrine_park: {
    name: { en: "Shrine Park (Jinja)", ja: "神社・鎮守の杜" },
    cost: 50, upkeep: 0,
    effect: { 
      en: "Provides Leisure & Culture within 4 tiles (+10% satisfaction). Calms panic during disasters.",
      ja: "半径4タイルの住宅に娯楽と安心を提供（満足度+10%）。" 
    },
    category: "leisure"
  }
  // Populate remaining tools with cost, upkeep, and 1-line gameplay effects
};