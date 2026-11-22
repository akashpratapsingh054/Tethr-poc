import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { config } from '../config';
import { HttpError } from '../errors';
import type { StoredOAuthTokens } from '../types';
import { getDriveTokens, upsertDriveTokens } from './dbService';

const FOLDER_NAME = 'Tethr_Memories';
const DRIVE_SCOPE = 'https://googleapis.com';

function createOAuthClient() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

export function getConsentUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [DRIVE_SCOPE],
  });
}

export async function exchangeCode(code: string): Promise<StoredOAuthTokens> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };
}

async function getAuthorizedDrive(userId: string) {
  const stored = await getDriveTokens(userId);
  if (!stored?.access_token) {
    throw new HttpError(400, 'Google Drive is not linked for this user yet');
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token ?? undefined,
    expiry_date: stored.expiry_date ?? undefined,
  });

  client.on('tokens', (fresh) => {
    void upsertDriveTokens(userId, {
      access_token: fresh.access_token ?? undefined,
      refresh_token: fresh.refresh_token ?? undefined,
      expiry_date: fresh.expiry_date ?? undefined,
    });
  });

  return google.drive({ version: 'v3', auth: client });
}

async function getOrCreateVaultFolder(userId: string): Promise<string> {
  const drive = await getAuthorizedDrive(userId);
  const existing = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  const folderId = existing.data.files?.[0]?.id;
  if (folderId) return folderId;

  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  if (!created.data.id) {
    throw new HttpError(502, 'Could not create Tethr_Memories folder in Google Drive');
  }
  return created.data.id;
}

export async function uploadImage(
  userId: string,
  file: { originalName: string; mimeType: string; buffer: Buffer }
): Promise<{ id: string; name: string; mimeType: string }> {
  const drive = await getAuthorizedDrive(userId);
  const folderId = await getOrCreateVaultFolder(userId);
  const name = `${Date.now()}-${file.originalName || 'snapshot.jpg'}`;

  const created = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimeType,
      body: Readable.from(file.buffer),
    },
    fields: 'id, name, mimeType',
  });

  if (!created.data.id) {
    throw new HttpError(502, 'Google Drive upload failed');
  }

  return {
    id: created.data.id,
    name: created.data.name || name,
    mimeType: created.data.mimeType || file.mimeType,
  };
}

export async function uploadTextBackup(
  userId: string,
  note: { title: string; textContent: string }
): Promise<{ id: string; name: string; mimeType: string }> {
  const drive = await getAuthorizedDrive(userId);
  const folderId = await getOrCreateVaultFolder(userId);
  const safeTitle = note.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'note';
  const name = `${Date.now()}-${safeTitle}.txt`;
  const content = `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.textContent}\n`;

  const created = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType: 'text/plain',
      body: Readable.from(Buffer.from(content, 'utf-8')),
    },
    fields: 'id, name, mimeType',
  });

  if (!created.data.id) {
    throw new HttpError(502, 'Google Drive text backup failed');
  }

  return {
    id: created.data.id,
    name: created.data.name || name,
    mimeType: created.data.mimeType || 'text/plain',
  };
}

export async function openImageStream(
  userId: string,
  fileId: string
): Promise<{ stream: Readable; mimeType: string }> {
  const drive = await getAuthorizedDrive(userId);
  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType',
  });

  const media = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: media.data as unknown as Readable,
    mimeType: meta.data.mimeType || 'image/jpeg',
  };
}
