# Tracklet - Mail Parcel Tracking System

## Overview

Tracklet is an enterprise mail parcel tracking application designed for businesses to organize, track, and manage mail parcels efficiently. The system supports multiple locations (businesses), role-based access control (admin, manager, employee), package tracking with storage location assignments, and optional pricing features. Built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: Carbon Design System principles - optimized for data-heavy enterprise applications

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with tsx for development
- **API Pattern**: RESTful JSON API under `/api` prefix
- **Authentication**: Local email/password authentication with Passport.js and bcrypt
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Key Data Models
- **Users**: Authentication users with email/password credentials
- **AppUsers**: Application-level user records with roles (admin/manager/employee) and location assignments
- **Locations**: Business locations using the tracking system
- **StorageLocations**: Physical storage areas within a location for package organization
- **Packages**: Individual parcels with tracking numbers, recipient info, weight, and delivery status
- **ArchivedPackages**: Cold storage for delivered packages older than 2 months (condensed data)
- **PricingTiers**: Optional pricing configuration (per-pound or range-based)

### Authentication Flow
1. Local authentication with email/password (bcrypt hashing)
2. Users table stores credentials and profile info
3. First registered user automatically becomes admin
4. AppUsers table extends with role and location assignment
5. Middleware checks both authentication and authorization (admin vs location-specific access)

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production**: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared folder

## External Dependencies

### Database
- PostgreSQL database (provisioned via Replit)
- Required environment variable: `DATABASE_URL`

### Authentication
- Local email/password authentication with bcrypt
- Required environment variables: `SESSION_SECRET` (optional, has fallback)

### Key NPM Packages
- **UI**: Radix UI primitives, Tailwind CSS, class-variance-authority
- **Data**: Drizzle ORM, TanStack React Query, Zod
- **Auth**: Passport.js, passport-local, bcryptjs, express-session
- **Utilities**: date-fns, nanoid, lucide-react (icons)

### Development Tools
- Replit-specific Vite plugins for error overlay and dev banner
- TypeScript with strict mode enabled

## Recent Changes (January 2026)

### Bug Fixes
1. **Location Form Create/Edit Bug**: Fixed issue where navigating to `/admin/locations/new` incorrectly treated the form as "edit" mode due to undefined route parameter
2. **Empty Numeric Field Bug**: Fixed PostgreSQL parsing error when creating locations with pricing disabled - empty strings now converted to null
3. **Non-Admin Routing Bug**: Fixed issue where non-admin users landing on "/" couldn't access their location dashboard. Components now accept locationId as a prop

### Route Structure
- Admin users: `/admin`, `/admin/locations`, `/admin/users`, `/admin/locations/:id`
- Non-admin users: `/` (dashboard), `/storage`, `/users` - all scoped to their assigned location
- Location pages accept optional `locationId` prop to work without URL params

### Known Behaviors
- New users who log in are shown "Access Pending" until an admin creates their app_user record
- Pricing is optional per location and supports two modes: per-pound rate or range-based tiers
- Search by recipient name shows a summary card with total packages and estimated cost
- Cold Storage: Packages delivered 2+ months ago can be archived to save storage space. Archived packages are searchable via the "Search Cold Storage" section on the dashboard.

### Cold Storage Feature
- **Purpose**: Reduces database size by moving old delivered packages to a condensed archive table
- **Trigger**: Admin-only POST /api/archive/run endpoint (can specify monthsOld parameter, default 2)
- **Archive Table**: Stores only essential data (tracking number, recipient, pickup person, delivery date)
- **Search**: Users can search archived packages via collapsible section on dashboard

### Backup Feature (JSONBin.io)
- **Purpose**: Automated cloud backups of all location data to JSONBin.io
- **Configuration**: Admin adds JSONBIN_API_KEY as a Replit secret, then validates via Backups page
- **Schedule**: Configurable frequency in hours, scheduler runs automatically when enabled
- **Rotation**: Maximum 5 backups per location - oldest deleted when creating 6th backup
- **Data**: Backs up location, storage locations, pricing tiers, packages, and users (excludes cold storage)
- **Admin Route**: /admin/backups for configuration and manual backup runs