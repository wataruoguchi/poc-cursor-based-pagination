# Backend API

## Project Structure (Modular Monolithic with DDD)

```
src/
├── index.ts         # Application entry point
├── infrastructure/  # Shared infrastructure setup
└── modules/         # Feature modules
    └── user/        # User module
        ├── domain/           # Core business logic
        │   ├── entity.ts     # Domain entities and value objects
        │   └── repository.type.ts  # Repository interface definitions
        ├── application/      # Application services
        │   └── use-cases.ts  # Use case implementations
        ├── infrastructure/   # DB I/O
        │   └── repository  # Repository implementations
        └── interfaces/       # HTTP I/O
            └── user-controller.ts  # API endpoints
```

### Why This Structure?

1. **Modular Approach**
   - Each feature is encapsulated in its own module
   - Modules are independent and can evolve separately
   - Clear boundaries between different parts of the system
   - Easier to maintain and scale

2. **Domain Layer** (`domain/`)
   - Contains core business logic and rules
   - Defines entities and value objects using Zod schemas
   - Repository interfaces (`repository.type.ts`) define the contract for data access
   - Pure business logic, independent of infrastructure concerns

3. **Application Layer** (`application/`)
   - Orchestrates use cases
   - Coordinates between domain and infrastructure
   - Implements application-specific business rules
   - Uses repository interfaces from domain layer

4. **Infrastructure Layer** (`infrastructure/`)
   - Implements technical capabilities
   - Contains repository implementations that fulfill domain interfaces
   - Handles database connections using Kysely
   - Keeps technical details isolated from domain logic

5. **Interface Layer** (`interfaces/`)
   - Handles external communication
   - Controllers manage HTTP requests/responses
   - Transforms external data into domain models
   - Protects domain from external concerns

### Repository Pattern Implementation

The repository pattern is implemented using a type-first approach:

1. **Domain Layer** (`repository.type.ts`):

   ```typescript
   // Defines the contract for data access
   export type UserRepository = {
     findAll: () => Promise<User[]>;
     // ... other methods
   };
   ```

2. **Infrastructure Layer** (`repository.ts`):

   ```typescript
   // Implements the contract using Kysely
   export const createUserRepository = (db: Database): UserRepository => ({
     findAll: async () => {
       // Implementation using Kysely
     },
     // ... other methods
   });
   ```

This approach provides several benefits:

- Clear separation between interface and implementation
- Easy to swap implementations (e.g., for testing)
- Domain layer remains pure and technology-agnostic
- Type safety across the application

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

3. Run database migrations:

```bash
pnpm migrate up
```

4. Start development server:

```bash
pnpm dev
```

The API will be available at http://localhost:3000/api

```bash
open http://localhost:3000
```
