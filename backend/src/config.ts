import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value.trim();
}

export const config = {
  port: Number(process.env.PORT || 3001),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  googleClientId: required('GOOGLE_CLIENT_ID'),
  googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
};
