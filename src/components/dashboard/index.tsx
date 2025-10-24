/**
 * Dashboard Component
 * 
 * Main dashboard layout with sidebar and main panel
 */

import React, { useState } from 'react';
import TopNavBar from './TopNavBar';
import Sidebar from './Sidebar';
import MainPanel from './MainPanel';
import { getSupabaseClient } from '../../utils/supabase';
import { useAuth } from '../../hooks/supabase/useAuth';

export default function Dashboard() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [activeChatName, setActiveChatName] = useState<string | undefined>();
  const { user } = useAuth();

  /**
   * Handle chat selection
   */
  const handleChatSelect = async (chatId: string) => {
    try {
      setActiveChatId(chatId);

      // Fetch chat details
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chats')
        .select('name, type, chat_participants(profiles(username))')
        .eq('id', chatId)
        .single();

      if (error) {
        console.error('Error fetching chat details:', error);
        setActiveChatName('Unknown Chat');
        return;
      }

      // Determine display name
      let displayName = data.name;
      
      if (data.type === 'direct') {
        // For direct chats, show the other participant's name
        const otherParticipant = data.chat_participants.find((p: any) => p.profiles.id !== user?.id);
        if (otherParticipant) {
          displayName = (otherParticipant.profiles as any)?.display_name || 'Unknown User';
        }
      }

      setActiveChatName(displayName);
    } catch (error) {
      console.error('Error handling chat selection:', error);
      setActiveChatName('Unknown Chat');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <TopNavBar />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          onChatSelect={handleChatSelect}
          activeChatId={activeChatId}
        />
        
        {/* Main Panel */}
        <div className="flex-1 flex flex-col">
          <MainPanel 
            activeChatId={activeChatId}
            activeChatName={activeChatName}
          />
        </div>
      </div>
    </div>
  );
}
