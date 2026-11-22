Here is your complete, step-by-step Infrastructure & Cloud Setup Runbook covering everything we configured in the browser so you can keep it in your repo (e.g., save it as SETUP_GUIDE.md) and repeat it anytime for a new business account or AWS/production migration.

Tethr — Complete Cloud & Deployment Setup Runbook


0. Hosting Costs & Free Tier Limits

• Supabase (Free Tier — $0/mo): 500 MB PostgreSQL database, 50,000 monthly active users, unlimited API requests. (Note: Projects pause after 7 days of zero database activity; click "Restore" in dashboard if paused).
• Google Cloud / Drive API (Free Tier — $0/mo): Free OAuth2 & Google Drive API usage; each user stores photos/notes in their own 15 GB personal Google Drive.
• Vercel (Hobby Tier — $0/mo): Free static/React hosting with instant *.vercel.app HTTPS domain and automatic git push deployments.
• Render (Free Web Service — $0/mo): Free Node.js backend hosting with *.onrender.com HTTPS domain. (Note: Spins down after 15 minutes of inactivity; the first request after sleep takes ~30–40 seconds to wake up).

1. Supabase Setup (Auth + PostgreSQL Database)

1. Create Project:
	• Go to supabase.com → Sign in with GitHub → New Project.
	• Name: tethr-poc | Region: South Asia (Mumbai ap-south-1).
2. Disable Email Confirmation (for instant testing):
	• Left sidebar → Authentication → Sign In / Providers → expand Email.
	• Toggle Confirm email to OFF → click Save.
3. Create Tables & Permissions:
	• Left sidebar → SQL Editor → New Query → paste and Run:sql
create table if not exists public.user_drive_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry_date bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('image', 'text')),
  title text,
  caption text,
  text_content text,
  drive_file_id text,
  drive_file_name text,
  mime_type text,
  original_size_kb numeric,
  compressed_size_kb numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.user_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null,
  comment_text text not null,
  created_at timestamptz not null default now()
);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on table public.user_drive_tokens, public.user_entries, public.entry_comments to postgres, anon, authenticated, service_role;
Use code with caution.
4. Collect API Keys:
	• Go to Project Settings → Data API → copy Project URL (SUPABASE_URL).
	• Go to Project Settings → API Keys → copy:
		• Publishable key (sb_publishable_...) → used in frontend (VITE_SUPABASE_ANON_KEY).
		• Secret key (sb_secret_...) → used in backend only (SUPABASE_SECRET_KEY).

2. Google Cloud Console Setup (Google Drive OAuth)

1. Create Project & Enable API:
	• Go to google.com → create project Tethr.
	• Top search bar → search "Google Drive API" → click Enable.
2. Configure OAuth Consent Screen:
	• Left sidebar → APIs & Services → OAuth consent screen.
	• User Type: External → click Create.
	• Fill in App Name (Tethr), User Support Email, and Developer Contact Email → Save and Continue.
	• Scopes: Click Add or Remove Scopes → add https://googleapis.com (restricts access strictly to files created by Tethr) → Update → Save and Continue.
	• Test Users: Click Add Users → add the exact Gmail addresses of the test users (required while app is in "Testing" mode without Google verification) → Save and Continue.
3. Create OAuth 2.0 Credentials:
	• Left sidebar → APIs & Services → Credentials → + Create Credentials → OAuth client ID.
	• Application type: Web application | Name: Tethr Web.
	• Authorized JavaScript origins:
		• http://localhost:5173
		• https://vercel.app (your live Vercel URL)
	• Authorized redirect URIs:
		• http://localhost:5173
		• https://vercel.app (your live Vercel URL)
	• Click Create → copy Client ID (GOOGLE_CLIENT_ID) and Client Secret (GOOGLE_CLIENT_SECRET).

3. GitHub Repository Setup

1. Create Repo: Go to github.com → create repository Tethr-poc (leave README unchecked).
2. Protect Secrets Locally: Ensure .gitignore in the project root ignores:
	• node_modules/, .env, dist/, client_secret*.json, *.tsbuildinfo.
3. Push via Personal Access Token (PAT):
	• On GitHub: Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (check repo scope).
	• Push local code to main branch (git init, git add ., git commit, git push -u origin main).

4. Backend Deployment on Render

1. Go to render.com → Sign in with GitHub → New + → Web Service.
2. Connect Tethr-poc repository and configure:
	• Root Directory: backend
	• Runtime: Node
	• Build Command: npm install && npm run build
	• Start Command: npm start
	• Instance Type: Free
3. Add Environment Variables:
	• PORT = 3001
	• FRONTEND_URL = https://vercel.app
	• GOOGLE_CLIENT_ID = (from Section 2)
	• GOOGLE_CLIENT_SECRET = (from Section 2)
	• GOOGLE_REDIRECT_URI = https://vercel.app
	• SUPABASE_URL = (from Section 1)
	• SUPABASE_SECRET_KEY = (from Section 1)
4. Deploy and copy your live Render backend URL (https://<your-service>.onrender.com).

5. Frontend Deployment on Vercel & Final Wiring

1. Deploy on Vercel:
	• Go to vercel.com → Import Tethr-poc.
	• Root Directory: Edit → select frontend.
	• Environment Variables:
		• VITE_API_URL = https://<your-service>.onrender.com (no trailing slash)
		• VITE_SUPABASE_URL = (from Section 1)
		• VITE_SUPABASE_ANON_KEY = (from Section 1)
	• Click Deploy and copy your live URL (https://vercel.app).
2. Final Redirect Wiring:
	• Ensure https://vercel.app is saved in Google Cloud Console (Authorized Origins & Redirect URIs), Render (FRONTEND_URL & GOOGLE_REDIRECT_URI), and Supabase → Authentication → URL Configuration → Site URL.

Quick Security Cleanup Note

Since you pasted your ghp_... GitHub token, GOOGLE_CLIENT_SECRET, and SUPABASE_SECRET_KEY in our chat earlier, remember to revoke that GitHub token in GitHub Settings once your Render deploy finishes, and rotate your Google/Supabase secrets before sharing the app publicly.
Would you like me to also outline the architecture steps for swapping the Node backend to Java Spring Boot or adding multi-couple / friend-group threads when you start Phase 2?
