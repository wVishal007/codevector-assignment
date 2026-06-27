# CodeVector — Product Browser API

Browse ~200,000 products with cursor-based pagination that stays correct even while data is changing. Filter by category, paginate forward, never see duplicates or miss a product.

## Architecture

```
project/
├── src/
│   ├── index.js              Express server, routes, graceful shutdown
│   ├── config.js             Environment configuration
│   ├── db.js                 Mongoose connection
│   ├── seed.js               Generate & insert 200k products (CLI + API)
│   ├── models/
│   │   └── Product.js        Mongoose schema + indexes
│   └── products/
│       ├── routes.js         GET /api/products endpoint
│       ├── service.js        Cursor-paginated query logic
│       └── validation.js     Cursor encode/decode, param parsing
├── public/
│   └── index.html            UI with category filter + Load More
├── package.json
├── .env.example
└── README.md
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Database | MongoDB (Atlas free tier) |
| ODM | Mongoose |
| Server | Express |
| Hosting | Render (free web service) |

## Key Design: Cursor Pagination

### Why not offset pagination?

With `LIMIT 50 OFFSET 100`, inserting new products shifts all existing rows. The user sees duplicates or misses products.

```
Page 1: items 1-50
→ 50 new products inserted (now items 1-50)
Page 2 (offset 50): gets old items 1-50 again → DUPLICATES
```

### How cursor pagination works

Each page returns a cursor pointing to the last item. The next query fetches only items strictly before that cursor.

```
GET /api/products?cursor=eyJjcmVhdGVkX2F0Ij...&limit=50&category=Electronics
```

The cursor is a base64-encoded JSON object: `{ "created_at": "...", "_id": "..." }`

The database query uses the compound cursor:

```
WHERE category = 'Electronics'
  AND (created_at < '2026-01-01T00:00:00Z'
    OR (created_at = '2026-01-01T00:00:00Z' AND _id < 'abc123'))
ORDER BY created_at DESC, _id DESC
LIMIT 51
```

### Why this is correct under concurrent writes

| Scenario | What happens |
|----------|-------------|
| **50 new products added** | They have newer `created_at` → sort before the cursor → never appear on subsequent pages |
| **Product updated** | `created_at` is immutable → position stays stable |
| **Same `created_at` collision** | `_id` tiebreaker (ObjectId is unique) → no skipped items |

### Performance

Composite indexes allow each page to be a B-tree range scan — **O(log n)** per page, not O(n) like `OFFSET`.

- `{ category: 1, created_at: -1, _id: -1 }` — covers filtered queries
- `{ created_at: -1, _id: -1 }` — covers unfiltered queries

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier, no credit card required)

### Setup

```bash
# 1. Enter the project directory
cd project

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
```

Edit `.env` with your MongoDB Atlas connection string and a random API key:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/products?retryWrites=true&w=majority
PORT=10000
SEED_API_KEY=generate-a-random-uuid-here
```

### Seed the database

```bash
npm run seed
```

Generates 200,000 products across 10 categories with random prices and dates. Uses batched `insertMany` (1,000 per batch). Takes ~15-30 seconds.

### Start the server

```bash
npm start
```

Open http://localhost:10000 to see the product browser UI.

## API

### `GET /api/products`

Query parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | — | Base64 cursor from previous response |
| `limit` | number | 50 | Items per page (max 100) |
| `category` | string | — | Filter by category |

Response `200 OK`:

```json
{
  "data": [
    {
      "_id": "665a1b2c...",
      "name": "Product 42001",
      "category": "Electronics",
      "price": 299.99,
      "created_at": "2026-03-15T12:00:00.000Z",
      "updated_at": "2026-04-01T08:30:00.000Z"
    }
  ],
  "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMy0xNVQxMjowMDowMC4wMDBaIiwiX2lkIjoiNjY1YTFiMmMifQ==",
  "hasMore": true
}
```

### `GET /api/categories`

Returns a sorted list of all category names in the database.

### `POST /api/seed`

Resets and re-seeds the database. Requires authentication.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <SEED_API_KEY>` |

**Response `200 OK`:**
```json
{
  "count": 200000,
  "timeSeconds": 15.2
}
```

**Response `401 Unauthorized`:**
```json
{
  "error": "Unauthorized"
}
```

## Seeding: CLI vs API

The `runSeed()` function in `src/seed.js` is shared between two entry points:

| Method | Command | Auth Required |
|--------|---------|---------------|
| CLI | `npm run seed` | No (local only) |
| API | `POST /api/seed` with `Authorization: Bearer <key>` | Yes |

The API key is configured via the `SEED_API_KEY` environment variable.

### Trigger from browser console

Open the browser dev console (F12) and run:

```js
fetch('/api/seed', {
  method: 'POST',
  headers: { Authorization: 'Bearer <your-seed-api-key>' }
}).then(r => r.json()).then(console.log)
```

Replace `<your-seed-api-key>` with the value from your `.env` file.

## Deployment (Render)

1. Push the repository to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect your repo
3. Configure:
   - **Build command:** `cd project && npm install`
   - **Start command:** `cd project && npm start`
   - **Environment variables:**
     - `MONGODB_URI` — from MongoDB Atlas
     - `SEED_API_KEY` — a random UUID
4. Deploy
5. Open the UI and click "Load More" to verify pagination works

## Future Improvements

- **Caching:** Add `ETag`/`Last-Modified` headers for product pages
- **Rate limiting:** Protect the API from abuse
- **Advanced filters:** Price range, text search on name
- **Rich UI:** Replace vanilla JS with React/Vue for better UX
- **Tests:** Integration tests for pagination correctness under concurrent writes
- **Monitoring:** Structured logging with health endpoint
