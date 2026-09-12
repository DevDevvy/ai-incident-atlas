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

## Optional one-command GitHub CLI setup

If `gh` is authenticated with repository administration/Pages permissions, run:

```bash
bash scripts/enable-pages.sh
```

The helper discovers the current repository and configures GitHub Pages with `build_type: workflow` through GitHub's Pages REST API. The Settings UI remains the simplest fallback and only has to be done once.

## Custom domain

Set the exact repository URL in `data/site.json` if you move to a custom domain, because GitHub Pages hostname inference will no longer identify the repository automatically.

Then configure the custom domain under **Settings → Pages**. If you add a root `CNAME` file, the build script will carry it into `dist/`.

## Branch protection recommendation

After initial launch, create a branch ruleset for `main` that requires the **Validate project** status check before merge. This prevents malformed data from being merged through the normal PR flow.
