import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Globe,
    Menu,
    User,
    MapPin,
    Calendar,
    Users,
    Star,
    Heart,
    ChevronLeft,
    ChevronRight,
    Waves,
    Home,
    Mountain,
    Palmtree,
    Building2,
    Castle,
    Tent,
    Ship,
    TreePine,
    Flame
} from 'lucide-react';

const categories = [
    { id: 'beach', label: 'Beach', icon: Waves },
    { id: 'cabins', label: 'Cabins', icon: Home },
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'mountains', label: 'Mountains', icon: Mountain },
    { id: 'tropical', label: 'Tropical', icon: Palmtree },
    { id: 'cities', label: 'Cities', icon: Building2 },
    { id: 'castles', label: 'Castles', icon: Castle },
    { id: 'camping', label: 'Camping', icon: Tent },
    { id: 'lakefront', label: 'Lakefront', icon: Ship },
    { id: 'countryside', label: 'Countryside', icon: TreePine },
];

// Mock property data
const properties = [
    {
        id: 1,
        images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop'],
        location: 'Yaoundé, Cameroon',
        distance: '2 kilometers away',
        dates: 'Nov 1 - 6',
        price: 25000,
        rating: 4.95,
        isFavorite: false,
    },
    {
        id: 2,
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop'],
        location: 'Douala, Cameroon',
        distance: '150 kilometers away',
        dates: 'Nov 15 - 20',
        price: 35000,
        rating: 4.88,
        isFavorite: false,
    },
    {
        id: 3,
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'],
        location: 'Bafoussam, Cameroon',
        distance: '80 kilometers away',
        dates: 'Dec 1 - 5',
        price: 20000,
        rating: 4.92,
        isFavorite: false,
    },
    {
        id: 4,
        images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'],
        location: 'Kribi, Cameroon',
        distance: '200 kilometers away',
        dates: 'Nov 10 - 15',
        price: 45000,
        rating: 4.97,
        isFavorite: false,
    },
    {
        id: 5,
        images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'],
        location: 'Limbé, Cameroon',
        distance: '180 kilometers away',
        dates: 'Nov 20 - 25',
        price: 30000,
        rating: 4.85,
        isFavorite: false,
    },
    {
        id: 6,
        images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop'],
        location: 'Bamenda, Cameroon',
        distance: '120 kilometers away',
        dates: 'Dec 5 - 10',
        price: 28000,
        rating: 4.90,
        isFavorite: false,
    },
];

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchLocation, setSearchLocation] = useState('');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const toggleFavorite = (id: number) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(id)) {
                newFavorites.delete(id);
            } else {
                newFavorites.add(id);
            }
            return newFavorites;
        });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <Home className="h-8 w-8 text-primary" />
                            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                MboaMaison
                            </span>
                        </div>

                        {/* Search Bar - Desktop */}
                        <div className="hidden md:flex items-center gap-2 border border-border rounded-full px-6 py-2 shadow-soft hover:shadow-md transition-all cursor-pointer">
                            <div className="flex items-center gap-2 border-r border-border pr-4">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Anywhere"
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm font-medium w-24"
                                />
                            </div>
                            <div className="flex items-center gap-2 border-r border-border pr-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Any week</span>
                            </div>
                            <div className="flex items-center gap-2 pr-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Add guests</span>
                            </div>
                            <Button size="sm" className="rounded-full h-8 w-8 p-0">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Right Menu */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                className="hidden md:flex items-center gap-2 font-semibold hover:bg-accent/50 rounded-full px-4"
                                onClick={() => navigate('/host/intro')}
                            >
                                Become a host
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Globe className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-2 border border-border rounded-full px-3 py-2 hover:shadow-md transition-all cursor-pointer">
                                <Menu className="h-4 w-4" />
                                <div className="bg-primary rounded-full p-1">
                                    <User className="h-4 w-4 text-primary-foreground" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar - Mobile */}
                    <div className="md:hidden mt-4 flex items-center gap-2 border border-border rounded-full px-4 py-3 shadow-soft">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <div className="text-sm font-semibold">Anywhere</div>
                            <div className="text-xs text-muted-foreground">Any week · Add guests</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Categories */}
            <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-[73px] z-40">
                <div className="container mx-auto px-4 py-4">
                    <div className="relative">
                        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide pb-2">
                            {categories.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id === selectedCategory ? '' : category.id)}
                                        className={`flex flex-col items-center gap-2 min-w-fit transition-all ${selectedCategory === category.id
                                                ? 'text-foreground border-b-2 border-foreground pb-2'
                                                : 'text-muted-foreground hover:text-foreground pb-2'
                                            }`}
                                    >
                                        <Icon className="h-6 w-6" />
                                        <span className="text-xs font-medium whitespace-nowrap">{category.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Property Grid */}
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {properties.map((property) => (
                        <div
                            key={property.id}
                            className="group cursor-pointer"
                            onClick={() => navigate(`/property/${property.id}`)}
                        >
                            {/* Image */}
                            <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                                <img
                                    src={property.images[0]}
                                    alt={property.location}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(property.id);
                                    }}
                                    className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all"
                                >
                                    <Heart
                                        className={`h-5 w-5 ${favorites.has(property.id)
                                                ? 'fill-red-500 text-red-500'
                                                : 'text-foreground'
                                            }`}
                                    />
                                </button>
                                <div className="absolute bottom-3 left-3 right-3 flex gap-1 justify-center">
                                    {[1, 2, 3].map((dot) => (
                                        <div
                                            key={dot}
                                            className={`h-1.5 w-1.5 rounded-full ${dot === 1 ? 'bg-white' : 'bg-white/50'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-semibold text-foreground truncate">{property.location}</h3>
                                    <div className="flex items-center gap-1 ml-2">
                                        <Star className="h-4 w-4 fill-current" />
                                        <span className="text-sm font-medium">{property.rating}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{property.distance}</p>
                                <p className="text-sm text-muted-foreground">{property.dates}</p>
                                <div className="flex items-baseline gap-1 pt-1">
                                    <span className="font-semibold text-foreground">{property.price.toLocaleString()} FCFA</span>
                                    <span className="text-sm text-muted-foreground">night</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More */}
                <div className="flex justify-center mt-12">
                    <Button variant="outline" size="lg" className="rounded-full px-8">
                        Continue exploring
                    </Button>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-background mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="hover:text-foreground cursor-pointer transition-colors">Help Center</li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Safety information</li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Cancellation options</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Community</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="hover:text-foreground cursor-pointer transition-colors">MboaMaison.org</li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Hosting resources</li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Community forum</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Hosting</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li
                                    className="hover:text-foreground cursor-pointer transition-colors"
                                    onClick={() => navigate('/host/intro')}
                                >
                                    Try hosting
                                </li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Responsible hosting</li>
                                <li className="hover:text-foreground cursor-pointer transition-colors">Join a free Hosting class</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span>© 2025 MboaMaison</span>
                            <span>·</span>
                            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
                            <span>·</span>
                            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                                <Globe className="h-4 w-4" />
                                <span>English (US)</span>
                            </button>
                            <span>FCFA</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
