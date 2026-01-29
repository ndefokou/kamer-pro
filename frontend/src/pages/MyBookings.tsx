import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyBookings, cancelBooking, type BookingWithDetails } from "@/api/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getImageUrl, formatPrice } from "@/lib/utils";

const StatusBadge = ({ status }: { status: BookingWithDetails["booking"]["status"] }) => {
  const color = status === "confirmed" ? "bg-green-100 text-green-700" : status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${color}`}>{status}</span>;
};

export default function MyBookings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<BookingWithDetails[]>({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success("Reservation cancelled");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: () => {
      toast.error("Failed to cancel reservation");
    }
  });

  const handleCancel = (id: string) => {
    if (confirm("Are you sure you want to cancel this reservation?")) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">My reservations</h1>
        {isLoading && <div>Loading...</div>}
        {error && <div className="text-red-600">Failed to load bookings.</div>}
        {!isLoading && !error && (
          (data && data.length > 0) ? (
            <div className="grid grid-cols-1 gap-4">
              {data.map((b) => (
                <div key={b.booking.id} className="border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white">
                  <div className="flex gap-4 w-full sm:w-auto flex-1">
                    <img
                      src={b.listing_photo ? getImageUrl(b.listing_photo) : "/bathroom-placeholder.jpg"}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/bathroom-placeholder.jpg"; }}
                      alt="Listing"
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => (window.location.href = `/product/${b.booking.listing_id}`)}
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => (window.location.href = `/product/${b.booking.listing_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg line-clamp-1 hover:underline">{b.listing_title}</h3>
                        <StatusBadge status={b.booking.status} />
                      </div>
                      <div className="text-sm text-gray-600">
                        {(b.listing_city || "") + ((b.listing_city && b.listing_country) ? ", " : "") + (b.listing_country || "")}
                      </div>
                      <div className="text-sm mt-1">
                        {new Date(b.booking.check_in).toLocaleDateString()} - {new Date(b.booking.check_out).toLocaleDateString()} · {b.booking.guests} guest{b.booking.guests !== 1 ? "s" : ""}
                      </div>
                      <div className="text-sm font-semibold mt-1">
                        Total: {formatPrice(b.booking.total_price)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={() => (window.location.href = `/product/${b.booking.listing_id}`)}>View listing</Button>
                    {(b.booking.status === 'pending' || b.booking.status === 'confirmed') && (
                      <Button
                        className="flex-1 sm:flex-none"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(b.booking.id)}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-xl p-8 text-center bg-white">
              <div className="text-lg font-medium mb-2">No reservations yet</div>
              <p className="text-sm text-gray-600 mb-4">Browse the marketplace and find your first stay.</p>
              <Button onClick={() => (window.location.href = "/marketplace")}>Explore stays</Button>
            </div>
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
