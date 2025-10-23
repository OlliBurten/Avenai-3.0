# 📝 Avenai Coding Standards

## 🎯 Overview

This document establishes coding standards, conventions, and best practices for the Avenai development team. Following these standards ensures code consistency, maintainability, and readability across the entire codebase.

---

## 📋 Table of Contents
1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [React Component Standards](#react-component-standards)
4. [API Route Standards](#api-route-standards)
5. [Database Standards](#database-standards)
6. [File Organization](#file-organization)
7. [Naming Conventions](#naming-conventions)
8. [Error Handling](#error-handling)
9. [Performance Guidelines](#performance-guidelines)
10. [Security Standards](#security-standards)
11. [Testing Standards](#testing-standards)
12. [Documentation Standards](#documentation-standards)

---

## 🎯 General Principles

### Code Quality
- **Readability**: Code should be self-documenting and easy to understand
- **Consistency**: Follow established patterns throughout the codebase
- **Simplicity**: Prefer simple solutions over complex ones
- **Maintainability**: Write code that's easy to modify and extend
- **Performance**: Consider performance implications of all code changes

### Development Workflow
- **Type Safety**: Use TypeScript strict mode
- **Linting**: All code must pass ESLint checks
- **Formatting**: Use Prettier for consistent code formatting
- **Testing**: Write tests for new functionality
- **Documentation**: Document complex logic and public APIs

---

## 📘 TypeScript Standards

### Type Definitions
```typescript
// ✅ Good: Explicit interface definitions
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Good: Union types for specific values
type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ✅ Good: Generic types for reusable components
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
  message?: string;
  timestamp: string;
}

// ❌ Bad: Using 'any' type
function processData(data: any): any {
  return data;
}

// ✅ Good: Proper typing
function processData<T>(data: T): T {
  return data;
}
```

### Function Signatures
```typescript
// ✅ Good: Explicit parameter and return types
async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}

// ✅ Good: Optional parameters with defaults
function createUser(
  email: string,
  password: string,
  options: {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  } = {}
): Promise<User> {
  // Implementation
}

// ✅ Good: Destructured parameters
function updateUserProfile({
  id,
  firstName,
  lastName,
  email
}: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<User> {
  // Implementation
}
```

### Error Handling
```typescript
// ✅ Good: Custom error classes
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ✅ Good: Type-safe error handling
async function safeApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
```

---

## ⚛️ React Component Standards

### Component Structure
```typescript
// ✅ Good: Proper component structure with JSDoc
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * UserProfile component for displaying and editing user information
 * 
 * @param user - User data object
 * @param onUpdate - Callback function when user data is updated
 * @param isEditable - Whether the profile can be edited
 * @param className - Additional CSS classes
 */
interface UserProfileProps {
  user: User;
  onUpdate: (userData: Partial<User>) => void;
  isEditable?: boolean;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdate,
  isEditable = false,
  className = ''
}) => {
  // State declarations
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  
  // Event handlers with useCallback
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setFormData(user);
  }, [user]);
  
  const handleSave = useCallback(async () => {
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }, [formData, onUpdate]);
  
  // Effects
  useEffect(() => {
    setFormData(user);
  }, [user]);
  
  // Render
  return (
    <Card className={`p-6 ${className}`}>
      {/* Component JSX */}
    </Card>
  );
};

// Export with display name for debugging
UserProfile.displayName = 'UserProfile';
```

### Hooks Standards
```typescript
// ✅ Good: Custom hook with proper typing
interface UseUserDataReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useUserData = (userId: string): UseUserDataReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await getUserById(userId);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  const updateUser = useCallback(async (data: Partial<User>) => {
    try {
      const updatedUser = await updateUserById(userId, data);
      setUser(updatedUser);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update user');
    }
  }, [userId]);
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  
  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    updateUser
  };
};
```

### Performance Optimization
```typescript
// ✅ Good: Memoized components
export const ExpensiveComponent = React.memo<ExpensiveComponentProps>(
  function ExpensiveComponent({ data, onAction }) {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison function if needed
    return prevProps.data.id === nextProps.data.id;
  }
);

// ✅ Good: Memoized callbacks
const MemoizedComponent = ({ items, onItemClick }) => {
  const handleItemClick = useCallback((itemId: string) => {
    onItemClick(itemId);
  }, [onItemClick]);
  
  const memoizedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      processed: processItem(item)
    }));
  }, [items]);
  
  return (
    <div>
      {memoizedItems.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
};
```

---

## 🔌 API Route Standards

### Route Structure
```typescript
// ✅ Good: Properly structured API route
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils';
import { createOptimizedHandler } from '@/lib/api-optimizations';
import { z } from 'zod';

// Request validation schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  organizationId: z.string().cuid()
});

/**
 * Create a new user in the organization
 * 
 * @param req - Next.js request object
 * @param session - Authenticated user session
 * @returns Created user data or error response
 */
async function handleCreateUser(req: NextRequest, session: any) {
  try {
    // Validate request body
    const body = await req.json();
    const validatedData = CreateUserSchema.parse(body);
    
    // Check permissions
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER') {
      return createErrorResponse({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only owners and admins can create users',
        statusCode: 403
      });
    }
    
    // Business logic
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        organizationId: session.user.organizationId,
        passwordHash: await hashPassword(validatedData.password),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });
    
    return createResponse(user, 'User created successfully');
    
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof z.ZodError) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        statusCode: 400
      });
    }
    
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create user',
      statusCode: 500
    });
  }
}

// Export with middleware
export const POST = createOptimizedHandler(handleCreateUser, {
  auth: true,
  validation: CreateUserSchema,
  rateLimit: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  cache: { key: 'create-user', ttl: 0 } // No caching for POST
});
```

### Error Handling
```typescript
// ✅ Good: Centralized error handling
export const createErrorResponse = (error: {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}) => {
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details })
    },
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(response, { status: error.statusCode });
};

// ✅ Good: Specific error types
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;
```

---

## 🗄️ Database Standards

### Query Patterns
```typescript
// ✅ Good: Optimized parallel queries
async function getOrganizationDashboard(organizationId: string) {
  const [
    totalUsers,
    totalDocuments,
    totalChatSessions,
    recentActivity
  ] = await Promise.all([
    prisma.user.count({ 
      where: { organizationId, isActive: true } 
    }),
    prisma.document.count({ 
      where: { organizationId } 
    }),
    prisma.chatSession.count({ 
      where: { organizationId } 
    }),
    prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      }
    })
  ]);
  
  return {
    totalUsers,
    totalDocuments,
    totalChatSessions,
    recentActivity
  };
}

// ✅ Good: Proper pagination
async function getDocumentsPaginated(
  organizationId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  } = {}
) {
  const { page = 1, pageSize = 20, search, status } = options;
  
  const where: any = { organizationId };
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ];
  }
  
  if (status) {
    where.status = status;
  }
  
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { documentChunks: true }
        }
      }
    }),
    prisma.document.count({ where })
  ]);
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}
```

### Transaction Patterns
```typescript
// ✅ Good: Proper transaction handling
async function createUserWithOrganization(userData: CreateUserData) {
  return await prisma.$transaction(async (tx) => {
    // Create organization first
    const organization = await tx.organization.create({
      data: {
        name: userData.organizationName,
        slug: userData.organizationSlug,
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE'
      }
    });
    
    // Create user with organization reference
    const user = await tx.user.create({
      data: {
        ...userData,
        organizationId: organization.id,
        role: 'OWNER',
        passwordHash: await hashPassword(userData.password)
      }
    });
    
    // Create default dataset
    await tx.dataset.create({
      data: {
        name: 'Default Dataset',
        description: 'Default dataset for the organization',
        organizationId: organization.id,
        type: 'SERVICE'
      }
    });
    
    return { user, organization };
  });
}
```

---

## 📁 File Organization

### Directory Structure
```
app/
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   ├── admin/             # Admin-only endpoints
│   ├── chat/              # Chat functionality
│   ├── documents/         # Document management
│   └── users/             # User management
├── auth/                  # Authentication pages
├── dashboard/             # Main dashboard
├── admin/                 # Admin interface
└── (other pages)/

components/
├── ui/                    # Base UI components
├── chat/                  # Chat-specific components
├── forms/                 # Form components
└── layout/                # Layout components

lib/
├── database-optimizations.ts  # DB utilities
├── api-optimizations.ts      # API middleware
├── frontend-optimizations.tsx # React utilities
├── auth.ts                # Authentication
├── prisma.ts              # Database client
└── utils.ts               # General utilities

types/
├── api.ts                 # API type definitions
├── database.ts            # Database types
└── components.ts          # Component types
```

### File Naming
```typescript
// ✅ Good: Descriptive file names
user-profile.tsx           // Component files
user-profile.test.tsx      // Test files
user-profile.stories.tsx   // Storybook files
api-utils.ts              // Utility files
database-schema.prisma    // Database files

// ✅ Good: Consistent naming patterns
components/
├── UserProfile.tsx        // PascalCase for components
├── user-profile-hooks.ts  // kebab-case for utilities
└── user-profile.types.ts  // kebab-case for types

lib/
├── api-utils.ts          // kebab-case for utilities
├── database-client.ts    // kebab-case for clients
└── validation-schemas.ts // kebab-case for schemas
```

---

## 🏷️ Naming Conventions

### Variables and Functions
```typescript
// ✅ Good: camelCase for variables and functions
const userName = 'john.doe@example.com';
const isUserActive = true;
const totalDocumentCount = 150;

function getUserById(id: string) { }
function calculateTotalPrice(items: Item[]) { }
function isEmailValid(email: string) { }

// ✅ Good: Descriptive names
const userAuthenticationStatus = 'authenticated';
const documentProcessingQueue = [];
const chatMessageHistory = [];

// ❌ Bad: Abbreviated or unclear names
const usr = user;
const docCnt = documentCount;
const msg = message;
```

### Constants
```typescript
// ✅ Good: UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.avenai.io';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_PAGE_SIZE = 20;
const SUPPORTED_FILE_TYPES = ['pdf', 'txt', 'md', 'docx'];

// ✅ Good: Grouped constants
const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
} as const;

const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const;
```

### Database
```sql
-- ✅ Good: snake_case for database objects
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Good: Descriptive index names
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX idx_documents_org_status ON documents(organization_id, status);
```

---

## ⚠️ Error Handling

### Error Types
```typescript
// ✅ Good: Custom error classes
abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

class AuthenticationError extends BaseError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

class AuthorizationError extends BaseError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
}

class NotFoundError extends BaseError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

class ConflictError extends BaseError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
}

class InternalError extends BaseError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;
}
```

### Error Handling Patterns
```typescript
// ✅ Good: Consistent error handling in API routes
async function handleGetUser(req: NextRequest, session: any) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      throw new ValidationError('User ID is required');
    }
    
    const user = await prisma.user.findUnique({
      where: { id, organizationId: session.user.organizationId }
    });
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return createResponse(user, 'User retrieved successfully');
    
  } catch (error) {
    if (error instanceof BaseError) {
      return createErrorResponse({
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      });
    }
    
    console.error('Unexpected error:', error);
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
}

// ✅ Good: Error handling in React components
const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch user');
        }
        
        setUser(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;
  
  return <div>{/* User profile JSX */}</div>;
};
```

---

## 🚀 Performance Guidelines

### Database Performance
```typescript
// ✅ Good: Use select to limit fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true
    // Don't select passwordHash unless needed
  }
});

// ✅ Good: Use parallel queries
const [users, documents, analytics] = await Promise.all([
  prisma.user.findMany({ where: { organizationId } }),
  prisma.document.findMany({ where: { organizationId } }),
  prisma.analyticsEvent.findMany({ where: { organizationId } })
]);

// ✅ Good: Implement pagination
const documents = await prisma.document.findMany({
  where: { organizationId },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize
});
```

### Frontend Performance
```typescript
// ✅ Good: Memoize expensive calculations
const ExpensiveComponent = ({ data }: { data: ComplexData[] }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [data]);
  
  return <div>{/* Render processed data */}</div>;
};

// ✅ Good: Debounce user input
const SearchInput = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 300);
  
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);
  
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
};

// ✅ Good: Lazy load components
const LazyDocumentList = lazy(() => import('./DocumentList'));

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyDocumentList />
    </Suspense>
  );
};
```

---

## 🔒 Security Standards

### Input Validation
```typescript
// ✅ Good: Validate all inputs
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'])
});

async function createUser(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = CreateUserSchema.parse(body);
    
    // Use validated data
    const user = await prisma.user.create({
      data: validatedData
    });
    
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

### Authentication & Authorization
```typescript
// ✅ Good: Check permissions
async function handleDeleteUser(req: NextRequest, session: any) {
  const { id } = await req.json();
  
  // Check if user can delete (only OWNER or SUPER_ADMIN)
  if (!['OWNER', 'SUPER_ADMIN'].includes(session.user.role)) {
    return createErrorResponse({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only owners can delete users',
      statusCode: 403
    });
  }
  
  // Check if user exists and belongs to organization
  const user = await prisma.user.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId
    }
  });
  
  if (!user) {
    return createErrorResponse({
      code: 'NOT_FOUND',
      message: 'User not found',
      statusCode: 404
    });
  }
  
  // Prevent self-deletion
  if (user.id === session.user.id) {
    return createErrorResponse({
      code: 'INVALID_OPERATION',
      message: 'Cannot delete your own account',
      statusCode: 400
    });
  }
  
  // Proceed with deletion
  await prisma.user.delete({ where: { id } });
  
  return createResponse(null, 'User deleted successfully');
}
```

---

## 🧪 Testing Standards

### Unit Tests
```typescript
// ✅ Good: Comprehensive unit tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'MEMBER',
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockOnUpdate = jest.fn();
  
  beforeEach(() => {
    mockOnUpdate.mockClear();
  });
  
  it('renders user information correctly', () => {
    render(<UserProfile user={mockUser} onUpdate={mockOnUpdate} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
  
  it('allows editing when isEditable is true', async () => {
    render(
      <UserProfile 
        user={mockUser} 
        onUpdate={mockOnUpdate} 
        isEditable={true} 
      />
    );
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });
  });
  
  it('calls onUpdate when saving changes', async () => {
    render(
      <UserProfile 
        user={mockUser} 
        onUpdate={mockOnUpdate} 
        isEditable={true} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    await waitFor(() => {
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    });
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockUser,
      firstName: 'Jane'
    });
  });
});
```

### Integration Tests
```typescript
// ✅ Good: API integration tests
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/users';

describe('/api/users', () => {
  it('creates a user successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        role: 'MEMBER'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('test@example.com');
  });
  
  it('validates required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com'
        // Missing required fields
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## 📚 Documentation Standards

### JSDoc Comments
```typescript
/**
 * Calculates the total price including tax and discounts
 * 
 * @param items - Array of items with price and quantity
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @param discountCode - Optional discount code
 * @returns Object containing subtotal, tax, discount, and total
 * 
 * @example
 * ```typescript
 * const items = [
 *   { price: 10.00, quantity: 2 },
 *   { price: 5.00, quantity: 1 }
 * ];
 * const total = calculateTotal(items, 0.08, 'SAVE10');
 * console.log(total.total); // 24.20
 * ```
 */
function calculateTotal(
  items: Array<{ price: number; quantity: number }>,
  taxRate: number,
  discountCode?: string
): {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
} {
  // Implementation
}
```

### Component Documentation
```typescript
/**
 * UserProfile - Displays and allows editing of user profile information
 * 
 * @component
 * @example
 * ```tsx
 * <UserProfile
 *   user={user}
 *   onUpdate={handleUpdate}
 *   isEditable={true}
 * />
 * ```
 * 
 * @param user - User data object
 * @param onUpdate - Callback function called when user data is updated
 * @param isEditable - Whether the profile can be edited (default: false)
 * @param className - Additional CSS classes to apply
 * 
 * @returns JSX element containing the user profile interface
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdate,
  isEditable = false,
  className = ''
}) => {
  // Component implementation
};
```

---

## 🎯 Code Review Checklist

### Before Submitting
- [ ] Code follows TypeScript standards
- [ ] All functions have proper type annotations
- [ ] Components are properly typed with interfaces
- [ ] API routes have comprehensive error handling
- [ ] Database queries are optimized and use proper indexes
- [ ] Security considerations are addressed
- [ ] Performance implications are considered
- [ ] Tests are written for new functionality
- [ ] Documentation is updated
- [ ] Code is properly formatted with Prettier
- [ ] ESLint passes without errors

### During Review
- [ ] Code is readable and well-structured
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Security is properly implemented
- [ ] Tests cover the functionality
- [ ] Documentation is clear and complete

---

## 📞 Getting Help

### Resources
- **Internal Documentation**: Check `DEVELOPER_DOCUMENTATION.md`
- **Architecture Guide**: Review `ARCHITECTURE_GUIDE.md`
- **Team Slack**: #avenai-dev channel
- **Code Examples**: Look at existing code for patterns

### Questions to Ask
- Is this the right approach for this use case?
- Are there any security implications?
- How will this affect performance?
- What edge cases should be considered?
- Are there existing patterns I should follow?

---

*This coding standards document is living documentation that evolves with the codebase. Last updated: September 2024*
