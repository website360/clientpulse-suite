import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingStatus {
  userId: string;
  userName: string;
  timestamp: number;
}

export function useTypingStatus(ticketId: string, currentUserId?: string) {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!ticketId || !currentUserId) return;

    const channelName = `ticket-${ticketId}`;
    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingStatus[] = [];

        Object.keys(state).forEach((userId) => {
          if (userId !== currentUserId) {
            const presences = state[userId] as any[];
            if (presences && presences.length > 0) {
              const presence = presences[0] as any;
              if (presence?.typing && Date.now() - presence?.timestamp < 5000) {
                typing.push({
                  userId,
                  userName: presence?.user_name || 'Usuário',
                  timestamp: presence?.timestamp,
                });
              }
            }
          }
        });

        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Enviar presença inicial
          await presenceChannel.track({
            user_id: currentUserId,
            typing: false,
            timestamp: Date.now(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup: remover usuários que pararam de digitar há mais de 5s
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 5000));
    }, 1000);

    return () => {
      clearInterval(interval);
      presenceChannel.unsubscribe();
    };
  }, [ticketId, currentUserId]);

  const setTyping = async (isTyping: boolean, userName?: string) => {
    if (!channel || !currentUserId) return;

    try {
      await channel.track({
        user_id: currentUserId,
        user_name: userName || 'Usuário',
        typing: isTyping,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  return {
    typingUsers,
    setTyping,
  };
}