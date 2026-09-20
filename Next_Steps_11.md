# Project Meiji: Iteration 12 — Road Surface Aesthetics & Immersion Polish

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file lengths before adding code. If modifying a file pushes it past 500 lines, execute an immediate on-the-spot modular extraction (e.g., split road shaders or audio into separate ES modules).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB, Blender.

---

## 2. Stone Paving Visual Realism (*Ishidatami*)
Eliminate the modern asphalt appearance in favor of authentic Meiji granite masonry.

### Implementation Tasks
* **Material Palette Correction (`roadSystem.js` / material loader):**
  * Replace the current dark asphalt diffuse color (`#2B2B2B`) with a warm, natural granite stone tone:
    * Primary Paver Tone: `#8E8B82` (warm grey sandstone/granite).
    * Kerb / Shoulder Trim: `#6E6B65`.
    * Roughness: Increase roughness to `0.85` (non-reflective, matte stone).
* **Surface Texture / Normal Detailing:**
  * Apply a lightweight canvas-generated or SVG tiled flagstone/paver normal map to give the stone slabs individual depth under directional sunlight.
  * Ensure dirt roads retain their warm earth brown (`#7C6348`) with soft feathered edges, creating a clear visual upgrade contrast against paved stone.

---

## 3. Telegraph Line Height & Clearance
Prevent telegraph wires from intersecting building meshes.

### Implementation Tasks
* **Wire Routing & Pole Clearance:**
  * Increase telegraph pole crossarm height to $y = 4.2\text{m}$ (clearing standard two-story roof eaves).
  * Constrain wire catenary curves strictly between poles placed on the outer edge of road tiles so they run along street channels rather than cutting across residential zoning parcels.

---

## 4. Night & Lantern Glow Ambience
Bring warm life to the town during evening phases.

### Implementation Tasks
* **Day / Night Lighting Cycle:**
  * Cycle directional sun pitch and color across 4 phases based on game months:
    * Daytime (bright warm white `#FFF8EE`)
    * Twilight / Golden Hour (warm amber `#FF9E4A`)
    * Night (deep indigo/moonlit `#1A2238`)
* **Lantern & Window Emissives:**
  * Toggle emissive properties on teahouse red lanterns and residential shoji windows during night ticks (`emissive: #FFA040`, intensity ~0.8).
  * Optional: Add small wooden gas lamp / lantern posts (*chōchin*) at stone road intersections.

---

## 5. Web Audio Ambient Integration
Introduce subtle procedural or lightweight soundscape elements.

### Implementation Tasks
* **Audio Manager Module (`audioManager.js`):**
  * Lightweight HTML5 / Web Audio synthesizer for UI clicks (wood block clack on placement, subtle bell on month advance).
  * Ambient countryside loop: soft wind breeze, seasonal crickets/cicadas in summer.
  * Volume mute/toggle button integrated into the top Chronicle bar.