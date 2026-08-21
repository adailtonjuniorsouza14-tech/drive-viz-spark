import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UsuarioPainel = {
  id: string;
  email: string | null;
  nome: string | null;
  papel: "admin" | "viewer";
  eu: boolean;
};

/** Lê o papel do próprio usuário (RLS permite a própria linha). */
async function ehAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

async function exigirAdmin(context: { supabase: any; userId: string }) {
  if (!(await ehAdmin(context))) {
    throw new Error("Apenas administradores podem gerenciar usuários.");
  }
}

/** Lista os usuários do painel (somente admin). */
export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioPainel[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: perfis, error: e1 }, { data: papeis, error: e2 }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, nome").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const mapa = new Map((papeis ?? []).map((p: any) => [p.user_id, p.role]));
    return (perfis ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      nome: p.nome,
      papel: (mapa.get(p.id) as "admin" | "viewer") ?? "viewer",
      eu: p.id === context.userId,
    }));
  });

/** Cria um usuário de visualização com e-mail e senha (somente admin). */
export const criarVisualizador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; senha: string; nome?: string }) => {
    const email = (data?.email ?? "").trim().toLowerCase();
    const senha = data?.senha ?? "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    return { email, senha, nome: (data?.nome ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { role: "viewer", full_name: data.nome || data.email },
    });
    if (error) throw new Error(error.message);
    return { id: criado.user?.id ?? "", email: data.email };
  });

/** Remove um usuário do painel (somente admin, não pode remover a si mesmo). */
export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Usuário inválido.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.id === context.userId) throw new Error("Você não pode excluir a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
