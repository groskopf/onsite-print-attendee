# onsite-print-attendee

The attendee app shows each attendee their personal check-in pass. It is a
React app built with JavaScript and Vite.

## Check-in pass

Each attendee receives a personal link:

```text
https://<host>/attendee/<EVENT_CODE>/<attendee_code>
```

The page loads `GET /api/v2/events/{event_code}` and
`GET /api/v2/attendees/{event_code}/{attendee_code}`. It shows the event name,
its dates and location, and the attendee's name and company. Below them is a QR
code for the check-in app to scan. The QR code holds only the 64-character
attendee code.

The link itself works as the access secret, so no login is needed. Treat the
link as personal. The page sends no referrer and asks search engines not to
index it. Invalid or unknown codes show a "not valid" message. Opening
`/attendee/` without codes asks the attendee to use the link from their
invitation.

## Start in the dev container

1. Install Docker and the **Dev Containers** extension (`ms-vscode-remote.remote-containers`) in VS Code.
2. Make sure Docker is running, then open this folder in VS Code.
3. Open the Command Palette (`Ctrl+Shift+P`) and select **Dev Containers: Reopen in Container**.
4. Wait for the container to finish setting up. It includes Node.js 24, npm, Git, and ESLint support; dependencies install automatically.
5. In the VS Code terminal inside the container, run:

	```sh
	npm run dev
	```

6. Open `http://localhost:5173/attendee/<EVENT_CODE>/<attendee_code>` to see a
   pass. VS Code forwards this port from the container.

The first container setup requires internet access to download the image and dependencies.

Copilot session files are shared from the host's `~/.copilot/session-state` into
the container user's home; other Copilot configuration and credentials are not
mounted. The host directory must exist before reopening (create it as your
normal user with `mkdir -p ~/.copilot/session-state` if necessary).
Only use trusted code: shared session files may contain sensitive conversations
and are writable from the container.
The container and VS Code run as `node`, with `updateRemoteUserUID` enabled to
match your host UID/GID on Linux. Avoid `sudo` for npm, editing, or Copilot
commands so new files remain host-owned. Compare `id` inside and outside the
container after **Dev Containers: Rebuild and Reopen in Container**.
Sharing history does not transfer a running chat or authentication, and session
discovery depends on the chat provider. Use its history/resume UI if supported;
do not resume the same session concurrently on the host and in a container.

This repository has its own Node.js environment; backend Python development uses
the separate container in `../onsite-print-backend`. The API proxy inside this
container targets `http://host.docker.internal:8080`, reaching the full stack
started on the host from `../onsite-print-server`. Override `API_PROXY_TARGET`
when using a different API server. Reopening does not start the full stack.

The container builds from `.devcontainer/Dockerfile`, which uses Node.js 24 with npm and installs Git, curl, and CA certificates. App dependencies install separately with `npm ci` after the workspace is mounted.

After changing the Dockerfile or container configuration, run **Dev Containers: Rebuild and Reopen in Container** from the Command Palette.

## Source layout

`src/App.jsx` renders the pass page, and `src/attendee-api.js` parses the link
and loads and formats its data. `src/index.css` controls the page's appearance.

## Commands

```sh
npm run dev      # Start the development server
npm run lint     # Check JavaScript and React code
npm test         # Run the attendee-api unit tests
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build
```

## Run without a container

Install Node.js 24 (the version in `.nvmrc`), then run:

```sh
npm ci
npm run dev
```

The development server binds to all interfaces so it is reachable through container port forwarding. Use it only in a trusted development environment.

## Full-stack development and deployment

From the sibling `onsite-print-server` repo:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
```

Open <http://localhost:8080/attendee/>. Source changes hot-reload through the
gateway. Production builds use the same `/attendee/` base path and support
refreshing nested SPA routes. Missing `/attendee/assets/` files return 404.

Use relative API URLs such as `/api/v2/health`. The gateway forwards them to
FastAPI. When running Vite directly on port 5173, its API proxy defaults to
`http://localhost:8080`; set `API_PROXY_TARGET` if the backend is elsewhere.

The Dockerfile has `development` and `production` targets. The production image
serves only built assets; it does not run Vite. To publish it, set `IMAGE_TAG` in
`.env`, set `CR_PAT` securely in the environment with GHCR `write:packages`
permission, and run `bash docker-push.sh`. `GHCR_USERNAME` defaults to `groskopf`.
The image is `ghcr.io/groskopf/onsite-print-attendee:<IMAGE_TAG>`.

Tags must be `major.minor.patch` without leading zeros. The script publishes
the current version and increments its patch in `.env` only after success.
Failures leave the version unchanged. Commit the updated `.env`; it contains
the next release, not a published tag. Use the printed published tag for
deployment. Do not publish concurrently or from stale checkouts: increments
do not prevent overwrites caused by stale versions or interrupted-push retries.

Alternatively, trigger the **Publish release** GitHub Actions workflow from the
Actions tab (`workflow_dispatch` only, runs from `main`). It reads the pending
`IMAGE_TAG` from `.env`, builds and pushes the image to GHCR using the built-in
`GITHUB_TOKEN`, tags the published commit on `main` with that version (no `v`
prefix), and commits the incremented `.env` back to `main`. This requires one-
time setup: personal-account repos can't add GitHub Actions to a ruleset's
bypass list, so add a `RELEASE_TOKEN` repository secret holding a fine-grained
personal access token (owned by a repository admin, scoped to this repo with
Contents: Read and write permission), and add the **Repository admin** role to
the branch ruleset's bypass list for `main`. Pushes authenticated with
`RELEASE_TOKEN` are attributed to the token owner's admin role and bypass the
pull-request requirement. Renew the token before it expires.

See the server repo's README for image-only deployment and HTTPS setup.

## Test the publishing script

```sh
bash tests/docker-push-test.sh
```

GitHub Actions runs these tests on pushes and pull requests against this repo's
own script. They use a mocked Docker CLI, do not build or upload images, and
require no credentials or sibling repositories.
