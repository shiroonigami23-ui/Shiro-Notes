# Shiro Notes

<p align="center">
  <a href="https://shiroonigami23-ui.github.io/Shiro-Notes/">
    <img src="https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0ea5e9?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
  <a href="./manifest.webmanifest">
    <img src="https://img.shields.io/badge/PWA-Installable-14b8a6?style=for-the-badge&logo=pwa" alt="PWA" />
  </a>
  <a href="./server.js">
    <img src="https://img.shields.io/badge/Node-Server-22c55e?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node Server" />
  </a>
  <a href="./package.json">
    <img src="https://img.shields.io/badge/Build-TS%20%2B%20Tailwind-f59e0b?style=for-the-badge" alt="Build" />
  </a>
</p>

Shiro Notes is a Notion + Canva style workspace focused on rich note-taking, visual canvas workflows, and secure sharing.

## Quick Access

- Live App: [https://shiroonigami23-ui.github.io/Shiro-Notes/](https://shiroonigami23-ui.github.io/Shiro-Notes/)
- Local App: `http://localhost:3000`
- Quick Start Guide: [QUICK_START.md](./QUICK_START.md)

## Feature Overview

<table>
  <tr>
    <td>
      <h3>Workspace</h3>
      <p>Books, chapters, notes, tags, bookmarks, templates, and search in one interface.</p>
    </td>
    <td>
      <h3>Canvas</h3>
      <p>Layered drawing, shape tools, image editing, grid support, parallax layers, and large scrollable boards.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>Security</h3>
      <p>Master password, app lock, encryption helpers, identity keys, recipient-based secure sharing.</p>
    </td>
    <td>
      <h3>PWA</h3>
      <p>Installable app, offline fallback, manifest/icons, and service worker cache support.</p>
    </td>
  </tr>
</table>

## Run Locally

```bash
npm install
npm run build
npm start
```

## Development Commands

```bash
npm run dev:css
npm run dev:ts
```

## Project Map

| Area | File |
|---|---|
| App entry and routing | [app.js](./app.js) |
| Main UI shell | [index.html](./index.html) |
| Canvas coordinator | [canvas.js](./canvas.js) |
| Canvas core engine | [canvas_core.js](./canvas_core.js) |
| Canvas tools | [canvas_tools.js](./canvas_tools.js) |
| Canvas UI/layers panel | [canvas_ui.js](./canvas_ui.js) |
| Editor logic | [editor.js](./editor.js) |
| Security module | [security.js](./security.js) |
| Encryption helpers | [autoencryption.js](./autoencryption.js) |
| Service worker | [sw.js](./sw.js) |
| Manifest | [manifest.webmanifest](./manifest.webmanifest) |
| Local server | [server.js](./server.js) |

## Tech Stack

- Vanilla JavaScript modules
- TypeScript enhancement layer: [`src/`](./src) -> [`dist-ts/`](./dist-ts)
- Tailwind build pipeline: [`src/styles/tailwind.css`](./src/styles/tailwind.css) -> [`dist/tailwind.css`](./dist/tailwind.css)
- Node.js static server

## Security and Delivery Notes

- Content Security Policy and hardening headers are configured in app/server sources.
- PWA assets are versioned and packaged for easy installation.
- Build/package output is generated with:

```bash
npm run package
```

Artifacts:

- [`dist-package/shiro-notes-v2.1.0.zip`](./dist-package/shiro-notes-v2.1.0.zip)
- [`package/manifest.json`](./package/manifest.json)

## Disclaimer

This project is inspired by modern productivity and whiteboard tools. It is not affiliated with Notion or Canva.
