// Project Meiji - Shared Parametric Meiji Architectural Kit (meijiArchitectureKit.js)
// Phase 2 /artisan: Layered eaves, taruki rafters, karahafu gables, hisashi awnings, namako dados & kōshi lattices

import * as THREE from 'three';
import { MaterialLibrary } from '../renderer/materialLibrary.js';

export class MeijiArchitectureKit {
    static addPart(parent, geo, mat, pos = [0, 0, 0], cast = false, rot = null, receive = false, name = '') {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        if (rot) {
            if (rot[0]) mesh.rotation.x = rot[0];
            if (rot[1]) mesh.rotation.y = rot[1];
            if (rot[2]) mesh.rotation.z = rot[2];
        }
        if (cast) mesh.castShadow = true;
        if (receive) mesh.receiveShadow = true;
        if (name) mesh.name = name;
        parent.add(mesh);
        return mesh;
    }

    /**
     * Builds a Three.js Y-up gabled/hipped prism roof geometry with slight swept flare.
     */
    static createRoofWedgeGeometry(width, depth, height, ridgeRatio = 0.72) {
        const hw = width / 2;
        const hd = depth / 2;
        const hr = hw * ridgeRatio;
        const h = height;

        const positions = new Float32Array([
            // Front slope
            -hw, 0,  hd,   hw, 0,  hd,   hr, h, 0,
            -hw, 0,  hd,   hr, h,  0,   -hr, h, 0,
            // Back slope
             hw, 0, -hd,  -hw, 0, -hd,  -hr, h, 0,
             hw, 0, -hd,  -hr, h,  0,    hr, h, 0,
            // Left hip triangle
            -hw, 0, -hd,  -hw, 0,  hd,  -hr, h, 0,
            // Right hip triangle
             hw, 0,  hd,   hw, 0, -hd,   hr, h, 0,
            // Bottom face
            -hw, 0, -hd,   hw, 0, -hd,   hw, 0, hd,
            -hw, 0, -hd,   hw, 0,  hd,  -hw, 0, hd
        ]);

        const geo = new THREE.BufferGeometry();
        const AttrClass = THREE.Float32BufferAttribute || THREE.BufferAttribute;
        if (AttrClass) {
            geo.setAttribute('position', new AttrClass(positions, 3));
        }
        geo.computeVertexNormals();
        return geo;
    }

    /**
     * Authentic Japanese Kawara Roof with under-eave rafters (taruki), eave rim, ridge beam & onigawara end caps.
     */
    static addGabledRoof(parent, width, depth, height, yBase, zOffset = 0, roofMat = null, xOffset = 0) {
        const mat = roofMat || MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');

        // 1. Under-eave rafter plate (taruki bed)
        this.addPart(parent, new THREE.BoxGeometry(width * 0.94, 0.04, depth * 0.94), woodMat, [xOffset, yBase - 0.02, zOffset], true);

        // 2. Primary kawara roof prism
        const wedgeGeo = this.createRoofWedgeGeometry(width, depth, height);
        this.addPart(parent, wedgeGeo, mat, [xOffset, yBase, zOffset], true, null, true, 'Kawara_Roof');

        // 3. Eave trim skirt (gives subtle sori upturn profile to the roof edge)
        const eaveTrimGeo = new THREE.BoxGeometry(width + 0.06, 0.035, depth + 0.06);
        this.addPart(parent, eaveTrimGeo, mat, [xOffset, yBase + 0.01, zOffset], true);

        // 4. Heavy ornamental ridge beam (Mune-gawara)
        const ridgeW = width * 0.74;
        this.addPart(parent, new THREE.BoxGeometry(ridgeW, 0.09, 0.12), mat, [xOffset, yBase + height + 0.03, zOffset], true, null, false, 'Roof_Ridge');

        // 5. Dual Onigawara (ogre-face demon roof tile end-pieces)
        const oniGeo = new THREE.BoxGeometry(0.10, 0.15, 0.15);
        this.addPart(parent, oniGeo, mat, [xOffset - ridgeW / 2, yBase + height + 0.05, zOffset], true);
        this.addPart(parent, oniGeo, mat, [xOffset + ridgeW / 2, yBase + height + 0.05, zOffset], true);
    }

    /**
     * Stepped Karahafu (curved cusped porch gable) for auspicious entryways (Sentō, elite Machiya).
     */
    static addKarahafuGable(parent, width, depth, height, pos) {
        const roofMat = MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');

        const archGeo = new THREE.CylinderGeometry(width / 2, width / 2, depth, 10, 1, false, 0, Math.PI);
        archGeo.rotateZ(Math.PI / 2);
        archGeo.scale(1.0, height / (width / 2), 1.0);
        this.addPart(parent, archGeo, roofMat, [pos[0], pos[1] + height * 0.45, pos[2]], true, null, true, 'Karahafu_Canopy');

        // Supporting lintel & bargeboard trim
        this.addPart(parent, new THREE.BoxGeometry(width + 0.08, 0.05, 0.06), woodMat, [pos[0], pos[1], pos[2] + depth / 2 - 0.03], true);
    }

    /**
     * Intermediate tiled Hisashi awning with triangular timber bracket supports.
     */
    static addHisashiAwning(parent, width, depth, yPos, zFront) {
        const roofMat = MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');

        const awning = this.addPart(parent, new THREE.BoxGeometry(width, 0.06, depth), roofMat, [0, yPos, zFront], true);
        awning.rotation.x = 0.18;

        // Timber cantilever bracket supports
        for (const bx of [-width * 0.38, 0, width * 0.38]) {
            this.addPart(parent, new THREE.BoxGeometry(0.04, 0.14, depth * 0.65), woodMat, [bx, yPos - 0.08, zFront - depth * 0.15], true);
        }
    }

    /**
     * Raised Stone Foundation Plinth with dressed granite coping.
     */
    static addStoneFoundation(parent, width, depth, height = 0.14, zOffset = 0) {
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');
        // Main base block
        const base = this.addPart(parent, new THREE.BoxGeometry(width, height * 0.85, depth), stoneMat, [0, (height * 0.85) / 2, zOffset], true, null, true, 'Stone_Base');
        // Dressed granite top coping ledge
        this.addPart(parent, new THREE.BoxGeometry(width + 0.04, height * 0.20, depth + 0.04), trimMat, [0, height * 0.90, zOffset], true, null, true);
        return base;
    }

    /**
     * Corner structural timber posts.
     */
    static addCornerPillars(parent, width, depth, height, yCenter, zOffset = 0, size = 0.09, mat = null) {
        const woodMat = mat || MaterialLibrary.get('woodDark');
        const hx = width / 2 - size * 0.35;
        const hz = depth / 2 - size * 0.35;
        const geo = new THREE.BoxGeometry(size, height, size);
        for (const ox of [-hx, hx]) {
            for (const oz of [-hz, hz]) {
                this.addPart(parent, geo, woodMat, [ox, yCenter, oz + zOffset], true);
            }
        }
    }

    /**
     * Traditional Kōshi Lattice window with glowing Shoji backing and individual vertical wooden slats.
     */
    static addKoushiLattice(parent, width, height, pos, isSideWall = false) {
        const shojiMat = MaterialLibrary.get('shojiWindow');
        const woodMat = MaterialLibrary.get('woodDark');

        // 1. Glowing Shoji paper panel backing
        const panelGeo = isSideWall
            ? new THREE.BoxGeometry(0.02, height, width)
            : new THREE.BoxGeometry(width, height, 0.02);
        this.addPart(parent, panelGeo, shojiMat, pos, false, null, false, 'Front_Koushi');

        // 2. Surrounding dark cedar frame
        const frameGeo = isSideWall
            ? new THREE.BoxGeometry(0.04, height + 0.04, width + 0.04)
            : new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.04);
        this.addPart(parent, frameGeo, woodMat, pos, false);

        // 3. Fine vertical wooden lattice mullion bars
        const barCount = Math.max(3, Math.floor(width / 0.16));
        const barGeo = isSideWall
            ? new THREE.BoxGeometry(0.03, height * 0.95, 0.02)
            : new THREE.BoxGeometry(0.02, height * 0.95, 0.03);
        const halfSpan = (width * 0.85) / 2;
        for (let i = 0; i < barCount; i++) {
            const frac = barCount > 1 ? i / (barCount - 1) : 0.5;
            const offset = -halfSpan + frac * (halfSpan * 2);
            const barPos = isSideWall
                ? [pos[0], pos[1], pos[2] + offset]
                : [pos[0] + offset, pos[1], pos[2]];
            this.addPart(parent, barGeo, woodMat, barPos, false);
        }
    }

    /**
     * Namako-kabe fireproof diamond-tile wainscoting dado with protective capping beam.
     */
    static addNamakoDado(parent, width, height, depth, yBase, zOffset = 0) {
        const namakoMat = MaterialLibrary.get('namakoWall');
        const woodMat = MaterialLibrary.get('woodDark');

        this.addPart(parent, new THREE.BoxGeometry(width, height, depth), namakoMat, [0, yBase + height / 2, zOffset], true, null, true);
        this.addPart(parent, new THREE.BoxGeometry(width + 0.04, 0.04, depth + 0.04), woodMat, [0, yBase + height + 0.02, zOffset], true);
    }

    /**
     * Hanging Chōchin Paper Lantern with cord, body & lacquered caps.
     */
    static addChochinLantern(parent, pos, isRed = true) {
        const lanternMat = isRed ? MaterialLibrary.get('redLantern') : MaterialLibrary.get('gasLantern');
        const capMat = MaterialLibrary.get('plasterBlack');
        const cordMat = MaterialLibrary.get('bamboo');

        this.addPart(parent, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), cordMat, [pos[0], pos[1] + 0.14, pos[2]]);
        this.addPart(parent, new THREE.CylinderGeometry(0.085, 0.085, 0.18, 8), lanternMat, pos, false, null, false, 'Lantern_Body');
        this.addPart(parent, new THREE.CylinderGeometry(0.065, 0.065, 0.03, 6), capMat, [pos[0], pos[1] + 0.095, pos[2]]);
        this.addPart(parent, new THREE.CylinderGeometry(0.055, 0.055, 0.03, 6), capMat, [pos[0], pos[1] - 0.095, pos[2]]);
    }
}
