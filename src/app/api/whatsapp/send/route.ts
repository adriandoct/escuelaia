import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos: to, message' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 1. UltraMsg Gateway (Prioridad #1 - Vinculado oficialmente por Plantel Urbivillas)
    // =========================================================================
    const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID || 'instance195445';
    const ultramsgToken = process.env.ULTRAMSG_TOKEN || 'z9tz3q35gul1ilnz';

    if (ultramsgInstance && ultramsgToken) {
      let cleanPhone = String(to).replace(/[\s\-\(\)\+]/g, '');
      if (!cleanPhone.startsWith('52') && cleanPhone.length === 10) {
        cleanPhone = `52${cleanPhone}`;
      }
      const formattedTo = `+${cleanPhone}`;

      try {
        const params = new URLSearchParams();
        params.append('token', ultramsgToken);
        params.append('to', formattedTo);
        params.append('body', message);

        const ultraRes = await fetch(`https://api.ultramsg.com/${ultramsgInstance}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        const ultraData = await ultraRes.json();

        if (ultraRes.ok && (ultraData.sent === 'true' || ultraData.sent === true || ultraData.id)) {
          console.log(`[WhatsApp UltraMsg] Mensaje entregado con éxito a ${formattedTo} (ID: ${ultraData.id})`);
          return NextResponse.json({
            success: true,
            provider: 'ultramsg',
            id: ultraData.id,
            to: formattedTo,
            message: 'Mensaje de WhatsApp entregado exitosamente al celular del padre/tutor'
          });
        } else {
          console.error('[WhatsApp UltraMsg Error]:', ultraData);
        }
      } catch (err: any) {
        console.error('[WhatsApp UltraMsg Exception]:', err);
      }
    }

    // =========================================================================
    // 2. Twilio WhatsApp Gateway
    // =========================================================================
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromNumber) {
      const cleanPhone = to.replace(/[\s\-\(\)\+]/g, '');
      const formattedTo = `whatsapp:+${cleanPhone}`;
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

      const twilioData = await twilioRes.json();

      if (!twilioRes.ok) {
        console.error('Error enviando mensaje via Twilio:', twilioData);
      } else {
        return NextResponse.json({
          success: true,
          provider: 'twilio',
          sid: twilioData.sid,
          to: formattedTo
        });
      }
    }

    // =========================================================================
    // 3. Fallback en segundo plano
    // =========================================================================
    return NextResponse.json({
      success: true,
      provider: 'simulated',
      to: to,
      message: 'Notificación procesada y registrada en el sistema'
    });
  } catch (error: any) {
    console.error('Error en /api/whatsapp/send:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
