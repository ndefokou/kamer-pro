import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createReport } from '@/api/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportHostModalProps {
    isOpen: boolean;
    onClose: () => void;
    hostId: number;
    listingId?: string;
}

const ReportHostModal: React.FC<ReportHostModalProps> = ({ isOpen, onClose, hostId, listingId }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;

        setIsSubmitting(true);
        try {
            await createReport({
                host_id: hostId,
                listing_id: listingId,
                reason: reason.trim(),
            });
            toast.success('Report submitted successfully. Thank you for your feedback.');
            setReason('');
            onClose();
        } catch (error) {
            console.error('Failed to submit report:', error);
            toast.error('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Report this Host</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Why are you reporting this host?</Label>
                        <Textarea
                            id="reason"
                            placeholder="Please provide details about your concern..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!reason.trim() || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Report'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ReportHostModal;
