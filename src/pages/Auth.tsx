import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [authLogo, setAuthLogo] = useState<{ light: string; dark: string }>({
    light: logoLight,
    dark: logoDark,
  });

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    // Carregar logos customizados do localStorage
    const customAuthLogoLight = localStorage.getItem('app-logo-light');
    const customAuthLogoDark = localStorage.getItem('app-logo-dark');
    
    setAuthLogo({
      light: customAuthLogoLight || logoLight,
      dark: customAuthLogoDark || logoDark,
    });

    // Observer para mudanças no tema
    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(signInEmail, signInPassword);

    if (error) {
      toast.error('Erro ao fazer login', {
        description: error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message
      });
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white/20 rounded-full" />
        <div className="absolute top-32 right-20 w-16 h-16 border-2 border-white/20 rotate-45" />
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-white/40 rounded-full" />
        <div className="absolute bottom-40 right-32 w-3 h-3 bg-white/40 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/30 rounded-full" />
        
        {/* Wavy Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,100 Q150,150 300,100 T600,100 T900,100"
            stroke="white"
            strokeWidth="3"
            fill="none"
            className="animate-pulse"
          />
          <path
            d="M0,200 Q150,250 300,200 T600,200 T900,200"
            stroke="white"
            strokeWidth="2"
            fill="none"
            style={{ animationDelay: '0.5s' }}
            className="animate-pulse"
          />
          <path
            d="M0,350 Q200,400 400,350 T800,350"
            stroke="white"
            strokeWidth="2.5"
            fill="none"
            style={{ animationDelay: '1s' }}
            className="animate-pulse"
          />
        </svg>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-4">Bem-vindo de volta!</h1>
          <p className="text-xl text-white/90">
            Faça login para acessar sua conta
          </p>
        </div>

        {/* Bottom decorative circles */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-32 translate-y-32" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-48 -translate-y-48" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center lg:text-left">
            <img 
              src={isDark ? authLogo.dark : authLogo.light} 
              alt="Logo" 
              className="h-20 w-auto mx-auto lg:mx-0"
            />
          </div>

          {/* Sign In Form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>
                Digite suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail ou usuário
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => toast.info('Entre em contato com o administrador')}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium" 
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
