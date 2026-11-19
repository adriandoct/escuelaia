"use strict";

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, Video, Upload, Search, Filter, CheckCircle2, 
  Clock, AlertTriangle, Shield, Check, X, ExternalLink, Download,
  Layers, Eye, RefreshCw, Trash2, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import YouTubeIcon from '@/components/YouTubeIcon';
import { 
  RecursoEducativo, 
  RecursoTipo, 
  RecursoEstado,
  CANAL_YOUTUBE_OFICIAL, 
  YOUTUBE_UPLOAD_DIRECT_URL,
  getYouTubeThumbnail,
  getCachedRecursos,
  saveCachedRecursos
} from '@/lib/recursos';
import { useAuth } from '@/lib/auth';
import UploadResourceModal from '@/components/UploadResourceModal';
import PDFViewerModal from '@/components/PDFViewerModal';
import VideoPlayerModal from '@/components/VideoPlayerModal';

const MATERIAS_LIST = [
  'TODAS',
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
  'CONTROL DE INVENTARIOS'
];

export default function RecursosPage() {
  const { user, openLoginModal } = useAuth();

  const isAdminOrSuper = user?.role === 'administrador' || user?.isSuperAdmin || user?.email === 'admin@admin.com';
  const isDocente = user?.role === 'docente';
  const isAlumno = user?.role === 'alumno';
  const isTutor = user?.role === 'tutor';

  // Regla estricta: Los alumnos y tutores NO pueden subir recursos (solo docentes, directivos y administrativos autorizados)
  const canUpload = !!user && (isDocente || isAdminOrSuper || user?.role === 'administrativo');

  // Data states
  const [recursos, setRecursos] = useState<RecursoEducativo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filter states
  const [activeTab, setActiveTab] = useState<'explorar' | 'validacion' | 'mis_recursos' | 'youtube'>('explorar');
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'pdf' | 'video'>('all');
  const [semestreFilter, setSemestreFilter] = useState<string>('all');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [materiaFilter, setMateriaFilter] = useState<string>('TODAS');

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPdfResource, setSelectedPdfResource] = useState<RecursoEducativo | null>(null);
  const [selectedVideoResource, setSelectedVideoResource] = useState<RecursoEducativo | null>(null);
  const [rejectingResource, setRejectingResource] = useState<RecursoEducativo | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Auto pre-filter if logged user is student
  useEffect(() => {
    if (user?.role === 'alumno') {
      if (user.grado) setSemestreFilter(user.grado);
      if (user.grupo) setGrupoFilter(user.grupo);
    }
  }, [user]);

  // Load resources from server with fallback to localStorage
  const loadRecursos = async () => {
    try {
      const res = await fetch('/api/recursos');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.recursos)) {
        setRecursos(data.recursos);
        saveCachedRecursos(data.recursos);
      } else {
        const cached = getCachedRecursos();
        if (cached.length > 0) setRecursos(cached);
      }
    } catch (e) {
      console.warn('Cargando recursos locales:', e);
      const cached = getCachedRecursos();
      if (cached.length > 0) setRecursos(cached);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecursos();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Approval action
  const handleApprove = async (id: string) => {
    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          id,
          validadoPor: user?.name || user?.email || 'Administrador CECYTE'
        })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('¡Recurso aprobado exitosamente! Ahora es visible para alumnos y docentes.', 'success');
        loadRecursos();
      } else {
        showToast(data?.error || 'Error al aprobar recurso', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Rejection action
  const handleConfirmReject = async () => {
    if (!rejectingResource) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          id: rejectingResource.id,
          validadoPor: user?.name || user?.email || 'Administrador CECYTE',
          motivoRechazo: rejectionReason.trim() || 'El material requiere ajustes o correcciones antes de publicarse.'
        })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('El recurso fue marcado como rechazado.', 'info');
        setRejectingResource(null);
        setRejectionReason('');
        loadRecursos();
      } else {
        showToast(data?.error || 'Error al rechazar recurso', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Delete action
  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente "${titulo}"?`)) return;
    try {
      const res = await fetch('/api/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('Recurso eliminado del repositorio.', 'info');
        loadRecursos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // View resource counter
  const handleOpenResource = (r: RecursoEducativo) => {
    fetch('/api/recursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'incrementViews', id: r.id })
    }).catch(() => {});

    if (r.tipo === 'pdf') {
      setSelectedPdfResource(r);
    } else {
      setSelectedVideoResource(r);
    }
  };

  // Available groups dynamically computed
  const availableGroups = useMemo(() => {
    const list = new Set<string>();
    recursos.forEach(r => {
      if (r.grupo && r.grupo !== 'TODOS') list.add(r.grupo);
    });
    // Add common school groups
    ['1A', '1B', '1C', '1D', '1E', '3APGA', '3BPGA', '3ASC', '5APGA', '5BPGA', '5ASC'].forEach(g => list.add(g));
    return ['all', 'TODOS', ...Array.from(list).sort()];
  }, [recursos]);

  // Counts
  const pendingCount = useMemo(() => {
    return recursos.filter(r => r.estado === 'pendiente').length;
  }, [recursos]);

  const myResourcesCount = useMemo(() => {
    if (!user?.email) return 0;
    return recursos.filter(r => r.autorEmail.toLowerCase() === user.email.toLowerCase()).length;
  }, [recursos, user]);

  // Filtered resources based on tab and filters
  const displayedResources = useMemo(() => {
    return recursos.filter(r => {
      // Tab filtering
      if (activeTab === 'validacion') {
        if (r.estado !== 'pendiente') return false;
      } else if (activeTab === 'mis_recursos') {
        if (!user?.email) return false;
        if (r.autorEmail.toLowerCase() !== user.email.toLowerCase()) return false;
      } else if (activeTab === 'explorar') {
        // Alumnos y Docentes solo ven aprobados en explorar
        if (r.estado !== 'aprobado' && !isAdminOrSuper) return false;
      }

      // Tipo filter
      if (tipoFilter !== 'all' && r.tipo !== tipoFilter) return false;

      // Semestre filter
      if (semestreFilter !== 'all') {
        const normSemFilter = semestreFilter.replace(/[°º]/g, '').trim();
        const normResourceSem = (r.semestre || '').replace(/[°º]/g, '').trim();
        if (r.semestre !== 'TODOS' && normResourceSem !== normSemFilter) return false;
      }

      // Grupo filter
      if (grupoFilter !== 'all') {
        if (r.grupo !== 'TODOS' && r.grupo !== grupoFilter) return false;
      }

      // Materia filter
      if (materiaFilter !== 'TODAS') {
        if (r.materia.toUpperCase() !== materiaFilter.toUpperCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = r.titulo.toLowerCase().includes(q);
        const matchDesc = (r.descripcion || '').toLowerCase().includes(q);
        const matchMateria = r.materia.toLowerCase().includes(q);
        const matchAutor = r.autorNombre.toLowerCase().includes(q);
        const matchGrupo = (r.grupo || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchMateria && !matchAutor && !matchGrupo) return false;
      }

      return true;
    });
  }, [recursos, activeTab, tipoFilter, semestreFilter, grupoFilter, materiaFilter, searchQuery, isAdminOrSuper, user]);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 border animate-fade-in ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : toastMessage.type === 'error'
            ? 'bg-red-950/90 border-red-500/50 text-red-200'
            : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {toastMessage.type === 'info' && <Clock className="w-5 h-5 text-cyan-400 shrink-0" />}
          <div className="text-xs font-semibold leading-relaxed">{toastMessage.text}</div>
          <button onClick={() => setToastMessage(null)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2">
                <span>Repositorio de Recursos Educativos</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold uppercase tracking-wider">
                  CECYTE BC
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Guías de estudio en PDF y videos de clase en YouTube asignados por semestre y grupo.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <button
            onClick={() => { setIsRefreshing(true); loadRecursos(); }}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
            title="Actualizar lista de recursos"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>

          {/* Botón Subir Recurso: Exclusivo para docentes y directivos (Oculto para Alumnos y Tutores) */}
          {canUpload && (
            <button
              onClick={() => {
                if (!user) {
                  openLoginModal();
                  return;
                }
                setIsUploadModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all cursor-pointer"
            >
              <Upload size={15} />
              <span>+ Subir Recurso (PDF o Video)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation (Explorar, Validación de Admin, Mis Recursos, Canal YouTube) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab('explorar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'explorar'
              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={14} />
          <span>Explorar Recursos Aprobados</span>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white font-mono">
            {recursos.filter(r => r.estado === 'aprobado').length}
          </span>
        </button>

        {/* Pestaña de Validación (Visible para Administrador / Superadmin) */}
        {isAdminOrSuper && (
          <button
            onClick={() => setActiveTab('validacion')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'validacion'
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <ShieldCheck size={14} />
            <span>🛡️ Bandeja de Validación</span>
            {pendingCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black animate-pulse">
                {pendingCount} Pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </button>
        )}

        {/* Pestaña Mis Recursos (Solo para usuarios con permiso de subida) */}
        {user && canUpload && (
          <button
            onClick={() => setActiveTab('mis_recursos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'mis_recursos'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-md shadow-purple-500/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload size={14} />
            <span>Mis Aportaciones</span>
            {myResourcesCount > 0 && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-500/30">
                {myResourcesCount}
              </span>
            )}
          </button>
        )}

        {/* Pestaña Oficial de YouTube */}
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'youtube'
              ? 'bg-red-500/20 border border-red-500/50 text-red-300 shadow-md shadow-red-500/10'
              : 'text-red-400 hover:bg-red-500/10'
          }`}
        >
          <YouTubeIcon size={15} />
          <span>Canal YouTube (cecytecopias@gmail.com)</span>
        </button>
      </div>

      {/* Main Tab Content: YouTube Integration Guide */}
      {activeTab === 'youtube' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/30 space-y-6 animate-fade-in bg-gradient-to-br from-red-950/15 via-[#090d16] to-black">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center text-3xl shadow-xl shadow-red-600/20">
                <YouTubeIcon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Canal Institucional de YouTube</span>
                </h3>
                <p className="text-xs text-red-300 font-mono mt-0.5">
                  Cuenta oficial: <strong>{CANAL_YOUTUBE_OFICIAL}</strong>
                </p>
              </div>
            </div>

            <a
              href={YOUTUBE_UPLOAD_DIRECT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Upload size={15} />
              <span>Abrir YouTube Studio para Subir Video</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="text-sm font-bold text-white">Sube el Video al Canal</h4>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                Inicia sesión en YouTube con el correo <strong>{CANAL_YOUTUBE_OFICIAL}</strong> y sube el archivo de la clase como video <em>No Listado</em> o <em>Público</em>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="text-sm font-bold text-white">Copia el Enlace y Asigna Grupo</h4>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                En esta plataforma, haz clic en <strong>+ Subir Recurso</strong>, selecciona Video YouTube, pega el enlace (ej: <code>https://youtu.be/...</code>) y especifica el semestre y grupo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="text-sm font-bold text-white">Validación por Administrador</h4>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                La Dirección Escolar revisa el video en la <strong>Bandeja de Validación</strong> y lo aprueba para que quede visible de inmediato a todos los alumnos del grupo asignado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar (Search, Semestre, Grupo, Materia, Tipo) */}
      <div className="p-4 rounded-3xl glass-panel bg-[#090d16]/80 border border-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por tema, título, profesor o materia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500"
            />
          </div>

          {/* Filter Semestre */}
          <div>
            <select
              value={semestreFilter}
              onChange={(e) => setSemestreFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
            >
              <option value="all">🎓 Todos los Semestres</option>
              <option value="1°">1° Semestre</option>
              <option value="3°">3° Semestre</option>
              <option value="5°">5° Semestre</option>
            </select>
          </div>

          {/* Filter Grupo */}
          <div>
            <select
              value={grupoFilter}
              onChange={(e) => setGrupoFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
            >
              <option value="all">👥 Todos los Grupos</option>
              {availableGroups.filter(g => g !== 'all').map(g => (
                <option key={g} value={g}>{g === 'TODOS' ? '⭐ General (Todos)' : `Grupo ${g}`}</option>
              ))}
            </select>
          </div>

          {/* Filter Tipo (PDF o Video) */}
          <div>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white bg-[#0b101d] border-white/10"
            >
              <option value="all">📁 Todos los Formatos</option>
              <option value="pdf">📄 Solo Documentos PDF</option>
              <option value="video">🎥 Solo Videos de YouTube</option>
            </select>
          </div>

        </div>

        {/* Quick Materia Filter Tags */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-1 pb-1 text-xs no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">Materia:</span>
          {MATERIAS_LIST.map(m => (
            <button
              key={m}
              onClick={() => setMateriaFilter(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                materiaFilter === m
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {m === 'TODAS' ? '⭐ Todas las Materias' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Validation Queue Alert for Admins */}
      {isAdminOrSuper && pendingCount > 0 && activeTab !== 'validacion' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-amber-300">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Hay {pendingCount} recurso{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de validación</span>
              <p className="text-[11px] text-gray-300 mt-0.5">Los docentes han enviado nuevos materiales para revisión de Dirección Escolar.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('validacion')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-md shadow-amber-500/20"
          >
            Revisar y Validar Pendientes →
          </button>
        </div>
      )}

      {/* Resources Cards Grid - Mobile, Tablet & Desktop Responsive */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-gray-400">Cargando repositorio educativo institucional...</p>
        </div>
      ) : displayedResources.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-3xl border border-white/10 p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto text-2xl">
            📚
          </div>
          <h3 className="text-base font-bold text-white">No se encontraron recursos en este filtro</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {activeTab === 'validacion'
              ? '¡Excelente! No hay recursos pendientes de validación por el Administrador.'
              : activeTab === 'mis_recursos'
              ? 'Aún no has subido recursos educativos. Usa "+ Subir Recurso" para compartir guías o videos.'
              : 'Prueba cambiando los filtros de semestre, grupo o materia.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedResources.map((rec) => {
            const isPending = rec.estado === 'pendiente';
            const isApproved = rec.estado === 'aprobado';
            const isRejected = rec.estado === 'rechazado';
            const isPdf = rec.tipo === 'pdf';

            return (
              <div
                key={rec.id}
                className={`glass-panel rounded-3xl border transition-all flex flex-col justify-between overflow-hidden group ${
                  isPending 
                    ? 'border-amber-500/40 bg-amber-500/[0.02]' 
                    : isRejected
                    ? 'border-red-500/30 bg-red-500/[0.02] opacity-80'
                    : 'border-white/10 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]'
                }`}
              >
                {/* Thumbnail / Header Preview */}
                <div className="relative h-40 bg-black/50 overflow-hidden cursor-pointer" onClick={() => handleOpenResource(rec)}>
                  {isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-rose-950/40 via-black to-[#090d16] text-rose-400 group-hover:scale-105 transition-transform duration-300">
                      <FileText size={44} className="mb-2" />
                      <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Documento PDF</span>
                      {rec.archivoTamano && (
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{rec.archivoTamano}</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={getYouTubeThumbnail(rec.youtubeId || rec.videoUrl || '')} 
                        alt={rec.titulo}
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <YouTubeIcon size={24} />
                        </div>
                      </div>
                      {rec.duracion && (
                        <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                          {rec.duracion}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status Badge in corner */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black flex items-center gap-1 shadow">
                        <Clock size={11} /> Pendiente de Validación
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 text-white flex items-center gap-1 shadow">
                        <Check size={11} /> Aprobado
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1 shadow">
                        <X size={11} /> Rechazado
                      </span>
                    )}
                  </div>

                  {/* Semestre & Grupo Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/80 text-cyan-300 border border-cyan-500/30">
                      {rec.semestre} • {rec.grupo}
                    </span>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      {rec.materia}
                    </div>

                    <h4 
                      onClick={() => handleOpenResource(rec)}
                      className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {rec.titulo}
                    </h4>

                    {rec.descripcion && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {rec.descripcion}
                      </p>
                    )}

                    {/* Rejection Notice if any */}
                    {isRejected && rec.motivoRechazo && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 space-y-0.5">
                        <span className="font-bold">Motivo de revisión:</span>
                        <p>{rec.motivoRechazo}</p>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Actions */}
                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="truncate max-w-[170px]" title={rec.autorNombre}>
                        Por: <strong className="text-gray-300">{rec.autorNombre}</strong>
                      </span>
                      <span>{new Date(rec.fechaCreacion).toLocaleDateString()}</span>
                    </div>

                    {/* Validation Controls (For Administrador & Superadmin) */}
                    {isAdminOrSuper && isPending && (
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleApprove(rec.id)}
                          disabled={isProcessingAction}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Aprobar</span>
                        </button>

                        <button
                          onClick={() => { setRejectingResource(rec); setRejectionReason(''); }}
                          disabled={isProcessingAction}
                          className="py-1.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 font-bold text-xs border border-red-500/30 transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <X size={14} />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    )}

                    {/* User Action Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenResource(rec)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          isPdf
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                            : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {isPdf ? <FileText size={14} /> : <YouTubeIcon size={14} />}
                        <span>{isPdf ? 'Abrir Guía PDF' : 'Ver Video'}</span>
                      </button>

                      {/* Delete Option for Admins or Author */}
                      {(isAdminOrSuper || (user?.email && rec.autorEmail.toLowerCase() === user.email.toLowerCase())) && (
                        <button
                          onClick={() => handleDelete(rec.id, rec.titulo)}
                          className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Eliminar recurso"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md glass-panel bg-[#090d16] border border-red-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400" />
              <span>Rechazar Recurso para Corrección</span>
            </h3>

            <p className="text-xs text-gray-300">
              Indica al docente qué modificaciones requiere el recurso antes de ser publicado en el aula de los alumnos:
            </p>

            <textarea
              rows={3}
              placeholder="Ej: Por favor verificar la resolución del video o agregar el número de ejercicios en el título..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white border border-white/10 focus:border-red-500"
              autoFocus
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingResource(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-md shadow-red-600/30"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Resource Modal (Solo para roles con permisos de subida) */}
      {canUpload && (
        <UploadResourceModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(nuevo, msg) => {
            showToast(msg, 'success');
            loadRecursos();
          }}
          defaultSemestre={semestreFilter !== 'all' ? semestreFilter : '3°'}
          defaultGrupo={grupoFilter !== 'all' ? grupoFilter : 'TODOS'}
          defaultMateria={materiaFilter !== 'TODAS' ? materiaFilter : ''}
        />
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        recurso={selectedPdfResource}
        onClose={() => setSelectedPdfResource(null)}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        recurso={selectedVideoResource}
        onClose={() => setSelectedVideoResource(null)}
      />

    </div>
  );
}
