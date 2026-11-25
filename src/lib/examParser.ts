import { PreguntaExamen, OpcionPregunta } from './recursos';

interface ParsedExamResult {
  preguntas: PreguntaExamen[];
  totalPreguntas: number;
  tituloSugerido?: string;
  hasClavesDetectadas: boolean;
}

/**
 * Limpia y normaliza texto eliminando retornos de carro excesivos y espacios raros
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();
}

/**
 * Busca tabla o lista global de respuestas al final del texto
 * Ej: "Clave de respuestas: 1-A, 2-C, 3-B" o "Respuestas: 1. A, 2. B"
 */
function extractGlobalAnswerKey(text: string): Record<number, string> {
  const keys: Record<number, string> = {};
  const globalKeyMatch = text.match(/(?:clave|respuestas|soluciones|hoja de respuestas)[\s\:\-]+([\s\S]+)$/i);
  
  if (globalKeyMatch && globalKeyMatch[1]) {
    const rawKeysSection = globalKeyMatch[1];
    const regex = /(\d+)[\s\.\-\:\)]+([a-dA-D])/g;
    let match;
    while ((match = regex.exec(rawKeysSection)) !== null) {
      const qNum = parseInt(match[1], 10);
      const opt = match[2].toUpperCase();
      keys[qNum] = opt;
    }
  }

  return keys;
}

/**
 * Parsea el texto y/o HTML extraído de un archivo Word (.docx) o texto pegado
 */
export function parseExamContent(rawText: string, htmlContent: string = ''): ParsedExamResult {
  const text = cleanText(rawText);
  if (!text) {
    return { preguntas: [], totalPreguntas: 0, hasClavesDetectadas: false };
  }

  const globalKeys = extractGlobalAnswerKey(text);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Intentar sugerir un título a partir de las primeras líneas si parecen encabezado
  let tituloSugerido: string | undefined;
  if (lines.length > 0 && !lines[0].match(/^(?:pregunta|\d+[\.\-\)\:])/i)) {
    const candidate = lines[0].replace(/[#*_-]/g, '').trim();
    if (candidate.length > 5 && candidate.length < 100) {
      tituloSugerido = candidate;
    }
  }

  // Regex para detectar el inicio de una pregunta: "1.", "1)", "Pregunta 1:", "1.-", "1 -"
  const questionStartRegex = /^(?:pregunta\s*)?(\d+)[\.\-\)\:]\s*(.+)$/i;

  // Regex para detectar opciones: a) / A) / a. / A. / [a] / (a)
  const optionRegex = /^([\*\[\(✓]?[xX✓\*]?[\)\]]?\s*)([a-dA-D])[\.\)\:\-\]]\s*(.*)$/;

  const questions: PreguntaExamen[] = [];
  let currentQuestion: {
    numero: number;
    statement: string[];
    options: { raw: string; inciso: string; texto: string; isCorrect: boolean }[];
    explicitAnswer?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Verificar si es respuesta explícita tipo "Respuesta correcta: B" o "Clave: C"
    const explicitAnsMatch = line.match(/(?:respuesta\s*correcta|respuesta|soluci[oó]n|clave)[\s\:\-]+([a-dA-D])/i);
    if (explicitAnsMatch && currentQuestion) {
      currentQuestion.explicitAnswer = explicitAnsMatch[1].toUpperCase();
      continue;
    }

    // Comprobar inicio de nueva pregunta
    const qMatch = line.match(questionStartRegex);
    const isNewQuestion = qMatch && !line.match(optionRegex);

    if (isNewQuestion && qMatch) {
      if (currentQuestion && currentQuestion.options.length > 0) {
        saveCurrentQuestion(currentQuestion, questions, globalKeys, htmlContent);
      }

      currentQuestion = {
        numero: parseInt(qMatch[1], 10) || (questions.length + 1),
        statement: [qMatch[2].trim()],
        options: []
      };
      continue;
    }

    // Comprobar si es una opción
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      const prefix = optMatch[1] || '';
      const inciso = optMatch[2].toUpperCase();
      let optText = optMatch[3].trim();

      // Detectar si está marcada como correcta:
      // Formas: "*a) texto", "a)* texto", "a) texto *", "a) texto (correcta)", "[x] a) texto"
      const hasPrefixMarker = /[\*✓]/.test(prefix) || /\[x\]|\(x\)/i.test(prefix);
      const hasSuffixMarker = /\*$/.test(optText) || /\(correcta?\)/i.test(optText) || /\[x\]|\(x\)/i.test(optText) || /✓/.test(optText);
      const isCorrect = hasPrefixMarker || hasSuffixMarker;

      // Limpiar marcadores del texto de la opción
      optText = optText
        .replace(/\*+/g, '')
        .replace(/\[x\]|\(x\)/gi, '')
        .replace(/\(correcta?\)/gi, '')
        .replace(/✓/g, '')
        .trim();

      currentQuestion.options.push({
        raw: line,
        inciso,
        texto: optText,
        isCorrect
      });
      continue;
    }

    // Si no es inicio de pregunta ni opción pero hay pregunta abierta
    if (currentQuestion) {
      if (currentQuestion.options.length === 0) {
        // Aún estamos en el enunciado de la pregunta (multilínea)
        currentQuestion.statement.push(line);
      } else {
        // Texto adicional o continuación de la última opción
        const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
        lastOpt.texto += ' ' + line;
      }
    }
  }

  // Guardar última pregunta
  if (currentQuestion && currentQuestion.options.length > 0) {
    saveCurrentQuestion(currentQuestion, questions, globalKeys, htmlContent);
  }

  // Si no se detectaron preguntas con el formato estándar, intentar fallback por párrafos
  if (questions.length === 0 && lines.length >= 4) {
    fallbackParse(lines, questions);
  }

  const hasClavesDetectadas = questions.some(q => q.respuestaCorrecta && q.respuestaCorrecta !== 'A');

  return {
    preguntas: questions,
    totalPreguntas: questions.length,
    tituloSugerido,
    hasClavesDetectadas
  };
}

function saveCurrentQuestion(
  cq: {
    numero: number;
    statement: string[];
    options: { raw: string; inciso: string; texto: string; isCorrect: boolean }[];
    explicitAnswer?: string;
  },
  questions: PreguntaExamen[],
  globalKeys: Record<number, string>,
  htmlContent: string
) {
  // Determinar respuesta correcta
  let correctKey = 'A'; // Default

  // 1. Revisar si alguna opción tuvo marcador (*, [x], etc.)
  const markedOpt = cq.options.find(o => o.isCorrect);
  if (markedOpt) {
    correctKey = markedOpt.inciso;
  } else if (cq.explicitAnswer) {
    correctKey = cq.explicitAnswer;
  } else if (globalKeys[cq.numero]) {
    correctKey = globalKeys[cq.numero];
  } else if (htmlContent) {
    // 2. Buscar en HTML si alguna opción está en negrita <strong> o <b>
    for (const opt of cq.options) {
      const cleanSnippet = opt.texto.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (cleanSnippet) {
        const boldRegex = new RegExp(`<(?:strong|b)[^>]*>[^<]*${cleanSnippet}`, 'i');
        if (boldRegex.test(htmlContent)) {
          correctKey = opt.inciso;
          break;
        }
      }
    }
  }

  // Asegurar formato de opciones estándar A, B, C, D
  const formattedOptions: OpcionPregunta[] = cq.options.map((opt, idx) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const assignedLetter = opt.inciso || letters[idx] || 'A';
    return {
      inciso: assignedLetter,
      texto: opt.texto
    };
  });

  questions.push({
    id: `preg-${cq.numero}-${Math.random().toString(36).substr(2, 5)}`,
    numero: cq.numero || (questions.length + 1),
    texto: cq.statement.join(' ').trim(),
    opciones: formattedOptions,
    respuestaCorrecta: correctKey,
    puntos: 1
  });
}

/**
 * Fallback heurístico en caso de texto sin numeración formal
 */
function fallbackParse(lines: string[], questions: PreguntaExamen[]) {
  // Agrupa en bloques de 1 pregunta + opciones
  let currentQ: PreguntaExamen | null = null;
  let qNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const optMatch = line.match(/^[\*\s]*([a-dA-D])[\.\)\:\-\]]\s*(.+)$/);

    if (optMatch && currentQ) {
      const inciso = optMatch[1].toUpperCase();
      const isCorrect = line.includes('*') || /\[x\]|\(correcta\)/i.test(line);
      const cleanOptText = optMatch[2].replace(/[\*✓]/g, '').trim();

      currentQ.opciones.push({ inciso, texto: cleanOptText });
      if (isCorrect) currentQ.respuestaCorrecta = inciso;
    } else if (line.endsWith('?') || line.toLowerCase().startsWith('pregunta') || /^\d+[\.\-]/.test(line)) {
      if (currentQ && currentQ.opciones.length >= 2) {
        questions.push(currentQ);
      }
      currentQ = {
        id: `preg-${qNum}-${Math.random().toString(36).substr(2, 5)}`,
        numero: qNum++,
        texto: line.replace(/^\d+[\.\-\)\:]\s*/, '').trim(),
        opciones: [],
        respuestaCorrecta: 'A',
        puntos: 1
      };
    }
  }

  if (currentQ && currentQ.opciones.length >= 2) {
    questions.push(currentQ);
  }
}
