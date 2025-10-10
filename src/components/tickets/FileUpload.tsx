import { useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxSizeMB?: number;
  multiple?: boolean;
}

export function FileUpload({ onFilesChange, maxSizeMB = 1, multiple = true }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSizeBytes) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name} excede o limite de ${maxSizeMB}MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    const newFiles = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Anexar arquivos
        </Button>
        <span className="text-xs text-muted-foreground">
          Máximo {maxSizeMB}MB por arquivo
        </span>
      </div>

      <input
        id="file-upload"
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-md bg-muted"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
