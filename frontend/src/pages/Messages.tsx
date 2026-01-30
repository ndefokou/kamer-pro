import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getConversations, getMessages, sendMessage, Conversation, Message } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Search, MoreVertical, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import Header from '@/components/Header';
import HostHeader from '@/components/HostHeader';
import { useTranslation } from 'react-i18next';

const Messages: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const conversationIdParam = searchParams.get('conversationId');
    const isHostView = searchParams.get('view') === 'host';
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdParam);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch conversations
    const { data: conversations, isLoading: isLoadingConversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: getConversations,
    });

    // Fetch messages for selected conversation
    const { data: messages, isLoading: isLoadingMessages } = useQuery({
        queryKey: ['messages', selectedConversationId],
        queryFn: () => getMessages(selectedConversationId!),
        enabled: !!selectedConversationId,
        refetchInterval: 5000,
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
            sendMessage(conversationId, content),
        onSuccess: () => {
            setNewMessage('');
            queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Update selected conversation from URL
    useEffect(() => {
        if (conversationIdParam) {
            setSelectedConversationId(conversationIdParam);
        } else if (conversations && conversations.length > 0 && !selectedConversationId) {
            // Select first conversation by default if none selected
            setSelectedConversationId(conversations[0].conversation.id);
        }
    }, [conversationIdParam, conversations]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId) return;

        sendMessageMutation.mutate({
            conversationId: selectedConversationId,
            content: newMessage,
        });
    };

    const selectedConversation = conversations?.find(c => c.conversation.id === selectedConversationId);
    const currentUserId = parseInt(localStorage.getItem('userId') || '0');

    if (isLoadingConversations) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {isHostView ? <HostHeader /> : <Header />}
            <div className="pt-8 pb-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-140px)]">
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-full flex">
                        {/* Sidebar - Conversations List */}
                        <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-4 border-b">
                                <h2 className="text-xl font-bold mb-4">{t('messages.title', 'Messages')}</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input placeholder={t('messages.searchPlaceholder', 'Search messages')} className="pl-9 bg-gray-50 border-gray-200" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {conversations?.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        {t('messages.noMessages', 'No messages yet')}
                                    </div>
                                ) : (
                                    conversations?.map((conv) => (
                                        <div
                                            key={conv.conversation.id}
                                            onClick={() => {
                                                setSelectedConversationId(conv.conversation.id);
                                                setSearchParams({ conversationId: conv.conversation.id });
                                            }}
                                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedConversationId === conv.conversation.id ? 'bg-gray-50 border-l-4 border-l-black' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={conv.other_user.avatar} />
                                                    <AvatarFallback>{conv.other_user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-semibold truncate">{conv.other_user.name}</h3>
                                                        {conv.last_message && (
                                                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                                {format(new Date(conv.last_message.created_at), 'MMM d')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate mb-1">
                                                        {conv.listing_title}
                                                    </p>
                                                    <p className={`text-sm truncate ${!conv.last_message?.read_at && conv.last_message?.sender_id !== currentUserId ? 'font-bold text-black' : 'text-gray-500'}`}>
                                                        {conv.last_message?.content || t('messages.noMessages', 'No messages yet')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Main Content - Chat Interface */}
                        <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                            {selectedConversation ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="md:hidden"
                                                onClick={() => {
                                                    setSelectedConversationId(null);
                                                    setSearchParams({});
                                                }}
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </Button>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={selectedConversation.other_user.avatar} />
                                                <AvatarFallback>{selectedConversation.other_user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold">{selectedConversation.other_user.name}</h3>
                                                <p className="text-xs text-gray-500">{t('messages.responseTime', { time: '1 hour', defaultValue: 'Response time: 1 hour' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedConversation.listing_image && (
                                                <OptimizedImage
                                                    src={getImageUrl(selectedConversation.listing_image)}
                                                    alt="Listing"
                                                    className="h-10 w-10 rounded object-cover hidden sm:block"
                                                />
                                            )}
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                                        {isLoadingMessages ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                            </div>
                                        ) : (
                                            messages?.map((msg) => {
                                                const isMe = msg.sender_id === currentUserId;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div
                                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                                ? 'bg-black text-white rounded-tr-none'
                                                                : 'bg-gray-100 text-gray-900 rounded-tl-none'
                                                                }`}
                                                        >
                                                            <p className="text-sm">{msg.content}</p>
                                                            <div className={`text-[10px] mt-1 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {format(new Date(msg.created_at), 'h:mm a')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 border-t">
                                        <form onSubmit={handleSendMessage} className="flex gap-2">
                                            <Input
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder={t('messages.typePlaceholder', 'Type a message...')}
                                                className="flex-1"
                                                disabled={sendMessageMutation.isPending}
                                            />
                                            <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
                                                {sendMessageMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    {t('messages.selectConversation', 'Select a conversation to start messaging')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Messages;
