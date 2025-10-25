# Training Module (p.training)

## Overview
Backend module for managing trainings, sessions, and enrollments. This follows the standard MVC triad and response conventions used across the codebase.

## Structure
```
src/p.training/
├── trainingController.ts  # Business logic & request handling
├── trainingModel.ts       # Database operations & queries
└── trainingRoutes.ts      # Route definitions
```

## API Base Path
- Mounted at `/api/training`

## Endpoints (initial scaffold)
- GET `/api/training/records` – List trainings
- GET `/api/training/records/:id` – Get training by ID
- POST `/api/training/records` – Create a new training
- PUT `/api/training/records/:id` – Update a training
- DELETE `/api/training/records/:id` – Delete a training

## Conventions
- All async handlers wrapped with `asyncHandler`
- Standardized response format: `{ status, message, data }`
- Data access via `mysql2/promise` pools from `src/utils/db.ts`

## Notes
- Database tables are assumed under the `applications` schema (e.g., `applications.training`). Adjust `trainingModel.ts` if your schema differs.
- Add authentication/authorization as needed in `app.ts` (e.g., wrap the router with `tokenValidator`).
