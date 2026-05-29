## Hosting / Stack

- Target hosting: GitHub Pages, so the app must build to static files.
- Use Vite + React
- No required backend, SSR, or server routes.
- Any tokenizer must run client-side; GitHub Pages cannot host endpoints.
- If publishing under `org.github.io/repo`, set Vite `base` to `/repo/`; use `/` for custom domains or root user/org sites.
