# Subscription Access / 订阅访问

This project supports two access layers:

1. Admin login: protects `/admin`.
2. User username + password/access-code login: protects the public app pages such as `/`, `/ai`, `/quiz`, and `/report`.

## Supabase Table

Run this migration in Supabase SQL Editor:

```sql
database/migrations/2026_06_28_subscription_accounts.sql
```

The `subscription_accounts` table stores only SHA-256 hashes of `username:password`. The plain password/access-code is shown only once when it is created in Admin.

## Vercel Environment Variables

Required:

```text
ADMIN_PASSWORD=your-admin-password
ADMIN_USERNAME=admin
ADMIN_SESSION_SECRET=long-random-admin-secret
ADMIN_DELETE_PASSWORD=optional-delete-password
ACCESS_SESSION_SECRET=long-random-user-secret
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Workflow

1. Admin signs in at `/admin/login`.
2. Open `/admin`, then choose `订阅访问 / Access`.
3. Create a subscription account:
   - Username: customer login name.
   - Label: customer or doctor display name.
   - Valid days: usually 30.
   - Max logins: optional.
4. Copy the generated password/access-code and send it to the subscriber.
5. Subscriber signs in at `/login` with username + password/access-code.
6. When the account expires or is disabled, app access stops.

## Payment Integration Later

The current version supports manual subscription management. A payment provider can be added later:

- Stripe Checkout: payment success webhook creates or extends a subscription account.
- WeChat Pay: payment notification creates or extends a subscription account.
- Supabase Auth: for email/password accounts instead of shared access codes.

For a first online release, manual access codes are simpler and safer.
