import { supabase } from '@/integrations/supabase/client';

/**
 * Mapa de tipos de branding para caminhos fixos no bucket
 */
const BRANDING_PATHS: Record<string, string> = {
  'favicon': 'favicon.png',
  'logo-icon-light': 'logo-icon-light.png',
  'logo-icon-dark': 'logo-icon-dark.png',
  'auth-logo-light': 'auth-logo-light.png',
  'auth-logo-dark': 'auth-logo-dark.png',
  'auth-background': 'auth-background.jpg',
  'kb-logo-light': 'kb-logo-light.png',
  'kb-article-logo': 'kb-article-logo.png',
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
  const path = `branding/${getBrandingPath(type)}`;
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
    // Para auth-background, tentar múltiplas extensões
    if (type === 'auth-background') {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      for (const ext of extensions) {
        const path = `branding/auth-background.${ext}`;
        const { data } = supabase.storage.from('branding').getPublicUrl(path);
        const url = `${data.publicUrl}?v=${Date.now()}`;
        
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          // Limpar cache antigo
          localStorage.removeItem(cacheKey);
          localStorage.setItem(cacheKey, url);
          return url;
        }
      }
    } else {
      const url = getBrandingPublicUrl(type, true);
      
      // Verificar se o arquivo existe fazendo uma requisição HEAD
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        // Limpar cache antigo e salvar novo
        localStorage.removeItem(cacheKey);
        localStorage.setItem(cacheKey, url);
        return url;
      }
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
    // Obter extensão do arquivo
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    
    // Para auth-background, usar a extensão do arquivo; para outros, usar path fixo
    let fileName: string;
    if (type === 'auth-background') {
      fileName = `auth-background.${fileExt}`;
    } else {
      fileName = getBrandingPath(type);
    }
    
    const path = `branding/${fileName}`;
    
    // Upload com upsert: true para sobrescrever arquivo existente
    const { data, error } = await supabase.storage
      .from('branding')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Sobrescreve se já existir
      });

    if (error) throw error;

    // Gerar URL pública com cache-bust
    const publicUrl = supabase.storage.from('branding').getPublicUrl(path).data.publicUrl;
    const url = `${publicUrl}?v=${Date.now()}`;
    
    // Limpar cache antigo e salvar novo
    const cacheKey = `app-${type}`;
    localStorage.removeItem(cacheKey);
    localStorage.setItem(cacheKey, url);
    
    return { url };
  } catch (error: any) {
    console.error('Error uploading branding file:', error);
    return { url: '', error: error.message };
  }
}
