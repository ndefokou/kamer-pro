import { createContext } from "react";

export interface Conversation {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string | null;
  buyer_id: number;
  buyer_username: string;
  seller_id: number;
  seller_username: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  images: string[];
}

export interface MessageTemplate {
  id: number;
  template_text: string;
  category: string;
}

export interface MessagingContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  templates: MessageTemplate[];
  unreadCount: number;
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  createOrGetConversation: (productId: number, sellerId: number) => Promise<number>;
  selectConversation: (conversationId: number) => Promise<void>;
  sendMessage: (conversationId: number, content: string, messageType?: string) => Promise<void>;
  sendImageMessage: (conversationId: number, content: string, images: File[]) => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
  fetchTemplates: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

export const MessagingContext = createContext<MessagingContextType | undefined>(
  undefined,
);
