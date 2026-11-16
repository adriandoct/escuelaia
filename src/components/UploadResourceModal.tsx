"use strict";

'use client';

import React, { useState } from 'react';
import { 
  X, Upload, FileText, Video, CheckCircle2, 
  AlertCircle, ExternalLink, Copy, Check, Sparkles, BookOpen, Layers
} from 'lucide-react';
import YouTubeIcon from '@/components/YouTubeIcon';
import { 
  RecursoEducativo, 
  RecursoTipo, 
  CANAL_YOUTUBE_OFICIAL, 
  YOUTUBE_UPLOAD_DIRECT_URL, 
  extractYouTubeId, 
  getYouTubeThumbnail, 
  formatYouTubeTitle 
} from '@/lib/recursos';
import { useAuth } from '@/lib/auth';

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (recurso: RecursoEducativo, message: string) => void;
  defaultSemestre?: string;
  defaultGrupo?: string;
  defaultMateria?: string;
}

const MATERIAS_CECYTE = [
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
  'CONTROL DE INVENTARIOS',
  'MÓDULO PROFESIONAL TÉCNICO',
  'ORIENTACIÓN EDUCATIVA / TUTORÍA'
];

const GRUPOS_DISPONIBLES: Record<string, string[]> = {
  '1°': ['TODOS', '1A', '1B', '1C', '1D', '1E'],
  '3°': ['TODOS', '3APGA', '3BPGA', '3ASC'],
  '5°': ['TODOS', '5APGA', '5BPGA', '5ASC'],
  'TODOS': ['TODOS']
};

export default function UploadResourceModal({
  isOpen,
  onClose,
  onSuccess,
  defaultSemestre = '3°',
  defaultGrupo = 'TODOS',
  defaultMateria = ''
}: UploadResourceModalProps) {
  const { user } = useAuth();

  const [tipo, setTipo] = useState<RecursoTipo>('pdf');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [semestre, setSemestre] = useState(defaultSemestre);
  const [grupo, setGrupo] = useState(defaultGrupo);
  const [materia, setMateria] = useState(defaultMateria || MATERIAS_CECYTE[0]);
  const [customMateria, setCustomMateria] = useState('');

  // PDF states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfFileSize, setPdfFileSize] = useState<string>('');

  // Video states
  const [videoUrl, setVideoUrl] = useState('');
  const [copiedTitle, setCopiedTitle] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isAdminOrSuper = user?.role === 'administrador' || user?.isSuperAdmin || user?.email === 'admin@admin.com';
  const effectiveMateria = materia === 'OTRA' ? (customMateria.trim() || 'General') : materia;
  const youtubeId = extractYouTubeId(videoUrl);

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor selecciona un archivo con extensión .pdf');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('El archivo excede el límite máximo de 25 MB.');
      return;
    }

    setPdfFile(file);
    setPdfFileName(file.name);
    setPdfFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');

    // Auto-fill title if empty
    if (!titulo) {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitulo(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Convert to Base64 for persistent storage & offline viewing
    const reader = new FileReader();
    reader.onload = () => {
      setPdfDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCopySuggestedTitle = () => {
    const suggested = formatYouTubeTitle(semestre, grupo, effectiveMateria, titulo || 'Clase');
    navigator.clipboard.writeText(suggested);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!titulo.trim()) {
      setErrorMessage('Por favor ingresa un título para el recurso educativo.');
      return;
    }

    if (tipo === 'pdf' && !pdfDataUrl && !pdfFile) {
      setErrorMessage('Por favor adjunta el archivo .pdf correspondiente.');
      return;
    }

    if (tipo === 'video') {
      if (!videoUrl.trim()) {
        setErrorMessage('Por favor ingresa la URL del video de YouTube.');
        return;
      }
      if (!youtubeId) {
        setErrorMessage('La URL ingresada no corresponde a un video válido de YouTube. Ingresa un enlace como https://youtu.be/... o https://www.youtube.com/watch?v=...');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<RecursoEducativo> = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        archivoUrl: tipo === 'pdf' ? pdfDataUrl : undefined,
        archivoNombre: tipo === 'pdf' ? (pdfFileName || 'documento.pdf') : undefined,
        archivoTamano: tipo === 'pdf' ? pdfFileSize : undefined,
        videoUrl: tipo === 'video' ? videoUrl.trim() : undefined,
        youtubeId: tipo === 'video' ? (youtubeId || undefined) : undefined,
        canalYoutube: tipo === 'video' ? CANAL_YOUTUBE_OFICIAL : undefined,
        semestre,
        grupo,
        materia: effectiveMateria,
        autorNombre: user?.name || (user?.email?.split('@')[0].toUpperCase()) || 'Docente CECYTE',
        autorEmail: user?.email || 'docente@cecytebc.edu.mx',
        autorRol: (user?.role as any) || 'docente',
      };

      const res = await fetch('/api/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          recurso: payload,
          validadoPor: isAdminOrSuper ? user?.email : undefined
        })
      });

      const data = await res.json();
      if (data && data.success) {
        onSuccess(data.recurso, data.message);
        onClose();
      } else {
        setErrorMessage(data?.error || 'Error al guardar el recurso.');
      }
    } catch (err: any) {
      console.error('Error al subir recurso:', err);
      setErrorMessage(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl glass-panel bg-[#090d16]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="pb-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Subir Recurso Educativo</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Asigna guías en PDF y videos de clase vinculados por semestre y grupo.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="my-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2.5 animate-shake">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">

          {/* Selector de Tipo de Recurso */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300">Tipo de Recurso Didáctico</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('pdf')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                  tipo === 'pdf'
                    ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-md shadow-rose-500/10'
                    : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${tipo === 'pdf' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-gray-400'}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">Documento .PDF</div>
                  <div className="text-[10px] text-gray-400">Guías, lecturas y ejercicios</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('video')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                  tipo === 'video'
                    ? 'bg-red-500/15 border-red-500/50 text-white shadow-md shadow-red-500/10'
                    : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${tipo === 'video' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'}`}>
                  <YouTubeIcon size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">Video YouTube</div>
                  <div className="text-[10px] text-gray-400">Canal cecytecopias@gmail.com</div>
                </div>
              </button>
            </div>
          </div>

          {/* Información Académica (Semestre, Grupo y Materia) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            {/* Semestre */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300">Semestre / Grado *</label>
              <select
                value={semestre}
                onChange={(e) => {
                  const s = e.target.value;
                  setSemestre(s);
                  const validGroups = GRUPOS_DISPONIBLES[s] || ['TODOS'];
                  if (!validGroups.includes(grupo)) setGrupo(validGroups[0]);
                }}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
              >
                <option value="1°">1° Semestre</option>
                <option value="3°">3° Semestre</option>
                <option value="5°">5° Semestre</option>
                <option value="TODOS">Todos los Semestres</option>
              </select>
            </div>

            {/* Grupo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300">Grupo Asignado *</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
              >
                {(GRUPOS_DISPONIBLES[semestre] || ['TODOS']).map((g) => (
                  <option key={g} value={g}>{g === 'TODOS' ? '⭐ Todos los grupos' : `Grupo ${g}`}</option>
                ))}
              </select>
            </div>

            {/* Materia */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300">Materia / Asignatura *</label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
              >
                {MATERIAS_CECYTE.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="OTRA">Otra materia (Escribir)...</option>
              </select>
            </div>

            {materia === 'OTRA' && (
              <div className="sm:col-span-3 pt-1">
                <input
                  type="text"
                  placeholder="Nombre exacto de la materia o submódulo..."
                  value={customMateria}
                  onChange={(e) => setCustomMateria(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border border-cyan-500/30"
                  required
                />
              </div>
            )}
          </div>

          {/* Título y Descripción */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Título del Recurso *</label>
              <input
                type="text"
                placeholder="Ej: Guía Práctica de Álgebra y Funciones Polinomiales"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Descripción o Instrucciones para el Alumno</label>
              <textarea
                rows={2}
                placeholder="Indica de qué trata este material, páginas que deben leer o instrucciones para la clase..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Campo Específico PDF */}
          {tipo === 'pdf' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <FileText size={15} />
                <span>Archivo PDF del Recurso (.pdf) *</span>
              </label>

              <div className="border-2 border-dashed border-rose-500/30 hover:border-rose-400/60 rounded-2xl p-6 text-center bg-rose-500/[0.02] hover:bg-rose-500/[0.05] transition-all">
                <input
                  type="file"
                  id="pdfFileInput"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                />
                
                {pdfFile ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center space-x-2 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 text-xs font-bold">
                      <FileText size={16} />
                      <span className="truncate max-w-[280px]">{pdfFileName}</span>
                      <span className="text-gray-400 font-mono text-[10px]">({pdfFileSize})</span>
                    </div>
                    <div>
                      <label
                        htmlFor="pdfFileInput"
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer block"
                      >
                        Cambiar archivo PDF
                      </label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="pdfFileInput" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                      <Upload size={22} />
                    </div>
                    <div className="text-xs font-semibold text-white">Haz clic aquí para seleccionar tu archivo PDF</div>
                    <div className="text-[11px] text-gray-400">Tamaño máximo recomendado: 25 MB</div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Campo Específico Video (YouTube y cecytecopias@gmail.com) */}
          {tipo === 'video' && (
            <div className="space-y-4">
              
              {/* Banner Oficial de YouTube para cecytecopias@gmail.com */}
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-red-400 font-bold">
                    <YouTubeIcon size={18} className="shrink-0" />
                    <span>Canal Oficial de YouTube CECYTE BC</span>
                  </div>
                  <span className="font-mono text-[10px] bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full border border-red-500/30">
                    {CANAL_YOUTUBE_OFICIAL}
                  </span>
                </div>

                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Los videos educativos son alojados en el canal oficial <strong>{CANAL_YOUTUBE_OFICIAL}</strong> para no consumir almacenamiento y ofrecer reproducción rápida a los alumnos.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={YOUTUBE_UPLOAD_DIRECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition-all shadow-md shadow-red-600/30"
                  >
                    <span>Subir Video a YouTube Studio</span>
                    <ExternalLink size={12} />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopySuggestedTitle}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all cursor-pointer"
                    title="Copia el título formateado listo para pegarlo en YouTube"
                  >
                    {copiedTitle ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedTitle ? '¡Título Copiado!' : 'Copiar Título Sugerido'}</span>
                  </button>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>URL del Video de YouTube *</span>
                  <span className="text-[10px] text-gray-400">youtube.com/watch?v=... o youtu.be/...</span>
                </label>
                <input
                  type="url"
                  placeholder="https://youtu.be/ScMzIvxBSi4 o https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white border border-white/10 focus:border-red-500 font-mono"
                  required
                />
              </div>

              {/* Live Preview if YouTube ID detected */}
              {youtubeId && (
                <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-center space-x-3.5">
                  <img 
                    src={getYouTubeThumbnail(youtubeId)} 
                    alt="Miniatura YouTube" 
                    className="w-24 h-16 object-cover rounded-xl border border-white/10 shrink-0" 
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Video de YouTube Reconocido
                    </span>
                    <div className="text-xs font-semibold text-white truncate font-mono">ID: {youtubeId}</div>
                    <div className="text-[10px] text-gray-400">Canal asignado: {CANAL_YOUTUBE_OFICIAL}</div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Validation Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <span>🛡️</span>
              <span>Validación y Aprobación Institucional</span>
            </div>
            <p className="text-[11px] text-gray-300">
              {isAdminOrSuper
                ? 'Como Administrador / Superadmin, tu recurso se aprobará y publicará de forma inmediata.'
                : 'Tu recurso será enviado a la Bandeja de Validación del Administrador y Superadmin. Una vez revisado y aprobado, aparecerá en el aula de los alumnos del semestre y grupo correspondiente.'}
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Guardando recurso...' : isAdminOrSuper ? 'Publicar Recurso Aprobado' : 'Enviar a Validación'}</span>
              <span>→</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
