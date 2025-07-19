// app/layout.tsx
'use client' // This must be a client component to use usePathname

import { Inter } from 'next/font/google'
import './globals.css' // Keep for global non-Chakra CSS (like glitch effect)
import { Providers } from './providers' // Import the new provider
import { Navbar } from '@/components/Navbar' // Import your Navbar component
import { Footer } from '@/components/Footer'; // Import the Footer component
import { usePathname } from 'next/navigation' // Import usePathname
import { Box } from '@chakra-ui/react'; // Only Box is needed here for layout structure
import { client, urlForImage } from '@/lib/sanity'; // Corrected: Changed urlFor to urlForImage
import { groq } from 'next-sanity'; // Import groq for Sanity queries
import React, { useState, useEffect } from 'react'; // Import useState and useEffect

const inter = Inter({ subsets: ['latin'] })

// Define a simple interface for SiteSettings to get the logo
interface SiteSettings {
  title?: string;
  logo?: any; // Sanity image object
}

// Function to fetch site settings, specifically the logo
async function getSiteSettings(): Promise<SiteSettings | null> {
  const query = groq`
    *[_type == "siteSettings"][0]{
      title,
      logo
    }
  `;
  try {
    const settings = await client.fetch(query);
    return settings;
  } catch (error) {
    console.error("Failed to fetch site settings for Navbar:", error);
    return null;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  // Determine if the current page is part of the dashboard/admin section
  // Adjust paths as per Synapse Digital's admin structure
  const isDashboardPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  const navbarType = isDashboardPage ? 'dashboard' : 'customer';

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getSiteSettings();
      if (settings) {
        setSiteSettings(settings);
        if (settings.logo) {
          // Explicitly check if urlForImage returns a valid builder before calling .url()
          const imageUrlBuilder = urlForImage(settings.logo);
          if (imageUrlBuilder) {
            setSiteLogoUrl(imageUrlBuilder.url());
          } else {
            console.warn("urlForImage returned undefined for site logo. Check Sanity config or logo data.");
            setSiteLogoUrl(undefined); // Ensure it's explicitly undefined if builder is not ready
          }
        } else {
          setSiteLogoUrl(undefined); // No logo in settings, so ensure URL is undefined
        }
      }
    };
    fetchSettings();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <html lang="en">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" />{/* PWA Manifest Link */}<link rel="manifest" href="/manifest.json" />{/* Apple Touch Icon (optional, for iOS home screen icon) */}<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />{/* Theme color for address bar on mobile browsers */}<meta name="theme-color" content="#FF4F00" /></head>
      <body>
        <Providers>
          <Navbar
            type={navbarType}
            appName={siteSettings?.title || "Synapse Digital"} // Use fetched title or default
            siteLogoUrl={siteLogoUrl} // Pass the fetched logo URL to Navbar
          />
          {/* Add top padding to main content to account for fixed navbar height */}
          <Box pt="64px" flex="1" className={inter.className}>
            {children}
          </Box>

          {/* Global Footer Component */}
          <Footer appName={siteSettings?.title || "Synapse Digital"} /> {/* Use fetched title or default */}
        </Providers>
      </body>
    </html>
  )
}
