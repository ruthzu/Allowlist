**Whitelist Focus (Chrome MV3)**

- **Overview:** Allowlist-based focus mode for distraction‑free browsing. Blocks all non‑allowed sites during a session, with a clear block page, a quick popup toggle, and a simple dashboard for time insights. Built with Vite, React, TypeScript, and Tailwind CSS.
- **Core:** MV3 `service_worker` with `declarativeNetRequest` for fast, reliable blocking.

**Features**

- **Focus Mode Toggle:** Quick on/off via the popup ([index.html](index.html)).
- **Allowlist Management:** Add/remove allowed domains in Options ([options.html](options.html)).
- **Block Page:** Friendly message when a blocked site is visited ([block.html](block.html)).
- **Time Tracking & Dashboard:** View usage and focus stats (see [src/Dashboard.tsx](src/Dashboard.tsx)).
- **Fast Build:** Vite multi‑entry build including the MV3 background ([src/background.ts](src/background.ts)).

**Quick Start**

- **Requirements:** Node.js 18+ and Chrome/Chromium.
- **Install & build:**

```bash
npm install
npm run build
```

- **Load in Chrome:**
  - Open `chrome://extensions` → enable Developer mode.
  - Click “Load unpacked” and select the `dist` folder (build output).
  - Pin the extension and open the popup to start a focus session.

**Development**

- **Live dev server:**

```bash
npm run dev
```

- **Production build:** `npm run build`
- **Preview build locally:** `npm run preview`
- After code changes, use “Reload” on the extension card in `chrome://extensions` to refresh the MV3 service worker.

**Project Structure**

- **Popup UI:** [index.html](index.html), [src/Popup.tsx](src/Popup.tsx)
- **Options UI:** [options.html](options.html), [src/Options.tsx](src/Options.tsx)
- **Block Page:** [block.html](block.html), [src/BlockPage.tsx](src/BlockPage.tsx)
- **Dashboard:** [dashboard.html](dashboard.html), [src/Dashboard.tsx](src/Dashboard.tsx)
- **Background (MV3):** [src/background.ts](src/background.ts)
- **Styling:** [src/index.css](src/index.css), Tailwind config [tailwind.config.ts](tailwind.config.ts)
- **Config:** [vite.config.ts](vite.config.ts), [tsconfig.json](tsconfig.json), [public/manifest.json](public/manifest.json)

**Permissions**

- **`storage` & `alarms`:** Persist settings and manage session timers.
- **`declarativeNetRequest` (+ host access):** Enforce the allowlist with high‑performance MV3 rules.

**Privacy**

- **Local‑only:** Data (allowlist, settings, session info) is stored locally via Chrome storage APIs. No cloud services or external servers.

**Troubleshooting**

- **Extension not blocking:** Ensure Focus Mode is enabled in the popup and the allowlist is configured.
- **Changes not visible:** Click “Reload” on the extension in `chrome://extensions` after builds.
- **Service worker inactive:** Open the extension card to awaken the MV3 service worker; check background script logs in the Extensions page.
