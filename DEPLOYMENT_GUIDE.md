# Student OS — Cloud Deployment Guide (100% Free Tier)

This guide walks you through deploying **Student OS** to production on the cloud using the industry-standard free modern stack:
- **Frontend:** Vercel (Global Edge CDN)
- **Backend API:** Render (FastAPI Web Service)
- **Database:** Supabase (Managed PostgreSQL)

---

## Architecture Overview

```
[ Student Device ]
       │
       ▼
┌──────────────┐      HTTPS /api/*      ┌──────────────┐      SQL / Alembic      ┌──────────────┐
│ Vercel (UI)  │ ─────────────────────> │ Render (API) │ ──────────────────────> │ Supabase(DB) │
│ React + Vite │                        │ Python FastAPI│                        │ PostgreSQL   │
└──────────────┘                        └──────────────┘                         └──────────────┘
```

---

## Step 1: Create Free Accounts (1-Click with Google)

1. **GitHub:** Sign up at [github.com](https://github.com)
2. **Supabase:** Sign up at [supabase.com](https://supabase.com) (Choose "Sign in with GitHub")
3. **Render:** Sign up at [render.com](https://render.com) (Choose "Sign in with GitHub")
4. **Vercel:** Sign up at [vercel.com](https://vercel.com) (Choose "Continue with GitHub")

---

## Step 2: Push Your Project to GitHub

1. In your browser, go to [github.com/new](https://github.com/new).
2. Create a new repository named `student-os` (Set it to **Private** or **Public**).
3. Open your terminal in this project root folder and run:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/student-os.git
git branch -M master
git push -u origin master
```

---

## Step 3: Set Up Cloud Database (Supabase)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Fill in:
   - **Name:** `student-os-db`
   - **Database Password:** Enter a strong password (save this password!).
   - **Region:** Choose **South Asia (Mumbai)** or closest to your location.
4. Click **"Create new project"** (Takes ~1 minute to initialize).
5. Go to **Project Settings** (gear icon on the left bottom) -> **Database**.
6. Under **Connection string**, select the **URI** tab:
   - Copy the string. It looks like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with the database password you chose in step 3.

---

## Step 4: Deploy Backend API (Render)

1. Open [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** -> **"Web Service"**.
3. Select **"Build and deploy from a Git repository"** and pick your `student-os` repo.
4. Configure the Web Service:
   - **Name:** `student-os-api`
   - **Region:** Singapore / Frankfurt / closest to you.
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add:
   - `DATABASE_URL` = Your Supabase URI from Step 3
   - `JWT_SECRET` = A random 32-character secret string
   - `FRONTEND_ORIGINS` = `http://localhost:5173,https://*.vercel.app`
   - `APP_ENV` = `production`
6. Click **"Create Web Service"**.
7. Once deployed, Render will give you a public URL, for example:
   `https://student-os-api.onrender.com`
   *(Test it in browser: `https://student-os-api.onrender.com/api/health` should return `{"status":"healthy"}`)*.

---

## Step 5: Run Database Migrations on Supabase

In Render Dashboard:
1. Go to your `student-os-api` service.
2. Click **"Shell"** tab on the left menu.
3. Run:
   ```bash
   alembic upgrade head
   python scripts/seed_demo.py
   ```
   *(This creates all tables and seeds Anna University sample syllabus in Supabase PostgreSQL!)*

---

## Step 6: Deploy Frontend (Vercel)

1. Open [vercel.com/new](https://vercel.com/new).
2. Import your `student-os` GitHub repository.
3. In the project setup screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://student-os-api.onrender.com` *(Your Render URL from Step 4)*
5. Click **"Deploy"**.
6. In ~40 seconds, Vercel will give you a live production URL:
   `https://student-os-xxxx.vercel.app`!

---

## Step 7: Update CORS Origin

Go back to Render Dashboard -> `student-os-api` -> **Environment Variables**:
- Update `FRONTEND_ORIGINS`:
  ```
  http://localhost:5173,https://student-os-xxxx.vercel.app
  ```
- Click **"Save Changes"**.

---

## Verification Checklist

- [ ] Open Vercel URL in your mobile phone browser.
- [ ] Sign up a new account or click "Explore Demo Student Account".
- [ ] Verify Subjects, Syllabus, Tasks, and Study Sessions load smoothly.
- [ ] Click "Install App" on mobile Chrome/Safari to install it as native PWA.
- [ ] Toggle Dark Mode (Obsidian theme).
