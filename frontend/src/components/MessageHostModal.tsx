import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createConversation } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MessageHostModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    hostId: number;
    hostName: string;
}

const MessageHostModal: React.FC<MessageHostModalProps> = ({
    isOpen,
    onClose,
    listingId,
    hostId,
    hostName,
}) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSend = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            const result = await createConversation(listingId, hostId, message);
            toast({
                title: "Message sent",
                description: "Your message has been sent to the host.",
            });
            onClose();
            // Navigate to the conversation
            navigate(`/messages?conversationId=${result.conversation_id}`);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Message {hostName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder={`Hi ${hostName}, I'm interested in your place...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={!message.trim() || isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MessageHostModal;
