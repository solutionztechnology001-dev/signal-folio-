# Deploying Signal Folio

Signal Folio is a static-style client app. No environment variables or database are needed.

## Before deploying (do this once, on a real machine or Codespaces)
```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```
Fix anything that fails. Commit the `package-lock.json` that `npm install` creates.

## Vercel (recommended)
1. Put the project in a GitHub repository (the folder contents at the repo root, not inside another folder).
2. In Vercel, choose **Add New → Project**, import the repository, and keep the defaults (Framework: Next.js, build command `next build`).
3. Deploy. Vercel uses Node 22 because of `engines` in package.json.
4. Open the live URL on a phone and a desktop and click through the full loop once.

## After deploying
- Remember each browser keeps its own data. A user opening the site on a new device starts empty.
- Tell pilot users to use **Settings → Download backup** regularly.
