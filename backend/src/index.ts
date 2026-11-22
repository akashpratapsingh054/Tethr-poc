import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { config } from './config';
import { HttpError } from './errors';
import api from './routes/api';

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', api);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Unexpected error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`Tethr API listening on http://localhost:${config.port}`);
});
