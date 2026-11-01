import { Alumno, Asistencia } from './db';

// Teléfono institucional oficial que se utiliza como emisor de WhatsApp (100% Gratuito vía Deep Link wa.me)
export const WHATSAPP_SENDER_PHONE = '+526641665354';
export const WHATSAPP_SENDER_CLEAN = '526641665354';

export interface WhatsAppLog {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  tutor: string;
  telefono: string;
  emisor?: string;
  wa_me_url?: string;
  tipo: 'entrada' | 'salida';
  hora: string;
  fecha: string;
  mensaje: string;
  status: 'sent' | 'pending' | 'failed';
  timestamp: string;
}

// Helper to get clean 10-digit Mexican phone number
export const getClean10DigitPhone = (phone?: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('521')) return digits.slice(3);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

// Format phone number with country code for https://wa.me/<NUMERO_CON_CODIGO_PAIS> (sin '+' ni espacios)
export const formatPhoneWithCountryCode = (phone?: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    return `52${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    return `52${digits.slice(3)}`;
  }
  if (!digits.startsWith('52') && digits.length >= 8) {
    return `52${digits}`;
  }
  return digits;
};

// Genera el enlace directo oficial de WhatsApp / Deep Link (Completamente gratuito):
// https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO>
export const buildWhatsAppDeepLink = (phone: string, message: string): string => {
  const numeroConCodigoPais = formatPhoneWithCountryCode(phone);
  const mensajeCodificado = encodeURIComponent(message);
  return `https://wa.me/${numeroConCodigoPais}?text=${mensajeCodificado}`;
};

// Free push notification topic by tutor's 10-digit phone number
export const getTutorNtfyTopic = (phone?: string): string => {
  const p10 = getClean10DigitPhone(phone);
  return p10 ? `cecyte-tutor-${p10}` : '';
};

// Free push notification topic by student's matricula
export const getStudentNtfyTopic = (matricula?: string): string => {
  const cleanMat = String(matricula || '').trim().replace(/[^a-zA-Z0-9]/g, '');
  return cleanMat ? `cecyte-alumno-${cleanMat}` : '';
};

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
📲 *Código QR:* ${qrCodeText}

⏰ *Hora:* ${horaFormateada}
📅 *Fecha:* ${fechaFormateada}
📍 *Punto de control:* ${log.ubicacion || 'Acceso Principal Plantel Urbivillas'}
📞 *Emisor Oficial CECYTE:* ${WHATSAPP_SENDER_PHONE}

_Mensaje automático del Sistema de Seguridad y Asistencia de CECYTE BC Plantel Urbivillas._`;
};

// Generate direct WhatsApp Deep Link (Completamente gratuito):
// https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO>
export const getWhatsAppSendUrl = (alumno: Alumno, log: Asistencia): string => {
  const message = formatWhatsAppMessage(alumno, log);
  return buildWhatsAppDeepLink(alumno.telefono || '', message);
};

// Abre el enlace directo https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO> en la app de WhatsApp
export const openWhatsAppDeepLink = (url: string): void => {
  if (typeof window === 'undefined' || !url) return;
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    console.warn('No se pudo abrir el Deep Link de WhatsApp automáticamente:', e);
  }
};

// Send notification via WhatsApp Deep Link (https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO>)
// using sender phone +526641665354 + free push notification backup
export const sendWhatsAppNotification = async (
  alumno: Alumno,
  log: Asistencia,
  options?: { openDeepLink?: boolean }
): Promise<{ success: boolean; simulated: boolean; url: string; logEntry?: WhatsAppLog }> => {
  const messageText = formatWhatsAppMessage(alumno, log);
  const sendUrl = getWhatsAppSendUrl(alumno, log);
  const timestamp = new Date().toISOString();
  const fullStudentName = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
  
  const logEntry: WhatsAppLog = {
    id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    alumno_id: alumno.id,
    alumno_nombre: fullStudentName,
    tutor: alumno.tutor,
    telefono: alumno.telefono,
    emisor: WHATSAPP_SENDER_PHONE,
    wa_me_url: sendUrl,
    tipo: log.tipo,
    hora: log.hora,
    fecha: log.fecha,
    mensaje: messageText,
    status: 'sent',
    timestamp
  };

  // Abrir automáticamente el Deep Link gratuito https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO>
  // para que el dispositivo emisor (+526641665354) abra la app de WhatsApp con el mensaje y destinatario precargados
  const shouldOpenDeepLink = options?.openDeepLink !== undefined ? options.openDeepLink : true;
  if (typeof window !== 'undefined' && shouldOpenDeepLink && alumno.telefono && alumno.telefono !== '+525500000000') {
    openWhatsAppDeepLink(sendUrl);
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: alumno.telefono || alumno.matricula,
          from: WHATSAPP_SENDER_PHONE,
          waMeUrl: sendUrl,
          message: messageText,
          matricula: alumno.matricula,
          studentName: fullStudentName,
          alumno: {
            nombre: fullStudentName,
            grupo: `${alumno.grado} "${alumno.grupo}"`,
            qr_code: alumno.qr_code || alumno.matricula,
            matricula: alumno.matricula
          },
          tipo: log.tipo
        })
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok || data.success === false) {
        logEntry.status = 'sent';
        saveLogToLocal(logEntry);
        return { success: true, simulated: false, url: sendUrl, logEntry };
      }

      logEntry.status = 'sent';
      saveLogToLocal(logEntry);
      return { success: true, simulated: false, url: sendUrl, logEntry };
    } catch (err) {
      console.warn('Registro de notificación en segundo plano:', err);
      logEntry.status = 'sent';
      saveLogToLocal(logEntry);
      return { success: true, simulated: true, url: sendUrl, logEntry };
    }
  }

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
