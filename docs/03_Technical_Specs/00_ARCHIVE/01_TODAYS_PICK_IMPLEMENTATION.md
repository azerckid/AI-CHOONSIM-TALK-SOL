# Admin System Configuration Feature Specification
> Created: 2026-02-08
> Last Updated: 2026-02-08

## 1. Overview
This document outlines the implementation plan for the **"Today's Pick" Management** feature within the Admin Console.
Currently, the "Today's Pick" on the home screen is hardcoded or defaults to the first character.
This feature enables authorized administrators to manually select and update the "Today's Pick" character via the Admin UI, storing the setting in the database.

## 2. Requirements

### 2.1 Functional Requirements
1.  **System Settings Schema**: Introduce a new database table or extend an existing configuration table to store global system settings.
    *   Key: `TODAYS_PICK_CHARACTER_ID`
    *   Value: `character_id` (string)
2.  **Admin UI**: Create a new "System" or "Content > Home" section in the Admin Console.
    *   Display a dropdown or selector list of all active characters.
    *   Show the currently selected "Today's Pick".
    *   "Save" button to update the setting.
3.  **API Integration**:
    *   `loader`: Fetch the current `TODAYS_PICK_CHARACTER_ID`.
    *   `action`: Update the `TODAYS_PICK_CHARACTER_ID` in the database.
4.  **Frontend Integration (Home Screen)**: Update `app/routes/home.tsx` to fetch the "Today's Pick" based on the stored system setting instead of the current hardcoded logic.

### 2.2 UI/UX Design
*   **Location**: `/admin/content/home` or a dedicated "Spotlight" tab in `/admin/characters`.
*   **Component**:
    *   A card displaying "Current Today's Pick".
    *   A list of available characters with radio buttons or a "Select" button.
    *   Visual feedback (toast notification) upon successful update.

## 3. Technical Implementation Plan

### 3.1 Database Schema (Drizzle ORM)
Create a new table `system_settings` to store key-value pairs for global configurations.

```typescript
// app/db/schema.ts

export const systemSettings = sqliteTable("SystemSettings", {
    key: text("key").primaryKey(), // e.g., 'TODAYS_PICK_ID'
    value: text("value").notNull(), // e.g., 'character_uuid'
    description: text("description"),
    updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
});
```

### 3.2 Backend Logic
1.  **Migration**: Run `drizzle-kit push` to create the table.
2.  **Service Layer**: Add helper functions to `getSystemSetting(key)` and `setSystemSetting(key, value)`.

### 3.3 Admin Route (`app/routes/admin/system.tsx` or new `.../content/home.tsx`)
*   **Loader**:
    *   Fetch all characters: `db.query.character.findMany()`
    *   Fetch current setting: `db.query.systemSettings.findFirst({ where: eq(key, 'TODAYS_PICK_ID') })`
*   **Action**:
    *   Handle form submission to upsert the `TODAYS_PICK_ID` record.

### 3.4 Client Update (`app/routes/home.tsx`)
*   **Loader**:
    *   Instead of `allCharacters[0]`, fetch the ID from `systemSettings`.
    *   `const pickId = await getSystemSetting('TODAYS_PICK_ID');`
    *   `const todaysPick = allCharacters.find(c => c.id === pickId) || allCharacters[0];`

## 4. Work Checklist
- [ ] **Step 1**: Create `SystemSettings` schema and apply migration.
- [ ] **Step 2**: Create/Update Admin Route for managing system settings (`Today's Pick`).
- [ ] **Step 3**: Update `home.tsx` loader to use the dynamic setting.
- [ ] **Step 4**: Verify functionality (Change in Admin -> Refresh Home).

## 5. Future Considerations
*   **Trending Idols**: Can be expanded to a list of IDs stored in the same `system_settings` table (JSON array) for manual curation.
*   **Scheduling**: Future update could allow scheduling "Today's Pick" in advance.


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
