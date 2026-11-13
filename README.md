# InstaFlow - Instagram Reels Automation & Management Platform

> **Create. Automate. Publish.**  
> Complete Instagram Creator & Business account automation, reels scheduling, AI caption generation, and multi-account workspace powered by Meta Graph API v21.0.

---

## ⚡ Features

- **CreatorFlow Onboarding Flow:**
  - Auto-fetch Instagram profile details with live avatar, follower count, and media badges.
  - Seamless Meta OAuth 2.0 login with automatic permission verification (`instagram_basic`, `instagram_content_publish`, `pages_show_list`, etc.).
  - Built-in **Personal to Professional Account Conversion** (1-Click Instant Upgrade or Official 4-Step Mobile Walkthrough).
- **Instagram Reels Management:**
  - Full support for `Published`, `Scheduled`, `Draft`, `Publishing`, and `Failed` reels.
  - Direct actions: Publish now, reschedule, move to draft, duplicate, edit, and live video preview.
  - Live Instagram media synchronization with verified badges (`#0129`, `#0130`, `#0131`).
- **Secure Token Vault Architecture:**
  - Cloud Functions backend exchanges short-lived tokens for 60-day Meta Long-Lived Page tokens.
  - Zero token leakage to client-side localStorage/browser state for maximum security under Meta Developer policies.
- **AI Studio & Smart Automations:**
  - Automated viral caption generation, hashtag discovery, and engagement tracking.
  - Scheduled queue processing with automated error recovery.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Canvas API for video thumbnails.
- **Backend:** Firebase Cloud Functions / Node.js Express server (`functions/`).
- **APIs:** Meta Graph API v21.0, Instagram Graph API, Firebase Firestore & Storage.
- **Linter & Build:** Oxlint (zero lint errors), Vite Production Bundle.

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Maneesha-7386/instaflow-automation.git
cd instaflow-automation

# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Environment Configuration

Copy the example environment files:

```bash
cp .env.example .env
cp functions/.env.example functions/.env
```

Configure your credentials in `.env` and `functions/.env`:
- Meta App ID & App Secret
- Firebase project configuration

### 3. Run Locally

```bash
# Start backend server
node functions/localServer.js

# In another terminal, start frontend
npm run dev
```

---

## 🛡️ License

Private & Proprietary. All rights reserved.
