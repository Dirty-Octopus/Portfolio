# Dirty Octopus / GitHub Portfolio

[Open the portfolio](https://dirty-octopus.github.io/Portfolio/) · [Audio portfolio](https://dirtyoctopus.net)

A Chinese and English project portfolio based on [Portfolio4Music](https://github.com/Dirty-Octopus/Portfolio4Music). It carries over the original metal logo, animated entry, CRT display, module transitions, interface sounds, background music, themes, system controls, personal profile, contacts, and interactive playground.

The project archive presents four repositories:

- [Seal](https://github.com/Dirty-Octopus/seal)
- [Packager](https://github.com/Dirty-Octopus/packager)
- [Spectral Corruptor](https://github.com/Dirty-Octopus/spectral-corruptor-plugin)
- [DtBlkFx for Mackintosh](https://github.com/Dirty-Octopus/dtblkfx4mackintosh)

Seal and Packager previews come from their repositories. The Spectral Corruptor and DtBlkFx previews are the supplied application screenshots. Project selection, search, category filters, preview enlargement, and repository links work without a backend or GitHub API request at runtime. The audio portfolio navigation opens `https://dirtyoctopus.net`.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Fonts, icons, preview images, background music, and interface sounds are bundled locally. Assets use relative URLs so the production build works under the GitHub Pages repository path.

## Verification

`npm test` covers the shared audio engine, sound loading, CRT coordinate mapping, portal readiness and assembly, viewport isolation, and portfolio content.

`npm run qa` opens installed Chrome in headless mode and checks entry, project selection, search and filters, image previews, navigation, sound controls, language and theme changes, the playground, and mobile layouts. It saves screenshots and a check report to the ignored `.qa/` directory. Set `QA_URL` to check an existing server or deployed URL; use `QA_PREVIEW=1` to check a local production build.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: install dependencies, run unit tests, build with Vite, upload the `dist/` artifact, and deploy it to GitHub Pages. Pages must use GitHub Actions as its publishing source.

The source music and video archive remains available on the separate [audio portfolio](https://dirtyoctopus.net). This repository includes the shared interface and playground audio assets.

Third-party notices are in `public/THIRD_PARTY_NOTICES.txt`. Individual project licenses and distribution terms are documented in their linked repositories.
