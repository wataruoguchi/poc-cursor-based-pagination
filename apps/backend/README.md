# Backend API

## Project Structure (Modular Monolithic with DDD)

```
src/
├── index.ts         # Application entry point
├── app.ts          # Application setup and module composition
├── app.spec.ts     # Integration tests
├── infrastructure/  # Shared infrastructure setup
│   ├── database.ts # Database connection and client setup
│   └── logger.ts   # Logging configuration
├── dev-utils/      # Development and testing utilities
│   ├── dev-db.ts   # Test database setup
│   └── mocks/      # Test data seeding
└── modules/        # Feature modules
    ├── user/       # User module
    │   ├── domain/           # Core business logic
    │   │   ├── entity.ts     # Domain entities and value objects
    │   ├── application/      # Application services
    │   │   └── user-use-cases.ts  # Use case implementations
    │   ├── infrastructure/   # DB I/O
    │   │   └── repository.ts  # Repository implementations
    │   └── interfaces/       # HTTP I/O
    │       └── user-controller.ts  # API endpoints
    └── order/      # Order module (Shopping Cart)
        ├── domain/           # Core business logic
        │   ├── shopping-cart.ts     # Domain entities and value objects
        ├── application/      # Application services
        │   └── order-use-cases.ts  # Use case implementations
        ├── infrastructure/   # DB I/O
        │   └── shopping-cart-repository.ts
        └── interfaces/       # HTTP I/O
            └── order-controller.ts  # API endpoints
```

### Why This Structure?

1. **Modular Approach**
   - Each feature is encapsulated in its own module
   - Modules are independent and can evolve separately
   - Clear boundaries between different parts of the system
   - Cross-module communication through use case types only

### Layers

1. **Domain Layer** (`modules/<moduleName>/domain/`)

   - It should not depend on other layers.
   - All the business logics, entities, value objects, etc. are found here.

1. **Application Layer** (`modules/<moduleName>/application/`)

   - It can depend on the Domain layer.
   - The layer can be depended by other domains.
     - e.g., `order-use-cases.ts` uses `getUserById` from user domain's application layer

1. **Infrastructure Layer** (`modules/<moduleName>/infrastructure/`)

   - It should not depend on other layers.
   - This is the only module communicates with the DB.

1. **Interface Layer** (`modules/<moduleName>/interfaces/`)

   - It depends on the Application layer.
   - This is the only module communicates with the rest of the world (via Web API).

### Testing Strategy

The project uses Vitest for testing with the following approach:

1. **Test Database**
   - Each test suite gets its own isolated database instance
   - Test data is seeded using the `dev-utils/mocks/seed.ts` utilities
   - Database is cleaned up after tests complete

2. **Integration Tests**
   - Tests are written at the API level using Hono's request API
   - Tests verify complete request/response cycles
   - No mocking of internal modules, ensuring real integration testing
   - Tests are co-located with the code they test

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Run database migrations:

```bash
npx kysely-ctl migrate:latest
```

3. Start development server:

```bash
pnpm dev
```

4. Run tests:

```bash
pnpm test
```

The API will be available at http://localhost:3000

```bash
open http://localhost:3000
```
