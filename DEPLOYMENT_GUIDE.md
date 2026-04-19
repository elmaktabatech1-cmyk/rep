# ERP System Deployment Guide for Hostinger Shared Hosting

This project is designed for Hostinger Shared Hosting with Node.js enabled. It does not require Docker, a VPS, PM2, or runtime database migrations.

## 1. Prepare the Project

From your local machine:

```bash
cd erp-system
zip -r erp-system.zip backend frontend DEPLOYMENT_GUIDE.md
```

Upload `erp-system.zip` using hPanel File Manager or SSH, then extract it in the target hosting directory.

## 2. Create the MySQL Database

In hPanel, create a MySQL 8 database and user. Keep the database name, username, and password ready.

The backend must connect through the Hostinger MySQL UNIX socket:

```env
DATABASE_URL="mysql://DB_USER:DB_PASS@localhost/DB_NAME?socket=/var/lib/mysql/mysql.sock"
```

Do not replace this with TCP port `3306`.

## 3. Configure Backend Environment

In hPanel Node.js environment variables or `backend/.env.production`, set:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://DB_USER:DB_PASS@localhost/DB_NAME?socket=/var/lib/mysql/mysql.sock"
JWT_SECRET="64-char-hex-string"
JWT_REFRESH_SECRET="different-64-char-hex-string"
ENCRYPTION_KEY="32-char-hex-string"
FRONTEND_URL="https://your-domain.com"
WC_WEBHOOK_SECRET=""
ANTHROPIC_API_KEY=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -hex 16
```

## 4. Configure hPanel Node.js

Open hPanel -> Websites -> Manage -> Advanced -> Node.js.

Use:

```text
Application root: erp-system/backend
Startup file: src/server.js
Node.js version: 18.x or newer
Application URL: your backend URL or /api path
```

The backend is an ES Modules app, so `backend/package.json` must keep `"type": "module"`.

## 5. Install Backend Dependencies and Push Schema

SSH into the server:

```bash
cd ~/domains/your-domain.com/public_html/erp-system/backend
npm install --omit=dev
npx prisma generate
npx prisma db push
node prisma/seed.js
```

Important: the server never runs migrations automatically. Schema changes are pushed manually with:

```bash
npx prisma db push
```

## 6. Start Backend

From `backend`:

```bash
nohup /opt/alt/alt-nodejs18/root/usr/bin/node src/server.js > server.log 2>&1 &
```

If Hostinger provides a different Node.js binary path, use the path shown in hPanel.

Test:

```bash
curl https://your-domain.com/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "service": "erp-system-api",
    "status": "ok"
  }
}
```

## 7. Build and Deploy Frontend

From `frontend`:

```bash
npm install
npm run build
```

Upload the generated `frontend/dist` contents to the public static folder for your domain or subdomain.

If the backend API is on a separate subdomain, create `frontend/.env.production` before building:

```env
VITE_API_URL="https://api.your-domain.com/api/v1"
```

Then rebuild:

```bash
npm run build
```

## 8. WooCommerce Webhook

In WooCommerce, create a webhook pointing to:

```text
https://your-domain.com/api/v1/webhooks/woocommerce
```

Use the same secret value as `WC_WEBHOOK_SECRET`. The backend verifies `X-WC-Webhook-Signature` with HMAC-SHA256 before processing orders.

## 9. Default Users

The seed creates:

```text
admin@example.com / Admin12345!
sales@example.com / Sales12345!
```

Change these passwords immediately after first login.

## 10. Operations Checklist

Before production traffic:

- Confirm `/api/v1/health` returns `status: ok`.
- Confirm login works with the seeded admin user.
- Confirm `DATABASE_URL` uses `socket=/var/lib/mysql/mysql.sock`.
- Confirm `JWT_SECRET` and `JWT_REFRESH_SECRET` are different.
- Confirm WooCommerce webhook logs appear under `/api/v1/webhooks/logs`.
- Confirm `server.log` has no Prisma connection errors.

## 11. Updating the App

For backend changes:

```bash
cd backend
npm install --omit=dev
npx prisma generate
npx prisma db push
pkill -f "src/server.js"
nohup /opt/alt/alt-nodejs18/root/usr/bin/node src/server.js > server.log 2>&1 &
```

For frontend changes:

```bash
cd frontend
npm install
npm run build
```

Upload the new `dist` files to the static hosting directory.
