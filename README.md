# EventPulse — Campus Event Participation & Secure Tracking App

EventPulse is a full-stack, mobile-responsive web application designed for organizing campus events, managing student registrations, and validating secure attendance check-ins using cryptographically signed QR codes.

---

## 🚀 Tech Stack

- **Frontend**: React (Next.js Pages Router), Tailwind CSS
- **Backend**: Firebase Auth (with simulated 6-digit OTP), Firestore (DBMS), Next.js API Routes (serverless backend logic / server-side cryptography)
- **State Management**: React Context (`AuthProvider`)
- **Libraries**: `qrcode.react` (QR generation), `html5-qrcode` (camera scanning), `canvas-confetti` (interactive UI transitions)

---

## 📂 Modular "Ladder" Architecture

Following modular design principles, responsibilities are cleanly divided into single-purpose modules:

```
/src
  /pages                 → Route-level components only (thin views)
    index.js              → Welcome, Event Explorer, Search/Filters, Details Modal
    login.js              → Signup, Login, and Simulated OTP Activation Views
    dashboard/[role].js   → Portal dispatcher for Student, Organizer, and Admin Faculty
    api/                  → Secure server API routes
      verify-token.js     → Validates cryptographics & handles atomic transactions
      active-redirect.js  → Dynamic QR redirection resolving current active event
  /components            → Shared React Components
    Navbar.js             → Responsive navigation banner
    Scanner.js            → Camera reader wrapper around html5-qrcode
  /lib                   → Pure algorithms (DSA/AI/Crypto) - decoupled from UI/DB
    scheduling.js         → Priority Queue + Greedy Interval Scheduling Algorithm
    recommendation.js     → Vector generation + Cosine Similarity matching engine
    qrToken.js            → Server-side HMAC-SHA256 Token sign/verify logic
    test-runner.js        → Command-line unit test runner for the algorithms
  /firebase              → Service access layers
    config.js             → Initialization (detects missing keys & invokes mock mode)
    auth.js               → Session management (signup, login, logout, mock store)
    firestore.js          → CRUD queries & atomic Firestore transaction operations
  /hooks                 → Reusable business logic hooks
    useEvents.js          → Event proposal, deletion, approvals, and conflict checks
    useAttendance.js      → Registration, attendance lists, and check-in triggers
  /styles                → Styling configs (globals.css, HSL color tokens)
```

---

## 🧠 Core DSA & AI Showcase (Judge Reference)

### 1. DBMS: Atomic Transaction Check-Ins
To prevent race conditions where dual marshals scan the same ticket simultaneously or check in beyond capacity limits, check-in operations run as **atomic database transactions** (either Firestore `runTransaction` or simulated lock files). The transaction reads the current occupancy, compares against capacity, increments the counter, and sets registration status to `checkedIn` (or `late` if beyond the 15-minute grace period).

### 2. DSA: Greedy Interval Scheduling & Priority Queue
- **Conflict Checking**: When a faculty creates a new event, we model existing approved events sharing resources (venue, faculty in-charge, or equipment) as time intervals.
- **Priority Queue**: If an overlap `StartA < EndB && StartB < EndA` occurs, we flag the conflict and push the overlapping intervals to a **Priority Queue** sorted by earliest end time.
- **Greedy Selection**: We sweep forward using the Priority Queue's sorting criteria to identify the earliest conflict-free gap of matching duration and suggest it dynamically.
- **Source File**: [`src/lib/scheduling.js`](file:///c:/Users/hafil/OneDrive/Documents/event%20manager/src/lib/scheduling.js)

### 3. AI: Content-Based Filtering via Cosine Similarity
- **Student Profile Vector**: Built dynamically mapping Interests (weight = 2), Department (weight = 3), and history of Attended categories (weight = 1 per category).
- **Event Attribute Vector**: Built mapping Title/Category Tags (weight = 2) and Department Relevance (weight = 3).
- **Cosine Similarity**: Calculates the dot product of normalized sparse vectors:
  $$\text{Similarity}(S, E) = \frac{S \cdot E}{\|S\| \|E\|}$$
  The top 3 matches are displayed on the Student Portal with a computed `% Match` label.
- **Source File**: [`src/lib/recommendation.js`](file:///c:/Users/hafil/OneDrive/Documents/event%20manager/src/lib/recommendation.js)

### 4. Cryptography: Secure Attendance QR Passes
- Instead of static text, student dashboard tickets render a signed HMAC-SHA256 token encoding: `studentId:eventId:timestamp`.
- The scanner sends the token to `/api/verify-token` where the server validates the hash signature using its secure key, verifies matches, and rejects passes that have expired (expiry: 10 minutes) or have been tampered with.
- **Source File**: [`src/lib/qrToken.js`](file:///c:/Users/hafil/OneDrive/Documents/event%20manager/src/lib/qrToken.js)

---

## 🛠️ Installation & Setup

1. **Verify Node.js** (LTS version is recommended):
   ```bash
   node -v
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables** (Optional, creates Mock Mode if omitted):
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   TOKEN_SECRET=your-secure-server-hmac-key
   ```
4. **Run algorithm unit tests**:
   ```bash
   node src/lib/test-runner.js
   ```
5. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Mock Mode Demo Instructions
If running without environment variables, the app runs in **Mock Mode** (using `localStorage` database sync).
1. Click **Sign Up** on the navbar.
2. Register a user with any email, select **Admin Faculty** role.
3. Open your browser console `F12` to see the simulated activation OTP printed (e.g. `[MOCK AUTH] Activation OTP is: XXXXXX`).
4. Enter the code to activate your account.
5. Create an event to test conflict warnings. Create another overlapping event at the same venue to see conflict warnings and priority queue slot suggestions in action!
6. Sign out and sign up as a **Student** (with tags e.g. "AI, Web") to see AI matching scores on upcoming events.


