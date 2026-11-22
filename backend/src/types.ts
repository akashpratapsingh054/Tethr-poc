export type DriveTokenRecord = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  updated_at: string;
};

export type EntryType = 'image' | 'text';

export type EntryRecord = {
  id: string;
  user_id: string;
  entry_type: EntryType;
  title: string | null;
  caption: string | null;
  text_content: string | null;
  drive_file_id: string | null;
  drive_file_name: string | null;
  mime_type: string | null;
  original_size_kb: number | null;
  compressed_size_kb: number | null;
  created_at: string;
};

export type NewEntry = {
  user_id: string;
  entry_type: EntryType;
  title?: string | null;
  caption?: string | null;
  text_content?: string | null;
  drive_file_id?: string | null;
  drive_file_name?: string | null;
  mime_type?: string | null;
  original_size_kb?: number | null;
  compressed_size_kb?: number | null;
};

export type StoredOAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};
