/**
 * Notifications Hook
 * 
 * Manages real-time notifications from Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../utils/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'message' | 'mention' | 'system';
  read: boolean;
  created_at: string;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface NotificationsActions {
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

export function useNotifications(): NotificationsState & NotificationsActions {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  });

  /**
   * Load notifications from Supabase
   */
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, notifications: [], unreadCount: 0 }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      const unreadCount = data?.filter(n => !n.read).length || 0;

      setState(prev => ({
        ...prev,
        notifications: data || [],
        unreadCount,
        isLoading: false,
      }));

    } catch (error) {
      console.error('Error loading notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load notifications',
        isLoading: false,
      }));
    }
  }, [user]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));

    } catch (error) {
      console.error('Error marking notification as read:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read',
      }));
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        throw error;
      }

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      }));
    }
  }, [user]);

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Load notifications when user changes
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Set up real-time subscription for notifications
   */
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          setState(prev => ({
            ...prev,
            notifications: [newNotification, ...prev.notifications],
            unreadCount: prev.unreadCount + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    clearError,
  };
}
