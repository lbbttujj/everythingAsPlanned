# Правила работы с Supabase

1. Перед изменением Supabase сверяй актуальную документацию и используй миграцию в `supabase/migrations/`; не меняй рабочую схему только вручную в Dashboard.
2. В каждой новой таблице схемы `public` включай RLS и создавай отдельные политики `select`, `insert`, `update`, `delete` с проверкой владельца через `(select auth.uid()) = user_id`.
3. Для `update` всегда указывай и `USING`, и `WITH CHECK`. Не используй одну лишь политику `TO authenticated`.
4. Не добавляй `service_role`, database password или secret key в `NEXT_PUBLIC_*`, исходники, документацию или Git. В браузере разрешён только publishable key.
5. Не используй `user_metadata` в RLS и не обходи RLS с помощью `SECURITY DEFINER` без отдельного обоснования и проверки безопасности.
6. После схемных изменений проверь RLS-политики, выполни запрос под обычным пользователем и запусти `npm run typecheck` и `npm run build`.
7. Новые запросы к данным добавляй в `lib/planner-repository.ts`, а не напрямую в компоненты. Это сохраняет единый формат преобразования БД в доменные типы.
