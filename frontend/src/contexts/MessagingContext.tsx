import React, { useState, useEffect, useCallback, useRef } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import {
  MessagingContext,
  Conversation,
  Message,
  MessageTemplate,
} from "./MessagingContextTypes";

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const prevUnreadCountRef = useRef(unreadCount);

  const fetchConversations = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await apiClient.get("/messages");
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await apiClient.get("/messages/templates");
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await apiClient.get("/messages/unread-count");
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  const createOrGetConversation = useCallback(async (
    productId: number,
    sellerId: number,
  ): Promise<number> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post("/messages/conversations", {
        product_id: productId,
        seller_id: sellerId,
      });
      await fetchConversations();
      return response.data.id;
    } catch (error) {
      let errorMessage = "Failed to create conversation";
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConversations, toast]);

  const selectConversation = useCallback(async (conversationId: number) => {
    setIsLoading(true);
    try {
      const conv = conversations.find((c) => c.id === conversationId);
      setCurrentConversation(conv || null);
      
      const response = await apiClient.get(`/messages/${conversationId}/messages`);
      setMessages(response.data);
      
      // Refresh conversations to update unread count
      await fetchConversations();
      await refreshUnreadCount();
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversations, fetchConversations, refreshUnreadCount, toast]);

  const sendMessage = useCallback(async (
    conversationId: number,
    content: string,
    messageType: string = "text",
  ) => {
    setIsLoading(true);
    try {
      await apiClient.post("/messages/send", {
        conversation_id: conversationId,
        content,
        message_type: messageType,
      });
      
      // Refresh messages
      const response = await apiClient.get(`/messages/${conversationId}/messages`);
      setMessages(response.data);
      
      // Refresh conversations to update last message
      await fetchConversations();
    } catch (error) {
      let errorMessage = "Failed to send message";
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchConversations, toast]);

  const sendImageMessage = useCallback(async (
    conversationId: number,
    content: string,
    images: File[],
  ) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("conversation_id", conversationId.toString());
      formData.append("content", content);
      images.forEach((image) => {
        formData.append("images[]", image);
      });

      await apiClient.post("/messages/send-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Refresh messages
      const response = await apiClient.get(`/messages/${conversationId}/messages`);
      setMessages(response.data);
      
      // Refresh conversations
      await fetchConversations();
      
      toast({
        title: "Success",
        description: "Image sent successfully",
      });
    } catch (error) {
      let errorMessage = "Failed to send image";
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchConversations, toast]);

  const deleteConversation = useCallback(async (conversationId: number) => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/messages/${conversationId}`);
      await fetchConversations();
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    } catch (error) {
      let errorMessage = "Failed to delete conversation";
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentConversation, fetchConversations, toast]);

  const createConversation = useCallback(
    async (sellerId: number, productId: number) => {
      try {
        const conversationId = await createOrGetConversation(
          productId,
          sellerId,
        );
        return conversationId;
      } catch (error) {
        // Error is already handled in createOrGetConversation
      }
    },
    [createOrGetConversation],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchConversations();
      fetchTemplates();
      refreshUnreadCount();
    }
  }, [fetchConversations, fetchTemplates, refreshUnreadCount]);

  useEffect(() => {
    if (!currentConversation) {
      return;
    }

    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      selectConversation(currentConversation.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentConversation, selectConversation]);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      toast({
        title: "New Message",
        description: "You have a new unread message.",
      });
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, toast]);

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        templates,
        unreadCount,
        isLoading,
        fetchConversations,
        createOrGetConversation,
        selectConversation,
        sendMessage,
        sendImageMessage,
        deleteConversation,
        fetchTemplates,
        refreshUnreadCount,
        createConversation,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};
