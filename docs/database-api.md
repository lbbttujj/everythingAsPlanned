# База данных и API

## Назначение

Supabase хранит пользовательские данные ежедневника. Доступ выполняется из браузера через `@supabase/supabase-js`; безопасность задаёт PostgreSQL Row Level Security (RLS). Браузер получает только publishable key. `service_role` и пароль базы никогда не попадают в клиент или Git.

## Таблицы

### `planner_items`

Цели и дела пользователя. Поля: `id` (UUID), `user_id` (владелец из `auth.users`), `kind` (`goal` или `act`), `title`, `details`, `values` (JSON-массив ценностей), `consequences`, `answers`, `goal_assessment` (JSON), `score`, `status`, `is_important`, `is_completed`, `scheduled_for`, `position`, `created_at`, `updated_at`. Важные дела выводятся первыми в списках дня и недели.

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

Также доступен Google OAuth через `signInWithOAuth({ provider: "google" })`. Настройка Google Cloud и Redirect URLs описана в `docs/google-auth.md`.

## Настройка окружения

Скопировать `.env.example` в `.env.local`, вставить данные из Supabase **Connect**, затем перезапустить `npm run dev`. `.env.local` игнорируется Git.

## Вложения

Приватный bucket `planner-attachments` хранит файлы до 6 МБ. Таблица `attachments` связывает каждый объект с целью/делом (`planner_item_id`) или заметкой бэклога (`backlog_note_id`), хранит имя, MIME-тип, размер и Storage path. Репозиторий загружает файлы после сохранения записи и удаляет объекты Storage при удалении цели, дела, заметки или всей группы бэклога.

## Регулярные дела

`recurring_tasks` хранит шаблон регулярного дела: текст, важность, ответы, последствия и правило повторения. У созданных экземпляров в `planner_items` записывается `recurring_task_id`; само расписание также остаётся в `recurrence` для отображения. При редактировании серии приложение обновляет шаблон, удаляет будущие незавершённые экземпляры и создаёт их заново по новому правилу. Завершённые прошлые дела сохраняются как история.

Для старых серий без `recurring_task_id` используется прежний `recurrence.seriesId`. При первом редактировании им создаётся шаблон и все следующие экземпляры получают связь с ним.
