# OpportunityHub

A simple tracker for bank, government, teaching, research and corporate openings, built for a group of friends preparing together.

**Friends** log in with email and password and get four screens:
- **Openings** — found daily on official sites, sorted by how well each fits their profile, with a clear eligible / not eligible verdict and the reason.
- **My applications** — To apply → Applied → Exam → Interview → Selected, with dates and notes.
- **Upcoming** — every deadline, exam and interview in the next 60 days.
- **Mock scores** — log scores, see average, best and whether they're improving.

**Admin** (you) gets one more screen showing everyone's applications, statuses, upcoming exams and mock averages.

Setup: see [SETUP.md](SETUP.md).

## Tech
React + Vite (static site on Vercel) · Supabase (email login + Postgres with row-level security) · `public/openings.json` updated by a daily scheduled Claude scan.

Local development:
```
npm install
cp .env.example .env.local   # fill in the two Supabase values
npm run dev
```

Eligibility rules live in `src/lib/eligibility.js` (deterministic: education level and subject, %, B.Ed, TET, qualifying exams, experience, age with stated relaxations). Anything a notification states that the rules can't check is shown as "verify manually", so the verdict is never better than "Potentially eligible" in that case.
