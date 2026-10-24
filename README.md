# HireSetu — Recruitment Management System

HireSetu is a full-stack recruitment management application built for a recruitment consultancy. It supports hiring for the consultancy's own team and managing recruitment for its client companies.

The consultancy publishes client job openings on its website, receives candidate applications and manages recruitment progress from application review and shortlisting through to joining. Its own openings are listed separately on the Careers page.

Built with MongoDB, Express, React and Node.js, HireSetu provides a public website, a candidate panel and an admin panel.

**Live Website:** [hiresetu-ar94.onrender.com](https://hiresetu-ar94.onrender.com)

## About the Project

I built HireSetu around the workflow of a recruitment consultancy that hires for both its own organization and other companies.

For client recruitment, the consultancy acts as the recruiter. Its admins publish openings under the hiring company's name, review applications, shortlist candidates and update their progress through the recruitment stages until joining. Candidates can explore these openings, submit resumes and track their application status.

For its own hiring, the consultancy publishes openings through a separate Careers section. Applications from both channels are available in the admin panel, while candidates can track their submissions together in My Applications.

The application is organized into three areas:

- **Public Website:** Client job listings, company career openings and contact enquiries.
- **Candidate Panel:** Profile management, resume submission and application tracking.
- **Admin Panel:** Management of client jobs, internal vacancies, candidate applications, recruitment progress, accounts and enquiries.

Client recruitment is handled by the consultancy's admins; client companies do not need a separate panel in the current workflow.

## Features

### Public Website

- Featured jobs on the home page.
- Job search and filtering.
- Short job summaries and detailed job descriptions.
- A dedicated Careers page for company openings.
- Contact enquiries connected to the admin panel.
- Responsive navigation and layouts.

### Candidate Panel

- Signup, login and logout.
- Email OTP-based password recovery.
- Profile management.
- Resume uploads during application submission.
- Duplicate application prevention for the same opening.
- Application status tracking and history.
- Jobs and Careers applications available in My Applications.

### Admin Panel

- Dashboard with recruitment summaries.
- Separate management screens for jobs and company vacancies.
- Draft, published and closed opening statuses.
- Editing, closing and reopening of openings without deletion.
- Application review and status updates.
- Resume viewing and downloading with original filenames.
- User and admin account management.
- Enquiry management and profile settings.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend - React, Vite, React Router 
| User Interface - Material UI, Bootstrap, CSS, Font Awesome 
| API Requests - Axios 
| Notifications - React Toastify 
| Backend - Node.js, Express 
| Database - MongoDB Atlas, Mongoose 
| Authentication - JWT, HttpOnly cookies, bcrypt 
| Validation - Joi 
| File Uploads and Storage - Multer, Cloudinary 
| Email - Brevo 
| Deployment - Render 
| API Testing - Postman 

## Application Workflow

1. An admin creates and publishes an opening.
2. A candidate views the details and signs in to apply.
3. The candidate submits an application with a resume.
4. The backend validates the submission and stores the application.
5. An admin reviews the application and updates its status.
6. The candidate follows the progress in My Applications.

Admins manage client jobs and company vacancies separately. Candidates see the relevant company and position details without internal recruitment labels.

Openings are closed manually, so an application deadline is not required.

## Authentication and Validation

Authentication uses JWTs with a seven-day expiry, stored in HttpOnly cookies.

Backend controls include:

- Role-based authorization for protected endpoints.
- Ownership checks for candidate records.
- Password hashing with bcrypt.
- Unique email and phone constraints.
- Server-side request validation.
- Rate limiting on authentication endpoints.
- Origin checks for state-changing API requests.
- Upload restrictions and authorized access to resumes.

Password recovery uses a six-digit email OTP with a ten-minute validity, a sixty-second resend cooldown and limits on requests and incorrect verification attempts.

## Project Structure

```text
Recruitment_Management_System/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   └── email.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── applicationController.js
│   │   ├── authController.js
│   │   ├── contactController.js
│   │   ├── jobController.js
│   │   ├── passwordResetController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── rateLimiter.js
│   │   ├── roleMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── validateMiddleware.js
│   ├── models/
│   │   ├── Application.js
│   │   ├── Contact.js
│   │   ├── Job.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── applicationRoutes.js
│   │   ├── authRoutes.js
│   │   ├── contactRoutes.js
│   │   ├── jobRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   ├── ExpressError.js
│   │   ├── fileStorage.js
│   │   └── generateToken.js
│   ├── validations/
│   │   └── schema.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   │   └── images/
│   │       ├── about-banner.jpg
│   │       ├── about-team.avif
│   │       ├── company_logo.svg
│   │       ├── default-avatar.svg
│   │       ├── hero-1.avif
│   │       ├── hero-2.avif
│   │       ├── hero-3.avif
│   │       ├── hero-4.avif
│   │       └── HireSetu_favIcon.svg
│   ├── src/
│   │   ├── admin/
│   │   │   ├── AdminProfile.jsx
│   │   │   ├── Applications.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ManageAdmins.jsx
│   │   │   ├── ManageEnquiries.jsx
│   │   │   ├── ManageJobs.jsx
│   │   │   ├── ManageUsers.jsx
│   │   │   └── ManageVacancies.jsx
│   │   ├── auth/
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── components/
│   │   │   ├── JobSearchBar.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── PanelHeader.jsx
│   │   │   ├── PanelSidebar.jsx
│   │   │   ├── WebsiteFooter.jsx
│   │   │   └── WebsiteNavbar.jsx
│   │   ├── config/
│   │   │   └── panelConfig.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── css/
│   │   │   ├── global.css
│   │   │   ├── panel.css
│   │   │   └── website.css
│   │   ├── layouts/
│   │   │   ├── PanelLayout.jsx
│   │   │   └── WebsiteLayout.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── user/
│   │   │   ├── ApplicationStatus.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MyApplications.jsx
│   │   │   └── Profile.jsx
│   │   ├── utils/
│   │   │   ├── dataFormat.js
│   │   │   └── fileAccess.js
│   │   ├── website/
│   │   │   ├── Home/
│   │   │   │   ├── AboutSection.jsx
│   │   │   │   ├── FeaturedJobs.jsx
│   │   │   │   ├── Hero.jsx
│   │   │   │   └── HomePage.jsx
│   │   │   ├── Jobs/
│   │   │   │   ├── JobApply.jsx
│   │   │   │   ├── JobDetails.jsx
│   │   │   │   └── Jobs.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Careers.jsx
│   │   │   └── Contact.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
└── README.md
```

Local environment files, installed dependencies and generated build files are omitted from this overview.

## Local Setup

### Prerequisites

- Node.js and npm
- MongoDB Atlas database
- Cloudinary account
- Brevo account with a verified sender

The application was tested and deployed with Node.js `24.22.0`.

### 1. Clone the Repository

```bash
git clone https://github.com/krushna706/Recruitment_Management_System.git
cd Recruitment_Management_System
```

### 2. Install Dependencies

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

### 3. Configure Environment Variables

Create `backend/.env`:

```env
NODE_ENV=development
PORT=8080
CLIENT_ORIGIN=http://localhost:5173

DB_URI=your_mongodb_connection_string
JWT_SECRET=your_generated_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=HireSetu

COMPANY_NAME=HireSetu
TRUST_PROXY_HOPS=0
SERVE_FRONTEND=false
```

Generate a JWT secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

Replace the placeholders with your own credentials. Keep `.env` files out of version control and allow your backend's connection IP in MongoDB Atlas.

### 4. Start the Backend

```bash
npm run dev --prefix backend
```

### 5. Start the Frontend

Run this command in a separate terminal:

```bash
npm run dev --prefix frontend
```

Open the URL shown by Vite. It should match the backend's `CLIENT_ORIGIN` setting.

The backend health endpoint is available at:

```text
http://localhost:8080/api/health
```

Public signup creates a candidate account. Access to the admin panel requires an existing admin account.

## Deployment

The frontend and backend run on a single Render Web Service. Express serves the frontend production build and the API under the same domain.

- **MongoDB Atlas** stores application data.
- **Cloudinary** stores uploaded files.
- **Brevo** sends password recovery emails.
- **Render environment variables** store deployment configuration and credentials.

### Build Command

```bash
npm ci --prefix backend && npm ci --prefix frontend --include=dev && npm run build --prefix frontend
```

### Start Command

```bash
npm start --prefix backend
```

### Production Settings

Alongside the database and service credentials, the current deployment uses:

```env
NODE_ENV=production
NODE_VERSION=24.22.0
VITE_API_URL=/api
SERVE_FRONTEND=true
CLIENT_ORIGIN=https://hiresetu-ar94.onrender.com
TRUST_PROXY_HOPS=3
```

Use your own service URL for `CLIENT_ORIGIN`. Render provides the server port through `PORT`.

The proxy hop count was checked for this deployment and should be verified again if the hosting or proxy setup changes.

The demo runs on a free Render instance, so the first visit after inactivity may take longer to load.


## Author

**Krushna Chandra Mohanty**

[GitHub](https://github.com/krushna706)