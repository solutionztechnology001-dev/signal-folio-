# Signal Folio

A workspace for affiliates and creators to **prepare content, plan distribution with tagged links, publish by hand, and record what really happened.**

Signal Folio does **not** post anywhere and does **not** track clicks or sales on its own. Every number in it is one you typed in, and each one carries a label saying where it came from (user-entered or estimated).

## The loop

1. **Add content** (paste text or import a .txt / .md file up to 500 KB).
2. **Plan a distribution**: pick a platform and an optional destination link. Signal Folio builds a UTM-tagged link.
3. **Publish it yourself** on that platform, then mark it published and paste the live link.
4. **Record results** (views, clicks, conversions, revenue, cost) with a required source such as "Dev.to dashboard".
5. **Results** shows totals of what you entered, by currency, plus how many published posts have results recorded.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Node 22.6+)
npm run typecheck
npm run lint
npm run build
```

Node 22 or newer is recommended (`.nvmrc` is included).

## Data and privacy

- Everything is stored in your browser (localStorage). There is no account, server, or database.
- Clearing browser data, or switching browser or device, loses your data unless you keep a backup.
- **Settings → Download backup** exports everything as JSON. You can restore by merging or replacing.
- Upgrading from the older version keeps your content (title and body), backs up the old data first, and does **not** carry over the old clicks, conversions or commissions, because they were simulated.
- If stored data is damaged or the browser has no room to save, the app turns saving off, tells you, and leaves your stored data untouched.

## What it does not do (yet)

- Publish to any platform (everything is manual).
- Measure clicks, conversions or revenue by itself (tracked redirects need a backend; see `docs/DECISION_LOG.md` for the rules that unlock them).
- Sync across devices or support accounts.

## Project docs

`docs/PROJECT_STATE.md`, `docs/DECISION_LOG.md`, `docs/TEST_RESULTS.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`.
