import { NextResponse } from 'next/server';

const OFFICIAL_SENDER_PHONE = '+526641665354';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      to,
      message,
      matricula,
      studentName,
      tipo,
      callmebotApiKey,
      telegramBotToken,
      telegramChatId
    } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos: to, message' },
        { status: 400 }
      );
    }

    // Normalize phone to extract clean 10-digit Mexican number and country-code number (52 + 10 digits)
    const digitsOnly = String(to).replace(/\D/g, '');
    let phone10 = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith('52')) {
      phone10 = digitsOnly.slice(2);
    } else if (digitsOnly.length === 13 && digitsOnly.startsWith('521')) {
      phone10 = digitsOnly.slice(3);
    } else if (digitsOnly.length > 10) {
      phone10 = digitsOnly.slice(-10);
    }

    const numeroConCodigoPais = phone10.length === 10 ? `52${phone10}` : digitsOnly;
    // Enlace directo de WhatsApp / Deep Link (Completamente gratuito):
    // https://wa.me/<NUMERO_CON_CODIGO_PAIS>?text=<MENSAJE_CODIFICADO>
    const waMeDeepLink = `https://wa.me/${numeroConCodigoPais}?text=${encodeURIComponent(String(message))}`;

    const cleanMessage = String(message).replace(/\*/g, '');
    const isSalida =
      tipo === 'salida' ||
      String(message).toUpperCase().includes('SALIDA DEL PLANTEL');
    const eventTitle = isSalida
      ? `🚪 SALIDA CECYTE: ${studentName || 'Alumno'}`
      : `✅ INGRESO CECYTE: ${studentName || 'Alumno'}`;

    const channelsDelivered: string[] = ['wa_me_deeplink'];
    let primaryId: string | number | undefined;

    // =========================================================================
    // 1. CANAL 100% GRATUITO SIN COBRO: PUSH DIRECTO AL CELULAR (ntfy.sh)
    // Incluye el Deep Link https://wa.me/<NUMERO>?text=<MENSAJE> para el emisor +526641665354
    // =========================================================================
    const ntfyTopics = new Set<string>();
    ntfyTopics.add('cecyte-emisor-526641665354');
    if (phone10 && phone10.length >= 10) {
      ntfyTopics.add(`cecyte-tutor-${phone10}`);
    }
    if (matricula) {
      const cleanMat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, '');
      if (cleanMat) {
        ntfyTopics.add(`cecyte-alumno-${cleanMat}`);
      }
    }

    if (!matricula) {
      const matMatch = String(message).match(/Matr[íi]cula:\s*\*?(\d{8,16})\*?/i);
      if (matMatch?.[1]) {
        ntfyTopics.add(`cecyte-alumno-${matMatch[1]}`);
      }
    }

    if (ntfyTopics.size > 0) {
      await Promise.allSettled(
        Array.from(ntfyTopics).map(async (topic) => {
          try {
            const ntfyRes = await fetch('https://ntfy.sh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic,
                title: eventTitle,
                message: cleanMessage,
                priority: 5,
                click: waMeDeepLink,
                tags: isSalida ? ['door', 'school'] : ['white_check_mark', 'school'],
                actions: [
                  {
                    action: 'view',
                    label: '📲 Abrir en WhatsApp (Gratis)',
                    url: waMeDeepLink
                  }
                ]
              })
            });
            if (ntfyRes.ok) {
              channelsDelivered.push(`ntfy:${topic}`);
            }
          } catch (err) {
            console.warn(`[ntfy Push Error for ${topic}]:`, err);
          }
        })
      );
    }

    // =========================================================================
    // 2. CANAL 100% GRATUITO SIN COBRO: TELEGRAM BOT API ($0 MXN)
    // =========================================================================
    const tgToken = telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = telegramChatId || process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChat) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChat,
            text: message,
            parse_mode: 'Markdown'
          })
        });
        if (tgRes.ok) {
          channelsDelivered.push('telegram_free');
        }
      } catch (err) {
        console.warn('[Telegram Bot Error]:', err);
      }
    }

    // =========================================================================
    // 3. CANAL GRATUITO WHATSAPP: CallMeBot API ($0 MXN)
    // =========================================================================
    const cmbKey = callmebotApiKey || process.env.CALLMEBOT_API_KEY;
    if (cmbKey && phone10) {
      try {
        const cmbUrl = `https://api.callmebot.com/whatsapp.php?phone=521${phone10}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(cmbKey)}`;
        const cmbRes = await fetch(cmbUrl);
        if (cmbRes.ok) {
          channelsDelivered.push('callmebot_free');
        }
      } catch (err) {
        console.warn('[CallMeBot Error]:', err);
      }
    }

    // =========================================================================
    // 4. UltraMsg Gateway (Respaldo secundario si está activo)
    // =========================================================================
    const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID || 'instance195445';
    const ultramsgToken = process.env.ULTRAMSG_TOKEN || 'z9tz3q35gul1ilnz';

    if (ultramsgInstance && ultramsgToken && phone10) {
      const targets = [`+521${phone10}`, `+52${phone10}`];
      for (const formattedTo of targets) {
        try {
          const params = new URLSearchParams();
          params.append('token', ultramsgToken);
          params.append('to', formattedTo);
          params.append('body', message);

          const ultraRes = await fetch(
            `https://api.ultramsg.com/${ultramsgInstance}/messages/chat`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            }
          );

          const ultraData = await ultraRes.json();

          if (
            ultraRes.ok &&
            (ultraData.sent === 'true' || ultraData.sent === true || ultraData.id)
          ) {
            channelsDelivered.push(`ultramsg:${formattedTo}`);
            if (!primaryId) primaryId = ultraData.id;
          }
        } catch (err) {
          console.warn(`[WhatsApp UltraMsg Exception for ${formattedTo}]:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      provider: channelsDelivered.join(', '),
      channels: channelsDelivered,
      senderPhone: OFFICIAL_SENDER_PHONE,
      to: `+${numeroConCodigoPais}`,
      waMeUrl: waMeDeepLink,
      ntfyTopics: Array.from(ntfyTopics),
      id: primaryId || `wa-deeplink-${Date.now()}`,
      message: `Enlace directo gratuito de WhatsApp generado (${waMeDeepLink}) desde el emisor ${OFFICIAL_SENDER_PHONE}`
    });
  } catch (error: any) {
    console.error('Error en /api/whatsapp/send:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
