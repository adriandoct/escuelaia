import { NextResponse } from 'next/server';

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

    // Normalize phone to extract clean 10-digit Mexican number
    const digitsOnly = String(to).replace(/\D/g, '');
    let phone10 = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith('52')) {
      phone10 = digitsOnly.slice(2);
    } else if (digitsOnly.length === 13 && digitsOnly.startsWith('521')) {
      phone10 = digitsOnly.slice(3);
    } else if (digitsOnly.length > 10) {
      phone10 = digitsOnly.slice(-10);
    }

    const cleanMessage = String(message).replace(/\*/g, '');
    const isSalida =
      tipo === 'salida' ||
      String(message).toUpperCase().includes('SALIDA DEL PLANTEL');
    const eventTitle = isSalida
      ? `🚪 SALIDA CECYTE: ${studentName || 'Alumno'}`
      : `✅ INGRESO CECYTE: ${studentName || 'Alumno'}`;

    const channelsDelivered: string[] = [];
    let primaryId: string | number | undefined;

    // =========================================================================
    // 1. CANAL 100% GRATUITO SIN COBRO: PUSH DIRECTO AL CELULAR (ntfy.sh)
    // Funciona gratis para siempre ($0 MXN) en Android, iPhone y en la App Web /tutor
    // =========================================================================
    const ntfyTopics = new Set<string>();
    if (phone10 && phone10.length >= 10) {
      ntfyTopics.add(`cecyte-tutor-${phone10}`);
    }
    if (matricula) {
      const cleanMat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, '');
      if (cleanMat) {
        ntfyTopics.add(`cecyte-alumno-${cleanMat}`);
      }
    }

    // Extract matricula from message if not explicitly passed
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
                tags: isSalida ? ['door', 'school'] : ['white_check_mark', 'school']
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
    // 4. UltraMsg Gateway (Envío Dual +521 y +52 para números de México)
    // =========================================================================
    const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID || 'instance195445';
    const ultramsgToken = process.env.ULTRAMSG_TOKEN || 'z9tz3q35gul1ilnz';

    if (ultramsgInstance && ultramsgToken && phone10) {
      // En México WhatsApp utiliza JIDs con prefijo 521 (ej. 5216641567419@c.us) o 52
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

    // =========================================================================
    // 5. Twilio WhatsApp Gateway (Opcional)
    // =========================================================================
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromNumber && phone10) {
      try {
        const formattedTo = `whatsapp:+521${phone10}`;
        const formattedFrom = fromNumber.startsWith('whatsapp:')
          ? fromNumber
          : `whatsapp:${fromNumber}`;

        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const params = new URLSearchParams();
        params.append('To', formattedTo);
        params.append('From', formattedFrom);
        params.append('Body', message);

        const twilioRes = await fetch(twilioEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        if (twilioRes.ok) {
          const twilioData = await twilioRes.json();
          channelsDelivered.push('twilio');
          if (!primaryId) primaryId = twilioData.sid;
        }
      } catch (err) {
        console.warn('[Twilio Error]:', err);
      }
    }

    return NextResponse.json({
      success: true,
      provider: channelsDelivered.length > 0 ? channelsDelivered.join(', ') : 'ntfy_free_push',
      channels: channelsDelivered,
      ntfyTopics: Array.from(ntfyTopics),
      id: primaryId || `free-push-${Date.now()}`,
      to: `+52${phone10}`,
      message:
        'Notificación enviada gratuitamente al celular del padre/tutor (Push sin cobro + WhatsApp)'
    });
  } catch (error: any) {
    console.error('Error en /api/whatsapp/send:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
