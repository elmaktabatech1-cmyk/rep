# ERP System

Production-ready ERP + CRM + Accounting system built with Node.js, Express, Prisma, MySQL, React, Vite, and TailwindCSS.

The project is prepared for Hostinger hosting environments and avoids native build dependencies by using `bcryptjs` instead of `bcrypt`.

## Project Structure

```text
erp-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── DEPLOYMENT_GUIDE.md
└── README.md
```

## Tech Stack

- Backend: Node.js 18+, Express.js, Prisma ORM, Zod, JWT httpOnly cookies, bcryptjs, Helmet, CORS, rate limiting
- Frontend: React 18, Vite, TailwindCSS, React Router v6, React Query, Zustand
- Database: MySQL 8
- Integrations: Anthropic SDK, Meta WhatsApp Cloud API, WooCommerce webhooks with HMAC-SHA256 verification

## Main Features

- Secure authentication with httpOnly JWT cookies
- RBAC roles: `ADMIN`, `SALES`, `ACCOUNTANT`, `MARKETING`
- Product and inventory management
- Customer CRM with loyalty, tags, opt-ins, and referrals
- Manual and WooCommerce orders
- Stock movement logs with Prisma transactions
- Expenses, suppliers, payment accounts, and financial transactions
- Sales, inventory, and profit/loss reports
- WhatsApp campaign sending and segment resolution
- AI assistant endpoint with audit logging
- Production error handling and PII-masked logs

## Backend Environment Variables

Copy:

```bash
cp backend/.env.example backend/.env
```

Required production values:

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

Generate secure secrets:

```bash
openssl rand -hex 32
openssl rand -hex 16
```

Important for Hostinger shared environments:

```env
DATABASE_URL="mysql://user:pass@localhost/dbname?socket=/var/lib/mysql/mysql.sock"
```

Use the UNIX socket. Do not use TCP port `3306` unless your specific Hostinger Cloud setup gives you a separate managed MySQL host that requires TCP.

## Local Development

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev
```

Backend runs at:

```text
http://localhost:3000/api/v1
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Default seeded users:

```text
admin@example.com / Admin12345!
sales@example.com / Sales12345!
```

Change these passwords immediately in production.

## Build Frontend

```bash
cd frontend
npm install
npm run build
```

The static build is created in:

```text
frontend/dist
```

If the backend is served from a separate API domain, create `frontend/.env.production` before building:

```env
VITE_API_URL="https://api.your-domain.com/api/v1"
```

Then run:

```bash
npm run build
```

## Deploy on Hostinger Cloud as a Node.js Project

Hostinger Cloud can run this as a Node.js application. Use the backend as the Node.js app root, and serve the frontend build as static files.

### 1. Upload Project

Zip the project:

```bash
zip -r erp-system.zip backend frontend DEPLOYMENT_GUIDE.md README.md
```

Upload and extract it on Hostinger Cloud, for example:

```text
~/domains/your-domain.com/erp-system
```

### 2. Configure Node.js App

In Hostinger hPanel, create or configure a Node.js application:

```text
Application root: erp-system/backend
Startup file: src/server.js
Node.js version: 18.x or newer
```

Set environment variables in hPanel or create a production env file according to Hostinger's Node.js app settings.

### 3. Install Backend

SSH into the server:

```bash
cd ~/domains/your-domain.com/erp-system/backend
npm install --omit=dev
npx prisma generate
npx prisma db push
node prisma/seed.js
```

Do not run migrations automatically from `src/server.js`. Database schema changes must be pushed manually:

```bash
npx prisma db push
```

### 4. Start Backend

If hPanel manages the process, restart the Node.js app from hPanel.

If you need to start it manually over SSH:

```bash
cd ~/domains/your-domain.com/erp-system/backend
nohup /opt/alt/alt-nodejs18/root/usr/bin/node src/server.js > server.log 2>&1 &
```

Use the Node.js binary path shown by Hostinger if it differs.

Test:

```bash
curl https://your-domain.com/api/v1/health
```

### 5. Deploy Frontend

Build locally or on the server:

```bash
cd ~/domains/your-domain.com/erp-system/frontend
npm install
npm run build
```

Upload or copy the contents of:

```text
frontend/dist
```

to the public web root or static site directory configured in Hostinger.

For a single-domain setup, the ideal routing is:

```text
https://your-domain.com          -> frontend/dist
https://your-domain.com/api/v1   -> backend Node.js app
```

If using separate subdomains:

```text
https://app.your-domain.com      -> frontend/dist
https://api.your-domain.com      -> backend
```

Set:

```env
FRONTEND_URL="https://app.your-domain.com"
VITE_API_URL="https://api.your-domain.com/api/v1"
```

then rebuild the frontend.

## WooCommerce Webhook

Create a WooCommerce webhook pointing to:

```text
https://your-domain.com/api/v1/webhooks/woocommerce
```

Set the WooCommerce webhook secret to the same value as:

```env
WC_WEBHOOK_SECRET="your-secret"
```

The backend verifies `X-WC-Webhook-Signature` before processing the order.

## Useful Backend Commands

```bash
npm start
npm run dev
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
```

## Production Checklist

- `NODE_ENV=production`
- `DATABASE_URL` points to MySQL correctly
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong and different
- `FRONTEND_URL` matches the deployed frontend
- `npx prisma generate` has been run
- `npx prisma db push` has been run manually
- Seeded default passwords have been changed
- `/api/v1/health` returns `status: ok`
- WooCommerce webhook secret is configured
- WhatsApp credentials are configured before sending campaigns
- Anthropic API key is configured before using AI endpoints

## Security Notes

- Passwords are hashed with `bcryptjs`.
- JWT tokens are stored in httpOnly cookies.
- Stack traces are hidden in production.
- Logs mask emails, phone numbers, and tokens.
- Financial and inventory operations use Prisma transactions.
- Runtime auto-migrations are intentionally disabled.

## More Deployment Details

See:

```text
DEPLOYMENT_GUIDE.md
```

for a step-by-step Hostinger deployment walkthrough.
