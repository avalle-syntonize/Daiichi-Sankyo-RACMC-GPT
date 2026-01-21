import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from 'next/font/google';
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";
import { AuthProvider } from "@/providers/SessionProvider";
import { Toaster } from "sonner";
import Head from "next/head";

const roboto = Roboto({
    subsets: ['latin'],
    weight: ['100', '300', '400', '500', '700', '900'],
    variable: '--font-roboto',
});
const robotoCondensed = Roboto_Condensed({
    subsets: ['latin'],
    weight: ['100', '300', '400', '500', '700', '900'],
    variable: '--font-roboto-condensed',
});

export const metadata: Metadata = {
    title: "InformA",
    description: "InformA",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <Head>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <body
                className={`${roboto.variable} ${robotoCondensed.variable} antialiased`}
            >
            
                <AuthProvider>
                    <main>
                    <AppSidebar />
                        <div className="main-scroll">
                            {children}
                        </div>
                    </main>
                </AuthProvider>
                <Toaster expand />
            </body>
        </html>
    );
}
