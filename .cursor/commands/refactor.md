Refactor the code to be more maintainable, more readable, and intuitive while maintaining the exact same functionality. Follow the principles detailed below.

## DRY Principle

- The DRY (Don't Repeat Yourself) principle in software engineering focuses on avoiding code duplication.
- It encourages placing each piece of knowledge, logic, or functionality in only one clear, central location in the codebase.
- Applying DRY improves maintainability, readability, and reduces errors caused by having multiple, inconsistent implementations.

## Dumb and Reusable Components

- **Definition**: Dumb (presentational) components and utility functions are focused solely on presenting data or encapsulating a single, generic behavior.
- **Single Responsibility**: Each function or component should do one thing well, reducing surprises and simplifying future changes.
- **No Side Effects**: These components should not access or mutate global state, application state, or perform API calls.
- **Props/Arguments Only**: Accept all inputs as props (for components) or function arguments (for utilities).
- **Stateless**: Dumb components should rely entirely on the data provided to them and not hold their own state (except for local UI state, if necessary).

### Example (React Component)

```tsx
// src/components/ui/Button.tsx
import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```

### Example (Utility Function)

```ts
// src/lib/utils/formatDate.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}
```

### Guidelines

- Place dumb UI components in `src/components/ui`.
- Place reusable utility functions in `src/lib/utils`.
- Ensure no business logic or side effects in these functions/components.
- Use TypeScript types for all props and arguments.
