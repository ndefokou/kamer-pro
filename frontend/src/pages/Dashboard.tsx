import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import AirbnbSearch from "@/components/AirbnbSearch";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import AirbnbPropertyCard from "@/components/AirbnbPropertyCard";
import { getProducts } from "@/api/client";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    location: string;
    condition?: string;
    contact_phone: string | null;
    contact_email: string | null;
    images: { image_url: string }[];
    created_at: string;
    user_id: number;
}

const Home = () => {
    const { t } = useTranslation();
    const [featuredProperties, setFeaturedProperties] = useState<Product[]>([]);
    const [newListings, setNewListings] = useState<Product[]>([]);
    const [popularApartments, setPopularApartments] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const data = await getProducts({});
                // Distribute products across sections
                setFeaturedProperties(data.slice(0, 8));
                setNewListings(data.slice(8, 16));
                setPopularApartments(data.slice(16, 24));
            } catch (error) {
                console.error("Failed to fetch properties:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProperties();
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Search Section */}
            <div className="border-b border-gray-200">
                <div className="container mx-auto px-6 py-6">
                    <AirbnbSearch />
                </div>
            </div>

            {/* Property Sections */}
            <div className="container mx-auto px-6 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4" />
                            <p className="text-gray-600">{t("loading properties")}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Featured Properties in Yaoundé */}
                        {featuredProperties.length > 0 && (
                            <HorizontalPropertySection title={t("featured properties in yaounde")}>
                                {featuredProperties.map((product, index) => (
                                    <AirbnbPropertyCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        location={product.location}
                                        price={product.price}
                                        images={product.images}
                                        rating={4.5 + Math.random() * 0.5}
                                        isGuestFavorite={index % 3 === 0}
                                    />
                                ))}
                            </HorizontalPropertySection>
                        )}

                        {/* Available This Month */}
                        {newListings.length > 0 && (
                            <HorizontalPropertySection title={t("available this month")}>
                                {newListings.map((product, index) => (
                                    <AirbnbPropertyCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        location={product.location}
                                        price={product.price}
                                        images={product.images}
                                        rating={4.3 + Math.random() * 0.7}
                                        isGuestFavorite={index % 4 === 0}
                                    />
                                ))}
                            </HorizontalPropertySection>
                        )}

                        {/* Popular Apartments */}
                        {popularApartments.length > 0 && (
                            <HorizontalPropertySection title={t("popular apartments")}>
                                {popularApartments.map((product, index) => (
                                    <AirbnbPropertyCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        location={product.location}
                                        price={product.price}
                                        images={product.images}
                                        rating={4.4 + Math.random() * 0.6}
                                        isGuestFavorite={index % 2 === 0}
                                    />
                                ))}
                            </HorizontalPropertySection>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-gray-50 py-12 mt-16">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("support")}</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t("help center")}</li>
                                <li>{t("safety information")}</li>
                                <li>{t("cancellation options")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("community")}</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t("blog")}</li>
                                <li>{t("forum")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("hosting")}</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t("try hosting")}</li>
                                <li>{t("resources")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">MboaMaison</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>{t("about")}</li>
                                <li>{t("careers")}</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-600 text-center">
                        <p>&copy; 2025 MboaMaison. {t("all rights reserved")}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
