import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CookieParaGravar {
  name: string;
  value: string;
  options?: CookieOptions;
}

/** Client Supabase para Server Components / Route Handlers (respeita RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieParaGravar[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll chamado de um Server Component — middleware cuida da sessão
          }
        },
      },
    }
  );
}
