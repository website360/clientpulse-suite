import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface PDFExportProps {
  title: string;
  content: string;
  excerpt?: string;
}

export function PDFExport({ title, content, excerpt }: PDFExportProps) {
  const { toast } = useToast();

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Título
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title, maxWidth);
      pdf.text(titleLines, margin, yPosition);
      yPosition += (titleLines.length * 10) + 10;

      // Excerpt
      if (excerpt) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'italic');
        const excerptLines = pdf.splitTextToSize(excerpt, maxWidth);
        pdf.text(excerptLines, margin, yPosition);
        yPosition += (excerptLines.length * 7) + 10;
      }

      // Linha separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Conteúdo
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const cleanContent = stripHtml(content);
      const contentLines = pdf.splitTextToSize(cleanContent, maxWidth);

      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 7;
      });

      // Rodapé em todas as páginas
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.text(
          `${window.location.origin}/base-conhecimento`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Salvar PDF
      const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo foi baixado para seu dispositivo.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o arquivo PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleExportPDF}
      className="gap-2"
    >
      <FileText className="h-5 w-5" />
      Baixar PDF
    </Button>
  );
}