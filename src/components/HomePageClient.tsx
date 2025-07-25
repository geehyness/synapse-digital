'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Flex, Heading, Text, Container, SimpleGrid, Button,
  VStack, HStack, Icon, Divider, Tag, TagLabel,
  useBreakpointValue, Avatar, Stack, IconButton, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, FormControl, FormLabel, Collapse,
  Switch, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, AspectRatio, Image
} from '@chakra-ui/react';
import { useTheme } from '@chakra-ui/react';
import { FaChevronDown, FaRocket, FaLightbulb, FaChartLine, FaCode, FaMobileAlt, FaServer, FaGlobeAfrica, FaConnectdevelop, FaTimes, FaCog, FaArrowRight, FaPlay, FaExternalLinkAlt } from 'react-icons/fa';
import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi';
import { PortableText, PortableTextReactComponents } from '@portabletext/react';

const DEFAULT_CONFIG = {
  starCount: 100, // Default star count
  minSize: 2,
  maxSize: 10,
  minDepth: 0.1,
  maxDepth: 50.0,
  baseSpeed: 0.000008, // Slightly reduced for slower overall movement
  momentumDecay: 0.8,
  scrollSensitivity: 0.001, // Default scroll sensitivity
  glowIntensity: 0.5,
  connectionChance: 0.3,
  maxConnectionDistance: 100,
  rotationSpeed: 0.001,
  trailOpacity: 0.5,
  blackHole: {
    isEnabled: true,
    mass: 100,
    gravity: 0.18,
    attractionRadius: 520,
    spin: 1,
    accretionDisk: true,
    escapeMomentumThreshold: 20, // This threshold is now less about "escape" and more about internal logic for "sucking up"
  }
};

const MotionBox = motion(Box);

const HomePageClient = () => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const { isOpen: controlsOpen, onToggle: toggleControls } = useDisclosure();
  const { isOpen: isProjectModalOpen, onOpen: onProjectModalOpen, onClose: onProjectModalClose } = useDisclosure();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const configRef = useRef(config);

  // Refs for black hole gradients to avoid re-creating them every frame
  const bhGlowGradientRef = useRef<CanvasGradient | null>(null);
  const bhDiskGradientRef = useRef<CanvasGradient | null>(null);

  // Function to re-initialize stars when starCount changes
  const initStarsRef = useRef<(() => void) | null>(null);

  // Function to create/update black hole gradients - Moved outside useEffect
  const updateBlackHoleGradients = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bhX = canvas.width / 2;
    const bhY = canvas.height / 2;
    const bhRadius = configRef.current.blackHole.mass;

    // Create glow gradient
    const glowGradient = ctx.createRadialGradient(
      bhX, bhY, bhRadius * 0.5,
      bhX, bhY, bhRadius * 3.5
    );
    glowGradient.addColorStop(0, 'rgba(10, 10, 15, 0.9)');
    glowGradient.addColorStop(0.3, 'rgba(20, 20, 30, 0.4)');
    glowGradient.addColorStop(1, 'rgba(30, 30, 40, 0)');
    bhGlowGradientRef.current = glowGradient;

    // Create accretion disk gradient if enabled
    if (configRef.current.blackHole.accretionDisk) {
      const diskGradient = ctx.createRadialGradient(
        bhX, bhY, bhRadius * 1.2,
        bhX, bhY, bhRadius * 2.5
      );
      diskGradient.addColorStop(0, 'rgba(70, 70, 90, 0)');
      diskGradient.addColorStop(0.3, 'rgba(90, 90, 120, 0.3)');
      diskGradient.addColorStop(1, 'rgba(60, 60, 80, 0)');
      bhDiskGradientRef.current = diskGradient;
    } else {
      bhDiskGradientRef.current = null;
    }
  }, [config.blackHole.mass, config.blackHole.attractionRadius, config.blackHole.accretionDisk]);


  useEffect(() => {
    configRef.current = config;
    // Re-initialize stars if starCount changes
    if (initStarsRef.current) {
      initStarsRef.current();
    }
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    class Star {
      x: number;
      y: number;
      z: number;
      size: number;
      rotation: number;
      type: 'cross' | 'star';
      vx: number;
      vy: number;
      spinFactor: number; // New property for individual spin variation

      constructor(canvas: HTMLCanvasElement) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * (configRef.current.maxDepth - configRef.current.minDepth) + configRef.current.minDepth;
        this.size = Math.random() * (configRef.current.maxSize - configRef.current.minSize) + configRef.current.minSize;
        this.rotation = Math.random() * Math.PI * 2;
        this.type = Math.random() > 0.5 ? 'cross' : 'star';
        this.vx = 0;
        this.vy = 0;
        this.spinFactor = 0.5 + Math.random() * 0.5; // Random factor between 0.5 and 1.0
      }

      update(canvas: HTMLCanvasElement, momentum: number) {
        const bhConfig = configRef.current.blackHole;

        if (bhConfig.isEnabled) {
          const bhX = canvas.width / 2;
          const bhY = canvas.height / 2;
          const dx = bhX - this.x;
          const dy = bhY - this.y;
          const distanceSq = dx * dx + dy * dy; // Optimized: Calculate squared distance
          const bhMassSq = bhConfig.mass * bhConfig.mass;
          const bhAttractionRadiusSq = bhConfig.attractionRadius * bhConfig.attractionRadius;

          // Logic for stars getting "sucked up" (reset) when very close
          if (distanceSq < bhMassSq) { // Use squared distance for comparison
            // Introduce a probability for the star to be "sucked up" and reset
            if (Math.random() < 0.2) { // 20% chance to be consumed/reset
              this.x = Math.random() * canvas.width;
              this.y = -this.size * 2 - Math.random() * canvas.height * 0.5; // Appear from further off-screen
              this.z = Math.random() * (configRef.current.maxDepth - configRef.current.minDepth) + configRef.current.minDepth;
              this.size = Math.random() * (configRef.current.maxSize - configRef.current.minSize) + configRef.current.minSize;
              this.rotation = Math.random() * Math.PI * 2;
              this.vx = 0; // Reset velocity
              this.vy = 0; // Reset velocity
            }
            // If not consumed, the star simply continues.
            // The main attraction logic below will still apply if distance < attractionRadius
            // This allows for smooth pass-through if not consumed.
          }

          // Apply gravity and spin if within attraction radius
          if (distanceSq < bhAttractionRadiusSq) { // Use squared distance for comparison
            const distance = Math.sqrt(distanceSq); // Calculate actual distance only if needed for division
            const dirX = dx / distance;
            const dirY = dy / distance;

            // Size-dependent gravity influence
            const sizeInfluenceFactor = this.size / configRef.current.maxSize;
            const gravityInfluence = (1 - (distance / bhConfig.attractionRadius)) * sizeInfluenceFactor;

            const gravityForce = gravityInfluence * bhConfig.gravity;
            this.vx += dirX * gravityForce;
            this.vy += dirY * gravityForce;

            // Apply individual spinFactor here
            const spinForce = gravityForce * bhConfig.spin * this.spinFactor;
            this.vx += -dirY * spinForce;
            this.vy += dirX * spinForce;
          }
        }

        this.vy += (configRef.current.baseSpeed + momentum) * this.z;

        this.vx *= 0.985; // Apply momentum decay
        this.vy *= 0.985; // Apply momentum decay

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += configRef.current.rotationSpeed;

        // Boundary conditions: wrap stars around the canvas if they go off-screen
        const buffer = this.size * 2;
        if (this.y > canvas.height + buffer) {
          this.y = -buffer;
          this.x = Math.random() * canvas.width;
          this.vx = 0; this.vy = 0;
        } else if (this.y < -buffer) {
          this.y = canvas.height + buffer;
          this.x = Math.random() * canvas.width;
          this.vx = 0; this.vy = 0;
        }
        if (this.x > canvas.width + buffer) {
          this.x = -buffer;
          this.y = Math.random() * canvas.height;
          this.vx = 0; this.vy = 0;
        } else if (this.x < -buffer) {
          this.x = canvas.width + buffer;
          this.y = Math.random() * canvas.height;
          this.vx = 0; this.vy = 0;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Only apply shadow blur if glowIntensity is noticeable
        if (configRef.current.glowIntensity > 0.01) {
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = this.size * configRef.current.glowIntensity * 2;
        } else {
          ctx.shadowBlur = 0;
        }

        if (this.type === 'cross') {
          this.drawCross(ctx);
        } else {
          this.drawStar(ctx);
        }

        ctx.restore();
      }

      drawCross(ctx: CanvasRenderingContext2D) {
        const armLength = this.size;
        const armWidth = this.size * 0.25;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-armWidth / 2, -armLength / 2, armWidth, armLength);
        ctx.fillRect(-armLength / 2, -armWidth / 2, armLength, armWidth);
      }

      drawStar(ctx: CanvasRenderingContext2D) {
        const points = 6;
        const outerRadius = this.size;
        const innerRadius = this.size * 0.4;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / points) * i;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      }
    }

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      updateBlackHoleGradients(); // Recreate gradients on resize
    };
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);

    let stars: Star[] = [];
    const initStars = () => {
      stars = [];
      for (let i = 0; i < configRef.current.starCount; i++) {
        stars.push(new Star(canvas));
      }
    };
    initStarsRef.current = initStars;
    initStars();

    let momentum = 0;
    let lastScrollY = window.scrollY;
    let animationFrameId: number;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = (lastScrollY - currentScrollY) * configRef.current.scrollSensitivity;
      momentum += scrollDelta;
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // Initial call to create gradients
    updateBlackHoleGradients();

    const animate = () => {
      offscreenCtx.fillStyle = `rgba(21, 21, 21, ${configRef.current.trailOpacity})`;
      offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

      momentum *= configRef.current.momentumDecay;

      const bhConfig = configRef.current.blackHole;
      if (bhConfig.isEnabled) {
        const bhX = canvas.width / 2;
        const bhY = canvas.height / 2;
        const bhRadius = bhConfig.mass;

        // Use pre-calculated glow gradient
        if (bhGlowGradientRef.current) {
          offscreenCtx.fillStyle = bhGlowGradientRef.current;
          offscreenCtx.fillRect(
            bhX - bhRadius * 4,
            bhY - bhRadius * 4,
            bhRadius * 8,
            bhRadius * 8
          );
        }

        // Use pre-calculated accretion disk gradient
        if (bhConfig.accretionDisk && bhDiskGradientRef.current) {
          offscreenCtx.fillStyle = bhDiskGradientRef.current;
          offscreenCtx.beginPath();
          offscreenCtx.arc(bhX, bhY, bhRadius * 2.5, 0, Math.PI * 2);
          offscreenCtx.fill();
        }

        offscreenCtx.fillStyle = 'black';
        offscreenCtx.beginPath();
        offscreenCtx.arc(bhX, bhY, bhRadius, 0, Math.PI * 2);
        offscreenCtx.fill();

        offscreenCtx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
        offscreenCtx.lineWidth = 1;
        offscreenCtx.beginPath();
        offscreenCtx.arc(bhX, bhY, bhRadius * 1.1, 0, Math.PI * 2);
        offscreenCtx.stroke();
      }

      const gridSize = 200;
      const grid: Record<string, Star[]> = {};
      stars.forEach(star => {
        const gridX = Math.floor(star.x / gridSize);
        const gridY = Math.floor(star.y / gridSize);
        const key = `${gridX},${gridY}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(star);
      });

      stars.forEach(star => {
        const gridX = Math.floor(star.x / gridSize);
        const gridY = Math.floor(star.y / gridSize);
        for (let x = gridX - 1; x <= gridX + 1; x++) {
          for (let y = gridY - 1; y <= gridY + 1; y++) { // Corrected loop condition: y <= gridY + 1
            const cellStars = grid[`${x},${y}`] || [];
            cellStars.forEach(otherStar => {
              if (star === otherStar) return;
              const dx = star.x - otherStar.x;
              const dy = star.y - otherStar.y;
              const distanceSq = dx * dx + dy * dy; // Optimized: Use squared distance
              if (distanceSq < configRef.current.maxConnectionDistance * configRef.current.maxConnectionDistance && Math.random() < configRef.current.connectionChance) { // Optimized: Use squared distance for comparison
                const distance = Math.sqrt(distanceSq); // Calculate actual distance only if needed
                const alpha = 0.15 * (1 - distance / configRef.current.maxConnectionDistance);
                offscreenCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                offscreenCtx.beginPath();
                offscreenCtx.moveTo(star.x, star.y);
                offscreenCtx.lineTo(otherStar.x, otherStar.y);
                offscreenCtx.stroke();
              }
            });
          }
        }
      });

      stars.forEach(star => {
        star.update(canvas, momentum);
        star.draw(offscreenCtx);
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreenCanvas, 0, 0);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [updateBlackHoleGradients]); // Added updateBlackHoleGradients to dependencies

  const scrollToContent = () => {
    if (contentSectionRef.current) {
      contentSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const glassCardStyle = {
    background: 'rgba(21, 21, 21, 0.45)', // Based on neutral.dark['bg-card'] with transparency (RGB for #151515 is 21,21,21)
    backdropFilter: 'blur(14px) saturate(180%)',
    border: '1px solid rgba(42, 42, 58, 0.5)', // Based on neutral.dark['border-color'] with transparency (RGB for #2A2A3A is 42,42,58)
    boxShadow: `
      ${theme.shadows['dark-md']},
      inset 0 1px 1px rgba(224, 224, 224, 0.1) // Based on neutral.dark['text-primary'] with transparency (RGB for #E0E0E0 is 224,224,224)
    `,
    borderRadius: 'xl',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: `
        ${theme.shadows['dark-lg']},
        inset 0 1px 1px rgba(224, 224, 224, 0.15) // Slightly more intense on hover
      `,
    }
  };

  const handleConfigChange = (key: string, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleBlackHoleConfigChange = (key: string, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      blackHole: {
        ...prev.blackHole,
        [key]: value
      }
    }));
  };

  // --- GENERATED CONTENT FOR THE HOUSE VIEWER PROJECT ---
  const houseViewerProject = {
    id: 'house-viewer',
    title: 'Interactive 3D House Viewer',
    tagline: 'Explore architectural designs with real-time physics and customizable models.',
    mainImageUrl: 'https://placehold.co/1200x600/3182CE/FFFFFF?text=3D+House+Viewer', // Placeholder image
    projectDate: '2023-10-26T00:00:00.000Z', // Example date
    technologies: ['React', 'Three.js', 'Cannon.js', 'GLTFLoader', 'Chakra UI', 'TypeScript', 'Next.js'],
    description: [
      {
        _key: 'desc1',
        _type: 'block',
        children: [
          { _key: 'child1', _type: 'span', marks: [], text: 'This project demonstrates an advanced interactive 3D house viewer, built to provide a realistic and immersive architectural exploration experience. Users can navigate through various house models in a simulated environment.' }
        ],
        markDefs: []
      },
      {
        _key: 'desc2',
        _type: 'block',
        children: [
          { _key: 'child1', _type: 'span', marks: ['strong'], text: 'Key Features:' }
        ],
        markDefs: []
      },
      {
        _key: 'desc3',
        _type: 'list',
        listItem: 'bullet',
        children: [
          { _key: 'li1', _type: 'block', children: [{ _key: 'li1span', _type: 'span', marks: [], text: 'Dynamic 3D Model Loading: Seamlessly load and switch between different GLTF house models.' }] },
          { _key: 'li2', _type: 'block', children: [{ _key: 'li2span', _type: 'span', marks: [], text: 'Physics-based Navigation: Experience realistic movement and collisions within the virtual space, powered by Cannon.js.' }] },
          { _key: 'li3', _type: 'block', children: [{ _key: 'li3span', _type: 'span', marks: [], text: 'Accurate Collision Detection: Utilizes Trimesh colliders that precisely follow the shape of the house meshes, ensuring realistic interactions.' }] },
          { _key: 'li4', _type: 'block', children: [{ _key: 'li4span', _type: 'span', marks: [], text: 'Immersive Environment: Features HDR lighting for a visually rich and detailed scene.' }] },
          { _key: 'li5', _type: 'block', children: [{ _key: 'li5span', _type: 'span', marks: [], text: 'Cross-Platform Controls: Intuitive keyboard/mouse controls for desktop and responsive touch controls for mobile devices.' }] },
          { _key: 'li6', _type: 'block', children: [{ _key: 'li6span', _type: 'span', marks: [], text: 'Collision Visualization Toggle: A debug feature to visualize the exact collision boundaries of all objects in the scene.' }] },
        ]
      },
      {
        _key: 'desc4',
        _type: 'block',
        children: [
          { _key: 'child1', _type: 'span', marks: [], text: 'This viewer is ideal for architects, real estate professionals, and anyone interested in interactive 3D visualization, offering a powerful tool for virtual walkthroughs and design presentations.' }
        ],
        markDefs: []
      }
    ],
    demoLinks: [
      {
        _key: 'demo1',
        label: 'Launch 3D Viewer',
        url: '/house-viewer', // Link to your App.tsx page
        description: 'Experience the interactive house viewer live in your browser.'
      }
    ],
    demoScreenshots: [
      {
        _key: 'ss1',
        imageUrl: 'https://placehold.co/800x450/3182CE/FFFFFF?text=Viewer+Screenshot+1',
        explanation: [{ _key: 'exp1', _type: 'block', children: [{ _key: 'exp1span', _type: 'span', marks: [], text: 'A view inside one of the loaded house models, showcasing interior details.' }] }]
      },
      {
        _key: 'ss2',
        imageUrl: 'https://placehold.co/800x450/3182CE/FFFFFF?text=Viewer+Screenshot+2',
        explanation: [{ _key: 'exp2', _type: 'block', children: [{ _key: 'exp2span', _type: 'span', marks: [], text: 'The collision visualization enabled, highlighting the precise Trimesh colliders.' }] }]
      },
      {
        _key: 'ss3',
        imageUrl: 'https://placehold.co/800x450/3182CE/FFFFFF?text=Viewer+Screenshot+3',
        explanation: [{ _key: 'exp3', _type: 'block', children: [{ _key: 'exp3span', _type: 'span', marks: [], text: 'Mobile touch controls overlaid on the 3D scene.' }] }]
      }
    ]
  };
  // --- END GENERATED CONTENT ---

  // Custom components for PortableText rendering within the modal
  const portableTextComponents: PortableTextReactComponents = {
    block: {
      normal: ({ children }) => <Text fontSize="md" mb={2} color="gray.300">{children}</Text>,
      h1: ({ children }) => <Heading as="h1" size="xl" mt={6} mb={3} color="brand.400">{children}</Heading>,
      h2: ({ children }) => <Heading as="h2" size="lg" mt={5} mb={2} color="white">{children}</Heading>,
      h3: ({ children }) => <Heading as="h3" size="md" mt={4} mb={2} color="white">{children}</Heading>,
      h4: ({ children }) => <Heading as="h4" size="sm" mt={3} mb={1} color="white">{children}</Heading>,
      blockquote: ({ children }) => (
        <Box as="blockquote" borderLeft="4px solid" borderColor="brand.500" pl={4} my={4} fontStyle="italic">
          {children}
        </Box>
      ),
    },
    list: {
      bullet: ({ children }) => <VStack as="ul" align="flex-start" pl={5} mb={4} spacing={1}>{children}</VStack>,
      number: ({ children }) => <VStack as="ol" align="flex-start" pl={5} mb={4} spacing={1}>{children}</VStack>,
    },
    listItem: {
      bullet: ({ children }) => (
        <HStack as="li" align="flex-start">
          <Text color="brand.500">•</Text>
          {children}
        </HStack>
      ),
      number: ({ children }) => (
        <HStack as="li" align="flex-start">
          <Text color="brand.500">1.</Text>
          {children}
        </HStack>
      ),
    },
    marks: {
      link: ({ children, value }) => {
        const { href } = value;
        return (
          <Text
            as="a"
            href={href}
            isExternal
            color="brand.400"
            _hover={{ textDecoration: 'underline' }}
          >
            {children}
          </Text>
        );
      },
      em: ({ children }) => <Text as="em" fontStyle="italic">{children}</Text>,
      strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
    },
    types: {
      image: ({ value }) => (
        <Box my={4} borderRadius="md" overflow="hidden">
          <Image
            src={value.imageUrl || `https://placehold.co/800x400?text=Image+Not+Available`}
            alt={value.alt || 'Project Image'}
            objectFit="contain"
            maxH="400px"
            mx="auto"
            display="block"
          />
          {value.caption && (
            <Text mt={2} fontSize="sm" color="gray.500" textAlign="center">
              {value.caption}
            </Text>
          )}
        </Box>
      ),
    },
  };

  const services = [
    {
      id: 1,
      title: "Progressive Web Apps (PWAs)",
      description: "Deliver app-like experiences directly through the web, combining the best of both worlds for your users.",
      icon: FaConnectdevelop,
      color: "blue.400"
    },
    {
      id: 2,
      title: "Web Development",
      description: "Crafting responsive, high-performance websites and web applications tailored to your business goals.",
      icon: FaCode,
      color: "purple.400"
    },
    {
      id: 3,
      title: "Digital Solutions for Southern Africa",
      description: "Developing localized software solutions that address the unique needs and opportunities in the Southern African market.",
      icon: FaGlobeAfrica,
      color: "teal.400"
    },
    {
      id: 4,
      title: "Custom Software Development",
      description: "Building bespoke software from the ground up to streamline your operations and give you a competitive edge.",
      icon: FaLightbulb,
      color: "yellow.400"
    },
    {
      id: 5,
      title: "UI/UX Design & Consulting",
      description: "Creating intuitive and engaging user interfaces that ensure a seamless and enjoyable experience for your audience.",
      icon: FaMobileAlt,
      color: "green.400"
    },
    {
      id: 6,
      title: "Cloud Integration & Optimization",
      description: "Leveraging cloud technologies to enhance scalability, efficiency, and security for your digital infrastructure.",
      icon: FaServer,
      color: "red.400"
    }
  ];

  const testimonials = []; // As per previous request, testimonials are removed.

  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      overflowX="hidden"
      bg="#151515"
      minH="100vh"
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Box
        position="fixed"
        bottom={4}
        right={4}
        zIndex={60}
        borderRadius="lg"
        p={3}
        boxShadow="xl"
        sx={{
          background: 'rgba(21, 21, 21, 0.45)', // Based on neutral.dark['bg-card'] with transparency (RGB for #151515 is 21,21,21)
          backdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid rgba(42, 42, 58, 0.5)', // Based on neutral.dark['border-color'] with transparency (RGB for #2A2A3A is 42,42,58)
          boxShadow: `
            ${theme.shadows['dark-md']},
            inset 0 1px 1px rgba(224, 224, 224, 0.1) // Based on neutral.dark['text-primary'] with transparency (RGB for #E0E0E0 is 224,224,224)
          `,
          borderRadius: 'xl',
          _hover: {
            transform: 'translateY(-5px)',
            boxShadow: `
              ${theme.shadows['dark-lg']},
              inset 0 1px 1px rgba(224, 224, 224, 0.15) // Slightly more intense on hover
            `,
          }
        }}
      >
        <Flex justify="space-between" align="center" mb={controlsOpen ? 3 : 0}>
          <HStack spacing={2}>
            <Icon as={FaCog} color="orange.400" />
            <Text color="white" fontWeight="bold">Starfield Controls</Text>
          </HStack>
          <IconButton
            aria-label={controlsOpen ? "Close controls" : "Open controls"}
            icon={controlsOpen ? <FaTimes /> : <FaCog />}
            size="sm"
            colorScheme="orange"
            onClick={toggleControls}
          />
        </Flex>

        <Collapse in={controlsOpen} animateOpacity>
          <VStack spacing={4} align="stretch" maxH="70vh" overflowY="auto" pr={2} width="300px" mt={2}>
            <Box>
              <Text color="orange.400" fontWeight="bold" mb={2}>Black Hole Settings</Text>
              <VStack spacing={3}>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="bh-enabled" color="gray.300" fontSize="sm" mb="0">
                    Enable Black Hole
                  </FormLabel>
                  <Switch
                    id="bh-enabled"
                    colorScheme="orange"
                    isChecked={config.blackHole.isEnabled}
                    onChange={(e) => handleBlackHoleConfigChange('isEnabled', e.target.checked)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Mass (Size)</FormLabel>
                  <Slider value={config.blackHole.mass} min={5} max={100} step={1} onChange={(val) => handleBlackHoleConfigChange('mass', val)}>
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)"><SliderFilledTrack bg="orange.400" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">{config.blackHole.mass}px</Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Gravity</FormLabel>
                  <Slider value={config.blackHole.gravity} min={0} max={0.2} step={0.001} onChange={(val) => handleBlackHoleConfigChange('gravity', val)}>
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)"><SliderFilledTrack bg="orange.400" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">{config.blackHole.gravity.toFixed(3)}</Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Attraction Radius</FormLabel>
                  <Slider value={config.blackHole.attractionRadius} min={100} max={1000} step={10} onChange={(val) => handleBlackHoleConfigChange('attractionRadius', val)}>
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)"><SliderFilledTrack bg="orange.400" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">{config.blackHole.attractionRadius}px</Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Orbital Spin</FormLabel>
                  <Slider value={config.blackHole.spin} min={0} max={1} step={0.01} onChange={(val) => handleBlackHoleConfigChange('spin', val)}>
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)"><SliderFilledTrack bg="orange.400" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">{config.blackHole.spin.toFixed(2)}</Text>
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="bh-accretion" color="gray.300" fontSize="sm" mb="0">
                    Accretion Disk
                  </FormLabel>
                  <Switch
                    id="bh-accretion"
                    colorScheme="orange"
                    isChecked={config.blackHole.accretionDisk}
                    onChange={(e) => handleBlackHoleConfigChange('accretionDisk', e.target.checked)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Escape Momentum Threshold</FormLabel>
                  <Slider value={config.blackHole.escapeMomentumThreshold} min={0} max={100} step={1} onChange={(val) => handleBlackHoleConfigChange('escapeMomentumThreshold', val)}>
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)"><SliderFilledTrack bg="orange.400" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">{config.blackHole.escapeMomentumThreshold}px/frame</Text>
                </FormControl>

              </VStack>
            </Box>

            <Divider />

            <Box>
              <Text color="orange.400" fontWeight="bold" mb={2}>Connection Settings</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Connection Chance</FormLabel>
                  <Slider
                    value={config.connectionChance}
                    min={0}
                    max={0.5}
                    step={0.01}
                    onChange={(val) => handleConfigChange('connectionChance', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {Math.round(config.connectionChance * 100)}%
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Max Connection Distance</FormLabel>
                  <Slider
                    value={config.maxConnectionDistance}
                    min={50}
                    max={500}
                    step={1}
                    onChange={(val) => handleConfigChange('maxConnectionDistance', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.maxConnectionDistance}px
                  </Text>
                </FormControl>
              </VStack>
            </Box>

            <Box>
              <Text color="orange.400" fontWeight="bold" mb={2}>Motion Settings</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Base Speed</FormLabel>
                  <Slider
                    value={config.baseSpeed}
                    min={0}
                    max={0.2}
                    step={0.001}
                    onChange={(val) => handleConfigChange('baseSpeed', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.baseSpeed.toFixed(3)}
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Momentum Decay</FormLabel>
                  <Slider
                    value={config.momentumDecay}
                    min={0.8}
                    max={0.99}
                    step={0.01}
                    onChange={(val) => handleConfigChange('momentumDecay', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.momentumDecay.toFixed(2)}
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Scroll Sensitivity</FormLabel>
                  <Slider
                    value={config.scrollSensitivity}
                    min={0.001}
                    max={0.1}
                    step={0.001}
                    onChange={(val) => handleConfigChange('scrollSensitivity', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.scrollSensitivity.toFixed(3)}
                  </Text>
                </FormControl>
              </VStack>
            </Box>

            <Box>
              <Text color="orange.400" fontWeight="bold" mb={2}>Visual Settings</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Star Count</FormLabel>
                  <Slider
                    value={config.starCount}
                    min={10}
                    max={500}
                    step={10}
                    onChange={(val) => handleConfigChange('starCount', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.starCount} stars
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Glow Intensity</FormLabel>
                  <Slider
                    value={config.glowIntensity}
                    min={0.0}
                    max={1}
                    step={0.05}
                    onChange={(val) => handleConfigChange('glowIntensity', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.glowIntensity.toFixed(2)}
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Trail Opacity</FormLabel>
                  <Slider
                    value={config.trailOpacity}
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    onChange={(val) => handleConfigChange('trailOpacity', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.trailOpacity.toFixed(2)}
                  </Text>
                </FormControl>
              </VStack>
            </Box>

            <Button
              colorScheme="orange"
              size="sm"
              onClick={() => setConfig(DEFAULT_CONFIG)}
            >
              Reset to Defaults
            </Button>
          </VStack>
        </Collapse>
      </Box>

      <Box
        position="fixed" // Changed to fixed
        top={0} // Fixed to top
        left={0} // Fixed to left
        height="100vh" // Full viewport height
        width="100%" // Full viewport width
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        zIndex={10}
        px={4}
      >
        <VStack spacing={16} textAlign="center" zIndex={20}>
          <MotionBox
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <Heading
              as="h1"
              size={{ base: "4xl", md: "6xl" }} // Reverted font size
              fontWeight="bold" // Reverted font weight
              letterSpacing="tighter"
              color="white"
              textShadow="0 0 20px rgba(255, 79, 0, 0.7)" // Reverted text shadow
            >
              Synapse<span style={{ color: theme.colors.brand[500] }}>Digital</span>
            </Heading>
          </MotionBox>
        </VStack>
      </Box>

      {/* This Box reserves the 100vh space at the top */}
      <Box height="100vh" width="100%" zIndex={15} display="flex" flexDirection="column" alignItems="center" justifyContent="flex-end" pb={16}> {/* Added flex properties to center chevron horizontally and position it at the bottom */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <Button
            variant="ghost"
            color="white"
            _hover={{ color: "orange.400", transform: "translateY(5px)" }}
            onClick={scrollToContent}
            aria-label="Scroll to content"
          >
            <Icon as={FaChevronDown} boxSize={8} />
          </Button>
        </MotionBox>
      </Box>

      <Container maxW="container.xl" py={20} ref={contentSectionRef} zIndex={10}>
        <SimpleGrid
          columns={{ base: 2, md: 4 }}
          spacing={6}
          mb={20}
          sx={glassCardStyle}
          p={6}
        >
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">Future-Focused</Text>
            <Text color="gray.300">Innovative Solutions</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">Client-Centric</Text>
            <Text color="gray.300">Dedicated Partnerships</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">Local Impact</Text>
            <Text color="gray.300">Southern Africa Focused</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">Growing Team</Text>
            <Text color="gray.300">Passionate Experts</Text>
          </VStack>
        </SimpleGrid>

        <Box mb={20}>
          <VStack spacing={2} mb={12} textAlign="center">
            <Text color="orange.400" fontWeight="bold">OUR SERVICES</Text>
            <Heading as="h2" size="xl" color="white">What We Excel At</Heading>
            <Text color="gray.400" maxW="2xl">
              Comprehensive software development services tailored to your business needs, with a focus on regional relevance.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            {services.map((service) => (
              <MotionBox
                key={service.id}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Flex
                  direction="column"
                  p={8}
                  height="100%"
                  sx={glassCardStyle}
                >
                  <Flex
                    align="center"
                    justify="center"
                    w={16}
                    h={16}
                    borderRadius="full"
                    bg={`${service.color}20`}
                    mb={6}
                  >
                    <Icon as={service.icon} boxSize={8} color={service.color} />
                  </Flex>
                  <Heading as="h3" size="md" mb={3} color="white">
                    {service.title}
                  </Heading>
                  <Text color="gray.300" mb={4} flexGrow={1}>
                    {service.description}
                  </Text>
                  <Button
                    variant="link"
                    color={service.color}
                    rightIcon={<FaArrowRight />}
                    alignSelf="flex-start"
                  >
                    Learn more
                  </Button>
                </Flex>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Box>

        <Box mb={20} sx={glassCardStyle} p={8} borderRadius="2xl">
          <VStack spacing={2} mb={12} textAlign="center">
            <Text color="orange.400" fontWeight="bold">OUR PROCESS</Text>
            <Heading as="h2" size="xl" color="white">How We Work</Heading>
            <Text color="gray.400" maxW="2xl">
              A structured approach to ensure your project's success
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8}>
            {[
              { step: "01", title: "Discover", desc: "Understanding your vision and defining project scope." },
              { step: "02", title: "Design", desc: "Crafting intuitive user experiences and robust architectures." },
              { step: "03", title: "Develop", desc: "Building with agile methodologies and continuous collaboration." },
              { step: "04", title: "Deploy & Support", desc: "Seamless launch, ongoing maintenance, and optimization." }
            ].map((item, index) => (
              <VStack key={index} spacing={4} align="center" textAlign="center">
                <Flex
                  align="center"
                  justify="center"
                  w={16}
                  h={16}
                  borderRadius="full"
                  bg="orange.900"
                  color="orange.400"
                  fontSize="xl"
                  fontWeight="bold"
                >
                  {item.step}
                </Flex>
                <Heading as="h3" size="md" mb={3} color="white">
                  {item.title}
                </Heading>
                <Text color="gray.300">
                  {item.desc}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Box>

        <Box mb={20}>
          <VStack spacing={2} mb={12} textAlign="center">
            <Text color="orange.400" fontWeight="bold">OUR WORK</Text>
            <Heading as="h2" size="xl" color="white">Featured Projects</Heading>
            <Text color="gray.400" maxW="2xl">
              Explore our latest success stories across various industries
            </Text>
          </VStack>

          {/* Single project card for House Viewer */}
          <SimpleGrid columns={{ base: 1, md: 1, lg: 1 }} spacing={8}>
            <MotionBox
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3 }}
              onClick={onProjectModalOpen} // Open modal on click
              cursor="pointer"
            >
              <Flex
                direction="column"
                height="100%"
                overflow="hidden"
                borderRadius="2xl"
                sx={glassCardStyle}
              >
                <Box
                  height="200px"
                  bg={`linear-gradient(120deg, #3182CE, #63B3ED)`} // Blue gradient for the house viewer
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg={`radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)`}
                  />
                  <Flex
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    align="center"
                    justify="center"
                  >
                    <Text fontSize="4xl" fontWeight="bold" color="white" opacity={0.7}>
                      {houseViewerProject.title.split(' ')[0]}
                    </Text>
                  </Flex>
                </Box>
                <Box p={6}>
                  <Heading as="h3" size="md" mb={2} color="white">
                    {houseViewerProject.title}
                  </Heading>
                  <Text color="gray.300" mb={4}>
                    {houseViewerProject.tagline}
                  </Text>
                  <HStack wrap="wrap" spacing={2} mb={4}>
                    {houseViewerProject.technologies.map((tech, idx) => (
                      <Tag key={idx} size="sm" variant="subtle" colorScheme="blue">
                        {tech}
                      </Tag>
                    ))}
                  </HStack>
                  <Button
                    variant="outline"
                    color="blue.400"
                    borderColor="blue.400"
                    _hover={{ bg: "blue.900" }}
                    size="sm"
                    onClick={onProjectModalOpen}
                  >
                    View Project Details
                  </Button>
                </Box>
              </Flex>
            </MotionBox>
          </SimpleGrid>
        </Box>

        {/* Project Modal */}
        <Modal isOpen={isProjectModalOpen} onClose={onProjectModalClose} size="4xl" isCentered scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent bg="neutral.dark.bg-primary" color="neutral.dark.text-primary" borderRadius="lg">
            <ModalHeader>{houseViewerProject.title}</ModalHeader>
            <ModalCloseButton />
            <ModalBody p={6}>
              <VStack spacing={6} align="stretch">
                {/* Main Project Image */}
                {houseViewerProject.mainImageUrl && (
                  <Box borderRadius="lg" overflow="hidden" boxShadow="xl">
                    <Image
                      src={houseViewerProject.mainImageUrl}
                      alt={houseViewerProject.title || 'Project Image'}
                      objectFit="cover"
                      width="100%"
                      height={{ base: '200px', md: '350px', lg: '450px' }}
                      fallbackSrc="https://placehold.co/1200x600?text=Project+Image"
                    />
                  </Box>
                )}

                {/* Title and Tagline */}
                <VStack align="flex-start" spacing={2}>
                  <Heading as="h1" size="xl" color="brand.400">
                    {houseViewerProject.title}
                  </Heading>
                  {houseViewerProject.tagline && (
                    <Text fontSize={{ base: "md", md: "lg" }} color="gray.400" fontStyle="italic">
                      {houseViewerProject.tagline}
                    </Text>
                  )}
                  {houseViewerProject.projectDate && (
                    <Text fontSize="sm" color="gray.500">
                      Completed: {new Date(houseViewerProject.projectDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </Text>
                  )}
                </VStack>

                {/* Technologies Used */}
                {houseViewerProject.technologies && houseViewerProject.technologies.length > 0 && (
                  <Box>
                    <Heading as="h2" size="md" mb={3} color="white">Technologies Used</Heading>
                    <HStack wrap="wrap" spacing={3}>
                      {houseViewerProject.technologies.map((tech, index) => (
                        <Tag
                          key={index}
                          size="md"
                          colorScheme="teal"
                          variant="solid"
                          bg={theme.colors.brand[600]}
                          color="white"
                        >
                          <TagLabel>{tech}</TagLabel>
                        </Tag>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Description/Overview */}
                {houseViewerProject.description && (
                  <Box w="100%">
                    <Heading as="h2" size="lg" mt={4} mb={2} color="white">Overview</Heading>
                    <PortableText value={houseViewerProject.description} components={portableTextComponents} />
                  </Box>
                )}

                {/* Demo Links */}
                {houseViewerProject.demoLinks && houseViewerProject.demoLinks.length > 0 && (
                  <Box>
                    <Heading as="h2" size="md" mb={3} color="white">Live Demos & Resources</Heading>
                    <VStack align="flex-start" spacing={3}>
                      {houseViewerProject.demoLinks.map((link) => (
                        <Flex key={link._key} direction="column" align="flex-start" w="100%">
                          <Button
                            as="a"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            leftIcon={link.url.includes('youtube.com') || link.url.includes('vimeo.com') ? <FaPlay /> : <FaExternalLinkAlt />}
                            colorScheme="blue"
                            variant="outline"
                            size="md"
                            width="fit-content"
                            px={4}
                            py={2}
                            borderRadius="full"
                            _hover={{
                              bg: theme.colors.brand[700],
                              color: 'white',
                              transform: 'scale(1.02)',
                              boxShadow: 'md',
                            }}
                            transition="all 0.2s ease-in-out"
                          >
                            {link.label}
                          </Button>
                          {link.description && (
                            <Text fontSize="sm" color="gray.500" mt={1} pl={2}>
                              {link.description}
                            </Text>
                          )}
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Demo Screenshots/Visual Presentations */}
                {houseViewerProject.demoScreenshots && houseViewerProject.demoScreenshots.length > 0 && (
                  <Box>
                    <Heading as="h2" size="md" mb={3} color="white">Visuals & Screenshots</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {houseViewerProject.demoScreenshots.map((screenshot, index) => (
                        <Box
                          key={screenshot._key}
                          borderRadius="lg"
                          overflow="hidden"
                          boxShadow="md"
                          transition="all 0.2s ease-in-out"
                        >
                          <AspectRatio ratio={16 / 9}>
                            <Image
                              src={screenshot.imageUrl}
                              alt={`Screenshot ${index + 1}`}
                              objectFit="cover"
                              width="100%"
                              height="100%"
                              fallbackSrc="https://placehold.co/600x338?text=Image+Not+Available"
                            />
                          </AspectRatio>
                          {screenshot.explanation && (
                            <Box p={3} bg="neutral.dark.bg-secondary" color="neutral.dark.text-primary">
                              <PortableText value={screenshot.explanation} components={portableTextComponents} />
                            </Box>
                          )}
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align="center"
          p={10}
          borderRadius="2xl"
          bgGradient="linear(to-r, orange.700, red.800)"
          mb={20}
        >
          <Box maxW={{ base: "100%", md: "60%" }} mb={{ base: 8, md: 0 }}>
            <Heading as="h2" size="xl" color="white" mb={4}>
              Ready to Transform Your Business?
            </Heading>
            <Text color="orange.100" fontSize="lg">
              Let's discuss how our software solutions can drive your success.
            </Text>
          </Box>
          <Button
            colorScheme="whiteAlpha"
            bg="white"
            color="orange.800"
            size="lg"
            _hover={{ bg: "orange.50" }}
            rightIcon={<FaArrowRight />}
          >
            Schedule a Free Consultation
          </Button>
        </Flex>
      </Container>

      <Box w="full" bg="gray.800" py={12} zIndex={10}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8} mb={12}>
            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>
                Synapse<span style={{ color: theme.colors.brand[500] }}>Digital</span>
              </Heading>
              <Text color="gray.400" mb={4}>
                Building innovative software solutions for tomorrow's challenges.
              </Text>
              <HStack spacing={4}>
                <IconButton
                  aria-label="GitHub"
                  icon={<FiGithub />}
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "white" }}
                />
                <IconButton
                  aria-label="LinkedIn"
                  icon={<FiLinkedin />}
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "white" }}
                />
                <IconButton
                  aria-label="Twitter"
                  icon={<FiTwitter />}
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "white" }}
                />
              </HStack>
            </Box>

            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>Services</Heading>
              <Stack spacing={2}>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Progressive Web Apps</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Web Development</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Digital Solutions (SA)</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Custom Software</Button>
              </Stack>
            </Box>

            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>Company</Heading>
              <Stack spacing={2}>
                <Button variant="link" color="gray.400" justifyContent="flex-start">About Us</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Our Approach</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Careers</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Contact</Button>
              </Stack>
            </Box>

            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>Contact</Heading>
              <Stack spacing={2} color="gray.400">
                <Text>synapsedigital.sz@gmail.com</Text>
                <Text>godlinessdongorere@gmail.com</Text>
                <Text>+268 79342380</Text>
                <Text>Eswatini (Southern Africa)</Text>
              </Stack>
            </Box>
          </SimpleGrid>

          <Divider borderColor="gray.700" mb={6} />

          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align="center">
            <Text color="gray.500">
              © {new Date().getFullYear()} Synapse Digital. All rights reserved.
            </Text>
            <HStack spacing={6} mt={{ base: 4, md: 0 }}>
              <Button variant="link" color="gray.500">Privacy Policy</Button>
              <Button variant="link" color="gray.500">Terms of Service</Button>
              <Button variant="link" color="gray.500">Cookies</Button>
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePageClient;
