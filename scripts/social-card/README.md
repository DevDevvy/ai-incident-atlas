# Social share card source

The branded social preview image is stored here as ordered base64 chunks because the production site is assembled by the static build.

`npm run build` concatenates `chunk-*.txt`, verifies the decoded JPEG against a fixed SHA-256 checksum, and writes the final image to:

`dist/assets/social-card.jpg`

The production build also injects the Open Graph and Twitter/X large-card metadata that points to the public GitHub Pages URL for that image.

When replacing the card, replace all chunks together and update the expected checksum in `scripts/build.mjs`. Do not edit individual chunks by hand.
