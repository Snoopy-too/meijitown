// Project Meiji - 3D Camera & Touch Gesture Controller
// ponytail: OrbitControls configuration, mobile touch pan/pinch/twist & smooth keyboard rotations

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

export class CameraManager {
    constructor(container, domElement) {
        this.container = container || (typeof document !== 'undefined' ? document.body : null);
        this.domElement = domElement;

        const width = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : window.innerWidth;
        const height = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : window.innerHeight;

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
        this._lastWidth = width;
        this._lastHeight = height;
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

    rotateCameraBy(angleDelta, durationMs = 240) {
        // Flush any residual OrbitControls damping delta before sampling current camera angle
        const prevDamping = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.controls.update();
        this.controls.enableDamping = prevDamping;

        const offset = this.camera.position.clone().sub(this.controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        const remainingDelta = this.cameraAnim
            ? (this.cameraAnim.targetTheta - this.cameraAnim.currentTheta)
            : 0;
        const startTheta = spherical.theta;
        const targetTheta = startTheta + remainingDelta + angleDelta;

        this.cameraAnim = {
            startTheta,
            currentTheta: startTheta,
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
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentTheta = THREE.MathUtils.lerp(this.cameraAnim.startTheta, this.cameraAnim.targetTheta, eased);
            this.cameraAnim.currentTheta = currentTheta;

            const spherical = new THREE.Spherical(this.cameraAnim.radius, this.cameraAnim.phi, currentTheta);
            const offset = new THREE.Vector3().setFromSpherical(spherical);
            this.camera.position.copy(this.controls.target).add(offset);

            const prevDamping = this.controls.enableDamping;
            this.controls.enableDamping = false;
            this.controls.update();
            this.controls.enableDamping = prevDamping;

            if (progress >= 1.0) {
                this.cameraAnim = null;
            }
        } else {
            this.controls.update();
        }
    }

    handleResize(renderer, force = false) {
        const w = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : window.innerWidth;
        const h = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : window.innerHeight;
        if (!force && w === this._lastWidth && h === this._lastHeight) return false;
        this._lastWidth = w;
        this._lastHeight = h;
        this.camera.aspect = w / Math.max(1, h);
        this.camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        return true;
    }

    bindEvents() {
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}
