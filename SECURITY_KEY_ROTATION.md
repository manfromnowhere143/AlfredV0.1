# SECURITY: KEY ROTATION CHECKLIST

**Date**: January 11, 2026
**Status**: CRITICAL - All keys must be rotated immediately
**Reason**: API keys were exposed in git history

---

## EXPOSED KEYS SUMMARY

The following keys were found in git history and must be treated as **COMPROMISED**:

| Service | Key Prefix | Risk Level |
|---------|------------|------------|
| Anthropic | `sk-ant-api03-oY8_...` | CRITICAL |
| OpenAI | `sk-proj-O0Exs98M1t...` | CRITICAL |
| Supabase DB | `LIFEITSBLESSING143@` | CRITICAL |
| ElevenLabs | `sk_f7c4a1...`, `sk_467b73...` | HIGH |
| Stripe (Test) | `sk_test_51RXRsd...` | MEDIUM |
| Vercel | `FHRVsKgtJHoE...` | HIGH |
| RunPod | `rpa_JWSG46W3KX...` | HIGH |
| Replicate | `r8_KNeIe9Dd...`, `r8_91hZ6f...` | HIGH |
| Google OAuth | `GOCSPX-P6sBEH...` | MEDIUM |
| Resend | `re_KiaJKYFV_...` | MEDIUM |
| Voyage | `pa-auy5hkbD1R...` | MEDIUM |
| Stability AI | `sk-yv3QihVHdm...` | MEDIUM |
| InstantID | `SG_cd12764e...` | MEDIUM |
| SadTalker | `yTYzetySoqr...` | MEDIUM |
| Groq | `gsk_7QT2KqTs...` | MEDIUM |
| Browserless | `2TiLKJic0mU...` | LOW |
| Vercel Blob | `vercel_blob_rw_xkm...` | MEDIUM |
| NextAuth Secret | `UzmMiNOhDGq6...` | HIGH |

---

## ROTATION PROCEDURE

### 1. ANTHROPIC (CRITICAL)
**Dashboard**: https://console.anthropic.com/settings/keys

- [ ] Log in to Anthropic Console
- [ ] Go to Settings → API Keys
- [ ] Delete key starting with `sk-ant-api03-oY8_`
- [ ] Create new API key
- [ ] Copy new key to `.env` as `ANTHROPIC_API_KEY`
- [ ] Update Vercel environment variables
- [ ] Test: `curl https://api.anthropic.com/v1/messages -H "x-api-key: NEW_KEY"`

### 2. OPENAI (CRITICAL)
**Dashboard**: https://platform.openai.com/api-keys

- [ ] Log in to OpenAI Platform
- [ ] Go to API Keys
- [ ] Delete key starting with `sk-proj-O0Exs98M1t`
- [ ] Create new secret key
- [ ] Copy to `.env` as `OPENAI_API_KEY`
- [ ] Update Vercel environment variables

### 3. SUPABASE DATABASE (CRITICAL)
**Dashboard**: https://supabase.com/dashboard/project/[PROJECT_ID]/settings/database

- [ ] Log in to Supabase Dashboard
- [ ] Go to Project Settings → Database
- [ ] Reset database password (this will require app restart)
- [ ] Update `DATABASE_URL` in `.env` with new password
- [ ] Update Vercel environment variables
- [ ] **WARNING**: This will disconnect all active sessions

### 4. NEXTAUTH SECRET (HIGH)
**Action**: Generate new secret locally

```bash
openssl rand -base64 32
```

- [ ] Generate new secret using command above
- [ ] Update `NEXTAUTH_SECRET` in `.env`
- [ ] Update Vercel environment variables
- [ ] **NOTE**: This will invalidate all existing sessions

### 5. ELEVENLABS (HIGH)
**Dashboard**: https://elevenlabs.io/app/settings/api-keys

- [ ] Log in to ElevenLabs
- [ ] Go to Profile → API Keys
- [ ] Delete compromised keys
- [ ] Generate new API key
- [ ] Update `ELEVENLABS_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 6. VERCEL (HIGH)
**Dashboard**: https://vercel.com/account/tokens

- [ ] Log in to Vercel
- [ ] Go to Account Settings → Tokens
- [ ] Delete token `FHRVsKgtJHoE...`
- [ ] Create new token with same scopes
- [ ] Update `VERCEL_TOKEN` in `.env`

### 7. RUNPOD (HIGH)
**Dashboard**: https://www.runpod.io/console/user/settings

- [ ] Log in to RunPod Console
- [ ] Go to Settings → API Keys
- [ ] Delete compromised key
- [ ] Create new API key
- [ ] Update `RUNPOD_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 8. REPLICATE (HIGH)
**Dashboard**: https://replicate.com/account/api-tokens

- [ ] Log in to Replicate
- [ ] Go to Account → API Tokens
- [ ] Delete both compromised tokens
- [ ] Create new token
- [ ] Update `REPLICATE_API_TOKEN` in `.env`
- [ ] Update Vercel environment variables

### 9. STRIPE (MEDIUM - Test Keys)
**Dashboard**: https://dashboard.stripe.com/apikeys

- [ ] Log in to Stripe Dashboard
- [ ] Go to Developers → API Keys
- [ ] Roll the test secret key
- [ ] Update `STRIPE_SECRET_KEY` in `.env`
- [ ] Update `STRIPE_PUBLISHABLE_KEY` if needed
- [ ] Update Vercel environment variables
- [ ] **NOTE**: These are test keys; production keys need separate rotation

### 10. GOOGLE OAUTH (MEDIUM)
**Dashboard**: https://console.cloud.google.com/apis/credentials

- [ ] Log in to Google Cloud Console
- [ ] Go to APIs & Services → Credentials
- [ ] Find OAuth 2.0 Client ID for Alfred
- [ ] Create new client secret (or regenerate)
- [ ] Update `GOOGLE_CLIENT_SECRET` in `.env`
- [ ] Update Vercel environment variables

### 11. RESEND (MEDIUM)
**Dashboard**: https://resend.com/api-keys

- [ ] Log in to Resend
- [ ] Go to API Keys
- [ ] Delete compromised key
- [ ] Create new API key
- [ ] Update `RESEND_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 12. VOYAGE AI (MEDIUM)
**Dashboard**: https://dash.voyageai.com/api-keys

- [ ] Log in to Voyage AI
- [ ] Go to API Keys
- [ ] Delete compromised key
- [ ] Create new API key
- [ ] Update `VOYAGE_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 13. STABILITY AI (MEDIUM)
**Dashboard**: https://platform.stability.ai/account/keys

- [ ] Log in to Stability AI
- [ ] Go to Account → API Keys
- [ ] Delete compromised key
- [ ] Create new API key
- [ ] Update `STABILITY_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 14. GROQ (MEDIUM)
**Dashboard**: https://console.groq.com/keys

- [ ] Log in to Groq Console
- [ ] Go to API Keys
- [ ] Delete compromised key
- [ ] Create new API key
- [ ] Update `GROQ_API_KEY` in `.env`
- [ ] Update Vercel environment variables

### 15. VERCEL BLOB (MEDIUM)
**Dashboard**: https://vercel.com/dashboard/stores

- [ ] Log in to Vercel
- [ ] Go to Storage → Blob Stores
- [ ] Regenerate read-write token
- [ ] Update `BLOB_READ_WRITE_TOKEN` in `.env`
- [ ] Update Vercel environment variables

### 16. INSTANTID / SADTALKER / BROWSERLESS (LOW-MEDIUM)

These may be third-party or self-hosted services:

- [ ] InstantID: Check provider dashboard, rotate if applicable
- [ ] SadTalker: Check provider dashboard, rotate if applicable
- [ ] Browserless: https://www.browserless.io/dashboard → API Keys

---

## POST-ROTATION VERIFICATION

After rotating all keys, verify the application works:

```bash
# 1. Test build
pnpm build

# 2. Test database connection
pnpm db:studio

# 3. Test locally
pnpm dev

# 4. Test core functionality:
#    - [ ] Can log in (NextAuth + Google)
#    - [ ] Can chat (Anthropic API)
#    - [ ] Can upload files (Vercel Blob)
#    - [ ] Can create persona (ElevenLabs + Replicate)
#    - [ ] Can generate video (RunPod)
```

---

## VERCEL ENVIRONMENT VARIABLES

After local testing, update Vercel:

1. Go to https://vercel.com/[team]/alfred/settings/environment-variables
2. Update each variable with new keys
3. Redeploy: `vercel --prod`

---

## MONITORING

After rotation, monitor for:

1. **Anthropic Usage**: Check console for unexpected usage
2. **OpenAI Usage**: Check billing dashboard
3. **Stripe Events**: Check for unauthorized API calls
4. **Database**: Check for unauthorized connections
5. **Vercel Logs**: Monitor for 401/403 errors from old keys

---

## PREVENTION

To prevent future exposure:

1. **NEVER** commit `.env` files
2. Use Vercel's encrypted environment variables
3. Consider using a secrets manager (HashiCorp Vault, AWS Secrets Manager)
4. Add pre-commit hooks to detect secrets:
   ```bash
   # Install gitleaks
   brew install gitleaks

   # Add pre-commit hook
   echo 'gitleaks protect --staged' > .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

---

## TIMELINE

| Priority | Keys | Deadline |
|----------|------|----------|
| CRITICAL | Anthropic, OpenAI, Supabase | Immediately |
| HIGH | NextAuth, ElevenLabs, Vercel, RunPod, Replicate | Within 1 hour |
| MEDIUM | Stripe, Google, Resend, Voyage, Stability, Groq, Blob | Within 4 hours |
| LOW | Browserless, InstantID, SadTalker | Within 24 hours |

---

**Signed**: Security Containment Protocol
**Status**: Execute immediately
