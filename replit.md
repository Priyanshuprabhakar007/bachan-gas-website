# Bachan Gas Manager

## Overview

Bachan Gas Manager is a comprehensive full-stack web application designed for LPG distribution and inventory management. It streamlines operations for managing gas cylinder distribution, encompassing customer management, order tracking, inventory control, billing, gate passes, service tickets, and store management. The system supports multiple user roles (Admin, Subadmin, Manager, Staff, Accountant, Godown Keeper, Customer) with dynamic, database-driven role-based access control.

Key capabilities include:
- Public product catalog and customer self-service portal for bookings and order history.
- Extensive admin/management panel for full operational oversight (inventory, orders, customers, billing, gate passes, tickets, products, categories, stores, staff & roles, settings).
- Role-specific dashboards for delivery personnel, gatekeepers, and accountants.

The project aims to provide an efficient and scalable solution for LPG distributors, enhancing operational transparency and customer satisfaction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The Bachan Gas Manager is built as a monorepo, sharing code between the client and server for type safety and consistency.

### Tech Stack
- **Frontend**: React 18+ (TypeScript, Vite, Tailwind CSS, shadcn/ui - New York style components), Wouter for routing, TanStack React Query for server state.
- **Backend**: Express 5 (Node.js) served from `server/` with esbuild for bundling.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Passport.js with local strategy (admin username/password), Twilio Verify WhatsApp OTP for customer login, `express-session` for session management (cookie-based, 365-day sessions).
- **Validation**: Zod for schema validation.

### Project Structure
- `client/`: Frontend React application. Contains components, hooks, pages (including `management/` for admin), and utilities.
- `server/`: Backend Express server. Includes entry point (`index.ts`), API route handlers (`routes.ts`), authentication logic (`auth.ts`), database access layer (`storage.ts`), and Drizzle setup (`db.ts`).
- `shared/`: Contains common code like Drizzle database schema (`schema.ts`) and API contract definitions (`routes.ts`), ensuring type safety across the stack.
- `migrations/`: Drizzle database migration scripts.

### Key Design Decisions
- **Monorepo with shared code**: Centralized schema and API contracts in `shared/` for end-to-end type safety.
- **Drizzle ORM**: Chosen for database interaction over other ORMs, schema defined using `pgTable`. Database synchronization handled via `drizzle-kit push`.
- **Storage Abstraction**: Database operations are abstracted through an `IStorage` interface and `DatabaseStorage` implementation for maintainability and testability.
- **API Contract Pattern**: All API endpoints, their methods, paths, and input/output schemas are rigorously defined in `shared/routes.ts`.
- **Session-based Authentication**: Utilizes `express-session` and `Passport.js` for secure, cookie-based user authentication.
- **Image Management**: Supports primary and gallery images for products, and icon/banner images for categories. Images are uploaded via a dedicated API endpoint, stored locally, and support reordering.
- **Delivery Trip Workflow**: A comprehensive workflow manages delivery trips from pickup requests, gatekeeper approval, inventory issuance, delivery to stops, payment collection, to end-of-trip return verification by the gatekeeper. This includes detailed tracking of stock movements, vehicles, and trip status.
- **Role-Based Access Control (RBAC)**: Dynamic and database-driven, allowing flexible management of user roles and permissions through a dedicated UI.

### Database Schema Highlights
The Drizzle schema (in `shared/schema.ts`) defines core entities including:
- `users`, `categories`, `products`, `orders`, `orderItems`
- `inventory`, `stores`, `gatePasses`, `serviceTickets`
- `roles`, `permissions`, `rolePermissions` for RBAC
- `otpRateLimits` for OTP send/verify rate limiting
- Detailed entities for the delivery trip workflow: `vehicles`, `pickupRequests`, `trips`, `tripStops`, `tripStopDeliveries`, `tripReturnRequests`, `stockMovements`.
- `siteSettings` for branding and contact information, `contactInquiries`.

### API Structure
All API endpoints are prefixed with `/api/` and cover authentication, user management, product/category management, order processing, inventory, staff, roles, and a complete suite of endpoints for the delivery trip lifecycle. Admin-specific APIs are available for settings, reports, and content management.

### Theme and Styling
The application uses a dark theme with orange (#F97316) as the primary color and dark slate (#0F172A) background. It leverages shadcn/ui's New York style components, with Inter and JetBrains Mono fonts.

## External Dependencies

- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM & drizzle-kit**: For database interaction and schema migrations.
- **Passport.js**: Authentication middleware.
- **express-session**: Manages user sessions.
- **shadcn/ui & Radix UI**: Frontend component library.
- **TanStack React Query**: For managing and caching server-side data on the client.
- **Framer Motion**: Used for animations.
- **Recharts**: For data visualization and charts in dashboards.
- **date-fns**: Utility library for date manipulation.
- **Zod & drizzle-zod**: For data validation, shared between client and server.
- **Lucide React**: Icon library.
- **react-hook-form**: For form management and validation.