# Put OpportunityHub online (one-time, about 15 minutes)

You need three free accounts: **GitHub** (holds the code), **Supabase** (logins + database), **Vercel** (the website).

## 1. Supabase — database and logins

1. Go to supabase.com → sign in with GitHub → **New project**. Name it `opportunityhub`, pick region **Mumbai (ap-south-1)**, set a database password (save it), create.
2. Left menu → **SQL Editor** → **New query**. Open `supabase/setup.sql` from this repo, copy everything, paste it in.
3. On the line marked `>>>`, replace `YOUR-EMAIL@example.com` with **your own email** (the one you'll log in with). That makes you the admin.
4. Click **Run**. You should see "Success. No rows returned".
5. Left menu → **Authentication** → **Sign In / Providers** → **Email**: keep it enabled and turn **Confirm email OFF** → Save.
   (Supabase's built-in mailer only delivers to your own team's addresses, so with confirmation on, your friends would never get the email. With it off, they can log in right after creating an account.)
6. Left menu → **Project Settings** → **API**. Copy the **Project URL** and the **anon public** key.

## 2. Vercel — the website

1. Go to vercel.com → sign in with GitHub → **Add New… → Project** → import the `opportunityhub` repository.
2. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
3. Click **Deploy**. In about a minute you get a link like `https://opportunityhub-xyz.vercel.app`.

## 3. Start using it

1. Open the link, choose **Create account** with the email you put in step 1.3, fill in your profile. You'll see an **Admin** tab.
2. Send the link to your friends. They create an account with their email and password, fill in their profile, and start tracking.
3. The **Admin** tab shows everyone: what they've applied for, their status, exam/interview dates and mock-test averages.

## How the parts fit

- **Friends' data** (profile, applications, mock scores) lives in Supabase. The database itself enforces privacy: each person can only read and change their own rows; only admin emails can read everyone's. Nobody can edit someone else's data, admin included.
- **Openings** live in `public/openings.json` in this repo. A scheduled Claude task scans official sites every morning (6:47 AM IST), updates that file and pushes it; Vercel republishes the site automatically.
- To add another admin, run in Supabase SQL Editor: `insert into admins(email) values ('their@email.com');`

## Later (optional)

- **Password reset emails / phone-number login**: both need an email or SMS provider connected in Supabase (Authentication → Emails → SMTP, or Phone provider such as Twilio, which is paid). The site works without them; until then, if a friend forgets their password, delete their user in Supabase → Authentication → Users and they can sign up again (their old data is removed with it).
- **Own domain**: Vercel → Project → Settings → Domains.
