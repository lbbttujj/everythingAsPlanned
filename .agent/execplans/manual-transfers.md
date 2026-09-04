# Ручной разбор и перенос мыслей

## Purpose / Big Picture
Дело можно вручную убрать в «Разобрать», а личную запись из «Мыслей» перенести на сегодня вместе с файлом.

## Progress
- [x] Изучены записи, вложения и текущий разбор.
- [x] Добавлены и применены миграция и RPC; клиентские действия готовы.
- [x] Typecheck, lint, production build и SQL-тесты с rollback прошли.

## Surprises & Discoveries
Разбор вычислялся только по прошедшей дате. Вложения имеют ровно одного родителя, поэтому смена родителя и удаление заметки должны быть атомарны.

## Decision Log
- Decision: Добавить needs_review, не подменять дату прошлой. RPC переноса использует security invoker, auth.uid и блокировку заметки.
  Rationale: Сохранение истории дат, RLS и защита от двойного переноса.
  Date/Author: 2026-09-05 / Codex.

## Context and Orientation
Dashboard управляет состоянием, TodayList и WeekCalendar показывают дела, BacklogBoard — мысли. Repository вызывает Supabase. Существующие данные хранятся в БД, LocalStorage не меняется.

## Plan of Work
Добавить поле в planner_items и тип ActionItem. Исключать помеченные дела из календаря; показывать в разборе независимо от регулярности. Назначение даты снимает флаг. Создать транзакционный RPC переноса заметки с вложениями. Добавить кнопки в TodayList, WeekCalendar и BacklogBoard.

## Concrete Steps
Создать миграцию через Supabase CLI, применить MCP. Проверить npm run typecheck, npm run lint и npm run build отдельно от dev-сервера.

## Validation and Acceptance
Ручной разбор сохраняется после reload. Назначение даты возвращает дело в календарь. Перенос мысли сохраняет текст и файл и убирает исходную заметку. Повторный вызов не дублирует дело. Чужая заметка недоступна.

## Idempotence and Recovery
DDL аддитивный. RPC выполняется транзакционно; ошибка оставляет исходные данные. Никакие реальные пользовательские записи не используются в SQL-тестах.

## Interfaces and Dependencies
needsReview ↔ needs_review boolean. move_backlog_note_to_today(note_id, target_date) возвращает UUID дела. UI блокирует повторный клик на время запроса.

## Outcomes & Retrospective
Проверены перенос текста и вложения, запрет чужого доступа, отсутствие дубля при повторном RPC, сохранение needs_review. Реальные данные не изменялись тестами. Security Advisors показывают прежние предупреждения rls_auto_enable и leaked password protection; новый RPC не отмечен. Визуальная проверка авторизованного интерфейса не проводилась.
