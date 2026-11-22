export type EntryComment = {
  id: string
  entry_id: string
  user_id: string
  author_email: string
  comment_text: string
  created_at: string
}

export type Entry = {
  id: string
  user_id: string
  entry_type: 'image' | 'text'
  title: string | null
  caption: string | null
  text_content: string | null
  drive_file_id: string | null
  drive_file_name: string | null
  mime_type: string | null
  original_size_kb: number | string | null
  compressed_size_kb: number | string | null
  created_at: string
  comments?: EntryComment[]
}
