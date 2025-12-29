# TDD Task Format (Type A)

Use this format for: New features, refactoring, bug fixes.

## Task Structure Format

Each task should include:
- **Files:** Exact paths for creation, modification, and testing
- **Step 1-5:** Follow TDD pattern with specific commands and expected outputs
- Complete code examples (not conceptual descriptions)
- Precise file paths and line references

## Example Task Format

```markdown
## Task 1: Create User Authentication Service

**Files:**
- Create: `src/services/auth.ts`
- Create: `src/services/__tests__/auth.test.ts`
- Modify: `src/types/index.ts`

**Step 1: Write failing test**
```typescript
// src/services/__tests__/auth.test.ts
describe('AuthService', () => {
  it('should validate user credentials', () => {
    const auth = new AuthService();
    expect(auth.validate('user', 'pass')).toBe(true);
  });
});
```

**Step 2: Verify test fails**
```bash
npm test -- auth.test.ts
# Expected: FAIL - AuthService is not defined
```

**Step 3: Implement minimal code**
```typescript
// src/services/auth.ts
export class AuthService {
  validate(username: string, password: string): boolean {
    return username.length > 0 && password.length > 0;
  }
}
```

**Step 4: Verify tests pass**
```bash
npm test -- auth.test.ts
# Expected: PASS
```

**Step 5: Commit**
```bash
git add . && git commit -m "feat(auth): add user credential validation"
```
```

## Task Granularity

Each step = 2-5 minute action:
1. Write failing test
2. Verify test fails
3. Implement minimal code
4. Verify tests pass
5. Commit changes

## Multiple Tasks Example

```markdown
## Task 1: Add User Type
**Files:** Create `src/types/user.ts`
[Steps 1-5...]

## Task 2: Create User Repository
**Files:** Create `src/repositories/userRepository.ts`, `src/repositories/__tests__/userRepository.test.ts`
[Steps 1-5...]

## Task 3: Add User Service
**Files:** Create `src/services/userService.ts`
[Steps 1-5...]
```
