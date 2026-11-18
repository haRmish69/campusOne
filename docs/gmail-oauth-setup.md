# Gmail OAuth Setup for CampusOne

## Step 1: Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select your existing one)
3. Go to **APIs & Services → Library**
4. Search for **Gmail API** → Click **Enable**

## Step 2: OAuth Consent Screen
1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** → Click Create
3. Fill in the app name (e.g., "CampusOne")
4. Add your email as a test user
5. Save

## Step 3: Create Credentials
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Desktop app**
4. Download the credentials JSON
5. Copy the **Client ID** and **Client Secret** to your `.env.local`:
   ```
   GMAIL_CLIENT_ID="your-client-id-here"
   GMAIL_CLIENT_SECRET="your-client-secret-here"
   ```

## Step 4: Generate Refresh Token
Run the one-time token generator script:
```bash
npx tsx scripts/get-gmail-token.ts
```
1. It will print a URL — open it in your browser
2. Sign in with the Gmail account you want to sync
3. Copy the authorization code
4. Paste it back into the terminal
5. Copy the `GMAIL_REFRESH_TOKEN` it prints and add it to `.env.local`

## Step 5: Verify Connection
Start your dev server and visit:
```
http://localhost:3000/api/email-sync/test
```
You should see `{ "valid": true }`.

## Troubleshooting
- **"REFRESH_TOKEN_EXPIRED"**: Your OAuth consent screen is in "Testing" mode, which expires tokens after 7 days. Re-run `scripts/get-gmail-token.ts` to get a new token.
- **"INVALID_CLIENT"**: Double-check your `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in `.env.local`.
- **"invalid_grant"**: The Google account password may have changed, or access was revoked. Re-run the token generator.

## Environment Variables Summary
```env
GMAIL_CLIENT_ID="your-google-oauth-client-id"
GMAIL_CLIENT_SECRET="your-google-oauth-client-secret"
GMAIL_REFRESH_TOKEN="your-refresh-token-from-oauth-flow"
CRON_SECRET="generate-with: openssl rand -hex 32"
```
