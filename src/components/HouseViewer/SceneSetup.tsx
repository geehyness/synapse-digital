// src/components/HouseViewer/SceneSetup.tsx
"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";

export function useSceneSetup(mountRef: React.RefObject<HTMLDivElement>) {
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 2, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;

        return () => {
            if (mountRef.current && renderer) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [mountRef]);

    return { sceneRef, cameraRef, rendererRef };
}
