"use strict";

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db, Alumno, Asistencia } from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { useAuth } from '@/lib/auth';
import { 
  Camera, AlertCircle, CheckCircle, RefreshCw, Smartphone, Volume2, ShieldAlert, UserCheck, Play, ArrowRight, UserX, BookOpen, Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ScannerPage() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Alumno[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'entrada' | 'salida' | 'auto'>('auto');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [activeScan, setActiveScan] = useState<{
    success: boolean;
    student?: Alumno;
    asistencia?: Asistencia;
    msg: string;
    duplicate?: boolean;
  } | null>(null);
  const [manualMatricula, setManualMatricula] = useState('');
  const [simulatedStudentId, setSimulatedStudentId] = useState('');
  const [isClient, setIsClient] = useState(false);

  const scannerRef = useRef<any>(null);
  const videoContainerId = 'qr-video-reader';

  // Mark client mount
  useEffect(() => {
    setIsClient(true);
    loadStudents();
    return () => {
      stopCamera();
    };
  }, []);

  const loadStudents = async () => {
    try {
      const data = await db.getAlumnos();
      setStudents(data);
      if (data.length > 0) {
        setSimulatedStudentId(data[0].matricula);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sound generator using HTML5 Web Audio API
  const playBeep = (type: 'success' | 'error' | 'duplicate') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        
        setTimeout(() => {
          const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1109, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.15);
        }, 120);

      } else if (type === 'duplicate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const startCamera = async () => {
    if (!isClient) return;
    try {
      setScanning(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(videoContainerId);
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          await processScanResult(decodedText);
        },
        () => {
          // Silent callback
        }
      );
      setCameraPermission(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraPermission(false);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Camera stop error:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Master check-in logic
  const processScanResult = async (matricula: string) => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.pause(true);
      }

      const overrideVal = activeTab === 'auto' ? undefined : activeTab;
      
      const { asistencia, alumno, duplicateWarning } = await db.registrarAsistencia(
        matricula,
        overrideVal,
        'Cámara Escáner Web',
        'Acceso Principal CECYTE',
        user?.name || 'Encargado de Orden'
      );

      await sendWhatsAppNotification(alumno, asistencia);

      if (duplicateWarning) {
        playBeep('duplicate');
        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Advertencia! El alumno ya fue escaneado hace menos de 30 segundos. Registro guardado como '${asistencia.tipo.toUpperCase()}'.`,
          duplicate: true
        });
      } else {
        playBeep('success');
        
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {
          // Fallback if confetti fails
        }

        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Acceso Registrado Exitosamente! (${asistencia.tipo.toUpperCase()})`
        });
      }

      setTimeout(async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.resume();
          } catch (e) {
            // Ignored
          }
        }
      }, 4000);

    } catch (err: any) {
      playBeep('error');
      setActiveScan({
        success: false,
        msg: err.message || 'Código QR no reconocido o estudiante no registrado.'
      });

      setTimeout(async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.resume();
          } catch (e) {
            // Ignored
          }
        }
      }, 3500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatricula) return;
    processScanResult(manualMatricula);
    setManualMatricula('');
  };

  const handleSimulatedScan = () => {
    if (!simulatedStudentId) return;
    processScanResult(simulatedStudentId);
  };

  // Notice for Teachers
  if (user?.role === 'docente') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/10">
          👨‍🏫
        </div>
        <div className="space-y-2 max-w-lg">
          <h2 className="text-3xl font-black text-white">Escáner General Reservado</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            El escáner QR de torniquete/acceso principal está configurado para ser operado por los <span className="text-cyan-400 font-semibold">Encargados de Orden</span> y <span className="text-amber-400 font-semibold">Administradores</span>.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Como Docente, puedes realizar el pase de lista y consultar el estado de tu grupo en el <span className="text-emerald-400 font-semibold">Panel Docente</span>.
          </p>
        </div>
        <Link
          href="/dashboard/teacher"
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all flex items-center space-x-2"
        >
          <BookOpen size={18} />
          <span>Ir a Mi Panel Docente →</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Title & Mode Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold uppercase">
              {user?.role === 'administrador' ? '👑 Administrador' : '🛡️ Encargado de Orden'}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">Escáner de Acceso Institucional</h2>
          <p className="text-gray-400 text-sm">Escanea credenciales de alumnos para validar ingresos/salidas y disparar notificaciones WhatsApp.</p>
        </div>

        {/* Tab Switcher Mode */}
        <div className="flex items-center p-1 glass-panel rounded-2xl border-cyan-500/20 self-start sm:self-auto">
          <button
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
            onClick={() => setActiveTab('entrada')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'entrada'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✅ Forzar Entrada
          </button>
          <button
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

      {/* Main Grid: Video Stream Camera (2 cols) & Controls Side (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Camera View Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] border-cyan-500/20 shadow-2xl">
            
            <div id={videoContainerId} className="w-full max-w-md h-full rounded-2xl overflow-hidden shadow-inner border border-white/10 bg-black relative">
              
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#080b12] z-10">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl animate-pulse">
                    🎥
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">Cámara Inactiva</h3>
                    <p className="text-gray-400 text-xs max-w-xs mx-auto">Activa la cámara del dispositivo para iniciar el escaneo continuo de credenciales de alumnos.</p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-sm shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:scale-105 transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Play size={16} fill="black" />
                    <span>Iniciar Cámara web</span>
                  </button>
                </div>
              )}

              {/* Scanning Laser visual animation line when camera active */}
              {scanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent top-1/2 -translate-y-1/2 shadow-[0_0_15px_#00f2fe] z-20 animate-pulse pointer-events-none"></div>
              )}
            </div>

            {scanning && (
              <div className="mt-4 flex items-center space-x-4">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl glass-panel text-xs text-red-400 font-bold hover:bg-red-500/10 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>⏹ Detener Cámara</span>
                </button>
              </div>
            )}

            {/* Scan Alert Notification Card overlay */}
            {activeScan && (
              <div className={`mt-6 w-full max-w-md p-5 rounded-2xl border text-sm flex items-start space-x-3.5 animate-slide-up shadow-2xl ${
                activeScan.success
                  ? activeScan.duplicate
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {activeScan.success ? (
                  activeScan.duplicate ? (
                    <AlertCircle size={24} className="shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <CheckCircle size={24} className="shrink-0 text-emerald-400 mt-0.5" />
                  )
                ) : (
                  <ShieldAlert size={24} className="shrink-0 text-red-400 mt-0.5" />
                )}

                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-white text-base">
                    {activeScan.student 
                      ? `${activeScan.student.nombre} ${activeScan.student.apellido_paterno}`
                      : 'Notificación de Escaneo'}
                  </h4>
                  <p className="text-xs leading-relaxed">{activeScan.msg}</p>
                  
                  {activeScan.asistencia && (
                    <div className="flex items-center space-x-4 text-[11px] pt-2 text-gray-300 font-mono">
                      <span>Hora: {activeScan.asistencia.hora}</span>
                      <span>•</span>
                      <span>Tutor: {activeScan.student?.tutor}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Simulator for Quick Evaluation & Manual Input */}
        <div className="space-y-6">
          
          {/* Section 1: Simulated QR Scan for Testing without physical camera */}
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/20 space-y-4 bg-gradient-to-b from-[#0e1322] to-[#08090d]">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⚡</span>
              <h3 className="text-base font-bold text-white">Escaneo Simulado de Prueba</h3>
            </div>
            <p className="text-gray-400 text-xs">Prueba el registro instantáneo con sonido, notificación a WhatsApp y animación seleccionando un alumno:</p>

            {students.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">No hay alumnos registrados.</div>
            ) : (
              <div className="space-y-3">
                <select
                  value={simulatedStudentId}
                  onChange={(e) => setSimulatedStudentId(e.target.value)}
                  className="w-full glass-input py-2.5 px-3 rounded-xl text-xs text-white bg-[#0a0f1d] border-white/10"
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Simular Lectura QR</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Manual Matricula Form */}
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/10 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Ingreso Manual por Matrícula</h3>
              <p className="text-gray-400 text-xs">Si la credencial presenta desgaste, digite la matrícula manualmente:</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={manualMatricula}
                    onChange={(e) => setManualMatricula(e.target.value)}
                    placeholder="Ej. DOJ-2026-001"
                    className="w-full glass-input py-2.5 pl-4 pr-12 rounded-xl text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
