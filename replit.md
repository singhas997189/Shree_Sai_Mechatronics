# Shree Sai Mechatronics Workshop Management System

## Overview

This is a full-stack workshop management system built for Shree Sai Mechatronics. The application provides role-based access control with three distinct user types: Inventory Managers, Engineers, and Administrators. Each role has dedicated dashboards with specific functionality tailored to their responsibilities within the workshop environment.

The system features modern authentication via Replit Auth with QR code login support, a responsive React frontend built with Tailwind CSS and shadcn/ui components, and a PostgreSQL database managed through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom industrial color palette
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **File Structure**: Monorepo with shared types and schemas

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations
- **Core Tables**:
  - `users`: User profiles with role-based access (inventory, engineer, admin)
  - `sessions`: Session storage for authentication
  - `qr_tokens`: Secure QR-based authentication tokens

### Authentication & Authorization
- **Primary Auth**: Replit Auth using OpenID Connect flow
- **Alternative Auth**: QR code-based login system
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-based Access**: Three distinct roles with dashboard routing
- **Security**: HTTPS-only cookies, CSRF protection, and secure session management

### Development & Deployment
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Development**: Hot module replacement with Vite dev server
- **Environment**: Replit-optimized with development banner and cartographer integration
- **Asset Management**: Separate asset directory with alias resolution

### API Structure
- **Authentication Endpoints**: User info, QR login validation
- **RESTful Design**: JSON-based API with consistent error handling
- **Request Logging**: Detailed logging for API requests with timing
- **Error Handling**: Centralized error middleware with status codes

### Role-Based Dashboards
- **Inventory Dashboard**: Stock management, order tracking, supply monitoring
- **Engineer Dashboard**: Machinery access, production tools, equipment status
- **Admin Dashboard**: User management, system administration, full access control

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Platform**: Development environment and hosting
- **WebSocket Support**: For real-time database connections

### Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Icon library for consistent UI elements
- **Google Fonts**: Inter font family for typography

### Development Tools
- **Vite Plugins**: Runtime error overlay, cartographer for Replit integration
- **TypeScript**: Static type checking across the entire stack
- **ESLint/Prettier**: Code formatting and linting (implied by structure)

### Runtime Libraries
- **TanStack Query**: Server state synchronization
- **React Hook Form**: Form management with validation
- **Wouter**: Lightweight client-side routing
- **date-fns**: Date manipulation utilities
- **Zod**: Runtime schema validation