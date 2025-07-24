// src/components/HouseViewer/three/useInitThree.ts
"use client";
import { useEffect, useState } from "react";
import * as THREE from "three";

export function useInitThree(containerRef: React.RefObject<HTMLDivElement>) {
    const [scene] = useState(new THREE.Scene());
    const [camera] = useState(
        () => new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    );
    const [renderer] = useState(() => new THREE.WebGLRenderer({ antialias: true }));

    useEffect(() => {
        if (!containerRef.current) return;

        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);

        camera.position.set(0, 1.7, 5); // 1.7m height
        scene.background = new THREE.Color(0xaec6cf);

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
        };
    }, [containerRef, renderer, camera, scene]);

    return { scene, camera, renderer };
}
