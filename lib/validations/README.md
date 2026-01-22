# Form Validation with Zod & React Hook Form

This directory contains Zod schemas for form validation and data validation throughout the application.

## Libraries Installed

- **zod** - TypeScript-first schema validation with static type inference
- **react-hook-form** - Performant, flexible forms with easy-to-use validation
- **@hookform/resolvers** - Validation resolvers for React Hook Form (includes Zod resolver)

## Benefits

1. **Type Safety**: Zod schemas automatically infer TypeScript types
2. **Runtime Validation**: Validate data at runtime with detailed error messages
3. **Form Performance**: React Hook Form minimizes re-renders
4. **Developer Experience**: Autocomplete and type checking for form fields
5. **Reusability**: Share validation schemas between client and server

## Usage Pattern

### 1. Define a Zod Schema

```typescript
// lib/validations/post.schema.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption is required').max(2200, 'Caption too long'),
  mediaUrl: z.string().url('Must be a valid URL'),
  scheduledFor: z.date().min(new Date(), 'Must be in the future'),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed').optional(),
});

// Infer TypeScript type from schema
export type CreatePostInput = z.infer<typeof createPostSchema>;
```

### 2. Use in React Component

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSchema, type CreatePostInput } from '@/lib/validations/post.schema';

export function CreatePostForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
  });

  const onSubmit = async (data: CreatePostInput) => {
    // data is fully typed and validated!
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="caption">Caption</label>
        <textarea {...register('caption')} id="caption" />
        {errors.caption && <span>{errors.caption.message}</span>}
      </div>

      <div>
        <label htmlFor="mediaUrl">Media URL</label>
        <input {...register('mediaUrl')} id="mediaUrl" type="url" />
        {errors.mediaUrl && <span>{errors.mediaUrl.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### 3. Use in API Routes (Server-Side Validation)

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPostSchema } from '@/lib/validations/post.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validatedData = createPostSchema.parse(body);
    
    // validatedData is fully typed and validated
    // ... save to database
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Common Zod Patterns

### String Validation
```typescript
z.string().min(3).max(100)
z.string().email()
z.string().url()
z.string().regex(/^[a-zA-Z0-9_]+$/)
z.string().trim().toLowerCase()
```

### Number Validation
```typescript
z.number().int().positive()
z.number().min(0).max(100)
z.coerce.number() // Convert string to number
```

### Date Validation
```typescript
z.date()
z.coerce.date() // Convert string to date
z.date().min(new Date())
```

### Array & Object
```typescript
z.array(z.string()).min(1).max(10)
z.object({ name: z.string(), age: z.number() })
z.record(z.string()) // Key-value pairs
```

### Optional & Nullable
```typescript
z.string().optional() // string | undefined
z.string().nullable() // string | null
z.string().nullish() // string | null | undefined
z.string().default('default value')
```

### Union & Enum
```typescript
z.union([z.string(), z.number()])
z.enum(['pending', 'published', 'failed'])
z.literal('exact-value')
```

### Custom Validation
```typescript
z.string().refine(
  (val) => val.length > 0,
  { message: 'Custom error message' }
)
```

## Advanced Patterns

### Conditional Validation
```typescript
const schema = z.object({
  type: z.enum(['image', 'video']),
  duration: z.number().optional(),
}).refine(
  (data) => data.type !== 'video' || data.duration !== undefined,
  { message: 'Duration required for videos', path: ['duration'] }
);
```

### Transform Data
```typescript
const schema = z.object({
  email: z.string().email().transform(val => val.toLowerCase()),
  tags: z.string().transform(val => val.split(',').map(t => t.trim())),
});
```

### Partial & Pick
```typescript
const fullSchema = z.object({ name: z.string(), age: z.number() });
const partialSchema = fullSchema.partial(); // All fields optional
const pickSchema = fullSchema.pick({ name: true }); // Only name field
```

## Best Practices

1. **Colocate schemas** with related features
2. **Export inferred types** for use throughout the app
3. **Reuse schemas** between client and server
4. **Use descriptive error messages** for better UX
5. **Validate early** - both client-side and server-side
6. **Keep schemas simple** - compose complex schemas from simple ones

## Resources

- [Zod Documentation](https://zod.dev)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Resolver Guide](https://github.com/react-hook-form/resolvers#zod)
