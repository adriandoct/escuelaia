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

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Si Twilio está configurado en las variables de entorno
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
        return NextResponse.json(
          { success: false, error: twilioData.message || 'Error de Twilio' },
          { status: twilioRes.status }
        );
      }

      return NextResponse.json({
        success: true,
        provider: 'twilio',
        sid: twilioData.sid,
        to: formattedTo
      });
    }

    // Modo local / prueba: se registra exitoso
    return NextResponse.json({
      success: true,
      provider: 'simulated',
      message: 'Mensaje registrado exitosamente en el sistema'
    });
  } catch (error: any) {
    console.error('Error en /api/whatsapp/send:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
