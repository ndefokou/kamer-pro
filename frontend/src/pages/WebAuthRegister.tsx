import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { WebAuthService } from '@/services/webAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Shield } from 'lucide-react';

export const WebAuthRegister = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const webAuthService = new WebAuthService();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      toast({
        title: t("error"),
        description: t("please_fill_in_all_fields"),
        variant: 'destructive',
      });
      return;
    }
 
    // Check WebAuthn support
    if (!window.PublicKeyCredential) {
      toast({
        title: t("error"),
        description: t("your_browser_does_not_support_webauthn"),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Start registration and get challenge
      const startResponse = await webAuthService.startRegistration(username);
      
      // Step 2: Create credentials
      const credentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: new TextEncoder().encode(startResponse.challenge),
        rp: {
          name: 'KamerLink',
          id: 'localhost',
        },
        user: {
          id: new TextEncoder().encode(startResponse.user_id),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        attestation: 'direct',
      };

      const credential = (await navigator.credentials.create({
        publicKey: credentialCreationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error(t("failed_to_create_credential"));
      }
 
      // Step 3: Send credential to server
      const credentialIdBase64 = WebAuthService.arrayBufferToBase64(
        credential.rawId
      );
      
      const response = credential.response as AuthenticatorAttestationResponse;
      const attestationObjectBase64 = WebAuthService.arrayBufferToBase64(
        response.attestationObject
      );

      await webAuthService.completeRegistration(
        username,
        credentialIdBase64,
        attestationObjectBase64
      );

      toast({
        title: t("success"),
        description: t("registration_successful"),
      });
 
      navigate('/webauth-login');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : t("registration_failed");
      toast({
        title: t("error"),
        description: errorMessage,
        variant: 'destructive',
      });
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
          <CardTitle className="text-2xl">{t("create_account")}</CardTitle>
          <CardDescription>
            {t("register_using_your_security_key")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("username")}</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("choose_a_username")}
                required
                disabled={isLoading}
              />
            </div>
 
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">{t("security_notice")}</p>
                  <p>{t("youll_be_asked_to_connect_your_security_key")}</p>
                </div>
              </div>
            </div>
 
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t("registering") : t("register_with_webauthn")}
            </Button>
 
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-950">{t("already_have_an_account")}</span>
              </div>
            </div>
 
            <Link to="/webauth-login">
              <Button variant="outline" className="w-full">
                {t("sign_in")}
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
