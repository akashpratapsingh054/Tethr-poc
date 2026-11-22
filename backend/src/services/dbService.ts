import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { HttpError } from '../errors';
import type { DriveTokenRecord, EntryRecord, NewEntry, StoredOAuthTokens } from '../types';

const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function unwrap<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) {
    throw new HttpError(502, error.message || fallback);
  }
  if (data === null) {
    throw new HttpError(502, fallback);
  }
  return data;
}

export async function getDriveTokens(userId: string): Promise<DriveTokenRecord | null> {
  const { data, error } = await supabase
    .from('user_drive_tokens')
    .select('user_id, access_token, refresh_token, expiry_date, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(502, error.message);
  }
  return (data as DriveTokenRecord | null) ?? null;
}

export async function upsertDriveTokens(userId: string, tokens: StoredOAuthTokens): Promise<void> {
  const existing = await getDriveTokens(userId);
  const accessToken = tokens.access_token || existing?.access_token;
  if (!accessToken) {
    throw new HttpError(400, 'Google did not return an access token');
  }

  const row = {
    user_id: userId,
    access_token: accessToken,
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? existing?.expiry_date ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_drive_tokens').upsert(row, { onConflict: 'user_id' });
  if (error) {
    throw new HttpError(502, error.message);
  }
}

export async function hasDriveConnection(userId: string): Promise<boolean> {
  const tokens = await getDriveTokens(userId);
  return Boolean(tokens?.access_token);
}

export async function insertEntry(entry: NewEntry): Promise<EntryRecord> {
  const { data, error } = await supabase.from('user_entries').insert(entry).select('*').single();
  return unwrap(data as EntryRecord | null, error, 'Could not save the memory');
}

export async function listEntries(userId: string): Promise<EntryRecord[]> {
  const { data, error } = await supabase
    .from('user_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new HttpError(502, error.message);
  }
  return (data as EntryRecord[] | null) ?? [];
}


export type CommentRecord = {
  id: string;
  entry_id: string;
  user_id: string;
  author_email: string;
  comment_text: string;
  created_at: string;
};

export async function listAllComments(): Promise<CommentRecord[]> {
  const { data, error } = await supabase
    .from('entry_comments')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new HttpError(502, error.message);
  }
  return (data as CommentRecord[] | null) ?? [];
}

export async function insertComment(input: {
  entry_id: string;
  user_id: string;
  author_email: string;
  comment_text: string;
}): Promise<CommentRecord> {
  const { data, error } = await supabase
    .from('entry_comments')
    .insert(input)
    .select('*')
    .single();

  return unwrap(data as CommentRecord | null, error, 'Could not post comment');
}


export async function getEntryById(entryId: string): Promise<EntryRecord | null> {
  const { data, error } = await supabase
    .from('user_entries')
    .select('*')
    .eq('id', entryId)
    .maybeSingle();

  if (error) {
    throw new HttpError(502, error.message);
  }
  return (data as EntryRecord | null) ?? null;
}

export async function deleteEntryById(entryId: string): Promise<void> {
  const { error } = await supabase.from('user_entries').delete().eq('id', entryId);
  if (error) {
    throw new HttpError(502, error.message);
  }
}
