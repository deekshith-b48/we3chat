import { Message, Chat } from './messageTypes';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  showMessagePreview: boolean;
  showGroupNotifications: boolean;
  showTypingNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private settings: NotificationSettings = {
    enabled: true,
    showMessagePreview: true,
    showGroupNotifications: true,
    showTypingNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };
  private activeNotifications: Map<string, Notification> = new Map();

  constructor() {
    this.loadSettings();
    this.setupServiceWorker();
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  async showNotification(title: string, options: NotificationOptions): Promise<Notification | null> {
    if (!this.settings.enabled || !this.isNotificationAllowed()) {
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('Notifications are in quiet hours');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data,
        actions: options.actions
      });

      // Store notification for cleanup
      if (options.tag) {
        this.activeNotifications.set(options.tag, notification);
      }

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
          if (options.tag) {
            this.activeNotifications.delete(options.tag);
          }
        }, 5000);
      }

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.tag) {
          this.activeNotifications.delete(options.tag);
        }
        
        // Handle notification actions
        if (options.data?.action) {
          this.handleNotificationAction(options.data.action, options.data);
        }
      };

      // Play sound if enabled
      if (this.settings.soundEnabled) {
        this.playNotificationSound();
      }

      // Vibrate if enabled
      if (this.settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  async showMessageNotification(
    sender: string,
    message: Message,
    chat: Chat,
    avatar?: string
  ): Promise<Notification | null> {
    if (!this.settings.showMessagePreview) {
      return this.showNotification(`New message from ${sender}`, {
        title: `New message from ${sender}`,
        body: 'You have a new message',
        tag: `message-${chat.id}`,
        icon: avatar || '/default-avatar.png',
        data: {
          action: 'open_chat',
          chatId: chat.id,
          messageId: message.id
        }
      });
    }

    const messagePreview = this.getMessagePreview(message);
    const title = chat.type === 'group' ? `${sender} in ${chat.name}` : sender;
    const body = messagePreview;

    return this.showNotification(title, {
      title,
      body,
      tag: `message-${chat.id}`,
      icon: avatar || '/default-avatar.png',
      data: {
        action: 'open_chat',
        chatId: chat.id,
        messageId: message.id
      }
    });
  }

  async showGroupNotification(
    groupName: string,
    sender: string,
    message: Message
  ): Promise<Notification | null> {
    if (!this.settings.showGroupNotifications) {
      return null;
    }

    const messagePreview = this.getMessagePreview(message);
    const title = `${sender} in ${groupName}`;
    const body = messagePreview;

    return this.showNotification(title, {
      title,
      body,
      tag: `group-${groupName}`,
      icon: '/group-icon.png',
      data: {
        action: 'open_group',
        groupId: message.chatId,
        messageId: message.id
      }
    });
  }

  async showTypingNotification(
    chatId: string,
    userName: string,
    isTyping: boolean
  ): Promise<Notification | null> {
    if (!this.settings.showTypingNotifications || !isTyping) {
      return null;
    }

    return this.showNotification(`${userName} is typing...`, {
      title: 'Typing',
      body: `${userName} is typing in chat`,
      tag: `typing-${chatId}`,
      silent: true,
      data: {
        action: 'typing',
        chatId,
        userName
      }
    });
  }

  async showFriendRequestNotification(
    sender: string,
    senderName: string
  ): Promise<Notification | null> {
    return this.showNotification('New friend request', {
      title: 'Friend Request',
      body: `${senderName} wants to be your friend`,
      tag: `friend-request-${sender}`,
      icon: '/friend-request-icon.png',
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' }
      ],
      data: {
        action: 'friend_request',
        sender,
        senderName
      }
    });
  }

  async showGroupInviteNotification(
    groupName: string,
    inviter: string,
    inviterName: string
  ): Promise<Notification | null> {
    return this.showNotification('Group invitation', {
      title: 'Group Invitation',
      body: `${inviterName} invited you to join ${groupName}`,
      tag: `group-invite-${groupName}`,
      icon: '/group-invite-icon.png',
      requireInteraction: true,
      actions: [
        { action: 'join', title: 'Join Group' },
        { action: 'decline', title: 'Decline' }
      ],
      data: {
        action: 'group_invite',
        groupName,
        inviter,
        inviterName
      }
    });
  }

  // Settings management
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }

  // Helper methods
  private getMessagePreview(message: Message): string {
    switch (message.content.type) {
      case 'text':
        return message.content.content;
      case 'image':
        return message.content.caption || '📷 Image';
      case 'file':
        return `📎 ${message.content.fileName}`;
      case 'voice':
        return `🎤 Voice message (${Math.round(message.content.duration)}s)`;
      case 'video':
        return `🎥 Video (${Math.round(message.content.duration)}s)`;
      case 'location':
        return '📍 Location';
      case 'contact':
        return `👤 ${message.content.contactName}`;
      case 'sticker':
        return '😀 Sticker';
      case 'poll':
        return `📊 Poll: ${message.content.question}`;
      case 'system':
        return message.content.content;
      default:
        return 'Message';
    }
  }

  private isNotificationAllowed(): boolean {
    // Check if document is visible (user is not on the page)
    return document.visibilityState === 'hidden';
  }

  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Failed to create notification sound:', error);
    }
  }

  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'open_chat':
        // Emit custom event to open chat
        window.dispatchEvent(new CustomEvent('openChat', { detail: data }));
        break;
      case 'open_group':
        // Emit custom event to open group
        window.dispatchEvent(new CustomEvent('openGroup', { detail: data }));
        break;
      case 'friend_request':
        // Emit custom event to handle friend request
        window.dispatchEvent(new CustomEvent('friendRequest', { detail: data }));
        break;
      case 'group_invite':
        // Emit custom event to handle group invite
        window.dispatchEvent(new CustomEvent('groupInvite', { detail: data }));
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  }

  private setupServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.warn('Service Worker registration failed:', error);
        });
    }
  }

  // Cleanup methods
  closeNotification(tag: string): void {
    const notification = this.activeNotifications.get(tag);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(tag);
    }
  }

  closeAllNotifications(): void {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  // Permission management
  getPermission(): NotificationPermission {
    return this.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }
}

export const notificationService = new NotificationService();
