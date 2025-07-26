'use client'; // This line must be uncommented and at the top

import React, { useEffect } from 'react';
import App from '../../components/App';
import { Box } from '@chakra-ui/react';
import { usePageTransition } from '@/components/PageTransitionProvider';
import { usePathname } from 'next/navigation';

const HouseViewerPage = () => {
  const { signalPageLoaded } = usePageTransition();
  const pathname = usePathname();

  useEffect(() => {
    // Signal that this page has loaded, so the page transition overlay can hide
    signalPageLoaded();

    // Disable pull-down-to-refresh
    document.body.style.overscrollBehaviorY = 'contain';
    document.body.style.touchAction = 'none'; // Prevents default touch actions like pan-y for scroll

    // Clean up: Re-enable default behavior when component unmounts
    return () => {
      document.body.style.overscrollBehaviorY = 'auto';
      document.body.style.touchAction = 'auto';
    };
  }, [signalPageLoaded, pathname]);

  return (
    <Box
      as="main"
      minH="100vh"
      w="100vw"
      p={0}
      m={0}
      overflow="hidden"
      position="relative"
    >
      <App />
    </Box>
  );
};

export default HouseViewerPage;
