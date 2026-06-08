# innerloop

## GitHub Pages

Pushes to `main` build and deploy the static site to
`https://swnger.github.io/innerloop/` via `.github/workflows/pages.yml`.

One-time repository setup: open **Settings -> Pages** and set **Source** to
**GitHub Actions**.

The workflow builds with `BASE_PATH=/innerloop`. Set it to an empty string if
the site moves to a custom domain or a root user/organization Pages repository.
