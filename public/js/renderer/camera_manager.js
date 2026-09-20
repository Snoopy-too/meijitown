// Project Meiji - 3D Camera & Touch Gesture Controller
// ponytail: OrbitControls configuration, mobile touch pan/pinch/twist & smooth keyboard rotations

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

export class CameraManager {
    constructor(container, domElement) {
        this.container = container;
        this.domElement = domElement;

        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(35, width / height, 0.5, 1000);
        const centerOffset = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;
        this.camera.position.set(centerOffset + 26, 28, centerOffset + 26);

        this.controls = new OrbitControls(this.camera, this.domElement);
        this.controls.target.set(centerOffset, 0, centerOffset);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;

        // Desktop mouse configuration: Right-click rotates, Middle-click pans
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };

        // Mobile touch gesture standard:
        // Survey Mode default: 1-finger pan, 2-finger pinch & rotate
        this.controls.touches = {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_ROTATE
        };

        this.controls.enableRotate = true;
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;
        this.controls.minDistance = CONFIG.CAMERA.MIN_DISTANCE;
        this.controls.maxDistance = CONFIG.CAMERA.MAX_DISTANCE;
        this.controls.maxPolarAngle = CONFIG.CAMERA.MAX_POLAR_ANGLE;
        this.controls.update();

        this.cameraAnim = null;
        this.bindEvents();
    }

    setBuildMode(isBuilding) {
        if (isBuilding) {
            // Disable 1-finger panning so touches paint on the grid; 2-finger zoom/rotate stays active
            this.controls.touches.ONE = null;
        } else {
            // Restore 1-finger panning in Survey mode
            this.controls.touches.ONE = THREE.TOUCH.PAN;
        }
    }

    rotateCameraBy(angleDelta, durationMs = 200) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        const startTheta = spherical.theta;
        const targetTheta = startTheta + angleDelta;

        this.cameraAnim = {
            startTheta,
            targetTheta,
            radius: spherical.radius,
            phi: spherical.phi,
            startTime: performance.now(),
            duration: durationMs
        };
    }

    update() {
        if (this.cameraAnim) {
            const now = performance.now();
            const elapsed = now - this.cameraAnim.startTime;
            const progress = Math.min(1.0, elapsed / this.cameraAnim.duration);
            const eased = 1 - Math.pow(1 - progress, 2);
            const currentTheta = THREE.MathUtils.lerp(this.cameraAnim.startTheta, this.cameraAnim.targetTheta, eased);

            const spherical = new THREE.Spherical(this.cameraAnim.radius, this.cameraAnim.phi, currentTheta);
            const offset = new THREE.Vector3().setFromSpherical(spherical);
            this.camera.position.copy(this.controls.target).add(offset);
            this.controls.update();

            if (progress >= 1.0) {
                this.cameraAnim = null;
            }
        } else {
            this.controls.update();
        }
    }

    handleResize(renderer) {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    bindEvents() {
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}
