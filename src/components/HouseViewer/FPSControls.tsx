// src/components/HouseViewer/FPSControls.tsx
"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
// ✅ Correct import
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";


export function useFPSControls(
    camera: THREE.PerspectiveCamera | null,
    renderer: THREE.WebGLRenderer | null,
    scene: THREE.Scene | null
) {
    const controlsRef = useRef<PointerLockControls | null>(null);

    useEffect(() => {
        if (!camera || !renderer || !scene) return;

        const controls = new PointerLockControls(camera, renderer.domElement);
        controlsRef.current = controls;
        scene.add(controls.getObject());

        renderer.domElement.addEventListener("click", () => {
            controls.lock();
        });

        const move = { forward: false, backward: false, left: false, right: false };
        const velocity = new THREE.Vector3();
        const clock = new THREE.Clock();
        const speed = 5;

        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW": move.forward = true; break;
                case "KeyS": move.backward = true; break;
                case "KeyA": move.left = true; break;
                case "KeyD": move.right = true; break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW": move.forward = false; break;
                case "KeyS": move.backward = false; break;
                case "KeyA": move.left = false; break;
                case "KeyD": move.right = false; break;
            }
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        const animate = () => {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            velocity.set(0, 0, 0);

            if (move.forward) velocity.z -= speed * delta;
            if (move.backward) velocity.z += speed * delta;
            if (move.left) velocity.x -= speed * delta;
            if (move.right) velocity.x += speed * delta;

            controls.moveRight(velocity.x);
            controls.moveForward(velocity.z);

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
        };
    }, [camera, renderer, scene]);
}
