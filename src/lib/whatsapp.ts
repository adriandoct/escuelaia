import { Alumno, Asistencia } from './db';

export interface WhatsAppLog {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  tutor: string;
  telefono: string;
  tipo: 'entrada' | 'salida';
  hora: string;
  fecha: string;
  mensaje: string;
  status: 'sent' | 'pending' | 'failed';
  timestamp: string;
}

// Format the specific messages required by the user for Plantel Urbivillas
export const formatWhatsAppMessage = (alumno: Alumno, log: Asistencia): string => {
  const isEntrada = log.tipo === 'entrada';
  
  // Condicional de INGRESO o SALIDA en MAYÚSCULAS y en NEGRITAS (*...*)
  const estadoPrincipal = isEntrada
    ? '*EL ALUMNO ENTRÓ AL PLANTEL (INGRESO)*'
    : '*EL ALUMNO YA SALIÓ DEL PLANTEL (SALIDA)*';

  const estadoBadge = isEntrada ? '🟢 INGRESO REGISTRADO' : '🔴 SALIDA REGISTRADA';

  // Format Date to: "26 de Octubre de 2026"
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  let fechaFormateada = log.fecha;
  try {
    const dateObj = new Date(log.fecha + 'T00:00:00');
    const dia = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    fechaFormateada = `${dia} de ${mes} de ${anio}`;
  } catch (e) {}

  // Format Time to: "7:12 AM" or similar
  let horaFormateada = log.hora;
  try {
    const [h, m] = log.hora.split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    horaFormateada = `${displayHours}:${m} ${ampm}`;
  } catch (e) {}

  const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
  const tutorSaludo = alumno.tutor ? alumno.tutor : 'Padre / Madre de Familia o Tutor';
  const qrCodeText = alumno.qr_code || alumno.matricula;

  return `🏫 *CECYTE BC - PLANTEL URBIVILLAS*
🛡️ *SISTEMA DE ASISTENCIA Y CONTROL ESCOLAR*

Estimado(a) *${tutorSaludo}*, le saludamos cordialmente de parte del *PLANTEL URBIVILLAS*.

Le informamos que:

${estadoPrincipal}
(${estadoBadge})

📋 *DATOS DEL ALUMNO:*
👤 *Nombre Completo:* ${nombreCompleto}
🏷️ *Grupo:* ${alumno.grado} "${alumno.grupo}"
🆔 *Matrícula:* ${alumno.matricula}
📲 *Código de Barra:* ${qrCodeText}

⏰ *Hora:* ${horaFormateada}
📅 *Fecha:* ${fechaFormateada}
📍 *Punto de control:* ${log.ubicacion || 'Acceso Principal Plantel Urbivillas'}

_Mensaje automático del Sistema de Seguridad y Asistencia de CECYTE BC Plantel Urbivillas._`;
};

// Generate direct WhatsApp Web / API click link
export const getWhatsAppSendUrl = (alumno: Alumno, log: Asistencia): string => {
  const message = formatWhatsAppMessage(alumno, log);
  let cleanPhone = (alumno.telefono || '').replace(/[\s\-\(\)\+]/g, '');
  if (!cleanPhone.startsWith('52') && cleanPhone.length === 10) {
    cleanPhone = `52${cleanPhone}`;
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};

// Send WhatsApp trigger (Mock + Live support + Instant Auto-Open)
export const sendWhatsAppNotification = async (
  alumno: Alumno,
  log: Asistencia,
  options?: { autoOpen?: boolean }
): Promise<{ success: boolean; simulated: boolean; url: string; logEntry?: WhatsAppLog }> => {
  const messageText = formatWhatsAppMessage(alumno, log);
  const sendUrl = getWhatsAppSendUrl(alumno, log);
  const useTwilio = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );

  // Auto-open WhatsApp chat in new window/tab if requested
  if (options?.autoOpen && typeof window !== 'undefined' && alumno.telefono && alumno.telefono !== '+525500000000') {
    try {
      window.open(sendUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Ventana emergente de WhatsApp bloqueada por el navegador:', e);
    }
  }

  const timestamp = new Date().toISOString();
  
  const logEntry: WhatsAppLog = {
    id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    alumno_id: alumno.id,
    alumno_nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.replace(/\s+/g, ' ').trim(),
    tutor: alumno.tutor,
    telefono: alumno.telefono,
    tipo: log.tipo,
    hora: log.hora,
    fecha: log.fecha,
    mensaje: messageText,
    status: 'sent',
    timestamp
  };

  // 1. Live Twilio API dispatch if keys are present
  if (useTwilio) {
    try {
      // In Next.js App Router we would call a backend route or Server Action.
      // This client library code calls our api route:
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: alumno.telefono,
          message: messageText
        })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        logEntry.status = 'failed';
        saveLogToLocal(logEntry);
        return { success: false, simulated: false, url: sendUrl, logEntry };
      }
      
      logEntry.status = 'sent';
      saveLogToLocal(logEntry);
      return { success: true, simulated: false, url: sendUrl, logEntry };
    } catch (err) {
      console.error('Error triggering Twilio WhatsApp API:', err);
      logEntry.status = 'failed';
      saveLogToLocal(logEntry);
      return { success: false, simulated: false, url: sendUrl, logEntry };
    }
  }

  // 2. Fallback: Simulated send (save to local storage so dashboard phone can review)
  saveLogToLocal(logEntry);
  return { success: true, simulated: true, url: sendUrl, logEntry };
};

// Local storage logger for sandbox mode
const saveLogToLocal = (log: WhatsAppLog) => {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem('dojoia_whatsapp_logs');
  const list: WhatsAppLog[] = raw ? JSON.parse(raw) : [];
  list.unshift(log); // Add newest first
  localStorage.setItem('dojoia_whatsapp_logs', JSON.stringify(list.slice(0, 100))); // Keep last 100

  // Dispatch global event so the live logs panels refresh
  const event = new CustomEvent('dojoia_whatsapp_logs_updated', { detail: list });
  window.dispatchEvent(event);
};

export const getWhatsAppLogs = (): WhatsAppLog[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('dojoia_whatsapp_logs');
  return raw ? JSON.parse(raw) : [];
};

export const clearWhatsAppLogs = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dojoia_whatsapp_logs');
  // Dispatch empty update
  const event = new CustomEvent('dojoia_whatsapp_logs_updated', { detail: [] });
  window.dispatchEvent(event);
};
