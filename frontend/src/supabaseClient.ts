import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust check for missing credentials, including literal "undefined" strings from build arguments
const isMissing = (val: string | undefined) => !val || val === 'undefined' || val === '';

if (isMissing(supabaseUrl) || isMissing(supabaseAnonKey)) {
    const missing = [];
    if (isMissing(supabaseUrl)) missing.push('VITE_SUPABASE_URL');
    if (isMissing(supabaseAnonKey)) missing.push('VITE_SUPABASE_ANON_KEY');

    throw new Error(`Missing Supabase credentials: ${missing.join(', ')}. Please check your repository secrets and build configuration.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        flowType: 'pkce', // Use PKCE flow for better security
    },
})