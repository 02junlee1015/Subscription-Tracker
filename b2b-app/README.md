## B2B Parts Ordering App (Next.js + Supabase)

Production-grade B2B web app for OEM parts ordering:
- **Guest** users can browse **Brands → Vehicle Models → Parts**, add to a **Cart**, then **Submit & Download Excel**.
- **Admin** user can access `/admin` (basic read-only lists).

Stack:
- Next.js (App Router) + TypeScript + React
- Supabase (Auth + Postgres)
- Excel generation via `exceljs`

### Architecture (high-level)
- **UI (App Router)**: `src/app/*`
- **Supabase clients**: `src/lib/supabase/*`
- **Cart (client-side state)**: `src/lib/cart/*`
- **Excel + order submission**: `src/app/api/orders/submit/route.ts`
- **Database schema/RLS/seed**: `supabase/schema.sql`

### Folder structure (key paths)
- `src/app/page.tsx`: Brands page (home)
- `src/app/brands/[brandId]/page.tsx`: Brand → vehicle models
- `src/app/models/[modelId]/page.tsx`: Vehicle model → parts list
- `src/app/cart/page.tsx`: Cart + submit & Excel download
- `src/app/admin/page.tsx`: Admin page (role gated)
- `src/app/(auth)/login/page.tsx`: Login
- `src/app/(auth)/signup/page.tsx`: Signup
- `middleware.ts`: Route protection + admin redirect

### Setup Supabase (one-time)
1) Create a Supabase project.
2) Supabase Dashboard → **SQL Editor** → run:
   - `supabase/schema.sql`
   - `supabase/access_requests.sql` (adds “request access → admin approve” flow)
3) Supabase Dashboard → **Authentication → Users** → create:
   - `admin@company.com` with a password
4) Supabase Dashboard → **SQL Editor** → promote that user to admin:

```sql
update public.users set role = 'admin' where email = 'admin@company.com';
```

### Configure environment variables
Create `./.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_PUBLIC_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Run locally
```bash
npm install
npm run dev
```

### Deploy to Vercel
1) Import the repo in Vercel (Root Directory: `b2b-app`).
2) Add env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3) Deploy.

### Access request flow (new)
- Users do **not** self-signup anymore.
- Go to `/signup` (Request access) → enter email → admin approves in `/admin`.
- On approval, Supabase sends an **invite email** so the user can set a password and then log in.

### Excel output format
The downloaded `.xlsx` contains exactly these columns:
- `OE Number`
- `Vehicle Model`
- `Part Name`
- `Quantity`
- `Remark`
