# Project Meiji: Iteration 31 — Civic Edicts Overhaul, Visual Contrast & Advisor Guidance

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all touched and new source files strictly under **450–500 lines**.
  * Keep advisor logic isolated in `public/js/ui/advisorManager.js` (< 250 lines).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Default Edict States & Gameplay Rebalance (`edictsManager.js` / `config.js`)
Ensure edicts operate as conscious player choices, not accidental fiscal drains.

### Implementation Tasks
* **Default Initialization:**
  * Change initial state of all edicts to `false` (100% OFF) on settlement creation and game reset.
  * Starting fiscal impact must be `¥0/mo`, preserving initial treasury runway.
* **Header Button Badge Dynamic Updates:**
  * Update the `[ 📜 Edicts ]` button in the Chronicle header:
    * When 0 edicts active: `📜 Edicts` (standard paper beige).
    * When $\ge 1$ edicts active: `📜 Edicts (N)` with an amber/lacquer highlight.
    * If monthly cashflow turns negative while edicts are active: pulse a subtle crimson warning dot on the button.

---

## 3. Visual Switch Contrast & Card Strategic Hints (`hud.css` & `edicts_drawer.js`)
Fix toggle switch ambiguity and provide clear gameplay context for when to toggle laws.

### Implementation Tasks
* **Toggle Switch Contrast (`public/css/hud.css`):**
  * **OFF State:** Muted stone-gray/warm beige track (`#d1c7b7`), switch knob parked on the left (`#fbf7ee`).
  * **ON State:** Rich Meiji lacquer red track (`#8c2d19`), switch knob parked on the right (`#ffffff`) with subtle drop shadow.
* **Strategic Context Hints in Drawer:**
  * Add a contextual "Advisor's Recommendation" note under each edict card:
    * **Night Fire Watch (*Yakin*):** *"Recommended for dense wooden districts or dry autumn/winter months (M9–M2). Disable when treasury is tight or districts are stone-paved."*
    * **Clean Water Mandate (*Seisui-rei*):** *"Recommended when accelerating immigration to reach the next town tier. Disable if housing zones are scarce."*
    * **Modernization Subsidy (*Bunmei Kaika*):** *"Caution: Drains ¥50 from treasury per upgrade. Only enable with substantial surplus funds (¥10,000+) to prevent rapid bankruptcy."*

---

## 4. Beginner Advisor Hints System ("Advisor's Counsel / 参事の助言")
Add dynamic tactical guidance for players learning the simulation mechanics.

### Implementation Tasks
* **Settings Toggle:**
  * Add an "Advisor Guidance: ON / OFF" checkbox inside the Settings/Layers menu (defaults to ON for new players).
* **Dynamic Condition Evaluator (`advisorManager.js`):**
  * Evaluates town state every 2 months:
    * **Dry Season / Fire Hazard Warning:** If Autumn/Winter begins, town has $> 4$ wooden Machiya, and `Night Fire Watch` is OFF:
      * Trigger discreet toast banner: *"Advisor Notice: Dry winter winds increase fire risks. Consider enacting Night Fire Watch under Edicts."*
    * **Fiscal Bleed Warning:** If cashflow is negative for 2 consecutive months with edicts running:
      * Trigger notice: *"Advisor Notice: Municipal upkeep is draining treasury. Review active edicts to cut monthly expenses."*
    * **Rapid Modernization Drain:** If treasury drops by $> ¥150$ in one tick due to building conversions:
      * Trigger notice: *"Advisor Notice: Modernization subsidies are heavily draining funds. Consider pausing Bunmei Kaika."*
  * Banners feature a direct `[ Open Edicts ]` link and a `[ Dismiss ]` button.

---

## 5. Automated Verification & Regression Protocol
1. **Automated Test Suite (`scripts/test_iteration31.js`):**
   * **Test 1: Default OFF State:** Verify fresh games initialize with 0 active edicts and `¥0/mo` fiscal impact.
   * **Test 2: Header Badge Update:** Verify header text and count update dynamically when toggling edicts.
   * **Test 3: Advisor Triggers:** Verify condition checks fire the correct hints when thresholds are met.
   * **Test 4: File Size Governance:** Verify `advisorManager.js` and touched UI modules remain $< 450$ lines.
2. **Regression Check:** Run `test_iteration30.js`, `test_iteration28.js`, and `test_wiring_integrity.js`.

---

## 6. Execution Order for Agent
1. Apply the `/ponytail` skill.
2. Set default edict values to `false` in `config.js` and `edictsManager.js`.
3. Revise `.edict-toggle` CSS in `hud.css` to ensure stark contrast between ON and OFF states.
4. Add strategic recommendation hints to the edicts drawer template.
5. Create `advisorManager.js` with toggleable beginner hints.
6. Run test suites and verify in browser.