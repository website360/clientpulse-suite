import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'client' | 'contato' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'contato' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role after auth state changes
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      
      // data is an array of roles; prioritize admin > contato > client
      const roles = Array.isArray(data) ? data.map((r: any) => r.role as 'admin' | 'client' | 'contato') : [];
      const role: 'admin' | 'client' | 'contato' =
        roles.includes('admin') ? 'admin' :
        roles.includes('contato') ? 'contato' : 'client';

      setUserRole(role);
      
      // Redirect based on role
      const currentPath = window.location.pathname;
      
      // Se for contato, verificar se está associado a um client_contact
      if (role === 'contato') {
        const { data: contactData } = await supabase
          .from('client_contacts')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!contactData && currentPath !== '/auth') {
          console.error('User has contato role but is not associated with any client contact');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }
      }
      
      // Para clientes, garantir associação automática antes de navegar
      if (role === 'client') {
        const { data: linkedClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!linkedClient) {
          try {
            await supabase.functions.invoke('link-client-user');
          } catch (e) {
            console.error('link-client-user failed', e);
          }
        }
      }

      if ((role === 'client' || role === 'contato') && !currentPath.startsWith('/portal') && currentPath !== '/auth') {
        navigate('/portal');
      } else if (role === 'admin' && currentPath.startsWith('/portal')) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('client');
      navigate('/portal');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
