'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/store/chat-store';
import { useAuth } from '@/hooks/use-auth';
import App from '@/components/App';

export default function ChatPage() {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const { setSelectedFriend, friends } = useChatStore();

  useEffect(() => {
    if (isAuthenticated && params.id) {
      // Find friend by address or conversation ID
      const friend = friends.find(f => 
        f.address === params.id || 
        f.address.toLowerCase() === (params.id as string).toLowerCase()
      );
      
      if (friend) {
        setSelectedFriend(friend.address);
      }
    }
  }, [isAuthenticated, params.id, friends, setSelectedFriend]);

  return <App />;
}
