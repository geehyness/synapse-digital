'use client'; // This directive is crucial as the 3D scene uses client-side hooks and DOM manipulation

import React, { useEffect } from 'react';
import App from '../../components/App'; // Adjust the path if your App.js is in a different location
import { Box } from '@chakra-ui/react'; // Import Box from Chakra UI
import { usePageTransition } from '@/components/PageTransitionProvider'; // Import the page transition hook
import { usePathname } from 'next/navigation'; // To get the current path

const HouseViewerPage = () => {
  const { signalPageLoaded } = usePageTransition();
  const pathname = usePathname();

  useEffect(() => {
    // Signal that this page has loaded, so the page transition overlay can hide
    signalPageLoaded();
  }, [signalPageLoaded, pathname]);

  return (
    // The Box here is used to override the default padding from layout.tsx
    // and ensure the 3D scene takes up the full viewport height.
    <Box
      as="main"
      minH="100vh" // Ensure it takes full viewport height
      w="100vw"    // Ensure it takes full viewport width
      p={0}        // Remove any padding
      m={0}        // Remove any margin
      overflow="hidden" // Hide overflow to prevent scrollbars
      position="relative" // Needed for absolute positioning of children if any
    >
      <App />
    </Box>
  );
};

export default HouseViewerPage;
