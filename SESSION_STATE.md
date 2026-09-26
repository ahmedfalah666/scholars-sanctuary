# SESSION STATE

Read this first at the start of a session. It records what is being worked on, what
was decided, what broke, and where things stand. Update it before ending a session.

Last updated: 2026-09-26

---

## 0. Current status

**Two commits are local and unpushed.** Run the SQL, then push, then reload.

| Step | Action |
| --- | --- |
| 1 | Run `admin_and_soft_delete.sql` in the Supabase SQL Editor |
| 2 | Read the CHECKS output at the bottom of that file |
| 3 | `git push` |
| 4 | Redeploy, then hard-reload the browser |

**Adding an admin** is now one line and needs no code change and no redeploy:

```sql
INSERT INTO public.admin_users (email, note) VALUES ('someone@example.com', 'editor');
```

The account must also exist in Supabase Auth. Order matters: create the auth user
first, otherwise the login is refused as "not an admin".

## 1. What we are working on

Rebuilding the admin delete/restore system so it is **quiet, strong and stable**,
and adding **multi-admin support** so more than one account can manage content.


## 2. Project shape

- `src/App.jsx` — the entire application, ~4100 lines, a single monolith component.
  All state, handlers and views live here. No router, no state library.
- `public/supabase.js` — loads the Supabase client from `window.supabase`.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` are read from somewhere at runtime, not from
  a `.env` in the repo. **There is no `.env` file in this repository.**
- There is **no test suite** in `package.json`. Verification is `npm run lint` and
  `npm run build`, plus logic tests written as throwaway Node scripts.

## 3. Git history (most recent first)

| Commit | What it did |
| --- | --- |
| `5212e44` | Admin access becomes a database list; adds SESSION_STATE.md |
| `756abeb` | Fix folder delete destroying unrelated branches (`idKey`) |
| `6a6849e` | Cloud delete reports failures; trash restore uses upsert |
| `14277f6` | Fix trash restore; deletes fail closed instead of losing data |
| `2ca750b` | Add admin trash (copy rows to `trash_items` JSON, then delete) |
| `8f14372` | Self-graded essay questions with concealed model answers |
| `2114078` | Previous release from the user |

`main` tracks `origin/main`. Commits are pushed only when explicitly asked.

**`stash@{0}` — do not pop.** "WIP: admin/admin bypass + confirm-modal ref +
css/icons cleanup (pre-revert)". Pre-dates our work and was deliberately set aside.

## 4. Product rules the user has set

- Deleting a folder must take its whole subtree with it, but **nothing else**.
- Restoring must bring back exactly what was removed, intact.
- Deleted items are kept **forever**. No auto-purge.
- Student progress must survive a delete and restore cycle.
- Questions/options removed inside the editor are **not** trashed; they are not
  persisted until Save Changes.
- **Git-first.** Inspect status, commit atomically, never push unasked.
- Prefer the calmest solution. Physical deletes in a live database are considered
  a liability, not a feature.

## 5. The bugs we hit, and why

These are the reason the current design was thrown away. Do not reintroduce them.

### 5.1 Deleting a folder destroyed unrelated branches — the worst one
`collectSubtree` identified rows with `Number(id)`. `Number('local_abc')` is `NaN`,
and a `Set` treats `NaN` as equal to `NaN`, so every non-numeric id collapsed into a
single key. Deleting one folder collected unrelated branches too, then physically
deleted their rows. This emptied the `quizzes` table. Fixed by `idKey()`, which
bridges Postgres `bigint` numbers and local numeric strings via `String()` while
keeping distinct ids distinct, and treats `null` as "no parent" rather than
`Number(null) === 0`.

### 5.2 Restore filtered out the very thing being restored
Restoring one assessment required its folder to be inside the bundle. Deleting an
assessment never deletes its folder, so the folder was live and the assessment was
filtered out. The bin entry was deleted anyway, destroying it.

### 5.3 Trash entry removed before the write was attempted
Restore dropped the bin entry first, so a failed write left nothing recoverable.

### 5.4 Cloud delete errors were never checked
`await ....delete().in(...)` discarded the error. RLS rejected the delete, the row
stayed in the database, the UI dropped it locally. The delete looked successful, and
the later restore then collided on the primary key.

### 5.5 Failed deletes still destroyed data
Delete removed live rows even after failing to record them in the trash. Both paths
now fail closed.

## 6. Why the trash design was replaced

The copy-rows-to-JSON approach meant every delete physically removed rows, so:

- Foreign key cascades could fire and widen the blast radius independently of the app.
- Restore re-inserted a stale snapshot, so `created_at` and any server-generated
  columns came back wrong. Restored lectures sorted and rendered differently from
  native ones, and appeared to lose progress.
- Everything was fragile in a way that only showed up in production.

**Replacement:** a real soft delete. `deleted_at` on `groups` and `quizzes`.
Delete sets the timestamp, restore clears it, and only "Delete Forever" issues a
real `DELETE`. Nothing is destroyed, so no cascade can fire, and a restored row is
bit-for-bit the original — correct `created_at`, correct ordering, progress intact.

### 6.1 How the soft delete is wired

- `groups` and `quizzes` both carry `deleted_at timestamptz`.
- `loadData` reads live rows (`.is('deleted_at', null)`) into the existing `groups`
  and `quizzes` state, and trashed rows (`.not('deleted_at','is',null)`) into
  `trashedGroups` and `trashedQuizzes`. **The rest of the app never sees a deleted
  row**, so nothing else needed changing.
- Delete stamps `deleted_at` on the folder subtree and its assessments. Restore
  stamps `NULL`. Purge is the only real `DELETE`.
- LocalStorage mode mirrors the cloud shape exactly, using `sanctuaryTrashedGroups`
  and `sanctuaryTrashedQuizzes`. The old `sanctuaryTrash` key is abandoned.
- `softDeleteSupported` is a ref probed once at startup. If `deleted_at` is missing,
  deletion is **disabled with a message** rather than falling back to a hard delete.
- The Trash view lists only the **root of each trashed branch**. A child whose parent
  is also trashed is handled as part of its parent, so nothing is listed twice.
- `collectSubtree` is still needed, but now only to decide what to *stamp*. It can no
  longer destroy anything, which is why bug 5.1 is no longer dangerous.

## 7. Multi-admin

Admin access was hardcoded as `ahmedfalahoffical@gmail.com` in two places:
`src/App.jsx:272` (client gate) and every RLS policy (the real boundary). Adding an
admin meant editing the app, redeploying, and hand-editing ~15 policies.

**Replacement:** an `admin_users` table as the single source of truth plus an
`is_admin()` SQL function. Adding an account is one INSERT, no code change, no
redeploy.

## 8. Database schema notes

`groups` and `quizzes` were created directly in the Supabase dashboard — they are
**not** in any file in this repo, so their exact columns are unknown to us. Read
them from the database rather than guessing.

Tables the app depends on: `groups`, `quizzes`, `user_progress`, `inbox_messages`,
`reported_questions`, `site_visits`, `trash_items` (being retired).

SQL files in the repo: `essay_questions_update.sql`, `trash_system_update.sql`
(being retired), `admin_features_update.sql`.

## 9. Open items / risks

- **The SQL has not been run against the real database yet.** Everything about the
  soft delete is verified by logic tests and a clean build, not against Supabase.
  `groups` and `quizzes` have unknown column names, so the migration inserts only
  `id`, `name`, `parent_id`, `quiz_title`, `questions` and `group_id`. If those
  tables have further `NOT NULL` columns with no default, the migration step 3 will
  fail and the CHECKS output will show it.
- The `ON DELETE CASCADE` constraint on `groups.parent_id` was added at the user's
  request during debugging. `admin_and_soft_delete.sql` step 5 removes it.
- `trash_items` is retired but left in place so the migrated bundles stay
  recoverable. Drop it once the new Trash view is confirmed working.
- No automated test suite exists. The subtree and round-trip logic was verified with
  throwaway Node scripts; those scripts are not committed. Consider committing them.
- LocalStorage mode was not exercised in a browser this session.

## 10. Conventions

- No comments unless they earn their place. Existing code is sparsely commented.
- UI copy is direct and plain, no exclamation marks.
- Gold `#C5A059` / `#D4AF37` on deep navy `#0B0F19`, warm white `#FAF8F5`.
- Admin-only surfaces: Trash, Analytics, Edit, Inbox, Reports, add buttons.
