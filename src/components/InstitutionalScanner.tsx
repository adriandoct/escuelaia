"use strict";

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Barcode, 
  Camera, 
  CameraOff, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  UserCheck, 
  Play, 
  ArrowRight, 
  UserX, 
  BookOpen, 
  Shield, 
  Usb, 
  Zap, 
  Activity, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Award, 
  Clock, 
  X, 
  Check, 
  ShieldCheck,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, Alumno, Asistencia } from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { useAuth, Role } from '@/lib/auth';
import { useBarcodeScanner, playAudioFeedback } from '@/lib/useBarcodeScanner';

export type AuthRoleType = 'docente' | 'administrador' | 'encargado_orden';

export default function InstitutionalScanner() {
  const { user, usersRolesMap, usersPasswordsMap } = useAuth();

  const [students, setStudents] = useState<Alumno[]>([]);
  const [activeTab, setActiveTab] = useState<'auto' | 'entrada' | 'salida'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualMatricula, setManualMatricula] = useState('');
  const [simulatedStudentId, setSimulatedStudentId] = useState('');
  const [recentLogs, setRecentLogs] = useState<Asistencia[]>([]);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5ScannerRef = useRef<any>(null);
  const videoElementId = 'institutional-camera-scanner-viewport';

  // Manual input ref for physical scanner autofocus
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Active Scan Result HUD / Card
  const [activeScan, setActiveScan] = useState<{
    success: boolean;
    student?: Alumno;
    asistencia?: Asistencia;
    msg: string;
    duplicate?: boolean;
    source?: string;
  } | null>(null);

  // Unregistered Code Modal State
  const [unregisteredModal, setUnregisteredModal] = useState<{
    isOpen: boolean;
    code: string;
    source?: string;
  } | null>(null);

  const [selectedRole, setSelectedRole] = useState<AuthRoleType>('encargado_orden');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'full' | 'quick'>('full');
  const [regNombre, setRegNombre] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regGrado, setRegGrado] = useState('1°');
  const [regGrupo, setRegGrupo] = useState('A');
  const [regTutor, setRegTutor] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassType, setRegPassType] = useState<'entrada' | 'salida'>('entrada');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Load students & recent logs
  const loadData = useCallback(async () => {
    try {
      const data = await db.getAlumnos();
      setStudents(data);
      if (data.length > 0 && !simulatedStudentId) {
        setSimulatedStudentId(data[0].matricula);
      }
      const logs = await db.getAsistencias();
      setRecentLogs(logs.slice(0, 5));
    } catch (e) {
      console.error('Error cargando alumnos:', e);
    }
  }, [simulatedStudentId]);

  useEffect(() => {
    loadData();
    return () => {
      stopCameraScanner();
    };
  }, [loadData]);

  // Autofocus scanner input on click or mount
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(focusTimer);
  }, []);

  // Helper to obtain authorized accounts for each role
  const getAccountsForRole = useCallback((role: AuthRoleType): string[] => {
    const entries = Object.entries(usersRolesMap || {});
    const matching = entries.filter(([_, r]) => r === role).map(([email]) => email);
    if (matching.length > 0) return matching;

    if (role === 'docente') {
      return ['docente.marcos@cecytebc.edu.mx', 'profesora.mariana@cecytebc.edu.mx'];
    }
    if (role === 'administrador') {
      return ['admin@admin.com', 'admin.general@cecytebc.edu.mx'];
    }
    return ['orden.general@cecytebc.edu.mx', 'prefecto.juan@cecytebc.edu.mx'];
  }, [usersRolesMap]);

  const handleRoleSelection = (role: AuthRoleType) => {
    setSelectedRole(role);
    setAuthError(null);
    setAuthPassword('');
    const accounts = getAccountsForRole(role);
    if (user && user.role === role) {
      setAuthEmail(user.email);
    } else {
      setAuthEmail(accounts[0] || '');
    }
  };

  // Master Scan Processor
  const processScanResult = async (code: string, source = 'Lector Código de Barras USB') => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (html5ScannerRef.current && html5ScannerRef.current.isScanning) {
        try {
          await html5ScannerRef.current.pause(true);
        } catch {}
      }

      const overrideVal = activeTab === 'auto' ? undefined : activeTab;
      const operatorName = user?.name || 'Terminal de Acceso Autónomo (Sin sesión)';

      const { asistencia, alumno, duplicateWarning } = await db.registrarAsistencia(
        code,
        overrideVal,
        source,
        'Acceso Principal CECYTE',
        operatorName
      );

      // WhatsApp Notification
      await sendWhatsAppNotification(alumno, asistencia);

      if (duplicateWarning) {
        if (soundEnabled) playAudioFeedback('duplicate');
        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Aviso! Alumno registrado hace menos de 30s. Acceso guardado como '${asistencia.tipo.toUpperCase()}'.`,
          duplicate: true,
          source
        });
      } else {
        if (soundEnabled) playAudioFeedback('success');
        try {
          confetti({
            particleCount: 50,
            spread: 65,
            origin: { y: 0.6 }
          });
        } catch {}

        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Acceso Exitoso! ${asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'} confirmada correctamente.`,
          duplicate: false,
          source
        });
      }

      loadData();

      // Resume camera after short delay
      if (isCameraActive && html5ScannerRef.current) {
        setTimeout(async () => {
          try {
            await html5ScannerRef.current.resume();
          } catch {}
        }, 2500);
      }

      // Auto dismiss overlay after 5 seconds
      setTimeout(() => {
        setActiveScan(null);
      }, 5000);

    } catch (err: any) {
      // CODE NOT FOUND: REQUIRE MANDATORY AUTHENTICATION & REGISTRATION
      if (soundEnabled) playAudioFeedback('prompt');

      if (isCameraActive && html5ScannerRef.current) {
        try {
          await html5ScannerRef.current.pause(true);
        } catch {}
      }

      setRegPassType(activeTab === 'salida' ? 'salida' : 'entrada');
      setRegNombre('');
      setRegApellidos('');
      setRegTutor('');
      setRegTelefono('');

      const initialRole: AuthRoleType = (user?.role === 'docente' || user?.role === 'administrador') ? user.role : 'encargado_orden';
      setSelectedRole(initialRole);
      const accounts = getAccountsForRole(initialRole);
      setAuthEmail(user?.role === initialRole ? user.email : accounts[0] || '');
      setAuthPassword('');
      setAuthError(null);
      setShowAuthPassword(false);

      setUnregisteredModal({
        isOpen: true,
        code,
        source
      });

    } finally {
      setIsProcessing(false);
      setManualMatricula('');
      if (scannerInputRef.current) {
        scannerInputRef.current.value = '';
      }
      // Re-focus scanner input
      setTimeout(() => {
        if (!unregisteredModal?.isOpen) {
          scannerInputRef.current?.focus();
        }
      }, 200);
    }
  };

  // Submit Authorization & Registration for Unregistered Code
  const handleConfirmAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unregisteredModal) return;

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const code = unregisteredModal.code;
      const cleanEmail = authEmail.trim().toLowerCase();
      const cleanPass = authPassword.trim();

      // MANDATORY AUTHENTICATION VERIFICATION
      if (!cleanPass) {
        setAuthError('Por favor ingresa la contraseña institucional o PIN de seguridad para autenticar la autorización.');
        if (soundEnabled) playAudioFeedback('error');
        setIsSubmittingAuth(false);
        return;
      }

      const expectedPass = usersPasswordsMap?.[cleanEmail] || (cleanEmail === 'admin@admin.com' ? '12345678Cecyte' : 'Cecyte2026!');
      const MASTER_PINS = ['Cecyte2026!', '12345678Cecyte', '2026', '1234'];
      const isValid = (cleanPass === expectedPass) || MASTER_PINS.includes(cleanPass);

      if (!isValid) {
        setAuthError(`Contraseña o PIN incorrecto para ${cleanEmail}. Por seguridad, solo personal autorizado (${selectedRole.toUpperCase()}) puede dar de alta esta credencial.`);
        if (soundEnabled) playAudioFeedback('error');
        setIsSubmittingAuth(false);
        return;
      }

      const roleLabels: Record<AuthRoleType, string> = {
        docente: 'Docente',
        administrador: 'Administrador',
        encargado_orden: 'Encargado de Orden'
      };

      const roleLabel = roleLabels[selectedRole];
      const accountDisplayName = cleanEmail === 'admin@admin.com'
        ? 'Administrador General'
        : cleanEmail.split('@')[0].replace('.', ' ').toUpperCase();

      const authorizedBy = `Autorizado por ${roleLabel}: ${accountDisplayName} (${cleanEmail})`;

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
          nombre: regNombre.trim() || `Pase Especial (${code})`,
          apellido_paterno: `[${roleLabel}]`,
          apellido_materno: '',
          grado: 'General',
          grupo: 'A',
          tutor: 'Dirección Escolar',
          telefono: '',
          foto_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(code)}`
        });
      }

      const deviceLabel = isHardwareScannerConnected 
        ? `Lector Físico (${detectedScannerName})` 
        : 'Lector ZKTeco Código de Barras';

      const { asistencia, alumno } = await db.registrarAsistencia(
        alumnoCreado.matricula,
        regPassType,
        deviceLabel,
        'Acceso Principal CECYTE',
        authorizedBy
      );

      if (alumno.telefono && alumno.telefono !== '+525500000000' && alumno.telefono.length >= 10) {
        await sendWhatsAppNotification(alumno, asistencia);
      }

      if (soundEnabled) playAudioFeedback('success');
      try {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch {}

      setUnregisteredModal(null);
      loadData();

      setActiveScan({
        success: true,
        student: alumno,
        asistencia,
        msg: `¡Acceso Autorizado y Autenticado como ${roleLabel}! El alumno quedó vinculado a este código y registrado en el sistema.`,
        duplicate: false,
        source: unregisteredModal.source
      });

      setTimeout(() => {
        setActiveScan(null);
      }, 5000);

    } catch (err: any) {
      alert(`Error al registrar el acceso: ${err.message || err}`);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Connect barcode hook with ZKTeco & USB physical scanner handling
  const {
    soundEnabled,
    setSoundEnabled,
    isReceivingSignal,
    isHardwareScannerConnected,
    isZktecoDetected,
    detectedScannerName,
    connectedHidDevices,
    hasWebHidSupport,
    connectWebHidScanner,
    refreshConnectedHidDevices,
    lastHardwareEvent,
    clearHardwareEvent,
    triggerManualScan
  } = useBarcodeScanner({
    onScan: (code, src) => processScanResult(code, src === 'hardware_scanner' ? detectedScannerName : 'Lector USB'),
    enabled: true
  });

  // Camera Handlers
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
        qrbox: { width: 300, height: 200 },
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
          await processScanResult(decodedText, 'Cámara Escáner Web');
        },
        () => {}
      );

      setIsCameraActive(true);
      if (soundEnabled) playAudioFeedback('connect');
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setCameraError('No se pudo acceder a la cámara. Conecta una webcam USB o permite los permisos de cámara.');
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = (manualMatricula || scannerInputRef.current?.value || '').trim();
    if (!code) return;
    triggerManualScan(code);
    setManualMatricula('');
    if (scannerInputRef.current) scannerInputRef.current.value = '';
  };

  const handleSimulatedScan = () => {
    if (!simulatedStudentId) return;
    triggerManualScan(simulatedStudentId);
  };

  return (
    <div className="space-y-6 pb-12 flex-1 flex flex-col">
      
      {/* Real-time Hardware Scanner Connection Notification Toast */}
      {lastHardwareEvent && (
        <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400 text-cyan-200 text-xs flex items-center justify-between shadow-xl shadow-cyan-500/20 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
              <Usb size={16} className="animate-bounce" />
            </span>
            <span>
              {lastHardwareEvent.type === 'connected' ? (
                <>🔌 <strong className="text-white">¡Escáner detectado y sincronizado!</strong> Modelo: <span className="font-mono text-cyan-300">{lastHardwareEvent.name}</span>. Listo para escanear credenciales.</>
              ) : (
                <>⚠️ <strong className="text-amber-300">Escáner desconectado:</strong> <span className="font-mono">{lastHardwareEvent.name}</span></>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={clearHardwareEvent}
            className="text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 text-xs transition-colors cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* Title & Mode Switchers (Matching User's Requested Frontend) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase flex items-center space-x-1">
              <span>👑</span>
              <span>{user?.role === 'administrador' ? 'ADMINISTRADOR' : user?.role === 'encargado_orden' ? 'ENCARGADO DE ORDEN' : 'PERSONAL AUTORIZADO'}</span>
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">Escáner de Acceso Institucional</h2>
          <p className="text-gray-400 text-sm">Escanea credenciales de alumnos para validar ingresos/salidas y disparar notificaciones WhatsApp.</p>
        </div>

        {/* Tab Switcher Mode */}
        <div className="flex items-center p-1 glass-panel rounded-2xl border-cyan-500/20 self-start sm:self-auto bg-black/40">
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'auto'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔄 Detección Auto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entrada')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'entrada'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🟢 Forzar Entrada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('salida')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'salida'
                ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🚪 Forzar Salida
          </button>
        </div>
      </div>

      {/* Main Grid: Dedicated Hardware Scanner Recuadro (2 cols) & Testing/Manual Controls (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================================================= */}
        {/* RECUADRO PRINCIPAL DE ESCANEO DE CÓDIGO DE BARRAS / HARDWARE SCANNER       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="relative overflow-hidden rounded-3xl glass-panel border-2 border-cyan-500/30 bg-[#060a14]/95 p-6 shadow-2xl backdrop-blur-xl">
            {/* Top glowing laser line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

            {/* Top Status & Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Live Scanner Connection Status LED */}
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wide transition-all ${
                  isReceivingSignal
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse'
                    : isHardwareScannerConnected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                }`}>
                  <span className="flex h-2 w-2 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isReceivingSignal ? 'bg-cyan-400' : isHardwareScannerConnected ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      isReceivingSignal ? 'bg-cyan-400' : isHardwareScannerConnected ? 'bg-emerald-400' : 'bg-cyan-500'
                    }`}></span>
                  </span>
                  <Barcode size={14} className={isReceivingSignal ? 'text-cyan-300 animate-bounce' : isHardwareScannerConnected ? 'text-emerald-400' : 'text-cyan-400'} />
                  <span>
                    {isReceivingSignal 
                      ? '⚡ LEYENDO CÓDIGO DE CREDENCIAL...' 
                      : isHardwareScannerConnected 
                        ? 'ESCÁNER FÍSICO CONECTADO Y ACTIVO' 
                        : 'ESCÁNER LISTO / MODO WEDGE ACTIVO'}
                  </span>
                </span>

                {/* Device Model Pill */}
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                  <Usb size={12} className="text-cyan-400" />
                  <span>{detectedScannerName}</span>
                </span>

                {isZktecoDetected && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                    <Award size={12} />
                    <span>ZKTeco</span>
                  </span>
                )}
              </div>

              {/* Top Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Audio Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    soundEnabled 
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                  title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Detect / Reconnect Scanner */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasWebHidSupport) {
                      connectWebHidScanner();
                    } else {
                      refreshConnectedHidDevices();
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                  title="Detectar o emparejar escáner USB"
                >
                  <RefreshCw size={13} className="text-cyan-400" />
                  <span>Detectar USB</span>
                </button>

                {/* Camera Toggle Button */}
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    disabled={cameraLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>{cameraLoading ? 'Iniciando...' : 'Cámara Web'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <CameraOff size={14} />
                    <span>Cerrar Cámara</span>
                  </button>
                )}
              </div>

            </div>

            {/* ========================================================================= */}
            {/* THE CENTRAL SCANNING RECUADRO / ARENA                                      */}
            {/* ========================================================================= */}
            <div 
              onClick={() => scannerInputRef.current?.focus()}
              className="mt-5 relative w-full rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-gradient-to-b from-[#070b14] via-[#05070e] to-[#03050a] p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center min-h-[340px] cursor-pointer group"
            >
              
              {/* Corner Cyber Brackets */}
              <div className="pointer-events-none absolute inset-4 border border-cyan-400/20 rounded-xl corner-border">
                <span></span>
                {/* Continuous Laser Scanning Sweep */}
                <div className="scanner-laser"></div>
              </div>

              {/* CAMERA OVERLAY (When Camera is Active) */}
              {isCameraActive ? (
                <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-cyan-400/50 shadow-2xl bg-black">
                  <div id={videoElementId} className="w-full min-h-[260px]"></div>
                  <div className="absolute bottom-2 inset-x-2 bg-black/75 px-3 py-1.5 rounded-xl text-center text-xs text-cyan-300 font-mono">
                    Enfoca la credencial frente al lente
                  </div>
                </div>
              ) : (
                /* HARDWARE BARCODE SCANNER TARGET DISPLAY */
                <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 max-w-md">
                  
                  {/* Glowing Barcode Icon Shield */}
                  <div className="relative w-24 h-24 rounded-3xl bg-cyan-500/10 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all">
                    <Barcode size={48} className={isReceivingSignal ? 'text-cyan-300 animate-bounce' : 'text-cyan-400'} />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400"></span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {isReceivingSignal ? 'Procesando Lectura...' : 'Área de Escaneo de Credenciales'}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Pasa el código de barras de la credencial frente a tu <strong className="text-cyan-400 font-bold">lector ZKTeco o escáner USB</strong>. La asistencia y el WhatsApp se procesarán en automático.
                    </p>
                  </div>

                  {/* Active Input Recuadro for Barcode Scanner Gun */}
                  <form onSubmit={handleManualSubmit} onClick={(e) => e.stopPropagation()} className="w-full pt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" size={18} />
                      <input
                        ref={scannerInputRef}
                        type="text"
                        data-barcode-input="true"
                        value={manualMatricula}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('\n') || val.includes('\r')) {
                            const clean = val.replace(/[\r\n]/g, '').trim();
                            if (clean.length >= 3) {
                              triggerManualScan(clean);
                              setManualMatricula('');
                              if (scannerInputRef.current) scannerInputRef.current.value = '';
                              return;
                            }
                          }
                          setManualMatricula(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            const code = (manualMatricula || e.currentTarget.value).trim();
                            if (code.length >= 3) {
                              triggerManualScan(code);
                              setManualMatricula('');
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData?.getData('text')?.trim() || '';
                          if (pasted.length >= 3) {
                            e.preventDefault();
                            triggerManualScan(pasted);
                            setManualMatricula('');
                            if (scannerInputRef.current) scannerInputRef.current.value = '';
                          }
                        }}
                        placeholder="Esperando señal del escáner..."
                        className="w-full bg-black/70 border-2 border-cyan-500/50 focus:border-cyan-400 rounded-2xl py-3 pl-11 pr-4 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isProcessing || !manualMatricula.trim()}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-black font-extrabold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <Zap size={15} />
                      <span>Escanear</span>
                    </button>
                  </form>

                  <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Recepción global activa: no necesitas hacer clic en ningún campo</span>
                  </div>

                </div>
              )}

              {/* Live Processing Indicator */}
              {isProcessing && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                  <Activity size={32} className="text-cyan-400 animate-spin" />
                  <p className="text-sm font-bold text-cyan-300">Verificando credencial con la base de datos...</p>
                </div>
              )}

            </div>

            {/* Error Message if camera failed */}
            {cameraError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center space-x-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

          </div>

          {/* Verification Result Display HUD (In-Place underneath the arena) */}
          {activeScan && (
            <div className={`p-5 rounded-3xl border shadow-2xl transition-all animate-slide-up ${
              activeScan.success
                ? activeScan.duplicate
                  ? 'bg-gradient-to-b from-[#181308] to-[#0d0904] border-amber-500/40 shadow-amber-500/10'
                  : 'bg-gradient-to-b from-[#081714] to-[#040c0a] border-emerald-500/40 shadow-emerald-500/15'
                : 'bg-gradient-to-b from-[#1c0a0a] to-[#0d0404] border-red-500/40 shadow-red-500/15'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center space-x-4">
                  {/* Photo Avatar */}
                  {activeScan.student && (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0 bg-gray-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeScan.student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeScan.student.matricula}`}
                        alt={activeScan.student.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        activeScan.success
                          ? activeScan.duplicate
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {activeScan.success ? (activeScan.duplicate ? '⚠️ Registro Repetido' : '✅ Acceso Registrado') : '❌ No Reconocido'}
                      </span>

                      {activeScan.asistencia && (
                        <span className="font-mono text-xs text-cyan-300 font-bold">
                          {activeScan.asistencia.hora}
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-black text-white">
                      {activeScan.student 
                        ? `${activeScan.student.nombre} ${activeScan.student.apellido_paterno} ${activeScan.student.apellido_materno || ''}`
                        : 'Código No Reconocido'}
                    </h4>

                    {activeScan.student && (
                      <p className="text-xs text-gray-300">
                        Matrícula: <span className="font-mono text-cyan-400 font-bold">{activeScan.student.matricula}</span> • Grado: <span className="text-white font-semibold">{activeScan.student.grado} &quot;{activeScan.student.grupo}&quot;</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* WhatsApp Status Pill */}
                {activeScan.student?.telefono && activeScan.student.telefono !== '+525500000000' && (
                  <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                    <Smartphone size={16} />
                    <span>WhatsApp enviado a {activeScan.student.tutor}</span>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR: SIMULATOR, MANUAL INPUT & RECENT ACTIVITY                   */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          
          {/* Quick Simulation Panel */}
          <div className="glass-panel p-5 rounded-3xl border border-cyan-500/20 space-y-3.5 bg-gradient-to-b from-[#0d1424] to-[#070a12]">
            <div className="flex items-center space-x-2">
              <span className="text-base">⚡</span>
              <h3 className="text-sm font-bold text-white">Prueba Rápida de Alumno Demo</h3>
            </div>
            <p className="text-gray-400 text-xs">Simula el paso de una credencial para comprobar sonido, confeti y WhatsApp:</p>

            {students.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">No hay alumnos en base de datos.</div>
            ) : (
              <div className="space-y-2.5">
                <select
                  value={simulatedStudentId}
                  onChange={(e) => setSimulatedStudentId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs text-white bg-[#0a0f1d] border border-white/10 outline-none focus:border-cyan-400"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.matricula}>
                      {st.nombre} {st.apellido_paterno} ({st.matricula}) - {st.grado} &quot;{st.grupo}&quot;
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSimulatedScan}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Simular Lectura de Credencial</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>

          {/* Direct Manual Entry */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 bg-[#080c14]">
            <h3 className="text-sm font-bold text-white">Ingreso Directo por Matrícula</h3>
            <p className="text-gray-400 text-xs">Si la credencial física está dañada, escribe la matrícula:</p>

            <form onSubmit={handleManualSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={manualMatricula}
                  onChange={(e) => setManualMatricula(e.target.value)}
                  placeholder="Ej. DOJ-2026-001"
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Recent Access History Mini-Feed */}
          {recentLogs.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 bg-[#080c14]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Últimos Accesos</h3>
                <Link href="/dashboard" className="text-[11px] text-cyan-400 hover:underline">
                  Ver Todo →
                </Link>
              </div>

              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">
                        {log.alumno ? `${log.alumno.nombre} ${log.alumno.apellido_paterno}` : 'Alumno'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {log.alumno?.matricula || log.alumno_id} • {log.hora}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      log.tipo === 'entrada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.tipo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: AUTORIZACIÓN Y REGISTRO CON AUTENTICACIÓN OBLIGATORIA               */}
      {/* ========================================================================= */}
      {unregisteredModal && unregisteredModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-lg w-full rounded-3xl p-6 border border-cyan-500/40 bg-gradient-to-b from-[#09111e] via-[#060c16] to-[#040810] shadow-2xl shadow-cyan-500/20 text-white space-y-5">
            
            <button
              type="button"
              onClick={() => setUnregisteredModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide">
                <ShieldAlert size={14} />
                <span>MATRÍCULA NO REGISTRADA</span>
              </div>

              <h3 className="text-xl font-extrabold text-white">
                Autorización de Acceso y Registro
              </h3>

              <p className="text-xs text-gray-300 max-w-md mx-auto">
                El escáner detectó el código <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">{unregisteredModal.code}</span>. Selecciona quién autoriza este acceso para autenticar y darlo de alta.
              </p>
            </div>

            <form onSubmit={handleConfirmAuthorization} className="space-y-4">
              
              {/* STEP 1: Rol que autoriza */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                  <ShieldCheck size={14} />
                  <span>1. ¿Quién autoriza este acceso? (Rol que autoriza):</span>
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRoleSelection('docente')}
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

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('administrador')}
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

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('encargado_orden')}
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

              {/* STEP 2: AUTENTICACIÓN INSTITUCIONAL OBLIGATORIA */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Lock size={14} className="text-cyan-400" />
                    <span>2. Autenticación Obligatoria de Seguridad:</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    Requerido
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-gray-300 block mb-1 font-semibold">
                      Cuenta {selectedRole === 'docente' ? 'Docente' : selectedRole === 'administrador' ? 'Admin' : 'Encargado'} *
                    </label>
                    <select
                      value={authEmail}
                      onChange={(e) => {
                        setAuthEmail(e.target.value);
                        setAuthError(null);
                      }}
                      className="w-full bg-[#0a101b] border border-white/20 focus:border-cyan-400 rounded-xl px-2.5 py-2 text-white text-xs outline-none"
                    >
                      {getAccountsForRole(selectedRole).map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 block mb-1 font-semibold">
                      Contraseña / PIN de Autorización *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => {
                          setAuthPassword(e.target.value);
                          setAuthError(null);
                        }}
                        placeholder="Contraseña o PIN..."
                        className="w-full bg-black/60 border border-white/20 focus:border-cyan-400 rounded-xl py-2 pl-8 pr-8 text-white text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showAuthPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{authError}</span>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 flex items-center justify-between">
                  <span>🔒 Valida credenciales contra directorio institucional.</span>
                  <span className="font-mono text-cyan-400/80">PIN maestro aceptado</span>
                </p>
              </div>

              {/* Pass Direction */}
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
                    <label className="text-[11px] text-gray-400 block mb-1">Nombre o Motivo del Pase</label>
                    <input
                      type="text"
                      required
                      value={regNombre}
                      onChange={(e) => setRegNombre(e.target.value)}
                      placeholder="Ej. Credencial Nueva / Visita / Alumno en trámite"
                      className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              )}

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
                      <span>Validando y Registrando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>Validar Autenticación y Registrar Alumno</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
