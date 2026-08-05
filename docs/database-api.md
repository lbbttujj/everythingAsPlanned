# База данных и API

## Назначение

Supabase хранит пользовательские данные ежедневника. Доступ выполняется из браузера через `@supabase/supabase-js`; безопасность задаёт PostgreSQL Row Level Security (RLS). Браузер получает только publishable key. `service_role` и пароль базы никогда не попадают в клиент или Git.

## Таблицы

### `planner_items`

Цели и дела пользователя. Поля: `id` (UUID), `user_id` (владелец из `auth.users`), `kind` (`goal` или `act`), `title`, `details`, `values` (JSON-массив ценностей), `consequences`, `answers`, `goal_assessment` (JSON), `score`, `status`, `is_completed`, `scheduled_for`, `position`, `created_at`, `updated_at`.

### `backlog_groups`

Группы заметок: `id`, `user_id`, `title`, `position`, `created_at`, `updated_at`.

### `backlog_notes`

Заметки в группе: `id`, `user_id`, `group_id` (FK с каскадным удалением), `text`, `created_at`, `updated_at`.

Каждая таблица имеет RLS: аутентифицированный пользователь может `select`, `insert`, `update`, `delete` только строк, где `user_id = auth.uid()`. Для `insert` и `update` применяется `WITH CHECK`, поэтому владельца нельзя подменить.

## Клиентские запросы

Модуль `lib/planner-repository.ts` — единственная точка доступа к данным.

- `loadPlannerData()` — загружает записи, группы и заметки текущего пользователя.
- `saveAction(item)` / `deleteAction(id)` — создаёт, обновляет или удаляет цель/дело.
- `saveBacklogGroup(group)` / `deleteBacklogGroup(id)` — работает с группой.
- `saveBacklogNote(note)` / `deleteBacklogNote(id)` — работает с заметкой.
- `migrateLegacyLocalData()` — один раз переносит прежние `planner.actions.v3` и `planner.backlog.v1`, удаляя их только после успешной записи.

Ошибки Supabase пробрасываются в интерфейс. При ошибке пользователь видит сообщение, а локальное состояние не считается сохранённым.

## Авторизация

`components/auth-gate.tsx` использует e-mail и пароль: регистрация через `signUp`, вход через `signInWithPassword`, выход через `signOut`. Если в Supabase включено подтверждение e-mail, после регистрации нужно подтвердить письмо и затем войти.

## Настройка окружения

Скопировать `.env.example` в `.env.local`, вставить данные из Supabase **Connect**, затем перезапустить `npm run dev`. `.env.local` игнорируется Git.
