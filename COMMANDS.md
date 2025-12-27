# Alfred Commands Cheatsheet

## 🚀 Start Alfred

```bash
# Quick start (ensures DB is running)
~/scripts/start_alfred.sh

# Manual start with ngrok (for mobile testing)
NEXTAUTH_URL=https://YOUR-NGROK-URL.ngrok-free.app pnpm --filter web dev

# Start on specific port
pnpm --filter web dev --port 3005
```

## 🌐 Ngrok (Mobile Testing)

```bash
# Start ngrok tunnel (run in separate terminal)
ngrok http 3005

# Get current ngrok URL
curl -s localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"'
```

## 🗄️ Database Commands

```bash
# Connect to database
psql alfred

# Quick queries
psql alfred -c "SELECT * FROM users;"
psql alfred -c "SELECT id, title, email FROM conversations c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT 10;"
psql alfred -c "SELECT id, role, substring(content, 1, 100) FROM messages ORDER BY created_at DESC LIMIT 5;"

# Check conversation count per user
psql alfred -c "SELECT u.email, COUNT(c.id) as convs FROM users u LEFT JOIN conversations c ON u.id = c.user_id GROUP BY u.email;"

# Check message count
psql alfred -c "SELECT COUNT(*) FROM messages;"
```

## 💾 Backup & Restore

```bash
# Manual backup
pg_dump alfred > ~/Desktop/alfred_backup_$(date +%Y%m%d_%H%M%S).sql

# Run scheduled backup script
~/scripts/alfred_backup.sh

# List backups
ls -la ~/AlfredBackups/

# View backup log
cat ~/AlfredBackups/backup.log

# Restore from backup (USE WITH CAUTION)
psql alfred < ~/AlfredBackups/alfred_XXXXXX.sql
```

## 🔧 PostgreSQL Management

```bash
# Check status
brew services list | grep postgres

# Start PostgreSQL
brew services start postgresql@14

# Stop PostgreSQL
brew services stop postgresql@14

# Restart PostgreSQL
brew services restart postgresql@14
```

## 🛠️ Development

```bash
# Kill port 3005 if stuck
lsof -ti:3005 | xargs kill -9

# Clear Next.js cache
rm -rf apps/web/.next

# Full restart (clear cache + restart)
lsof -ti:3005 | xargs kill -9 && rm -rf apps/web/.next && pnpm --filter web dev

# Build core package (after DNA changes)
cd packages/core && pnpm build && cd ../..

# Run Drizzle Studio (DB GUI)
pnpm --filter @alfred/database db:studio
```

## 📦 Git Commands

```bash
# Check status
git status

# Add and commit
git add -A && git commit -m "your message" && git push

# Revert all uncommitted changes
git checkout -- .

# Revert specific file
git checkout HEAD -- path/to/file

# View recent commits
git log --oneline -10
```

## 🔍 Debug Commands

```bash
# Check auth route
cat apps/web/src/app/api/auth/[...nextauth]/route.ts

# Check chat route
cat apps/web/src/app/api/chat/route.ts

# Check database schema
cat packages/database/src/schema.ts

# Grep for specific code
grep -r "searchTerm" apps/web/src --include="*.ts"

# Check env variables
cat apps/web/.env.local | grep -E "NEXTAUTH|DATABASE"
```

## 📱 Testing Checklist

1. Start ngrok: `ngrok http 3005`
2. Start server: `NEXTAUTH_URL=https://xxx.ngrok-free.app pnpm --filter web dev`
3. Open URL on mobile
4. Sign in with email
5. Send message
6. Check terminal for `[Alfred] ✅` logs
7. Refresh page - conversation should persist
8. Click old conversation - should load with Preview buttons

## 🚨 Common Fixes

```bash
# Port already in use
lsof -ti:3005 | xargs kill -9

# Database connection failed
brew services restart postgresql@14

# Session not working (shows anonymous)
# Make sure NEXTAUTH_URL matches your actual URL

# Code not rendering with Preview
# Check that messages have ```jsx code fences, not <boltArtifact> tags

# Changes not taking effect
rm -rf apps/web/.next && pnpm --filter web dev
```

## 📁 Important File Locations

```
~/AlfredV0.1/                          # Project root
├── apps/web/                          # Next.js app
│   ├── src/app/api/chat/route.ts      # Chat API
│   ├── src/app/api/auth/[...nextauth]/route.ts  # Auth
│   ├── src/app/page.tsx               # Main page
│   └── src/components/Message.tsx     # Message rendering
├── packages/core/src/dna/             # Alfred personality
│   ├── identity.ts                    # Who Alfred is
│   ├── voice.ts                       # How Alfred speaks
│   └── promptBuilder.ts               # System prompt
└── packages/database/src/schema.ts    # DB schema

~/scripts/                             # Utility scripts
├── alfred_backup.sh                   # Backup script
└── start_alfred.sh                    # Start script

~/AlfredBackups/                       # Database backups
~/Library/LaunchAgents/com.alfred.backup.plist  # Auto-backup config
```