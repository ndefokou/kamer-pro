import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import { useMessaging } from "@/hooks/useMessaging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Trash2,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";

const Messages = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversation,
    messages,
    templates,
    selectConversation,
    sendMessage,
    sendImageMessage,
    deleteConversation,
    isLoading,
  } = useMessaging();

  const [messageText, setMessageText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userId") || "0");

  useEffect(() => {
    if (!token) {
      navigate("/webauth-login");
    }
  }, [token, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onDrop = (acceptedFiles: File[]) => {
    setSelectedImages([...selectedImages, ...acceptedFiles]);
    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: true,
    maxFiles: 5,
    noClick: true,
    noKeyboard: true,
  });

  const handleSendMessage = async () => {
    if (!currentConversation) return;
    
    if (selectedImages.length > 0) {
      await sendImageMessage(currentConversation.id, messageText, selectedImages);
      setSelectedImages([]);
      setImagePreviews([]);
    } else if (messageText.trim()) {
      await sendMessage(currentConversation.id, messageText);
    }
    
    setMessageText("");
  };

  const handleTemplateClick = (templateText: string) => {
    setMessageText(templateText);
    setShowTemplates(false);
  };

  const handleDeleteConversation = async (conversationId: number) => {
    if (confirm(t("are you sure you want to delete this conversation"))) {
      await deleteConversation(conversationId);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, "HH:mm");
    } else if (diffInHours < 48) {
      return t("yesterday");
    } else {
      return format(date, "MMM dd");
    }
  };

  const getOtherParticipant = (conversation: typeof currentConversation) => {
    if (!conversation) return null;
    return conversation.buyer_id === userId
      ? {
          id: conversation.seller_id,
          username: conversation.seller_username,
        }
      : {
          id: conversation.buyer_id,
          username: conversation.buyer_username,
        };
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">{t("messages")}</h2>
              </div>
              <ScrollArea className="h-[calc(100vh-280px)]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("no conversations yet")}</p>
                    <p className="text-sm mt-2">{t("start chatting with sellers")}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => {
                      const otherParticipant = getOtherParticipant(conv);
                      return (
                        <div
                          key={conv.id}
                          className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                            currentConversation?.id === conv.id ? "bg-muted" : ""
                          }`}
                          onClick={() => selectConversation(conv.id)}
                        >
                          <div className="flex items-start gap-3">
                            {conv.product_image && (
                              <img
                                src={conv.product_image}
                                alt={conv.product_name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold truncate">
                                    {otherParticipant?.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conv.product_name}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatMessageTime(conv.last_message_at)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-muted-foreground truncate flex-1">
                                  {conv.last_message || t("no messages yet")}
                                </p>
                                {conv.unread_count > 0 && (
                                  <Badge variant="default" className="ml-2">
                                    {conv.unread_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2">
            <CardContent className="p-0 flex flex-col h-full">
              {currentConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getOtherParticipant(currentConversation)
                            ?.username.charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {getOtherParticipant(currentConversation)?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currentConversation.product_name}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/product/${currentConversation.product_id}`)
                          }
                        >
                          {t("view product")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            handleDeleteConversation(currentConversation.id)
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("delete conversation")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === userId;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] ${
                                isOwnMessage
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              } rounded-lg p-3`}
                            >
                              {!isOwnMessage && (
                                <p className="text-xs font-semibold mb-1">
                                  {message.sender_username}
                                </p>
                              )}
                              {message.content && (
                                <p className="break-words">{message.content}</p>
                              )}
                              {message.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {message.images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Shared image"
                                      className="rounded cursor-pointer"
                                      onClick={() => window.open(img, "_blank")}
                                    />
                                  ))}
                                </div>
                              )}
                              <p className="text-xs opacity-70 mt-1">
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="px-4 py-2 border-t">
                      <div className="flex gap-2 overflow-x-auto">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${idx + 1}`}
                              className="h-20 w-20 object-cover rounded"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => {
                                setSelectedImages(selectedImages.filter((_, i) => i !== idx));
                                setImagePreviews(imagePreviews.filter((_, i) => i !== idx));
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="p-4 border-t" {...getRootProps()}>
                    <input {...getInputProps()} />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTemplates(true)}
                        title={t("quick templates")}
                      >
                        <Zap className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={open}
                        title={t("add image")}
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <Input
                        placeholder={t("type a message")}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || (!messageText.trim() && selectedImages.length === 0)}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold">{t("select a conversation")}</p>
                    <p className="text-sm">{t("choose a conversation to start chatting")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quick inquiry templates")}</DialogTitle>
            <DialogDescription>
              {t("choose a template to quickly start your message")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="justify-start text-left h-auto py-3"
                onClick={() => handleTemplateClick(template.template_text)}
              >
                {template.template_text}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
