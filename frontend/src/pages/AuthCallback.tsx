import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';

/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers (Google, etc.)
 * Supabase automatically handles the token exchange
 */
const AuthCallback = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (!loading) {
            if (user) {
                // Successfully authenticated
                const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
                sessionStorage.removeItem('auth_redirect');
                navigate(redirectTo, { replace: true });
            } else {
                // If not loading but no user, wait a bit more (Supabase timing issue)
                timeout = setTimeout(() => {
                    // Check again before redirecting to error
                    if (!user) {
                        navigate('/login?error=auth_failed', { replace: true });
                    }
                }, 5000); // 5 second grace period for link processing
            }
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [user, loading, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
            <Loading message="Finishing your secure login..." />
            <p className="mt-4 text-gray-500 text-sm animate-pulse">
                Verifying your email link...
            </p>
        </div>
    );
};

export default AuthCallback;
