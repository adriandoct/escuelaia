"use strict";

'use client';

import React from 'react';
import { X, ExternalLink, Share2, Layers, BookOpen } from 'lucide-react';
import YouTubeIcon from '@/components/YouTubeIcon';
import { RecursoEducativo, getYouTubeEmbedUrl, getYouTubeWatchUrl, CANAL_YOUTUBE_OFICIAL } from '@/lib/recursos';

interface VideoPlayerModalProps {
  recurso: RecursoEducativo | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ recurso, onClose }: VideoPlayerModalProps) {
  if (!recurso || recurso.tipo !== 'video') return null;

  const embedUrl = getYouTubeEmbedUrl(recurso.youtubeId || recurso.videoUrl || '');
  const watchUrl = getYouTubeWatchUrl(recurso.youtubeId || recurso.videoUrl || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl glass-panel bg-[#090d16] border border-red-500/30 rounded-3xl flex flex-col shadow-[0_0_60px_rgba(239,68,68,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0b101e]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
              <YouTubeIcon size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{recurso.titulo}</h3>
              <p className="text-[11px] text-gray-400 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{recurso.materia}</span>
                <span>•</span>
                <span>Semestre {recurso.semestre} ({recurso.grupo})</span>
                <span>•</span>
                <span className="text-red-400 font-mono">{recurso.canalYoutube || CANAL_YOUTUBE_OFICIAL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Ver en YouTube</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Player 16:9 Aspect Ratio */}
        <div className="relative w-full pt-[56.25%] bg-black">
          <iframe
            src={`${embedUrl}&autoplay=1`}
            title={recurso.titulo}
            className="absolute top-0 left-0 w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video Information & Details */}
        <div className="p-5 space-y-3 bg-[#0a0f1d] border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-bold text-white">{recurso.titulo}</h4>
              <p className="text-xs text-gray-400 mt-1">{recurso.descripcion || 'Sin descripción adicional para este material de video.'}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Semestre: {recurso.semestre}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Grupo: {recurso.grupo}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-400 gap-2">
            <div>
              Profesor / Autor: <strong className="text-white">{recurso.autorNombre}</strong>
            </div>

            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-gray-400">Canal:</span>
              <span className="font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20 font-bold">
                {recurso.canalYoutube || CANAL_YOUTUBE_OFICIAL}
              </span>
              {recurso.validadoPor && (
                <span className="text-emerald-400 font-semibold ml-2">
                  ✓ Validado por Administración
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
