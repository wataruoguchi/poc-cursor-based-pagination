# Pagination Module

A flexible, type-safe cursor-based pagination system built with Kysely and TypeScript.

## Overview

This pagination module provides a clean, functional approach to implementing cursor-based pagination in your application. It supports:

- **Cursor-based pagination** with composite cursors
- **Text search** with ILIKE queries
- **Filtering** by exact values
- **Bidirectional navigation** (next/previous)
- **Type safety** with full TypeScript support
- **Functional programming** style with testable modules

## Architecture

The module consists of two main components:

### 1. Repository Layer (`repository.ts`)

Handles the low-level database query building and execution.

### 2. Use Case Layer (`usecase.ts`)

Provides the high-level API for pagination operations, including cursor encoding/decoding.

## Quick Start

### Basic Usage

```typescript
import { createPaginatedQuery } from './repository.ts';
import { createPaginatedUseCase } from './usecase.ts';

// 1. Create a paginated query
const paginatedQuery = createPaginatedQuery(
  db.selectFrom('users'),
).withTextSearchableColumns(['name', 'email']).paginatedQuery;

// 2. Create a use case
const useCase = createPaginatedUseCase(paginatedQuery, (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
}));

// 3. Use pagination
const result = await useCase.paginatedUseCase();
// Returns: { data: User[], meta: { nextCursor, previousCursor, hasMore, totalRowCount } }
```

## API Reference

### Repository API

#### `createPaginatedQuery(query)`

Creates a paginated query builder.

**Parameters:**

- `query`: Kysely query builder (must not have orderBy, selectAll, limit, or execute clauses)

**Returns:**

- Object with `withTextSearchableColumns()` method

#### `withTextSearchableColumns(columns)`

Configures which columns support text search (ILIKE).

**Parameters:**

- `columns`: Array of string column names that support text search

**Returns:**

- Object with `paginatedQuery()` method

#### `paginatedQuery(cursorData)`

Executes the paginated query.

**Parameters:**

- `cursorData`: CursorData object with pagination parameters

**Returns:**

- Promise resolving to `{ items: T[], totalCount: number, hasMore: boolean }`

### Use Case API

#### `createPaginatedUseCase(paginatedQuery, transformItem, defaultCursor?)`

Creates a pagination use case.

**Parameters:**

- `paginatedQuery`: PaginatedQuery function from repository
- `transformItem`: Function to transform database items to DTOs
- `defaultCursor`: Optional default cursor configuration

**Returns:**

- Object with `paginatedUseCase()` method

#### `paginatedUseCase(encodedCursor?)`

Executes pagination with optional encoded cursor.

**Parameters:**

- `encodedCursor`: Optional base64-encoded cursor string

**Returns:**

- Promise resolving to `{ data: R[], meta: PaginatedMeta }`

## Cursor Structure

Cursors use a flexible column-based structure:

```typescript
type CursorData = {
  columns: Record<string, string | number | boolean | Date | null>;
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
  columns: { id: '123' },
  limit: 10,
  direction: 'next',
  filters: {},
  timestamp: Date.now()
}
```

#### Composite Cursor

```typescript
{
  columns: {
    created_at: '2024-01-01T00:00:00Z',
    id: 'uuid-123'
  },
  limit: 10,
  direction: 'next',
  filters: { is_active: true },
  timestamp: Date.now()
}
```

## Features

### 1. Composite Cursors

Support for multiple columns in cursors for deterministic ordering:

```typescript
const cursor = {
  columns: {
    created_at: '2024-01-01T00:00:00Z',
    id: 'uuid-123',
  },
  // ... other properties
};
```

### 2. Text Search

Enable ILIKE search on string columns:

```typescript
const paginatedQuery = createPaginatedQuery(
  db.selectFrom('users'),
).withTextSearchableColumns(['name', 'email']).paginatedQuery;

// Use with filters
const result = await paginatedQuery({
  columns: { id: '' },
  filters: { name: 'john', email: 'gmail' },
  // ... other properties
});
```

### 3. Exact Value Filtering

Filter by exact values for non-string columns:

```typescript
const result = await paginatedQuery({
  columns: { id: '' },
  filters: {
    age: 25,
    is_active: true,
    name: 'John', // Text search if name is in textSearchableColumns
  },
  // ... other properties
});
```

### 4. Bidirectional Navigation

Navigate both forward and backward:

```typescript
// Next page
const nextPage = await useCase.paginatedUseCase(nextCursor);

// Previous page
const prevPage = await useCase.paginatedUseCase(prevCursor);
```

## Type Safety

The module provides full TypeScript support with:

- **Generic types** for table records
- **Type inference** from Kysely query builders
- **Compile-time validation** of searchable columns
- **Type-safe cursor creation** and decoding
- **Utility types** for extracting actual data types from Kysely table types

### Utility Types

#### `ExtractDataTypes<T>`

Extracts actual runtime types from Kysely table types by removing the `Generated<T>` wrapper.

```typescript
import { type ExtractDataTypes } from './repository.ts';

type UserTable = {
  id: Generated<string>;
  name: string;
  age: Generated<number>;
  created_at: Generated<Date>;
};

type UserData = ExtractDataTypes<UserTable>;
// Result: { id: string; name: string; age: number; created_at: Date }
```

### Example with Types

```typescript
type User = {
  id: string;
  name: string;
  email: string;
  age: number;
  created_at: Date;
};

type UserDTO = {
  id: string;
  name: string;
  email: string;
};

const paginatedQuery = createPaginatedQuery<User>(
  db.selectFrom('users'),
).withTextSearchableColumns(['name', 'email']).paginatedQuery; // TypeScript validates these are string columns

const useCase = createPaginatedUseCase<User, UserDTO>(
  paginatedQuery,
  (user) => ({ id: user.id, name: user.name, email: user.email }),
);
```

## Testing

The module is designed to be easily testable:

- **No mocking required** for core functionality
- **Functional composition** allows testing individual components
- **Type safety** prevents runtime errors
- **Comprehensive test suite** included

### Test Example

```typescript
import { createPaginatedQuery } from './repository.ts';

describe('Pagination', () => {
  it('should paginate correctly', async () => {
    const paginatedQuery = createPaginatedQuery(
      db.selectFrom('users'),
    ).withTextSearchableColumns(['name']).paginatedQuery;

    const result = await paginatedQuery({
      columns: { id: '' },
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
- Include a unique identifier (like `id`) in composite cursors for deterministic ordering
- Choose columns that have indexes for optimal performance

### 2. Cursor Management

- Always validate cursor timestamps to detect stale cursors
- Use appropriate limits (10-100 items typically)
- Consider cursor expiration for security

### 3. Performance

- Ensure cursor columns have database indexes
- Use composite indexes for multi-column cursors
- Monitor query performance with large datasets

### 4. Error Handling

- Handle invalid cursor gracefully (module provides fallback to defaults)
- Log cursor errors for debugging
- Provide meaningful error messages to users

## Migration from Offset Pagination

If migrating from offset-based pagination:

1. **Update API endpoints** to accept cursor instead of page/offset
2. **Modify frontend** to handle cursor-based navigation
3. **Add database indexes** on cursor columns
4. **Update documentation** to reflect new pagination behavior

## Contributing

When contributing to this module:

1. **Maintain functional programming style**
2. **Add comprehensive tests** for new features
3. **Update documentation** for API changes
4. **Ensure type safety** with TypeScript
5. **Follow existing patterns** for consistency
