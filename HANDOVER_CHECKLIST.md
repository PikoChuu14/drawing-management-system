# Drawing Management System Handover Checklist

Use this checklist when setting up the system on another laptop or on the company server.

## 1. Prepare the Computer or Server

- [ ] Install PHP 8.3 or newer.
- [ ] Install Composer.
- [ ] Install Node.js and npm.
- [ ] Install MySQL or MariaDB for company/server use.
- [ ] Enable required PHP extensions for Laravel, database access, file uploads, and HTTPS requests.
- [ ] Make sure the computer can access the internet for Composer, npm, and Autodesk Platform Services.

## 2. Get the Project Code

- [ ] Copy or clone the project onto the target computer/server.
- [ ] Open a terminal in the project folder.
- [ ] Run:

```bash
composer install
npm install
```

## 3. Create the Environment File

- [ ] Copy `.env.example` to `.env`.
- [ ] Run:

```bash
php artisan key:generate
```

- [ ] Set `APP_NAME` to the system name.
- [ ] Set `APP_ENV=production` on the company server.
- [ ] Set `APP_DEBUG=false` on the company server.
- [ ] Set `APP_URL` to the real URL or server IP.

Example:

```env
APP_NAME="Drawing Management System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-company-domain.example
```

## 4. Configure the Database

- [ ] Create a new database for the system.
- [ ] Create or confirm a database user with permission to use that database.
- [ ] Update these values in `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=drawing_management_system
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
```

- [ ] Run migrations:

```bash
php artisan migrate --force
```

## 5. Create the Autodesk Platform Services Account

Autodesk Platform Services is needed for drawing preview and translation features.

- [ ] Create or use an Autodesk Platform Services account.
- [ ] Create an APS app in the Autodesk developer portal.
- [ ] Copy the APS client ID.
- [ ] Copy the APS client secret.
- [ ] Decide a unique APS bucket name for this project.
- [ ] Update these values in `.env`:

```env
APS_CLIENT_ID=your_aps_client_id
APS_CLIENT_SECRET=your_aps_client_secret
APS_BASE_URL=https://developer.api.autodesk.com
APS_BUCKET=your_unique_bucket_name
APS_REGION=US
```

APS bucket rules:

- [ ] Use a globally unique name.
- [ ] Use lowercase letters, numbers, dashes, or underscores only.
- [ ] Keep the name between 3 and 128 characters.
- [ ] Do not reuse another project environment bucket unless intended.

## 6. Configure Mail

- [ ] Decide whether the company server will send real email.
- [ ] For testing, keep `MAIL_MAILER=log`.
- [ ] For production, update mail settings with the company SMTP details.

```env
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_smtp_username
MAIL_PASSWORD=your_smtp_password
MAIL_FROM_ADDRESS=noreply@your-company-domain.example
MAIL_FROM_NAME="${APP_NAME}"
```

## 7. Configure Storage and Queue

- [ ] Keep `FILESYSTEM_DISK=local` unless the company wants cloud storage.
- [ ] Run this command if uploaded files must be accessible from the browser:

```bash
php artisan storage:link
```

- [ ] Keep `QUEUE_CONNECTION=database` unless a queue service such as Redis is configured.
- [ ] Make sure a queue worker runs for background jobs:

```bash
php artisan queue:work
```

For a production server, configure the queue worker with the server process manager instead of manually keeping the terminal open.

## 8. Build the Frontend

- [ ] Build the frontend assets:

```bash
npm run build
```

- [ ] If testing locally during development, run:

```bash
composer run dev
```

## 9. Optimize the Production Server

- [ ] Clear old cached values after editing `.env`:

```bash
php artisan optimize:clear
```

- [ ] Cache production configuration:

```bash
php artisan optimize
```

## 10. Final Test Checklist

- [ ] Open the system URL in the browser.
- [ ] Confirm the login page loads.
- [ ] Confirm users can log in.
- [ ] Upload a drawing file.
- [ ] Confirm the drawing record is saved in the database.
- [ ] Confirm APS preview or translation works.
- [ ] Confirm uploaded files are still available after refreshing the page.
- [ ] Check `storage/logs/laravel.log` if an error appears.
- [ ] Confirm `APP_DEBUG=false` before letting normal users access the server.

## Important Security Notes

- [ ] Never commit the real `.env` file.
- [ ] Never share the APS client secret in chat, screenshots, or commits.
- [ ] Use different APS buckets for development and production if possible.
- [ ] Use strong database passwords on the company server.
- [ ] Limit server file permissions so only the web server user can write to `storage` and `bootstrap/cache`.
