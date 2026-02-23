import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auto-fix: If the user only provides the project ID (e.g. 'bigokqnacrutbkwemmrx')
// instead of the full URL, we convert it to the standard Supabase format.
function normalizeSupabaseUrl(url: string | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed.includes('.') && trimmed.length > 5) {
        return `https://${trimmed}.supabase.co`;
    }
    if (trimmed && !trimmed.startsWith('http')) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

const supabaseUrl = normalizeSupabaseUrl(rawUrl);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Check your environment variables.');
    if (rawUrl) console.log('Raw URL provided:', rawUrl);
}

export const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_supabase_url') &&
    supabaseUrl !== ''
);

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

/**
 * Upload a file to a Supabase bucket
 */
export async function uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
            cacheControl: '3600'
        });

    if (error) {
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
}

/**
 * Get public URL for a file in a bucket
 */
export function getFileUrl(bucket: string, path: string): string {
    if (!isSupabaseConfigured) return '';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}
