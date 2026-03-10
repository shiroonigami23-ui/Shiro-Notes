# Shiro Notes

Shiro Notes is a Notion and Canva inspired personal workspace with rich note editing, visual canvas tools, planning modules, security controls, and installable PWA support.

## What is included

- Rich notes with formatting, templates, and quick capture
- Visual canvas tools for sketching, annotation, and diagramming
- Books, chapters, tags, bookmarks, and global search
- Calendar scheduler and audio note support
- Security features (lock screen, encryption helpers, secure asset flow)
- Responsive UX with collapsible sidebar and mobile bottom navigation
- PWA install support with offline caching and app icons

## Tech stack

- Vanilla JavaScript modules
- TypeScript enhancement layer (`src/` -> `dist-ts/`)
- Tailwind utility build (`src/styles/tailwind.css` -> `dist/tailwind.css`)
- Node static server (`server.js`)

## Local run

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

## Development

```bash
npm run dev:css
npm run dev:ts
```

## PWA behavior

- `manifest.webmanifest` defines install metadata
- `sw.js` provides offline cache-first behavior for local app assets
- `offline.html` is used when navigation happens without network
- `icons/icon-192.png` and `icons/icon-512.png` are included for install prompts

## Security hardening included

- CSP meta policy in `index.html`
- Server-side security headers in `server.js`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

## Packaging

```bash
npm run package
```

Produces:

- `dist-package/shiro-notes-v2.1.0.zip`
- `package/manifest.json`

## Notes

This project is inspired by modern collaborative editors and design boards. It is not affiliated with Notion or Canva.
