'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, Alumno } from '@/lib/db';
import { getClean10DigitPhone, getStudentNtfyTopic, getTutorNtfyTopic } from '@/lib/whatsapp';
import {
  Bell,
  BellRing,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
  Search,
  LogIn,
  LogOut,
  Clock,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  Radio
} from 'lucide-react';

interface PushAlertItem {
  id: string;
  time: number;
  title: string;
  message: string;
  tipo: 'entrada' | 'salida';
  formattedTime: string;
}

function TutorMobilePortalContent() {
  const searchParams = useSearchParams();
  const initialMatricula = searchParams.get('matricula') || '';
  const initialTel = searchParams.get('tel') || '';

  const [queryInput, setQueryInput] = useState(initialMatricula || initialTel);
  const [selectedStudent, setSelectedStudent] = useState<Alumno | null>(null);
  const [allStudents, setAllStudents] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<PushAlertItem[]>([]);
  const [latestPopup, setLatestPopup] = useState<PushAlertItem | null>(null);
  const [isConnectedSSE, setIsConnectedSSE] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [copiedTopic, setCopiedTopic] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());

  // Play notification chime on tutor's cell phone using Web Audio API
  const playNotificationSound = (tipo: 'entrada' | 'salida') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const freqs = tipo === 'entrada' ? [587.33, 880, 1174.66] : [659.25, 523.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.14);
        gain.gain.setValueAtTime(0.25, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.36);
      });
    } catch {}
  };

  // Trigger native mobile browser notification + vibration
  const triggerPhoneAlert = (item: PushAlertItem, isHistorical = false) => {
    if (isHistorical) return;

    playNotificationSound(item.tipo);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 120, 300, 120, 450]);
      } catch {}
    }

    setLatestPopup(item);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(item.title, {
          body: item.message.slice(0, 220),
          tag: item.id,
          requireInteraction: true
        });
      } catch {}
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        playNotificationSound('entrada');
      }
    } catch {}
  };

  // Load students database
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await db.getAlumnos();
        setAllStudents(list);

        // Remember last student from localStorage if no URL param
        const savedMat = typeof window !== 'undefined' ? localStorage.getItem('cecyte_tutor_saved_matricula') : '';
        const targetMat = (initialMatricula || savedMat || '').trim();
        const targetTel = getClean10DigitPhone(initialTel);

        if (targetMat) {
          const found = list.find(
            (s) =>
              s.matricula.toUpperCase() === targetMat.toUpperCase() ||
              s.qr_code?.toUpperCase() === targetMat.toUpperCase()
          );
          if (found) {
            setSelectedStudent(found);
            setQueryInput(found.matricula);
          }
        } else if (targetTel && targetTel.length >= 10) {
          const found = list.find((s) => getClean10DigitPhone(s.telefono) === targetTel);
          if (found) {
            setSelectedStudent(found);
            setQueryInput(found.matricula);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialMatricula, initialTel]);

  const handleSearchStudent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    const clean = queryInput.trim();
    if (!clean) return;

    const cleanDigits = getClean10DigitPhone(clean);
    const found = allStudents.find(
      (s) =>
        s.matricula.toUpperCase() === clean.toUpperCase() ||
        s.qr_code?.toUpperCase() === clean.toUpperCase() ||
        (cleanDigits.length === 10 && getClean10DigitPhone(s.telefono) === cleanDigits)
    );

    if (found) {
      setSelectedStudent(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cecyte_tutor_saved_matricula', found.matricula);
      }
      requestNotificationPermission();
    } else {
      setSearchError(
        `No se encontró ningún alumno con la matrícula o teléfono "${clean}". Verifica los 14 dígitos de la matrícula.`
      );
    }
  };

  // Connect to live ntfy.sh SSE stream for this student & tutor phone (100% Free Push)
  useEffect(() => {
    if (!selectedStudent) return;

    const studentTopic = getStudentNtfyTopic(selectedStudent.matricula);
    const tutorTopic = getTutorNtfyTopic(selectedStudent.telefono);
    const topics = Array.from(new Set([studentTopic, tutorTopic].filter(Boolean)));
    if (topics.length === 0) return;

    const topicsPath = topics.join(',');
    let eventSource: EventSource | null = null;
    let isMounted = true;

    const parseNtfyEvent = (rawJson: string, isHistorical: boolean) => {
      try {
        const data = JSON.parse(rawJson);
        if (!data || data.event !== 'message' || !data.id) return;
        if (seenIdsRef.current.has(data.id)) return;
        seenIdsRef.current.add(data.id);

        const msgText: string = data.message || '';
        const titleText: string =
          data.title || '🏫 CECYTE BC Urbivillas - Aviso de Asistencia';
        const isSalida =
          titleText.toUpperCase().includes('SALIDA') ||
          msgText.toUpperCase().includes('SALIDA DEL PLANTEL');
        const tsMs = (data.time ? data.time * 1000 : Date.now());
        const d = new Date(tsMs);

        const item: PushAlertItem = {
          id: data.id,
          time: tsMs,
          title: titleText,
          message: msgText,
          tipo: isSalida ? 'salida' : 'entrada',
          formattedTime: d.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };

        if (!isMounted) return;
        setAlerts((prev) => {
          const combined = [item, ...prev.filter((p) => p.id !== item.id)];
          return combined.sort((a, b) => b.time - a.time).slice(0, 30);
        });

        triggerPhoneAlert(item, isHistorical);
      } catch {}
    };

    // 1. Fetch last 12h of alerts so the tutor immediately sees recent entries/exits
    fetch(`https://ntfy.sh/${topicsPath}/json?poll=1&since=12h`)
      .then((r) => r.text())
      .then((text) => {
        if (!isMounted || !text) return;
        const lines = text.trim().split('\n');
        lines.forEach((line) => {
          if (line.trim()) parseNtfyEvent(line, true);
        });
      })
      .catch(() => {});

    // 2. Open real-time SSE connection for instant zero-cost push alerts
    try {
      eventSource = new EventSource(`https://ntfy.sh/${topicsPath}/sse`);
      eventSource.onopen = () => {
        if (isMounted) setIsConnectedSSE(true);
      };
      eventSource.onmessage = (ev) => {
        parseNtfyEvent(ev.data, false);
      };
      eventSource.onerror = () => {
        if (isMounted) setIsConnectedSSE(false);
      };
    } catch {}

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedStudent]);

  // Send a free test push notification to verify on the tutor's phone right now
  const handleSendTestPush = async () => {
    if (!selectedStudent || sendingTest) return;
    setSendingTest(true);
    try {
      const fullName = `${selectedStudent.nombre} ${selectedStudent.apellido_paterno} ${selectedStudent.apellido_materno || ''}`.trim();
      const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const testMessage = `🏫 *CECYTE BC - PLANTEL URBIVILLAS*\n✅ *PRUEBA DE NOTIFICACIÓN GRATUITA EXITOSA*\n\n👤 *Alumno:* ${fullName}\n🏷️ *Grupo:* ${selectedStudent.grado} "${selectedStudent.grupo}"\n🆔 *Matrícula:* ${selectedStudent.matricula}\n⏰ *Hora:* ${nowTime}\n\n🔔 Tu celular está vinculado correctamente para recibir avisos de INGRESO y SALIDA sin ningún costo ($0.00 MXN).`;

      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedStudent.telefono || selectedStudent.matricula,
          matricula: selectedStudent.matricula,
          studentName: fullName,
          tipo: 'entrada',
          message: testMessage
        })
      });
    } finally {
      setSendingTest(false);
    }
  };

  const studentTopic = selectedStudent ? getStudentNtfyTopic(selectedStudent.matricula) : '';

  const handleCopyTopic = () => {
    if (!studentTopic) return;
    navigator.clipboard.writeText(studentTopic);
    setCopiedTopic(true);
    setTimeout(() => setCopiedTopic(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#040812] text-white p-4 pb-16 font-sans">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header Institucional */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0c192e] via-[#081221] to-[#050b14] border border-cyan-500/30 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <BellRing className="text-black" size={24} />
              </div>
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles size={10} />
                  <span>100% Gratis • Sin Cobro ($0 MXN)</span>
                </span>
                <h1 className="text-lg font-black text-white mt-0.5">
                  CECYTE BC • Avisos al Tutor
                </h1>
                <p className="text-xs text-gray-400">
                  Notificaciones en vivo de Ingreso y Salida en tu celular
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title={soundEnabled ? 'Sonido de alerta activo' : 'Sonido en silencio'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          {/* Search / Link Student Form */}
          <form onSubmit={handleSearchStudent} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Ingresa Matrícula (14 dígitos) o Teléfono..."
                className="w-full bg-black/60 border border-cyan-500/30 focus:border-cyan-400 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white font-mono placeholder-gray-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs cursor-pointer shrink-0 shadow-lg shadow-emerald-500/20"
            >
              Conectar
            </button>
          </form>

          {searchError && (
            <p className="mt-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
              {searchError}
            </p>
          )}
        </div>

        {/* Live Popup Banner when a new notification arrives */}
        {latestPopup && (
          <div
            className={`rounded-3xl p-5 border-2 shadow-2xl animate-bounce ${
              latestPopup.tipo === 'entrada'
                ? 'bg-gradient-to-br from-emerald-950 to-[#061c17] border-emerald-400 shadow-emerald-500/30'
                : 'bg-gradient-to-br from-rose-950 to-[#1f0812] border-rose-400 shadow-rose-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2">
                {latestPopup.tipo === 'entrada' ? (
                  <LogIn className="text-emerald-400" size={22} />
                ) : (
                  <LogOut className="text-rose-400" size={22} />
                )}
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  {latestPopup.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLatestPopup(null)}
                className="text-xs text-gray-300 hover:text-white px-2 py-0.5 rounded-lg bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <pre className="mt-3 text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-3 rounded-2xl border border-white/10">
              {latestPopup.message}
            </pre>
          </div>
        )}

        {/* Active Student Card */}
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-[#091324] border border-emerald-500/30 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                  <Radio size={15} className={isConnectedSSE ? 'animate-pulse text-emerald-400' : 'text-amber-400'} />
                  <span>
                    {isConnectedSSE
                      ? 'Conectado en Vivo • Recibiendo Alertas Gratis'
                      : 'Sincronizando canal de alertas...'}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  Grupo {selectedStudent.grupo}
                </span>
              </div>

              <div className="flex items-center space-x-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    selectedStudent.foto_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudent.matricula}`
                  }
                  alt={selectedStudent.nombre}
                  className="w-16 h-16 rounded-2xl border border-white/15 bg-black/50 object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-white truncate">
                    {selectedStudent.nombre} {selectedStudent.apellido_paterno}{' '}
                    {selectedStudent.apellido_materno || ''}
                  </h2>
                  <p className="text-xs text-cyan-400 font-mono">
                    Matrícula: {selectedStudent.matricula}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    Tutor: <strong className="text-gray-200">{selectedStudent.tutor}</strong> • Tel:{' '}
                    <span className="font-mono text-emerald-400">{selectedStudent.telefono}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Enable Browser Push + Test Notification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                {notifPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="w-full py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Bell size={15} />
                    <span>Permitir Notificaciones en Celular</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5">
                    <CheckCircle2 size={15} />
                    <span>Notificaciones Activas en este Celular</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={sendingTest}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando prueba...</span>
                    </>
                  ) : (
                    <>
                      <BellRing size={14} />
                      <span>📲 Probar Alerta en mi Celular</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Option for 24/7 Lock-Screen Push via free ntfy app */}
            <div className="rounded-3xl bg-[#07101e] border border-cyan-500/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-cyan-300 flex items-center space-x-1.5">
                  <Smartphone size={15} />
                  <span>¿Quieres recibir alertas con la pantalla apagada?</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Gratis / Sin Cobro
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                1. Deja esta página abierta o agrégala a tu <strong>Pantalla de Inicio</strong>, O BIEN instala la app gratuita <strong>ntfy</strong> (Android / iPhone) y suscríbete al código de tu hijo(a):
              </p>

              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/70 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all">
                  {studentTopic}
                </code>
                <button
                  type="button"
                  onClick={handleCopyTopic}
                  className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  {copiedTopic ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedTopic ? 'Copiado' : 'Copiar'}</span>
                </button>
                <a
                  href={`ntfy://ntfy.sh/${studentTopic}`}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center space-x-1 shrink-0"
                >
                  <ExternalLink size={14} />
                  <span>Abrir App</span>
                </a>
              </div>
            </div>

            {/* Live Attendance Feed */}
            <div className="rounded-3xl bg-[#08101d] border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center space-x-2">
                  <Clock size={16} className="text-cyan-400" />
                  <span>Historial de Avisos Recibidos Hoy</span>
                </h3>
                <span className="text-xs text-gray-400">{alerts.length} avisos</span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <ShieldCheck size={32} className="mx-auto text-emerald-400/60" />
                  <p className="text-xs text-gray-300 font-semibold">
                    Listo y esperando el próximo registro de entrada o salida.
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Presiona el botón &quot;📲 Probar Alerta en mi Celular&quot; arriba para verificar el sonido y vibración ahora mismo.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className={`p-3.5 rounded-2xl border ${
                        al.tipo === 'entrada'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span
                          className={
                            al.tipo === 'entrada' ? 'text-emerald-300' : 'text-rose-300'
                          }
                        >
                          {al.title}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400">
                          {al.formattedTime}
                        </span>
                      </div>
                      <pre className="text-[11px] text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {al.message}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="rounded-3xl bg-[#08111f] border border-white/10 p-6 text-center space-y-3">
              <UserCheck size={36} className="mx-auto text-cyan-400" />
              <h2 className="text-base font-black text-white">
                Conecta la Matrícula de tu Hijo(a)
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Escribe arriba los 14 dígitos de la matrícula escolar (por ejemplo{' '}
                <code className="text-cyan-300">26402080282423</code>) o tu número de celular de 10 dígitos para recibir en vivo cada entrada y salida del plantel sin ningún costo.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function TutorMobilePortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040812] text-white flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Cargando Portal Móvil de Notificaciones Gratis...</p>
          </div>
        </div>
      }
    >
      <TutorMobilePortalContent />
    </Suspense>
  );
}

