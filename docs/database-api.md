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

Восстановление пароля использует встроенный Auth-поток Supabase: `resetPasswordForEmail` отправляет ссылку на текущий домен приложения, а после перехода `updateUser({ password })` сохраняет новый пароль в recovery-сессии. В Supabase Auth → URL Configuration должен быть указан production-домен в `Site URL` и разрешён `https://<домен>/**` в `Redirect URLs`; для локальной разработки также нужен `http://localhost:3000/**`.

Также доступен Google OAuth через `signInWithOAuth({ provider: "google" })`. Настройка Google Cloud и Redirect URLs описана в `docs/google-auth.md`.

## Настройка окружения

Скопировать `.env.example` в `.env.local`, вставить данные из Supabase **Connect**, затем перезапустить `npm run dev`. `.env.local` игнорируется Git.

## Вложения

Приватный bucket `planner-attachments` хранит файлы до 6 МБ. Таблица `attachments` связывает каждый объект с целью/делом (`planner_item_id`) или заметкой бэклога (`backlog_note_id`), хранит имя, MIME-тип, размер и Storage path. Репозиторий загружает файлы после сохранения записи и удаляет объекты Storage при удалении цели, дела, заметки или всей группы бэклога.

## Регулярные дела

`recurring_tasks` хранит шаблон регулярного дела: текст, важность, ответы, последствия и правило повторения. У созданных экземпляров в `planner_items` записывается `recurring_task_id`; само расписание также остаётся в `recurrence` для отображения. При редактировании серии приложение обновляет шаблон, удаляет будущие незавершённые экземпляры и создаёт их заново по новому правилу. Завершённые прошлые дела сохраняются как история.

Для старых серий без `recurring_task_id` используется прежний `recurrence.seriesId`. При первом редактировании им создаётся шаблон и все следующие экземпляры получают связь с ним.

## Совместные списки

Совместные списки хранятся отдельно от личного бэклога:

- `shared_lists` — название и единственный владелец списка;
- `shared_list_members` — участники, их e-mail и состояние доступа;
- `shared_list_invitations` — приглашения со статусами `pending`, `accepted`, `declined`, `cancelled`;
- `shared_list_items` — текстовые пункты, выполнение, автор и общий порядок.

`lib/shared-list-repository.ts` загружает доступные списки, участников, пункты и входящие приглашения, вызывает RPC управления доступом и выполняет CRUD пунктов. После drag & drop позиции обновляются пакетом по принципу last-write-wins. Realtime пока не используется: чужие изменения загружаются при следующем входе во вкладку «Общие».

Транзакционные RPC: `create_shared_list`, `invite_shared_list_member`, `respond_shared_list_invitation`, `cancel_shared_list_invitation`, `remove_shared_list_member`, `leave_shared_list`, `delete_shared_list`. Публичные функции работают как `SECURITY INVOKER`, а защищённая реализация находится в неэкспонируемой схеме `private`. Выполнение разрешено только роли `authenticated`.

RLS разрешает читать списки, участников и пункты только активным участникам. Приглашение также видит получатель, если нормализованный e-mail из JWT совпадает с `invited_email`. Только владелец управляет списком и составом; каждый участник может менять пункты и выйти самостоятельно. `list_id` и автор пункта после создания неизменяемы благодаря ограничениям прав на уровне колонок.
