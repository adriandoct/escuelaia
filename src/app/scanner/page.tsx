"use strict";

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Alumno, Asistencia } from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { 
  Camera, AlertCircle, CheckCircle, RefreshCw, Smartphone, Volume2, ShieldAlert, UserCheck, Play, ArrowRight, UserX
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ScannerPage() {
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

  // Sound generator using HTML5 Web Audio API (No files required!)
  const playBeep = (type: 'success' | 'error' | 'duplicate') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // High pitched pleasant double-beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
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
          osc2.frequency.setValueAtTime(1109, ctx2.currentTime); // C#6 note
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.15);
        }, 120);

      } else if (type === 'duplicate') {
        // Warning dual buzz tones
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, ctx.currentTime); // E3 note
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Low pitched error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime); // Low buzz
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
      
      // Stop any existing instance
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
          // Success callback
          await processScanResult(decodedText);
        },
        () => {
          // Silent errors (searching for QR code)
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
      // Temporarily halt scanning to display student popup card
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.pause(true);
      }

      // Convert override tab values to parameters
      const overrideVal = activeTab === 'auto' ? undefined : activeTab;
      
      // Save check-in
      const { asistencia, alumno, duplicateWarning } = await db.registrarAsistencia(
        matricula,
        overrideVal
      );

      // Trigger parents notification SMS/WhatsApp (runs in background)
      await sendWhatsAppNotification(alumno, asistencia);

      // UI Reactions
      if (duplicateWarning) {
        playBeep('duplicate');
        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `Acceso Registrado (${asistencia.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}).`,
          duplicate: true
        });
      } else {
        playBeep('success');
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.8 }
        });
        setActiveScan({
          success: true,
          student: alumno,
          asistencia,
          msg: `¡Acceso Exitoso! ${asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente.`
        });
      }

      // Auto close/resume scan after 4.5 seconds
      setTimeout(async () => {
        handleDismissScan();
      }, 4500);

    } catch (error: any) {
      playBeep('error');
      setActiveScan({
        success: false,
        msg: error.message || 'Código QR no reconocido o error en el sistema.'
      });

      setTimeout(async () => {
        handleDismissScan();
      }, 4500);
    }
  };

  const handleDismissScan = async () => {
    setActiveScan(null);
    if (scanning && scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        // If resume fails, restart camera
        startCamera();
      }
    }
  };

  // Action bypass triggers
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatricula.trim()) return;
    processScanResult(manualMatricula.trim());
    setManualMatricula('');
  };

  const handleSimulatedScan = () => {
    if (!simulatedStudentId) return;
    processScanResult(simulatedStudentId);
  };

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Registro de Accesos QR</h2>
          <p className="text-gray-400 text-sm mt-1">Escanea credenciales de alumnos para controlar su ingreso/salida y notificar a sus acudientes.</p>
        </div>

        {/* Access mode selection bar */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
          {(['auto', 'entrada', 'salida'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/10' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'auto' ? '🔄 Inteligente' : tab === 'entrada' ? '✅ Entrada' : '🚪 Salida'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Scanner Panel (2 cols) | Right Simulator/Logs Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left Side: Scanner Camera Wrapper */}
        <div className="lg:col-span-2 flex flex-col">
          
          <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col border-cyan-500/10 min-h-[400px] relative">
            
            {/* Ambient Background glow while scanning */}
            {scanning && (
              <div className="absolute inset-0 bg-cyan-500/[0.02] pulse-border pointer-events-none z-0"></div>
            )}

            {/* Title Bar */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between z-10 bg-black/20 backdrop-blur-sm">
              <div className="flex items-center space-x-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${scanning ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  {scanning ? 'Cámara de Acceso Activa' : 'Cámara Desactivada'}
                </span>
              </div>

              {scanning ? (
                <button
                  onClick={stopCamera}
                  className="text-xs text-red-400 font-semibold hover:underline cursor-pointer"
                >
                  Detener Cámara
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Encender Cámara</span>
                </button>
              )}
            </div>

            {/* Video Container Area */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 relative min-h-[300px]">
              
              {/* Webcam view element wrapper */}
              <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-black/60 border border-white/5 shadow-2xl flex items-center justify-center">
                
                {/* 1. Camera Video Feed target element */}
                <div 
                  id={videoContainerId} 
                  className={`w-full h-full object-cover transition-opacity ${scanning ? 'opacity-100' : 'opacity-0 absolute'}`}
                ></div>

                {/* 2. Custom Neon Scanner Overlays */}
                {scanning && !activeScan && (
                  <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-1">
                    
                    {/* Scanner Target Frame Border box */}
                    <div className="absolute inset-[15%] corner-border">
                      {/* Laser Line */}
                      <div className="scanner-laser"></div>
                      <span></span>
                    </div>

                    <div className="w-full text-center bg-black/50 py-1.5 text-[10px] text-gray-400 backdrop-blur-sm mt-auto z-20 font-medium">
                      Coloque el código QR dentro del marco
                    </div>
                  </div>
                )}

                {/* 3. Camera Disabled/Off Display placeholder */}
                {!scanning && !activeScan && (
                  <div className="text-center space-y-4 p-8 z-10">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto text-3xl">
                      📷
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">Dispositivo de Acceso Escolar</h4>
                      <p className="text-gray-500 text-xs max-w-[240px] mx-auto">Active la cámara para iniciar el escaneo inteligente de códigos QR.</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
                    >
                      Permitir y Encender
                    </button>
                  </div>
                )}

                {/* 4. Active scan RESULT feedback card overlays */}
                {activeScan && (
                  <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in ${
                    !activeScan.success 
                      ? 'glass-panel-red-glow' 
                      : activeScan.duplicate 
                        ? 'glass-panel-glow border-amber-500/30' 
                        : 'glass-panel-green-glow'
                  }`}>
                    
                    {/* Access Result Icon and Header */}
                    {activeScan.success ? (
                      activeScan.duplicate ? (
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
                          <ShieldAlert size={28} />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                          <CheckCircle size={28} />
                        </div>
                      )
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-bounce">
                        <UserX size={28} />
                      </div>
                    )}

                    {/* Student details display on successful scan */}
                    {activeScan.success && activeScan.student && activeScan.asistencia && (
                      <div className="space-y-4 w-full">
                        {/* Student Avatar */}
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 mx-auto shadow-xl bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={activeScan.student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeScan.student.matricula}`} 
                            alt={activeScan.student.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Text Meta */}
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            activeScan.duplicate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : activeScan.asistencia.tipo === 'entrada'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {activeScan.duplicate 
                              ? '⚠️ DUPLICADO EN 30s' 
                              : activeScan.asistencia.tipo === 'entrada' 
                                ? '✅ ENTRADA REGISTRADA' 
                                : '🚪 SALIDA REGISTRADA'}
                          </span>
                          <h3 className="text-xl font-black text-white">{activeScan.student.nombre}</h3>
                          <p className="text-xs text-gray-400 font-semibold">{activeScan.student.grado} &quot;{activeScan.student.grupo}&quot; • <span className="font-mono">{activeScan.student.matricula}</span></p>
                        </div>

                        {/* Timestamp logs & whatsapp prompt */}
                        <div className="bg-black/40 border border-white/5 rounded-xl py-2 px-3 inline-flex items-center space-x-2 text-xs font-semibold text-gray-300">
                          <span>🕒 {activeScan.asistencia.hora}</span>
                          <span>•</span>
                          <span className="text-emerald-400">💬 Envío WhatsApp listo</span>
                        </div>
                      </div>
                    )}

                    {/* Error display */}
                    {!activeScan.success && (
                      <div className="space-y-2 max-w-xs">
                        <h3 className="text-lg font-black text-white">Denegado / No Registrado</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{activeScan.msg}</p>
                      </div>
                    )}

                    {/* Resume Scanner Button override */}
                    <button
                      onClick={handleDismissScan}
                      className="mt-6 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-bold transition-all cursor-pointer"
                    >
                      Continuar Escaneo
                    </button>

                  </div>
                )}

              </div>

            </div>

            {/* Bottom Status bar */}
            {cameraPermission === false && (
              <div className="bg-red-500/10 border-t border-red-500/20 px-6 py-3 flex items-center space-x-2 text-xs text-red-400 z-10">
                <AlertCircle size={16} />
                <span>Error de acceso a la cámara. Verifique que posee webcam y ha brindado permisos en el navegador.</span>
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Control Panels, Scan Simulator, and Manual Override */}
        <div className="space-y-6">
          
          {/* Section 1: Demonstration Scan Simulator */}
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/10 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Simulador de Acceso</h3>
              <p className="text-gray-400 text-xs">Utiliza este simulador para probar los flujos de entrada, sonido, confeti y WhatsApp sin usar la cámara.</p>
            </div>

            {students.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-4 bg-black/20 border border-white/5 rounded-xl">
                Agrega alumnos en el directorio primero.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Seleccionar Alumno</label>
                  <select
                    value={simulatedStudentId}
                    onChange={(e) => setSimulatedStudentId(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-sm font-medium"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.matricula}>
                        {s.nombre} ({s.matricula})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSimulatedScan}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all cursor-pointer"
                >
                  <Play size={14} />
                  <span>Simular Lectura QR</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Manual Matricula Override Form */}
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/10 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Ingreso Manual</h3>
              <p className="text-gray-400 text-xs">Si el código QR de la credencial está deteriorado o no se dispone de lector, digite la matrícula manualmente.</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Matrícula o Código</label>
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

          {/* Section 3: User Advice Guidelines */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-3 text-xs text-gray-400 leading-relaxed">
            <h4 className="font-bold text-white">💡 Consejos para escaneo óptimo:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Asegure iluminación de frente en las credenciales impresas.</li>
              <li>Mantenga la lente de la cámara limpia.</li>
              <li>Ajuste el brillo de la pantalla de celulares a 100% si lee códigos QR digitales.</li>
              <li>La detección inteligente alternará automáticamente el tipo de registro (Entrada ⇄ Salida) en base a los registros previos del alumno en el día.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
