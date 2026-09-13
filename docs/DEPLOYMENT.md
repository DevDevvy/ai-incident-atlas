# Deployment

The repository is preconfigured for GitHub Pages using a custom GitHub Actions workflow.

## First launch

1. Create an empty public GitHub repository, for example `ai-incident-atlas`.
2. Push this project to its `main` branch.
3. Open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Open the **Actions** tab and rerun **Deploy GitHub Pages** if the first run occurred before Pages was enabled.

The deployment workflow validates the dataset, builds `dist/`, uploads the Pages artifact, and deploys it using GitHub's official Pages actions.

A project repository normally appears at:

`https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`

For this repository, `data/site.json` and the social metadata in `index.html` use the production URL:

`https://devdevvy.github.io/ai-incident-atlas/`

The 1200×630 share image lives at `assets/social-card-v2.jpg`. Because the build copies the entire `assets/` directory, the image is included in the Pages artifact automatically. The build also fails if the image or the required absolute Open Graph and Twitter metadata are missing.

## Optional one-command GitHub CLI setup

If `gh` is authenticated with repository administration/Pages permissions, run:

```bash
bash scripts/enable-pages.sh
```

The helper discovers the current repository and configures GitHub Pages with `build_type: workflow` through GitHub's Pages REST API. The Settings UI remains the simplest fallback and only has to be done once.

## Custom domain

Set the new canonical URL in `data/site.json` and update the absolute canonical, `og:url`, `og:image`, `twitter:url`, and `twitter:image` values in `index.html` if you move to a custom domain.

Then configure the custom domain under **Settings → Pages**. If you add a root `CNAME` file, the build script will carry it into `dist/`.

## Share preview caching

Messaging apps and social networks cache link previews independently from GitHub Pages. A successful deployment does not guarantee that an already-shared URL will refresh immediately.

- Use a new image filename whenever the artwork changes; the current `social-card-v2.jpg` path prevents clients from reusing the earlier 600×315 image.
- Re-scrape the page with the platform's sharing debugger or post inspector when one is available.
- For clients without a refresh tool, send the link once with a harmless query string such as `?preview=2` to encourage a fresh fetch. The canonical metadata still points to the clean production URL.
- Expect existing messages to keep their original preview; validation should use a newly composed message after the deploy is live.

## Branch protection recommendation

After initial launch, create a branch ruleset for `main` that requires the **Validate project** status check before merge. This prevents malformed data from being merged through the normal PR flow.
