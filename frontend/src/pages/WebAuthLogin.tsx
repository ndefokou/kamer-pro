import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WebAuthService } from '@/services/webAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Shield } from 'lucide-react';

export const WebAuthLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'authenticating'>('form');
  const webAuthService = new WebAuthService();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      toast({
        title: 'Error',
        description: 'Please enter your username',
        variant: 'destructive',
      });
      return;
    }

    // Check WebAuthn support
    if (!window.PublicKeyCredential) {
      toast({
        title: 'Error',
        description: 'Your browser does not support WebAuthn. Please use a modern browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setStep('authenticating');

    try {
      // Step 1: Start authentication and get challenge
      const startResponse = await webAuthService.startAuthentication(username);

      // Step 2: Get assertion (authenticate)
      const assertionOptions = {
        challenge: new TextEncoder().encode(startResponse.challenge),
        timeout: 60000,
        userVerification: 'preferred' as const,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: assertionOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        throw new Error('Authentication was cancelled');
      }

      // Step 3: Send assertion to server
      const signatureBase64 = WebAuthService.arrayBufferToBase64(
        (assertion.response as AuthenticatorAssertionResponse).signature
      );

      const response = await webAuthService.completeAuthentication(
        username,
        signatureBase64
      );

      // Store authentication data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_id', response.user_id.toString());
      localStorage.setItem('username', response.username);
      localStorage.setItem('email', response.email);

      toast({
        title: 'Success!',
        description: 'Logged in successfully.',
      });

      navigate('/role-selection');
    } catch (error) {
      console.error('Authentication error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            {step === 'form'
              ? 'Sign in using your security key or biometric authentication'
              : 'Please authenticate with your security device...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'form' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Security Notice</p>
                    <p>You'll be asked to authenticate with your security key or device biometrics.</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Signing in...' : 'Authenticate'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-950">New to KamerLink?</span>
                </div>
              </div>

              <Link to="/webauth-register">
                <Button variant="outline" className="w-full">
                  Create Account
                </Button>
              </Link>
            </form>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Please authenticate with your security device...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
