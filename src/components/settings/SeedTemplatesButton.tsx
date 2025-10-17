import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { seedDocumentTemplates } from "@/lib/seed-templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SeedTemplatesButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedDocumentTemplates();
      toast({
        title: "Templates criados!",
        description: "Os templates pré-configurados foram adicionados com sucesso.",
      });
    } catch (error) {
      console.error("Error seeding templates:", error);
      toast({
        title: "Erro ao criar templates",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="h-4 w-4 mr-2" />
          Criar Templates Pré-configurados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Criar Templates Pré-configurados?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá criar os seguintes templates prontos para uso:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Contrato de Prestação de Serviço - Hospedagem</li>
              <li>Proposta Comercial - Loja Virtual</li>
            </ul>
            <p className="mt-2">
              Templates existentes não serão duplicados. Você pode editá-los depois.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSeed} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Templates
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
