# Project Meiji: Iteration 18 — Header 2-Tier Layout & Visual Hierarchy

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file lengths before modifying. If changes push a file past ~500 lines, perform an immediate modular extraction (e.g., extract `headerRenderer.js` or `rciMeter.js`).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Header Layout Restructure (HTML & CSS)
Eliminate horizontal button overflow and restore the orphaned RCI bars into the main card.

### Implementation Tasks
* **Restructure `#chronicle-banner` into a 2-Tier Flexbox Container:**
  * **Tier 1 (Status & Vitals Row):**
    * **Brand & Identity Group:**
      * `明治 Meiji` emblem.
      * Settlement badge: `Edo-Tokyo` with small inline tier pill `(T1 Village)`.
      * Mayor/Auth pill: Compact button `[👤 Guest / Sign In]` styled cleanly.
    * **Vitals Metric Group (Centered):**
      * Treasury: `¥9,372`
      * Cashflow: `+¥32/mo`
      * Population: `0`
      * Satisfaction: `65%`
    * **Demand Group (Right):**
      * Bring `#rci-container` inside Tier 1 right margin.
      * Give the RCI meter a subtle washi border and label so the bars are clearly framed.
  * **Tier 2 (Chronicle & Administration Row):**
    * **Date Display (Left):** `Meiji 5 (1872) - May`.
    * **Time Controls (Center):** `[ ⏸ ] [ ½× ] [ 1× ] [ 2× ] [ 4× ]`.
    * **Utility Toggles (Right):**
      * `[ 🔊 Mute ]`
      * `[ 🌐 日本語 ]`
      * `[ 🗺 Layers ]`
      * `[ 📜 Edicts ]`
* **Card Dimensions & Boundary Safety:**
  * Ensure `#chronicle-banner` has `overflow: visible;` and a fixed max-width (e.g., `max-width: 960px; margin: 0 auto;`).
  * Remove negative margins or rigid `calc()` widths that caused the Edicts button to poke outside the right border.

---

## 3. RCI Visual Contrast Polish
* Style the RCI component (`#rci-meter`):
  * Background: Semi-translucent dark slate or warm paper backing (`background: rgba(0, 0, 0, 0.05); padding: 4px 8px; border-radius: 4px;`).
  * Add tiny label initials below each bar: `R` (Green), `C` (Blue), `I` (Gold/Orange).

---

## 4. Execution Order for Agent
1. **Apply Global Directive:** Ensure `/ponytail` is invoked.
2. **File Audit:** Confirm modified UI files remain strictly under 500 lines.
3. **HTML Refactor:** Reorganize the banner DOM into two semantic rows (`.header-vitals-row` and `.header-controls-row`).
4. **CSS Grid/Flexbox Update:** Apply styling to ensure no buttons clip or spill out of the parchment card.