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
  Maximize2,
  RefreshCw
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

  // Input ref for physical reader autofocus
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

  // Process any barcode detected by physical scanner, camera or manual input
  const handleBarcodeDetected = async (code: string, source: 'hardware_scanner' | 'manual_input' | 'webhid' | 'camera_scanner') => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const overrideVal = activeTab === 'auto' ? undefined : activeTab;
      const deviceName = source === 'hardware_scanner' 
        ? 'Lector Código de Barras USB' 
        : source === 'camera_scanner'
          ? 'Cámara Escáner Dashboard'
          : source === 'webhid' 
            ? 'Lector USB WebHID' 
            : 'Entrada Manual Dashboard';

      const operatorName = user?.name || 'Terminal de Acceso Autónomo (Sin sesión)';

      // 1. Register attendance in database
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
      if (soundEnabled) playAudioFeedback('error');
      setActiveScan({
        success: false,
        msg: err.message || `No se encontró ningún estudiante con el código o matrícula '${code}'.`,
        source
      });

      if (isCameraActive && html5ScannerRef.current) {
        setTimeout(async () => {
          try {
            await html5ScannerRef.current.resume();
          } catch {}
        }, 2500);
      }

      setTimeout(() => {
        setActiveScan(null);
      }, 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Connect barcode hook
  const {
    lastScannedBarcode,
    lastScanTimestamp,
    totalScansCount,
    soundEnabled,
    setSoundEnabled,
    isReceivingSignal,
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
              
              {/* Hardware Scanner Live Indicator */}
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wide transition-colors ${
                isReceivingSignal
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isReceivingSignal ? 'bg-cyan-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isReceivingSignal ? 'bg-cyan-400' : 'bg-emerald-500'}`}></span>
                </span>
                <Barcode size={14} className={isReceivingSignal ? 'text-cyan-300 animate-bounce' : 'text-emerald-400'} />
                <span>{isReceivingSignal ? '⚡ RECIBIENDO CÓDIGO...' : 'LECTOR DE CÓDIGO DE BARRAS ACTIVO'}</span>
              </span>

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
              Escanea con tu <strong className="text-white">pistola/lector USB</strong> en cualquier momento, o <strong className="text-cyan-400">activa la cámara web</strong> para lectura óptica directa desde este panel sin entrar a ningún usuario.
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
                title="Vincular lector de código de barras USB directamente (Opcional)"
              >
                <Usb size={14} className="text-cyan-400" />
                <span>{connectedHidDevices.length > 0 ? 'USB Vinculado' : 'Detectar USB'}</span>
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
              <span className="font-mono text-cyan-400">QR / Códigos de Barra 1D</span>
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
                placeholder="Escanear o escribir matrícula (Ej: DOJ-2026-001)..."
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
            <span>Procesando código de barras y enviando notificación de WhatsApp...</span>
          </div>
        )}

      </div>

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

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                      <span className="flex items-center space-x-1.5">
                        <Smartphone size={13} />
                        <span>WhatsApp enviado a {activeScan.student.tutor}</span>
                      </span>
                      <Check size={14} />
                    </div>

                    <div className="text-[10px] text-gray-500 text-left font-mono truncate">
                      Destino: {activeScan.student.telefono}
                    </div>
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
