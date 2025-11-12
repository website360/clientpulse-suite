import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

interface AttachmentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
  } | null;
  onDownload: () => void;
}

const getPublicUrl = (filePath: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/ticket-attachments/${filePath}`;
};

export function AttachmentPreviewModal({ 
  open, 
  onOpenChange, 
  attachment,
  onDownload 
}: AttachmentPreviewModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!attachment) return null;

  const fileUrl = getPublicUrl(attachment.file_path);
  const isImage = attachment.file_type.startsWith('image/');
  const isPDF = attachment.file_type === 'application/pdf';
  const isVideo = attachment.file_type.startsWith('video/');
  const isAudio = attachment.file_type.startsWith('audio/');
  
  const canPreview = (isImage && !imageError) || isPDF || isVideo || isAudio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {attachment.file_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {(attachment.file_size / 1024).toFixed(1)} KB
          </p>
        </DialogHeader>
        
        <div className="p-6 pt-4 overflow-auto max-h-[calc(90vh-120px)]">
          {canPreview ? (
            <div className="flex items-center justify-center bg-muted/50 rounded-lg min-h-[400px]">
              {isImage && !imageError && (
                <img 
                  src={fileUrl} 
                  alt={attachment.file_name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                  onError={() => setImageError(true)}
                />
              )}
              
              {isPDF && (
                <iframe
                  src={fileUrl}
                  className="w-full h-[70vh] rounded border-0"
                  title={attachment.file_name}
                />
              )}
              
              {isVideo && (
                <video 
                  controls 
                  className="max-w-full max-h-[70vh] rounded"
                  preload="metadata"
                >
                  <source src={fileUrl} type={attachment.file_type} />
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              )}
              
              {isAudio && (
                <div className="w-full max-w-2xl p-8">
                  <audio 
                    controls 
                    className="w-full"
                    preload="metadata"
                  >
                    <source src={fileUrl} type={attachment.file_type} />
                    Seu navegador não suporta reprodução de áudio.
                  </audio>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
              <div className="text-muted-foreground">
                <svg
                  className="h-16 w-16 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium">Preview não disponível</p>
                <p className="text-sm">
                  Este tipo de arquivo não pode ser visualizado no navegador.
                </p>
              </div>
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
