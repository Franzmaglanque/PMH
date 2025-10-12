# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PMH (Puregold Cash-in System) is a Next.js 15 application using the App Router with Mantine UI components. The application manages batch records and provides authentication for employees and suppliers.

## Development Commands

### Build and Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run analyze` - Analyze bundle with @next/bundle-analyzer (set ANALYZE=true)

### Testing and Quality
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run both ESLint and Stylelint
- `npm run eslint` - Run ESLint only
- `npm run stylelint` - Run Stylelint on CSS files
- `npm run jest` - Run Jest tests
- `npm run jest:watch` - Run Jest in watch mode
- `npm test` - Run full test suite (prettier, lint, typecheck, jest)

### Code Formatting
- `npm run prettier:check` - Check code formatting
- `npm run prettier:write` - Format all TypeScript files

### Storybook
- `npm run storybook` - Start Storybook dev server on port 6006
- `npm run storybook:build` - Build Storybook to storybook-static

## Architecture

### Route Group Structure

The application uses Next.js 15 App Router with route groups for layout separation:

- `app/(auth)/` - Authentication pages with centered layout (login, register)
  - Uses `app/(auth)/layout.tsx` for authentication-specific layout
  - Registration split into employee and supplier flows

- `app/(app)/` - Authenticated application pages with sidebar/header navigation
  - Uses `app/(app)/layout.tsx` which renders a full AppShell with:
    - Header with user menu and notifications
    - Collapsible sidebar navigation (batch management, reports, analytics, settings)
    - Mobile-responsive burger menu

- `app/layout.tsx` - Root layout wrapping entire app with MantineProvider and Providers (React Query + Notifications)

### State Management

- **React Query (@tanstack/react-query)** - Server state management with 60s stale time, refetch on window focus disabled
- **React Hook Form** - Form state management with Zod validation via @hookform/resolvers
- **Local Storage** - Authentication tokens and user data stored client-side

### Authentication Flow

- **Backend Cookie Approach**: Laravel API sets HttpOnly cookies for security
- Login credentials sent to `${NEXT_PUBLIC_API_URL}/login` endpoint
- Successful login stores:
  - Token in localStorage for API requests (sent via `Authorization: Bearer {token}` header)
  - User object in localStorage for UI display
  - HttpOnly cookie set by backend for session management
- Cookie duration: 7 days if "Remember me" checked, 1 day otherwise
- Logout endpoint (`/logout`) requires `auth:sanctum` middleware
- Uses standard OAuth Bearer token authentication via `Authorization` header
- Separate registration schemas for employees (category, position) vs suppliers (supplierCode)

### Form Validation

All form validation uses Zod schemas located in `lib/schemas/auth.schema.tsx`:
- `loginSchema` - Login form (login field, password min 6 chars)
- `employeeRegistrationSchema` - Employee registration with position validation (MERCHANDISING or MASTERDATA)
- `supplierRegistrationSchema` - Supplier registration with supplier code
- Base fields include email, password with complexity rules (uppercase, lowercase, number), confirmPassword, firstName, lastName

### API Integration

- API base URL configured via `NEXT_PUBLIC_API_URL` environment variable (default: http://localhost:8000/api)
- API functions located in `app/api/` directory
- All authenticated requests use standard `Authorization: Bearer {token}` header
- Token retrieved from localStorage before each request
- Batch management APIs:
  - `generateBatch(requestType)` - Creates new batch with supplier code
  - `validateBarcode(upc, batchNumber)` - Validates product barcode
  - `fetchBatchRecordsById(batchNumber)` - Fetches records for specific batch
- Credentials included in requests via `credentials: 'include'` for cookie handling

### UI Components

- **Mantine v8** - Primary component library with theme provider
- **Mantine Notifications** - Toast notifications positioned bottom-right
- **Mantine DataTable** - Data table component with sorting, pagination, styling
- **Tabler Icons** - Icon library (@tabler/icons-react)

### Helper Libraries

All helper functions are located in `lib/` directory for reusability:

- **`lib/notifications.tsx`** - Notification wrappers:
  - `showSuccessNotification()` - Green, 3s auto-close
  - `showErrorNotification()` - Red, 5s auto-close
  - `showWarningNotification()` - Orange, 6s auto-close
  - `showInfoNotification()` - Blue, 4s auto-close

- **`lib/debounce.ts`** - Debounce utilities using lodash:
  - `useDebouncedInput(onValueChange, delay)` - Debounced input handler (default 800ms)
  - `useDebouncedCallback(callback, delay)` - Debounced callback hook
  - `createDebounce(delay)` - Factory function for custom debounce

- **`lib/inputHelpers.ts`** - Input validation helpers:
  - `useNumericInput(onChange)` - Restricts input to numeric characters only
  - `useNumericInputWithMaxLength(onChange, maxLength)` - Numeric with length limit
  - Returns `{ onChange, onKeyPress }` handlers for TextInput

- **`lib/dataTableHelper.tsx`** - Reusable DataTable components:
  - `StyledDataTable` - Full-featured table with Paper wrapper, title, record count badge
  - `SimpleDataTable` - Basic table without wrapper for custom layouts
  - `createBadgeRenderer(accessor, color, variant)` - Utility for badge columns
  - `createActionColumn(actions)` - Utility for action button columns

### Styling

- PostCSS with postcss-preset-mantine and postcss-simple-vars
- CSS modules for component-specific styles
- Global Mantine styles imported in root layout
- Path alias `@/*` maps to project root for imports

### Key Configuration

- **TypeScript** - Strict mode enabled, ES5 target, ESNext module
- **Next.js Config** - React strict mode disabled, ESLint ignored during builds, package imports optimized for @mantine/core and @mantine/hooks
- **Package Manager** - Yarn 4.10.3

## Important Notes

- The application uses a monolithic layout structure where authenticated pages share the AppShell layout defined in `app/(app)/layout.tsx`
- Navigation state uses Next.js `usePathname()` hook to determine active routes
- Route protection should be implemented in middleware checking for `auth_token` cookie
- API endpoints expect JSON with specific headers including session tokens for authenticated routes
