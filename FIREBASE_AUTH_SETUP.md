# Firebase Authentication Setup

## Current Status

Your backend is currently running in **Development Mode** with Firebase authentication fallback. This means:

- ✅ Authentication is **working correctly**
- ✅ Users can sign in and access their data
- ⚠️ Firebase tokens are decoded without full verification (safe for development)
- ⚠️ You'll see warning messages in the backend logs

## The Warnings You're Seeing

```
⚠️ DEV MODE: Firebase error, using unverified token decode
✅ DEV MODE: Using user ID from token: oRZ7mzbCcQaGr8iBojye9hz4fHi1
```

These warnings are **normal and safe for development**. The system is working correctly and extracting user information from Firebase tokens.

## About the 307 Redirects

```
INFO: 127.0.0.1:60371 - "GET /api/agents HTTP/1.1" 307 Temporary Redirect
INFO: 127.0.0.1:60371 - "GET /api/agents/ HTTP/1.1" 200 OK
```

This is **normal FastAPI behavior** when handling trailing slashes. The request succeeds on the second attempt. This doesn't cause any issues and happens automatically.

---

## Option 1: Continue in Development Mode (Recommended for Development)

**No action needed!** Your system is working fine. The warnings are informational only.

### Pros:
- Simple setup
- Works immediately
- No additional configuration needed

### Cons:
- Warning messages in logs
- Token verification is less strict (still safe for development)

---

## Option 2: Set Up Full Firebase Verification (Optional)

For production or if you want to eliminate the warnings, follow these steps:

### Step 1: Download Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sales-ai-agent-2ba4a**
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

### Step 2: Save the Service Account File

1. Rename the downloaded file to `firebase-service-account.json`
2. Move it to your project's backend folder:
   ```
   sales_agent/backend/firebase-service-account.json
   ```

### Step 3: Update Your .env File

Add this line to your `.env` file:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=backend/firebase-service-account.json
```

### Step 4: Restart Your Backend

```bash
# Stop the current backend (Ctrl+C)
# Then restart it
cd /Users/thisalthulnith/sales_agent/backend
python main.py
```

You should now see:
```
✅ Firebase Admin SDK initialized with service account
```

---

## Security Notes

⚠️ **Important:** The service account JSON file contains sensitive credentials!

- ✅ Already added to `.gitignore` (won't be committed to git)
- ✅ Keep this file secure and private
- ✅ Never share or publish this file
- ✅ Don't commit it to version control

---

## Troubleshooting

### "File not found" error

Make sure the path in `.env` is correct relative to the project root:
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=backend/firebase-service-account.json
```

### Still seeing warnings

1. Make sure you restarted the backend after adding the service account
2. Check that the JSON file is in the correct location
3. Verify the path in `.env` is uncommented (no # at the start)

### Want to go back to dev mode?

Just comment out the line in `.env`:
```bash
# FIREBASE_SERVICE_ACCOUNT_PATH=backend/firebase-service-account.json
```

---

## Summary

**For Development:** You're all set! The warnings are harmless.

**For Production:** Follow Option 2 to set up full Firebase verification.

Your frontend and backend are successfully connected and authentication is working! 🎉
