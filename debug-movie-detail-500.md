# Debug Session: movie-detail-500 [OPEN]

## Symptom
- `GET /api/user/movies/2` returns `500`
- `GET /api/user/movies/4` returns `500`
- Frontend `MovieDetail.jsx` shows `API error`

## Scope
- User movie detail API
- Frontend `MovieDetail.jsx`
- Backend user movie detail controller/model/query

## Hypotheses
1. Movie detail SQL selects a column that does not exist in the current database schema.
2. Category join/aggregation for movie detail returns a shape that breaks backend serialization.
3. Normalization logic for poster/banner/trailer fields throws on null or unexpected values.
4. The route/controller resolves the movie id correctly, but the detail query returns malformed data and triggers a server exception.
5. A leftover merge conflict or partial schema migration exists in the movie detail backend path.

## Evidence Plan
- Inspect route/controller/model for movie detail.
- Add runtime instrumentation only.
- Reproduce `GET /api/user/movies/2` and `GET /api/user/movies/4`.
- Analyze pre-fix logs.
- Apply minimal fix after evidence confirms root cause.

## Evidence
- Pre-fix reproduction for movie `2` and `4` reached the showtime query and failed with `ER_BAD_FIELD_ERROR`.
- Error confirmed: `Unknown column 's.price_standard' in 'field list'`.
- Affected SQL was the showtime subquery inside `userGetMovieById()`.
- Post-fix reproduction for movie `2` and `4` returned success and logged `showtime rows loaded`.

## Root Cause
- The current database schema does not contain `Showtimes.price_standard`, `Showtimes.price_vip`, or `Showtimes.price_couple`.
- `userGetMovieById()` still queried those columns directly, causing `500` in movie detail.

## Fix
- Added schema capability detection for `Showtimes` price columns.
- Fallbacks now use `s.price` when the specialized price columns do not exist.
- Kept debug instrumentation in place for user confirmation.

## Verification
- `GET /api/user/movies/2` now returns `200`.
- `GET /api/user/movies/4` now returns `200`.
- Post-fix debug logs show successful movie load and showtime load without SQL errors.

## Status
- Waiting for user verification before cleanup.
