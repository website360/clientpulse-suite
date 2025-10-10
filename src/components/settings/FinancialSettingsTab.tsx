import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FinancialSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newMethodName, setNewMethodName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Fetch payment categories
  const { data: categories } = useQuery({
    queryKey: ["payment-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_categories")
        .select("*")
        .order("type", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment methods
  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: string }) => {
      const { error } = await supabase
        .from("payment_categories")
        .insert({ name, type });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast({ title: "Categoria adicionada com sucesso" });
      setNewCategoryName("");
    },
    onError: () => {
      toast({ title: "Erro ao adicionar categoria", variant: "destructive" });
    },
  });

  // Add method mutation
  const addMethodMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { error } = await supabase
        .from("payment_methods")
        .insert({ name });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento adicionada com sucesso" });
      setNewMethodName("");
    },
    onError: () => {
      toast({ title: "Erro ao adicionar forma de pagamento", variant: "destructive" });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("payment_categories")
        .update({ name })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast({ title: "Categoria atualizada com sucesso" });
      setEditingId(null);
      setEditingName("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
    },
  });

  // Update method mutation
  const updateMethodMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ name })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento atualizada com sucesso" });
      setEditingId(null);
      setEditingName("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar forma de pagamento", variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ table, id, isActive }: { table: "payment_categories" | "payment_methods"; id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.table === "payment_categories" ? "payment-categories" : "payment-methods";
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const payableCategories = categories?.filter((c) => c.type === "payable") || [];
  const receivableCategories = categories?.filter((c) => c.type === "receivable") || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="methods">Formas de Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {/* Categorias de Contas a Pagar */}
          <Card>
            <CardHeader>
              <CardTitle>Categorias de Contas a Pagar</CardTitle>
              <CardDescription>
                Gerencie as categorias usadas para classificar contas a pagar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim()) {
                        addCategoryMutation.mutate({ name: newCategoryName, type: "payable" });
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => addCategoryMutation.mutate({ name: newCategoryName, type: "payable" })}
                  disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payableCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        {editingId === category.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateCategoryMutation.mutate({ id: category.id, name: editingName });
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditingName("");
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateCategoryMutation.mutate({ id: category.id, name: editingName })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          category.name
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId !== category.id && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditingName(category.name);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  table: "payment_categories",
                                  id: category.id,
                                  isActive: category.is_active,
                                })
                              }
                            >
                              {category.is_active ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Categorias de Contas a Receber */}
          <Card>
            <CardHeader>
              <CardTitle>Categorias de Contas a Receber</CardTitle>
              <CardDescription>
                Gerencie as categorias usadas para classificar contas a receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim()) {
                        addCategoryMutation.mutate({ name: newCategoryName, type: "receivable" });
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => addCategoryMutation.mutate({ name: newCategoryName, type: "receivable" })}
                  disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivableCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        {editingId === category.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateCategoryMutation.mutate({ id: category.id, name: editingName });
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditingName("");
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateCategoryMutation.mutate({ id: category.id, name: editingName })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          category.name
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId !== category.id && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditingName(category.name);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  table: "payment_categories",
                                  id: category.id,
                                  isActive: category.is_active,
                                })
                              }
                            >
                              {category.is_active ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>
                Gerencie as formas de pagamento disponíveis no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Nova forma de pagamento..."
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMethodName.trim()) {
                        addMethodMutation.mutate({ name: newMethodName });
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => addMethodMutation.mutate({ name: newMethodName })}
                  disabled={!newMethodName.trim() || addMethodMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods?.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell>
                        {editingId === method.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateMethodMutation.mutate({ id: method.id, name: editingName });
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditingName("");
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateMethodMutation.mutate({ id: method.id, name: editingName })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          method.name
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId !== method.id && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(method.id);
                                setEditingName(method.name);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  table: "payment_methods",
                                  id: method.id,
                                  isActive: method.is_active,
                                })
                              }
                            >
                              {method.is_active ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}