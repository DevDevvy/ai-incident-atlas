# Quick start

The repository is ready to push as-is.

## 1. Create an empty public repository on GitHub

A good name is:

`ai-incident-atlas`

Do not initialize it with a README, `.gitignore`, or license because those are already included here.

## 2. Push this folder

### Shortest route

```bash
bash scripts/first-push.sh https://github.com/YOUR-USERNAME/ai-incident-atlas.git
```

### Or do it manually

```bash
git init
git branch -M main
git add .
git commit -m "Launch AI Incident Atlas"
git remote add origin https://github.com/YOUR-USERNAME/ai-incident-atlas.git
git push -u origin main
```

## 3. Enable GitHub Pages once

Either:

**GitHub → repository → Settings → Pages → Source: GitHub Actions**

or, with an authenticated GitHub CLI:

```bash
bash scripts/enable-pages.sh
```

If the first `Deploy GitHub Pages` workflow ran before Pages was enabled, open **Actions → Deploy GitHub Pages → Run workflow** once.

After that, every merge/push to `main` redeploys automatically.

## 4. Verify the project locally anytime

```bash
npm run validate
npm run preview
```

Open `http://127.0.0.1:8080`.
