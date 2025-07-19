'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Text, VStack, Container, Image, SimpleGrid, Link as ChakraLink,
  Tag, TagLabel, ListItem, UnorderedList, OrderedList, Button, Flex,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Spinner, useDisclosure, AspectRatio, IconButton, HStack, Tooltip, useTheme
} from '@chakra-ui/react';
import { urlForImage } from '@/lib/sanity'; // Ensure this is correctly imported
import { PortableText, PortableTextReactComponents, PortableTextComponentProps } from '@portabletext/react'; // Import PortableTextComponentProps
import { FaExternalLinkAlt, FaPlay, FaInfoCircle, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { Project as SanityProject } from '@/types/sanity'; // Import SanityProject type

interface ProjectDetailClientProps {
  project: SanityProject & {
    mainImageUrl?: string;
    demoScreenshots?: Array<{
      _key: string;
      imageUrl?: string;
      explanation?: any; // Portable Text
    }>;
  };
}

export default function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const router = useRouter();
  const theme = useTheme();

  // State for the modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Handle previous/next image in modal
  const handleNextImage = () => {
    if (project.demoScreenshots && project.demoScreenshots.length > 0) {
      setSelectedImageIndex((prevIndex) =>
        (prevIndex + 1) % project.demoScreenshots!.length
      );
    }
  };

  const handlePrevImage = () => {
    if (project.demoScreenshots && project.demoScreenshots.length > 0) {
      setSelectedImageIndex((prevIndex) =>
        (prevIndex - 1 + project.demoScreenshots!.length) % project.demoScreenshots!.length
      );
    }
  };

  useEffect(() => {
    if (isOpen && project.demoScreenshots && project.demoScreenshots.length > 0) {
      setSelectedImage(project.demoScreenshots[selectedImageIndex]?.imageUrl);
    }
  }, [isOpen, selectedImageIndex, project.demoScreenshots]);

  if (!project) {
    return (
      <Flex justify="center" align="center" minH="80vh">
        <Spinner size="xl" color="brand.500" />
        <Text ml={4} fontSize="xl">Loading project details...</Text>
      </Flex>
    );
  }

  // Custom components for PortableText rendering
  const components: Partial<PortableTextReactComponents> = {
    block: {
      // Correctly type the props for block components
      normal: (props) => <Text fontSize="lg" mb={4}>{props.children}</Text>,
      h2: (props) => <Heading as="h2" size="lg" mt={6} mb={3}>{props.children}</Heading>,
      h3: (props) => <Heading as="h3" size="md" mt={5} mb={2}>{props.children}</Heading>,
    },
    list: {
      // Correctly type the props for list components
      bullet: (props) => <UnorderedList pl={5} mb={4}>{props.children}</UnorderedList>,
      number: (props) => <OrderedList pl={5} mb={4}>{props.children}</OrderedList>,
    },
    listItem: {
      // Correctly type the props for list item components
      bullet: (props) => <ListItem mb={1}>{props.children}</ListItem>,
      number: (props) => <ListItem mb={1}>{props.children}</ListItem>,
    },
    marks: {
      link: ({ children, value }) => {
        const { href } = value;
        return (
          <ChakraLink
            href={href}
            isExternal
            color="brand.400"
            _hover={{ textDecoration: 'underline' }}
          >
            {children}
          </ChakraLink>
        );
      },
      em: ({ children }) => <Text as="em" fontStyle="italic">{children}</Text>,
      strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
    },
    types: {
      image: ({ value }) => {
        const imageUrl = value.asset ? urlForImage(value.asset).width(800).url() : undefined;
        if (!imageUrl) return null;
        return (
          <Box my={6} borderRadius="md" overflow="hidden">
            <Image
              src={imageUrl}
              alt={value.alt || `Image for ${project.title}`}
              objectFit="contain"
              maxH="500px"
              mx="auto"
              display="block"
              fallbackSrc="https://via.placeholder.com/800x400?text=Image+Not+Available"
            />
            {value.caption && (
              <Text mt={2} fontSize="sm" color="gray.500" textAlign="center">
                {value.caption}
              </Text>
            )}
          </Box>
        );
      },
    },
  };

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        {/* Main Project Image */}
        {project.mainImageUrl && (
          <Box borderRadius="lg" overflow="hidden" boxShadow="xl">
            <Image
              src={project.mainImageUrl}
              alt={project.title || 'Project Image'}
              objectFit="cover"
              width="100%"
              height={{ base: '250px', md: '450px', lg: '550px' }}
              fallbackSrc="https://via.placeholder.com/1200x600?text=Project+Image"
            />
          </Box>
        )}

        {/* Title and Tagline */}
        <VStack align="flex-start" spacing={2}>
          <Heading as="h1" size="2xl" color="brand.400">
            {project.title}
          </Heading>
          {project.tagline && (
            <Text fontSize={{ base: "lg", md: "xl" }} color="gray.400" fontStyle="italic">
              {project.tagline}
            </Text>
          )}
          {project.projectDate && (
            <Text fontSize="md" color="gray.500">
              Completed: {new Date(project.projectDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </Text>
          )}
        </VStack>

        {/* Technologies Used */}
        {project.technologiesUsed && project.technologiesUsed.length > 0 && (
          <Box>
            <Heading as="h2" size="lg" mb={3}>Technologies Used</Heading>
            <HStack wrap="wrap" spacing={3}>
              {project.technologiesUsed.map((tech, index) => (
                <Tag
                  key={index}
                  size="lg"
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
        {project.description && (
          <Box w="100%">
            <Heading as="h2" size="xl" mt={8} mb={4}>Overview</Heading>
            <PortableText value={project.description} components={components} />
          </Box>
        )}

        {/* Demo Links */}
        {project.demoLinks && project.demoLinks.length > 0 && (
          <Box>
            <Heading as="h2" size="lg" mb={4}>Live Demos & Resources</Heading>
            <VStack align="flex-start" spacing={4}>
              {project.demoLinks.map((link) => (
                <Flex key={link._key} direction="column" align="flex-start" w="100%">
                  <ChakraLink href={link.url} isExternal _hover={{ textDecoration: 'none' }} w="100%">
                    <Button
                      leftIcon={link.url.includes('youtube.com') || link.url.includes('vimeo.com') ? <FaPlay /> : <FaExternalLinkAlt />}
                      colorScheme="blue"
                      variant="outline"
                      size="lg"
                      width="fit-content"
                      px={6}
                      py={3}
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
                  </ChakraLink>
                  {link.description && (
                    <Text fontSize="md" color="gray.500" mt={2} pl={2}>
                      {link.description}
                    </Text>
                  )}
                </Flex>
              ))}
            </VStack>
          </Box>
        )}

        {/* Demo Screenshots/Visual Presentations */}
        {project.demoScreenshots && project.demoScreenshots.length > 0 && (
          <Box>
            <Heading as="h2" size="lg" mb={4}>Visuals & Screenshots</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {project.demoScreenshots.map((screenshot, index) => (
                <Box
                  key={screenshot._key}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    onOpen();
                  }}
                  cursor="pointer"
                  borderRadius="lg"
                  overflow="hidden"
                  boxShadow="md"
                  _hover={{ boxShadow: 'xl', transform: 'translateY(-5px)' }}
                  transition="all 0.2s ease-in-out"
                >
                  <AspectRatio ratio={16 / 9}>
                    <Image
                      src={screenshot.imageUrl}
                      alt={`Screenshot ${index + 1}`}
                      objectFit="cover"
                      width="100%"
                      height="100%"
                      fallbackSrc="https://via.placeholder.com/600x338?text=Image+Not+Available"
                    />
                  </AspectRatio>
                  {screenshot.explanation && (
                    <Box p={3} bg="neutral.dark.bg-secondary" color="neutral.dark.text-primary">
                      <PortableText value={screenshot.explanation} components={components} />
                    </Box>
                  )}
                </Box>
              ))}
            </SimpleGrid>

            {/* Image Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
              <ModalOverlay />
              <ModalContent bg="neutral.dark.bg-primary" color="neutral.dark.text-primary" borderRadius="lg">
                <ModalHeader>{project.title} - Screenshot {selectedImageIndex + 1}</ModalHeader>
                <ModalCloseButton />
                <ModalBody p={0}>
                  {selectedImage && (
                    <Box position="relative">
                      <Image
                        src={selectedImage}
                        alt={`Full size screenshot ${selectedImageIndex + 1}`}
                        objectFit="contain"
                        maxH="80vh"
                        mx="auto"
                        display="block"
                        p={4}
                        fallbackSrc="https://via.placeholder.com/1200x800?text=Image+Not+Available"
                      />
                      {project.demoScreenshots?.[selectedImageIndex]?.explanation && (
                        <Box p={4} bg="neutral.dark.bg-secondary" color="neutral.dark.text-primary">
                          <PortableText value={project.demoScreenshots[selectedImageIndex].explanation} components={components} />
                        </Box>
                      )}
                      {project.demoScreenshots && project.demoScreenshots.length > 1 && (
                        <>
                          <IconButton
                            aria-label="Previous image"
                            icon={<FaArrowLeft />}
                            onClick={handlePrevImage}
                            position="absolute"
                            left={2}
                            top="50%"
                            transform="translateY(-50%)"
                            zIndex={1}
                            colorScheme="brand"
                            size="lg"
                            variant="solid"
                            isRound
                          />
                          <IconButton
                            aria-label="Next image"
                            icon={<FaArrowRight />}
                            onClick={handleNextImage}
                            position="absolute"
                            right={2}
                            top="50%"
                            transform="translateY(-50%)"
                            zIndex={1}
                            colorScheme="brand"
                            size="lg"
                            variant="solid"
                            isRound
                          />
                        </>
                      )}
                    </Box>
                  )}
                </ModalBody>
              </ModalContent>
            </Modal>
          </Box>
        )}
      </VStack>
    </Container>
  );
}