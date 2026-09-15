# Easy CV

[English](README.md) | [简体中文](README.zh-CN.md)

A self-hosted personal online text clipboard: open the web app on any device, press ⌘/Ctrl + V to save, and click to copy.

## Features

- **Paste to Save**: Listens globally for `paste` events to bring up the editor prefilled and auto-focus the title. Duplicate content is automatically deduplicated and bumped to the top.
- **Click to Copy**: Single-click on any clip card to copy its full content (with automatic fallback on plain HTTP, no HTTPS required).
- **Optional Titles**: Support for optional clip names (up to 64 characters) for clean and organized lists.
- **Organization**: Pinning, editing, deletion (with a 5-second undo toast), keyword search with highlighting, and infinite scrolling.
- **Multi-device Sync**: Automatically refreshes when the page returns to the foreground.
- **Multi-user Support**: Registration toggle + invite codes. Administrators can enable/disable, reset passwords, or delete users (admins cannot view other users' clips).
- **Security & Privacy**: Argon2id password hashing, HttpOnly session cookies, Origin header verification, rate limiting, and plain-text rendering to prevent XSS.

## Tech Stack

React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Frontend); Fastify + Drizzle ORM + SQLite (Backend). Single container, single SQLite file in production.

## Local Development

```bash
npm install                     # Frontend dependencies
npm --prefix backend install    # Backend dependencies
cp .env.example .env            # Configure ADMIN_INVITE_CODE (at least 8 characters)
```

Run in two separate terminals:

```bash
npm run dev:backend   # Backend at http://127.0.0.1:8000
npm run dev           # Frontend at http://localhost:5173 (/api is proxied to backend)
```

Open http://localhost:5173 in your browser. It will redirect to `/setup`. Use the `ADMIN_INVITE_CODE` defined in `.env` to complete initialization.

## Testing & Quality Checks

| Command | Description |
| --- | --- |
| `npm run test:backend` | Backend tests (`node:test`, in-memory SQLite) |
| `npm --prefix backend run typecheck` | Backend TypeScript check |
| `npm run build` | Frontend TypeScript check + production build |
| `npm run lint` | Oxlint linter |

## Deployment (Ubuntu 24.04)

```bash
# Install Docker (official script)
curl -fsSL https://get.docker.com | sh

git clone https://github.com/wallace921029/easy-cv.git && cd easy-cv
cp .env.example .env    # Configure ADMIN_INVITE_CODE
mkdir -p data
docker compose up -d --build
```

Visit `http://<SERVER_IP>:8000` to complete initialization (create admin account). Once initialized, `ADMIN_INVITE_CODE` is invalidated and can be removed from `.env`.

### Nginx Reverse Proxy (Optional, for Custom Domain & HTTPS)

Configure in `.env`:

```env
TRUST_PROXY=true
HOST_BIND=127.0.0.1
```

Minimal Nginx configuration:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
client_max_body_size 4m;
```

> **Note**: `Host` must be `$http_host` (preserving the port number), otherwise Origin validation will fail on non-standard ports. The default Nginx `client_max_body_size` is 1m, which cannot handle 1 MB text clips.

## Operations & Maintenance

```bash
# Upgrade
git pull && docker compose up -d --build

# Backup: stop the container and copy the data/ directory
docker compose stop && cp -r data data.bak && docker compose start

# Reset password for any user (including admin); prints a new random password
docker compose exec app node backend/dist/cli.js reset-password <username>
```

## FAQ

**Why is the "Read Clipboard" button hidden when accessing via plain HTTP (direct IP)?**  
Browsers only expose the `navigator.clipboard.readText` API in secure contexts (HTTPS). Under plain HTTP, this button is automatically hidden. Paste-to-create (`Cmd/Ctrl + V`) and click-to-copy remain unaffected (copying uses an automatic fallback mechanism).

**What should I do if I forget the admin password?**  
Run `docker compose exec app node backend/dist/cli.js reset-password admin` on your server and log in with the newly printed password.

**"Data directory not writable" error on container startup?**  
The container runs under the `node` user (UID 1000). If `./data` permissions are incorrect, run `sudo chown -R 1000:1000 ./data` and restart. Avoid placing `data/` on network file systems such as NFS (SQLite file locking may be unreliable).

**Browser console reports Mixed Content or resources upgraded to HTTPS?**  
The application does not enforce HTTPS when running directly over HTTP. If this occurs after configuring Nginx + HTTPS, check whether old HTTP bookmarks or links are being accessed. HSTS should be managed by Nginx.

## Directory Structure

```text
easy-cv/
├── src/                  # Frontend (React)
├── backend/              # Backend (Fastify)
│   ├── src/              #   routes / services / plugins / jobs / cli
│   └── drizzle/          #   Migrations (executed automatically on startup)
├── data/                 # SQLite storage (generated at runtime, gitignored)
├── Dockerfile
└── docker-compose.yml
```
