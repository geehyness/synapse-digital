// src/components/App.tsx
"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Box, VStack, Button, Text, useBreakpointValue } from "@chakra-ui/react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Hook to detect portrait orientation
function useIsPortrait() {
    const [isPortrait, setIsPortrait] = useState(
        typeof window !== "undefined" ? window.matchMedia("(orientation: portrait)").matches : false
    );
    useEffect(() => {
        const m = window.matchMedia("(orientation: portrait)");
        const fn = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
        m.addEventListener("change", fn);
        return () => m.removeEventListener("change", fn);
    }, []);
    return isPortrait;
}

// Function to generate realistic hills
function generateHills(width: number, depth: number, segments: number, amplitude: number): number[][] {
    const heights: number[][] = [];
    for (let i = 0; i <= segments; i++) {
        heights[i] = [];
        for (let j = 0; j <= segments; j++) {
            heights[i][j] = Math.sin(i * 0.2) * Math.cos(j * 0.2) * amplitude;
        }
    }
    return heights;

    /* Revert to this original code if the flat terrain works:
    // Generate heightfield data
    for (let i = 0; i <= segments; i++) {
        const row = [];
        for (let j = 0; j <= segments; j++) {
            // Realistic hill generation using multiple noise frequencies
            const x = (j - segments / 2) * size;
            const z = (i - segments / 2) * size;

            // Base terrain with large hills
            let y = amplitude * (
                Math.sin(x / 40) * Math.cos(z / 40) +
                0.5 * Math.sin(x / 20) * Math.cos(z / 20) +
                0.25 * Math.sin(x / 10) * Math.cos(z / 10)
            );

            // Add some random variation
            y += 0.1 * amplitude * Math.random();

            row.push(y);
        }
        heights.push(row);
    }
    return heights;
    */
}

// Sky color gradients based on time of day
const SKY_COLORS = {
    midnight: new THREE.Color(0x00001a), // Deep blue
    dawn: new THREE.Color(0x8c5b9a),     // Purple
    sunrise: new THREE.Color(0xff6b6b),   // Orange-red
    noon: new THREE.Color(0x87ceeb),      // Light blue
    sunset: new THREE.Color(0xff4500),    // Red-orange
    dusk: new THREE.Color(0x483d8b)       // Dark purple
};

export default function App() {
    // Refs for Three.js and Cannon.js objects
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const worldRef = useRef<CANNON.World | null>(null);
    const playerBodyRef = useRef<CANNON.Body | null>(null);
    const gltfModelRef = useRef<THREE.Object3D | null>(null);
    const modelBodiesRef = useRef<CANNON.Body[]>([]);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
    const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
    const hemisphereLightRef = useRef<THREE.HemisphereLight | null>(null);

    // Refs for camera controls
    const yaw = useRef(new THREE.Object3D());
    const pitch = useRef(new THREE.Object3D());
    const lookDelta = useRef({ x: 0, y: 0 });

    // Refs for movement state
    const moveForward = useRef(false);
    const moveBackward = useRef(false);
    const moveLeft = useRef(false);
    const moveRight = useRef(false);

    // State for model list and selection
    const [modelList, setModelList] = useState<string[]>([]);
    const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const isPortrait = useIsPortrait();
    const isControlsVisible = useBreakpointValue({ base: true, md: false });

    // Day-night cycle state
    const timeOfDay = useRef(12); // Start at noon (12:00)
    const timeSpeed = useRef(0.01); // How fast time progresses (0.01 = 1 minute per frame)

    // Animation frame ID for cleanup
    const animationFrameId = useRef<number | null>(null);

    // Initial setup for Three.js and Cannon.js
    const initThreeAndCannon = useCallback(() => {
        console.log("initThreeAndCannon called");
        console.log("mountRef:", mountRef.current);
        if (!mountRef.current || sceneRef.current) {
            return;
        }

        console.log("App.tsx: Initializing Three.js and Cannon.js...");

        // Three.js Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = SKY_COLORS.noon; // Start with noon sky

        // Debug Cube
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(0, 0.5, 0);
        scene.add(box);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        cameraRef.current = camera;
        camera.position.set(0, 10, 30);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        yaw.current.rotation.y = 0;
        yaw.current.add(pitch.current);
        pitch.current.add(camera);
        scene.add(yaw.current);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current = renderer;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444422, 0.3);
        scene.add(hemisphereLight);
        hemisphereLightRef.current = hemisphereLight;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        ambientLightRef.current = ambientLight;

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        sunLight.position.set(200, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        scene.add(sunLight);
        sunLightRef.current = sunLight;

        // Optional sun mesh (commented)
        // const sunSphere = new THREE.Mesh(
        //     new THREE.SphereGeometry(5, 16, 16),
        //     new THREE.MeshBasicMaterial({ color: 0xffff00 })
        // );
        // sunSphere.position.copy(sunLight.position);
        // scene.add(sunSphere);

        // Cannon.js World
        const world = new CANNON.World();
        worldRef.current = world;
        world.gravity.set(0, -9.82, 0);
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.defaultContactMaterial.friction = 0.5;
        world.defaultContactMaterial.restitution = 0.1;

        // --- Flat Plane ---
        const planeSize = 100;

        // Three.js Ground Plane
        const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x3d8c40 });
        const groundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);

        // Cannon.js Ground Body
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to lie flat
        world.addBody(groundBody);

        // Player Body
        const playerBody = new CANNON.Body({
            mass: 5,
            shape: new CANNON.Sphere(1.0),
            position: new CANNON.Vec3(0, 5, 10),
        });
        playerBody.linearDamping = 0.9;
        world.addBody(playerBody);

        console.log("App.tsx: Three.js and Cannon.js initialized.");
    }, []);



    // Update day-night cycle
    const updateDayNightCycle = useCallback(() => {
        const scene = sceneRef.current;
        const sunLight = sunLightRef.current;
        const ambientLight = ambientLightRef.current;
        const hemisphereLight = hemisphereLightRef.current;

        if (!scene || !sunLight || !ambientLight || !hemisphereLight) return;

        // Progress time
        timeOfDay.current = (timeOfDay.current + timeSpeed.current) % 24;

        // Calculate sun position (orbit around Y axis)
        const sunAngle = (timeOfDay.current / 24) * Math.PI * 2;
        const sunDistance = 200;
        const sunX = Math.cos(sunAngle) * sunDistance;
        const sunY = Math.sin(sunAngle) * sunDistance + 50; // Offset vertically
        const sunZ = Math.sin(sunAngle * 0.5) * sunDistance;

        sunLight.position.set(sunX, sunY, sunZ);

        // Update sun color based on time of day
        let sunColor = new THREE.Color();
        let skyColor = new THREE.Color();
        let ambientIntensity = 0.3;
        let sunIntensity = 1.0;

        if (timeOfDay.current >= 5 && timeOfDay.current < 6) {
            // Dawn (5-6)
            const t = (timeOfDay.current - 5);
            sunColor = SKY_COLORS.dawn.clone().lerp(SKY_COLORS.sunrise, t);
            skyColor = SKY_COLORS.dawn.clone().lerp(SKY_COLORS.sunrise, t);
        } else if (timeOfDay.current >= 6 && timeOfDay.current < 8) {
            // Sunrise (6-8)
            const t = (timeOfDay.current - 6) / 2;
            sunColor = SKY_COLORS.sunrise.clone().lerp(SKY_COLORS.noon, t);
            skyColor = SKY_COLORS.sunrise.clone().lerp(SKY_COLORS.noon, t);
        } else if (timeOfDay.current >= 8 && timeOfDay.current < 17) {
            // Day (8-17)
            sunColor = SKY_COLORS.noon;
            skyColor = SKY_COLORS.noon;
        } else if (timeOfDay.current >= 17 && timeOfDay.current < 19) {
            // Sunset (17-19)
            const t = (timeOfDay.current - 17) / 2;
            sunColor = SKY_COLORS.noon.clone().lerp(SKY_COLORS.sunset, t);
            skyColor = SKY_COLORS.noon.clone().lerp(SKY_COLORS.sunset, t);
        } else if (timeOfDay.current >= 19 && timeOfDay.current < 20) {
            // Dusk (19-20)
            const t = (timeOfDay.current - 19);
            sunColor = SKY_COLORS.sunset.clone().lerp(SKY_COLORS.dusk, t);
            skyColor = SKY_COLORS.sunset.clone().lerp(SKY_COLORS.dusk, t);
        } else {
            // Night (20-5)
            sunColor = SKY_COLORS.midnight;
            skyColor = SKY_COLORS.midnight;
            ambientIntensity = 0.1;
            sunIntensity = 0.1;
        }

        // Adjust intensity based on sun position
        const heightFactor = Math.max(0, Math.sin(sunAngle));
        sunLight.intensity = sunIntensity * heightFactor;
        ambientLight.intensity = ambientIntensity * (0.5 + 0.5 * heightFactor);
        hemisphereLight.intensity = 0.3 * heightFactor;

        // Set colors
        scene.background = skyColor;
        sunLight.color.copy(sunColor);
    }, []);

    // Animation loop
    const animate = useCallback(() => {
        console.log("Animating frame");

        animationFrameId.current = requestAnimationFrame(animate);

        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const renderer = rendererRef.current;
        const world = worldRef.current;
        const playerBody = playerBodyRef.current;

        if (!scene || !camera || !renderer || !world || !playerBody) {
            return;
        }
        console.log("Player Y position:", playerBody.position.y.toFixed(2));
        // Update day-night cycle
        updateDayNightCycle();

        // Update physics
        const fixedTimeStep = 1 / 60;
        const maxSubSteps = 10;
        world.step(fixedTimeStep, performance.now() / 1000, maxSubSteps);

        // Sync player body with camera
        yaw.current.position.set(
            playerBody.position.x,
            playerBody.position.y,
            playerBody.position.z
        );

        // Apply movement with realistic walking speed (1.4 m/s)
        const moveSpeed = 1.4; // Realistic walking speed in m/s
        const velocity = new CANNON.Vec3(0, playerBody.velocity.y, 0);

        // Calculate movement direction based on camera orientation
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyQuaternion(yaw.current.quaternion);
        forwardVector.y = 0;
        forwardVector.normalize();

        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyQuaternion(yaw.current.quaternion);
        rightVector.y = 0;
        rightVector.normalize();

        // Calculate movement vector based on input
        if (moveForward.current) {
            velocity.x += forwardVector.x * moveSpeed;
            velocity.z += forwardVector.z * moveSpeed;
        }
        if (moveBackward.current) {
            velocity.x -= forwardVector.x * moveSpeed;
            velocity.z -= forwardVector.z * moveSpeed;
        }
        if (moveLeft.current) {
            velocity.x -= rightVector.x * moveSpeed;
            velocity.z -= rightVector.z * moveSpeed;
        }
        if (moveRight.current) {
            velocity.x += rightVector.x * moveSpeed;
            velocity.z += rightVector.z * moveSpeed;
        }

        // Apply velocity to player body
        playerBody.velocity.x = velocity.x;
        playerBody.velocity.z = velocity.z;

        // Apply look delta
        if (lookDelta.current.x !== 0 || lookDelta.current.y !== 0) {
            yaw.current.rotation.y -= lookDelta.current.x * 0.005;
            pitch.current.rotation.x -= lookDelta.current.y * 0.005;
            pitch.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current.rotation.x));
            lookDelta.current.x = lookDelta.current.y = 0;
        }

        // Render the scene
        renderer.render(scene, camera);
    }, [updateDayNightCycle]);

    // Effect for initializing Three.js and Cannon.js
    useEffect(() => {
        initThreeAndCannon();
        animationFrameId.current = requestAnimationFrame(animate); // Start animation loop

        // Cleanup function
        return () => {
            console.log("App.tsx: Three.js resources disposed.");
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
                // Remove canvas from DOM
                if (mountRef.current && rendererRef.current.domElement) {
                    mountRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            // Nullify refs for proper cleanup
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            worldRef.current = null;
            playerBodyRef.current = null;
            gltfModelRef.current = null;
            modelBodiesRef.current = [];
        };
    }, [initThreeAndCannon, animate]);

    // Load model list from public/models/houses/index.json
    useEffect(() => {
        const fetchModelList = async () => {
            try {
                const response = await fetch("/models/houses/index.json");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: string[] = await response.json();
                setModelList(data);
                console.log("App.tsx: Model list loaded successfully:", data);
                if (data.length > 0) {
                    setSelectedModelIndex(0);
                    console.log("App.tsx: Initial model set to index 0.");
                } else {
                    console.log("App.tsx: No models available yet, skipping initial model load.");
                }
            } catch (error) {
                console.error("App.tsx: Failed to fetch model list:", error);
            }
        };
        fetchModelList();
    }, []);

    // Effect to trigger model load when selectedModelIndex or modelList changes
    const loadModel = useCallback(async (modelName: string, modelIndex: number) => {
        console.log("Attempting to load model:", modelName);

        const scene = sceneRef.current;
        const world = worldRef.current;
        if (!scene || !world) {
            console.log("loadModel: Scene or World not initialized yet. Skipping model load.");
            return;
        }

        console.log(`loadModel: Attempting to load model "${modelName}" at index ${modelIndex}`);

        // Remove previous Three.js model from scene
        if (gltfModelRef.current) {
            scene.remove(gltfModelRef.current);
            gltfModelRef.current.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (object.material instanceof THREE.Material) {
                        object.material.dispose();
                    } else if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    }
                }
            });
            console.log("loadModel: Removed previous Three.js model from scene and disposed resources.");
        }

        // Clear previous Cannon.js bodies associated with the model
        if (modelBodiesRef.current.length > 0) {
            modelBodiesRef.current.forEach(body => world.remove(body));
            modelBodiesRef.current = [];
            console.log("loadModel: Removed previous Cannon.js model bodies.");
        }

        const loader = new GLTFLoader();
        const modelPath = `/models/houses/${modelName}`;
        console.log(`loadModel: Loading GLTF from: "${modelPath}"`);

        try {
            const gltf = await loader.loadAsync(modelPath);
            const model = gltf.scene;

            // Apply scaling for a 1:1 mapping (1 Blender unit = 1 Three.js unit)
            model.scale.set(1, 1, 1);

            // Position model at scene origin
            model.position.set(0, 0, 0);

            scene.add(model);
            gltfModelRef.current = model;
            console.log("loadModel: GLTF model loaded and added to scene:", model);

            // Create Cannon.js bodies from meshes in the loaded GLTF model
            let bodiesCreatedCount = 0;
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    // Calculate bounding box for the mesh to create a Cannon.js Box shape
                    child.geometry.computeBoundingBox();
                    const size = new THREE.Vector3();
                    child.geometry.boundingBox?.getSize(size);

                    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));

                    const body = new CANNON.Body({
                        mass: 0, // Static environmental objects
                        shape: shape,
                        position: new CANNON.Vec3(
                            child.position.x,
                            child.position.y,
                            child.position.z
                        )
                    });

                    // Set position based on world coordinates
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    body.position.set(worldPos.x, worldPos.y, worldPos.z);

                    // Apply rotation
                    const worldQuat = new THREE.Quaternion();
                    child.getWorldQuaternion(worldQuat);
                    body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

                    world.addBody(body);
                    modelBodiesRef.current.push(body);
                    bodiesCreatedCount++;
                    console.log(`loadModel: Added Cannon.js body for mesh: "${child.name}" at world position [${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)}, ${body.position.z.toFixed(2)}]`);
                }
            });
            console.log(`loadModel: Finished processing GLTF for collisions. Total Cannon.js bodies created: ${bodiesCreatedCount}`);

        } catch (error) {
            console.error("loadModel: Error loading GLTF model:", error);
        }
    }, []);

    // Effect to trigger model load when selectedModelIndex or modelList changes
    useEffect(() => {
        if (modelList.length > 0 && selectedModelIndex >= 0 && selectedModelIndex < modelList.length) {
            console.log("App.tsx: Models list updated or selected model changed. Calling loadModel for index:", selectedModelIndex);
            loadModel(modelList[selectedModelIndex], selectedModelIndex);
        }
    }, [selectedModelIndex, modelList, loadModel]);

    // Event Listeners for window resize
    useEffect(() => {
        const handleResize = () => {
            const camera = cameraRef.current;
            const renderer = rendererRef.current;
            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setClearColor(0x444444); // dark gray background

                console.log("App.tsx: Window resized. Renderer updated.");
            }
        };

        window.addEventListener("resize", handleResize);
        console.log("App.tsx: Window resize listener added.");

        return () => {
            window.removeEventListener("resize", handleResize);
            console.log("App.tsx: Window resize listener removed.");
        };
    }, []);

    // Event Listeners for Pointer Lock (Mouse Look)
    useEffect(() => {
        const mountElement = mountRef.current;

        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === mountElement;
            setIsPointerLocked(locked);
            console.log("App.tsx: Pointer lock status changed:", locked);
        };

        const handlePointerLockError = () => {
            console.error("App.tsx: Pointer lock error.");
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (isPointerLocked && pitch.current && yaw.current) {
                const movementX = event.movementX || 0;
                const movementY = event.movementY || 0;

                yaw.current.rotation.y -= movementX * 0.002;
                pitch.current.rotation.x -= movementY * 0.002;

                // Clamp vertical look to prevent flipping
                pitch.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current.rotation.x));
            }
        };

        if (mountElement) {
            mountElement.addEventListener("click", () => {
                console.log("App.tsx: Requesting pointer lock on mountRef element.");
                mountElement.requestPointerLock();
            });
            document.addEventListener("pointerlockchange", handlePointerLockChange);
            document.addEventListener("pointerlockerror", handlePointerLockError);
            document.addEventListener("mousemove", handleMouseMove);
        }

        return () => {
            if (mountElement) {
                mountElement.removeEventListener("click", () => { /* no-op */ });
            }
            document.removeEventListener("pointerlockchange", handlePointerLockChange);
            document.removeEventListener("pointerlockerror", handlePointerLockError);
            document.removeEventListener("mousemove", handleMouseMove);
            console.log("App.tsx: Pointer lock listeners removed.");
        };
    }, [isPointerLocked]);

    // Event Listeners for Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            console.log(`App.tsx: KeyDown - Code: ${event.code}, Key: ${event.key}`);
            switch (event.code) {
                case "KeyW":
                    moveForward.current = true;
                    break;
                case "KeyS":
                    moveBackward.current = true;
                    break;
                case "KeyA":
                    moveLeft.current = true;
                    break;
                case "KeyD":
                    moveRight.current = true;
                    break;
                case "Digit1":
                    if (modelList.length > 0) {
                        setSelectedModelIndex(0);
                        console.log(`App.tsx: Key "1" pressed. Setting selected model to index 0.`);
                    }
                    break;
                case "Digit2":
                    if (modelList.length > 1) {
                        setSelectedModelIndex(1);
                        console.log(`App.tsx: Key "2" pressed. Setting selected model to index 1.`);
                    }
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            console.log(`App.tsx: KeyUp - Code: ${event.code}, Key: ${event.key}`);
            switch (event.code) {
                case "KeyW":
                    moveForward.current = false;
                    break;
                case "KeyS":
                    moveBackward.current = false;
                    break;
                case "KeyA":
                    moveLeft.current = false;
                    break;
                case "KeyD":
                    moveRight.current = false;
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [modelList]);

    return (
        <Box ref={mountRef} h="100vh" w="100vw" overflow="hidden" position="relative">
            {/* UI for model selection */}
            <VStack
                position="absolute"
                top="1rem"
                left="1rem"
                zIndex="tooltip"
                spacing={2}
                align="flex-start"
            >
                {modelList.map((modelName, index) => (
                    <Button
                        key={modelName}
                        onClick={() => setSelectedModelIndex(index)}
                        colorScheme={selectedModelIndex === index ? "brand" : "gray"}
                        variant={selectedModelIndex === index ? "solid" : "outline"}
                        size="sm"
                    >
                        {modelName.replace(".glb", "")}
                    </Button>
                ))}
            </VStack>

            {/* Mobile Controls */}
            {isControlsVisible && isPortrait && (
                <>
                    {/* Movement Joystick */}
                    <Box
                        position="absolute"
                        bottom="2rem"
                        left="2rem"
                        w="8rem"
                        h="8rem"
                        bg="whiteAlpha.200"
                        borderRadius="full"
                        zIndex="10"
                        onTouchMove={e => {
                            if (e.touches.length > 0) {
                                const t = e.touches[0];
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const centerX = r.left + r.width / 2;
                                const centerY = r.top + r.height / 2;

                                const deltaX = (t.clientX - centerX);
                                const deltaY = (t.clientY - centerY);

                                // Normalize deltas and set movement flags
                                moveForward.current = deltaY < -20;
                                moveBackward.current = deltaY > 20;
                                moveLeft.current = deltaX < -20;
                                moveRight.current = deltaX > 20;
                            }
                        }}
                        onTouchEnd={() => {
                            moveForward.current = moveBackward.current = moveLeft.current = moveRight.current = false;
                        }}
                        onTouchCancel={() => {
                            moveForward.current = moveBackward.current = moveLeft.current = moveRight.current = false;
                        }}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="white"
                        fontSize="sm"
                    >
                        Move
                    </Box>

                    {/* Look Joystick */}
                    <Box
                        position="absolute"
                        bottom="2rem"
                        right="2rem"
                        w="8rem"
                        h="8rem"
                        bg="whiteAlpha.200"
                        borderRadius="full"
                        zIndex="10"
                        onTouchMove={e => {
                            if (e.touches.length > 0) {
                                const t = e.touches[0];
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const centerX = r.left + r.width / 2;
                                const centerY = r.top + r.height / 2;

                                // Calculate movement relative to the center of the touch area
                                lookDelta.current.x = (t.clientX - centerX) * 0.1;
                                lookDelta.current.y = (t.clientY - centerY) * 0.1;
                            }
                        }}
                        onTouchEnd={() => { lookDelta.current.x = lookDelta.current.y = 0; }}
                        onTouchCancel={() => { lookDelta.current.x = lookDelta.current.y = 0; }}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="white"
                        fontSize="sm"
                    >
                        Look
                    </Box>
                </>
            )}
        </Box>
    );
}