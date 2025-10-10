import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Supplier {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string | null;
  email: string;
  phone: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: 'Erro ao carregar fornecedores',
        description: 'Não foi possível carregar a lista de fornecedores.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return;
      }

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...formData,
            trade_name: formData.trade_name || null,
            cnpj: formData.cnpj || null,
            contact_name: formData.contact_name || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            notes: formData.notes || null,
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;
        toast({
          title: 'Fornecedor atualizado',
          description: 'Fornecedor atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            ...formData,
            trade_name: formData.trade_name || null,
            cnpj: formData.cnpj || null,
            contact_name: formData.contact_name || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            notes: formData.notes || null,
            created_by: user.id,
          }]);

        if (error) throw error;
        toast({
          title: 'Fornecedor criado',
          description: 'Fornecedor criado com sucesso.',
        });
      }
      setModalOpen(false);
      setEditingSupplier(null);
      setFormData({
        company_name: '',
        trade_name: '',
        cnpj: '',
        email: '',
        phone: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o fornecedor.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      company_name: supplier.company_name,
      trade_name: supplier.trade_name || '',
      cnpj: supplier.cnpj || '',
      email: supplier.email,
      phone: supplier.phone,
      contact_name: supplier.contact_name || '',
      contact_phone: supplier.contact_phone || '',
      contact_email: supplier.contact_email || '',
      notes: supplier.notes || '',
    });
    setModalOpen(true);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Status atualizado',
        description: `Fornecedor ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do fornecedor.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (id: string) => {
    setSupplierToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierToDelete);

      if (error) throw error;
      toast({
        title: 'Fornecedor excluído',
        description: 'Fornecedor excluído com sucesso.',
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o fornecedor.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  const openNewModal = () => {
    setEditingSupplier(null);
    setFormData({
      company_name: '',
      trade_name: '',
      cnpj: '',
      email: '',
      phone: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
    });
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>
                Gerencie os fornecedores do sistema
              </CardDescription>
            </div>
            <Button onClick={openNewModal} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando fornecedores...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.company_name}</TableCell>
                    <TableCell>{supplier.trade_name || '-'}</TableCell>
                    <TableCell>{supplier.cnpj || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{supplier.phone}</div>
                        <div className="text-muted-foreground">{supplier.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={supplier.is_active}
                        onCheckedChange={() => toggleActive(supplier.id, supplier.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Razão Social *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trade_name">Nome Fantasia</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Dados do Contato</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_name">Nome</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Telefone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="contact_email">E-mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
