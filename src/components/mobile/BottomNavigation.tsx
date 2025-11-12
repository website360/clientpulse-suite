import { Home, Ticket, Calendar, DollarSign, Users, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNavigation() {
  const { userRole } = useAuth();
  const isClient = userRole === 'client' || userRole === 'contato';

  const navItems = isClient ? [
    { icon: Home, label: 'Início', to: '/portal' },
    { icon: Ticket, label: 'Tickets', to: '/portal/tickets' },
    { icon: Calendar, label: 'Contratos', to: '/portal/contratos' },
  ] : [
    { icon: Home, label: 'Início', to: '/' },
    { icon: Ticket, label: 'Tickets', to: '/tickets' },
    { icon: Users, label: 'Clientes', to: '/clientes' },
    { icon: DollarSign, label: 'Financeiro', to: '/financeiro/receber' },
    { icon: Menu, label: 'Menu', to: '/configuracoes' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all',
                'hover:bg-accent/50',
                isActive && 'text-primary bg-accent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
