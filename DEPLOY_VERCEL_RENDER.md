# Easy Deploy Guide — Frontend on Vercel, Backend on Render

Simple step-by-step. Follow in order. Don't skip the order — the URLs depend on each other.

## What you are setting up (4 things)
1. **GitHub repo** — Vercel and Render both deploy from GitHub.
2. **MongoDB** — free from MongoDB Atlas → gives `MONGO_URI`.
3. **Redis** — free from Render → gives `REDIS_URL`.
4. **Two deploys** — backend on Render, frontend on Vercel.

The backend will NOT start without MongoDB + Redis, so do those first.

---

## Step 0 — Put the code on GitHub
On your computer, inside the project folder:

```bash
git init
git add -A
git commit -m "Initial commit: real-time PM system"
git branch -M main
# make an empty repo on github.com first, then:
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
(`.gitignore` is already included — `node_modules` and `.env` will NOT be uploaded.)

---

## Step 1 — MongoDB (get MONGO_URI)
1. Go to **mongodb.com/atlas** → sign up → **Create FREE M0 cluster**.
2. **Database Access** → add a user (save the username + password).
3. **Network Access** → Add IP → choose **`0.0.0.0/0`** (allow from anywhere).
4. **Connect → Drivers** → copy the string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/pms?retryWrites=true&w=majority
   ```
   - Put your real user + password in.
   - Add **`/pms`** before the `?` (the database name).
   - **Save this. This is your `MONGO_URI`.**

---

## Step 2 — Redis (get REDIS_URL)
1. Go to **render.com** → sign up → connect GitHub.
2. **New → Key Value** → **Free** plan → pick a region (remember it).
3. Copy the **Internal Connection URL** (starts with `redis://`).
   - **Save this. This is your `REDIS_URL`.**

---

## Step 3 — Backend on Render
1. **New → Web Service** → choose your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free  (use the SAME region as your Redis)
3. Add these **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | (from Step 1) |
   | `REDIS_URL` | (from Step 2) |
   | `JWT_SECRET` | any long random text (30+ characters) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | `*`  (temporary — fixed in Step 5) |

   ❗ **Do NOT add `PORT`** — Render sets it automatically.
4. Click **Create Web Service** and wait for the build to finish.
5. You get a URL like `https://pms-backend.onrender.com`.
   Test it: open `https://pms-backend.onrender.com/health` → you should see `{"success":true,...}`.
   - **Save this backend URL.**

---

## Step 4 — Frontend on Vercel
1. Go to **vercel.com** → sign up → **Add New → Project** → import the SAME repo.
2. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - (build = `npm run build`, output = `dist` — auto-detected)
3. Add these **Environment Variables** (use your real backend URL, NO slash at the end):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://pms-backend.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://pms-backend.onrender.com` |

4. Click **Deploy**. You get a URL like `https://pms-frontend.vercel.app`.
   - **Save this frontend URL.**

---

## Step 5 — Connect them (fix CORS)
1. Go back to **Render → backend → Environment**.
2. Change `CORS_ORIGIN` from `*` to your real Vercel URL, e.g.:
   ```
   https://pms-frontend.vercel.app
   ```
   (NO slash at the end.)
3. Save. Render redeploys automatically. Done.

---

## Step 6 — Test it works
1. Open your Vercel URL → register a user.
2. Open an Incognito window → register a second user → log in.
3. As user 1: create a project → add user 2 by email.
4. Open the same project in both windows → drag a task in one → it moves instantly in the other. ✅

Finally, put your real URLs into the main `README.md` under "Live URLs".

---

## Common mistakes (check these if something breaks)
- **Trailing slash** on `CORS_ORIGIN`, `VITE_API_URL`, or `VITE_SOCKET_URL` → remove it. This is the #1 cause of failures.
- **CORS error in browser console** → `CORS_ORIGIN` on Render must exactly match your Vercel URL.
- **First load is very slow (~40s)** → normal. Render free tier "sleeps" when idle and wakes on the first request.
- **Backend won't start** → check `MONGO_URI` (right password? IP `0.0.0.0/0` allowed?) and `REDIS_URL` are correct in Render env vars.
- **Login works but real-time doesn't** → `VITE_SOCKET_URL` is wrong/missing on Vercel.
