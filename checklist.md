# Room Scheduler & Reception Kiosk — Comprehensive End-to-End Testing Checklist

This document is your complete step-by-step testing guide to verify every feature, UI component, security safeguard, and edge case across the Room Scheduler and Reception Kiosk suite.

---

## 1. Environment & Configuration Check

Before running tests, confirm your `.env` file contains the required configuration flags:

```env
# Required for NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# AES-256-GCM Token Encryption Key (64 hex characters / 32 bytes)
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Email domain restriction for employee creation & /me access (e.g. yourcompany.com)
ALLOWED_EMAIL_DOMAIN="gmail.com" # or leave blank to allow all during local testing

# Comma-separated list of admin email addresses allowed to access /admin/rooms
ADMIN_EMAILS="your-admin@gmail.com,another-admin@company.com"

# Optional: Resend API Key (leave empty to test graceful email skipping)
RESEND_API_KEY=""
```

- [ ] **1.1** Verify `npm run dev` starts cleanly on `http://localhost:3000` without environment errors.
- [ ] **1.2** Check that `.env.example` includes `ALLOWED_EMAIL_DOMAIN=""` and `ADMIN_EMAILS=""` as documentation references.

---

## 2. Authentication & Domain Authorization (`/me`)

Test that OAuth login, domain restrictions, and presence toggling work as expected.

- [ ] **2.1 Valid Domain Sign-In**:
  - Navigate to `http://localhost:3000/me`.
  - Click **Sign in with Google** using an email address matching `ALLOWED_EMAIL_DOMAIN`.
  - **Expected Result**: You are signed in successfully and your profile page (`/me`) is displayed.
- [ ] **2.2 Automatic Employee Record Creation**:
  - Upon first login with a valid domain email, verify an `Employee` record is created in the database for your email.
- [ ] **2.3 Unauthorized Domain Blocking**:
  - Sign out, then try signing in with an email *outside* `ALLOWED_EMAIL_DOMAIN` (or change `ALLOWED_EMAIL_DOMAIN` in `.env` to a domain not matching your email and restart the dev server).
  - Try accessing `/me` or making a request to `/api/me/status`.
  - **Expected Result**: You are blocked with a clear **"Not Authorized"** message and cannot view or toggle employee presence.
- [ ] **2.4 Work Presence Toggle (`In Office` / `Remote`)**:
  - On `/me`, toggle your work status between **"In Office"** and **"Remote"**.
  - **Expected Result**: The status updates immediately in the UI and is saved to PostgreSQL without a page reload.
- [ ] **2.5 Sign Out Button**:
  - Click the **Sign Out** button on `/me` (or in the room header).
  - **Expected Result**: Your session is terminated and you are redirected to the home screen.

---

## 3. Admin Portal & Access Control (`/admin/rooms`)

Test role-based access control and room management CRUD operations.

- [ ] **3.1 Admin Access Allowed**:
  - Sign in with an email listed in `ADMIN_EMAILS`.
  - Navigate to `http://localhost:3000/admin/rooms`.
  - **Expected Result**: The Admin Portal loads successfully.
- [ ] **3.2 Non-Admin Access Blocked (Server-Side Enforcement)**:
  - Sign in with an email *not* listed in `ADMIN_EMAILS` (or open an incognito/unauthenticated browser).
  - Try visiting `http://localhost:3000/admin/rooms` or making a `POST` request to `/api/admin/rooms`.
  - **Expected Result**: Access is blocked immediately with a `403 Forbidden` / **"Not Authorized"** error.
- [ ] **3.3 Add a New Room**:
  - On `/admin/rooms`, enter a Room Name (e.g., `Conference Room A`), select Provider (`Google` or `Microsoft`), and enter a Calendar ID.
  - Click **Add Room**.
  - **Expected Result**: The room is created and appears in the rooms list.
- [ ] **3.4 Edit an Existing Room**:
  - Click **Edit** on a room, change its name to `Conference Room A - Upgraded`, and save.
  - **Expected Result**: The room name updates instantly across the list.
- [ ] **3.5 Server-Side Input Validation**:
  - Try submitting an empty room name or an oversized string (>100 characters via API).
  - **Expected Result**: The server rejects the input with a validation error message.

---

## 4. Room Scheduler Door Panel (`/room/[roomId]`)

Test the minimalist monochrome (`MONO_INK`) tablet display designed to be mounted outside a meeting room door.

- [ ] **4.1 Minimalist Monochrome UI Layout**:
  - Navigate to a room panel URL (e.g., `http://localhost:3000/room/<your-room-id>`).
  - **Expected Result**:
    - Header displays the bold room name on the left and a live real-time clock (`h:mm A`) on the right, separated by a crisp black border.
    - Left column shows high-contrast status (`AVAILABLE` with green dot & underline accent, or `OCCUPIED` with red dot & underline accent) and **Today's Schedule** rows.
    - Right column shows **ACTIONS**: **Book on the spot** button, **Meet later** button, capacity (`12 Pax`), WiFi (`High-Speed`), and **"last updated Xs ago"** ticker.
- [ ] **4.2 Silent Auto-Refresh & Freeze Indicator**:
  - Watch the bottom ticker (`last updated 0s ago`).
  - **Expected Result**: The counter increments every second (`1s ago`, `2s ago`...) and silently resets to `0s ago` every 15 seconds when background polling completes, without any visual reload flash.
- [ ] **4.3 Instant 30-Minute Booking ("Book on the spot")**:
  - When the room is `AVAILABLE`, click **Book on the spot**.
  - **Expected Result**:
    - The button shows `"Booking..."`.
    - A success banner appears (`✓ Successfully booked!`).
    - The room status re-fetches immediately and updates to `OCCUPIED` / `IN MEETING`.
- [ ] **4.4 Double-Booking Lock Verification**:
  - If you click **Book on the spot** on a room that is already occupied or booked, verify it displays an appropriate alert (`⚠️ Room is already busy`) without crashing.
- [ ] **4.5 "Meet Later" Interactive Timeline Modal**:
  - Click the **Meet later** button on the right sidebar.
  - **Expected Result**: A clean modal opens showing **Today's Full Timeline** (hourly slots from 9:00 AM to 5:30 PM with `AVAILABLE` and `BOOKED` badges).
  - Click **✕** or **Close Timeline** to close the modal.
- [ ] **4.6 Unauthenticated / Demo Fallback Mode**:
  - Open the room panel URL in an unauthenticated or incognito browser.
  - **Expected Result**: Instead of blocking with a sign-in error screen, the panel gracefully displays demo schedule data so the door display remains functional and visually stunning.

---

## 5. Lobby Reception Kiosk (`/kiosk`)

Test the lobby touchscreen kiosk features, check-in flow, and presence badges.

- [ ] **5.1 Welcome Screen (`MONO_INK` Theme)**:
  - Navigate to `http://localhost:3000/kiosk`.
  - **Expected Result**:
    - Header displays `MONO_INK`, live uppercase date (`TUESDAY, JULY 28`), and digital clock.
    - Background displays a subtle concentric circle & crosshair graphic (`pointer-events-none`).
    - Main center button: **TAP TO CHECK IN** with tap hand icon.
    - Secondary buttons below: **HAVE A QR CODE?** and **DELIVERY**.
    - Footer displays pulsing green indicator `KIOSK ACTIVE • TERMINAL 01`, **"Rooms & Employee Presence"** link, and help/globe icons.
- [ ] **5.2 Visitor Check-In Flow & Host Employee Selector**:
  - Click **TAP TO CHECK IN** to open the Visitor Check-In form.
  - Check the **Select Your Host Employee** dropdown list.
  - **Expected Result**: Every employee is listed along with their real-time work presence badge:
    - Example: `Alex Morgan (Engineering) — [In Office]`
    - Example: `Sarah Chen (Design) — [Remote]`
- [ ] **5.3 Check-In Submission & Database Persistence**:
  - Enter your Full Name (e.g., `Jordan Taylor`), Company (`Acme Corp`), and select a Host Employee.
  - Click **COMPLETE CHECK-IN →**.
  - **Expected Result**:
    - A success screen appears: *“✓ You’re checked in! We’ve sent an arrival notification to your host [Host Name]. Please take a seat.”*
    - The record is saved in the PostgreSQL `visits` table.
- [ ] **5.4 Graceful Notification Failure Handling (No API Key Required)**:
  - With `RESEND_API_KEY=""` (empty) in `.env`, submit a visitor check-in.
  - **Expected Result**:
    - Check-in **succeeds immediately** without throwing an error or blocking the visitor.
    - Terminal/server logs output a clear notice: `"email skipped: no API key configured"`.
- [ ] **5.5 Automatic Countdown Reset**:
  - After a successful check-in, wait 8 seconds.
  - **Expected Result**: The form resets automatically and returns to the `MONO_INK` Welcome screen.

---

## 6. QR Code Invite & Delivery Kiosk Modes (`/kiosk`)

Test secondary receptionist kiosk workflows.

- [ ] **6.1 "HAVE A QR CODE?" Invite Mode**:
  - On `/kiosk`, click **HAVE A QR CODE?**.
  - **Expected Result**: Opens an invite verification screen allowing the visitor to hold a QR code to the camera or type a 6-digit invite code (e.g., `849201`).
  - Enter any 6-digit code and click **Verify**.
  - **Expected Result**: Confirms the invite code and shows a welcome back message.
- [ ] **6.2 "DELIVERY" Courier Check-In Mode**:
  - On `/kiosk`, click **DELIVERY**.
  - **Expected Result**: Opens the Package Delivery Check-In view.
  - Select a carrier (`FedEx`, `UPS`, `DHL`, `Amazon`, etc.), pick a Recipient Employee, and click **Notify Recipient of Delivery**.
  - **Expected Result**: Shows a confirmation screen instructing the courier to leave the package at the desk.

---

## 7. Office Dashboard — Rooms Status & Employee Presence (`/kiosk`)

Test the consolidated live dashboard accessible from the lobby kiosk.

- [ ] **7.1 Open the Office Dashboard**:
  - On `/kiosk`, click the top navigation tab **Rooms & Presence** (or the footer link `Rooms & Employee Presence`).
  - **Expected Result**: A 2-column dashboard loads cleanly.
- [ ] **7.2 Meeting Rooms Status Column**:
  - Verify all rooms created in `/admin/rooms` are displayed.
  - Verify each room shows a live status badge (`AVAILABLE` in green vs `IN MEETING` in red) and current schedule times.
  - Verify status auto-refreshes every 15 seconds.
- [ ] **7.3 Employee Directory & Presence Column**:
  - Check the list of employees on the right side of the dashboard.
  - **Expected Result**: Every employee is listed with their department and a high-contrast pill badge:
    - `● IN OFFICE` (green badge)
    - `○ REMOTE` (gray badge)
- [ ] **7.4 Real-Time Synchronization**:
  - In another browser tab, open `/me` and change your status from `In Office` to `Remote`.
  - Look at the `/kiosk` dashboard or Check-In dropdown.
  - **Expected Result**: The employee's presence badge reflects the updated status when refreshed.

---

## 8. Security & Resiliency Verification

Verify code hardening items from the security audit.

- [ ] **8.1 Token Encryption at Rest**:
  - Inspect the PostgreSQL `Account` table in your database.
  - **Expected Result**: OAuth access and refresh tokens are stored in ciphertext format (`enc:v1:<iv>:<tag>:<ciphertext>`), never as plaintext strings.
- [ ] **8.2 Zero Secret Leakage in Logs**:
  - Trigger a network error or failed API request.
  - Check terminal console outputs.
  - **Expected Result**: Errors are logged as clean message strings (e.g., `Error: Invalid room ID`), never dumping HTTP request objects or `Authorization: Bearer <token>` headers.
- [ ] **8.3 Parameterized SQL & SQL Injection Safety**:
  - Confirm all database queries execute via Prisma ORM parameterized methods or tagged-template literals (`$executeRaw`). No raw string-built SQL is permitted.
- [ ] **8.4 Production HTTP Security Headers**:
  - Inspect network response headers in browser DevTools.
  - **Expected Result**: Responses include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. In production (`NODE_ENV="production"`), `Strict-Transport-Security` and HTTP-to-HTTPS redirects are enforced.
