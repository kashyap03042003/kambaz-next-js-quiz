# Kambaz (Next.js)

The frontend for **Kambaz**, a Canvas-style learning management system with courses, modules, assignments, people, grades and quizzes. It's built with Next.js 16, React 19, Redux Toolkit and React-Bootstrap. The backend API is [kambaz-node-server-app-quiz](https://github.com/kashyap03042003/kambaz-node-server-app-quiz).

- **Deployed frontend:** https://kambaz-next-js-quiz.vercel.app
- **Deployed API:** https://kambaz-node-server-app-quiz-7l9y.onrender.com

## Features

- **Account:** sign in, sign up and profile. Admins also get a **Users** page for managing users.
- **Dashboard:** your enrolled courses. Faculty can add, edit and delete courses. Anyone can switch to the **Enrollments** view to enroll in or drop courses.
- **Course pages:** Home, Modules, Assignments, Quizzes, People, Grades, Piazza and Zoom.
- **Quizzes:** faculty create, edit and preview quizzes. Students take them and see their scores.

### Roles

| Role | Can do |
|---|---|
| `FACULTY` | Create and edit courses, modules, assignments and quizzes |
| `STUDENT` | View enrolled courses and take quizzes |
| `ADMIN` | Manage users on the Account → Users page |

## Getting started

### 1. Start the backend first

Follow the setup in the [server README](https://github.com/kashyap03042003/kambaz-node-server-app-quiz). By default it runs on `http://localhost:4000`.

### 2. Install and configure

```bash
npm install
```

Create `.env.development` (or `.env.local`):

```env
NEXT_PUBLIC_HTTP_SERVER=http://localhost:4000
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000/Account/Signin.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Project structure

```
app/(Kambaz)/
  Account/        Signin, Signup, Profile, Users (admin)
  Dashboard/      Course cards, add/edit courses, enrollment toggle
  Courses/[cid]/  Home, Modules, Assignments, Quizzes, People, Grades, ...
  Calendar/  Inbox/
  store.ts        Redux store
public/images/    Course card images
```

API calls live in each feature's `client.ts` and use axios with `withCredentials: true`, so the session cookie is sent.

## Deploying to Vercel

1. Import this repo into Vercel.
2. Set `NEXT_PUBLIC_HTTP_SERVER` to the Render API URL, with no trailing slash, then redeploy.
3. On the server's Render service, set `CLIENT_URL` to this Vercel URL so that CORS and cookies work.
