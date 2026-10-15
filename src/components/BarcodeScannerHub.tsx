"use strict";

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Camera, 
  CameraOff,
  CheckCircle, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Usb, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  UserCheck, 
  Check, 
  X, 
  Smartphone,
  ShieldCheck,
  Zap,
  Activity,
  UserPlus,
  ShieldAlert,
  Award,
  BookOpen,
  Crown,
  Shield,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, Alumno, Asistencia } from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { useBarcodeScanner, playAudioFeedback } from '@/lib/useBarcodeScanner';
import { useAuth } from '@/lib/auth';

interface BarcodeScannerHubProps {
  onScanCompleted?: () => void;
  className?: string;
}

export type AuthRoleType = 'docente' | 'administrador' | 'encargado_orden';

export default function BarcodeScannerHub({ onScanCompleted, className = '' }: BarcodeScannerHubProps) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'auto' | 'entrada' | 'salida'>('auto');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sampleStudents, setSampleStudents] = useState<Alumno[]>([]);
  
  // Camera Scanner States (Webcam / Optical USB scanner)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5ScannerRef = useRef<any>(null);
  const videoElementId = 'dashboard-camera-scanner-viewport';

  // Input ref for physical ZKTeco reader autofocus
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Active Scan Card Result Modal / HUD
  const [activeScan, setActiveScan] = useState<{
    success: boolean;
    student?: Alumno;
    asistencia?: Asistencia;
    msg: string;
    duplicate?: boolean;
    source?: 'hardware_scanner' | 'manual_input' | 'webhid' | 'camera_scanner';
  } | null>(null);

  // =========================================================================
  // UNREGISTERED CODE AUTHORIZATION MODAL STATE (ZKTECO / BARCODE)
  // =========================================================================
  const [unregisteredModal, setUnregisteredModal] = useState<{
    isOpen: boolean;
    code: string;
    source: 'hardware_scanner' | 'manual_input' | 'webhid' | 'camera_scanner';
  } | null>(null);

  const [selectedRole, setSelectedRole] = useState<AuthRoleType>('encargado_orden');
  const [registrationMode, setRegistrationMode] = useState<'full' | 'quick'>('full');
  const [regNombre, setRegNombre] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regGrado, setRegGrado] = useState('1°');
  const [regGrupo, setRegGrupo] = useState('A');
  const [regTutor, setRegTutor] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassType, setRegPassType] = useState<'entrada' | 'salida'>('entrada');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Load sample students for quick testing buttons
  useEffect(() => {
    async function loadSamples() {
      try {
        const list = await db.getAlumnos();
        setSampleStudents(list.slice(0, 4));
      } catch (e) {
        console.warn('Error loading student samples:', e);
      }
    }
    loadSamples();

    return () => {
      stopCameraScanner();
    };
  }, []);

  // Process any barcode detected by ZKTeco physical scanner, camera or manual input
  const handleBarcodeDetected = async (code: string, source: 'hardware_scanner' | 'manual_input' | 'webhid' | 'camera_scanner') => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const overrideVal = activeTab === 'auto' ? undefined : activeTab;
      const deviceName = source === 'hardware_scanner' 
        ? 'Lector ZKTeco / USB Barcode' 
        : source === 'camera_scanner'
          ? 'Cámara Escáner Dashboard'
          : source === 'webhid' 
            ? 'Lector USB WebHID' 
            : 'Entrada Manual Dashboard';

      const operatorName = user?.name || 'Terminal de Acceso Autónomo (Sin sesión)';

      // 1. Try to register attendance in database
      const { asistencia, alumno, duplicateWarning } = await db.registrarAsistencia(
        code,
        overrideVal,
        deviceName,
        'Acceso Principal CECYTE',
        operatorName
      );

      // 2. Dispatch WhatsApp notification
      await sendWhatsAppNotification(alumno, asistencia);

      // 3. Audio & Confetti Feedback
      if (duplicateWarning) {
        if (soundEnabled) playAudioFeedback('duplicate');
        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Aviso! El alumno ya fue registrado hace menos de 30 segundos. Acceso guardado como '${asistencia.tipo.toUpperCase()}'.`,
          duplicate: true,
          source
        });
      } else {
        if (soundEnabled) playAudioFeedback('success');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}

        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Acceso Exitoso! ${asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente.`,
          duplicate: false,
          source
        });
      }

      // Notify parent dashboard to refresh stats and tables
      if (onScanCompleted) {
        onScanCompleted();
      }

      // Resume camera after short pause if it was scanning
      if (isCameraActive && html5ScannerRef.current) {
        setTimeout(async () => {
          try {
            await html5ScannerRef.current.resume();
          } catch {}
        }, 3000);
      }

      // Auto dismiss modal after 4.5 seconds
      setTimeout(() => {
        setActiveScan(null);
      }, 4500);

    } catch (err: any) {
      // CODE NOT FOUND IN DATABASE!
      // Requirement: "SINO LO ENCUENTRA QUE REGISTRE EN EL DASHBOARD PREGUNTANDO EL ACCESO COMO DOCENTE, ADMINISTRADOR O ENCARGADO DE ORDEN"
      if (soundEnabled) playAudioFeedback('prompt');

      // Pause camera while modal is open
      if (isCameraActive && html5ScannerRef.current) {
        try {
          await html5ScannerRef.current.pause(true);
        } catch {}
      }

      // Pre-fill default pass type
      setRegPassType(activeTab === 'salida' ? 'salida' : 'entrada');
      setRegNombre('');
      setRegApellidos('');
      setRegTutor('');
      setRegTelefono('');

      // Auto-select role based on logged user if available, default to encargado_orden
      if (user?.role === 'docente') {
        setSelectedRole('docente');
      } else if (user?.role === 'administrador') {
        setSelectedRole('administrador');
      } else {
        setSelectedRole('encargado_orden');
      }

      // Open Authorization & Registration Modal
      setUnregisteredModal({
        isOpen: true,
        code,
        source
      });

    } finally {
      setIsProcessing(false);
    }
  };

  // Submit and register access for unregistered scanned code
  const handleConfirmAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unregisteredModal) return;

    setIsSubmittingAuth(true);

    try {
      const code = unregisteredModal.code;
      const roleLabels: Record<AuthRoleType, string> = {
        docente: 'Docente',
        administrador: 'Administrador',
        encargado_orden: 'Encargado de Orden'
      };

      const roleLabel = roleLabels[selectedRole];
      const authorizedBy = `Autorizado por ${roleLabel}${user?.name ? ` (${user.name})` : ' en Turno'}`;

      let alumnoCreado: Alumno;

      if (registrationMode === 'full') {
        const parts = regApellidos.trim().split(' ');
        const pat = parts[0] || 'Desconocido';
        const mat = parts.slice(1).join(' ') || '';

        alumnoCreado = await db.addAlumno({
          matricula: code,
          qr_code: code,
          nombre: regNombre.trim() || `Alumno (${code})`,
          apellido_paterno: pat,
          apellido_materno: mat,
          grado: regGrado,
          grupo: regGrupo,
          tutor: regTutor.trim() || 'Tutor Responsable',
          telefono: regTelefono.trim() || '+525500000000',
          foto_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(code)}`
        });
      } else {
        alumnoCreado = await db.addAlumno({
          matricula: code,
          qr_code: code,
          nombre: regNombre.trim() || `Pase Rápido (${code})`,
          apellido_paterno: `[${roleLabel}]`,
          apellido_materno: '',
          grado: 'General',
          grupo: 'A',
          tutor: 'Dirección Escolar',
          telefono: '',
          foto_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(code)}`
        });
      }

      // Register attendance in database
      const { asistencia, alumno } = await db.registrarAsistencia(
        alumnoCreado.matricula,
        regPassType,
        'Lector ZKTeco Código de Barras',
        'Acceso Principal CECYTE',
        authorizedBy
      );

      // WhatsApp notify if valid telephone was entered
      if (alumno.telefono && alumno.telefono !== '+525500000000' && alumno.telefono.length >= 10) {
        await sendWhatsAppNotification(alumno, asistencia);
      }

      if (soundEnabled) playAudioFeedback('success');
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      // Close Authorization Modal
      setUnregisteredModal(null);

      // Resume camera if it was open
      if (isCameraActive && html5ScannerRef.current) {
        setTimeout(async () => {
          try {
            await html5ScannerRef.current.resume();
          } catch {}
        }, 1500);
      }

      // Refresh Dashboard stats and tables
      if (onScanCompleted) {
        onScanCompleted();
      }

      // Show instant HUD result
      setActiveScan({
        success: true,
        student: alumno,
        asistencia,
        msg: `¡Acceso Autorizado como ${roleLabel}! El alumno quedó vinculado a este código ZKTeco y registrado en el Dashboard.`,
        duplicate: false,
        source: unregisteredModal.source
      });

      setTimeout(() => {
        setActiveScan(null);
      }, 4500);

    } catch (err: any) {
      alert(`Error al registrar el acceso: ${err.message || err}`);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Connect barcode hook with ZKTeco handling
  const {
    lastScannedBarcode,
    lastScanTimestamp,
    totalScansCount,
    soundEnabled,
    setSoundEnabled,
    isReceivingSignal,
    isZktecoDetected,
    connectedHidDevices,
    hasWebHidSupport,
    connectWebHidScanner,
    triggerManualScan
  } = useBarcodeScanner({
    onScan: (code, src) => handleBarcodeDetected(code, src),
    enabled: true
  });

  // Camera scanner handlers
  const startCameraScanner = async () => {
    setCameraLoading(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (html5ScannerRef.current) {
        await stopCameraScanner();
      }

      const html5QrCode = new Html5Qrcode(videoElementId);
      html5ScannerRef.current = html5QrCode;

      const config = { 
        fps: 12, 
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.777
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          if (html5ScannerRef.current && html5ScannerRef.current.isScanning) {
            try {
              await html5ScannerRef.current.pause(true);
            } catch {}
          }
          await handleBarcodeDetected(decodedText, 'camera_scanner');
        },
        () => {}
      );

      setIsCameraActive(true);
      if (soundEnabled) playAudioFeedback('connect');
    } catch (err: any) {
      console.error('Error starting camera on dashboard:', err);
      setCameraError('No se pudo acceder a la cámara. Asegúrate de otorgar permisos o conectar tu webcam USB.');
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          await html5ScannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      html5ScannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    triggerManualScan(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Barcode Hardware Hub Card */}
      <div className="relative overflow-hidden rounded-2xl glass-panel border border-cyan-500/25 bg-[#060a12]/95 p-5 shadow-2xl backdrop-blur-xl">
        {/* Glowing top line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Status Left Side */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Hardware ZKTeco & USB Scanner Live Indicator */}
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wide transition-all ${
                isReceivingSignal
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isReceivingSignal ? 'bg-cyan-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isReceivingSignal ? 'bg-cyan-400' : 'bg-emerald-500'}`}></span>
                </span>
                <Barcode size={14} className={isReceivingSignal ? 'text-cyan-300 animate-bounce' : 'text-emerald-400'} />
                <span>
                  {isReceivingSignal ? '⚡ LEYENDO CÓDIGO ZKTECO...' : 'LECTOR ZKTECO / CÓDIGO DE BARRAS ACTIVO'}
                </span>
              </span>

              {/* ZKTeco Specific Device Pill */}
              {isZktecoDetected && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                  <Award size={12} />
                  <span>Hardware ZKTeco Sincronizado</span>
                </span>
              )}

              {/* Camera State Badge */}
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center space-x-1 ${
                isCameraActive 
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
                  : 'bg-white/5 text-gray-400 border-white/5'
              }`}>
                <Camera size={12} />
                <span>{isCameraActive ? 'Cámara Web Activa' : 'Cámara Web en Pausa'}</span>
              </span>

              <span className="text-[11px] font-semibold text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">
                Modo Quiosco Autónomo (Sin sesión)
              </span>

              {totalScansCount > 0 && (
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  ⚡ {totalScansCount} {totalScansCount === 1 ? 'escaneo' : 'escaneos'} en sesión
                </span>
              )}
            </div>

            <p className="text-xs text-gray-300">
              Escanea credenciales con tu <strong className="text-white">lector ZKTeco</strong> o pistola USB en cualquier momento. Si el código no está registrado, se abrirá la ventana para autorizar el acceso como <strong className="text-emerald-400">Docente</strong>, <strong className="text-amber-400">Administrador</strong> o <strong className="text-cyan-400">Encargado de Orden</strong>.
            </p>
          </div>

          {/* Controls Right Side */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Camera Activation Button */}
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCameraScanner}
                disabled={cameraLoading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/15 transition-all cursor-pointer disabled:opacity-50"
              >
                {cameraLoading ? (
                  <>
                    <Activity size={14} className="animate-spin" />
                    <span>Iniciando Cámara...</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} />
                    <span>Activar Cámara / Escáner Web</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCameraScanner}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <CameraOff size={14} />
                <span>Pausar Cámara</span>
              </button>
            )}

            {/* Mode selection tabs */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-1 flex">
              {(['auto', 'entrada', 'salida'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/15'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'auto' ? '✨ Auto' : tab === 'entrada' ? '🟢 Entrada' : '🚪 Salida'}
                </button>
              ))}
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Sonido activado (clic para silenciar)' : 'Sonido silenciado (clic para activar)'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* WebHID Pairing Button */}
            {hasWebHidSupport && (
              <button
                type="button"
                onClick={connectWebHidScanner}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                title="Vincular lector ZKTeco / USB directamente por WebHID"
              >
                <Usb size={14} className="text-cyan-400" />
                <span>{connectedHidDevices.length > 0 ? 'Lector Vinculado' : 'Detectar ZKTeco USB'}</span>
              </button>
            )}

          </div>

        </div>

        {/* Live Video Camera Viewport (When camera is active) */}
        <div className={`${isCameraActive ? 'block mt-4' : 'hidden'}`}>
          <div className="relative mx-auto max-w-xl rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black/80 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            
            {/* HTML5 QR Code Mount Element */}
            <div id={videoElementId} className="w-full min-h-[220px]"></div>

            {/* Neon scanner target frame and laser line overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-36 border-2 border-cyan-400/60 rounded-xl corner-border">
                <span></span>
                <div className="scanner-laser"></div>
              </div>
            </div>

            {/* Camera bottom status info */}
            <div className="absolute bottom-2 inset-x-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px] text-gray-300">
              <span className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Enfoca la credencial frente al lente</span>
              </span>
              <span className="font-mono text-cyan-400">QR / Códigos de Barra ZKTeco</span>
            </div>

          </div>
        </div>

        {/* Camera error message if any */}
        {cameraError && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center space-x-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Quick input bar & Test samples */}
        <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Manual / Barcode Gun Landing Input */}
          <form onSubmit={handleManualFormSubmit} className="w-full md:w-auto flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" size={16} />
              <input
                ref={manualInputRef}
                type="text"
                data-barcode-input="true"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Escanear con ZKTeco o escribir código (Ej: DOJ-2026-001)..."
                className="w-full bg-black/50 border border-cyan-500/30 focus:border-cyan-400 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !manualCode.trim()}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-500/10"
            >
              <Zap size={14} />
              <span>Escanear</span>
            </button>
          </form>

          {/* Quick test buttons */}
          {sampleStudents.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
              <span className="text-[11px] text-gray-500 hidden sm:inline">Probar alumno demo:</span>
              {sampleStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => triggerManualScan(s.matricula)}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-gray-300 hover:text-cyan-300 text-[11px] font-mono transition-all cursor-pointer"
                  title={`Simular escaneo de ${s.nombre} ${s.apellido_paterno}`}
                >
                  {s.matricula}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Live scanning progress indicator if active */}
        {isProcessing && (
          <div className="mt-3 flex items-center space-x-2 text-xs text-cyan-400 animate-pulse">
            <Activity size={14} className="animate-spin" />
            <span>Procesando código de barras con ZKTeco y verificando base de datos...</span>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: AUTORIZACIÓN Y REGISTRO DE CÓDIGO NO ENCONTRADO (ZKTECO)           */}
      {/* ========================================================================= */}
      {unregisteredModal && unregisteredModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-lg w-full rounded-3xl p-6 border border-cyan-500/40 bg-gradient-to-b from-[#09111e] via-[#060c16] to-[#040810] shadow-2xl shadow-cyan-500/20 text-white space-y-5">
            
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setUnregisteredModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide">
                <ShieldAlert size={14} />
                <span>CÓDIGO NO REGISTRADO EN EL SISTEMA</span>
              </div>

              <h3 className="text-xl font-extrabold text-white">
                Autorización de Acceso y Registro
              </h3>

              <p className="text-xs text-gray-300 max-w-md mx-auto">
                El escáner ZKTeco detectó el código <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">{unregisteredModal.code}</span>. Selecciona quién autoriza este acceso para registrarlo en el Dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmAuthorization} className="space-y-4">
              
              {/* STEP 1: PREGUNTAR QUIÉN AUTORIZA EL ACCESO (Docente, Administrador, Encargado de Orden) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                  <ShieldCheck size={14} />
                  <span>1. ¿Cómo se autoriza este acceso? (Rol que autoriza):</span>
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  
                  {/* Rol 1: Docente */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('docente')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'docente'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <BookOpen size={18} className={selectedRole === 'docente' ? 'text-emerald-400' : 'text-gray-400'} />
                      {selectedRole === 'docente' && <Check size={14} className="text-emerald-400" />}
                    </div>
                    <div className="mt-2">
                      <span className="block text-xs font-black uppercase tracking-wider">Docente</span>
                      <span className="text-[10px] text-gray-400 leading-tight">Profesor de aula</span>
                    </div>
                  </button>

                  {/* Rol 2: Administrador */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('administrador')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'administrador'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Crown size={18} className={selectedRole === 'administrador' ? 'text-amber-400' : 'text-gray-400'} />
                      {selectedRole === 'administrador' && <Check size={14} className="text-amber-400" />}
                    </div>
                    <div className="mt-2">
                      <span className="block text-xs font-black uppercase tracking-wider">Administrador</span>
                      <span className="text-[10px] text-gray-400 leading-tight">Dirección / Admin</span>
                    </div>
                  </button>

                  {/* Rol 3: Encargado de Orden */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('encargado_orden')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'encargado_orden'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Shield size={18} className={selectedRole === 'encargado_orden' ? 'text-cyan-400' : 'text-gray-400'} />
                      {selectedRole === 'encargado_orden' && <Check size={14} className="text-cyan-400" />}
                    </div>
                    <div className="mt-2">
                      <span className="block text-xs font-black uppercase tracking-wider">Encargado Orden</span>
                      <span className="text-[10px] text-gray-400 leading-tight">Prefecto / Caseta</span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Pass Direction: Entrada vs Salida */}
              <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-2xl border border-white/10 text-xs">
                <span className="text-gray-300 font-semibold">Tipo de Acceso a Registrar:</span>
                <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRegPassType('entrada')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      regPassType === 'entrada' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🟢 Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegPassType('salida')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      regPassType === 'salida' ? 'bg-blue-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🚪 Salida
                  </button>
                </div>
              </div>

              {/* Registration Mode Tabs */}
              <div className="flex border-b border-white/10 pb-2 gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setRegistrationMode('full')}
                  className={`pb-1 font-bold cursor-pointer transition-colors ${
                    registrationMode === 'full' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📝 Alta Completa de Alumno
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode('quick')}
                  className={`pb-1 font-bold cursor-pointer transition-colors ${
                    registrationMode === 'quick' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ⚡ Pase Rápido / Emergencia
                </button>
              </div>

              {/* Form Fields: Mode Full */}
              {registrationMode === 'full' ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Nombre(s) *</label>
                      <input
                        type="text"
                        required
                        value={regNombre}
                        onChange={(e) => setRegNombre(e.target.value)}
                        placeholder="Ej. Juan Carlos"
                        className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={regApellidos}
                        onChange={(e) => setRegApellidos(e.target.value)}
                        placeholder="Ej. Pérez Gómez"
                        className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Grado</label>
                      <select
                        value={regGrado}
                        onChange={(e) => setRegGrado(e.target.value)}
                        className="w-full bg-[#0a101b] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      >
                        <option value="1°">1° Semestre</option>
                        <option value="2°">2° Semestre</option>
                        <option value="3°">3° Semestre</option>
                        <option value="4°">4° Semestre</option>
                        <option value="5°">5° Semestre</option>
                        <option value="6°">6° Semestre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Grupo</label>
                      <select
                        value={regGrupo}
                        onChange={(e) => setRegGrupo(e.target.value)}
                        className="w-full bg-[#0a101b] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      >
                        <option value="A">Grupo A</option>
                        <option value="B">Grupo B</option>
                        <option value="C">Grupo C</option>
                        <option value="D">Grupo D</option>
                        <option value="E">Grupo E</option>
                        <option value="F">Grupo F</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Nombre Tutor</label>
                      <input
                        type="text"
                        value={regTutor}
                        onChange={(e) => setRegTutor(e.target.value)}
                        placeholder="Ej. Sra. Carmen Pérez"
                        className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Teléfono WhatsApp</label>
                      <input
                        type="text"
                        value={regTelefono}
                        onChange={(e) => setRegTelefono(e.target.value)}
                        placeholder="Ej. +526641234567"
                        className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Nombre o Motivo del Pase Especial</label>
                    <input
                      type="text"
                      required
                      value={regNombre}
                      onChange={(e) => setRegNombre(e.target.value)}
                      placeholder="Ej. Alumno credencial nueva / Visita / Practicante"
                      className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                    💡 Se registrará el acceso de inmediato en el Dashboard con la firma de autorización del <strong className="text-white">{selectedRole.toUpperCase()}</strong>.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setUnregisteredModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAuth ? (
                    <>
                      <Activity size={14} className="animate-spin" />
                      <span>Guardando y Autorizando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      <span>Autorizar y Registrar en Dashboard</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING HUD SCAN RESULT OVERLAY MODAL                                    */}
      {/* ========================================================================= */}
      {activeScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className={`relative max-w-md w-full rounded-3xl p-6 border shadow-2xl transition-all ${
            activeScan.success 
              ? activeScan.duplicate
                ? 'bg-gradient-to-b from-[#181308] to-[#0d0904] border-amber-500/40 shadow-amber-500/10'
                : 'bg-gradient-to-b from-[#081714] to-[#040c0a] border-emerald-500/40 shadow-emerald-500/15'
              : 'bg-gradient-to-b from-[#1c0a0a] to-[#0d0404] border-red-500/40 shadow-red-500/15'
          }`}>
            
            {/* Top close button */}
            <button
              onClick={() => setActiveScan(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header Badge */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {activeScan.success ? (
                  activeScan.duplicate ? (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full flex items-center space-x-1.5">
                      <AlertTriangle size={14} />
                      <span>Registro Repetido (&lt; 30s)</span>
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-full flex items-center space-x-1.5 ${
                      activeScan.asistencia?.tipo === 'entrada'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      <CheckCircle size={14} />
                      <span>{activeScan.asistencia?.tipo === 'entrada' ? '✅ Entrada Registrada' : '🚪 Salida Registrada'}</span>
                    </span>
                  )
                ) : (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full flex items-center space-x-1.5">
                    <X size={14} />
                    <span>Acceso Denegado</span>
                  </span>
                )}
              </div>

              {/* Student Details */}
              {activeScan.success && activeScan.student && activeScan.asistencia && (
                <div className="space-y-4 pt-1">
                  
                  {/* Photo Avatar */}
                  <div className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/15 shadow-xl bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeScan.student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeScan.student.matricula}`}
                      alt={activeScan.student.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Student Name & Matricula */}
                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">
                      {activeScan.student.nombre} {activeScan.student.apellido_paterno} {activeScan.student.apellido_materno || ''}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Matrícula: <span className="font-mono text-cyan-400 font-bold">{activeScan.student.matricula}</span> • Grado: <span className="text-white font-semibold">{activeScan.student.grado} &quot;{activeScan.student.grupo}&quot;</span>
                    </p>
                  </div>

                  {/* Time & WhatsApp confirmation pill */}
                  <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center space-x-1.5 font-mono text-sm text-white">
                        <Clock size={14} className="text-cyan-400" />
                        <span>{activeScan.asistencia.hora}</span>
                      </span>
                      <span className="text-gray-400 text-[11px]">{activeScan.asistencia.fecha}</span>
                    </div>

                    {activeScan.asistencia.escaneado_por && (
                      <div className="text-[10px] text-cyan-300 font-semibold text-left border-t border-white/5 pt-1.5">
                        🛡️ {activeScan.asistencia.escaneado_por}
                      </div>
                    )}

                    {activeScan.student.telefono && activeScan.student.telefono !== '+525500000000' && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                        <span className="flex items-center space-x-1.5">
                          <Smartphone size={13} />
                          <span>WhatsApp enviado a {activeScan.student.tutor}</span>
                        </span>
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Error message */}
              {!activeScan.success && (
                <div className="py-4 space-y-2">
                  <h4 className="text-base font-bold text-white">Código No Reconocido</h4>
                  <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">{activeScan.msg}</p>
                </div>
              )}

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setActiveScan(null)}
                className="mt-3 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-bold transition-all cursor-pointer"
              >
                Cerrar o continuar escaneando
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
