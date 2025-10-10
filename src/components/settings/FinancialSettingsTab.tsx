import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FinancialSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newMethodName, setNewMethodName] = useState("");
  const [copiedReceivableCron, setCopiedReceivableCron] = useState(false);
  const [copiedPayableCron, setCopiedPayableCron] = useState(false);

  const receivableCronCommand = `0 0 1 * * curl -X POST https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/generate-recurring-receivables \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0" \\
  -H "Content-Type: application/json"`;

  const payableCronCommand = `0 0 1 * * curl -X POST https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/generate-recurring-payables \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0" \\
  -H "Content-Type: application/json"`;

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

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-categories"] });
      toast({ title: "Categoria excluída com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    },
  });

  // Delete method mutation
  const deleteMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento excluída com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir forma de pagamento", variant: "destructive" });
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

  const copyReceivableCronToClipboard = () => {
    navigator.clipboard.writeText(receivableCronCommand);
    setCopiedReceivableCron(true);
    setTimeout(() => setCopiedReceivableCron(false), 2000);
    toast({
      title: "Comando copiado",
      description: "O comando cron de contas a receber foi copiado.",
    });
  };

  const copyPayableCronToClipboard = () => {
    navigator.clipboard.writeText(payableCronCommand);
    setCopiedPayableCron(true);
    setTimeout(() => setCopiedPayableCron(false), 2000);
    toast({
      title: "Comando copiado",
      description: "O comando cron de contas a pagar foi copiado.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração dos Cron Jobs</CardTitle>
          <CardDescription>
            Configure estes comandos no cron do seu servidor para gerar automaticamente as cobranças recorrentes mensalmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription className="space-y-4">
              <div>
                <p className="font-medium mb-2">Contas a Receber - Execute todo dia 1º de cada mês:</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Este comando irá verificar as cobranças recorrentes que estão próximas de vencer (dentro de 1 mês) 
                  e gerar automaticamente as próximas 12 cobranças.
                </p>
              </div>
              <div className="relative">
                <pre className="bg-muted p-3 rounded-md text-xs break-all whitespace-pre-wrap max-w-full">
                  <code className="block">{receivableCronCommand}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copyReceivableCronToClipboard}
                  title="Copiar comando"
                >
                  {copiedReceivableCron ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="space-y-4">
              <div>
                <p className="font-medium mb-2">Contas a Pagar - Execute todo dia 1º de cada mês:</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Este comando irá verificar as contas a pagar recorrentes que estão próximas de vencer (dentro de 1 mês) 
                  e gerar automaticamente as próximas 12 cobranças.
                </p>
              </div>
              <div className="relative">
                <pre className="bg-muted p-3 rounded-md text-xs break-all whitespace-pre-wrap max-w-full">
                  <code className="block">{payableCronCommand}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copyPayableCronToClipboard}
                  title="Copiar comando"
                >
                  {copiedPayableCron ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
                    <TableHead className="w-[100px]">Ativo</TableHead>
                    <TableHead className="w-[80px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payableCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() =>
                            toggleActiveMutation.mutate({
                              table: "payment_categories",
                              id: category.id,
                              isActive: category.is_active,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    <TableHead className="w-[100px]">Ativo</TableHead>
                    <TableHead className="w-[80px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivableCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() =>
                            toggleActiveMutation.mutate({
                              table: "payment_categories",
                              id: category.id,
                              isActive: category.is_active,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    <TableHead className="w-[100px]">Ativo</TableHead>
                    <TableHead className="w-[80px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods?.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell>{method.name}</TableCell>
                      <TableCell>
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={() =>
                            toggleActiveMutation.mutate({
                              table: "payment_methods",
                              id: method.id,
                              isActive: method.is_active,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMethodMutation.mutate(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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