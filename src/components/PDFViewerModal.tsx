"use strict";

'use client';

import React from 'react';
import { X, Download, FileText, ExternalLink, Printer } from 'lucide-react';
import { RecursoEducativo } from '@/lib/recursos';

interface PDFViewerModalProps {
  recurso: RecursoEducativo | null;
  onClose: () => void;
}

export default function PDFViewerModal({ recurso, onClose }: PDFViewerModalProps) {
  if (!recurso || recurso.tipo !== 'pdf') return null;

  const fileUrl = recurso.archivoUrl || '';
  const fileName = recurso.archivoNombre || `${recurso.titulo}.pdf`;

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!fileUrl) return;
    const printWindow = window.open(fileUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-5xl h-[92vh] glass-panel bg-[#090d16] border border-rose-500/30 rounded-3xl flex flex-col shadow-[0_0_60px_rgba(244,63,94,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0b101e]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{recurso.titulo}</h3>
              <p className="text-[11px] text-gray-400 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{recurso.materia}</span>
                <span>•</span>
                <span>Semestre {recurso.semestre} ({recurso.grupo})</span>
                {recurso.archivoTamano && <span>• {recurso.archivoTamano}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Abrir en pestaña nueva / Imprimir"
            >
              <Printer size={16} />
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              title="Descargar archivo PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF Embedded Frame */}
        <div className="flex-1 bg-black/60 relative">
          {fileUrl ? (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              title={recurso.titulo}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <FileText size={48} className="text-gray-500" />
              <p className="text-sm text-gray-300 font-semibold">El documento no cuenta con un archivo vinculado.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-white/10 bg-[#080d1a] flex items-center justify-between text-[11px] text-gray-400">
          <span>Subido por: <strong className="text-white">{recurso.autorNombre}</strong></span>
          {recurso.validadoPor && (
            <span className="text-emerald-400 font-semibold">
              ✓ Validado por Dirección Escolar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
