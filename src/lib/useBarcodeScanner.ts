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

export function playAudioFeedback(type: 'success' | 'duplicate' | 'error' | 'connect' | 'prompt') {
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

    } else if (type === 'prompt') {
      // Prompt/attention chord for unregistered access
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);

      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(783.99, ctx2.currentTime); // G5
          gain2.gain.setValueAtTime(0.1, ctx2.currentTime);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.22);
        } catch {}
      }, 120);

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

export interface ConnectedScannerDevice {
  name: string;
  vendorId?: number;
  productId?: number;
  type: 'hid' | 'usb' | 'wedge';
}

export function cleanBarcode(code: string): string {
  if (!code) return '';
  let clean = String(code)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim()
    .replace(/^[\r\n\t\s]+|[\r\n\t\s]+$/g, '');

  // Strip AIM Symbology Identifier prefix if present (e.g. "]C1", "]e0", "]E0", "]Q1")
  if (/^\][a-zA-Z0-9]{2}/.test(clean)) {
    clean = clean.substring(3).trim();
  }
  return clean;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minBarcodeLength = 3,
  maxKeyIntervalMs = 120, // Generous tolerance for wireless/Bluetooth/USB ZKTeco scanners
  playSound = true
}: BarcodeScannerOptions) {
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [totalScansCount, setTotalScansCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(playSound);
  const [isReceivingSignal, setIsReceivingSignal] = useState<boolean>(false);
  const [isHardwareScannerConnected, setIsHardwareScannerConnected] = useState<boolean>(false);
  const [isZktecoDetected, setIsZktecoDetected] = useState<boolean>(false);
  const [isJowvdyDetected, setIsJowvdyDetected] = useState<boolean>(false);
  const [jowvdyDetails, setJowvdyDetails] = useState<any>(null);
  const [detectedScannerName, setDetectedScannerName] = useState<string>('Lector JOWVDY / USB Barcode Listo');
  const [connectedHidDevices, setConnectedHidDevices] = useState<string[]>([]);
  const [hasWebHidSupport, setHasWebHidSupport] = useState<boolean>(false);
  const [lastHardwareEvent, setLastHardwareEvent] = useState<{ type: 'connected' | 'disconnected'; name: string; timestamp: number } | null>(null);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyIntervalsRef = useRef<number[]>([]);
  const timeoutRef = useRef<any>(null);
  const trailingBurstTimeoutRef = useRef<any>(null);
  const signalTimeoutRef = useRef<any>(null);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const identifyDeviceName = (d: any): { name: string; isZk: boolean; isJow: boolean } => {
    const prod = (d?.productName || '').trim();
    const vid = d?.vendorId;
    const isJow = prod.toLowerCase().includes('jowvdy') || 
                  prod.toLowerCase().includes('jow') || 
                  vid === 0x0218 || 
                  vid === 536;
    const isZk = prod.toLowerCase().includes('zk') || 
                 prod.toLowerCase().includes('teco') || 
                 vid === 0x1b55 || 
                 vid === 0x0483 ||
                 vid === 0x0416; // Nuvoton Winbond (Used in ZKTeco Barcode Reader engines)

    let friendly = prod;
    if (!friendly) {
      if (isJow || vid === 0x0218) friendly = 'Lector JOWVDY Barcode USB (0218:0210)';
      else if (vid === 0x0416) friendly = 'Lector ZKTeco Láser USB (0416:5020)';
      else if (isZk) friendly = 'Lector ZKTeco Láser USB';
      else if (vid === 0x0c2e) friendly = 'Lector Honeywell Barcode';
      else if (vid === 0x05e0) friendly = 'Lector Zebra / Symbol USB';
      else if (vid === 0x05f9) friendly = 'Lector Datalogic Scanner';
      else friendly = vid ? `Lector Código de Barras USB (${vid.toString(16)})` : 'Escáner Código de Barras USB';
    }
    return { name: friendly, isZk, isJow };
  };

  const refreshConnectedHidDevices = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const deviceNames: string[] = [];
      let foundZk = false;
      let foundJow = false;
      let anyScanner = false;

      // 0. Auto-query local hardware scanner API (Windows PnP / CIM query)
      try {
        const res = await fetch('/api/hardware-scanner');
        if (res.ok) {
          const apiData = await res.json();
          if (apiData?.connected && apiData.scanner) {
            anyScanner = true;
            if (apiData.scanner.brand === 'JOWVDY' || apiData.scanner.vendorId === '0218') {
              foundJow = true;
              setIsJowvdyDetected(true);
              setJowvdyDetails(apiData.scanner);
            }
            const sName = apiData.scanner.model || 'Lector JOWVDY Barcode USB';
            if (!deviceNames.includes(sName)) {
              deviceNames.unshift(sName);
            }
          }
        }
      } catch (err) {
        // Fallback silently if offline
      }

      // 1. Check WebHID devices
      if ('hid' in navigator) {
        const hidDevices = await (navigator as any).hid.getDevices();
        for (const d of hidDevices) {
          const { name, isZk, isJow } = identifyDeviceName(d);
          if (!deviceNames.includes(name)) {
            deviceNames.push(name);
          }
          if (isZk) foundZk = true;
          if (isJow) foundJow = true;
          anyScanner = true;
        }
      }

      // 2. Check WebUSB devices if available
      if ('usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          usbDevices.forEach((d: any) => {
            const { name, isZk, isJow } = identifyDeviceName(d);
            if (!deviceNames.includes(name)) {
              deviceNames.push(name);
            }
            if (isZk) foundZk = true;
            if (isJow) foundJow = true;
            anyScanner = true;
          });
        } catch {}
      }

      // 3. Check persistent localStorage flag for keyboard wedge scanners
      const hasStoredHardware = localStorage.getItem('dojoia_hardware_scanner_detected') === 'true';
      if (hasStoredHardware) {
        anyScanner = true;
        const storedName = localStorage.getItem('dojoia_hardware_scanner_name') || 'Lector JOWVDY / USB Barcode Conectado';
        if (!deviceNames.includes(storedName)) {
          deviceNames.push(storedName);
        }
        if (storedName.toLowerCase().includes('jowvdy') || storedName.toLowerCase().includes('0218')) {
          foundJow = true;
        }
      }

      setConnectedHidDevices(deviceNames);
      if (foundZk) setIsZktecoDetected(true);
      if (foundJow) setIsJowvdyDetected(true);
      if (anyScanner) {
        setIsHardwareScannerConnected(true);
        if (deviceNames.length > 0) {
          setDetectedScannerName(deviceNames[0]);
        }
      }
    } catch (e) {
      console.warn('Error querying connected devices:', e);
    }
  }, []);

  // Listen for WebHID & WebUSB connect and disconnect events in real-time
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('hid' in navigator) {
      setHasWebHidSupport(true);
    }

    refreshConnectedHidDevices();

    const handleHidConnect = (e: any) => {
      const dev = e.device;
      const { name, isZk } = identifyDeviceName(dev);
      setIsHardwareScannerConnected(true);
      if (isZk) setIsZktecoDetected(true);
      setDetectedScannerName(name);
      setLastHardwareEvent({ type: 'connected', name, timestamp: Date.now() });
      if (soundEnabled) playAudioFeedback('connect');
      refreshConnectedHidDevices();
    };

    const handleHidDisconnect = (e: any) => {
      const dev = e.device;
      const { name } = identifyDeviceName(dev);
      setLastHardwareEvent({ type: 'disconnected', name, timestamp: Date.now() });
      refreshConnectedHidDevices();
    };

    const handleUsbConnect = (e: any) => {
      const dev = e.device;
      const { name, isZk } = identifyDeviceName(dev);
      setIsHardwareScannerConnected(true);
      if (isZk) setIsZktecoDetected(true);
      setDetectedScannerName(name);
      setLastHardwareEvent({ type: 'connected', name, timestamp: Date.now() });
      if (soundEnabled) playAudioFeedback('connect');
      refreshConnectedHidDevices();
    };

    const handleUsbDisconnect = (e: any) => {
      const dev = e.device;
      const { name } = identifyDeviceName(dev);
      setLastHardwareEvent({ type: 'disconnected', name, timestamp: Date.now() });
      refreshConnectedHidDevices();
    };

    if ('hid' in navigator) {
      (navigator as any).hid.addEventListener('connect', handleHidConnect);
      (navigator as any).hid.addEventListener('disconnect', handleHidDisconnect);
    }

    if ('usb' in navigator) {
      try {
        (navigator as any).usb.addEventListener('connect', handleUsbConnect);
        (navigator as any).usb.addEventListener('disconnect', handleUsbDisconnect);
      } catch {}
    }

    return () => {
      if ('hid' in navigator) {
        (navigator as any).hid.removeEventListener('connect', handleHidConnect);
        (navigator as any).hid.removeEventListener('disconnect', handleHidDisconnect);
      }
      if ('usb' in navigator) {
        try {
          (navigator as any).usb.removeEventListener('connect', handleUsbConnect);
          (navigator as any).usb.removeEventListener('disconnect', handleUsbDisconnect);
        } catch {}
      }
    };
  }, [refreshConnectedHidDevices, soundEnabled]);

  const connectWebHidScanner = async () => {
    if (typeof window === 'undefined') return;

    if (!('hid' in navigator)) {
      alert('Tu navegador no cuenta con WebHID nativo, pero tu escáner ZKTeco o USB funciona de manera automática y transparente como teclado USB (Keyboard Wedge). ¡Solo conecta y escanea!');
      return;
    }

    try {
      // Request device with priority for barcode / POS filters
      const devices = await (navigator as any).hid.requestDevice({ filters: [] });
      if (devices && devices.length > 0) {
        for (const dev of devices) {
          const { name, isZk } = identifyDeviceName(dev);
          setIsHardwareScannerConnected(true);
          if (isZk) setIsZktecoDetected(true);
          setDetectedScannerName(name);
          localStorage.setItem('dojoia_hardware_scanner_detected', 'true');
          localStorage.setItem('dojoia_hardware_scanner_name', name);

          // Open device and attach raw report listener
          try {
            if (!dev.opened) {
              await dev.open();
            }
            dev.oninputreport = (event: any) => {
              const { data } = event;
              const bytes: number[] = [];
              for (let i = 0; i < data.byteLength; i++) {
                const b = data.getUint8(i);
                if (b >= 32 && b <= 126) bytes.push(b);
              }
              const decoded = String.fromCharCode(...bytes).trim();
              const clean = cleanBarcode(decoded);
              if (clean.length >= minBarcodeLength) {
                processBarcode(clean, 'webhid');
              }
            };
          } catch (e) {
            console.warn('Error opening WebHID device:', e);
          }
        }
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
    const cleanCode = cleanBarcode(code);

    if (!cleanCode || cleanCode.length < minBarcodeLength) return;

    setLastScannedBarcode(cleanCode);
    setLastScanTimestamp(Date.now());
    setTotalScansCount(prev => prev + 1);

    // If scanned via physical hardware gun / wedge, mark scanner as connected & verified!
    if (source === 'hardware_scanner' || source === 'webhid') {
      setIsHardwareScannerConnected(true);
      const name = isZktecoDetected ? 'Lector ZKTeco Láser USB' : 'Lector de Código de Barras USB / Inalámbrico';
      setDetectedScannerName(name);
      localStorage.setItem('dojoia_hardware_scanner_detected', 'true');
      localStorage.setItem('dojoia_hardware_scanner_name', name);
    }

    try {
      await onScanRef.current(cleanCode, source);
    } catch (error) {
      console.error('Error handling scan:', error);
    }
  }, [isZktecoDetected, minBarcodeLength]);

  // Master Global Keydown Listener for ZKTeco and physical Barcode Guns (Keyboard Wedge)
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
      }, 400);

      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      const isTargetManualBarcodeInput = target && target.getAttribute('data-barcode-input') === 'true';
      const isPasswordOrModalInput = target && (
        target.getAttribute('type') === 'password' || 
        target.getAttribute('data-no-barcode') === 'true'
      );

      // 1. Detect Terminator Key: Enter, NumpadEnter, Tab, or keyCode 13/9
      const isTerminator = e.key === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Tab' || e.keyCode === 13 || e.keyCode === 9;

      if (isTerminator) {
        if (trailingBurstTimeoutRef.current) clearTimeout(trailingBurstTimeoutRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const inputEl = isInputFocused && target ? (target as HTMLInputElement) : null;
        const inputValue = inputEl && inputEl.value !== undefined ? inputEl.value.trim() : '';
        const bufferVal = bufferRef.current.trim();

        // Use whichever is more complete / longer
        let currentBuffer = bufferVal;
        if (inputValue.length > bufferVal.length) {
          currentBuffer = inputValue;
        } else if (!currentBuffer && inputValue) {
          currentBuffer = inputValue;
        }

        const intervals = keyIntervalsRef.current;
        const avgInterval = intervals.length > 0 
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
          : 999;

        const isLikelyScanner = (intervals.length >= 2 && avgInterval <= maxKeyIntervalMs) || (currentBuffer.length >= 5 && avgInterval <= 140);
        const isNonInputScan = !isInputFocused && currentBuffer.length >= minBarcodeLength;
        const isManualBarcodeField = isTargetManualBarcodeInput && currentBuffer.length >= minBarcodeLength;

        if (isLikelyScanner || isNonInputScan || isManualBarcodeField) {
          e.preventDefault();
          e.stopPropagation();

          if (inputEl) {
            inputEl.value = '';
          }

          bufferRef.current = '';
          keyIntervalsRef.current = [];

          processBarcode(currentBuffer, isLikelyScanner ? 'hardware_scanner' : 'manual_input');
          return;
        }

        bufferRef.current = '';
        keyIntervalsRef.current = [];
        return;
      }

      // Ignore Escape
      if (e.key === 'Escape') {
        if (trailingBurstTimeoutRef.current) clearTimeout(trailingBurstTimeoutRef.current);
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

        // If too much idle time passed between characters (> 950ms), start fresh buffer
        if (interval > 950 && bufferRef.current.length > 0) {
          bufferRef.current = '';
          keyIntervalsRef.current = [];
        }

        bufferRef.current += e.key;

        // Calculate timing
        const intervals = keyIntervalsRef.current;
        const avgInterval = intervals.length > 0
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length
          : 999;

        // A genuine hardware scanner burst: fast key rate or at least one sub-75ms interval
        const isHardwareBurst = (intervals.length >= 2 && avgInterval <= 140) || (intervals.some(i => i <= 75));

        // Reset any pending trailing timer
        if (trailingBurstTimeoutRef.current) clearTimeout(trailingBurstTimeoutRef.current);

        // NO-TERMINATOR AUTO-FLUSH:
        // ONLY auto-flush on genuine hardware scanner burst after a safe 260ms quiet period,
        // NEVER on human manual typing so we don't truncate codes.
        if (bufferRef.current.length >= 5 && isHardwareBurst && !isPasswordOrModalInput) {
          trailingBurstTimeoutRef.current = setTimeout(() => {
            const inputEl = isInputFocused && target ? (target as HTMLInputElement) : null;
            const inputVal = inputEl && inputEl.value !== undefined ? inputEl.value.trim() : '';
            const bufVal = bufferRef.current.trim();
            const codeToFlush = inputVal.length > bufVal.length ? inputVal : bufVal;

            bufferRef.current = '';
            keyIntervalsRef.current = [];

            if (inputEl) {
              inputEl.value = '';
            }

            if (codeToFlush && codeToFlush.length >= minBarcodeLength) {
              processBarcode(codeToFlush, 'hardware_scanner');
            }
          }, 260);
        }

        // Global buffer auto-clear if idle for 2 seconds
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
          keyIntervalsRef.current = [];
        }, 2000);
      }
    };

    // Paste handler for barcode scanners that emulate clipboard paste
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isPassword = target && target.getAttribute('type') === 'password';
      if (isPassword) return;

      const pastedText = e.clipboardData?.getData('text') || '';
      const clean = cleanBarcode(pastedText);

      if (clean && clean.length >= minBarcodeLength) {
        const isTargetManualBarcodeInput = target && target.getAttribute('data-barcode-input') === 'true';
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

        if (isTargetManualBarcodeInput || !isInputFocused) {
          e.preventDefault();
          if (target && (target as HTMLInputElement).value !== undefined) {
            (target as HTMLInputElement).value = '';
          }
          bufferRef.current = '';
          keyIntervalsRef.current = [];
          processBarcode(clean, 'hardware_scanner');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('paste', handlePaste, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('paste', handlePaste, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (trailingBurstTimeoutRef.current) clearTimeout(trailingBurstTimeoutRef.current);
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
    isHardwareScannerConnected,
    isZktecoDetected,
    isJowvdyDetected,
    jowvdyDetails,
    detectedScannerName,
    connectedHidDevices,
    hasWebHidSupport,
    connectWebHidScanner,
    refreshConnectedHidDevices,
    lastHardwareEvent,
    clearHardwareEvent: () => setLastHardwareEvent(null),
    triggerManualScan: (code: string) => processBarcode(code, 'manual_input'),
    playAudioFeedback
  };
}
