# Domain Setup Guide for doyouevenstudybro.com

## Option 1: Add A Records (Recommended - Easier)

1. Go to GoDaddy: https://dcc.godaddy.com/manage/doyouevenstudybro.com/dns
2. Add these DNS records:

   **For root domain (doyouevenstudybro.com):**
   - Type: A
   - Name: @ (or leave blank)
   - Value: 76.76.21.21
   - TTL: 600 (or default)

   **For www subdomain (www.doyouevenstudybro.com):**
   - Type: A
   - Name: www
   - Value: 76.76.21.21
   - TTL: 600 (or default)

3. Save and wait 5-10 minutes for DNS to propagate

## Option 2: Change Nameservers (Alternative)

1. Go to GoDaddy: https://dcc.godaddy.com/manage/doyouevenstudybro.com/dns
2. Change nameservers to:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
3. Wait 24-48 hours for full propagation

## After DNS is configured:

1. Update Google OAuth redirect URI to:
   - https://doyouevenstudybro.com/api/auth/google/callback
   - https://www.doyouevenstudybro.com/api/auth/google/callback

2. Update Heroku config with new domain

3. Vercel will automatically verify and activate the domain
