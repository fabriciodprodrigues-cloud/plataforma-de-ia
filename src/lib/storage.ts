import { createClient } from "@supabase/supabase-js";
import { storageBucket, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Cliente administrativo do Supabase — usado só no servidor, para gravar arquivos.
 * Fazendo o upload por aqui não precisamos configurar regras de permissão (RLS)
 * no bucket na mão: quem valida quem pode enviar é a nossa própria rota de API.
 */
function admin() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cria o bucket público na primeira vez, para o usuário não precisar fazer isso à mão. */
async function garantirBucket(cliente: ReturnType<typeof admin>) {
  const bucket = storageBucket();
  const { data } = await cliente.storage.getBucket(bucket);
  if (data) return bucket;

  const { error } = await cliente.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });
  // "already exists" acontece quando duas requisições criam ao mesmo tempo — tudo bem.
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Não foi possível preparar o armazenamento: ${error.message}`);
  }
  return bucket;
}

export async function enviarArquivo(params: {
  caminho: string;
  conteudo: ArrayBuffer | Buffer | Uint8Array;
  tipo: string;
}): Promise<string> {
  const cliente = admin();
  const bucket = await garantirBucket(cliente);

  const { error } = await cliente.storage
    .from(bucket)
    .upload(params.caminho, params.conteudo as ArrayBuffer, {
      contentType: params.tipo,
      upsert: true,
    });

  if (error) throw new Error(`Falha ao salvar o arquivo: ${error.message}`);

  const { data } = cliente.storage.from(bucket).getPublicUrl(params.caminho);
  return data.publicUrl;
}
