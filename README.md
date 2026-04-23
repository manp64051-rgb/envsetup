# EnvGen CLI

Smart full-stack environment generator for backend + frontend projects.

---

## Features

- Auto-detect backend and frontend folders
- Generates backend .env
- Generates frontend .env
- Creates API client automatically
- Supports Docker, Local, Custom modes
- JWT secret auto-generation
- Reset command
- Preview output option

---

## Installation (dev)

npm install
node index.js init

---

## Global usage (optional)

npm link
envgen init

---

## Commands

envgen init     → setup full project
envgen reset    → delete env files
envgen docker   → force docker config

---

## Example

envgen init

It will:
- Detect backend folder
- Detect frontend folder
- Ask config if needed
- Generate .env files
- Create API client
- Print preview (optional)

---

## Backend .env example

PORT=5000
DB_URL=mongodb://localhost:27017/app
API_URL=http://localhost:5000
JWT_SECRET=auto-generated
JWT_EXPIRES_IN=1h
NODE_ENV=development

---

## Frontend .env example

VITE_API_URL=http://localhost:5000

---

## Notes

- Never commit .env files
- Keep JWT_SECRET private
- Docker uses service names (backend, mongo)
- Local uses localhost

---

## Supported frontend

- React
- Vite
- Next.js

---

## Why this tool exists

To eliminate manual setup of:
- env files
- API URLs
- backend/frontend connection
- docker vs local mismatch

---

## License

MIT
