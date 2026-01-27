# Torre Tempo - Time Tracking (Spain)

This is a compliance focused time tracking app for Lakeside La Torre Murcia Group SL.

## Structure
- apps/web: Web admin and employee portal (static HTML/CSS/JS)
- apps/mobile: Mobile app (Expo React Native)
- docs: Compliance settings and policy templates

## Web app
Open `apps/web/index.html` in a browser or serve it with any static server.

## VPS deploy (Docker)
1) Build and run
   - `docker compose up -d --build`
2) Open
   - `http://<your-vps-ip>:8080`

Notes
- Geolocation requires HTTPS or localhost. Use a reverse proxy with TLS for production.

## VPS deploy (script)
On the VPS:
1) Clone and run
   - `REPO_URL=https://github.com/your-org/torre-tempo.git bash scripts/deploy-vps.sh`
2) Update `.env` if needed
   - `nano .env`

## API
The API runs on port 4000 inside Docker and is proxied by nginx at `/api`.

Default admin user is set via `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `JWT_SECRET`

Copy `.env.example` to `.env` and update values before deploying.

SMTP reset requires:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `RESET_URL_BASE` to build the reset link (e.g. `https://your-domain/reset.html`)

SMTP settings can also be updated from the Admin page (Email and Reset section).

Certificate upload
- Admins can upload the company certificate (P12) from the Admin page (Exports and Audit).

Signed PDF export requires:
- `CERT_P12_PATH` (mounted in container)
- `CERT_P12_PASSWORD`

## User management
Log in as admin and add or archive staff from the Admin tab.
Add location and department for each staff member to enable scoped rota views.

## Rota
- Drag staff onto shifts to assign.
- Drag shifts between days to move.
- Copy shifts, publish rota, and send reminders.
- Filter by location and department.

Scheduled reminders
- Configure lead times in Admin > Rota reminders.

## Password reset and deactivation
- Admins can deactivate users and reset passwords from the Admin tab.
- Users can request a password reset from the sign-in modal.

## Mobile app
Requires Node and Expo.

1) Install dependencies
   - `cd apps/mobile`
   - `npm install`
2) Run
   - `npx expo start`

Notes
- Mobile app requests location on clock events only.
- Use the language toggle in the header to switch locale.
- Configure API base on the login screen (e.g. `http://<server-ip>:8080/api`).

## Notes
- Data is stored locally in the browser for the web demo.
- Geolocation is captured only for on clock events.
