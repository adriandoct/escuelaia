import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { parseExamContent } from '@/lib/examParser';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Manejar FormData con archivo .docx o .doc
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No se recibió ningún archivo.' }, { status: 400 });
      }

      const fileName = file.name || '';
      if (!fileName.toLowerCase().endsWith('.docx') && !fileName.toLowerCase().endsWith('.doc') && !fileName.toLowerCase().endsWith('.txt')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Formato no soportado. Por favor sube un archivo de Word (.docx) o texto (.txt).' 
        }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let rawText = '';
      let html = '';

      if (fileName.toLowerCase().endsWith('.txt')) {
        rawText = buffer.toString('utf-8');
      } else {
        // Usar mammoth para extraer texto y HTML con formato de negritas / clave
        const textResult = await mammoth.extractRawText({ buffer });
        rawText = textResult.value || '';

        try {
          const htmlResult = await mammoth.convertToHtml({ buffer });
          html = htmlResult.value || '';
        } catch {}
      }

      const parsed = parseExamContent(rawText, html);

      return NextResponse.json({
        success: true,
        fileName,
        rawLength: rawText.length,
        tituloSugerido: parsed.tituloSugerido || fileName.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' '),
        preguntas: parsed.preguntas,
        totalPreguntas: parsed.totalPreguntas,
        hasClavesDetectadas: parsed.hasClavesDetectadas
      });
    }

    // Manejar JSON con texto directo pegado
    const body = await req.json();
    const rawText = String(body.text || '').trim();

    if (!rawText) {
      return NextResponse.json({ success: false, error: 'El contenido del examen está vacío.' }, { status: 400 });
    }

    const parsed = parseExamContent(rawText);

    return NextResponse.json({
      success: true,
      tituloSugerido: parsed.tituloSugerido || 'Examen de Evaluación',
      preguntas: parsed.preguntas,
      totalPreguntas: parsed.totalPreguntas,
      hasClavesDetectadas: parsed.hasClavesDetectadas
    });

  } catch (err: any) {
    console.error('Error al parsear examen Word:', err);
    return NextResponse.json({ 
      success: false, 
      error: `Error al procesar el archivo Word: ${err.message || 'Verifica que sea un documento .docx válido.'}` 
    }, { status: 500 });
  }
}
