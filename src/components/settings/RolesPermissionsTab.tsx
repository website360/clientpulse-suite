import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface Module {
  id: string;
  name: string;
  description: string | null;
}

interface Permission {
  id: string;
  module_id: string;
  action: string;
  description: string | null;
  requires_approval: boolean;
}

export function RolesPermissionsTab() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, modulesRes, permissionsRes] = await Promise.all([
        supabase.from('custom_roles').select('*').order('name'),
        supabase.from('system_modules').select('*').eq('is_active', true).order('name'),
        supabase.from('permissions').select('*'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;

      setRoles(rolesRes.data || []);
      setModules(modulesRes.data || []);
      setPermissions(permissionsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (role: CustomRole) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
    });

    // Buscar permissões da role
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id);

    if (!error && data) {
      setSelectedPermissions(data.map(rp => rp.permission_id));
    }

    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let roleId: string;

      if (selectedRole) {
        // Atualizar role existente
        const { error } = await supabase
          .from('custom_roles')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', selectedRole.id);

        if (error) throw error;
        roleId = selectedRole.id;
      } else {
        // Criar nova role
        const { data, error } = await supabase
          .from('custom_roles')
          .insert({
            name: formData.name,
            description: formData.description || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        roleId = data.id;
      }

      // Atualizar permissões
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (selectedPermissions.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            selectedPermissions.map(permissionId => ({
              role_id: roleId,
              permission_id: permissionId,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: selectedRole ? 'Role atualizada' : 'Role criada',
        description: 'As permissões foram salvas com sucesso.',
      });

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta role?')) return;

    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role excluída',
        description: 'A role foi removida com sucesso.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles Customizadas
              </CardTitle>
              <CardDescription>
                Crie roles personalizadas com permissões granulares por módulo
              </CardDescription>
            </div>
            <Button onClick={openNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma role customizada criada
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.is_active ? 'default' : 'secondary'}>
                        {role.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? 'Editar Role' : 'Nova Role'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, descrição e permissões da role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Gerente Financeiro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da role..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <Label>Permissões</Label>
              {modules.map((module) => {
                const modulePermissions = permissions.filter(p => p.module_id === module.id);
                return (
                  <Card key={module.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{module.description || module.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                          >
                            {permission.description || permission.action}
                            {permission.requires_approval && (
                              <Badge variant="outline" className="text-xs">
                                Requer aprovação
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}