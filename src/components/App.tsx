// src/components/App.tsx
"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Box, VStack, Button, Text, useBreakpointValue } from "@chakra-ui/react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"; // Corrected import path

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

// Function to generate realistic hills with a flat center
function generateHills(width: number, depth: number, segments: number, amplitude: number, flatSize: number): number[][] {
    const heights: number[][] = [];
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const segmentWidth = width / segments;
    const segmentDepth = depth / segments;

    const flatHalfSize = flatSize / 2; // Half size of the flat area (e.g., 10 for a 20x20 flat area)
    const transitionZone = 20; // Meters over which to smoothly transition from flat to hills

    for (let i = 0; i <= segments; i++) {
        heights[i] = [];
        for (let j = 0; j <= segments; j++) {
            const x = (j * segmentWidth) - halfWidth; // World X coordinate
            const z = (i * segmentDepth) - halfDepth; // World Z coordinate

            let y = 0; // Default height for the flat area

            // Calculate base terrain height using multiple noise frequencies
            // This will produce values roughly between -amplitude and +amplitude
            let noiseHeight = amplitude * (
                Math.sin(x / 40) * Math.cos(z / 40) +
                0.5 * Math.sin(x / 20) * Math.cos(z / 20) +
                0.25 * Math.sin(x / 10) * Math.cos(z / 10)
            );

            // Add some random variation, centered around 0
            noiseHeight += 0.1 * amplitude * (Math.random() - 0.5);

            // Ensure noiseHeight is non-negative if we want hills to go up from flat.
            // If you want valleys below the flat plane, remove this line.
            noiseHeight = Math.max(0, noiseHeight); // Only positive heights for hills

            // Calculate distance to the edge of the flat square
            const dx = Math.max(0, Math.abs(x) - flatHalfSize);
            const dz = Math.max(0, Math.abs(z) - flatHalfSize);
            const distanceToFlatEdge = Math.sqrt(dx * dx + dz * dz);

            // Apply smooth transition from flat (y=0) to hilly terrain
            if (distanceToFlatEdge < transitionZone) {
                const t = distanceToFlatEdge / transitionZone; // Normalized transition factor (0 at flat edge, 1 at transitionZone away)
                const smoothT = t * t * (3 - 2 * t); // Smoothstep function for a smoother blend
                y = noiseHeight * smoothT;
            } else {
                y = noiseHeight;
            }
            heights[i][j] = y;
        }
    }
    return heights;
}

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

    // Animation frame ID for cleanup
    const animationFrameId = useRef<number | null>(null);

    const loadModel = useCallback(async (modelName: string, modelIndex: number, scene: THREE.Scene, world: CANNON.World) => {
        console.log("Attempting to load model:", modelName);

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

        // Camera
        const camera = new THREE.PerspectiveCamera(
            24,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        cameraRef.current = camera;
        // Camera position will be synced with player body, so set relative to player's head
        camera.position.set(0, 1.6, 0); // ~1.6 meters eye height

        yaw.current.add(pitch.current);
        pitch.current.add(camera);
        scene.add(yaw.current); // Add yaw object to scene, which contains pitch and camera

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current = renderer;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true; // Keep shadow map enabled for future use with other lights if needed
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // Recommended for HDR
        renderer.toneMappingExposure = 1.2; // Adjust exposure as needed
        mountRef.current.appendChild(renderer.domElement);

        // Load HDR environment map
        new RGBELoader()
            .setPath('/hdri/') // Assuming your HDR file is in public/hdri/
            .load('venice_sunset_1k.hdr', (texture) => { // Replace with your HDR file name (e.g., 'venice_sunset_1k.hdr')
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture; // Global environment lighting
                scene.background = texture; // Set background to HDR as well
                console.log("App.tsx: HDR environment map loaded and applied.");
            }, undefined, (error) => {
                console.error("App.tsx: Error loading HDR environment map:", error);
            });

        // Cannon.js World
        const world = new CANNON.World();
        worldRef.current = world;
        world.gravity.set(0, -9.82, 0);
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.defaultContactMaterial.friction = 0.5;
        world.defaultContactMaterial.restitution = 0.1;

        // --- Realistic Ground Terrain ---
        const planeSize = 30; // Extend the ground far (e.g., 2000m x 2000m)
        const segments = 128; // Reduced segments for performance (e.g., 128x128 grid)
        const amplitude = 0; // Max height of hills/mountains (e.g., 50m)
        const flatSize = 20; // 20m x 20m flat area in the center

        const heights2D = generateHills(planeSize, planeSize, segments, amplitude, flatSize);

        const groundGeometry = new THREE.BufferGeometry();
        const positions = [];
        const uvs = []; // For texture mapping

        const halfPlaneSize = planeSize / 2;
        const segmentWidth = planeSize / segments;
        const segmentDepth = planeSize / segments;

        // Create vertices for the grid
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = (j * segmentWidth) - halfPlaneSize;
                const z = (i * segmentDepth) - halfPlaneSize;
                const y = heights2D[i][j]; // Get height from generated data

                positions.push(x, y, z);
                uvs.push(j / segments, i / segments); // Simple UV mapping (adjust tiling in material)
            }
        }

        // Create indices for triangles (two triangles per quad)
        const indices = [];
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * (segments + 1) + j;
                const b = i * (segments + 1) + j + 1;
                const c = (i + 1) * (segments + 1) + j;
                const d = (i + 1) * (segments + 1) + j + 1;

                // First triangle
                indices.push(a, b, c);
                // Second triangle
                indices.push(b, d, c);
            }
        }

        groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        groundGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        groundGeometry.setIndex(indices);
        groundGeometry.computeVertexNormals(); // Crucial for correct lighting and shading

        // Load textures for realistic ground
        const textureLoader = new THREE.TextureLoader();
        let groundColorMap: THREE.Texture | null = null;
        let groundNormalMap: THREE.Texture | null = null;

        try {
            // IMPORTANT: You need to place your texture files in the public/textures/ground/ directory.
            // Example: /public/textures/ground/grass_color.jpg
            // Example: /public/textures/ground/grass_normal.jpg
            groundColorMap = textureLoader.load('/textures/ground/grass_color.jpg', () => console.log('Ground color texture loaded.'));
            groundColorMap.wrapS = groundColorMap.wrapT = THREE.RepeatWrapping;
            groundColorMap.repeat.set(planeSize / 10, planeSize / 10); // Adjust tiling for desired density

            groundNormalMap = textureLoader.load('/textures/ground/grass_normal.jpg', () => console.log('Ground normal texture loaded.'));
            groundNormalMap.wrapS = groundNormalMap.wrapT = THREE.RepeatWrapping;
            groundNormalMap.repeat.set(planeSize / 10, planeSize / 10); // Adjust tiling to match color map

        } catch (error) {
            console.warn("Could not load ground textures. Using fallback color.", error);
        }

        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d8c40, // Fallback color if textures fail to load
            map: groundColorMap, // Your diffuse/albedo map
            normalMap: groundNormalMap, // Your normal/bump map for surface detail
            roughness: 0.8, // Adjust for desired surface roughness
            metalness: 0.1, // Adjust for desired metallic properties (usually low for terrain)
        });

        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.receiveShadow = true; // Essential for the ground to act as a shadowcatcher
        scene.add(groundMesh);

        // Cannon.js Ground Body for the terrain using Heightfield
        // Flatten the 2D heights array into a 1D array for Cannon.js Heightfield
        const heights1D = heights2D.flat();

        // Find the minimum height in the generated terrain for correct Cannon.js positioning
        let minHeight = Infinity;
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                if (heights2D[i][j] < minHeight) {
                    minHeight = heights2D[i][j];
                }
            }
        }

        const groundShape = new CANNON.Heightfield(heights1D, { // Pass the flattened array here
            elementSize: segmentWidth, // Size of each element in the heightfield grid
            // The 'columns' property is not part of the IHightfield type definition in some Cannon.js versions.
            // Cannon.js often infers the grid's columns from the data.length and elementSize for square grids.
            // If you encounter physics issues with non-square heightfields, you might need to adjust your Cannon.js version
            // or find a way to explicitly set the columns based on your Cannon.js type definitions.
        });
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });

        // Position the Cannon.js heightfield correctly to align with Three.js mesh.
        // Cannon.js heightfield's origin is at its bottom-left corner (min X, min Z) of the heightmap data.
        // Three.js plane's origin is at its center.
        groundBody.position.set(-halfPlaneSize, minHeight, -halfPlaneSize);
        world.addBody(groundBody);

        // Player Body
        playerBodyRef.current = new CANNON.Body({ // Assign to the ref
            mass: 5,
            shape: new CANNON.Sphere(1.0), // Capsule shape is better for character, but sphere is simpler for now
            position: new CANNON.Vec3(0, 5, 10), // Initial spawn position, adjusted to be above the flat ground
        });
        playerBodyRef.current.linearDamping = 0.9;
        world.addBody(playerBodyRef.current);

        console.log("App.tsx: Three.js and Cannon.js initialized.");

    }, []);

    // Animation loop
    const animate = useCallback(() => {
        animationFrameId.current = requestAnimationFrame(animate);

        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const renderer = rendererRef.current;
        const world = worldRef.current;
        const playerBody = playerBodyRef.current;

        if (!scene || !camera || !renderer || !world || !playerBody) {
            return;
        }

        // Update physics
        const fixedTimeStep = 1 / 60;
        const maxSubSteps = 10;
        world.step(fixedTimeStep, performance.now() / 1000, maxSubSteps);

        // Sync player body with camera
        yaw.current.position.set(
            playerBody.position.x,
            playerBody.position.y - 1, // Subtract radius to get "feet" position
            playerBody.position.z
        );

        // Apply movement with realistic walking speed (1.4 m/s)
        const moveSpeed = 0.8; // Realistic walking speed in m/s
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
    }, []);


    // Effect for initializing Three.js and Cannon.js
    useEffect(() => {
        initThreeAndCannon();
        const currentMountRef = mountRef.current; // Capture current ref value for cleanup
        animationFrameId.current = requestAnimationFrame(animate); // Start animation loop

        // Cleanup function
        return () => {
            console.log("App.tsx: Three.js resources disposed.");
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
                // Use the captured ref value in cleanup
                if (currentMountRef && rendererRef.current.domElement) {
                    currentMountRef.removeChild(rendererRef.current.domElement);
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
    useEffect(() => {
        if (modelList.length > 0 && selectedModelIndex >= 0 && selectedModelIndex < modelList.length) {
            console.log("App.tsx: Models list updated or selected model changed. Calling loadModel for index:", selectedModelIndex);
            if (sceneRef.current && worldRef.current) {
                loadModel(modelList[selectedModelIndex], selectedModelIndex, sceneRef.current, worldRef.current);
            }
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
