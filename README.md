# MediBlast — WhatsApp Patient Reminder Broadcaster

A lightweight app to send scheduled WhatsApp reminders to patients about their next checkup.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Go + Fiber |
| Database | PostgreSQL + GORM |
| Scheduler | robfig/cron (v3) |
| WhatsApp | whatsmeow |
| Frontend | React + TypeScript + Vite |
| Backend Deploy | Railway |
| Frontend Deploy | Vercel |

---

## Project Structure

```
whatsapp-broadcast/
├── backend/
│   ├── cmd/main.go                   # Entry point
│   ├── internal/
│   │   ├── handlers/
│   │   │   ├── handlers.go           # HTTP route handlers
│   │   │   └── excel.go              # Excel parser
│   │   ├── models/models.go          # GORM models
│   │   ├── scheduler/scheduler.go    # Cron scheduler
│   │   ├── storage/db.go             # DB connection
│   │   └── whatsapp/client.go        # Whatsmeow wrapper
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── NewBroadcast.tsx
    │   │   ├── History.tsx
    │   │   ├── BroadcastDetail.tsx
    │   │   └── WASetup.tsx
    │   ├── lib/api.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── vercel.json
    └── .env.example
```

---

## Database Schema

### `broadcasts`
| Column | Type | Notes |
|--------|------|-------|
| id | uint PK | |
| name | text | e.g. "June Monthly Reminders" |
| excel_path | text | Server file path |
| excel_name | text | Original filename |
| message_tpl | text | Template with `{{placeholders}}` |
| schedule_type | enum | `once` or `recurring` |
| scheduled_at | timestamp | For one-time sends |
| cron_expr | text | For recurring (e.g. `0 0 8 1 * *`) |
| status | enum | pending / sending / completed / failed / cancelled |
| total_count | int | |
| sent_count | int | |
| failed_count | int | |
| last_sent_at | timestamp | |

### `patients`
| Column | Type |
|--------|------|
| id | uint PK |
| broadcast_id | FK |
| name | text |
| phone | text (with country code) |
| checkup_date | text |
| doctor_name | text |
| clinic_location | text |
| notes | text |

### `message_logs`
| Column | Type |
|--------|------|
| id | uint PK |
| broadcast_id | FK |
| patient_id | FK |
| patient_name | text |
| phone | text |
| status | `sent` / `failed` |
| error | text |
| sent_at | timestamp |

---

## Excel Format

Your Excel file needs at minimum these two columns (English or Indonesian headers both work):

| Patient Name | Phone Number | Next Checkup Date | Doctor Name | Clinic Location | Notes |
|---|---|---|---|---|---|
| Budi Santoso | 6281234567890 | 15 Juli 2025 | dr. Andi | RSUD Fatmawati | |
| Siti Rahayu | 08123456789 | 2025-07-20 | dr. Budi | Klinik Sehat | Post-op |

**Phone number rules:**
- Include country code: `6281234567890` ✅
- Or use local format: `081234567890` → auto-converted to `6281234567890`
- No spaces, dashes, or plus signs needed

**Message placeholders:**
- `{{name}}` → Patient Name
- `{{checkup_date}}` → Next Checkup Date
- `{{doctor}}` → Doctor Name
- `{{clinic}}` → Clinic Location
- `{{notes}}` → Notes

---

## Local Development

### Backend

```bash
cd backend

# Install dependencies
go mod tidy

# Copy and fill env vars
cp .env.example .env

# Create uploads dir
mkdir -p uploads

# Run
go run cmd/main.go
```

> **Note:** whatsmeow uses SQLite for session storage. You need `gcc` installed for CGO.
> On Ubuntu: `sudo apt install gcc libsqlite3-dev`
> On Mac: `brew install gcc`

### Frontend

```bash
cd frontend

# Install
npm install

# Copy env
cp .env.example .env
# Leave VITE_API_URL empty for local dev (Vite proxies /api → localhost:8080)

# Run
npm run dev
```

---

## Deployment

### Backend → Railway

1. Create a Railway project and add a **PostgreSQL** plugin
2. Add a new service from your GitHub repo (point to `/backend`)
3. Railway auto-detects the Dockerfile
4. Set environment variables:
   ```
   DATABASE_URL=<from Railway PostgreSQL plugin>
   ALLOWED_ORIGINS=https://your-app.vercel.app
   WA_DB_PATH=/app/wa_session/wa.db
   ENV=production
   ```
5. Add a **Volume** mounted at `/app/uploads` and `/app/wa_session` to persist files and WA session across deploys

### Frontend → Vercel

1. Import the repo into Vercel, set root to `/frontend`
2. Framework: Vite
3. Environment variable:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```
4. Deploy

---

## Cron Expression Reference

Uses 6-field cron with seconds: `sec min hour day month weekday`

| Expression | Meaning |
|---|---|
| `0 0 8 1 * *` | Every 1st of month at 8:00am |
| `0 0 9 * * 1` | Every Monday at 9:00am |
| `0 0 8 * * *` | Every day at 8:00am |
| `0 0 7 * * 1-5` | Weekdays at 7:00am |
| `0 30 10 15 * *` | 15th of every month at 10:30am |

---

## API Endpoints

```
GET  /api/wa/status              WhatsApp connection status
GET  /api/wa/qr                  Current QR code string
POST /api/wa/logout              Disconnect and reset session

POST /api/broadcasts             Create broadcast (multipart/form-data)
GET  /api/broadcasts             List all broadcasts
GET  /api/broadcasts/:id         Get single broadcast with patients
DELETE /api/broadcasts/:id       Cancel broadcast
GET  /api/broadcasts/:id/logs    Get message send logs
GET  /api/broadcasts/:id/download Download original Excel file
```

---

## Known Limitations & Tips

- **WhatsApp disconnects after ~14 days** of phone inactivity — re-scan QR code
- **Rate limiting:** The scheduler adds a 1.5s delay between messages to avoid WhatsApp bans
- **One WhatsApp account** per server instance (whatsmeow limitation)
- **Railway free tier** may sleep after inactivity — consider upgrading or using an uptime monitor
- **Session persistence:** Make sure the Railway Volume is configured, otherwise the WA session is lost on redeploy

---

## License

MIT
# Nosent
# Nosent
