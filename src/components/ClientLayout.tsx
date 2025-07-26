// src/components/ClientLayout.tsx
'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Box } from '@chakra-ui/react';
import React from 'react';

export default function ClientLayout({
    children,
    siteTitle,
    siteLogoUrl,
}: {
    children: React.ReactNode;
    siteTitle: string;
    siteLogoUrl?: string;
}) {
    const pathname = usePathname();
    const isDashboardPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
    const navbarType = isDashboardPage ? 'dashboard' : 'customer';

    return (
        <>
            <Navbar
                type={navbarType}
                appName={siteTitle}
                siteLogoUrl={siteLogoUrl}
            />
            <Box pt="64px" flex="1">
                {children}
            </Box>
            <Footer appName={siteTitle} />
        </>
    );
}