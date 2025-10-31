# Firebase Setup Guide

Firebase provides free authentication (10K users/month) for secure login/signup.

## Step 1: Create Firebase Account

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account
3. Click **"Add project"** (or "Create a project")

## Step 2: Create New Project

1. **Project name**: `sales-ai-agent` (or any name)
2. Click **Continue**
3. **Google Analytics**: You can disable it (not needed for this project)
4. Click **Create project**
5. Wait for setup (30 seconds)
6. Click **Continue**

## Step 3: Add Web App

1. In your Firebase project dashboard
2. Click the **Web icon** `</>` (Add app button)
3. **App nickname**: `sales-agent-web`
4. **✅ Check**: "Also set up Firebase Hosting" (optional)
5. Click **Register app**

## Step 4: Get Firebase Config

You'll see code like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyByd4jX6KG-qcOEs7DGvnzspPOS4uu4YBU",
  authDomain: "sales-ai-agent-2ba4a.firebaseapp.com",
  projectId: "sales-ai-agent-2ba4a",
  storageBucket: "sales-ai-agent-2ba4a.firebasestorage.app",
  messagingSenderId: "610314593105",
  appId: "1:610314593105:web:46e12b1bf326dbd5916970"
};
```

**Copy these values!** You'll need them for both frontend and backend.

## Step 5: Enable Authentication

1. In the Firebase Console sidebar, click **Authentication**
2. Click **Get started**
3. Click on **Sign-in method** tab
4. Enable these providers:
   - **Email/Password**: Click → Toggle **Enable** → Save
   - (Optional) **Google**: Click → Toggle **Enable** → Save

That's it! Authentication is ready.

## Step 6: Get Service Account (for Backend)

1. Go to **Project Settings** (gear icon next to "Project Overview")
2. Click **Service accounts** tab
3. You'll see: **Firebase Admin SDK**
4. Note the **Project ID** - that's all you need!

```bash
FIREBASE_PROJECT_ID=your-project-id
```

## Step 7: Add to Environment Files

### Backend (.env in project root):

```bash
FIREBASE_PROJECT_ID=your-project-id
```

### Frontend (frontend/.env):

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## Step 8: Configure CORS (Important!)

Firebase needs to allow requests from your frontend:

1. Go to **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Add these domains:
   - `localhost` (already there)
   - Your production domain later

## Verify Setup

After starting your frontend, test authentication:

1. Open http://localhost:5173
2. Try to sign up with email/password
3. Check Firebase Console > Authentication > Users
4. You should see your test user!

## Troubleshooting

### "API key not valid" Error
- Double-check you copied the entire API key
- Make sure there are no extra spaces
- Verify you're using the Web API key, not iOS/Android

### "Auth domain not authorized"
- Go to Authentication > Settings > Authorized domains
- Make sure `localhost` is in the list
- Add `127.0.0.1` if needed

### Can't see Service Accounts tab?
- Click the gear icon next to "Project Overview"
- Select "Project settings"
- "Service accounts" is one of the tabs at the top

### Email/Password sign-in not working?
- Go to Authentication > Sign-in method
- Make sure Email/Password is **Enabled** (toggle should be blue)

### Where do I find the config again?
1. Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click on your web app
4. Config is shown in the "SDK setup and configuration" section

## Security Best Practices

### ✅ DO:
- Keep your API key in .env files (not in code)
- Add .env to .gitignore
- Use environment variables in production

### ❌ DON'T:
- Commit .env files to Git
- Share your service account key publicly
- Use the same Firebase project for dev and production

## Testing Authentication

After setup, you can test:

```javascript
// This happens automatically in the frontend
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Sign in
await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
```

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Authentication | 10,000 users |
| Phone Auth | 10,000 verifications/month |
| Email/Password | Unlimited |

## Next Step

✅ Firebase is set up!

Continue to: [04_SETUP_OPENAI.md](04_SETUP_OPENAI.md)
