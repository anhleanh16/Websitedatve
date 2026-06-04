# Admin & User Structure

## Backend Structure (`/backend/src`)

### Admin Module (`/backend/src/admin`)
- **controllers/** - Admin control handlers (dashboard, users, movies, bookings)
- **routes/** - Admin API routes
- **middleware/** - Admin authentication & logging
- **services/** - Admin business logic (movies, users, bookings management)
- **models/** - Admin data schemas

**Routes:**
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - List all users
- `GET /api/admin/bookings` - List all bookings
- `GET /api/admin/movies` - List all movies
- `POST /api/admin/movies` - Create new movie
- `PUT /api/admin/movies/:id` - Update movie
- `DELETE /api/admin/movies/:id` - Delete movie

### User Module (`/backend/src/user`)
- **controllers/** - User control handlers (profile, bookings)
- **routes/** - User API routes
- **middleware/** - User authentication & validation
- **services/** - User business logic
- **models/** - User data schemas

**Routes:**
- `GET /api/user/:userId/profile` - Get user profile
- `PUT /api/user/:userId/profile` - Update user profile
- `GET /api/user/:userId/bookings` - Get user bookings
- `POST /api/user/:userId/bookings` - Create new booking

## Frontend Structure (`/frontend/src`)

### Admin Module (`/frontend/src/admin`)
- **pages/** - Admin pages (Dashboard, Users, Movies, Bookings)
- **components/** - Admin components (Sidebar, Header, etc.)
- **layouts/** - AdminLayout wrapper
- **services/** - Admin API integration
- **routes/** - Admin routing config

**Access:** `/admin/*`
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/movies` - Movie management
- `/admin/bookings` - Booking management

### User Module (`/frontend/src/user`)
- **pages/** - User pages (Home, Login, Register, Booking, etc.)
- **components/** - User components (Navbar, MovieCard, etc.)
- **layouts/** - User layouts
- **services/** - User API integration
- **routes/** - User routing config

**Access:** `/*` (all user routes)

## How It Works

### Navigation
- User visits `/` → UserRoutes (with Navbar + Footer)
- Admin visits `/admin/dashboard` → AdminRoutes (with Sidebar + Header)

### API Integration
- Frontend calls `http://localhost:4000/api/admin/*` for admin operations
- Frontend calls `http://localhost:4000/api/user/*` for user operations

### Authentication
- Admin routes protected by `adminAuthMiddleware` (check role === 'admin')
- User routes protected by `userAuthMiddleware` (check if logged in)

## Benefits

✅ **Separation of Concerns** - Admin and user code are completely separate
✅ **Easy Maintenance** - Find and edit admin/user code quickly
✅ **Scalability** - Can easily add new admin features without affecting user interface
✅ **Security** - Admin routes can have stricter authentication
✅ **Testing** - Can test admin and user flows independently
