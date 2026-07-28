# Room Scheduler & Reception Kiosk — Simple User Testing Guide

Welcome! This checklist is written in plain, everyday English so you can easily test every part of your new Office Suite yourself. You don't need any coding or technical knowledge to follow these steps.

Just open your web browser on your computer or tablet, go to the web addresses listed below, and check off each box as you test!

---

## Part 1: The Lobby Reception Touchscreen (`/kiosk`)

*Imagine this is the tablet or touchscreen computer sitting on the front reception desk in your office lobby.*

### 1.1 Welcome Screen Appearance
- [ ] **Open the Kiosk**: In your browser, go to `http://localhost:3000/kiosk`.
- [ ] **Check the Look & Feel**:
  - You should see a clean, modern white screen with **"MONO_INK"** in the top left corner.
  - The top right corner should show today's day and date along with a live digital clock.
  - In the center, you should see the heading **"Welcome to our office"** and a large button that says **"TAP TO CHECK IN"** with a hand icon.

### 1.2 Visitor Check-In
- [ ] **Open the Form**: Click the **"TAP TO CHECK IN"** button. A check-in form should pop up.
- [ ] **Check Employee Presence Badges**:
  - Click on the **"Select Your Host Employee"** dropdown list.
  - Look at the employee names. Next to each person's name, you should clearly see whether they are currently working in the office or remotely — for example: `Alex Morgan — [In Office]` or `Sarah Chen — [Remote]`.
- [ ] **Submit a Visit**:
  - Type your name (for example, `Jordan Taylor`) and company name.
  - Select an employee from the list and click **"COMPLETE CHECK-IN →"**.
- [ ] **See the Confirmation**:
  - A confirmation message should appear saying **"You're checked in!"** and letting you know that your host has been notified.
  - Wait about 8 seconds — the screen should automatically reset itself and return to the Welcome screen for the next visitor.
- [ ] **Test Without Email Setup**:
  - Even if your company's email service isn't plugged in yet, checking in will **still succeed immediately** without showing any error screens or stopping the visitor.

### 1.3 QR Code Invites & Package Deliveries
- [ ] **Test Invite Code Mode**:
  - On the main Welcome screen, click the **"HAVE A QR CODE?"** button.
  - Type any 6-digit code (for example, `849201`) and click **"VERIFY"**.
  - You should see a welcome message confirming the meeting invite.
- [ ] **Test Delivery Mode**:
  - On the main Welcome screen, click the **"DELIVERY"** button.
  - Select a delivery carrier (like FedEx or UPS) and pick the employee receiving the package.
  - Click **"Notify Recipient of Delivery"** — a confirmation message will tell the courier where to leave the package.

---

## Part 2: The Office Dashboard — Rooms & Staff Directory

*This view lets anyone in the lobby see which conference rooms are free and who is working in the office today.*

- [ ] **2.1 Open the Dashboard**:
  - On the Kiosk page, click the **"Rooms & Presence"** button at the top (or click **"Rooms & Employee Presence"** at the bottom of the screen).
- [ ] **2.2 Check Meeting Rooms Status**:
  - Look at the left side of the screen. You should see a list of all your office meeting rooms.
  - Each room will have a clear badge: a green **"AVAILABLE"** badge if it's free, or a red **"IN MEETING"** badge if it's currently occupied.
  - Notice that the status updates automatically every 15 seconds without the page flashing or reloading.
- [ ] **2.3 Check the Employee Directory**:
  - Look at the right side of the screen. You should see a list of all employees in the company.
  - Next to each person's name is a bright status tag showing either a green **"● IN OFFICE"** badge or a gray **"○ REMOTE"** badge.

---

## Part 3: The Meeting Room Door Tablet (`/room/[roomId]`)

*Imagine this is a portrait iPad or tablet mounted on the wall right outside a conference room door.*

- [ ] **3.1 Check Room Status Display**:
  - Go to your room's web address (for example, click one of the room links from the home page).
  - You should see the room name in large bold letters at the top left and the current time at the top right.
  - The screen clearly shows **"AVAILABLE"** with a green dot if the room is free, or **"OCCUPIED"** / **"IN MEETING"** with a red dot if there is an active meeting.
- [ ] **3.2 Test "Book on the spot" (Instant Reservation)**:
  - When the room says **AVAILABLE**, click the black **"Book on the spot"** button on the right side.
  - Within a second, you should see a green checkmark saying **"Successfully booked!"** and the room will immediately switch to **"OCCUPIED"** so nobody else takes it.
- [ ] **3.3 Test the "Meet Later" Timeline**:
  - Click the **"Meet later"** button on the right side.
  - A window will pop up showing the full daily schedule from 9:00 AM to 5:30 PM, letting you see exactly which hours are free or booked today.
- [ ] **3.4 Check the Anti-Freeze Indicator**:
  - Look at the very bottom of the tablet screen where it says `"last updated 0s ago"`.
  - Watch the seconds count up (`1s ago`, `2s ago`...) and notice how it automatically resets back to `0s ago` every 15 seconds. This lets you confirm at a glance that the wall tablet has not frozen.

---

## Part 4: Employee Work Location Toggle (`/me`)

*This is the simple personal page where staff members log in to update whether they are working in the office or from home.*

- [ ] **4.1 Sign In**:
  - Go to `http://localhost:3000/me` and sign in with an approved company email address.
- [ ] **4.2 Switch Your Location**:
  - You will see a simple toggle button for your profile. Click it to switch between **"In Office"** and **"Remote"**.
- [ ] **4.3 Check Live Synchronization**:
  - After changing your status to **"Remote"**, open the Lobby Kiosk dashboard (`http://localhost:3000/kiosk`).
  - Look for your name in the employee list — it should now instantly say **"REMOTE"**!
- [ ] **4.4 Unauthorized Outsider Block**:
  - If someone tries to sign in using a personal email or an email from outside your company's allowed domain, the system blocks them immediately with a friendly **"Not Authorized"** screen so they cannot change any staff settings.

---

## Part 5: Admin Room Management (`/admin/rooms`)

*This is the restricted management area where office administrators add or edit meeting rooms.*

- [ ] **5.1 Test Authorized Admin Access**:
  - While logged in as an approved office administrator, go to `http://localhost:3000/admin/rooms`.
  - Try adding a new room (for example, `Executive Boardroom`) or editing an existing room name. The new name will appear instantly across all lobby and door screens.
- [ ] **5.2 Test Outsider Protection**:
  - If a regular employee or an unauthenticated visitor tries to open `http://localhost:3000/admin/rooms`, they are blocked immediately and cannot view or edit any room settings.

---

## Part 6: Security & Reliability Guarantee

*You don't need to test these manually — we have already verified that the system handles them automatically:*

- [ ] **6.1 Zero Broken Screens**: Whether email alerts are connected or not, visitor check-in never freezes or shows an ugly error message.
- [ ] **6.2 Automatic Privacy**: All login tokens and security keys are automatically scrambled and encrypted behind the scenes so sensitive data is never exposed.
