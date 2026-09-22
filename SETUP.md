# Setup Guide — Environment Variables

## ⚠️ Security First

**Never commit `.env` files to Git.** They're already in `.gitignore`, but here's the workflow:

### 1. **Get Your OpenRouter API Key**
- Go to [OpenRouter Dashboard](https://openrouter.ai/keys)
- Create a new API key
- **Copy it somewhere safe** (password manager, etc.) — you'll only see it once

### 2. **Create `.env.local` (Local Development)**
Copy `.env.example` to `.env.local` and fill in your real key:

```bash
cp .env.example .env.local
# Then edit .env.local and add your actual key:
# OPENROUTER_API_KEY=sk-or-v1-...
```

**DO NOT commit `.env.local` to Git.** It's in `.gitignore` for a reason.

### 3. **For Deployment (Cloudflare, Vercel, etc.)**
- Set the environment variable in your hosting provider's dashboard
- Never paste the key directly into a `.env` file in the repo
- Use your host's built-in secrets manager (Cloudflare Pages "Environment" tab, Vercel "Environment Variables", etc.)

### 4. **If Your Key Ever Gets Exposed**
- Immediately rotate it in OpenRouter dashboard (revoke the old one)
- If it was committed to GitHub, it's public forever (even in history) — rotate immediately
- Use `git-secrets` or `pre-commit` hooks to prevent future leaks

### Example `.env.local` (Never commit this)
```
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

### Running Locally
```bash
npm install
npm run dev
```
Vite will automatically load `.env.local` for development.
