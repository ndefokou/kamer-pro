import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ThumbsUp, ThumbsDown, CheckCircle, Upload, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Review {
  id: number;
  product_id: number;
  user_id: number;
  username: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  helpful_count: number;
  not_helpful_count: number;
  user_vote: boolean | null;
  images: string[];
  seller_response: {
    id: number;
    response_text: string;
    created_at: string;
  } | null;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: { rating: number; count: number }[];
}

interface ProductReviewsProps {
  productId: number;
  isProductOwner?: boolean;
}

export const ProductReviews = ({ productId, isProductOwner = false }: ProductReviewsProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseTexts, setResponseTexts] = useState<{ [key: number]: string }>({});
  const token = localStorage.getItem("token");

  const onDrop = (acceptedFiles: File[]) => {
    setImages([...images, ...acceptedFiles]);
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: true,
    maxFiles: 5,
  });

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const response = await apiClient.get(`/reviews/products/${productId}`);
      setReviews(response.data);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(`/reviews/products/${productId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch review stats:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!token) {
      toast({
        title: "Error",
        description: "Please log in to leave a review",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("product_id", productId.toString());
    formData.append("rating", rating.toString());
    if (title) formData.append("title", title);
    if (comment) formData.append("comment", comment);
    images.forEach(image => {
      formData.append("images[]", image);
    });

    try {
      await apiClient.post("/reviews", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      setIsDialogOpen(false);
      setRating(0);
      setTitle("");
      setComment("");
      setImages([]);
      setPreviews([]);
      fetchReviews();
      fetchStats();
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast({
        title: "Error",
        description: axiosError.response?.data?.message || "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (reviewId: number, isHelpful: boolean) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Please log in to vote",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post(`/reviews/${reviewId}/vote`, { is_helpful: isHelpful });
      fetchReviews();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      });
    }
  };

  const handleAddResponse = async (reviewId: number) => {
    if (!responseTexts[reviewId]) {
      toast({
        title: "Error",
        description: "Please enter a response",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post(`/reviews/${reviewId}/response`, {
        response_text: responseTexts[reviewId],
      });

      toast({
        title: "Success",
        description: "Response added successfully",
      });

      setResponseTexts({ ...responseTexts, [reviewId]: "" });
      fetchReviews();
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast({
        title: "Error",
        description: axiosError.response?.data?.message || "Failed to add response",
        variant: "destructive",
      });
    }
  };

  const StarRating = ({ value, onHover, onClick }: { value: number; onHover?: (v: number) => void; onClick?: (v: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer transition-colors ${
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onClick?.(star)}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = (rating: number) => {
    const dist = stats?.rating_distribution.find(d => d.rating === rating);
    return dist ? dist.count : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Review Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.average_rating.toFixed(1)}</div>
                <StarRating value={Math.round(stats.average_rating)} />
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {stats.total_reviews} reviews
                </p>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = getRatingDistribution(rating);
                  const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm w-12">{rating} star</span>
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Write Review Button */}
      {token && !isProductOwner && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">Write a Review</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rating *</Label>
                <StarRating
                  value={hoveredRating || rating}
                  onHover={setHoveredRating}
                  onClick={setRating}
                />
              </div>

              <div>
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience"
                />
              </div>

              <div>
                <Label htmlFor="comment">Review *</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this product"
                  rows={5}
                />
              </div>

              <div>
                <Label>Photos (Optional)</Label>
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop images
                  </p>
                </div>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {previews.map((preview, idx) => (
                      <img
                        key={idx}
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || rating === 0}
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarFallback>
                    {review.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{review.username}</span>
                    {review.is_verified_purchase && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Purchase
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StarRating value={review.rating} />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  {review.title && (
                    <h4 className="font-semibold mb-2">{review.title}</h4>
                  )}

                  {review.comment && (
                    <p className="text-muted-foreground mb-4">{review.comment}</p>
                  )}

                  {review.images.length > 0 && (
                    <Carousel className="mb-4 max-w-md">
                      <CarouselContent>
                        {review.images.map((image, idx) => (
                          <CarouselItem key={idx} className="basis-1/3">
                            <img
                              src={image}
                              alt={`Review image ${idx + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  )}

                  {/* Vote Buttons */}
                  {token && (
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm text-muted-foreground">
                        Was this helpful?
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(review.id, true)}
                        disabled={review.user_vote !== null}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {review.helpful_count}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(review.id, false)}
                        disabled={review.user_vote !== null}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        {review.not_helpful_count}
                      </Button>
                    </div>
                  )}

                  {/* Seller Response */}
                  {review.seller_response && (
                    <div className="bg-muted p-4 rounded-lg mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Seller Response</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.seller_response.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{review.seller_response.response_text}</p>
                    </div>
                  )}

                  {/* Add Response (for product owner) */}
                  {isProductOwner && !review.seller_response && (
                    <div className="mt-4 space-y-2">
                      <Textarea
                        placeholder="Write a response to this review..."
                        value={responseTexts[review.id] || ""}
                        onChange={(e) =>
                          setResponseTexts({
                            ...responseTexts,
                            [review.id]: e.target.value,
                          })
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddResponse(review.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Response
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {reviews.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No reviews yet. Be the first to review this product!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
