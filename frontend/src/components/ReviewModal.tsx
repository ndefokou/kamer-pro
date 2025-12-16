import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, SprayCan, CheckCircle, Key, MessageSquare, Map, Tag } from 'lucide-react';
import { Label } from "@/components/ui/label";

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (review: any) => void;
}

const categories = [
    { id: 'cleanliness', label: 'Cleanliness', icon: SprayCan },
    { id: 'accuracy', label: 'Accuracy', icon: CheckCircle },
    { id: 'checkin', label: 'Check-in', icon: Key },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'location', label: 'Location', icon: Map },
    { id: 'value', label: 'Value', icon: Tag },
];

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [ratings, setRatings] = useState<Record<string, number>>({
        cleanliness: 5,
        accuracy: 5,
        checkin: 5,
        communication: 5,
        location: 5,
        value: 5,
    });
    const [comment, setComment] = useState('');

    const handleRatingChange = (category: string, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = () => {
        const reviewData = {
            ratings,
            comment,
            timestamp: new Date().toISOString(),
        };
        onSubmit(reviewData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Write a Review</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <div key={cat.id} className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className="h-4 w-4 text-gray-500" />
                                        <Label className="font-semibold">{cat.label}</Label>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => handleRatingChange(cat.id, star)}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    className={`h-6 w-6 ${star <= ratings[cat.id]
                                                            ? 'fill-black text-black'
                                                            : 'text-gray-300'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment" className="font-semibold">Your Message</Label>
                        <Textarea
                            id="comment"
                            placeholder="Share your experience..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-[#FF385C] hover:bg-[#D9324E] text-white">
                        Submit Review
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReviewModal;
