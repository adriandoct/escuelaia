import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import HeaderNav from "@/components/HeaderNav";
import LoginModal from "@/components/LoginModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CECYTE BC - Control Escolar e Institucional con QR",
  description: "Plataforma inteligente de registro escolar y control de acceso con QR y roles institucionales @cecytebc.edu.mx",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#040508] text-[#f3f4f6] font-sans selection:bg-cyan-500 selection:text-black">
        <AuthProvider>
          {/* Global Adaptive Header Navigation */}
          <HeaderNav />

          {/* Modal Login Component */}
          <LoginModal />

          {/* Cyber Grid Background effect */}
          <div className="fixed inset-0 cyber-grid pointer-events-none z-[-1] opacity-60"></div>
          <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
            {children}
          </main>

          {/* Global Footer */}
          <footer className="border-t border-white/5 py-6 bg-black/20 backdrop-blur-sm text-center text-xs text-gray-500">
            <p>© {new Date().getFullYear()} CECYTE BC. Sistema de Control Institucional y Accesos por Código QR.</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
