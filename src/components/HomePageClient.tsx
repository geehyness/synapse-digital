'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Flex, Heading, Text, Container, SimpleGrid, Button,
  VStack, HStack, Icon, Divider, useTheme, Tag, TagLabel,
  useBreakpointValue, Avatar, Stack, IconButton, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, FormControl, FormLabel, Collapse,
  Switch,
  useDisclosure
} from '@chakra-ui/react';
import { FaChevronDown, FaRocket, FaLightbulb, FaChartLine, FaCode, FaMobileAlt, FaServer, FaQuoteLeft, FaStar, FaArrowRight, FaCog, FaTimes } from 'react-icons/fa';
import { FiGithub, FiLinkedin, FiTwitter, FiMenu, FiX } from 'react-icons/fi';

const DEFAULT_CONFIG = {
  starCount: 100,
  minSize: 0.5,
  maxSize: 20,
  minDepth: 0.1,
  maxDepth: 50.0,
  baseSpeed: 0,
  momentumDecay: 0.8,
  scrollSensitivity: 0.01,
  glowIntensity: 0.5,
  connectionChance: 0.02,
  maxConnectionDistance: 100,
  rotationSpeed: 0.001,
  trailOpacity: 0.5,
  blackHole: {
    isEnabled: true,
    mass: 100,
    gravity: 0.18,
    attractionRadius: 520,
    spin: 1,
    accretionDisk: true
  }
};

const MotionBox = motion(Box);

const HomePageClient = () => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen: controlsOpen, onToggle: toggleControls } = useDisclosure();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
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

      constructor(canvas: HTMLCanvasElement) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * (configRef.current.maxDepth - configRef.current.minDepth) + configRef.current.minDepth;
        this.size = Math.random() * (configRef.current.maxSize - configRef.current.minSize) + configRef.current.minSize;
        this.rotation = Math.random() * Math.PI * 2;
        this.type = Math.random() > 0.5 ? 'cross' : 'star';
        this.vx = 0;
        this.vy = 0;
      }

      update(canvas: HTMLCanvasElement, momentum: number) {
        const bhConfig = configRef.current.blackHole;

        if (bhConfig.isEnabled) {
          const bhX = canvas.width / 2;
          const bhY = canvas.height / 2;
          const dx = bhX - this.x;
          const dy = bhY - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < bhConfig.attractionRadius && distance > bhConfig.mass) {
            const dirX = dx / distance;
            const dirY = dy / distance;

            const gravityInfluence = 1 - (distance / bhConfig.attractionRadius);
            const gravityForce = gravityInfluence * bhConfig.gravity;
            this.vx += dirX * gravityForce;
            this.vy += dirY * gravityForce;

            const spinInfluence = gravityInfluence;
            const spinForce = gravityForce * bhConfig.spin * spinInfluence;
            this.vx += -dirY * spinForce;
            this.vy += dirX * spinForce;
          }
        }

        this.vy += (configRef.current.baseSpeed + momentum) * this.z;

        this.vx *= 0.985;
        this.vy *= 0.985;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += configRef.current.rotationSpeed;

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
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = this.size * configRef.current.glowIntensity * 3;

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
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let stars: Star[] = [];
    const initStars = () => {
      stars = [];
      for (let i = 0; i < configRef.current.starCount; i++) {
        stars.push(new Star(canvas));
      }
    };
    initStars();

    let momentum = 0;
    let lastScrollY = window.scrollY;
    let animationFrameId: number;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = (lastScrollY - currentScrollY) * configRef.current.scrollSensitivity;
      momentum += scrollDelta/5;
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    const animate = () => {
      offscreenCtx.fillStyle = `rgba(21, 21, 21, ${configRef.current.trailOpacity})`;
      offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

      momentum *= configRef.current.momentumDecay;

      const bhConfig = configRef.current.blackHole;
      if (bhConfig.isEnabled) {
        const bhX = canvas.width / 2;
        const bhY = canvas.height / 2;
        const bhRadius = bhConfig.mass;

        const glowGradient = offscreenCtx.createRadialGradient(
          bhX, bhY, bhRadius * 0.5,
          bhX, bhY, bhRadius * 3.5
        );
        glowGradient.addColorStop(0, 'rgba(10, 10, 15, 0.9)');
        glowGradient.addColorStop(0.3, 'rgba(20, 20, 30, 0.4)');
        glowGradient.addColorStop(1, 'rgba(30, 30, 40, 0)');
        
        offscreenCtx.fillStyle = glowGradient;
        offscreenCtx.fillRect(
          bhX - bhRadius * 4, 
          bhY - bhRadius * 4, 
          bhRadius * 8, 
          bhRadius * 8
        );

        if (bhConfig.accretionDisk) {
          const diskGradient = offscreenCtx.createRadialGradient(
            bhX, bhY, bhRadius * 1.2,
            bhX, bhY, bhRadius * 2.5
          );
          diskGradient.addColorStop(0, 'rgba(70, 70, 90, 0)');
          diskGradient.addColorStop(0.3, 'rgba(90, 90, 120, 0.3)');
          diskGradient.addColorStop(1, 'rgba(60, 60, 80, 0)');
          
          offscreenCtx.fillStyle = diskGradient;
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
          for (let y = gridY - 1; y <= gridY + 1; y++) {
            const cellStars = grid[`${x},${y}`] || [];
            cellStars.forEach(otherStar => {
              if (star === otherStar) return;
              const dx = star.x - otherStar.x;
              const dy = star.y - otherStar.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < configRef.current.maxConnectionDistance && Math.random() < configRef.current.connectionChance) {
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
  }, []);

  const scrollToContent = () => {
    if (contentSectionRef.current) {
      contentSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const glassCardStyle = {
    background: 'rgba(25, 25, 35, 0.45)',
    backdropFilter: 'blur(14px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.1)
    `,
    borderRadius: 'xl',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
    }
  };

  const isMobile = useBreakpointValue({ base: true, md: false });

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

  const services = [
    {
      id: 1,
      title: "Web Development",
      description: "Custom web applications built with modern technologies for optimal performance.",
      icon: FaCode,
      color: "blue.400"
    },
    {
      id: 2,
      title: "Mobile Apps",
      description: "Cross-platform mobile applications for iOS and Android.",
      icon: FaMobileAlt,
      color: "purple.400"
    },
    {
      id: 3,
      title: "Cloud Solutions",
      description: "Scalable cloud infrastructure and serverless architecture.",
      icon: FaServer,
      color: "teal.400"
    },
    {
      id: 4,
      title: "UI/UX Design",
      description: "Beautiful, intuitive interfaces designed for exceptional user experiences.",
      icon: FaLightbulb,
      color: "yellow.400"
    },
    {
      id: 5,
      title: "Data Analytics",
      description: "Transform your data into actionable insights and visualizations.",
      icon: FaChartLine,
      color: "green.400"
    },
    {
      id: 6,
      title: "Digital Transformation",
      description: "Modernize your business processes with cutting-edge technology.",
      icon: FaRocket,
      color: "red.400"
    }
  ];

  const projects = [
    {
      id: 1,
      title: "E-commerce Platform",
      description: "Scalable online shopping solution with AI recommendations",
      technologies: ["React", "Node.js", "MongoDB", "Stripe"],
    },
    {
      id: 2,
      title: "Health & Fitness App",
      description: "Mobile application for workout tracking and nutrition planning",
      technologies: ["React Native", "Firebase", "Redux", "Google Fit API"],
    },
    {
      id: 3,
      title: "Enterprise Dashboard",
      description: "Real-time analytics dashboard for business intelligence",
      technologies: ["Vue.js", "D3.js", "Express", "PostgreSQL"],
    }
  ];

  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "CEO, TechStart Inc.",
      content: "Synapse Digital transformed our outdated systems into a modern, efficient platform. Their team delivered beyond our expectations.",
      rating: 5
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "CTO, Finova Corp",
      content: "The mobile app they developed for us has increased customer engagement by 75%. Truly exceptional work.",
      rating: 5
    },
    {
      id: 3,
      name: "Emma Rodriguez",
      role: "Product Manager, HealthPlus",
      content: "Working with Synapse was a game-changer. Their expertise in cloud solutions saved us thousands in infrastructure costs.",
      rating: 4
    }
  ];

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

      <Flex
        as="nav"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={50}
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py={4}
        sx={glassCardStyle}
      >
        <Heading as="h1" size="lg" color="white">
          Synapse<span style={{ color: "#4F46E5" }}>Digital</span>
        </Heading>

        {isMobile ? (
          <IconButton
            icon={mobileMenuOpen ? <FiX /> : <FiMenu />}
            aria-label="Toggle menu"
            variant="ghost"
            color="white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        ) : (
          <HStack spacing={8}>
            <Button variant="ghost" color="white" _hover={{ color: "blue.300" }}>Home</Button>
            <Button variant="ghost" color="white" _hover={{ color: "blue.300" }}>Services</Button>
            <Button variant="ghost" color="white" _hover={{ color: "blue.300" }}>Work</Button>
            <Button variant="ghost" color="white" _hover={{ color: "blue.300" }}>About</Button>
            <Button variant="ghost" color="white" _hover={{ color: "blue.300" }}>Contact</Button>
          </HStack>
        )}

        <Button colorScheme="blue" size="sm" display={{ base: "none", md: "block" }}>
          Get Started
        </Button>
      </Flex>

      {mobileMenuOpen && (
        <Flex
          position="fixed"
          top="60px"
          left={0}
          right={0}
          zIndex={40}
          direction="column"
          bg="rgba(15, 23, 42, 0.95)"
          p={4}
          backdropFilter="blur(10px)"
        >
          <Button variant="ghost" color="white" justifyContent="flex-start" mb={2}>Home</Button>
          <Button variant="ghost" color="white" justifyContent="flex-start" mb={2}>Services</Button>
          <Button variant="ghost" color="white" justifyContent="flex-start" mb={2}>Work</Button>
          <Button variant="ghost" color="white" justifyContent="flex-start" mb={2}>About</Button>
          <Button variant="ghost" color="white" justifyContent="flex-start" mb={4}>Contact</Button>
          <Button colorScheme="blue">Get Started</Button>
        </Flex>
      )}

      <Box
        position="fixed"
        bottom={4}
        right={4}
        zIndex={60}
        borderRadius="lg"
        p={3}
        boxShadow="xl"
        sx={{
          ...glassCardStyle,
          background: 'rgba(20, 20, 30, 0.5)'
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
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    onChange={(val) => handleConfigChange('scrollSensitivity', val)}
                  >
                    <SliderTrack bg="rgba(255, 255, 255, 0.1)">
                      <SliderFilledTrack bg="orange.400" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text color="gray.400" fontSize="sm" textAlign="right">
                    {config.scrollSensitivity.toFixed(2)}
                  </Text>
                </FormControl>
              </VStack>
            </Box>

            <Box>
              <Text color="orange.400" fontWeight="bold" mb={2}>Visual Settings</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Glow Intensity</FormLabel>
                  <Slider
                    value={config.glowIntensity}
                    min={0.1}
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
        position="relative"
        height={{ base: "90vh", md: "100vh" }}
        width="100%"
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
              size={{ base: "4xl", md: "6xl" }}
              fontWeight="bold"
              letterSpacing="tighter"
              color="white"
              textShadow="0 0 20px rgba(79, 70, 229, 0.7)"
            >
              Synapse<span style={{ color: "#4F46E5" }}>Digital</span>
            </Heading>
          </MotionBox>

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
        </VStack>
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
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">200+</Text>
            <Text color="gray.300">Projects Completed</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">98%</Text>
            <Text color="gray.300">Client Satisfaction</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">15+</Text>
            <Text color="gray.300">Industry Awards</Text>
          </VStack>
          <VStack>
            <Text fontSize="5xl" fontWeight="bold" color="orange.400">50+</Text>
            <Text color="gray.300">Expert Team Members</Text>
          </VStack>
        </SimpleGrid>

        <Box mb={20}>
          <VStack spacing={2} mb={12} textAlign="center">
            <Text color="orange.400" fontWeight="bold">OUR SERVICES</Text>
            <Heading as="h2" size="xl" color="white">What We Excel At</Heading>
            <Text color="gray.400" maxW="2xl">
              Comprehensive software development services tailored to your business needs
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
              { step: "01", title: "Discover", desc: "We analyze your requirements and goals" },
              { step: "02", title: "Design", desc: "Crafting intuitive UX and technical architecture" },
              { step: "03", title: "Develop", desc: "Agile development with continuous feedback" },
              { step: "04", title: "Deploy", desc: "Seamless launch and ongoing support" }
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
                <Heading as="h3" size="md" color="white">
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

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            {projects.map((project) => (
              <MotionBox
                key={project.id}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
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
                    bg={`linear-gradient(120deg, ${project.id === 1 ? '#4F46E5, #7C3AED' : project.id === 2 ? '#0EA5E9, #8B5CF6' : '#10B981, #8B5CF6'})`}
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
                        {project.title.split(' ')[0]}
                      </Text>
                    </Flex>
                  </Box>
                  <Box p={6}>
                    <Heading as="h3" size="md" mb={2} color="white">
                      {project.title}
                    </Heading>
                    <Text color="gray.300" mb={4}>
                      {project.description}
                    </Text>
                    <HStack wrap="wrap" spacing={2} mb={4}>
                      {project.technologies.map((tech, idx) => (
                        <Tag key={idx} size="sm" variant="subtle" colorScheme="orange">
                          {tech}
                        </Tag>
                      ))}
                    </HStack>
                    <Button
                      variant="outline"
                      color="orange.400"
                      borderColor="orange.400"
                      _hover={{ bg: "orange.900" }}
                      size="sm"
                    >
                      View Case Study
                    </Button>
                  </Box>
                </Flex>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Box>

        <Box mb={20}>
          <VStack spacing={2} mb={12} textAlign="center">
            <Text color="orange.400" fontWeight="bold">TESTIMONIALS</Text>
            <Heading as="h2" size="xl" color="white">What Our Clients Say</Heading>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {testimonials.map((testimonial) => (
              <MotionBox
                key={testimonial.id}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Flex
                  direction="column"
                  height="100%"
                  p={8}
                  sx={glassCardStyle}
                >
                  <Icon as={FaQuoteLeft} boxSize={8} color="orange.400" mb={6} />
                  <Text color="gray.300" mb={8} flexGrow={1}>
                    {testimonial.content}
                  </Text>
                  <Flex align="center">
                    <Avatar name={testimonial.name} mr={4} />
                    <Box>
                      <Text fontWeight="bold" color="white">{testimonial.name}</Text>
                      <Text color="gray.400">{testimonial.role}</Text>
                      <HStack mt={1}>
                        {[...Array(5)].map((_, i) => (
                          <Icon
                            key={i}
                            as={FaStar}
                            color={i < testimonial.rating ? "yellow.400" : "gray.600"}
                            boxSize={4}
                          />
                        ))}
                      </HStack>
                    </Box>
                  </Flex>
                </Flex>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Box>

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
                Synapse<span style={{ color: "#4F46E5" }}>Digital</span>
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
                <Button variant="link" color="gray.400" justifyContent="flex-start">Web Development</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Mobile App Development</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">UI/UX Design</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Cloud Solutions</Button>
              </Stack>
            </Box>

            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>Company</Heading>
              <Stack spacing={2}>
                <Button variant="link" color="gray.400" justifyContent="flex-start">About Us</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Our Team</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Careers</Button>
                <Button variant="link" color="gray.400" justifyContent="flex-start">Contact</Button>
              </Stack>
            </Box>

            <Box>
              <Heading as="h3" size="md" color="white" mb={4}>Contact</Heading>
              <Stack spacing={2} color="gray.400">
                <Text>hello@sdnapse.digital</Text>
                <Text>+1 (555) 123-4567</Text>
                <Text>123 Innovation Blvd, Suite 500</Text>
                <Text>Tech City, TC 12345</Text>
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