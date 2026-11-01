# HomeCloud UI

HomeCloud UI is the web frontend for the HomeCloud file storage service. It provides a responsive dashboard for signing in, browsing and organizing files and folders, viewing storage usage, and managing deleted items.

## Features

- Login and account registration
- Browse folders and files
- Create, rename, and move folders and files
- Upload and download files
- Move files and folders to Trash, restore them, or permanently delete them
- View used and available storage
- Responsive layout with a sidebar, search field, and account menu

The app uses `/login` and `/register` for authentication, `/home` for files, and `/trash` for deleted items.

## Technology

- React 19 and TypeScript
- Vite
- Tailwind CSS 4
- Base UI components with project-local shadcn-style components
- Lucide React icons

## Requirements

- Node.js 22 or newer
- npm
- A running HomeCloud backend API

The frontend expects the API at `http://localhost:8080` by default.

## Run locally

1. Open a terminal in the project folder.
2. Copy `.env.example` to `.env.local`:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Confirm `.env.local` contains:

   ```dotenv
   VITE_API_BASE_URL=http://localhost:8080
   ```

4. Install dependencies and start the development server:

   ```sh
   npm install
   npm run dev
   ```

5. Open the URL printed by Vite, usually `http://localhost:5173`.

The backend must allow browser requests from the Vite origin (`http://localhost:5173`) through CORS. The browser calls the API directly, so `VITE_API_BASE_URL` must be reachable from the browser. Do not use a Docker-only service name such as `backend` in this setting.

## Production build and preview

Create the optimized static build and preview it locally:

```sh
npm run build
npm run preview
```

Vite usually serves the preview at `http://localhost:4173`. Set `VITE_API_BASE_URL` before building, or in `.env.local`, to the API URL that the browser can reach.

## Docker image

Build the standalone production image:

```sh
docker build -t homecloud-ui:local .
```

Run it locally against a backend available at `http://localhost:8080`:

```sh
docker run --rm --name homecloud-ui -p 8081:8080 -e HOME_CLOUD_API_BASE_URL=http://localhost:8080 homecloud-ui:local
```

Open `http://localhost:8081`. The container serves the UI over HTTP on port `8080`; put it behind an HTTPS reverse proxy for public use.

At container startup, `HOME_CLOUD_API_BASE_URL` configures the API URL without rebuilding the image. Use `same-origin` when the front Nginx routes API paths to the backend. The front Nginx should proxy `/users`, `/auth`, `/folders`, `/files`, and `/storage` to the backend service, and other paths to the UI service. The browser must use the public site origin; it cannot resolve Docker-only service names. The Docker Nginx config allows connections only to the UI origin and the configured API origin.

## API endpoints used

- `POST /users`, `POST /auth/login`, and `POST /auth/logout`
- `GET /storage`
- Folder operations under `/folders`, including `/folders/trash`
- File operations under `/files`, including `/files/trash` and downloads

See `src/lib/api.ts` for request methods, payloads, and response types.

## Authentication and security note

The frontend sends the login JWT as a Bearer token and currently stores it in the browser's `sessionStorage` for the current tab. JavaScript on the same origin can access that token, so protect the site against cross-site scripting (XSS), serve production traffic over HTTPS, and avoid adding untrusted scripts. Moving the token to an HttpOnly cookie requires backend cookie and CSRF support or a backend-for-frontend service.

React escapes values rendered as text, and the frontend does not use raw HTML rendering APIs. The production Docker Nginx configuration adds a Content Security Policy and other browser security headers as additional safeguards.

## Useful commands

```sh
npm run dev      # Start local development server
npm run build    # Type-check and create production assets
npm run preview  # Preview production assets locally
npm run lint     # Run Oxlint
```
