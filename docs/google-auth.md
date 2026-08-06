# Вход через Google

Кнопка «Продолжить с Google» уже вызывает `supabase.auth.signInWithOAuth` и возвращает пользователя на адрес приложения. Для работы нужно один раз настроить провайдер в облачных консолях.

1. В Google Cloud Console создай OAuth Client типа **Web application**.
2. В **Authorized JavaScript origins** добавь `http://localhost:3000` и production-домен приложения, например `https://planner-wheat-eta.vercel.app`.
3. В **Authorized redirect URIs** добавь callback URL, который показан в Supabase Dashboard → Authentication → Sign In / Up → Google. Он имеет вид `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Скопируй Client ID и Client Secret в Supabase Dashboard → Authentication → Providers → Google и включи провайдер.
5. В Supabase Dashboard → Authentication → URL Configuration добавь `http://localhost:3000` и production-домен в Redirect URLs; Site URL укажи на основной production-домен.

Не добавляй Google Client Secret в `.env.local`, исходники или Git. После настройки открой приложение и нажми «Продолжить с Google».
