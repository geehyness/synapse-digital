// src/components/HouseViewer/HouseViewer.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import nipplejs from "nipplejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"; // Import GLTFLoader

const isMobile = () => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

const HouseViewer: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Three.js refs
    const sceneRef = useRef<THREE.Scene | null>(null); // Initialize with null for clarity
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); // Initialize with null
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null); // Initialize with null

    // Cannon.js physics world and bodies
    const worldRef = useRef<CANNON.World | null>(null); // Initialize with null
    const playerBodyRef = useRef<CANNON.Body | null>(null); // Initialize with null

    // Movement input (desktop and mobile)
    const inputRef = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        mobileX: 0,
        mobileY: 0,
    });

    // Rotation state for FPS camera
    const yawRef = useRef(0);   // left/right
    const pitchRef = useRef(0); // up/down
    const pitchLimit = 85 * (Math.PI / 180); // Limit pitch to ±85 degrees

    // State: whether user clicked to start
    const [started, setStarted] = useState(false);

    // --- Animation loop using useCallback for memoization and stability ---
    // Moved outside of useEffect to be a top-level hook call
    const animate = useCallback((time?: number) => {
        // Ensure all necessary refs are available before proceeding
        if (!worldRef.current || !playerBodyRef.current || !cameraRef.current || !sceneRef.current || !rendererRef.current) {
            requestAnimationFrame(animate); // Keep trying to animate if refs aren't ready
            return;
        }

        requestAnimationFrame(animate);

        let lastTime: number | null = (animate as any).lastTime || null; // Access lastTime from a mutable property if needed or handle differently
        if (!lastTime) lastTime = time ?? performance.now();
        const dt = ((time ?? performance.now()) - lastTime) / 1000;
        (animate as any).lastTime = time ?? performance.now(); // Store for next frame

        let inputX = 0;
        let inputZ = 0;

        if (inputRef.current.forward) inputZ -= 1;
        if (inputRef.current.backward) inputZ += 1;
        if (inputRef.current.left) inputX -= 1;
        if (inputRef.current.right) inputX += 1;

        if (inputRef.current.mobileX !== 0 || inputRef.current.mobileY !== 0) {
            inputX = inputRef.current.mobileX;
            inputZ = inputRef.current.mobileY * -1; // Mobile joystick Y is inverted for typical "forward"
        }

        const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (length > 0) {
            inputX /= length;
            inputZ /= length;
        }

        const walkSpeed = 5; // Define walkSpeed here or pass it as a dependency if it changes

        // Calculate forward direction from yaw angle of the camera
        const forwardX = Math.sin(yawRef.current);
        const forwardZ = Math.cos(yawRef.current);

        // Calculate right direction perpendicular to forward
        const rightX = Math.sin(yawRef.current - Math.PI / 2);
        const rightZ = Math.cos(yawRef.current - Math.PI / 2);

        // Apply movement force based on camera direction
        const velocityX =
            forwardX * inputZ * walkSpeed + rightX * inputX * walkSpeed;
        const velocityZ =
            forwardZ * inputZ * walkSpeed + rightZ * inputX * walkSpeed;

        // Update player body velocity (directly setting it for simple controls)
        playerBodyRef.current.velocity.x = velocityX;
        playerBodyRef.current.velocity.z = velocityZ;

        // Step the physics world
        worldRef.current.step(1 / 60, dt); // Fixed time step for physics

        // Update camera position to match player body position
        const p = playerBodyRef.current.position;
        cameraRef.current.position.set(p.x, p.y + 0.85, p.z); // Adjust camera height relative to sphere center

        // Apply rotation to camera directly
        cameraRef.current.rotation.order = "YXZ"; // Set order to YAW (around Y) then PITCH (around X)
        cameraRef.current.rotation.y = yawRef.current;
        cameraRef.current.rotation.x = pitchRef.current;

        // Update player debug mesh position
        const playerMesh = sceneRef.current.getObjectByName("PlayerDebugMesh");
        if (playerMesh) {
            playerMesh.position.copy(playerBodyRef.current.position as any);
            // Optionally, if your player mesh needs rotation, apply playerBodyRef.current.quaternion
            // (playerMesh as THREE.Mesh).quaternion.copy(playerBodyRef.current.quaternion as any);
        }

        // Render the scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);
    }, [yawRef, pitchRef, inputRef]); // Dependencies for useCallback. Include any state/props that `animate` uses directly.


    // Request pointer lock after start
    useEffect(() => {
        if (!started) return;

        const container = containerRef.current;
        if (!container) return;

        // Request pointer lock on the container element
        container.requestPointerLock();

        // Pointer lock change handler
        const onPointerLockChange = () => {
            if (document.pointerLockElement !== container) {
                // Pointer lock lost, maybe pause or show UI?
                // For now, just stop rotation input
            }
        };
        document.addEventListener("pointerlockchange", onPointerLockChange);

        return () => {
            document.removeEventListener("pointerlockchange", onPointerLockChange);
            if (document.pointerLockElement === container) {
                document.exitPointerLock();
            }
        };
    }, [started]);

    // Initialize scene, camera, renderer, physics, and load models (only once)
    useEffect(() => {
        if (!containerRef.current) return;

        // --- Setup Three.js ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xa0a0a0);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 1.7, 5); // 1.7m height
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
        );
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // Ground Mesh (for visualization)
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d8c40 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);

        // --- Cannon.js physics setup ---
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0); // Standard gravity
        world.broadphase = new CANNON.SAPBroadphase(world); // Better for large scenes
        world.solver.iterations = 10;
        worldRef.current = world;

        // Define Cannon Materials
        const groundPhysicsMaterial = new CANNON.Material("groundMaterial");
        const playerPhysicsMaterial = new CANNON.Material("playerMaterial");

        // Define ContactMaterial to specify friction between ground and player
        const groundPlayerContactMaterial = new CANNON.ContactMaterial(
            groundPhysicsMaterial,
            playerPhysicsMaterial,
            {
                friction: 0.0, // Adjust friction as needed (0 for slippery)
                restitution: 0.1, // Bounciness
            }
        );
        world.addContactMaterial(groundPlayerContactMaterial);

        // Ground Body
        const groundBody = new CANNON.Body({
            mass: 0, // A mass of 0 makes it static
            shape: new CANNON.Plane(),
            material: groundPhysicsMaterial,
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate ground to be horizontal
        world.addBody(groundBody);

        // Player Body
        const playerBody = new CANNON.Body({
            mass: 5,
            shape: new CANNON.Sphere(0.5), // Player represented as a sphere
            position: new CANNON.Vec3(0, 1.7, 0), // Initial player position
            material: playerPhysicsMaterial,
            linearDamping: 0.9, // Reduce sliding
        });
        world.addBody(playerBody);
        playerBodyRef.current = playerBody;

        // Player visualization (for debugging - you might replace this with a proper player model)
        const playerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1.7, 1),
            new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
        );
        playerMesh.name = "PlayerDebugMesh"; // Give it a name to find it later
        scene.add(playerMesh);

        // --- Load 3D Model (from SceneContent.tsx) ---
        const loader = new GLTFLoader();
        loader.load(
            "/models/building1.glb", // Make sure this path is correct
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 0, 0); // Adjust as needed
                scene.add(model);
                console.log("Building model loaded");
            },
            undefined, // onProgress callback (optional)
            (error) => {
                console.error("Error loading building1.glb:", error);
            }
        );

        // Handle window resize
        const onResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current)
                return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };
        window.addEventListener("resize", onResize);

        // Cleanup on unmount
        return () => {
            window.removeEventListener("resize", onResize);
            if (containerRef.current && rendererRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            // Dispose of Three.js objects to prevent memory leaks (more complex for full cleanup)
            renderer.dispose();
            scene.clear();
        };
    }, []); // Empty dependency array means this runs once on mount

    // Input handling and animation loop kick-off (depends on `started` state and `animate` function)
    useEffect(() => {
        if (!started) return;

        // Keyboard input handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    inputRef.current.forward = true;
                    break;
                case "KeyS":
                case "ArrowDown":
                    inputRef.current.backward = true;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    inputRef.current.left = true;
                    break;
                case "KeyD":
                case "ArrowRight":
                    inputRef.current.right = true;
                    break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    inputRef.current.forward = false;
                    break;
                case "KeyS":
                case "ArrowDown":
                    inputRef.current.backward = false;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    inputRef.current.left = false;
                    break;
                case "KeyD":
                case "ArrowRight":
                    inputRef.current.right = false;
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // Mouse move for rotation (only if pointer locked)
        const onMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement !== containerRef.current) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            // Adjust sensitivity
            const sensitivity = 0.002;

            yawRef.current -= movementX * sensitivity;
            pitchRef.current -= movementY * sensitivity;

            // Clamp pitch so you can't look too far up/down
            pitchRef.current = Math.max(
                -pitchLimit,
                Math.min(pitchLimit, pitchRef.current)
            );
        };
        window.addEventListener("mousemove", onMouseMove);

        // Nipple joystick only on mobile
        let joystick: nipplejs.JoystickManager | null = null;
        if (isMobile()) {
            const joystickContainer = document.getElementById("joystick-container");
            if (joystickContainer) {
                joystick = nipplejs.create({
                    zone: joystickContainer,
                    mode: "static",
                    position: { left: "50%", bottom: "40px" },
                    color: "blue",
                    size: 100,
                });

                joystick.on("move", (_evt, data) => {
                    if (data.direction) {
                        const angle = data.angle.radian;
                        inputRef.current.mobileX = Math.cos(angle);
                        inputRef.current.mobileY = Math.sin(angle);
                    }
                });

                joystick.on("end", () => {
                    inputRef.current.mobileX = 0;
                    inputRef.current.mobileY = 0;
                });
            }
        }

        // Start animation loop
        animate(); // This call is now correctly within the useEffect where `animate` is a dependency

        // Cleanup for event listeners and joystick
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("mousemove", onMouseMove);
            joystick?.destroy();
        };
    }, [started, animate]); // `animate` is a dependency because it's wrapped in useCallback


    return (
        <>
            <div
                ref={containerRef}
                style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
            />
            {!started && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        color: "white",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "2rem",
                        cursor: "pointer",
                        userSelect: "none",
                        zIndex: 9999,
                    }}
                    onClick={() => setStarted(true)}
                    onTouchStart={() => setStarted(true)}
                >
                    Click or Tap to Start
                </div>
            )}
            {started && isMobile() && (
                <div
                    id="joystick-container"
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        height: "40%",
                        zIndex: 10,
                    }}
                />
            )}
        </>
    );
};

export default HouseViewer;