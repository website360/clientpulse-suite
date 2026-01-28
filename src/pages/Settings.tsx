import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DepartmentsTab } from '@/components/settings/DepartmentsTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { FinancialSettingsTab } from '@/components/settings/FinancialSettingsTab';
import { SuppliersTab } from '@/components/settings/SuppliersTab';
import { ServicesTab } from '@/components/settings/ServicesTab';
import { KnowledgeBaseTab } from '@/components/settings/KnowledgeBaseTab';
import { MaintenanceSettingsTab } from '@/components/settings/MaintenanceSettingsTab';
import { TicketSLASettingsTab } from '@/components/settings/TicketSLASettingsTab';
import { TicketMacrosSettingsTab } from '@/components/settings/TicketMacrosSettingsTab';
import { ProjectsSettingsTab } from '@/components/settings/ProjectsSettingsTab';
import { AuthenticationTab } from '@/components/settings/AuthenticationTab';
import { AuditLogsTab } from '@/components/settings/AuditLogsTab';
import { RolesPermissionsTab } from '@/components/settings/RolesPermissionsTab';
import { SessionsTab } from '@/components/settings/SessionsTab';
import { ApprovalSettingsTab } from '@/components/settings/ApprovalSettingsTab';
import { ToastDemo } from '@/components/demo/ToastDemo';
import { NotificationManager } from '@/components/pwa/NotificationManager';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MessageSquare, Settings2, FolderKanban, LogIn, Shield, Palette, Building2, Truck, DollarSign, Briefcase, BookOpen, Wrench, Timer, Zap, FileText, UserCog, Monitor, CheckCircle, Plug, Bell, Smartphone, Brush } from 'lucide-react';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';
import { NotificationTemplatesTab } from '@/components/settings/NotificationTemplatesTab';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { WhiteLabelTab } from '@/components/settings/WhiteLabelTab';


export default function Settings() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    nickname: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          nickname: data.nickname || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          nickname: profile.nickname,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas arquivos de imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

      const avatarUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrlWithTimestamp });

      toast({
        title: 'Avatar atualizado',
        description: 'Seu avatar foi atualizado com sucesso.',
      });

      // Recarregar a página após 1 segundo para atualizar o avatar em todos os lugares
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível fazer upload do avatar.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi alterada com sucesso.',
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: 'Erro ao alterar senha',
        description: 'Não foi possível alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas preferências e informações pessoais
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6 max-w-full overflow-x-hidden">
          <ScrollableTabs className="max-w-full">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              {userRole === 'admin' && (
                <>
                  <TabsTrigger value="roles">
                    <UserCog className="h-4 w-4 mr-2" />
                    Roles
                  </TabsTrigger>
                  <TabsTrigger value="approvals">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovações
                  </TabsTrigger>
                  <TabsTrigger value="whitelabel">
                    <Brush className="h-4 w-4 mr-2" />
                    White Label
                  </TabsTrigger>
                  <TabsTrigger value="appearance">
                    <Palette className="h-4 w-4 mr-2" />
                    Aparência
                  </TabsTrigger>
                  <TabsTrigger value="authentication">
                    <LogIn className="h-4 w-4 mr-2" />
                    Autenticação
                  </TabsTrigger>
                  <TabsTrigger value="departments">
                    <Building2 className="h-4 w-4 mr-2" />
                    Departamentos
                  </TabsTrigger>
                  <TabsTrigger value="suppliers">
                    <Truck className="h-4 w-4 mr-2" />
                    Fornecedores
                  </TabsTrigger>
                  <TabsTrigger value="financial">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financeiro
                  </TabsTrigger>
                  <TabsTrigger value="services">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Serviços
                  </TabsTrigger>
                  <TabsTrigger value="knowledge-base">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Base de Conhecimento
                  </TabsTrigger>
                  <TabsTrigger value="ticket-sla">
                    <Timer className="h-4 w-4 mr-2" />
                    SLA Tickets
                  </TabsTrigger>
                  <TabsTrigger value="ticket-macros">
                    <Zap className="h-4 w-4 mr-2" />
                    Macros Tickets
                  </TabsTrigger>
                  <TabsTrigger value="maintenance">
                    <Wrench className="h-4 w-4 mr-2" />
                    Manutenção
                  </TabsTrigger>
                  <TabsTrigger value="projects">
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Projetos
                  </TabsTrigger>
                  <TabsTrigger value="integrations">
                    <Plug className="h-4 w-4 mr-2" />
                    Integrações
                  </TabsTrigger>
                  <TabsTrigger value="notifications">
                    <Bell className="h-4 w-4 mr-2" />
                    Notificações
                  </TabsTrigger>
                  <TabsTrigger value="pwa">
                    <Smartphone className="h-4 w-4 mr-2" />
                    PWA & Mobile
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </ScrollableTabs>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex items-start gap-6">
                    <div className="space-y-3">
                      <Label>Foto Atual</Label>
                      <Avatar className="h-32 w-32 border-2 border-border">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                          <User className="h-16 w-16" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor="avatar">Foto de Perfil</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Esta foto será exibida no menu superior
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('avatar')?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                      </Button>
                      <input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        Formatos aceitos: PNG, JPG ou GIF (máx. 2MB)
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nickname">Apelido</Label>
                    <Input
                      id="nickname"
                      value={profile.nickname}
                      onChange={(e) =>
                        setProfile({ ...profile, nickname: e.target.value })
                      }
                      placeholder="Como você prefere ser chamado?"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Este nome será exibido no menu lateral
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      O email não pode ser alterado
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

              {userRole === 'admin' && (
                <>
                  <TabsContent value="roles">
                    <RolesPermissionsTab />
                  </TabsContent>

                  <TabsContent value="approvals">
                    <ApprovalSettingsTab />
                  </TabsContent>

                  <TabsContent value="whitelabel">
                    <WhiteLabelTab />
                  </TabsContent>

                  <TabsContent value="appearance">
                    <AppearanceTab />
                  </TabsContent>

                  <TabsContent value="authentication">
                    <AuthenticationTab />
                  </TabsContent>

                  <TabsContent value="departments">
                    <DepartmentsTab />
                  </TabsContent>

                  <TabsContent value="suppliers">
                    <SuppliersTab />
                  </TabsContent>

                  <TabsContent value="financial">
                    <FinancialSettingsTab />
                  </TabsContent>

                  <TabsContent value="services">
                    <ServicesTab />
                  </TabsContent>

                  <TabsContent value="knowledge-base">
                    <KnowledgeBaseTab />
                  </TabsContent>

          <TabsContent value="ticket-sla">
                    <TicketSLASettingsTab />
                  </TabsContent>

                  <TabsContent value="ticket-macros">
                    <TicketMacrosSettingsTab />
                  </TabsContent>

                  <TabsContent value="maintenance">
                    <MaintenanceSettingsTab />
                  </TabsContent>

                  <TabsContent value="projects">
                    <ProjectsSettingsTab />
                  </TabsContent>

                  <TabsContent value="integrations">
                    <IntegrationsTab />
                  </TabsContent>

                  <TabsContent value="notifications">
                    <Tabs defaultValue="templates" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="settings">Configurações</TabsTrigger>
                      </TabsList>
                      <TabsContent value="templates">
                        <NotificationTemplatesTab />
                      </TabsContent>
                      <TabsContent value="settings">
                        <NotificationSettingsTab />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="pwa">
                    <div className="space-y-6">
                      <NotificationManager />
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Instalação PWA</CardTitle>
                          <CardDescription>Configure o app como aplicativo instalável</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={() => window.location.href = '/install'}>
                            Abrir Página de Instalação
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>


                  {/* Removed Clicksign and Document Templates content */}
                </>
              )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
