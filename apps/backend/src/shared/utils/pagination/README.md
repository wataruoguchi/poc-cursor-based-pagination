# Pagination Module

A flexible, type-safe cursor-based pagination system built with Kysely and TypeScript.

## Features

- **Cursor-based pagination** with composite cursors
- **Text search** with ILIKE queries
- **Filtering** by exact values
- **Bidirectional navigation** (next/previous)
- **Type safety** with full TypeScript support
- **Schema-driven types** with automatic synchronization
- **Functional programming** style with testable modules

## Quick Start

```typescript
import { createPaginatedQuery } from './repository';
import { createPaginatedUseCase, getDefaultCursorData } from './usecase';
import { createLogger } from '@/infrastructure/logger';

const logger = createLogger('pagination');

// 1. Create a paginated query
const paginatedQuery = createPaginatedQuery(
  logger,
  db.selectFrom('users')
).withTextSearchableColumns(['name', 'email']).paginatedQuery;

// 2. Create a use case
const useCase = createPaginatedUseCase(
  logger,
  paginatedQuery,
  (user) => ({ id: user.id, name: user.name, email: user.email })
);

// 3. Use pagination
const result = await useCase.paginatedUseCase();
// Returns: { data: User[], meta: { nextCursor, previousCursor, hasMore, totalRowCount } }
```

## API Reference

### Repository Layer

#### `createPaginatedQuery(logger, query)`

Creates a paginated query builder.

```typescript
const paginatedQuery = createPaginatedQuery(
  logger,
  db.selectFrom('users')
).withTextSearchableColumns(['name', 'email']).paginatedQuery;
```

#### `withTextSearchableColumns(columns)`

Configures which columns support text search (ILIKE).

#### `paginatedQuery(cursorData)`

Executes the paginated query.

### Use Case Layer

#### `createPaginatedUseCase(logger, paginatedQuery, transformItem, defaultCursor?)`

Creates a pagination use case.

```typescript
const useCase = createPaginatedUseCase(
  logger,
  paginatedQuery,
  (user) => ({ id: user.id, name: user.name }),
  getDefaultCursorData<UserTable>(['created_at', 'id'])
);
```

#### `paginatedUseCase(encodedCursor?, filters?)`

Executes pagination with optional encoded cursor and filters.

```typescript
// First page
const result = await useCase.paginatedUseCase();

// Next page
const nextPage = await useCase.paginatedUseCase(result.meta.nextCursor);

// With custom filters
const filtered = await useCase.paginatedUseCase(undefined, {
  limit: 20,
  direction: 'prev'
});
```

## Cursor Structure

Cursors use a flexible column-based structure with automatic type inference:

```typescript
type CursorData<T> = {
  cursorValues: Record<string, string | number | boolean | Date | null>;
  orderBy: string[];
  limit: number;
  direction: 'next' | 'prev';
  filters: Record<string, string | number | boolean>;
  timestamp: number;
};
```

### Examples

#### Simple Cursor
```typescript
{
  cursorValues: { id: '123' },
  orderBy: ['id'],
  limit: 10,
  direction: 'next',
  filters: {},
  timestamp: Date.now()
}
```

#### Composite Cursor
```typescript
{
  cursorValues: {
    created_at: '2024-01-01T00:00:00Z',
    id: 'uuid-123'
  },
  orderBy: ['created_at', 'id'],
  limit: 10,
  direction: 'next',
  filters: { is_active: true },
  timestamp: Date.now()
}
```

## Type Safety

The module provides comprehensive TypeScript support:

### Generic Types
```typescript
type UserTable = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
};

// Type-safe cursor data
const cursor: CursorData<UserTable> = {
  cursorValues: { id: '123', created_at: new Date() },
  orderBy: ['created_at', 'id'],
  limit: 10,
  direction: 'next',
  filters: {},
  timestamp: Date.now(),
};
```

### Schema-Driven Types
Types are automatically inferred from Zod schemas using `z.infer`, ensuring they stay in sync:

```typescript
// The type automatically updates when the schema changes
export type CursorData<T> = z.infer<ReturnType<typeof createCursorSchema<T>>>;
```

### Utility Types

#### `ExtractDataTypes<T>`
Extracts actual runtime types from Kysely table types:

```typescript
type UserTable = {
  id: Generated<string>;
  name: string;
  age: Generated<number>;
};

type UserData = ExtractDataTypes<UserTable>;
// Result: { id: string; name: string; age: number; }
```

## Usage Examples

### Basic Pagination
```typescript
const useCase = createPaginatedUseCase(
  logger,
  createPaginatedQuery(logger, db.selectFrom('users'))
    .withTextSearchableColumns(['name', 'email'])
    .paginatedQuery,
  (user) => ({ id: user.id, name: user.name, email: user.email })
);

const result = await useCase.paginatedUseCase();
```

### With Custom Default Cursor
```typescript
const defaultCursor = getDefaultCursorData<UserTable>(['updated_at', 'id']);

const useCase = createPaginatedUseCase(
  logger,
  paginatedQuery,
  transformItem,
  defaultCursor
);
```

### With Filters
```typescript
// Text search
const result = await useCase.paginatedUseCase(undefined, {
  filters: { name: 'john', email: 'gmail' }
});

// Exact value filtering
const result = await useCase.paginatedUseCase(undefined, {
  filters: { age: 25, is_active: true }
});
```

### Bidirectional Navigation
```typescript
// Forward pagination
const nextPage = await useCase.paginatedUseCase(nextCursor);

// Backward pagination
const prevPage = await useCase.paginatedUseCase(prevCursor);
```

## Testing

The module is designed for easy testing:

```typescript
import { createPaginatedQuery } from './repository';
import { createLogger } from '@/infrastructure/logger';

describe('Pagination', () => {
  it('should paginate correctly', async () => {
    const logger = createLogger('test');
    const paginatedQuery = createPaginatedQuery(
      logger,
      db.selectFrom('users')
    ).withTextSearchableColumns(['name']).paginatedQuery;

    const result = await paginatedQuery({
      cursorValues: { id: '' },
      orderBy: ['id'],
      limit: 5,
      direction: 'next',
      filters: {},
      timestamp: Date.now(),
    });

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(true);
  });
});
```

## Best Practices

### 1. Column Selection
- Use `created_at` or `updated_at` for natural chronological ordering
- Include a unique identifier (like `id`) in composite cursors
- Choose columns that have database indexes
- Use type-safe cursor creation with proper column validation

### 2. Performance
- Ensure cursor columns have database indexes
- Use composite indexes for multi-column cursors
- Monitor query performance with large datasets

### 3. Error Handling
- Handle invalid cursor gracefully (module provides fallback to defaults)
- Log cursor errors for debugging
- Provide meaningful error messages to users

### 4. Type Safety
- Use generic types for table records
- Leverage schema-driven types for automatic synchronization
- Define proper table types for extended databases
- Use `ExtractDataTypes` utility for clean type extraction

## Architecture

The module follows a layered architecture:

- **Repository Layer** (`repository.ts`): Low-level database query building
- **Use Case Layer** (`usecase.ts`): High-level pagination operations with cursor management
- **Schema-Driven Types**: Automatic type synchronization with Zod schemas

This design ensures:
- **Separation of concerns** between database and business logic
- **Testability** without complex mocking
- **Type safety** throughout the stack
- **Functional programming** principles
