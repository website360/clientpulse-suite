import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const commonEmojis = [
  '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘', '😗', '😙',
  '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣',
  '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛',
  '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲',
  '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧',
  '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪',
  '👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '💪', '👏', '🙌',
  '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕',
  '💖', '💗', '💘', '💝', '💞', '💟', '⭐', '🌟', '✨', '💫',
  '🔥', '💥', '💯', '✅', '❌', '⚠️', '🎉', '🎊', '🎈', '🎁',
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid grid-cols-10 gap-1">
          {commonEmojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onEmojiSelect(emoji)}
              className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded transition-colors text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
