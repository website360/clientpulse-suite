import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smile, Heart, Hand, Sparkles, PartyPopper } from 'lucide-react';

const emojiCategories = {
  smileys: {
    label: 'Emoções',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘', '😗', '😙',
      '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣',
      '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛',
      '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲',
      '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧',
      '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪',
    ],
  },
  hands: {
    label: 'Gestos',
    icon: Hand,
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '💪', '👏', '🙌',
      '👋', '🤚', '🖐️', '✋', '🖖', '👊', '✊', '🤛', '🤜', '🤲',
      '👐', '🙌', '👏', '🤝', '👆', '👇', '👈', '👉', '☝️', '✍️',
    ],
  },
  hearts: {
    label: 'Corações',
    icon: Heart,
    emojis: [
      '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
      '💕', '💖', '💗', '💘', '💝', '💞', '💟', '❤️‍🔥', '❤️‍🩹', '💌',
    ],
  },
  symbols: {
    label: 'Símbolos',
    icon: Sparkles,
    emojis: [
      '⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '✅', '❌', '⚠️',
      '🚀', '💡', '🎯', '📌', '📍', '🔔', '⏰', '⏳', '💰', '💵',
      '🎁', '🎈', '🏆', '🥇', '🥈', '🥉', '🔑', '🔒', '🔓', '📱',
    ],
  },
  celebration: {
    label: 'Celebração',
    icon: PartyPopper,
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎂', '🍰', '🧁', '🎀', '🎗️', '🏅',
      '🥳', '🤩', '😎', '🎆', '🎇', '✨', '🌟', '💐', '🌹', '🌺',
    ],
  },
};

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
      <PopoverContent className="w-[340px] p-0" align="start">
        <Tabs defaultValue="smileys" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            {Object.entries(emojiCategories).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {Object.entries(emojiCategories).map(([key, category]) => (
            <TabsContent key={key} value={key} className="p-2 m-0">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                {category.label}
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                {category.emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onEmojiSelect(emoji)}
                    className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
