import fetch from 'node-fetch';

const BASE = process.env.CPANEL_URL;
const USER = process.env.CPANEL_USER;
const TOKEN = process.env.CPANEL_TOKEN;
const DIR = process.env.LANDING_DIR;
const FILE = process.env.LANDING_FILE;

const authHeader = `cpanel ${USER}:${TOKEN}`;

export async function readFile() {
  const url = `${BASE}/execute/Fileman/get_file_content?dir=${encodeURIComponent(DIR)}&file=${encodeURIComponent(FILE)}`;
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) throw new Error(`cPanel read error: ${res.status}`);
  const json = await res.json();
  if (json.status !== 1) throw new Error(`cPanel error: ${json.errors?.join(', ')}`);
  return json.data.content;
}

export async function saveFile(content) {
  const url = `${BASE}/execute/Fileman/save_file_content`;
  const body = new URLSearchParams({ dir: DIR, file: FILE, content });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`cPanel save error: ${res.status}`);
  const json = await res.json();
  if (json.status !== 1) throw new Error(`cPanel error: ${json.errors?.join(', ')}`);
}

export async function saveBackup(content) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = `${FILE.replace('.html', '')}-backup-${timestamp}.html`;
  const url = `${BASE}/execute/Fileman/save_file_content`;
  const body = new URLSearchParams({ dir: DIR, file: backupFile, content });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`cPanel backup error: ${res.status}`);
  const json = await res.json();
  if (json.status !== 1) throw new Error(`cPanel backup error: ${json.errors?.join(', ')}`);
}
