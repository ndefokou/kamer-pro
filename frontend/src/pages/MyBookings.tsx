import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getMyBookings, cancelBooking, type BookingWithDetails } from "@/api/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { getImageUrl, formatPrice } from "@/lib/utils";
import OptimizedImage from "@/components/OptimizedImage";
import MobileNav from "@/components/MobileNav";

const StatusBadge = ({ status }: { status: BookingWithDetails["booking"]["status"] }) => {
  const { t } = useTranslation();
  const color = status === "confirmed" ? "bg-green-100 text-green-700" : status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${color}`}>{t(`myBookings.status.${status}`)}</span>;
};

export default function MyBookings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<BookingWithDetails[]>({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success(t('myBookings.cancelSuccess'));
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: () => {
      toast.error(t('myBookings.cancelError'));
    }
  });

  const handleCancel = (id: string) => {
    if (confirm(t('myBookings.cancelConfirm'))) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <SEO
        title={t('myBookings.title')}
        description={t('myBookings.seoDescription', { count: data?.length || 0 })}
      />
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('myBookings.title')}</h1>
        {isLoading && <div>{t('common.loading')}</div>}
        {error && <div className="text-red-600">{t('common.error')}</div>}
        {!isLoading && !error && (
          (data && data.length > 0) ? (
            <div className="grid grid-cols-1 gap-4">
              {data.map((b) => (
                <div key={b.booking.id} className="border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white">
                  <div className="flex gap-4 w-full sm:w-auto flex-1">
                    <OptimizedImage
                      src={b.listing_photo ? getImageUrl(b.listing_photo) : "/bathroom-placeholder.jpg"}
                      alt="Listing"
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => (window.location.href = `/product/${b.booking.listing_id}`)}
                      onError={() => { /* Handled by OptimizedImage internal fallback */ }}
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
                        {new Date(b.booking.check_in).toLocaleDateString()} - {new Date(b.booking.check_out).toLocaleDateString()} · {t('common.guest_count', { count: b.booking.guests })}
                      </div>
                      <div className="text-sm font-semibold mt-1">
                        {t('myBookings.total', { price: formatPrice(b.booking.total_price) })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={() => (window.location.href = `/product/${b.booking.listing_id}`)}>{t('myBookings.viewListing')}</Button>
                    {(b.booking.status === 'pending' || b.booking.status === 'confirmed') && (
                      <Button
                        className="flex-1 sm:flex-none"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(b.booking.id)}
                        disabled={cancelMutation.isPending}
                      >
                        {t('myBookings.cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-xl p-8 text-center bg-white">
              <div className="text-lg font-medium mb-2">{t('myBookings.empty.title')}</div>
              <p className="text-sm text-gray-600 mb-4">{t('myBookings.empty.description')}</p>
              <Button onClick={() => (window.location.href = "/marketplace")}>{t('myBookings.empty.button')}</Button>
            </div>
          )
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
