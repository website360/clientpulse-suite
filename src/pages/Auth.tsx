import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  // Images
  const [authLogo, setAuthLogo] = useState<{ light: string; dark: string }>({
    light: logoLight,
    dark: logoDark,
  });
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    // Carregar imagens personalizadas do Storage
    const loadAuthImages = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      
      const lightUrl = await loadBrandingUrl('auth-logo-light', logoLight);
      const darkUrl = await loadBrandingUrl('auth-logo-dark', logoDark);
      const bgUrl = await loadBrandingUrl('auth-background', '');
      
      setAuthLogo({
        light: lightUrl,
        dark: darkUrl,
      });
      
      setBackgroundImage(bgUrl);
    };
    
    loadAuthImages();

    // Observer para mudanças no tema
    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listener para atualizações de imagens
    const handleImageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.type.startsWith('auth-')) {
        loadAuthImages();
      }
    };

    window.addEventListener('logoUpdated', handleImageUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('logoUpdated', handleImageUpdate);
    };
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: backgroundImage 
          ? `url(${backgroundImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 50%, hsl(var(--accent)) 100%)',
        backgroundPosition: backgroundImage ? 'center' : undefined
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Modal Card Centralizado */}
      <div className="relative z-10 w-full max-w-6xl bg-background rounded-3xl shadow-2xl overflow-hidden">
        <div className="grid lg:grid-cols-2">
          {/* Left Side - Welcome Section */}
          <div className="hidden lg:flex flex-col justify-center px-12 py-20 bg-muted/30">
            <div className="space-y-6">
              <img 
                src={authLogo.light} 
                alt="Logo" 
                className="h-12 w-auto"
              />
              <div className="space-y-3">
                <h1 className="text-5xl font-bold tracking-tight">BEM-VINDO</h1>
                <p className="text-xl font-semibold text-muted-foreground">SEU TÍTULO AQUI</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  Gerencie seus clientes, projetos e tickets de forma eficiente.
                  Acompanhe o progresso em tempo real e mantenha sua equipe sempre
                  conectada com as ferramentas certas.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Sign In Form */}
          <div className="flex items-center justify-center p-8 lg:p-16">
            <div className="w-full max-w-md space-y-8">
              {/* Mobile Logo */}
              <div className="lg:hidden mb-8 text-center">
                <img 
                  src={isDark ? authLogo.dark : authLogo.light} 
                  alt="Logo" 
                  className="h-12 w-auto mx-auto"
                />
              </div>

              {/* Form */}
              <div>
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-foreground mb-2">Entrar</h2>
                  <p className="text-sm text-muted-foreground">
                    Acesse sua conta para continuar
                  </p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="E-mail"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="h-12 pl-11 bg-muted/50 border-border/50 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Senha"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="h-12 pl-11 pr-12 bg-muted/50 border-border/50 rounded-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-semibold text-xs hover:underline"
                      >
                        {showPassword ? "OCULTAR" : "MOSTRAR"}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label 
                        htmlFor="remember" 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Lembrar-me
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline font-medium"
                      onClick={() => toast.info('Entre em contato com o administrador')}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-lg text-base font-semibold shadow-lg" 
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
