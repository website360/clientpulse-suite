import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MaintenancePlansList } from "@/components/maintenance/MaintenancePlansList";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { MaintenanceHistory } from "@/components/maintenance/MaintenanceHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Maintenance() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manutenção Preventiva</h1>
            <p className="text-muted-foreground">
              Gerenciamento de manutenções preventivas dos clientes
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Manutenção
          </Button>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans">Planos Ativos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <MaintenancePlansList />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <MaintenanceHistory />
          </TabsContent>
        </Tabs>

        <MaintenanceFormModal
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      </div>
    </DashboardLayout>
  );
}
