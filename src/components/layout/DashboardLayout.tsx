import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbLabel?: string;
}

export function DashboardLayout({ children, breadcrumbLabel }: DashboardLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full min-h-screen overflow-x-hidden">
          <AppHeader breadcrumbLabel={breadcrumbLabel} />
          <main className="flex-1 p-6 bg-background-secondary overflow-x-hidden">
            <div className="max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
