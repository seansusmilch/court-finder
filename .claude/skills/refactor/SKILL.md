---
name: refactor
description: Skill for refactoring code to be less coupled, easier to maintain, more reusable, more intuitive, and easier to read. Follows DRY principle while preserving all existing functionality.
---

# Code Refactoring

This skill provides a systematic approach to refactoring code for better maintainability, reusability, and clarity—without breaking existing functionality.

## Philosophy

**Improve structure, preserve behavior.**

- **First rule of refactoring:** Do not change what the code does, only how it does it
- **DRY (Don't Repeat Yourself):** Every piece of knowledge must have a single, unambiguous representation
- **Decouple:** Reduce dependencies between modules—components should know as little as possible about each other

## Process Overview

```
1. UNDERSTAND  → Read and understand current code and its behavior
2. IDENTIFY    → Find smells: duplication, coupling, complexity
3. PLAN        → Design the improved structure
4. REFACTOR    → Apply changes incrementally
5. VERIFY      → Ensure behavior is unchanged
```

---

## Step 1: Understand the Code

Before changing anything, thoroughly understand what the code does.

**Analyze the code:**
- Identify inputs and outputs
- Recognize side effects
- List dependencies
- Document edge cases

---

## Step 2: Identify Code Smells

Look for these common smells that indicate refactoring is needed:

### Duplication (DRY Violation)

The same or similar code appears in multiple places:

```ts
// ❌ Duplicated: same validation logic repeated
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validateUserInput(user: { email: string }): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Duplicated!
  return regex.test(user.email);
}

// ✅ Extract to shared function
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function validateUserInput(user: { email: string }): boolean {
  return isValidEmail(user.email);
}
```

### Long Functions

Functions that do too many things are hard to understand and reuse:

```ts
// ❌ Long function: mixes concerns
function processOrder(order: Order) {
  // Validate
  if (!order.email || !order.items.length) return;
  // Calculate total
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  // Apply discount
  if (order.couponCode === 'SAVE10') total *= 0.9;
  // Save to database
  db.orders.insert({ ...order, total });
  // Send email
  emailService.send(order.email, 'Order confirmed!');
  return total;
}

// ✅ Split into focused functions
function validateOrder(order: Order): void {
  if (!order.email) throw new Error('Email required');
  if (!order.items.length) throw new Error('Items required');
}

function calculateTotal(items: Item[], couponCode?: string): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return couponCode === 'SAVE10' ? total * 0.9 : total;
}

function saveOrder(order: Order, total: number): void {
  db.orders.insert({ ...order, total });
}

function sendConfirmation(email: string): void {
  emailService.send(email, 'Order confirmed!');
}

// Orchestration function is now clear
function processOrder(order: Order): number {
  validateOrder(order);
  const total = calculateTotal(order.items, order.couponCode);
  saveOrder(order, total);
  sendConfirmation(order.email);
  return total;
}
```

### High Coupling

Components that depend heavily on implementation details of other components:

```tsx
// ❌ Tightly coupled: knows too much about UserCard internals
function UserProfile({ userId }: { userId: string }) {
  const user = useQuery(api.users.get, { id: userId });
  return (
    <div>
      <UserCard
        name={user.name}
        email={user.email}
        avatar={user.avatarUrl}
        showBadge={user.role === 'admin'}
        badgeText={user.role}
        onEdit={() => router.push(`/users/${userId}/edit`)}
        onDelete={() => api.users.delete(userId)}
      />
    </div>
  );
}

// ✅ Loosely coupled: pass minimal props, let component handle its logic
function UserProfile({ userId }: { userId: string }) {
  const user = useQuery(api.users.get, { id: userId });
  if (!user) return null;
  return <UserCard user={user} />;
}
```

### Magic Numbers/Strings

Hard-coded values that should be named constants:

```ts
// ❌ Magic numbers
function calculateScore(attempts: number, successes: number): number {
  if (attempts === 0) return 0;
  return (successes / attempts) * 100;
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'F';
}

// ✅ Named constants
const MIN_ATTEMPTS = 0;
const SCORE_MULTIPLIER = 100;
const GRADE_BOUNDARIES = { A: 90, B: 80, C: 70 };

function calculateScore(attempts: number, successes: number): number {
  if (attempts === MIN_ATTEMPTS) return 0;
  return (successes / attempts) * SCORE_MULTIPLIER;
}

function getGrade(score: number): string {
  if (score >= GRADE_BOUNDARIES.A) return 'A';
  if (score >= GRADE_BOUNDARIES.B) return 'B';
  if (score >= GRADE_BOUNDARIES.C) return 'C';
  return 'F';
}
```

### Poor Names

Names that don't reveal intent:

```ts
// ❌ Poor names
function proc(d: Data): Result {
  const x = d.items.filter(i => i.st);
  return { v: x.length };
}

// ✅ Descriptive names
function countAvailableItems(data: Data): ItemCountResult {
  const availableItems = data.items.filter(item => item.isInStock);
  return { count: availableItems.length };
}
```


---

## Step 3: Plan the Refactoring

Design the improved structure before writing code.

**Answer these questions:**
1. What is the single responsibility of each function?
2. What can be extracted to a shared utility?
3. What dependencies can be inverted or injected?
4. What types can be made more explicit?

**Sketch the new structure:**
```markdown
## Proposed Structure

### Extract to utils/
- `formatDate()` — shared date formatting
- `isValidEmail()` — email validation

### Split component
- `<UserCard />` — presentational, takes user prop
- `useUserActions()` — hook for edit/delete logic

### New types
- `UserWithActions` — combines user with action handlers
```

---

## Step 4: Refactor Incrementally

Apply changes one at a time, verifying after each.

### Extraction: Pull Up Method

When duplicate code exists in multiple places, extract it:

```ts
// Before: duplication in two components
function CourtList({ courts }: { courts: Court[] }) {
  const nearby = courts.filter(c => c.distanceMiles <= 5);
  // ...
}

function FavoritesList({ courts }: { courts: Court[] }) {
  const nearby = courts.filter(c => c.distanceMiles <= 5);
  // ...
}

// After: extract to utility
function filterNearby(courts: Court[], maxMiles: number = 5): Court[] {
  return courts.filter(c => c.distanceMiles <= maxMiles);
}
```

### Extraction: Extract Function

When a function does too much, split it:

```ts
// Before: one long function
function renderCourtCard(court: Court): HTMLElement {
  const el = document.createElement('div');
  el.className = 'court-card';

  const name = document.createElement('h3');
  name.textContent = court.name;
  el.appendChild(name);

  const distance = document.createElement('p');
  distance.textContent = `${court.distanceMiles} mi away`;
  el.appendChild(distance);

  if (court.isOutdoor) {
    const badge = document.createElement('span');
    badge.textContent = 'Outdoor';
    badge.className = 'badge';
    el.appendChild(badge);
  }

  return el;
}

// After: split into focused functions
function createElement(tag: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function createBadge(text: string): HTMLElement {
  const badge = createElement('span', 'badge');
  badge.textContent = text;
  return badge;
}

function renderCourtCard(court: Court): HTMLElement {
  const card = createElement('div', 'court-card');
  card.appendChild(createElement('h3')).textContent = court.name;
  card.appendChild(createElement('p')).textContent = `${court.distanceMiles} mi away`;
  if (court.isOutdoor) card.appendChild(createBadge('Outdoor'));
  return card;
}
```

### Simplification: Reduce Parameters

Too many parameters indicate a function is doing too much:

```ts
// ❌ Too many parameters
function updateUser(
  id: string,
  name?: string,
  email?: string,
  avatar?: string,
  role?: string,
  preferences?: UserPreferences
) { /* ... */ }

// ✅ Use an options object
interface UpdateUserOptions {
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  preferences?: UserPreferences;
}

function updateUser(id: string, options: UpdateUserOptions) { /* ... */ }
```

### Simplification: Early Returns

Reduce nesting by returning early:

```ts
// ❌ Deep nesting
function processCourt(court: Court | null): string {
  if (court !== null) {
    if (court.isActive) {
      if (court.isPublic) {
        return 'Public active court';
      } else {
        return 'Private active court';
      }
    } else {
      return 'Inactive court';
    }
  } else {
    return 'No court';
  }
}

// ✅ Early returns
function processCourt(court: Court | null): string {
  if (!court) return 'No court';
  if (!court.isActive) return 'Inactive court';
  return court.isPublic ? 'Public active court' : 'Private active court';
}
```

### Decoupling: Dependency Injection

Instead of hard-coding dependencies, pass them in:

```ts
// ❌ Hard-coded dependency
import { emailService } from './email-service';

function sendNotification(userId: string, message: string) {
  const user = db.users.findById(userId);
  emailService.send(user.email, message);
}

// ✅ Injected dependency
interface NotificationService {
  send(email: string, message: string): void;
}

function sendNotification(
  userId: string,
  message: string,
  notifier: NotificationService
) {
  const user = db.users.findById(userId);
  notifier.send(user.email, message);
}
```

---

## Step 5: Verify Behavior

After each refactoring step, verify behavior is unchanged.

### Type Check

```bash
bun check-types
```

Fix any type errors. New types introduced during refactoring should be explicit.

### Run Tests

```bash
bun test
```

If tests fail, either:
- The refactoring changed behavior (fix the code)
- The test was brittle and needs updating (rare—prefer fixing code)

### Manual Verification

For UI changes:
1. Start dev server (`bun dev`)
2. Test the refactored component
3. Check edge cases (empty states, loading, errors)

### Self-Review Questions

- [ ] Does the code do exactly what it did before?
- [ ] Is duplication reduced?
- [ ] Are functions shorter and more focused?
- [ ] Are names more descriptive?
- [ ] Is coupling reduced?
- [ ] Are types more explicit?

---

## Refactoring Checklist

Use this checklist when refactoring:

### Structure
- [ ] No duplicated logic (DRY)
- [ ] Each function has one clear responsibility
- [ ] Functions are under 20-30 lines when possible
- [ ] Related code is grouped together

### Naming
- [ ] Functions use descriptive verbs (`calculateTotal`, `isValidEmail`)
- [ ] Variables describe their content (`userEmail` not `data`)
- [ ] Booleans use `is/has/should` prefix (`isActive`, `hasItems`)
- [ ] Types use PascalCase (`UserProfile`, `CourtFilters`)

### Coupling
- [ ] Components receive data via props, not fetched internally
- [ ] Dependencies are injected, not hard-coded
- [ ] Modules know minimal details about each other

### Types
- [ ] No `any` types unless absolutely necessary
- [ ] Function parameters and return types are explicit
- [ ] Related values are grouped in interfaces/types

### Constants
- [ ] No magic numbers
- [ ] No magic strings (use enums or const objects)
- [ ] Configuration values are in a constants file

### Comments
- [ ] Unnecessary comments removed (code is self-documenting)

---

## Common Patterns

### Extracting Custom Hooks

```tsx
// Before: component has mixed concerns
function CourtCard({ courtId }: { courtId: string }) {
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCourt(courtId)
      .then(setCourt)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [courtId]);

  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  return <div>{court?.name}</div>;
}

// After: extract hook
function useCourt(courtId: string) {
  const [state, setState] = useState<{
    court: Court | null;
    loading: boolean;
    error: Error | null;
  }>({ court: null, loading: true, error: null });

  useEffect(() => {
    fetchCourt(courtId)
      .then((court) => setState({ court, loading: false, error: null }))
      .catch((error) => setState({ court: null, loading: false, error }));
  }, [courtId]);

  return state;
}

// Component is now simpler
function CourtCard({ courtId }: { courtId: string }) {
  const { court, loading, error } = useCourt(courtId);
  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  return <div>{court?.name}</div>;
}
```

### Composing Small Functions

```ts
// Before: one complex function
function formatCourtDistance(court: Court, userLocation?: Location): string {
  if (!userLocation) return `${court.distanceMiles} mi`;
  if (court.distanceMiles < 0.1) return 'Right here';
  if (court.distanceMiles < 0.5) return 'Walking distance';
  if (court.distanceMiles < 2) return 'Short drive';
  return `${court.distanceMiles.toFixed(1)} mi`;
}

// After: compose small functions
function formatExactDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

function getDistanceCategory(miles: number): string | null {
  if (miles < 0.1) return 'Right here';
  if (miles < 0.5) return 'Walking distance';
  if (miles < 2) return 'Short drive';
  return null;
}

function formatCourtDistance(court: Court, userLocation?: Location): string {
  const category = userLocation ? getDistanceCategory(court.distanceMiles) : null;
  return category ?? formatExactDistance(court.distanceMiles);
}
```

---

## Key Files

- `src/lib/utils.ts` — Shared utility functions
- `src/hooks/` — Custom React hooks
- `src/lib/constants.ts` — Application constants
- `src/lib/types.ts` — Shared type definitions
