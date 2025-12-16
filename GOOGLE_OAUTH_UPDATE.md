# Update Google OAuth Redirect URIs

## Steps:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add these TWO URLs:
   - https://doyouevenstudybro.com/api/auth/google/callback
   - https://www.doyouevenstudybro.com/api/auth/google/callback
4. You can REMOVE the old Vercel URLs (the ones with "frontend-xxx-vercel.app")
5. Click "SAVE"

## Why both?
- Some users might visit www.doyouevenstudybro.com
- Some might visit doyouevenstudybro.com (without www)
- We need both to work for OAuth

After updating, signup/login will work with your custom domain!
