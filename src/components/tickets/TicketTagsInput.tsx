import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Tag as TagIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

const normalize = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);

export function TicketTagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Adicionar tag...',
  disabled = false,
}: TicketTagsInputProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSuggestions = suggestions
    .filter((s) => s && !value.includes(s))
    .filter((s) => (text ? s.toLowerCase().includes(text.toLowerCase()) : true))
    .slice(0, 8);

  const addTag = (raw: string) => {
    const norm = normalize(raw);
    if (!norm) return;
    if (value.includes(norm)) return;
    onChange([...value, norm]);
    setText('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (text.trim()) addTag(text);
    } else if (e.key === 'Backspace' && !text && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[40px] rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-input cursor-text',
          disabled && 'opacity-60 pointer-events-none'
        )}
      >
        {value.length === 0 && !text && (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs px-1">
            <TagIcon className="h-3 w-3" />
            Sem tags
          </span>
        )}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-primary/10 text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:bg-primary/15 rounded-full p-0.5"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
          disabled={disabled}
        />
      </div>

      {open && (filteredSuggestions.length > 0 || text.trim().length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-popover border rounded-md shadow-md py-1 max-h-60 overflow-auto">
          {text.trim() && !value.includes(normalize(text)) && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => addTag(text)}
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              Criar tag <span className="font-medium">"{normalize(text)}"</span>
            </button>
          )}
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => addTag(s)}
            >
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
