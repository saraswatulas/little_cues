# Little Cues

Little Cues is a deterministic Next.js PWA for infant care tracking. It uses:

- DOB -> current date -> day number -> age-specific rule selection
- Parent-friendly Markdown responses
- A structured `SYSTEM/UX PAYLOAD` JSON object for UI, DB, and logic state
- Mandatory health guardrails and doctor-call checklists
- External ChatGPT, Claude, and Gemini links for optional copy/paste summaries only

The first version is local-first with `localStorage`, but the data model is shaped for Supabase PostgreSQL and future multi-baby support.

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Free-Tier Deployment Path

- Frontend: Next.js PWA on Vercel or Netlify
- Database: Supabase Free Tier PostgreSQL
- Backend: Supabase Edge Functions or Vercel Serverless Functions
- Scheduled reminders: GitHub Actions, Supabase scheduled functions, or Upstash free cron
- Auth: Supabase Auth

## Clinical Source Baseline

The app links parents to:

- AAP safe sleep guidance through HealthyChildren.org
- CDC childhood immunization schedule
- CDC developmental milestones
- Seattle Children's fever guidance

Health content is supportive and educational only. It is not medical advice.

## Project Shape

- `app/page.tsx`: PWA interface and local persistence orchestration
- `lib/age.ts`: deterministic age calculation
- `lib/rules.ts`: rule engine, triage, response contract, and source links
- `lib/storage.ts`: local-first persistence
- `lib/types.ts`: shared app types
- `docs/supabase-schema.sql`: scalable PostgreSQL schema

## Future-Ready Notes

- Add Supabase Auth before syncing real family data.
- Move rule execution into a server function once multiple caregivers/devices are supported.
- Add row-level security policies before production.
- Keep all health responses deterministic unless a clinician-reviewed content source is added.
