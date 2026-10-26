import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache scanner status for 3 seconds to prevent excessive process spawning
let cachedResponse: any = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 3000;

export async function GET() {
  const now = Date.now();
  if (cachedResponse && (now - lastCheckTime) < CACHE_TTL_MS) {
    return NextResponse.json(cachedResponse);
  }

  // Only check on Windows systems where PowerShell/CIM is available
  if (process.platform === 'win32') {
    try {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity -Filter \\"DeviceID LIKE '%0218%'\\" | Select-Object Name, DeviceID, Status | ConvertTo-Json -Compress"`;
      const { stdout } = await execAsync(psCommand, { timeout: 3500 });
      
      if (stdout && stdout.trim().length > 0) {
        let parsed: any;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch {
          parsed = null;
        }

        const items = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        const jowvdyItem = items.find((d: any) => 
          d?.DeviceID?.includes('0218') || d?.Name?.toLowerCase().includes('jowvdy')
        );

        if (jowvdyItem || items.length > 0) {
          const rawDevice = jowvdyItem || items[0];
          const instanceId = rawDevice.DeviceID || '';
          // Extract serial if present (e.g. USB\VID_0218&PID_0210\2027300413413333)
          const parts = instanceId.split('\\');
          const serialNumber = parts.length > 2 ? parts[2] : '2027300413413333';

          cachedResponse = {
            connected: true,
            scanner: {
              brand: 'JOWVDY',
              model: 'Lector Láser de Códigos de Barras JOWVDY USB',
              vendorId: '0218',
              productId: '0210',
              serialNumber: serialNumber,
              deviceId: instanceId,
              status: rawDevice.Status || 'OK',
              mode: 'HID Keyboard Emulation (Plug & Play)',
              interface: 'USB / HID'
            },
            timestamp: now
          };
          lastCheckTime = now;
          return NextResponse.json(cachedResponse);
        }
      }
    } catch (err: any) {
      console.warn('Hardware scanner detection error:', err?.message || err);
    }
  }

  cachedResponse = {
    connected: false,
    scanner: null,
    timestamp: now
  };
  lastCheckTime = now;
  return NextResponse.json(cachedResponse);
}
