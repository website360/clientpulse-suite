import { supabase } from '@/integrations/supabase/client';

/**
 * Mapa de tipos de branding para caminhos fixos no bucket
 */
const BRANDING_PATHS: Record<string, string> = {
  'favicon': 'branding/favicon.png',
  'logo-icon-light': 'branding/logo-icon-light.png',
  'logo-icon-dark': 'branding/logo-icon-dark.png',
  'auth-logo-light': 'branding/auth-logo-light.png',
  'auth-logo-dark': 'branding/auth-logo-dark.png',
  'kb-logo-light': 'branding/kb-logo-light.png',
  'kb-article-logo': 'branding/kb-article-logo.png',
};

/**
 * Retorna o caminho fixo para um tipo de branding
 */
export function getBrandingPath(type: string): string {
  return BRANDING_PATHS[type] || `branding/${type}.png`;
}

/**
 * Retorna a URL pública para um tipo de branding
 * @param type - Tipo de branding
 * @param cacheBust - Se true, adiciona timestamp para evitar cache
 */
export function getBrandingPublicUrl(type: string, cacheBust: boolean = false): string {
  const path = getBrandingPath(type);
  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  
  if (cacheBust) {
    return `${data.publicUrl}?v=${Date.now()}`;
  }
  
  return data.publicUrl;
}

/**
 * Busca URL de fallback de arquivos antigos no bucket ticket-attachments
 * (compatibilidade com uploads anteriores)
 */
export async function getLegacyFallbackUrl(type: string): Promise<string | null> {
  try {
    const { data: files, error } = await supabase.storage
      .from('ticket-attachments')
      .list('branding', { 
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 100 
      });

    if (error) throw error;

    // Buscar arquivo com prefixo antigo (ex: kb-logo-light-1234567890.png)
    const file = files?.find((f: any) => f.name?.startsWith(`${type}-`));
    
    if (file) {
      const { data } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(`branding/${file.name}`);
      return `${data.publicUrl}?t=${Date.now()}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching legacy fallback:', error);
    return null;
  }
}

/**
 * Carrega URL de branding com fallbacks:
 * 1. Bucket 'branding' com nome fixo (fonte principal)
 * 2. localStorage (cache)
 * 3. Bucket 'ticket-attachments/branding' com prefixo antigo (legacy)
 * 4. Default fornecido
 */
export async function loadBrandingUrl(
  type: string,
  defaultUrl: string
): Promise<string> {
  const cacheKey = `app-${type}`;
  
  // 1. Tentar do bucket branding (fonte principal)
  try {
    const url = getBrandingPublicUrl(type, true);
    
    // Verificar se o arquivo existe fazendo uma requisição HEAD
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      // Salvar no localStorage como cache
      localStorage.setItem(cacheKey, url);
      return url;
    }
  } catch (error) {
    console.log(`Branding '${type}' não encontrado no bucket principal`);
  }
  
  // 2. Tentar do localStorage (cache)
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 3. Tentar fallback legacy (ticket-attachments/branding)
  const legacyUrl = await getLegacyFallbackUrl(type);
  if (legacyUrl) {
    localStorage.setItem(cacheKey, legacyUrl);
    return legacyUrl;
  }
  
  // 4. Usar default
  return defaultUrl;
}

/**
 * Faz upload de um arquivo de branding para o bucket com nome fixo
 */
export async function uploadBrandingFile(
  type: string,
  file: File
): Promise<{ url: string; error?: string }> {
  try {
    const path = getBrandingPath(type);
    
    // Upload com upsert: true para sobrescrever arquivo existente
    const { data, error } = await supabase.storage
      .from('branding')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Sobrescreve se já existir
      });

    if (error) throw error;

    // Gerar URL pública com cache-bust
    const url = getBrandingPublicUrl(type, true);
    
    // Salvar no localStorage como cache
    localStorage.setItem(`app-${type}`, url);
    
    return { url };
  } catch (error: any) {
    console.error('Error uploading branding file:', error);
    return { url: '', error: error.message };
  }
}
