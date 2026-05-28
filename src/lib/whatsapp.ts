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

// Format the specific messages required by the user
export const formatWhatsAppMessage = (alumno: Alumno, log: Asistencia): string => {
  const isEntrada = log.tipo === 'entrada';
  const estadoEmoji = isEntrada ? '✅ ENTRÓ' : '✅ SALIÓ';
  const preposicion = isEntrada ? 'a la' : 'de la';
  
  // Format Date to: "27 Mayo 2026"
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dateObj = new Date(log.fecha + 'T00:00:00');
  const dia = dateObj.getDate();
  const mes = meses[dateObj.getMonth()];
  const anio = dateObj.getFullYear();
  const fechaFormateada = `${dia} ${mes} ${anio}`;

  // Format Time to: "7:12 AM" or similar
  let horaFormateada = log.hora;
  try {
    const [h, m] = log.hora.split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    horaFormateada = `${displayHours}:${m} ${ampm}`;
  } catch (e) {
    // Fallback if formatting fails
  }

  return `📚 Escuela DOJOIA

Hola Sr./Sra. ${alumno.tutor}.

Le informamos que el alumno:
👦 ${alumno.nombre}

${estadoEmoji} ${preposicion} escuela.

🕒 Hora: ${horaFormateada}
📅 Fecha: ${fechaFormateada}

Gracias por utilizar DOJOIA ACCESS.`;
};

// Send WhatsApp trigger (Mock + Live support)
export const sendWhatsAppNotification = async (
  alumno: Alumno,
  log: Asistencia
): Promise<{ success: boolean; simulated: boolean; logEntry?: WhatsAppLog }> => {
  const messageText = formatWhatsAppMessage(alumno, log);
  const useTwilio = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );

  const timestamp = new Date().toISOString();
  
  const logEntry: WhatsAppLog = {
    id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    alumno_id: alumno.id,
    alumno_nombre: alumno.nombre,
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
        return { success: false, simulated: false, logEntry };
      }
      
      logEntry.status = 'sent';
      saveLogToLocal(logEntry);
      return { success: true, simulated: false, logEntry };
    } catch (err) {
      console.error('Error triggering Twilio WhatsApp API:', err);
      logEntry.status = 'failed';
      saveLogToLocal(logEntry);
      return { success: false, simulated: false, logEntry };
    }
  }

  // 2. Fallback: Simulated send (save to local storage so dashboard phone can review)
  saveLogToLocal(logEntry);
  return { success: true, simulated: true, logEntry };
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
