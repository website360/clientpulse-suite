import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, Star } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left Side - Testimonial Section (Light Background) */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative"
        style={{
          background: backgroundImage 
            ? `url(${backgroundImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, hsl(210 40% 96%) 0%, hsl(210 40% 98%) 50%, hsl(210 30% 95%) 100%)',
        }}
      >
        {/* Logo */}
        <div>
          <img 
            src={isDark ? authLogo.dark : authLogo.light} 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>

        {/* Decorative Elements */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md">
            {/* Abstract shapes */}
            <div className="absolute -top-20 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
            
            {/* Central illustration placeholder */}
            <div className="relative bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/60">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-500 rounded-xl" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Gestão Completa</h3>
                <p className="text-sm text-slate-600">
                  Centralize clientes, projetos, tickets e finanças em um só lugar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="space-y-6">
          {/* Stars */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-lg text-slate-700 leading-relaxed max-w-md">
            "Esta plataforma revolucionou como gerenciamos nossos clientes. Uma verdadeira mudança para nossa agência."
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              SJ
            </div>
            <div>
              <p className="font-semibold text-slate-800">Sarah Jenkins</p>
              <p className="text-sm text-slate-500">CMO at TechFlow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src={isDark ? authLogo.dark : authLogo.light} 
              alt="Logo" 
              className="h-10 w-auto mx-auto"
            />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">
              Digite suas credenciais para acessar sua conta
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="h-16 pl-12 pr-4 text-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="h-16 pl-12 pr-14 text-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200 placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
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
                Lembrar-me neste dispositivo
              </Label>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full h-16 rounded-xl text-lg font-semibold shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200 hover:shadow-xl" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
