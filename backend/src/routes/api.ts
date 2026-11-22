import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { HttpError } from '../errors';
import {
  deleteEntryById,
  getEntryById,
  hasDriveConnection,
  insertComment,
  insertEntry,
  listAllComments,
  listEntries,
  upsertDriveTokens,
} from '../services/dbService';
import {
  deleteDriveFile,
  exchangeCode,
  getConsentUrl,
  openImageStream,
  uploadImage,
  uploadTextBackup,
} from '../services/driveService';

const router = Router();

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function wrap(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new HttpError(400, 'Only image files can be saved as snapshots'));
      return;
    }
    callback(null, true);
  },
});

function requireUserId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'user_id is required');
  }
  return value.trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

router.get('/auth/google-drive/url', (_req, res) => {
  res.json({ url: getConsentUrl() });
});

router.post('/auth/google-drive/callback', wrap(async (req, res) => {
  const userId = requireUserId(req.body?.user_id);
  const code = req.body?.code;
  if (typeof code !== 'string' || !code.trim()) {
    throw new HttpError(400, 'code is required');
  }

  const tokens = await exchangeCode(code.trim());
  await upsertDriveTokens(userId, tokens);
  res.json({ connected: true });
}));

router.get('/auth/google-drive/status', wrap(async (req, res) => {
  const userId = requireUserId(req.query.user_id);
  const connected = await hasDriveConnection(userId);
  res.json({ connected });
}));

router.post('/entries/image', upload.single('image'), wrap(async (req, res) => {
  const userId = requireUserId(req.body?.user_id);
  if (!req.file) {
    throw new HttpError(400, 'image file is required');
  }

  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
  const stored = await uploadImage(userId, {
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
  });

  const entry = await insertEntry({
    user_id: userId,
    entry_type: 'image',
    caption,
    drive_file_id: stored.id,
    drive_file_name: stored.name,
    mime_type: stored.mimeType,
    original_size_kb: asNumber(req.body?.original_size_kb),
    compressed_size_kb: asNumber(req.body?.compressed_size_kb),
  });

  res.status(201).json(entry);
}));

router.post('/entries/text', wrap(async (req, res) => {
  const userId = requireUserId(req.body?.user_id);
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const textContent = typeof req.body?.text_content === 'string' ? req.body.text_content.trim() : '';
  if (!title || !textContent) {
    throw new HttpError(400, 'title and text_content are required');
  }

  const stored = await uploadTextBackup(userId, { title, textContent });
  const entry = await insertEntry({
    user_id: userId,
    entry_type: 'text',
    title,
    text_content: textContent,
    drive_file_id: stored.id,
    drive_file_name: stored.name,
    mime_type: stored.mimeType,
  });

  res.status(201).json(entry);
}));

router.get('/entries', wrap(async (req, res) => {
  const userId = requireUserId(req.query.user_id);
  const [entries, comments] = await Promise.all([listEntries(userId), listAllComments()]);

  const byEntry = new Map<string, typeof comments>();
  for (const c of comments) {
    const list = byEntry.get(c.entry_id) ?? [];
    list.push(c);
    byEntry.set(c.entry_id, list);
  }

  res.json(
    entries.map((entry) => ({
      ...entry,
      comments: byEntry.get(entry.id) ?? [],
    }))
  );
}));

router.post('/entries/:entryId/comments', wrap(async (req, res) => {
  const entryId = req.params.entryId;
  const userId = requireUserId(req.body?.user_id);
  const authorEmail = typeof req.body?.author_email === 'string' ? req.body.author_email.trim() : '';
  const commentText = typeof req.body?.comment_text === 'string' ? req.body.comment_text.trim() : '';

  if (!entryId || !authorEmail || !commentText) {
    throw new HttpError(400, 'entryId, author_email, and comment_text are required');
  }

  const comment = await insertComment({
    entry_id: entryId,
    user_id: userId,
    author_email: authorEmail,
    comment_text: commentText,
  });

  res.status(201).json(comment);
}));


router.delete('/entries/:entryId', wrap(async (req, res) => {
  const entryId = req.params.entryId;
  const userId = requireUserId(req.query.user_id || req.body?.user_id);

  if (!entryId) {
    throw new HttpError(400, 'entryId is required');
  }

  const entry = await getEntryById(entryId);
  if (!entry) {
    throw new HttpError(404, 'Memory not found');
  }

  if (entry.user_id !== userId) {
    throw new HttpError(403, 'Only the creator of this post can delete it');
  }

  if (entry.drive_file_id) {
    await deleteDriveFile(userId, entry.drive_file_id);
  }

  await deleteEntryById(entryId);
  res.json({ deleted: true });
}));



router.get('/media/image/:fileId', wrap(async (req, res) => {
  const userId = requireUserId(req.query.user_id);
  const fileId = req.params.fileId;
  if (!fileId || fileId.includes('/') || fileId.includes('..')) {
    throw new HttpError(400, 'Invalid file id');
  }

  const { stream, mimeType } = await openImageStream(userId, fileId);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'private, max-age=300');
  stream.on('error', (error) => {
    console.error('Drive image stream failed', error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Could not read the image from Drive' });
      return;
    }
    res.end();
  });
  stream.pipe(res);
}));

export default router;
