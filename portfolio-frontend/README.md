# Galaxy

A React portfolio with a full-screen Galaxy home and the supplied GooeyNav.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. Build with `npm.cmd run build`.

## Cloudflare Workers deployment

This portfolio is a static Vite app. `wrangler.jsonc` serves the built `dist` directory as Worker static assets, including SPA fallback routes. For a Git-connected **Worker**, use these settings under **Settings → Builds**:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Do not point Wrangler at `vite.config.js`; it is Vite's build configuration, not a Worker entry point. For a manual deployment after authenticating Wrangler, run `npm run deploy:worker`, which builds and deploys in one command. If Cloudflare reports a Worker name mismatch, set `name` in `wrangler.jsonc` to the Worker name shown in the dashboard.

The supplied WebGL shader lives in `src/components/Galaxy/Galaxy.jsx`. `GalaxyBackground.jsx` configures it and provides reduced-motion, mobile-quality, and WebGL fallback behavior. The supplied GooeyNav source lives in `src/components/GooeyNav/`. The other navigation destinations show a coming-soon message until their pages are built.

The About page has a navy-and-lavender portrait layout with editable contact and language placeholders. The Education section contains a responsive, scroll-driven SVG journey with editable academic placeholders. The Projects section uses Aceternity UI's container scroll animation around a scrollable, clickable project archive. The About route retains site navigation and the footer.

Earth textures: `public/assets/earth-day.png` is [NASA Goddard SVS Blue Marble](https://svs.gsfc.nasa.gov/2915/); `public/assets/earth-clouds.jpg` is [NASA Visible Earth Blue Marble: Clouds](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds/77558l). Credit: NASA/GSFC, Reto Stöckli.

## Portfolio chatbot (Phase 5)

The chatbot is mounted alongside the existing portfolio in `src/main.jsx`. The floating widget lives in `src/components/chatbot/`, its conversation state in `src/hooks/useChatbot.js`, and its HTTP client in `src/services/chatApi.js`. It uses the portfolio's existing theme tokens, works from phone to desktop widths, and supports keyboard navigation, Escape to close, Enter to send, Shift+Enter for a newline, suggested questions, retry, and a new conversation action. Assistant Markdown and code blocks are rendered without raw HTML.

The session ID is kept in memory for the current page visit and sent with follow-up messages. Starting a new conversation or reloading starts a new session. If the backend reports an expired session, the widget offers a fresh conversation. No API keys or conversation history are stored in the browser.

### Local setup

Use separate PowerShell terminals from the `AI project` workspace:

```powershell
cd .\portfolio-ai-backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd .\portfolio-frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

The frontend runs at `http://localhost:5173`; the sample `.env` sends chat requests to `http://127.0.0.1:8000/api/v1/chat`. `VITE_CHATBOT_API_URL` is the backend origin, without `/api/v1/chat`. Leave it empty when a production reverse proxy serves the API at the same origin. `VITE_CHATBOT_MAX_MESSAGE_LENGTH` should match the backend's message limit (default 2000). Only public configuration belongs in `VITE_` variables; keep provider keys in the backend environment. For a separate production backend origin, use HTTPS and include the deployed frontend origin in the backend's CORS configuration.

### Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

The browser smoke test requires both local servers and Microsoft Edge. It checks desktop, tablet, and phone layouts, theme behavior, and two real frontend-to-backend requests with session reuse. AI provider answers and verified personal answers require backend credentials and populated knowledge content; the sample backend may return its safe fallback for personal questions.

For production, set `VITE_CHATBOT_API_URL` to the backend's HTTPS origin before `npm run build`; the build rejects an HTTP origin. `public/_headers` adds safe response headers for the existing Cloudflare static-assets deployment. The [workspace deployment guide](../README.md) covers both applications, environment settings, and post-deployment checks.
