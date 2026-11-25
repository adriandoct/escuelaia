'use client';

import React, { useState, useRef } from 'react';
import { 
  FileText, Upload, CheckCircle2, AlertCircle, X, Sparkles, 
  HelpCircle, Check, Trash2, Plus, ExternalLink, ArrowRight,
  FileSpreadsheet, RefreshCw, KeyRound, Layers, BookOpen
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PreguntaExamen } from '@/lib/recursos';

interface UploadExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevoExamen: any, msg: string) => void;
  defaultSemestre?: string;
  defaultGrupo?: string;
  defaultMateria?: string;
}

const MATERIAS_LIST = [
  'PENSAMIENTO MATEMÁTICO',
  'CIENCIAS NATURALES',
  'LENGUA Y COMUNICACIÓN',
  'CULTURA DIGITAL',
  'CIENCIAS SOCIALES',
  'PENSAMIENTO FILOSÓFICO',
  'INGLÉS',
  'SUB. 1 AUXILIA EN EL REGISTRO',
  'SUB. 2 ASISTE EN EL CÁLCULO DE COSTOS',
  'SUB. 3 INVENTARIO PERPETUOS',
  'SUB. 1 INSTALA REDES',
  'SUB. 2 MANTIENE REDES',
  'TUTORÍAS',
  'ORIENTACIÓN EDUCATIVA',
  'OTRA'
];

export default function UploadExamModal({
  isOpen,
  onClose,
  onSuccess,
  defaultSemestre = '1°',
  defaultGrupo = 'TODOS',
  defaultMateria = ''
}: UploadExamModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [step, setStep] = useState<'upload' | 'preview' | 'details'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // File & Text
  const [selectedFileName, setSelectedFileName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isPasteMode, setIsPasteMode] = useState(false);

  // Parsed Exam Data
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [semestre, setSemestre] = useState(defaultSemestre);
  const [grupo, setGrupo] = useState(defaultGrupo);
  const [materia, setMateria] = useState(defaultMateria || MATERIAS_LIST[0]);
  const [customMateria, setCustomMateria] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [preguntas, setPreguntas] = useState<PreguntaExamen[]>([]);
  const [hasClavesDetectadas, setHasClavesDetectadas] = useState(false);

  if (!isOpen) return null;

  // Regla estricta: Alumnos y Tutores NO pueden subir exámenes
  if (!user || user.role === 'alumno' || user.role === 'tutor') return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.docx') && !name.endsWith('.doc') && !name.endsWith('.txt')) {
      setErrorMessage('Por favor selecciona un archivo de Word válido (.docx) o texto (.txt).');
      return;
    }

    setSelectedFileName(file.name);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/examenes/parse', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo procesar el archivo Word.');
      }

      if (!data.preguntas || data.preguntas.length === 0) {
        throw new Error('No se detectaron preguntas de opción múltiple en el documento. Asegúrate de incluir preguntas numeradas (ej: 1. ¿Pregunta?) y opciones (a, b, c, d).');
      }

      setTitulo(data.tituloSugerido || file.name.replace(/\.[^/.]+$/, ''));
      setPreguntas(data.preguntas);
      setHasClavesDetectadas(data.hasClavesDetectadas);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo Word.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedText = async () => {
    setErrorMessage('');
    if (!pastedText.trim()) {
      setErrorMessage('Por favor pega el contenido de las preguntas y opciones del examen.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/examenes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo procesar el texto.');
      }

      if (!data.preguntas || data.preguntas.length === 0) {
        throw new Error('No se detectaron preguntas de opción múltiple. Usa el formato:\n1. ¿Pregunta?\nA) Opción 1\n*B) Opción 2 (Correcta)\nC) Opción 3');
      }

      setTitulo(data.tituloSugerido || 'Examen de Evaluación');
      setPreguntas(data.preguntas);
      setHasClavesDetectadas(data.hasClavesDetectadas);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el texto del examen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetCorrectAnswer = (questionIndex: number, inciso: string) => {
    setPreguntas(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        respuestaCorrecta: inciso.toUpperCase()
      };
      return updated;
    });
  };

  const handleUpdateQuestionText = (index: number, newText: string) => {
    setPreguntas(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], texto: newText };
      return updated;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setPreguntas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddQuestion = () => {
    const nextNum = preguntas.length + 1;
    const newQ: PreguntaExamen = {
      id: `p-${Date.now()}`,
      numero: nextNum,
      texto: `Pregunta ${nextNum}: Escribe aquí el enunciado...`,
      opciones: [
        { inciso: 'A', texto: 'Opción A' },
        { inciso: 'B', texto: 'Opción B' },
        { inciso: 'C', texto: 'Opción C' },
        { inciso: 'D', texto: 'Opción D' }
      ],
      respuestaCorrecta: 'A',
      puntos: 1
    };
    setPreguntas(prev => [...prev, newQ]);
  };

  const handleSaveExam = async () => {
    setErrorMessage('');
    if (!titulo.trim()) {
      setErrorMessage('Por favor asigna un título para el examen.');
      return;
    }

    if (preguntas.length === 0) {
      setErrorMessage('El examen debe tener al menos una pregunta.');
      return;
    }

    const effectiveMateria = materia === 'OTRA' ? (customMateria.trim() || 'General') : materia;

    setIsProcessing(true);
    try {
      const payload = {
        examen: {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || `Examen de ${effectiveMateria} con ${preguntas.length} preguntas de opción múltiple.`,
          semestre,
          grupo,
          materia: effectiveMateria,
          docenteNombre: user.name || 'Docente CECYTE',
          docenteEmail: user.email || 'docente@cecytebc.edu.mx',
          googleFormUrl: googleFormUrl.trim() || undefined,
          googleSheetUrl: googleSheetUrl.trim() || undefined,
          preguntas
        },
        autorRol: user.role || 'docente',
        autorEmail: user.email,
        autorNombre: user.name
      };

      const res = await fetch('/api/examenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al guardar el examen.');
      }

      onSuccess(data.examen, data.message || 'Examen convertido y publicado con éxito.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al guardar el examen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel bg-[#090d18] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Convertir Examen Word a Google Form con Clave
                </h3>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
                  Docentes
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Sube tu examen contestado en Word (.docx) para que tus alumnos lo contesten sin clave y revises sus calificaciones en Google Sheet.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-300 shrink-0">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 whitespace-pre-line leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Step Tabs indicator */}
        <div className="flex items-center justify-between text-xs font-bold border-b border-white/5 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className={`flex items-center space-x-1.5 pb-1 cursor-pointer transition-colors ${
              step === 'upload' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
            <span>Subir Documento Word</span>
          </button>

          <button
            type="button"
            disabled={preguntas.length === 0}
            onClick={() => setStep('preview')}
            className={`flex items-center space-x-1.5 pb-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 'preview' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
            <span>Revisar Preguntas y Clave ({preguntas.length})</span>
          </button>

          <button
            type="button"
            disabled={preguntas.length === 0}
            onClick={() => setStep('details')}
            className={`flex items-center space-x-1.5 pb-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 'details' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">3</span>
            <span>Asignar Grupo y Publicar</span>
          </button>
        </div>

        {/* Body content based on step */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">

          {/* STEP 1: Upload or Paste Word document */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">
                  Selecciona cómo ingresar las preguntas del examen:
                </span>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsPasteMode(false)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      !isPasteMode ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    📄 Archivo Word (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasteMode(true)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      isPasteMode ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    📋 Pegar Texto Directo
                  </button>
                </div>
              </div>

              {!isPasteMode ? (
                /* Drag and drop Word file */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/70 bg-gradient-to-br from-cyan-950/20 via-black to-[#061020] rounded-3xl p-8 text-center space-y-3 cursor-pointer transition-all group shadow-inner"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    {isProcessing ? (
                      <RefreshCw size={28} className="animate-spin text-cyan-400" />
                    ) : (
                      <Upload size={28} />
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {isProcessing ? 'Analizando examen en Word...' : 'Haz clic para seleccionar tu Examen en Word (.docx)'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      El sistema detectará automáticamente las preguntas numeradas, opciones A, B, C, D y las respuestas correctas marcadas con asterisco (*), [X], negritas o clave.
                    </p>
                  </div>

                  {selectedFileName && (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono border border-cyan-500/40">
                      <FileText size={12} />
                      <span>{selectedFileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Paste text directly */
                <div className="space-y-2">
                  <textarea
                    rows={10}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Pega aquí el contenido de tu examen Word. Ejemplo:\n\n1. ¿Cuál es la fórmula del costo de ventas?\na) Inventario Inicial - Compras\n*b) Inventario Inicial + Compras - Inventario Final\nc) Ventas Totales - Utilidad\nd) Activo Circulante / Pasivo`}
                    className="w-full glass-input p-4 rounded-2xl text-xs text-white border border-white/10 font-mono focus:border-cyan-400 leading-relaxed"
                  />
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={isProcessing || !pastedText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Procesar Preguntas y Clave</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Informative Help Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-gray-300 space-y-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <HelpCircle size={14} /> ¿Cómo debe venir contestado el examen en Word?
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Para que el sistema identifique la <strong>clave de respuestas</strong> de forma automática, puedes marcar la respuesta correcta en Word de cualquiera de estas formas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-gray-300">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    • Con asterisco: <code>*B) Respuesta</code>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    • Con corchetes: <code>[X] B) Respuesta</code>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    • En negritas: <strong>B) Respuesta</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    • Al final: <code>Respuesta correcta: B</code>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">
                  * No te preocupes si no viene marcada; en el siguiente paso podrás elegir la respuesta correcta de cada pregunta con un solo clic.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Edit Questions / Keys */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center space-x-2.5">
                  <KeyRound size={20} className="text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {preguntas.length} Preguntas Detectadas • Clave de Respuestas del Maestro
                    </h4>
                    <p className="text-[11px] text-gray-300">
                      Haz clic en el botón verde de cualquier opción para cambiar cuál es la respuesta correcta. Los alumnos <strong>NO</strong> verán esta clave.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center space-x-1 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>Agregar Pregunta</span>
                </button>
              </div>

              {/* Questions list */}
              <div className="space-y-3">
                {preguntas.map((q, qIdx) => (
                  <div 
                    key={q.id || qIdx}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.texto}
                          onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400 text-xs font-bold text-white outline-none px-1 py-0.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar pregunta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.opciones.map((opt) => {
                        const isCorrect = q.respuestaCorrecta === opt.inciso;
                        return (
                          <button
                            key={opt.inciso}
                            type="button"
                            onClick={() => handleSetCorrectAnswer(qIdx, opt.inciso)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold shadow-md shadow-emerald-500/10'
                                : 'bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-1">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-300'
                              }`}>
                                {opt.inciso}
                              </span>
                              <span className="truncate">{opt.texto}</span>
                            </div>

                            {isCorrect && (
                              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0 border border-emerald-500/40">
                                Clave ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  ← Volver a cargar archivo
                </button>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continuar a Asignación de Grupo</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Assign Group, Details & Save */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-cyan-400" />
                  <span>Examen Listo con {preguntas.length} Preguntas y Clave Configurada</span>
                </h4>
                <p className="text-[11px] text-gray-300">
                  Configura a qué semestre y grupo le aparecerá este examen en su aula virtual para que puedan contestarlo.
                </p>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Título Oficial del Examen *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Examen Primer Parcial de Matemáticas I"
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Instrucciones o Descripción para los Alumnos</label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Lee con atención cada pregunta y selecciona la opción correcta. Solo tienes 1 intento..."
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-400"
                />
              </div>

              {/* Semestre, Grupo, Materia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Semestre *</label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
                  >
                    <option value="1°">1° Semestre</option>
                    <option value="3°">3° Semestre</option>
                    <option value="5°">5° Semestre</option>
                    <option value="TODOS">Todos los Semestres</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Grupo Asignado *</label>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
                  >
                    <option value="TODOS">Todos los Grupos</option>
                    <option value="1A">1A</option>
                    <option value="1B">1B</option>
                    <option value="1C">1C</option>
                    <option value="1D">1D</option>
                    <option value="1E">1E</option>
                    <option value="3APGA">3APGA</option>
                    <option value="3BPGA">3BPGA</option>
                    <option value="3ASC">3ASC</option>
                    <option value="5APGA">5APGA</option>
                    <option value="5BPGA">5BPGA</option>
                    <option value="5ASC">5ASC</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Materia / Asignatura *</label>
                  <select
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
                  >
                    {MATERIAS_LIST.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {materia === 'OTRA' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Especifica el Nombre de la Materia</label>
                  <input
                    type="text"
                    value={customMateria}
                    onChange={(e) => setCustomMateria(e.target.value)}
                    placeholder="Escribe la materia..."
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white border border-white/10"
                  />
                </div>
              )}

              {/* External Google Forms / Google Sheet Links (Optional) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <ExternalLink size={14} className="text-cyan-400" />
                  <span>Integración Externa con Google Workspace (Opcional)</span>
                </span>
                <p className="text-[11px] text-gray-400">
                  El sistema ya incluye el <strong>Formulario Interactivo</strong> y la <strong>Hoja de Google Sheets en vivo</strong> integrados. Si ya cuentas con un enlace directo a Google Form o Google Sheets, puedes agregarlo aquí:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400">Enlace a Google Form (Opcional)</label>
                    <input
                      type="url"
                      value={googleFormUrl}
                      onChange={(e) => setGoogleFormUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/..."
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white border border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400">Enlace a Google Sheet de Resultados (Opcional)</label>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/..."
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white border border-white/10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>

          {step === 'details' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                ← Volver a Preguntas
              </button>
              <button
                type="button"
                onClick={handleSaveExam}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Guardando Examen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Publicar Examen para Alumnos</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
