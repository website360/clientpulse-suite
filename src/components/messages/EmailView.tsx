import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Reply, 
  Forward, 
  Trash2, 
  Star, 
  StarOff, 
  Archive,
  MoreVertical,
  Send,
  Paperclip,
  ChevronDown,
  Mail,
  User,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmailMessage {
  id: string;
  sender: string;
  senderEmail?: string;
  subject?: string;
  preview: string;
  content?: string;
  htmlContent?: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  date?: string;
}

interface EmailViewProps {
  message: EmailMessage;
  onReply: (text: string) => void;
  onStar: () => void;
  onDelete: () => void;
  onArchive: () => void;
  replyAccountName?: string;
}

export function EmailView({ message, onReply, onStar, onDelete, onArchive, replyAccountName }: EmailViewProps) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);
    await onReply(replyText);
    setReplyText('');
    setShowReply(false);
    setIsSending(false);
  };

  const renderEmailBody = () => {
    if (message.htmlContent) {
      // Render HTML in sandboxed iframe
      const htmlDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #1a1a1a;
              margin: 0;
              padding: 16px;
              background: white;
            }
            img { max-width: 100%; height: auto; }
            a { color: #0066cc; }
            table { max-width: 100% !important; }
            * { max-width: 100% !important; box-sizing: border-box; }
          </style>
        </head>
        <body>${message.htmlContent}</body>
        </html>
      `;
      
      return (
        <iframe
          ref={iframeRef}
          srcDoc={htmlDoc}
          sandbox="allow-same-origin"
          className="w-full border-0 min-h-[300px] rounded-lg bg-white"
          style={{ height: '500px' }}
          onLoad={() => {
            // Auto-resize iframe
            if (iframeRef.current?.contentDocument?.body) {
              const height = iframeRef.current.contentDocument.body.scrollHeight;
              iframeRef.current.style.height = `${Math.min(Math.max(height + 32, 200), 800)}px`;
            }
          }}
        />
      );
    }

    // Plain text fallback
    return (
      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed p-4">
        {message.content || message.preview}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Email Header - Outlook style */}
      <div className="border-b px-6 py-4 space-y-3 bg-card">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowReply(true)}>
              <Reply className="h-3.5 w-3.5" />
              Responder
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Forward className="h-3.5 w-3.5" />
              Encaminhar
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onArchive}>
              <Archive className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onStar}>
              {message.starred ? (
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-3.5 w-3.5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Marcar como não lido</DropdownMenuItem>
                <DropdownMenuItem>Mover para...</DropdownMenuItem>
                <DropdownMenuItem>Imprimir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subject */}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {message.subject || '(Sem Assunto)'}
        </h2>

        {/* Sender info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{message.sender}</span>
              <span className="text-xs text-muted-foreground">&lt;{message.senderEmail}&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3" />
              <span>{message.date || message.timestamp}</span>
              <span>•</span>
              <span>Para: mim</span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-4 px-6">
          {renderEmailBody()}
        </div>
      </div>

      {/* Reply Section */}
      {showReply && (
        <div className="border-t bg-card px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="h-4 w-4" />
            <span>Respondendo para <strong className="text-foreground">{message.sender}</strong></span>
            {replyAccountName && (
              <Badge variant="outline" className="text-xs ml-auto">
                via {replyAccountName}
              </Badge>
            )}
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreva sua resposta..."
            className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 resize-y"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReply(false); setReplyText(''); }}>
                Cancelar
              </Button>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
              >
                <Send className="h-3.5 w-3.5" />
                {isSending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick reply bar (when reply section is hidden) */}
      {!showReply && (
        <div className="border-t bg-card px-6 py-3">
          <div 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-input bg-background cursor-text hover:border-primary/30 transition-colors"
            onClick={() => setShowReply(true)}
          >
            <Reply className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Responder a {message.sender}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
