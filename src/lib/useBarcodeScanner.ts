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
      // High pleasant futuristic double chime
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
          osc2.frequency.setValueAtTime(1174, ctx2.currentTime); // D6 note
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.16);
        } catch {}
      }, 110);

    } else if (type === 'duplicate') {
      // Warning double tone
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
      // Hardware detected chirp
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
      // Error low buzz
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
  maxKeyIntervalMs = 65, // Standard physical barcode readers type between 10ms - 40ms per key
  playSound = true
}: BarcodeScannerOptions) {
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [totalScansCount, setTotalScansCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(playSound);
  const [isHardwareActive, setIsHardwareActive] = useState<boolean>(true);
  const [connectedHidDevices, setConnectedHidDevices] = useState<string[]>([]);
  const [hasWebHidSupport, setHasWebHidSupport] = useState<boolean>(false);

  // Buffer state stored in refs to avoid re-renders during high-speed typing
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyIntervalsRef = useRef<number[]>([]);
  const timeoutRef = useRef<any>(null);

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
        const names = devices.map((d: any) => d.productName || `Dispositivo HID USB (${d.vendorId?.toString(16)})`);
        setConnectedHidDevices(names);
      }
    } catch (e) {
      console.warn('WebHID getDevices error:', e);
    }
  };

  const connectWebHidScanner = async () => {
    if (typeof window === 'undefined' || !('hid' in navigator)) {
      alert('Tu navegador no soporta la API WebHID directa, pero el escáner funciona de forma automática y transparente mediante teclado virtual USB.');
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
        console.warn('WebHID requestDevice cancelled or failed:', err);
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

      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // Check if target is a designated manual barcode input
      const isTargetManualBarcodeInput = target && target.getAttribute('data-barcode-input') === 'true';

      // 1. Enter key: end of barcode scan transmission
      if (e.key === 'Enter') {
        // Evaluate if buffer contains a barcode
        const currentBuffer = bufferRef.current.trim();
        const intervals = keyIntervalsRef.current;
        const avgInterval = intervals.length > 0 
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
          : 999;

        // A physical barcode reader typically averages < 50ms per key
        const isLikelyScanner = intervals.length >= 3 && avgInterval <= maxKeyIntervalMs;
        const isNonInputScan = !isInputFocused && currentBuffer.length >= minBarcodeLength;
        const isManualBarcodeField = isTargetManualBarcodeInput && currentBuffer.length >= minBarcodeLength;

        if (isLikelyScanner || isNonInputScan || isManualBarcodeField) {
          e.preventDefault();
          e.stopPropagation();

          // If another unrelated input (like search box) was focused, clean out the barcode from it
          if (isInputFocused && !isTargetManualBarcodeInput && (target as HTMLInputElement)) {
            const inputEl = target as HTMLInputElement;
            // Remove barcode characters that were just typed rapidly
            if (inputEl.value.endsWith(currentBuffer)) {
              inputEl.value = inputEl.value.slice(0, -currentBuffer.length);
            }
          }

          bufferRef.current = '';
          keyIntervalsRef.current = [];
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          processBarcode(currentBuffer, isLikelyScanner ? 'hardware_scanner' : 'manual_input');
          return;
        }

        // Reset buffer on Enter if not processed
        bufferRef.current = '';
        keyIntervalsRef.current = [];
        return;
      }

      // Ignore modifiers and function keys
      if (e.key.length !== 1) {
        if (e.key === 'Escape') {
          bufferRef.current = '';
          keyIntervalsRef.current = [];
        }
        return;
      }

      // 2. Single printable character
      // Track timing interval
      if (bufferRef.current.length > 0) {
        keyIntervalsRef.current.push(interval);
      } else {
        keyIntervalsRef.current = [];
      }

      // If too much time passed between characters (> 750ms), reset buffer
      if (interval > 750 && bufferRef.current.length > 0) {
        bufferRef.current = '';
        keyIntervalsRef.current = [];
      }

      bufferRef.current += e.key;

      // Keep buffer auto-clearing after 1.2 seconds of silence
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
        keyIntervalsRef.current = [];
      }, 1200);
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxKeyIntervalMs, minBarcodeLength, processBarcode]);

  return {
    lastScannedBarcode,
    lastScanTimestamp,
    totalScansCount,
    soundEnabled,
    setSoundEnabled,
    isHardwareActive,
    setIsHardwareActive,
    connectedHidDevices,
    hasWebHidSupport,
    connectWebHidScanner,
    triggerManualScan: (code: string) => processBarcode(code, 'manual_input'),
    playAudioFeedback
  };
}
