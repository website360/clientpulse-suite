import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, Check } from 'lucide-react';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [authLogoDark, setAuthLogoDark] = useState<string>('');
  const [authLogoLight, setAuthLogoLight] = useState<string>('');
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const loadAuthImages = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      
      // 'auth-logo-dark' = Logo do Formulário - Versão Escura (para fundo escuro)
      // 'auth-logo-light' = Logo do Formulário - Versão Clara (para fundo claro)
      const darkUrl = await loadBrandingUrl('auth-logo-dark', logoDark);
      const lightUrl = await loadBrandingUrl('auth-logo-light', logoLight);
      
      setAuthLogoDark(darkUrl);
      setAuthLogoLight(lightUrl);
      setLogoLoaded(true);
    };
    
    loadAuthImages();

    // Listener para atualizações de imagens
    const handleImageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.type.startsWith('auth-logo')) {
        loadAuthImages();
      }
    };

    window.addEventListener('logoUpdated', handleImageUpdate);

    return () => {
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
      {/* Left Side - Dark Panel with Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        {/* Logo */}
        <div className="min-h-12">
          {logoLoaded && authLogoDark && (
            <img 
              src={authLogoDark} 
              alt="Logo" 
              className="h-12 w-auto"
              style={{ minHeight: '3rem' }}
            />
          )}
        </div>

        {/* Welcome Message and Benefits */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Bem-vindo à Agência May
            </h1>
            <p className="text-slate-300 text-lg">
              Gerencia seus tickets, projetos e financeiro em nossa plataforma.
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(253, 193, 0, 0.2)' }}>
                  <Check className="w-3 h-3" style={{ color: '#FDC100' }} strokeWidth={3} />
                </div>
              </div>
              <span className="text-slate-200">Gestão completa de projetos</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(253, 193, 0, 0.2)' }}>
                  <Check className="w-3 h-3" style={{ color: '#FDC100' }} strokeWidth={3} />
                </div>
              </div>
              <span className="text-slate-200">Controle financeiro integrado</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(253, 193, 0, 0.2)' }}>
                  <Check className="w-3 h-3" style={{ color: '#FDC100' }} strokeWidth={3} />
                </div>
              </div>
              <span className="text-slate-200">Relatórios e dashboards em tempo real</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(253, 193, 0, 0.2)' }}>
                  <Check className="w-3 h-3" style={{ color: '#FDC100' }} strokeWidth={3} />
                </div>
              </div>
              <span className="text-slate-200">Suporte técnico especializado</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-slate-400 text-sm">
          © 2026 Agência May. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            {logoLoaded && authLogoLight && (
              <img 
                src={authLogoLight} 
                alt="Logo" 
                className="h-10 w-auto mx-auto"
              />
            )}
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta!</h1>
            <p className="text-slate-600">
              Entre para acessar seu painel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="pl-10 pr-4 text-sm border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-lg transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  style={{ height: '50px', fontFamily: 'Montserrat, sans-serif' }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="pl-10 pr-12 text-sm border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-lg transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  style={{ height: '50px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  Lembrar-me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full rounded-lg text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-sm hover:shadow-md" 
              style={{ height: '50px' }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : '→ Entrar'}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
