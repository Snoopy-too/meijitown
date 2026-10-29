// Project Meiji - Shared Parametric Meiji Architectural Kit (meijiArchitectureKit.js)
// Phase 2 /artisan: Curved Sori Kawara Roofs with UV Mapping, Tsumakabe Gables, Taruki Rafters & True Kōshi Lattices

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
     * Builds a curved Japanese Irimoya/Kirizuma roof geometry with two-tier concave sori flare and UV mapping.
     */
    static createRoofWedgeGeometry(width, depth, height, ridgeRatio = 0.78) {
        const hw = width / 2;
        const hd = depth / 2;
        const hr = hw * ridgeRatio;
        const h = height;

        // Mid-slope inflection point creates authentic concave Japanese roof curve (sori)
        const mw = hw * 0.90;
        const md = hd * 0.48;
        const mh = h * 0.38;

        const positions = new Float32Array([
            // Front lower flared eave slope
            -hw, 0,  hd,   hw, 0,  hd,   mw, mh,  md,
            -hw, 0,  hd,   mw, mh,  md,  -mw, mh,  md,
            // Front upper main slope
            -mw, mh, md,   mw, mh,  md,   hr, h,   0,
            -mw, mh, md,   hr, h,   0,   -hr, h,   0,
            // Back lower flared eave slope
             hw, 0, -hd,  -hw, 0, -hd,  -mw, mh, -md,
             hw, 0, -hd,  -mw, mh, -md,   mw, mh, -md,
            // Back upper main slope
             mw, mh,-md,  -mw, mh, -md,  -hr, h,   0,
             mw, mh,-md,  -hr, h,   0,    hr, h,   0,
            // Left hipped/gabled facets
            -hw, 0, -hd,  -hw, 0,  hd,  -mw, mh,  md,
            -hw, 0, -hd,  -mw, mh,  md,  -mw, mh, -md,
            -mw, mh,-md,  -mw, mh,  md,  -hr, h,   0,
            // Right hipped/gabled facets
             hw, 0,  hd,   hw, 0, -hd,   mw, mh, -md,
             hw, 0,  hd,   mw, mh, -md,   mw, mh,  md,
             mw, mh, md,   mw, mh, -md,   hr, h,   0,
            // Bottom soffit face
            -hw, 0, -hd,   hw, 0, -hd,   hw, 0,  hd,
            -hw, 0, -hd,   hw, 0,  hd,  -hw, 0,  hd
        ]);

        const uScale = Math.max(1, Math.round(width * 2));
        const uvs = new Float32Array([
            // Front lower
            0, 0,  uScale, 0,  uScale, 0.45,
            0, 0,  uScale, 0.45, 0, 0.45,
            // Front upper
            0, 0.45, uScale, 0.45, uScale, 1,
            0, 0.45, uScale, 1, 0, 1,
            // Back lower
            0, 0,  uScale, 0,  uScale, 0.45,
            0, 0,  uScale, 0.45, 0, 0.45,
            // Back upper
            0, 0.45, uScale, 0.45, uScale, 1,
            0, 0.45, uScale, 1, 0, 1,
            // Left
            0, 0, 1, 0, 1, 0.45,
            0, 0, 1, 0.45, 0, 0.45,
            0, 0.45, 1, 0.45, 0.5, 1,
            // Right
            0, 0, 1, 0, 1, 0.45,
            0, 0, 1, 0.45, 0, 0.45,
            0, 0.45, 1, 0.45, 0.5, 1,
            // Bottom
            0, 0, 1, 0, 1, 1,
            0, 0, 1, 1, 0, 1
        ]);

        const geo = new THREE.BufferGeometry();
        const AttrClass = THREE.Float32BufferAttribute || THREE.BufferAttribute;
        if (AttrClass) {
            geo.setAttribute('position', new AttrClass(positions, 3));
            geo.setAttribute('uv', new AttrClass(uvs, 2));
        }
        geo.computeVertexNormals();
        return geo;
    }

    /**
     * Authentic Japanese Kawara Roof with white-plaster tsumakabe gables, taruki rafters, shikkui ridge & onigawara.
     */
    static addGabledRoof(parent, width, depth, height, yBase, zOffset = 0, roofMat = null, xOffset = 0) {
        const mat = roofMat || MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');
        const plasterMat = MaterialLibrary.get('plasterWhite');
        const trimMat = MaterialLibrary.get('stoneTrim');

        // 1. Under-eave soffit & protruding taruki rafter tails along front and back eaves
        this.addPart(parent, new THREE.BoxGeometry(width * 0.94, 0.04, depth * 0.94), woodMat, [xOffset, yBase - 0.02, zOffset], true);
        const rafterCount = Math.max(4, Math.floor(width / 0.24));
        const rafterGeo = new THREE.BoxGeometry(0.03, 0.03, depth + 0.06);
        for (let i = 0; i < rafterCount; i++) {
            const rx = xOffset - (width * 0.44) + (i / Math.max(1, rafterCount - 1)) * (width * 0.88);
            this.addPart(parent, rafterGeo, woodMat, [rx, yBase - 0.01, zOffset]);
        }

        // 2. White-plaster triangular gable tympanums (tsumakabe) on left and right sides
        const gableW = 0.06;
        const gableD = depth * 0.46;
        const gableH = height * 0.52;
        for (const side of [-1, 1]) {
            const gx = xOffset + side * (width * 0.39);
            this.addPart(parent, new THREE.BoxGeometry(gableW, gableH, gableD), plasterMat, [gx, yBase + gableH * 0.55, zOffset]);
            this.addPart(parent, new THREE.BoxGeometry(gableW + 0.02, gableH * 0.85, 0.04), woodMat, [gx, yBase + gableH * 0.55, zOffset]);
        }

        // 3. Primary curved sori kawara roof prism
        const wedgeGeo = this.createRoofWedgeGeometry(width, depth, height);
        this.addPart(parent, wedgeGeo, mat, [xOffset, yBase, zOffset], true, null, true, 'Kawara_Roof');

        // 4. Layered mune-gawara ridge beam with white lime-mortar (shikkui) accent band
        const ridgeW = width * 0.80;
        this.addPart(parent, new THREE.BoxGeometry(ridgeW, 0.05, 0.14), trimMat, [xOffset, yBase + height + 0.01, zOffset]);
        this.addPart(parent, new THREE.BoxGeometry(ridgeW + 0.04, 0.07, 0.11), mat, [xOffset, yBase + height + 0.05, zOffset], true, null, false, 'Roof_Ridge');

        // 5. Dual Onigawara (sculpted demon-tile ridge finials) with upturned horns
        const oniGeo = new THREE.BoxGeometry(0.09, 0.16, 0.16);
        for (const side of [-1, 1]) {
            const ox = xOffset + side * (ridgeW / 2 + 0.02);
            this.addPart(parent, oniGeo, mat, [ox, yBase + height + 0.06, zOffset], true);
            this.addPart(parent, new THREE.BoxGeometry(0.05, 0.04, 0.12), trimMat, [ox, yBase + height + 0.14, zOffset]);
        }
    }

    /**
     * Stepped Karahafu (curved cusped porch gable) for auspicious entryways (Sentō, elite Machiya).
     */
    static addKarahafuGable(parent, width, depth, height, pos) {
        const roofMat = MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');
        const goldMat = MaterialLibrary.get('goldLeaf');

        const archGeo = new THREE.CylinderGeometry(width / 2, width / 2, depth, 12, 1, false, 0, Math.PI);
        archGeo.rotateZ(Math.PI / 2);
        archGeo.scale(1.0, height / (width / 2), 1.0);
        this.addPart(parent, archGeo, roofMat, [pos[0], pos[1] + height * 0.45, pos[2]], true, null, true, 'Karahafu_Canopy');

        // Supporting carved lintel, bargeboard trim & gilded gegyo pendant
        this.addPart(parent, new THREE.BoxGeometry(width + 0.10, 0.055, 0.07), woodMat, [pos[0], pos[1], pos[2] + depth / 2 - 0.03], true);
        this.addPart(parent, new THREE.BoxGeometry(0.08, 0.09, 0.04), goldMat, [pos[0], pos[1] + height * 0.72, pos[2] + depth / 2]);
    }

    /**
     * Intermediate tiled Hisashi street-front awning with corrugated tile ribs and bracket corbels.
     */
    static addHisashiAwning(parent, width, depth, yPos, zFront) {
        const roofMat = MaterialLibrary.get('kawaraRoof');
        const woodMat = MaterialLibrary.get('woodDark');

        const awning = this.addPart(parent, new THREE.BoxGeometry(width, 0.055, depth), roofMat, [0, yPos, zFront], true);
        awning.rotation.x = 0.22;

        // Front eave fascia beam
        this.addPart(parent, new THREE.BoxGeometry(width + 0.02, 0.035, 0.035), woodMat, [0, yPos - depth * 0.10, zFront + depth * 0.48]);

        // Timber cantilever bracket supports (ude-gi)
        for (const bx of [-width * 0.40, -width * 0.14, width * 0.14, width * 0.40]) {
            this.addPart(parent, new THREE.BoxGeometry(0.038, 0.12, depth * 0.72), woodMat, [bx, yPos - 0.07, zFront - depth * 0.12], true);
        }
    }

    /**
     * Raised Stone Foundation Plinth with dressed granite coping.
     */
    static addStoneFoundation(parent, width, depth, height = 0.14, zOffset = 0) {
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const base = this.addPart(parent, new THREE.BoxGeometry(width, height * 0.82, depth), stoneMat, [0, (height * 0.82) / 2, zOffset], true, null, true, 'Stone_Base');
        this.addPart(parent, new THREE.BoxGeometry(width + 0.04, height * 0.22, depth + 0.04), trimMat, [0, height * 0.89, zOffset], true, null, true);
        return base;
    }

    /**
     * Corner structural timber posts & horizontal nageshi tie-beams.
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
     * Traditional Kōshi Lattice window with recessed glowing Shoji backing, perimeter frame rails & proud vertical slats.
     */
    static addKoushiLattice(parent, width, height, pos, isSideWall = false) {
        const shojiMat = MaterialLibrary.get('shojiWindow');
        const woodMat = MaterialLibrary.get('woodDark');

        // 1. Glowing Shoji paper panel backing
        const panelGeo = isSideWall
            ? new THREE.BoxGeometry(0.015, height * 0.94, width * 0.94)
            : new THREE.BoxGeometry(width * 0.94, height * 0.94, 0.015);
        this.addPart(parent, panelGeo, shojiMat, pos, false, null, false, 'Front_Koushi');

        // 2. Top and bottom perimeter frame rails (does NOT occlude shoji panel!)
        const zOut = isSideWall ? 0 : 0.014;
        const xOut = isSideWall ? 0.014 : 0;
        const hRailGeo = isSideWall
            ? new THREE.BoxGeometry(0.038, 0.035, width + 0.04)
            : new THREE.BoxGeometry(width + 0.04, 0.035, 0.038);
        this.addPart(parent, hRailGeo, woodMat, [pos[0] + xOut, pos[1] + height / 2, pos[2] + zOut]);
        this.addPart(parent, hRailGeo, woodMat, [pos[0] + xOut, pos[1] - height / 2, pos[2] + zOut]);
        this.addPart(parent, hRailGeo, woodMat, [pos[0] + xOut, pos[1], pos[2] + zOut]); // Mid transom bar

        // 3. Proud vertical wooden lattice mullion bars standing in front of shoji backing
        const barCount = Math.max(5, Math.floor(width / 0.11));
        const barGeo = isSideWall
            ? new THREE.BoxGeometry(0.036, height, 0.022)
            : new THREE.BoxGeometry(0.022, height, 0.036);
        const halfSpan = (width * 0.92) / 2;
        for (let i = 0; i < barCount; i++) {
            const frac = barCount > 1 ? i / (barCount - 1) : 0.5;
            const offset = -halfSpan + frac * (halfSpan * 2);
            const barPos = isSideWall
                ? [pos[0] + xOut, pos[1], pos[2] + offset]
                : [pos[0] + offset, pos[1], pos[2] + zOut];
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
     * Hanging Chōchin Paper Lantern with cord, ribbed body & lacquered caps.
     */
    static addChochinLantern(parent, pos, isRed = true) {
        const lanternMat = isRed ? MaterialLibrary.get('redLantern') : MaterialLibrary.get('gasLantern');
        const capMat = MaterialLibrary.get('plasterBlack');
        const cordMat = MaterialLibrary.get('bamboo');

        this.addPart(parent, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), cordMat, [pos[0], pos[1] + 0.14, pos[2]]);
        this.addPart(parent, new THREE.SphereGeometry(0.095, 8, 7), lanternMat, pos, false, null, false, 'Lantern_Body');
        this.addPart(parent, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 6), capMat, [pos[0], pos[1] + 0.09, pos[2]]);
        this.addPart(parent, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 6), capMat, [pos[0], pos[1] - 0.09, pos[2]]);
    }
}
