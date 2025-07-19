// src/components/Navbar.tsx
'use client'

import React, { useState } from 'react';
import {
  Box, Flex, Heading, Button, Stack, useColorMode, IconButton, Menu, MenuButton, MenuList, MenuItem, Link as ChakraLink, Text, useTheme,
  Icon,
  Image,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { usePageTransition } from './PageTransitionProvider';
// import { FiLogOut } from 'react-icons/fi'; // Removed as no longer needed
// import { useAuth } from '@/context/AuthContext'; // Removed as no longer needed

interface NavbarProps {
  type: 'customer' | 'dashboard'; // Retained for future admin panel distinction, but auth logic removed
  appName?: string;
  siteLogoUrl?: string;
}

export function Navbar({ type, appName = 'Synapse Digital', siteLogoUrl }: NavbarProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const theme = useTheme();

  const router = useRouter();
  const { startTransition } = usePageTransition();
  // Removed useAuth hook and related state/functions
  // const { isAuthenticated, logout, isAdmin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Synapse Digital customer links
  const customerLinks = [
    { label: 'Home', href: '/' },
{/**    { label: 'Projects', href: '/projects' },
    { label: 'Services', href: '/services' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' }, */}
  ];

  // Simplified dashboard links for Synapse Digital (if admin panel is added later)
  // These links will always be visible if type is 'dashboard', regardless of auth state
  const dashboardLinks = [
    { label: 'Admin Dashboard', href: '/admin' },
    // Add more admin links as needed
  ];

  const currentLinks = type === 'customer' ? customerLinks : dashboardLinks;

  // Use theme colors directly
  const navBg = theme.colors.neutral.dark['bg-header'];
  const textColor = theme.colors.neutral.dark['text-primary'];
  const hoverBg = theme.colors.brand['700']; // Darker orange for hover
  const borderColor = theme.colors.neutral.dark['border-color'];

  // Default logo if not provided by Sanity
  const displayedIconUrl = siteLogoUrl || "/icons/icon-192x192.png"; // Placeholder or generic logo

  return (
    <Box
      bg={navBg}
      px={4}
      borderBottom="1px solid"
      borderColor={borderColor}
      position="fixed"
      top="0"
      width="100%"
      zIndex="sticky"
      opacity={1}
    >
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <NextLink href="/" passHref>
          <Flex alignItems="center" cursor="pointer">
            <Image
              src={displayedIconUrl}
              alt={`${appName} Logo`}
              boxSize="40px"
              borderRadius="full"
              objectFit="cover"
              mr={2}
            />
            <Heading as="h1" size="md" color={textColor}>
              {appName}
            </Heading>
          </Flex>
        </NextLink>

        {/* Desktop Navigation */}
        <Flex as="nav" display={{ base: 'none', md: 'flex' }} alignItems="center" ml={10}>
          <Stack direction={'row'} spacing={7}>
            {currentLinks.map((link) => (
              <NextLink key={link.href} href={link.href!} passHref>
                <ChakraLink
                  as={Button}
                  variant="ghost"
                  color={textColor}
                  _hover={{ bg: hoverBg, color: 'white' }} // Text becomes white on hover
                  onClick={(e) => {
                    e.preventDefault();
                    startTransition();
                    router.push(link.href!);
                  }}
                >
                  {link.label}
                </ChakraLink>
              </NextLink>
            ))}
            {/* Admin Panel link is now always shown if type is 'dashboard' */}
            {type === 'dashboard' && (
              <NextLink href="/admin" passHref>
                <ChakraLink
                  as={Button}
                  variant="ghost"
                  color={textColor}
                  _hover={{ bg: hoverBg, color: 'white' }}
                  onClick={(e) => {
                    e.preventDefault();
                    startTransition();
                    router.push('/admin');
                  }}
                >
                  Admin Panel
                </ChakraLink>
              </NextLink>
            )}

            {/* Removed conditional Login/Logout Button */}
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              color={textColor}
              _hover={{ bg: hoverBg }}
            />
          </Stack>
        </Flex>

        {/* Mobile Menu Button */}
        <Flex display={{ base: 'flex', md: 'none' }} alignItems="center">
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            color={textColor}
            _hover={{ bg: hoverBg }}
            mr={2}
          />
          <Menu isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
              variant="outline"
              colorScheme="brand" // Use brand color scheme
              borderColor={borderColor}
              color={textColor}
              onClick={toggleMenu}
            />
            <MenuList bg={navBg} borderColor={borderColor} p={2}>
              {currentLinks.map((link) => (
                <MenuItem
                  key={link.href}
                  _hover={{ bg: hoverBg, color: 'white' }}
                  color={textColor}
                  onClick={(e) => {
                    startTransition();
                    router.push(link.href!);
                    setIsOpen(false);
                  }}
                >
                  {link.label}
                </MenuItem>
              ))}
              {/* Admin Panel link is now always shown if type is 'dashboard' */}
              {type === 'dashboard' && (
                <MenuItem
                  _hover={{ bg: hoverBg, color: 'white' }}
                  color={textColor}
                  onClick={() => {
                    startTransition();
                    router.push('/admin');
                    setIsOpen(false);
                  }}
                >
                  Admin Panel
                </MenuItem>
              )}
              {/* Removed conditional Login/Logout Button for Mobile Menu */}
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  );
}
