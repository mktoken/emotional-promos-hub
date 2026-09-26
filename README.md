# Emotional Promos Hub / Promocionales Emocionales

Plataforma B2B para catálogo de artículos promocionales, solicitudes de cotización, CRM y cotización formal.

## Project info

- Repositorio: `mktoken/emotional-promos-hub`
- Producción: <https://articulospromocionales.vip>
- Proyecto Lovable: `406ed62b-fa9a-4346-82b6-4b111a4193b3`
- Rama de continuación: `main`

## Continuidad del proyecto

La primera lectura obligatoria es [`docs/00_PROJECT_INDEX.md`](docs/00_PROJECT_INDEX.md).

Para conocer el estado actual, el checkpoint vigente y el siguiente paso autorizado, consultar [`docs/MASTER-STATE.md`](docs/MASTER-STATE.md).

El README es una guía de entrada y no es una segunda fuente de estado.

Documentación canónica:

- [`docs/00_PROJECT_INDEX.md`](docs/00_PROJECT_INDEX.md) — índice y autoridad documental.
- [`docs/02_DECISION_LOG.md`](docs/02_DECISION_LOG.md) — decisiones.
- [`docs/04_PRODUCT_SCOPE.md`](docs/04_PRODUCT_SCOPE.md) — producto.
- [`docs/05_ARCHITECTURE.md`](docs/05_ARCHITECTURE.md) — arquitectura.
- [`docs/08_OPERATIONS_RUNBOOK.md`](docs/08_OPERATIONS_RUNBOOK.md) — operación.
- [`docs/09_PRICING_CATALOG_V2.md`](docs/09_PRICING_CATALOG_V2.md) — Pricing y catálogo V2.
- [`docs/10_QA_EVIDENCE.md`](docs/10_QA_EVIDENCE.md) — evidencia QA.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/406ed62b-fa9a-4346-82b6-4b111a4193b3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

This project uses **Bun** as its authoritative package manager. Do not run `npm install` or `npm ci`.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies reproducibly.
bun install --frozen-lockfile

# Step 4: Start the development server.
bun run dev

# Additional scripts
bun run test
bun run tsc --noEmit
bun run build
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/406ed62b-fa9a-4346-82b6-4b111a4193b3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
