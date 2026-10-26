"use strict";

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db, Alumno } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import QRCode from 'qrcode';
import { 
  Printer, ArrowLeft, Search, CheckCircle2, 
  Scissors
} from 'lucide-react';

export default function QRReportPage() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Alumno[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('3APGA');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCutGuides, setShowCutGuides] = useState<boolean>(true);
  const [showGroupBadge, setShowGroupBadge] = useState<boolean>(true);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingQRs, setIsGeneratingQRs] = useState<boolean>(true);

  // Load students
  useEffect(() => {
    const load = async () => {
      try {
        const data = await db.getAlumnos();
        setStudents(data);
      } catch (err) {
        console.error('Error cargando alumnos para reporte:', err);
      }
    };
    load();
  }, []);

  // Groups and grades options
  const availableGroups = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grupo))).filter(Boolean).sort();
  }, [students]);

  const availableGrades = useMemo(() => {
    return Array.from(new Set(['1°', '3°', '5°', ...students.map(s => s.grado)])).filter(Boolean);
  }, [students]);

  // Set default group if 3APGA isn't present
  useEffect(() => {
    if (availableGroups.length > 0 && !availableGroups.includes(selectedGroup) && selectedGroup !== 'TODOS') {
      setSelectedGroup(availableGroups[0]);
    }
  }, [availableGroups, selectedGroup]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchGroup = selectedGroup === 'TODOS' || !selectedGroup ? true : student.grupo === selectedGroup;
      const matchGrade = selectedGrade ? student.grado === selectedGrade : true;
      const matchSearch = searchQuery
        ? student.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.apellido_paterno.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (student.apellido_materno && student.apellido_materno.toLowerCase().includes(searchQuery.toLowerCase())) ||
          student.matricula.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchGroup && matchGrade && matchSearch;
    }).sort((a, b) => {
      const p = (a.apellido_paterno || '').localeCompare(b.apellido_paterno || '');
      if (p !== 0) return p;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
  }, [students, selectedGroup, selectedGrade, searchQuery]);

  // Pre-generate high-res offline QR codes (1.5 cm x 1.5 cm optimized)
  useEffect(() => {
    let isCancelled = false;
    const generateQRs = async () => {
      if (filteredStudents.length === 0) {
        setIsGeneratingQRs(false);
        return;
      }
      setIsGeneratingQRs(true);
      const urls: Record<string, string> = {};

      for (const st of filteredStudents) {
        if (isCancelled) return;
        const codeText = st.qr_code || st.matricula;
        try {
          const url = await QRCode.toDataURL(codeText, {
            width: 180,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          urls[st.matricula] = url;
        } catch (e) {
          console.warn('Error generando QR para', st.matricula, e);
        }
      }

      if (!isCancelled) {
        setQrCodeDataUrls(urls);
        setIsGeneratingQRs(false);
      }
    };

    generateQRs();
    return () => {
      isCancelled = true;
    };
  }, [filteredStudents]);

  const handlePrint = () => {
    window.print();
  };

  // Estimate sheets: ~64 to 72 labels fit on a Letter page with 1.5cm QR + text
  const estimatedLabelsPerPage = 64;
  const estimatedPages = Math.ceil(filteredStudents.length / estimatedLabelsPerPage) || 1;

  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      
      {/* Non-printable Screen Controls */}
      <div className="print:hidden border-b border-white/10 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          
          {/* Top Bar Navigation & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link 
                href="/dashboard/students" 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Regresar a Alumnos"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>Reporte de Etiquetas QR</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    1.5 cm × 1.5 cm
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Selecciona el grupo deseado. El sistema optimiza el acomodo para que quepan los que alcancen por hoja.
                </p>
              </div>
            </div>

            {/* Print button */}
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                disabled={isGeneratingQRs || filteredStudents.length === 0}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer size={16} />
                <span>{isGeneratingQRs ? 'Generando QRs...' : `Imprimir ${filteredStudents.length} Etiquetas`}</span>
              </button>
            </div>
          </div>

          {/* Filters and Options Bar */}
          <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Grupo selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Grupo:</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-cyan-400 bg-[#0b0f1a] border-cyan-500/30 focus:border-cyan-400"
                >
                  <option value="TODOS">Todos los Grupos ({students.length} alumnos)</option>
                  {availableGroups.map(grp => {
                    const count = students.filter(s => s.grupo === grp).length;
                    return (
                      <option key={grp} value={grp}>
                        {grp} ({count} alumnos)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Grado selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Grado:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-[#0b0f1a]"
                >
                  <option value="">Todos los Grados</option>
                  {availableGrades.map(g => (
                    <option key={g} value={g}>{g} Grado</option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs text-white w-44 sm:w-56"
                />
              </div>

            </div>

            {/* Customization checkboxes */}
            <div className="flex items-center space-x-4 text-xs text-gray-300">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCutGuides}
                  onChange={(e) => setShowCutGuides(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Scissors size={12} className="text-cyan-400" /> Líneas de corte
                </span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGroupBadge}
                  onChange={(e) => setShowGroupBadge(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span>Mostrar Grupo</span>
              </label>
            </div>

          </div>

          {/* Status badge summary */}
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2 px-1">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> {filteredStudents.length} alumnos seleccionados
              </span>
              <span>•</span>
              <span>Medida del QR: <strong>1.5 cm × 1.5 cm</strong></span>
              <span>•</span>
              <span className="text-cyan-300 font-medium">
                Acomodo aproximado: ~{estimatedPages} {estimatedPages === 1 ? 'hoja carta' : 'hojas carta'}
              </span>
            </div>

            <div className="text-[11px] text-gray-400 italic">
              💡 Tip: Al imprimir, selecciona tamaño Carta (Letter) y márgenes mínimos.
            </div>
          </div>

        </div>
      </div>

      {/* Main Print Container & Sheet Preview */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {filteredStudents.length === 0 ? (
          <div className="glass-panel p-16 rounded-2xl text-center space-y-3">
            <div className="text-4xl">🔎</div>
            <h3 className="text-lg font-bold text-white">No hay alumnos que coincidan con los filtros</h3>
            <p className="text-gray-400 text-xs">Selecciona otro grupo o borra la búsqueda para visualizar las etiquetas.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            
            {/* Visual Paper Canvas Representation (Printable Area) */}
            <div className="qr-report-sheet bg-white text-black p-4 sm:p-6 shadow-2xl rounded-sm print:p-0 print:shadow-none print:m-0 w-full max-w-[21.59cm]">
              
              {/* Header on printed sheet */}
              <div className="text-center pb-2 mb-3 border-b border-gray-300 text-gray-800">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                  <span>CECYTE BC • SISTEMA INSTITUCIONAL DOJOIA</span>
                  <span>GRUPO: {selectedGroup}</span>
                  <span>{filteredStudents.length} ETIQUETAS</span>
                </div>
              </div>

              {/* Grid of QR Stickers */}
              <div className="qr-stickers-grid flex flex-wrap justify-start gap-1 sm:gap-1.5 print:gap-1">
                {filteredStudents.map((student) => {
                  const qrUrl = qrCodeDataUrls[student.matricula];

                  return (
                    <div
                      key={student.matricula}
                      className={`qr-sticker-item flex flex-col items-center justify-between p-1 bg-white text-black text-center ${
                        showCutGuides ? 'border border-dashed border-gray-300 print:border-gray-400' : 'border border-transparent'
                      }`}
                      style={{
                        width: '2.45cm',
                        minHeight: '3.1cm',
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                      }}
                    >
                      {/* Top Tiny Subheader (optional group badge) */}
                      {showGroupBadge && (
                        <div className="w-full flex items-center justify-between text-[7px] font-bold text-gray-600 px-0.5 leading-none">
                          <span className="tracking-tight">CECYTE</span>
                          <span className="font-mono bg-gray-100 px-1 py-0.2 rounded text-gray-800">{student.grupo}</span>
                        </div>
                      )}

                      {/* The QR Code - EXACTLY 1.5 cm x 1.5 cm */}
                      <div 
                        className="qr-image-container flex items-center justify-center my-0.5"
                        style={{
                          width: '1.5cm',
                          height: '1.5cm'
                        }}
                      >
                        {qrUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrUrl}
                            alt={`QR ${student.matricula}`}
                            style={{
                              width: '1.5cm',
                              height: '1.5cm',
                              imageRendering: 'pixelated',
                              display: 'block'
                            }}
                          />
                        ) : (
                          <div 
                            className="bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 font-mono"
                            style={{ width: '1.5cm', height: '1.5cm' }}
                          >
                            ...
                          </div>
                        )}
                      </div>

                      {/* Name and Matricula Under the QR Code */}
                      <div className="w-full flex flex-col items-center justify-center text-center leading-tight">
                        {/* Student Name */}
                        <div 
                          className="font-bold text-[7.5pt] text-gray-900 leading-[1.05] line-clamp-2 uppercase"
                          title={`${student.nombre} ${student.apellido_paterno} ${student.apellido_materno || ''}`}
                        >
                          {student.apellido_paterno} {student.apellido_materno ? student.apellido_materno[0] + '.' : ''} {student.nombre}
                        </div>

                        {/* Student Matricula */}
                        <div className="font-mono font-black text-[7pt] text-black tracking-tight mt-0.5">
                          {student.matricula}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Global CSS for Clean Printing */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, footer, nav, button, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .qr-report-sheet {
            box-shadow: none !important;
            padding: 0.5cm !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            background: #ffffff !important;
          }
          @page {
            size: letter portrait;
            margin: 0.8cm;
          }
          .qr-sticker-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
}
