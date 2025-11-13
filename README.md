## My List Service

Backend service powering the “My List” feature for the OTT platform. Built as a production-ready Express + TypeScript application backed by MongoDB, with comprehensive integration tests and data seeding support.

---

### Features
- REST APIs to add, remove, and list personal catalogue items with strong validation and deduplication.
- Cursor-based pagination ensuring sub-10ms response times with proper MongoDB indexes.
- In-memory cache layer ready to be swapped for Redis to keep list fetches hot.
- Fully typed codebase with extensive inline commentary for maintainability.
- Integration test suite using Jest, Supertest, and mongodb-memory-server.
- Seed script for loading demo data during local development.

---

### Prerequisites
- **Node.js 20+**  
  - macOS / Linux: `curl -fsSL https://fnm.vercel.app/install | bash` then `fnm install 20`  
  - Windows: Install **fnm** via [winget](https://github.com/Schniz/fnm#installation) or use the official Node installer.  
  - Alternative: `nvm install 20` (macOS/Linux) or `nvm-windows install 20`.
- **npm** (bundled with Node 20). Yarn or pnpm also work if you adapt commands.
- **MongoDB 6+** (local, Docker, or Atlas). Optionally use `mongodb-memory-server` only for tests.
- **Git** for cloning the repository.

> **Permission note (macOS/Linux):** if your system previously ran npm with `sudo`, fix cache permissions once:  
> `sudo chown -R $(whoami) $(npm config get cache)`

---

### Quick Start (Any OS)
```bash
git clone https://github.com/<your-org>/assignment-list-features.git
cd assignment-list-features

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Update .env as needed, then run the dev server
npm run dev
```

The API becomes available at `http://localhost:8080/api/v1`.

---

### Environment Configuration
Edit `.env` to match your environment:

| Variable | Description | Default (if omitted) |
|----------|-------------|----------------------|
| `MONGODB_URI` | Connection string for MongoDB | `mongodb://localhost:27017/my_list_service` |
| `PORT` | HTTP port for the server | `8080` |
| `REQUEST_LOG_LEVEL` | `silent`, `info`, or `debug` | `info` |
| `CACHE_TTL_SECONDS` | Cache entry lifetime | `30` |
| `CACHE_MAX_ITEMS` | Max entries in cache | `10000` |

---

### Running MongoDB
- **Local install:** follow [MongoDB Community installation](https://www.mongodb.com/docs/manual/installation/).
- **Docker (recommended for parity):**
  ```bash
  docker run --name my-list-mongo \
    -p 27017:27017 \
    -e MONGO_INITDB_DATABASE=my_list_service \
    -d mongo:7
  ```
  Update `.env` to `MONGODB_URI=mongodb://localhost:27017/my_list_service`.
- **MongoDB Atlas:** create a free cluster and copy the connection URI into `.env`.

---

### Development Workflow
- **Start dev server with live reload:**
  ```bash
  npm run dev
  ```
- **Lint and format check:**
  ```bash
  npm run lint
  ```
- **Run integration test suite:**
  ```bash
  npm test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

---

### Seeding Sample Data
Populate baseline users, movies, shows, and list entries:
```bash
npm run seed
```
The script uses your `.env` connection and is safe to rerun—it wipes and recreates sample data.

---

### Production Build & Deployment
1. **Compile TypeScript:** `npm run build`
2. **Start production server:** `npm start`
3. **Health probe:** `GET /health` returns `{ "status": "ok" }`

#### Containerisation outline (customise as needed)
1. Build image: `docker build -t my-list-service .`
2. Run container:
   ```bash
   docker run -p 8080:8080 \
     -e MONGODB_URI="mongodb://host.docker.internal:27017/my_list_service" \
     my-list-service
   ```
3. Add to CI/CD pipelines (GitHub Actions, CircleCI, etc.) using `npm ci && npm test && npm run build`.

---

### API Overview
- `POST /api/v1/users/:userId/my-list`  
  Body: `{ "contentId": "movie-101", "contentType": "Movie" | "TVShow" }`  
  Creates a new list entry; returns the enriched item snapshot.
- `DELETE /api/v1/users/:userId/my-list/:itemId`  
  Removes the specified content identifier from the user’s list.
- `GET /api/v1/users/:userId/my-list?limit=20&cursor=<opaque>`  
  Retrieves a page of items ordered by `addedAt` desc. `nextCursor` is returned when more data exists.

---

### Design Notes
- **Schema layout:** User lists live in a dedicated `my_list` collection with composite indexes (`userId + contentId`, `userId + addedAt`). This avoids large document growth inside user records and keeps pagination fast.
- **Cursor pagination:** By combining `addedAt` and `contentId` we guarantee strict ordering and avoid costly `skip` queries that degrade as lists grow.
- **Caching:** An `InMemoryCache` offers rapid list retrieval and hides serialization from controllers. In production, replace it with Redis via the same API for distributed consistency.
- **Resilience:** Duplicate content gracefully returns HTTP 409; unknown catalogue entries surface 404s. A global error handler ensures structured error payloads.
- **Testing:** Integration tests cover success and failure paths, ensuring controller/service integration stays intact. mongodb-memory-server simulates Mongo nicely without external dependencies.

---

### Troubleshooting
- **npm permission errors:** run `sudo chown -R $(whoami) $(npm config get cache)` once on Unix. On Windows, restart shell as Administrator and rerun `npm install`.
- **Mongo connection issues:** confirm MongoDB is listening on the host:port in `MONGODB_URI`. Logs show sanitized URIs to aid debugging.
- **Port conflicts:** update `PORT` in `.env` or export `PORT=<value>` before running.
- **Slow responses:** ensure Mongo indexes are created (Mongoose builds them on start unless `NODE_ENV=production`). For high concurrency, move the cache to Redis.

---

### Assumptions
- Authentication is handled upstream; routes receive the trusted `userId` parameter.
- Catalogue data for movies and TV shows is already present or managed via the provided seed script.
- Deployment and CI/CD can target any platform (Render, Fly.io, AWS, etc.). The project ships with npm scripts ready for pipeline integration.

