# Supabase, авторизация и перенос данных

## Purpose / Big Picture

Ежедневник перестаёт хранить цели, дела и бэклог только в браузере. Пользователь создаёт аккаунт по e-mail и паролю, входит в приложение и видит только свои записи на любом устройстве. После первого успешного входа прежние записи из `LocalStorage` переносятся в базу и удаляются из браузера.

## Progress

- [x] Зафиксировать модель данных и требования RLS (2026-08-06 00:20 MSK).
- [x] Создать SQL-миграцию и правила безопасной работы с Supabase (2026-08-06 00:45 MSK).
- [x] Добавить клиент Supabase, форму входа и выход из аккаунта (2026-08-06 00:45 MSK).
- [x] Заменить локальные адаптеры запросами к базе и реализовать одноразовый перенос (2026-08-06 00:45 MSK).
- [ ] Установить зависимости, применить миграцию к подключённому проекту и проверить сценарии.

## Surprises & Discoveries

- В среде Codex не обнаружены ни Supabase CLI, ни авторизованные инструменты Supabase MCP. Для создания удалённого проекта и применения SQL потребуется авторизация Supabase или подключённый MCP.
- `npx supabase@latest projects list` вернул `Access token not provided`; удалённая схема пока не применена.
- Первый production build выявил, что Server Component `app/page.tsx` не может передать render-функцию в Client Component `AuthGate`; страница переведена в client component.

## Decision Log

- Decision: использовать `@supabase/supabase-js` в клиентских компонентах, без серверного API-слоя на первом этапе.
  Rationale: RLS ограничивает строки на стороне Postgres, а интерфейс уже является полностью client-side.
  Date/Author: 2026-08-06 / Codex.
- Decision: отдельные таблицы для записей, групп бэклога и заметок.
  Rationale: можно эффективно сортировать и редактировать сущности без хранения всего ежедневника одним JSON-документом.
  Date/Author: 2026-08-06 / Codex.

## Outcomes & Retrospective

Клиентская миграция реализована и проходит TypeScript. Удалённая база ещё не создана: нужен Supabase access token или OAuth-вход для CLI/MCP.

## Context and Orientation

`components/dashboard.tsx` держит экранные данные. Сейчас `lib/action-storage.ts` и `lib/backlog-storage.ts` сохраняют их в `LocalStorage`. Доменные типы находятся в `lib/types.ts`. После миграции браузер содержит только сессию Supabase; пользовательские записи живут в таблицах `planner_items`, `backlog_groups` и `backlog_notes`.

## Plan of Work

Сначала добавить повторяемую SQL-миграцию в `supabase/migrations/`, включив RLS и политики владения по `auth.uid()`. Затем добавить типизированный Supabase-клиент и репозиторий запросов. `Dashboard` будет ждать сессию, показывать форму входа незалогиненному пользователю и загружать данные после аутентификации. Операции добавления, редактирования, удаления и смены порядка будут вызывать репозиторий, а не `LocalStorage`. Последним шагом будет безопасный перенос локальных данных: сначала вставка в БД, затем удаление ключей лишь при успехе.

## Concrete Steps

1. Создать `.env.local` из `.env.example` и добавить URL и publishable key проекта.
2. Выполнить SQL из `supabase/migrations/` через Supabase MCP, SQL Editor или `supabase db push`.
3. Установить зависимости: `npm install @supabase/supabase-js`.
4. Проверить: `npm run typecheck`, `npm run lint`, `npm run build` из `F:\planner`.

## Validation and Acceptance

После настройки переменных пользователь может зарегистрироваться, подтвердить e-mail при включённом подтверждении, войти и создать цель, дело и группу бэклога. После перезагрузки и входа с другого устройства те же данные доступны. Другой аккаунт не может прочитать или изменить эти строки: это подтверждается RLS-политиками и запросом под вторым пользователем.

## Idempotence and Recovery

Миграция использует `if not exists` и может быть безопасно просмотрена до применения. Локальные ключи удаляются только после успешной вставки. Если перенос не завершился, ключи остаются в браузере и попытка повторится при следующем входе. Для отката к локальным данным можно временно убрать переменные Supabase до удаления ключей.

## Interfaces and Dependencies

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — публичные параметры клиента; secret/service role в браузер не добавляются.
- `lib/supabase/client.ts` — один browser-клиент Supabase.
- `lib/planner-repository.ts` — CRUD для `ActionItem`, `BacklogGroup`, `BacklogNote`.
- `supabase/migrations/` — единственный источник SQL-схемы.

## Latest Remote Validation

- [x] Linked `F:\planner` to Supabase project `dtaekmzchfyfnsbsvydl` (2026-08-06 01:35 MSK).
- [x] Applied `20260805214420_planner_auth_schema.sql` through the Supabase Management API and marked migration `20260805214420` as applied (2026-08-06 01:36 MSK).
- [x] Verified `planner_items`, `backlog_groups`, and `backlog_notes` exist with RLS enabled (2026-08-06 01:36 MSK).
- [x] Verified local app: `npm run typecheck`, `npm run lint`, `npm run build`, and `http://localhost:3000/` (HTTP 200).
- [ ] Test real CRUD and RLS isolation with two user accounts after registering through the application.

Security Advisor reported pre-existing warnings for `public.rls_auto_enable()` (a SECURITY DEFINER function not introduced by this migration) and disabled leaked-password protection. Neither warning refers to the three planner tables or `public.set_updated_at()`.

## Milestones

### Схема и безопасность

Создать таблицы, индексы, триггер `updated_at`, RLS и политики владения. Проверка: SQL применился без ошибки, все три таблицы имеют RLS.

### Клиент и интерфейс

Подключить e-mail/password auth и заменить операции интерфейса на запросы. Проверка: типы и production build проходят.

### Удалённая проверка

Применить миграцию к проекту Supabase и вручную проверить два разных аккаунта. Проверка: данные изолированы и переживают обновление страницы.
