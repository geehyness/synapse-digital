"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

type Props = {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
};

const SceneContent: React.FC<Props> = ({ scene, camera, renderer }) => {
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const keys = useRef<{ [key: string]: boolean }>({});

    // Use refs for pitch and yaw objects so you can clean up listeners reliably
    const pitchObject = useRef(new THREE.Object3D());
    const yawObject = useRef(new THREE.Object3D());

    useEffect(() => {
        const loader = new GLTFLoader();
        let model: THREE.Object3D;//| null = null;

        loader.load(
            "/models/building1.glb",
            (gltf) => {
                model = gltf.scene;
                model.position.set(0, 0, 0);
                scene.add(model);
                console.log("Building model loaded");
            },
            undefined,
            (error) => {
                console.error("Error loading building1.glb:", error);
            }
        );

        // Lighting
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // Setup camera hierarchy for FPS control:
        pitchObject.current.add(camera);
        yawObject.current.position.y = 1.7; // camera height in meters
        yawObject.current.add(pitchObject.current);
        scene.add(yawObject.current);

        // Pointer lock setup on renderer DOM element
        const domEl = renderer.domElement;
        const handleClick = () => {
            if (document.pointerLockElement !== domEl) {
                domEl.requestPointerLock();
            }
        };
        domEl.addEventListener("click", handleClick);

        // Mouse movement handler for look controls
        const onMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement !== domEl) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            yawObject.current.rotation.y -= movementX * 0.002;
            pitchObject.current.rotation.x -= movementY * 0.002;
            pitchObject.current.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, pitchObject.current.rotation.x)
            );
        };

        document.addEventListener("mousemove", onMouseMove, false);

        // Keyboard movement handlers
        const onKeyDown = (e: KeyboardEvent) => {
            keys.current[e.code] = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keys.current[e.code] = false;
        };
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        const clock = new THREE.Clock();

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();

            velocity.current.set(0, 0, 0);
            direction.current.set(0, 0, 0);

            const speed = 5; // meters per second

            if (keys.current["KeyW"]) direction.current.z -= 1;
            if (keys.current["KeyS"]) direction.current.z += 1;
            if (keys.current["KeyA"]) direction.current.x -= 1;
            if (keys.current["KeyD"]) direction.current.x += 1;

            direction.current.normalize();
            direction.current.multiplyScalar(speed * delta);

            // Calculate forward and right vectors based on yaw rotation
            const forward = new THREE.Vector3();
            yawObject.current.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3().crossVectors(
                forward,
                new THREE.Vector3(0, 1, 0)
            ).normalize();

            yawObject.current.position.add(forward.multiplyScalar(direction.current.z));
            yawObject.current.position.add(right.multiplyScalar(direction.current.x));

            renderer.render(scene, camera);
        };

        animate();

        // Cleanup function
        return () => {
            if (model !== null) {
                scene.remove(model);
            }
            scene.remove(dirLight);
            const ambientLight = scene.getObjectByProperty("type", "AmbientLight");
            if (ambientLight) {
                scene.remove(ambientLight);
            }

            domEl.removeEventListener("click", handleClick);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
        };

    }, [scene, camera, renderer]);

    return null;
};

export default SceneContent;
