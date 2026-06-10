# 🐾 PetPal — Pet Care Companion

PetPal is an all-in-one pet care companion that lets pet owners manage their
pets' health and daily care from a single mobile app. It includes a vaccination
schedule, medication/parasite tracking, a weight & growth chart, vet appointments,
and a daily care journal, and shows in-app reminders for anything that is upcoming
or overdue.

This project was built on the **Full-Code Development Track**: it includes a real
backend (REST API), a database layer, and a mobile-first frontend.

## Business Idea

Pet owners usually keep vaccination, medication, appointment and weight information
scattered across notes, calendars and paper, and end up missing important dates.
PetPal centralizes this information and protects the pet's health with automatic
reminders like "vaccine is due", "parasite medication is overdue", and "appointment
coming up". Target audience: owners of cats, dogs and other pets.

## Features

- **Sign up / log in** — passwords hashed with `bcrypt`, sessions managed with `JWT`.
- **Multiple pet profiles** — emoji avatar, species, breed, gender, birth date (auto age), vet info.
- **Health & vaccination schedule** — vaccine history + next-due reminder.
- **Medication & parasite tracking** — dose, frequency and next due date.
- **Weight & growth chart** — weight log over time, Chart.js line chart.
- **Vet appointments** — add appointments, upcoming reminders.
- **Daily care journal** — feeding, water, walk, play, grooming records.
- **Smart notifications** — upcoming/overdue vaccines + medications + appointments in one list.
- **Dashboard** — summary of pets, vaccines, appointments and today's logs.

## Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Backend     | Node.js + Express                         |
| Database    | SQLite (Node built-in `node:sqlite`)      |
| Auth        | bcryptjs (passwords), JWT (sessions)      |
| Frontend    | React 18 + Chart.js (single file, no build)|
| Design      | Responsive web app — sidebar nav on desktop, bottom tab nav on mobile |

## Architecture

```
Browser (React mobile SPA)  ── fetch /api/... (JWT) ──▶  Express REST API
                                                              │
                                                              ▼
                                          SQLite (users, pets, vaccinations,
                                          medications, weights, appointments, activities)
```

Express serves both the `/api/*` REST endpoints and the static `frontend/` folder.

### Data model

- **users** (id, name, email, password)
- **pets** (id, user_id→users, name, species, breed, gender, avatar, weight, birthdate, vet_name, vet_phone)
- **vaccinations** (id, pet_id→pets, name, date_given, next_due, notes)
- **medications** (id, pet_id→pets, name, dose, frequency, next_due, notes)
- **weights** (id, pet_id→pets, weight, date)
- **appointments** (id, pet_id→pets, title, vet_name, location, datetime, notes)
- **activities** (id, pet_id→pets, type, note, at)

All child tables use `ON DELETE CASCADE`: deleting a pet removes all of its records.

## Setup

Requires **Node.js 22.5 or newer** (for built-in SQLite). Check with `node -v`.

```bash
cd backend
npm install
npm start
```

Open **http://localhost:4000** in your browser. On desktop it shows a full-width web
layout with a left sidebar; on smaller screens it adapts to a bottom tab bar.

> To change the database location: `DB_PATH=/path/petpal.db npm start`

## Main API Endpoints

| Method | Path                              | Description                   |
|--------|-----------------------------------|-------------------------------|
| POST   | `/api/register` · `/api/login`    | Sign up / log in              |
| GET POST | `/api/pets`                     | List / add pets               |
| PUT DELETE | `/api/pets/:id`               | Update / delete pet           |
| GET POST | `/api/pets/:id/vaccinations`    | Vaccinations                  |
| GET POST | `/api/pets/:id/medications`     | Medications                   |
| GET POST | `/api/pets/:id/weights`         | Weight records                |
| GET POST | `/api/pets/:id/appointments`    | Appointments                  |
| GET POST | `/api/pets/:id/activities`      | Daily care                    |
| GET    | `/api/notifications`              | Unified reminders             |
| GET    | `/api/summary`                    | Dashboard summary             |

Endpoints requiring auth use header: `Authorization: Bearer <token>`

## Project Structure

```
pet-care-tracker/
├── backend/
│   ├── server.js     # REST API + application logic
│   ├── db.js         # SQLite schema (data layer)
│   ├── auth.js       # JWT generation + verification
│   └── package.json
├── frontend/
│   ├── index.html    # mobile shell + styles
│   └── app.js        # React app (all screens)
├── .gitignore
└── README.md
```
