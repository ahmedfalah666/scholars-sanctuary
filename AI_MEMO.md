# Scholar's Sanctuary - Development Memo & AI Guidelines

Welcome, future AI engineer (or human developer)! This document serves as a high-level guide, architectural blueprint, and set of constraints for modifying or extending the **Scholar's Sanctuary** codebase.

---

## 📌 1. Project Overview & Technology Stack
*   **Core Framework**: React (Vite setup, built as a single-page application).
*   **Styling**: Tailwind CSS + custom inline CSS for animations/themes (located inside `index.html` or dynamically injected in `src/App.jsx`).
*   **Database**: Supabase backend (PostgreSQL) with a dynamic LocalStorage fallback.
*   **Key Icons**: `lucide-react`.

---

## 🗺️ 2. Application Architecture & View Routing
The application is a single-page app (SPA) that controls visibility using the `currentView` state. When extending the app, make sure to handle routing state transitions gracefully:
*   `dashboard`: Main portal showing academic subgroups (folders) and assessments.
*   `taking_quiz`: Active quiz session showing questions, pagination jump nodes, option buttons, hotkey help, and a feedback report button.
*   `review`: Assessment summary displaying score metrics, incorrect responses, correct but uncertain answers review, and retake/exit triggers.
*   `add_quiz`: Administration view for importing JSON quizzes (single or bulk format).
*   `prompt`: Display page showing the AI Exam Generator system prompt template for copy-pasting.
*   `reports`: Admin-only view to review, investigate, and mark user reports as resolved.

---

## 📁 3. Category & Folder Hierarchy (Subgroups)
Subgroups function as recursive folders using a self-referential parent-child hierarchy:
*   Each group object contains: `id`, `name`, `parent_id` (pointing to parent subgroup `id` or `null` if root).
*   **Breadcrumbs**: Computed on-the-fly via `getBreadcrumbs()` by walking up the parents starting from `currentGroupId`.
*   **Relocation**: Admins can relocate quizzes by updating `group_id`. Ensure you coerce string selections to integers when communicating with PostgreSQL bigint types.

---

## ⚡ 4. Database Schema & Synchronization
The system is dual-mode: it uses **Supabase** when available and falls back to **LocalStorage** when offline or if Supabase environment variables are missing.

### Dynamic SDK Loading
Rather than bundling the Supabase client library, the code dynamically injects the Supabase SDK CDN script if `window.supabase` is not already loaded:
```javascript
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
```
Ensure that any new database queries verify `isSupabaseLoaded && !!supabaseRef.current` before executing.

### Database Tables Structure
See [supabase_schema.md](file:///C:/scholars-sanctuary/supabase_schema.md) for full SQL declarations.
1.  `groups`: Folder structures (`id`, `name`, `parent_id`).
2.  `quizzes`: Exams data containing a `questions` JSONB column (`id`, `quiz_title`, `questions`, `group_id`).
3.  `user_progress`: Tracks student progress (`user_id`, `quiz_id`, `current_question_index`, `user_answers`, `uncertain_questions`, `status`, `updated_at`).
4.  `inbox_messages`: Global updates broadcasted by the admin (`id`, `message`, `created_at`).
5.  `reported_questions`: User-flagged questions with errors (`id`, `quiz_id`, `quiz_title`, `question_index`, `question_text`, `reason`, `status`, `created_at`).

---

## 🛡️ 5. Security & Anti-Flooding Controls
To protect the database backend from DDoS or form-spamming attacks, a custom client-side rate limiter is built into mutations (`verifyRateLimit()`):
*   **Window**: Triggers when 6 or more mutation requests are received within 10 seconds.
*   **Block Time**: Activates a 15-second lockdown during which all database mutations are blocked, and a security overlay (`isFloodingBlocked`) is shown to the user.
*   **Usage**: Run `verifyRateLimit()` before *any* database mutation (e.g., category creation, folder edits, sending updates, submitting reports, updating progress states).

---

## ⌨️ 6. Keyboard Interactions & Hotkeys
When in the `taking_quiz` view, keyboard hotkeys are active unless an input/textarea is currently focused:
*   `1`, `2`, `3`, `4`: Select option `A`, `B`, `C`, or `D` respectively (if the question has not yet been answered).
*   `c` / `C`: Toggles the uncertainty state of the current question.
*   `ArrowLeft`: Move to the previous question.
*   `ArrowRight`: Move to the next question, or finish the assessment if on the last question.

---

## 📥 7. Quiz Import & JSON Parsing
The JSON importer automatically extracts clean content:
*   It strips markdown blocks (e.g. ` ```json ... ``` `) before running `JSON.parse`.
*   **Single Quiz Format**:
    ```json
    {
      "quizTitle": "Lecture Title",
      "questions": [...]
    }
    ```
*   **Bulk Quizzes Format** (Dictionary structure):
    ```json
    {
      "quizzes": {
        "Lecture 1": { "quizTitle": "Lecture 1 Title", "questions": [...] },
        "Lecture 2": { "quizTitle": "Lecture 2 Title", "questions": [...] }
      }
    }
    ```

---

## 🎨 8. Design Tokens & Styling Guide
The interface uses a premium "academic luxury" styling system. Do not deviate from these color guidelines when adding elements:
*   **Primary Accent**: `#C5A059` (Warm Gold)
*   **Secondary Accent**: `#D4AF37` (Luxury Gold)
*   **Dark Mode Background**: `#0B0F19` (Deep Luxury Navy)
*   **Light Mode Background**: `#FAF8F5` (Academic Warm White)
*   **Card Backgrounds**: Semitransparent glass backdrop-blur (`backdrop-blur-md`, `bg-white/40` or `bg-slate-900/40`) with fine gold borders.

---

## ⚠️ 9. Rules for Future Modifications
1.  **Maintain LocalStorage Fallback**: Every action (create folder, delete group, add quiz, save progress, send inbox, file report) must check if Supabase is offline. If offline, the code must correctly update LocalStorage so the app remains fully functional.
2.  **Rate-Limiter Integration**: Ensure any new action that writes to the database calls `verifyRateLimit()`. If it returns `false`, abort the mutation.
3.  **Authentication Constraints**: Only the email `ahmedfalahoffical@gmail.com` represents the admin. The user identifier is stored locally inside localStorage as `sanctuaryUserId` to persist state across sessions without enforcing signups on students.
4.  **Preserve Signatures**: The signature footer template with `Ahmed Falah Hasan` and `Rawan Husien` must be preserved to honor the authors' project footprint.
