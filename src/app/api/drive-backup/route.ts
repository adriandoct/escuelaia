import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'drive_backups');

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

export async function GET() {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR);
    return NextResponse.json({
      success: true,
      backups: files.filter(f => f.endsWith('.json')).map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          sizeBytes: stats.size,
          updatedAt: stats.mtime
        };
      })
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureBackupDir();
    const body = await req.json();
    const { fecha, grado, grupo, rows, webhookUrl } = body;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `respaldo_${grado}_${grupo}_${fecha || 'hoy'}_${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(body, null, 2), 'utf-8');

    // Also update current latest snapshot
    const latestFile = path.join(BACKUP_DIR, `latest_${grado}_${grupo}.json`);
    fs.writeFileSync(latestFile, JSON.stringify(body, null, 2), 'utf-8');

    // Forward to remote Google Drive / Apps Script Webhook if configured
    let webhookResult = null;
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        const resp = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'respaldo_google_drive',
            sheetName: 'Matriz Sábana',
            fecha,
            grado,
            grupo,
            rows,
            timestamp: new Date().toISOString()
          })
        });
        webhookResult = { ok: resp.ok, status: resp.status };
      } catch (whErr: any) {
        console.warn('Google Sheets Webhook error:', whErr.message);
        webhookResult = { ok: false, error: whErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Respaldo para Google Drive guardado correctamente',
      backupFile: path.basename(backupFile),
      webhookResult
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
