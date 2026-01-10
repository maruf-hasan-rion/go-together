# Go Together – Backend

Backend service for the **Go Together** event management platform.  
Handles authentication, events, bookings, file uploads, and validations.

---

## 🚀 Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod (validation)
- Multer (file upload)
- JWT Authentication

---

## ✨ Features

- Role-based access (USER / HOST / ADMIN)
- Event CRUD
- Event image upload
- Booking management
- Secure validation with Zod
- Prisma database modeling

---

## 📦 Requirements

- Node.js >= 18
- PostgreSQL
- pnpm / npm / yarn

---

## ⚙️ Setup

### 1️⃣ Install dependencies

```bash
pnpm install
```

### 2️⃣ Environment variables

Create .env:

```bash
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/go_together"
JWT_SECRET="your_jwt_secret"
```

### 3️⃣ Prisma setup

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

### 4️⃣ Run server

```bash
pnpm dev
```

#### Backend runs on:

http://localhost:5000

### 🗂️ Project Structure

```bash
src/
 ├─ app/modules/        # Feature modules (event, booking, auth)
 ├─ middlewares/        # Auth, validation, multer
 ├─ prisma/             # Prisma schema
 ├─ utils/              # Helpers (sendResponse, asyncHandler)
 ├─ config/             # Environment config
```

### 📡 API Routes (Main)

#### Event

- GET /event
- GET /event/:id
- GET /event/my-hosted-events
- POST /event/create-event

-PATCH /event/:id

-DELETE /event/:id

#### Booking

-POST /booking/join
-GET /booking/my-bookings

#### 🖼️ File Upload

- Uses multer

- Accepts FormData

- Fields:

  - data → JSON string
  - file / image → image file

### 🏗️ Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm prisma studio
```

### 🧑‍💻 Author

Go Together Team
