// Helper compartilhado para guardar/ler a API Key do Asaas criptografada.
//
// A chave é cifrada em repouso (AES-256-GCM). A chave de criptografia é
// derivada (HKDF-SHA256) do SUPABASE_SERVICE_ROLE_KEY, que já existe no
// ambiente das edge functions — assim não é preciso configurar nenhum
// secret extra. Observação: se o service role key for rotacionado, a chave
// do Asaas guardada precisa ser cadastrada de novo.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('asaas-api-key'),
      info: encoder.encode('v1'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(plain: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain))
  );
  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  let binary = '';
  for (const byte of combined) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function decryptApiKey(payload: string): Promise<string> {
  const key = await getCryptoKey();
  const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return decoder.decode(plain);
}

/**
 * Resolve a API Key do Asaas. Prioriza a chave criptografada salva no banco
 * (asaas_settings.api_key_encrypted); se a coluna não existir ou estiver
 * vazia, cai para a secret ASAAS_API_KEY (compatibilidade). Lança se nenhuma
 * estiver configurada.
 */
export async function getAsaasApiKey(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('asaas_settings')
      .select('api_key_encrypted')
      .limit(1)
      .maybeSingle();
    if (!error && data?.api_key_encrypted) {
      return await decryptApiKey(data.api_key_encrypted);
    }
  } catch (_e) {
    // coluna pode ainda não existir — segue para o fallback
  }

  const fromEnv = Deno.env.get('ASAAS_API_KEY');
  if (fromEnv) return fromEnv;

  throw new Error('Asaas API Key não configurada');
}
