# Subscription Access / 订阅访问

This project supports two access layers:

1. Admin login: protects `/admin`.
2. User access code login: protects the public app pages such as `/`, `/ai`, `/quiz`, and `/report`.

## Supabase Table

Run this migration in Supabase SQL Editor:

```sql
database/migrations/2026_06_28_access_codes.sql
```

The `access_codes` table stores only SHA-256 hashes of access codes. The plain code is shown only once when it is created in Admin.

## Vercel Environment Variables

Required:

```text
ADMIN_PASSWORD=your-admin-password
ADMIN_SESSION_SECRET=long-random-admin-secret
ACCESS_SESSION_SECRET=long-random-user-secret
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Optional simple whole-site password:

```text
USER_ACCESS_PASSWORD=one-shared-user-password
```

For subscription-style access, prefer access codes instead of `USER_ACCESS_PASSWORD`.

## Workflow

1. Admin signs in at `/admin/login`.
2. Open `/admin`, then choose `订阅访问 / Access`.
3. Create an access code:
   - Label: customer or doctor name.
   - Valid days: usually 30.
   - Max logins: optional.
4. Copy the generated code and send it to the subscriber.
5. Subscriber signs in at `/login`.
6. When the code expires or is disabled, app access stops.

## Payment Integration Later

The current version supports manual subscription management. A payment provider can be added later:

- Stripe Checkout: payment success webhook creates or extends an access code.
- WeChat Pay: payment notification creates or extends an access code.
- Supabase Auth: for email/password accounts instead of shared access codes.

For a first online release, manual access codes are simpler and safer.
