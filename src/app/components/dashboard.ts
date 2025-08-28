import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from './chat';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
  isOnline?: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ChatComponent],
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-lg">W</span>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900">we3chat</h1>
                <p class="text-sm text-gray-500">{{ currentUser().name }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button 
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                (click)="showNewChatModal = true"
                title="New Chat">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
              <button 
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                [routerLink]="['/profile']"
                title="Profile">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </button>
              <button 
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                [routerLink]="['/settings']"
                title="Settings">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="p-4">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Search chats..." 
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              [(ngModel)]="searchQuery"
              #searchInput>
          </div>
        </div>

        <!-- Chat Categories -->
        <div class="px-4 pb-2">
          <div class="flex space-x-1">
            <button 
              *ngFor="let tab of chatTabs" 
              (click)="activeTab.set(tab.id)"
              [class]="'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ' + 
                       (activeTab() === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100')">
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Chat List -->
        <div class="flex-1 overflow-y-auto">
          <div class="space-y-1 p-2">
            <div 
              *ngFor="let chat of filteredChats()" 
              class="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
              [class.bg-blue-50]="selectedChatId() === chat.id"
              (click)="selectChat(chat.id)">
              
              <!-- Avatar -->
              <div class="relative flex-shrink-0">
                <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                  <span class="text-white font-semibold">{{ getInitials(chat.name) }}</span>
                </div>
                <div 
                  *ngIf="chat.isOnline && !chat.isGroup" 
                  class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full">
                </div>
              </div>

              <!-- Chat Info -->
              <div class="ml-3 flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-gray-900 truncate">{{ chat.name }}</h3>
                  <span class="text-xs text-gray-500">{{ chat.timestamp }}</span>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <p class="text-sm text-gray-600 truncate">{{ chat.lastMessage }}</p>
                  <div 
                    *ngIf="chat.unreadCount > 0" 
                    class="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                    {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <div *ngIf="!selectedChatId()" class="flex-1 flex items-center justify-center bg-gray-50">
          <div class="text-center">
            <div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome to we3chat</h2>
            <p class="text-gray-600 mb-6 max-w-md">Select a conversation from the sidebar to start chatting, or create a new chat to get started.</p>
            <button 
              (click)="showNewChatModal = true"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Start New Chat
            </button>
          </div>
        </div>

        <div *ngIf="selectedChatId()" class="flex-1">
          <app-chat [chatId]="selectedChatId()!"></app-chat>
        </div>
      </div>

      <!-- New Chat Modal -->
      <div 
        *ngIf="showNewChatModal" 
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        (click)="showNewChatModal = false">
        <div 
          class="bg-white rounded-lg p-6 w-96 max-w-[90vw]"
          (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Start New Chat</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Search users</label>
              <input 
                type="text" 
                placeholder="Enter username or email..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            </div>
            <div class="flex justify-end space-x-3">
              <button 
                (click)="showNewChatModal = false"
                class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button 
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  searchQuery = '';
  showNewChatModal = false;
  activeTab = signal('all');
  selectedChatId = signal<string | null>(null);

  chatTabs = [
    { id: 'all', label: 'All' },
    { id: 'personal', label: 'Personal' },
    { id: 'groups', label: 'Groups' }
  ];

  currentUser = signal<User>({
    id: '1',
    name: 'John Doe',
    username: '@johndoe',
    isOnline: true
  });

  chats = signal<Chat[]>([
    {
      id: '1',
      name: 'Sarah Wilson',
      lastMessage: 'Hey! How are you doing today?',
      timestamp: '2m ago',
      unreadCount: 2,
      isGroup: false,
      isOnline: true
    },
    {
      id: '2',
      name: 'Team Alpha',
      lastMessage: 'Meeting at 3 PM today',
      timestamp: '15m ago',
      unreadCount: 5,
      isGroup: true
    },
    {
      id: '3',
      name: 'Mike Johnson',
      lastMessage: 'Thanks for the help!',
      timestamp: '1h ago',
      unreadCount: 0,
      isGroup: false,
      isOnline: false
    },
    {
      id: '4',
      name: 'Design Team',
      lastMessage: 'New mockups are ready',
      timestamp: '2h ago',
      unreadCount: 3,
      isGroup: true
    },
    {
      id: '5',
      name: 'Emily Davis',
      lastMessage: 'Let\'s catch up soon!',
      timestamp: 'Yesterday',
      unreadCount: 0,
      isGroup: false,
      isOnline: true
    }
  ]);

  filteredChats() {
    let filtered = this.chats();
    
    if (this.activeTab() === 'personal') {
      filtered = filtered.filter(chat => !chat.isGroup);
    } else if (this.activeTab() === 'groups') {
      filtered = filtered.filter(chat => chat.isGroup);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(chat => 
        chat.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return filtered;
  }

  selectChat(chatId: string) {
    this.selectedChatId.set(chatId);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
