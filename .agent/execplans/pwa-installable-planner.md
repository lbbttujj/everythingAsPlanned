# Устанавливаемый PWA-ежедневник

## Purpose / Big Picture

Пользователь сможет установить ежедневник на телефон или компьютер как отдельное приложение. После первого открытия оболочка приложения и последняя загруженная страница будут доступны без сети; личные данные Supabase не попадут в offline-кэш.

## Progress

- [x] Проверена структура Next.js и официальная конвенция `app/manifest.ts` (2026-08-06 MSK).
- [x] Добавлены manifest, иконка и метаданные установки (2026-08-06 MSK).
- [x] Добавлены регистрация и service worker для offline-оболочки (2026-08-06 MSK).
- [x] Выполнены production-проверки (2026-08-06 MSK).

## Surprises & Discoveries

- В проекте нет `public/`; его нужно создать для service worker.
- Приложение работает через Supabase в браузере, поэтому кэширование API-ответов недопустимо.
- TypeScript manifest разрешает одно значение `purpose` на иконку, поэтому выбрано `maskable`.

## Decision Log

- Decision: использовать нативные возможности Next.js и браузера без `next-pwa`.
  Rationale: меньше зависимостей, предсказуемая работа с Next.js 15 и полный контроль над тем, что не кэшируется.
  Date/Author: 2026-08-06 / Codex.

## Outcomes & Retrospective

Manifest, SVG-иконка и service worker добавлены без новых зависимостей. `npm run typecheck`, `npm run lint` и `npm run build` завершились успешно. Локально `/`, `/manifest.webmanifest`, `/icon.svg` и `/sw.js` возвращают HTTP 200. Первоначальная сборка была заблокирована `.next/trace` активного dev-сервера; после остановки только процесса `F:\planner` сборка завершилась успешно, и dev-сервер был перезапущен.

## Context and Orientation

`app/` содержит App Router. `components/dashboard.tsx` — клиентский интерфейс ежедневника. `lib/` отвечает за Supabase и доменную логику. `public/` будет содержать файл service worker, доступный по `/sw.js`. PWA — это веб-приложение с manifest (название, иконки, режим отдельного окна) и service worker (кэш оболочки при отсутствии сети).

## Plan of Work

В `app/manifest.ts` добавить метаданные PWA. В `app/icon.svg` создать минимальную векторную иконку, а в `app/layout.tsx` задать цвет браузерной темы. Создать `components/pwa-service-worker.tsx`, который регистрирует `/sw.js` только в production. В `public/sw.js` кэшировать только same-origin статическую оболочку и навигацию; запросы Supabase и внешние запросы пропускать в сеть. Подключить компонент в корневой layout и задокументировать изменение.

## Concrete Steps

1. В `F:\planner` создать `app/manifest.ts`, `app/icon.svg`, `components/pwa-service-worker.tsx` и `public/sw.js`.
2. Обновить `app/layout.tsx` и `docs/project-log.md`.
3. Запустить `npm run typecheck`, `npm run lint`, `npm run build`.
4. Открыть `http://localhost:3000/manifest.webmanifest` и убедиться, что manifest отдаётся.

## Validation and Acceptance

- `npm run typecheck`, `npm run lint` и `npm run build` завершаются кодом 0.
- `/manifest.webmanifest`, `/icon.svg` и `/sw.js` отдаются со статусом 200.
- В браузере появляется возможность установить приложение; после установки оно открывается в standalone-окне.
- Service worker не кэширует `*.supabase.co`, API и ответы с персональными данными.

## Idempotence and Recovery

Повторная регистрация service worker обновляет его по версии кэша. Для сброса offline-оболочки достаточно изменить имя кэша в `public/sw.js` или удалить site data в браузере. Изменения не затрагивают записи Supabase.

## Interfaces and Dependencies

- `app/manifest.ts` — Next.js metadata route, доступна как `/manifest.webmanifest`.
- `components/pwa-service-worker.tsx` — клиентский компонент без props, регистрирует `/sw.js` в production.
- `public/sw.js` — service worker с cache `planner-shell-v1`; отвечает только за same-origin оболочку.
- Новые npm-зависимости не добавляются.

## Milestones

### Метаданные установки

Цель: браузер распознаёт приложение как устанавливаемое. Файлы: `app/manifest.ts`, `app/icon.svg`, `app/layout.tsx`. Проверка: открыть manifest и увидеть название, иконку, режим standalone.

### Offline-оболочка

Цель: установленное приложение сохраняет доступ к оболочке без сети, но не кэширует личные данные. Файлы: `components/pwa-service-worker.tsx`, `public/sw.js`. Проверка: DevTools показывает зарегистрированный worker и cache `planner-shell-v1`.
