import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DOJOIA ACCESS - Control Escolar Inteligente con QR",
  description: "Plataforma inteligente de registro escolar y control de acceso con QR, WhatsApp y base de datos Supabase.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isSandbox = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#040508] text-[#f3f4f6] font-sans selection:bg-cyan-500 selection:text-black">
        {/* Environment Banner */}
        {isSandbox ? (
          <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/20 to-amber-600/20 border-b border-amber-500/20 py-1.5 px-4 text-center text-xs text-amber-300 backdrop-blur-md">
            ⚡ Modo Sandbox Activo: Los datos se guardan en el navegador. Configura las variables de Supabase en <code className="bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">.env.local</code> para conectar la base de datos real.
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-600/20 via-emerald-500/20 to-emerald-600/20 border-b border-emerald-500/20 py-1.5 px-4 text-center text-xs text-emerald-300 backdrop-blur-md">
            🛡️ Conexión Exitosa con Supabase Realtime Database.
          </div>
        )}

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#040508]/75 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform duration-300">
                  D
                </div>
                <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                  DOJOIA <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ACCESS</span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-400">
                <Link href="/scanner" className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-md hover:bg-white/5">
                  🎥 Escáner QR
                </Link>
                <Link href="/dashboard" className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-md hover:bg-white/5">
                  📊 Dashboard Admin
                </Link>
                <Link href="/dashboard/students" className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-md hover:bg-white/5">
                  👦 Alumnos y QR
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/scanner"
                className="relative group overflow-hidden rounded-lg p-[1px] focus:outline-none hidden sm:inline-block"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg group-hover:opacity-100 transition-opacity duration-300"></span>
                <div className="px-4 py-1.5 rounded-lg bg-[#0b0f1a] text-xs font-semibold text-cyan-400 group-hover:text-white transition-colors relative">
                  Iniciar Escáner
                </div>
              </Link>
              
              {/* Mobile menu trigger helper/placeholder */}
              <div className="md:hidden flex space-x-3 text-xs font-semibold text-gray-400">
                <Link href="/scanner" className="px-2.5 py-1.5 rounded bg-white/5 hover:text-cyan-400">Escáner</Link>
                <Link href="/dashboard" className="px-2.5 py-1.5 rounded bg-white/5 hover:text-cyan-400">Dashboard</Link>
                <Link href="/dashboard/students" className="px-2.5 py-1.5 rounded bg-white/5 hover:text-cyan-400">Alumnos</Link>
              </div>
            </div>
          </div>
        </header>

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
          <p>© {new Date().getFullYear()} DOJOIA ACCESS. Diseñado con estética premium e innovación para instituciones educativas.</p>
        </footer>
      </body>
    </html>
  );
}
