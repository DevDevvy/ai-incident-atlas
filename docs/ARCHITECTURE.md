# Architecture

## Design goals

1. **One canonical incident dataset.** No duplicated JSON embedded in HTML.
2. **No runtime backend.** The public site is static and inexpensive to host.
3. **No third-party JavaScript dependencies.** Reduces supply-chain risk and maintenance burden.
4. **PR-friendly research workflow.** Ordinary incident additions and corrections touch only `data/incidents.json`.
5. **Validation before deployment.** Broken IDs, dates, sources, or narrative references fail CI.
6. **Portable hosting.** GitHub Pages is the default, but `dist/` can be hosted by any static provider.

## Runtime

`index.html` loads `assets/app.js`, which fetches:

- `data/incidents.json`
- `data/site.json`
- `data/stages.json`
- `data/tour.json`

The browser performs search, filters, sorting, exports, bookmarks, notes, related-event scoring, and guided-tour rendering locally.

## Build

`npm run build` does not bundle or minify application code. It:

1. runs data validation
2. creates a clean `dist/`
3. copies only public runtime files
4. writes `.nojekyll`
5. copies `CNAME` if you add one later

This makes the deploy artifact deterministic and easy to inspect.

## Security properties

- no secrets
- no authentication
- no server-side state
- no external runtime libraries/CDNs
- user notes/bookmarks remain in browser local storage
- event text is escaped before HTML insertion
- source URLs are schema/CI validated and opened with `noopener noreferrer`
- GitHub workflows use least-privilege permissions
- fork pull requests use ordinary `pull_request`, never `pull_request_target`

## Content relationships

Incident `id` values are stable keys. `stages.json` and `tour.json` point to those IDs. This is why IDs should not change during ordinary copy edits.
