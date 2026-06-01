"use strict";

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Alumno } from '@/lib/db';
import { 
  Search, Plus, Upload, Printer, Trash2, X, FileText, CheckCircle2, User, Phone, Layers, Shield, Download
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<Alumno[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Alumno | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    matricula: '',
    grado: '',
    grupo: '',
    tutor: '',
    telefono: '',
    foto_url: ''
  });

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await db.getAlumnos();
      setStudents(data);
    } catch (e) {
      console.error('Error loading students:', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.apellido_paterno || !formData.matricula || !formData.grado || !formData.grupo) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    try {
      // Set default QR code as the student's matricula ID
      await db.addAlumno({
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno || '',
        matricula: formData.matricula,
        grado: formData.grado,
        grupo: formData.grupo,
        tutor: formData.tutor || 'No asignado',
        telefono: formData.telefono || '+52',
        foto_url: formData.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.matricula}`,
        qr_code: formData.matricula
      });

      // Clear Form and reload
      setFormData({
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        matricula: '',
        grado: '',
        grupo: '',
        tutor: '',
        telefono: '',
        foto_url: ''
      });
      setIsModalOpen(false);
      loadStudents();
    } catch (error: any) {
      alert(`Error al registrar alumno: ${error.message || error}`);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar a ${name}? Esta acción también borrará sus registros de asistencia.`)) {
      return;
    }

    try {
      await db.deleteAlumno(id);
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
      loadStudents();
    } catch (error: any) {
      alert(`Error al eliminar alumno: ${error.message || error}`);
    }
  };



  // Filter students based on search queries
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.apellido_paterno.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.apellido_materno && student.apellido_materno.toLowerCase().includes(searchQuery.toLowerCase())) ||
      student.matricula.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGrade = gradeFilter ? student.grado === gradeFilter : true;
    const matchesGroup = groupFilter ? student.grupo === groupFilter : true;

    return matchesSearch && matchesGrade && matchesGroup;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Directorio de Alumnos</h2>
          <p className="text-gray-400 text-sm mt-1">Administra la base de estudiantes y genera credenciales con códigos QR.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Registrar Alumno</span>
          </button>
        </div>
      </div>



      {/* Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Filter Controls and Student List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Controls Bar */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input py-2.5 pl-10 pr-4 rounded-xl text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="flex-1 md:flex-initial glass-input px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
              >
                <option value="">Todos los Grados</option>
                <option value="1°">1° Grado</option>
                <option value="2°">2° Grado</option>
                <option value="3°">3° Grado</option>
              </select>

              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="flex-1 md:flex-initial glass-input px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
              >
                <option value="">Todos los Grupos</option>
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
                <option value="C">Grupo C</option>
              </select>
            </div>

          </div>

          {/* Student Grid / List */}
          {filteredStudents.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto">
                🔎
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Ningún alumno coincide</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">Prueba limpiando los filtros o agregando nuevos alumnos al listado escolar.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`glass-panel p-5 rounded-2xl flex items-center justify-between border cursor-pointer group hover:scale-[1.01] hover:border-cyan-500/20 transition-all ${
                    selectedStudent?.id === student.id ? 'border-cyan-500/40 bg-cyan-500/[0.02]' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Student Photo */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 shrink-0 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.matricula}`} 
                        alt={student.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Student Details */}
                    <div>
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm sm:text-base line-clamp-1">{student.nombre} {student.apellido_paterno} {student.apellido_materno || ''}</h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                        <span className="font-mono">{student.matricula}</span>
                        <span>•</span>
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-300 font-semibold">{student.grado} &quot;{student.grupo}&quot;</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStudent(student.id, student.nombre);
                      }}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Eliminar Alumno"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Visual Student Credential Preview (1 col) */}
        <div>
          {selectedStudent ? (
            <div className="glass-panel p-6 rounded-2xl border-cyan-500/10 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Credencial Digital</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full font-mono">{selectedStudent.matricula}</span>
              </div>

              {/* ID Card Box (Optimized for Screen and Print) */}
              <div id="student-id-card-print" className="glass-panel p-6 rounded-2xl border-cyan-500/20 bg-gradient-to-b from-[#0e1220] to-[#08090d] relative overflow-hidden flex flex-col items-center text-center space-y-5 shadow-2xl">
                {/* Print Banner header */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-xs">D</div>
                    <span className="font-extrabold text-xs tracking-wider text-white">DOJOIA ACCESS</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-extrabold bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">ALUMNO</span>
                </div>

                {/* Picture */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-400/40 p-1 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={selectedStudent.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudent.matricula}`} 
                    alt={selectedStudent.nombre}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <h3 className="font-black text-white text-lg leading-tight">{selectedStudent.nombre} {selectedStudent.apellido_paterno} {selectedStudent.apellido_materno || ''}</h3>
                  <p className="text-gray-400 text-xs font-mono">{selectedStudent.matricula}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Grado y Grupo</span>
                    <span className="font-bold text-white">{selectedStudent.grado} &quot;{selectedStudent.grupo}&quot;</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Ciclo Escolar</span>
                    <span className="font-bold text-cyan-400">2026-2027</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-3.5 rounded-xl shadow-lg border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(selectedStudent.qr_code)}&bgcolor=ffffff&color=000000`} 
                    alt="Código QR del Alumno"
                    className="w-24 h-24"
                  />
                </div>

                <div className="w-full pt-3 border-t border-white/5 text-[9px] text-gray-500 font-mono">
                  Escanee esta credencial en la entrada principal
                </div>
              </div>

              {/* Extra Tutor & Contact Data */}
              <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/5 text-sm">
                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <User size={16} className="text-cyan-400" />
                  <div>
                    <span className="text-gray-500 text-[10px] block uppercase">Padre o Tutor</span>
                    <span className="text-white font-semibold">{selectedStudent.tutor}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <Phone size={16} className="text-cyan-400" />
                  <div>
                    <span className="text-gray-500 text-[10px] block uppercase">Teléfono de WhatsApp</span>
                    <span className="text-white font-mono">{selectedStudent.telefono}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl glass-panel text-sm text-cyan-400 font-bold hover:bg-white/5 hover:border-cyan-500/20 transition-all cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimir Credencial</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border-dashed border-white/10 text-center space-y-4 flex flex-col justify-center h-80">
              <div className="text-4xl text-gray-600">🪪</div>
              <div>
                <h4 className="font-bold text-white text-sm">Vista Previa de Credencial</h4>
                <p className="text-gray-500 text-xs max-w-[200px] mx-auto mt-1">Selecciona un alumno del listado para generar e imprimir su tarjeta digital QR.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Register Manual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg glass-panel p-6 sm:p-8 rounded-2xl border-cyan-500/10 space-y-6">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-2xl font-black text-white">Registrar Alumno</h3>
              <p className="text-gray-400 text-sm mt-1">Completa la ficha de información para crear al alumno y su respectivo código QR.</p>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Nombre(s) *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej. Carlos"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Apellido Paterno *</label>
                  <input
                    type="text"
                    name="apellido_paterno"
                    required
                    value={formData.apellido_paterno}
                    onChange={handleInputChange}
                    placeholder="Ej. Martínez"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Apellido Materno</label>
                  <input
                    type="text"
                    name="apellido_materno"
                    value={formData.apellido_materno}
                    onChange={handleInputChange}
                    placeholder="Ej. López"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Matrícula o ID Escolar *</label>
                  <input
                    type="text"
                    name="matricula"
                    required
                    value={formData.matricula}
                    onChange={handleInputChange}
                    placeholder="Ej. DOJ-2026-001"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Grado *</label>
                    <select
                      name="grado"
                      required
                      value={formData.grado}
                      onChange={handleInputChange}
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="">Selecciona</option>
                      <option value="1°">1°</option>
                      <option value="2°">2°</option>
                      <option value="3°">3°</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Grupo *</label>
                    <select
                      name="grupo"
                      required
                      value={formData.grupo}
                      onChange={handleInputChange}
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="">Selecciona</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Tutor / Apoderado</label>
                  <input
                    type="text"
                    name="tutor"
                    value={formData.tutor}
                    onChange={handleInputChange}
                    placeholder="Sra. Mariana López"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Teléfono de WhatsApp</label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="+52 55 1234 5678"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">URL de Fotografía (Opcional)</label>
                  <input
                    type="url"
                    name="foto_url"
                    value={formData.foto_url}
                    onChange={handleInputChange}
                    placeholder="https://images.unsplash.com/... (o dejar vacío para avatar automático)"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl glass-panel text-sm text-gray-400 font-bold hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
                >
                  Crear Registro
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Global CSS style overrides for printing credentials */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #student-id-card-print, #student-id-card-print * {
            visibility: visible;
          }
          #student-id-card-print {
            position: absolute;
            left: 50% !important;
            top: 40% !important;
            transform: translate(-50%, -50%) scale(1.4) !important;
            width: 320px !important;
            border: 2px solid #00f2fe !important;
            box-shadow: none !important;
            background: #08090d !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
}
