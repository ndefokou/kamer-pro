import { supabase } from '@/supabaseClient'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthResponse {
    user: User | null
    session: Session | null
    error: AuthError | null
}

export interface SignUpMetadata {
    username?: string
    phone?: string
    [key: string]: unknown
}


/**
 * Helper to construct the correct redirect URL accounting for the base path
 */
const getRedirectUrl = (path: string = '/auth/callback') => {
    // import.meta.env.BASE_URL is provided by Vite and includes the base path (e.g., '/kamer-pro/')
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const origin = window.location.origin;
    return `${origin}${baseUrl}${path}`;
};

export class SupabaseAuthService {

    /**
     * Sign up with email and password
     */
    async signUpWithEmail(
        email: string,
        password: string,
        metadata?: SignUpMetadata
    ): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata || {},
                emailRedirectTo: getRedirectUrl(),
            },
        })

        return {
            user: data.user,
            session: data.session,
            error,
        }
    }

    /**
     * Sign in with email and password
     */
    async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        return {
            user: data.user,
            session: data.session,
            error,
        }
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle(): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: getRedirectUrl(),
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        return { error }
    }

    /**
     * Sign out the current user
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    /**
     * Get the current session
     */
    async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.getSession()
        return {
            session: data.session,
            error,
        }
    }

    /**
     * Refresh the current session
     */
    async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.refreshSession()
        return {
            session: data.session,
            error,
        }
    }

    /**
     * Get the current user
     */
    async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.getUser()
        return {
            user: data.user,
            error,
        }
    }

    /**
     * Update user profile metadata
     */
    async updateProfile(updates: {
        email?: string
        password?: string
        data?: SignUpMetadata
    }): Promise<{ user: User | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.updateUser(updates)
        return {
            user: data.user,
            error,
        }
    }

    /**
     * Send password reset email
     */
    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl('/reset-password'),
        })
        return { error }
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(session?.user ?? null, session)
        })

        return () => {
            subscription.unsubscribe()
        }
    }

    /**
     * Verify OTP (for email verification or phone verification)
     */
    async verifyOtp(params: {
        email?: string
        phone?: string
        token: string
        type: 'signup' | 'recovery' | 'email' | 'sms'
    }): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.verifyOtp(params as Parameters<typeof supabase.auth.verifyOtp>[0])
        return {
            user: data.user,
            session: data.session,
            error,
        }
    }
}

export const supabaseAuthService = new SupabaseAuthService()
