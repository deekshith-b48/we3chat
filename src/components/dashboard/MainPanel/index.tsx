/**
 * Main Panel Component
 * 
 * Container for chat interface - shows either empty state or active chat
 */

import React from 'react';
import EmptyChatState from './EmptyChatState';
import ActiveChat from './ActiveChat';

interface MainPanelProps {
  activeChatId?: string;
  activeChatName?: string;
}

export default function MainPanel({ activeChatId, activeChatName }: MainPanelProps) {
  if (!activeChatId || !activeChatName) {
    return <EmptyChatState />;
  }

  return <ActiveChat chatId={activeChatId} chatName={activeChatName} />;
}
