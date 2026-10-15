"use strict";

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface BarcodeScannerOptions {
  onScan: (barcode: string, source: 'hardware_scanner' | 'manual_input' | 'webhid') => void | Promise<void>;
  enabled?: boolean;
  minBarcodeLength?: number;
  maxKeyIntervalMs?: number; // Maximum ms between characters to qualify as a scanner burst
  playSound?: boolean;
}

export function playAudioFeedback(type: 'success' | 'duplicate' | 'error' | 'connect') {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1174, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.16);
        } catch {}
      }, 110);

    } else if (type === 'duplicate') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(370, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);

      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(311, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.25);
        } catch {}
      }, 150);

    } else if (type === 'connect') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(987, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.05, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.12);
        } catch {}
      }, 70);

    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minBarcodeLength = 3,
  maxKeyIntervalMs = 120, // Generous tolerance for wireless/Bluetooth/USB scanners
  playSound = true
}: BarcodeScannerOptions) {
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [totalScansCount, setTotalScansCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(playSound);
  const [isReceivingSignal, setIsReceivingSignal] = useState<boolean>(false);
  const [connectedHidDevices, setConnectedHidDevices] = useState<string[]>([]);
  const [hasWebHidSupport, setHasWebHidSupport] = useState<boolean>(false);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyIntervalsRef = useRef<number[]>([]);
  const timeoutRef = useRef<any>(null);
  const signalTimeoutRef = useRef<any>(null);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Check WebHID support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'hid' in navigator) {
      setHasWebHidSupport(true);
      refreshConnectedHidDevices();
    }
  }, []);

  const refreshConnectedHidDevices = async () => {
    try {
      if (typeof window !== 'undefined' && 'hid' in navigator) {
        const devices = await (navigator as any).hid.getDevices();
        const names = devices.map((d: any) => d.productName || `Lector HID (${d.vendorId?.toString(16)})`);
        setConnectedHidDevices(names);
      }
    } catch (e) {
      console.warn('WebHID getDevices error:', e);
    }
  };

  const connectWebHidScanner = async () => {
    if (typeof window === 'undefined' || !('hid' in navigator)) {
      alert('Tu navegador no soporta WebHID nativo, pero el escáner funciona de forma automática mediante teclado virtual USB.');
      return;
    }

    try {
      const devices = await (navigator as any).hid.requestDevice({ filters: [] });
      if (devices && devices.length > 0) {
        await refreshConnectedHidDevices();
        if (soundEnabled) playAudioFeedback('connect');
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.warn('WebHID requestDevice error:', err);
      }
    }
  };

  const processBarcode = useCallback(async (code: string, source: 'hardware_scanner' | 'manual_input' | 'webhid') => {
    const cleanCode = code.trim().replace(/^[\r\n\s]+|[\r\n\s]+$/g, '');
    if (!cleanCode || cleanCode.length < minBarcodeLength) return;

    setLastScannedBarcode(cleanCode);
    setLastScanTimestamp(Date.now());
    setTotalScansCount(prev => prev + 1);

    try {
      await onScanRef.current(cleanCode, source);
    } catch (error) {
      console.error('Error handling scan:', error);
    }
  }, [minBarcodeLength]);

  // Master Global Keydown Listener for physical Barcode Guns (Keyboard Wedge)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Active visual signal on keystroke
      setIsReceivingSignal(true);
      if (signalTimeoutRef.current) clearTimeout(signalTimeoutRef.current);
      signalTimeoutRef.current = setTimeout(() => {
        setIsReceivingSignal(false);
      }, 350);

      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      const isTargetManualBarcodeInput = target && target.getAttribute('data-barcode-input') === 'true';

      // 1. Detect Terminator Key: Enter, NumpadEnter, Tab, or keyCode 13/9
      const isTerminator = e.key === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Tab' || e.keyCode === 13 || e.keyCode === 9;

      if (isTerminator) {
        const currentBuffer = bufferRef.current.trim();
        const intervals = keyIntervalsRef.current;
        const avgInterval = intervals.length > 0 
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
          : 999;

        const isLikelyScanner = intervals.length >= 2 && avgInterval <= maxKeyIntervalMs;
        const isNonInputScan = !isInputFocused && currentBuffer.length >= minBarcodeLength;
        const isManualBarcodeField = isTargetManualBarcodeInput && currentBuffer.length >= minBarcodeLength;

        if (isLikelyScanner || isNonInputScan || isManualBarcodeField) {
          e.preventDefault();
          e.stopPropagation();

          if (isInputFocused && !isTargetManualBarcodeInput && (target as HTMLInputElement)) {
            const inputEl = target as HTMLInputElement;
            if (inputEl.value && currentBuffer && inputEl.value.endsWith(currentBuffer)) {
              inputEl.value = inputEl.value.slice(0, -currentBuffer.length);
            }
          }

          bufferRef.current = '';
          keyIntervalsRef.current = [];
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          processBarcode(currentBuffer, isLikelyScanner ? 'hardware_scanner' : 'manual_input');
          return;
        }

        bufferRef.current = '';
        keyIntervalsRef.current = [];
        return;
      }

      // Ignore modifiers and Escape
      if (e.key === 'Escape') {
        bufferRef.current = '';
        keyIntervalsRef.current = [];
        return;
      }

      // Collect single character keys
      if (e.key.length === 1) {
        if (bufferRef.current.length > 0) {
          keyIntervalsRef.current.push(interval);
        } else {
          keyIntervalsRef.current = [];
        }

        // If too much idle time passed between characters (> 900ms), start fresh buffer
        if (interval > 900 && bufferRef.current.length > 0) {
          bufferRef.current = '';
          keyIntervalsRef.current = [];
        }

        bufferRef.current += e.key;

        // Auto-clear buffer if no terminator arrives within 1.5 seconds
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
          keyIntervalsRef.current = [];
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (signalTimeoutRef.current) clearTimeout(signalTimeoutRef.current);
    };
  }, [enabled, maxKeyIntervalMs, minBarcodeLength, processBarcode]);

  return {
    lastScannedBarcode,
    lastScanTimestamp,
    totalScansCount,
    soundEnabled,
    setSoundEnabled,
    isReceivingSignal,
    connectedHidDevices,
    hasWebHidSupport,
    connectWebHidScanner,
    triggerManualScan: (code: string) => processBarcode(code, 'manual_input'),
    playAudioFeedback
  };
}
