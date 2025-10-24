import React from 'react';
import { EmptyChatState } from './EmptyChatState';
import { ActiveChat } from './ActiveChat';

interface MainPanelProps {
  activeChatId: string | null;
  chatName?: string;
}

export function MainPanel({ activeChatId, chatName }: MainPanelProps) {
  if (!activeChatId) {
    return <EmptyChatState />;
  }

  return (
    <ActiveChat 
      chatId={activeChatId} 
      chatName={chatName || 'Unknown Chat'} 
      isOnline={false}
    />
  );
}
