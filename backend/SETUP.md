# Laravel API — setup notes

Backend will be a persistent Laravel service on Railway. Do not deploy Laravel as a Vercel serverless function for this project because the app needs persistent workers and Laravel Reverb WebSockets.

## Create Laravel project
Run from GitHub Codespaces or another environment with PHP, Composer, and required PHP extensions:
```bash
composer create-project laravel/laravel .
composer require mongodb/laravel-mongodb
composer require laravel/reverb
php artisan install:api
php artisan install:broadcasting
```
Check the current compatibility matrix for the Laravel version and `mongodb/laravel-mongodb` before deployment. Ensure the PHP MongoDB extension is installed in the runtime image.

## Environment variables (Railway)
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR-RAILWAY-DOMAIN
DB_CONNECTION=mongodb
DB_URI=mongodb+srv://...
DB_DATABASE=stopmeter
BROADCAST_CONNECTION=reverb
```
Keep secrets only in Railway variables. Never expose MongoDB credentials to React/Vercel.

## Initial domain collections
- `users`: name, username/email, password_hash, role, outlet_ids, is_active
- `outlets`: name, code, address, status, created_by, timestamps
- `outlet_meter_states`: outlet_id, r_current, m_current, version, last_stopmeter_id, updated_at
- `stopmeters`: outlet_id, shift_id, date, meter readings, transaction records, status, created_by, finalized_at
- `customers`: name, phone (if needed), status
- `customer_transactions`: customer_id, outlet_id, stopmeter_id, created_at
- `inch_types`: label, direction (in/out), is_active, created_by
- `activities`: actor_id, action, entity_type, entity_id, before, after, created_at

## Security rules
1. Server calculates all meter and net sales values. Never trust totals submitted by React.
2. Enforce role and outlet scope in Laravel policies/middleware.
3. Hash passwords; rate-limit login; use secure HttpOnly cookies or properly configured token auth.
4. Audit all privileged changes.
5. Finalized Stopmeters are immutable; use a correction/adjustment record.
6. Only finalization/closing commits ending R/M readings as the next shift's initial readings. Printing a preview must not advance meter state.
7. Use atomic/transactional update or optimistic version checks for meter carry-forward to prevent concurrent finalization conflicts.
8. Disabling/deleting an outlet must preserve historical records.
