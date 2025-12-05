import {
    Wifi, Tv, Car, Utensils, Wind, Monitor, Coffee, WashingMachine, Flame, Waves, ShieldAlert, Lock, Camera,
    Snowflake, Droplets, Shirt, Dumbbell, Gamepad2, Briefcase, MapPin, Sun, Umbrella, Bike, Anchor,
    Book, Music, Printer, Radio, Speaker, Tablet, Smartphone, Watch, Headphones, Mic, Video,
    Thermometer, Fan, Heater, FireExtinguisher, Stethoscope, Syringe, Pill,
    Refrigerator, Microwave,
    Bath, ShowerHead, Ruler, Scissors, Eraser, Pen, Pencil, Heart, Zap, ChefHat,
    Trash2, Wine, Sofa, Disc, Palmtree, Moon, CloudFog, Baby, Plug, Trophy, Key,
    Shield, Activity, CookingPot
} from 'lucide-react';

export type AmenityCategory =
    | 'Basics'
    | 'Bathroom'
    | 'Bedroom and laundry'
    | 'Entertainment'
    | 'Heating and cooling'
    | 'Home safety'
    | 'Internet and office'
    | 'Kitchen and dining'
    | 'Location features'
    | 'Outdoor'
    | 'Parking and facilities'
    | 'Services';

export interface Amenity {
    id: string;
    label: string;
    description: string;
    icon: any;
    category: AmenityCategory;
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
    'Basics',
    'Bathroom',
    'Bedroom and laundry',
    'Entertainment',
    'Heating and cooling',
    'Home safety',
    'Internet and office',
    'Kitchen and dining',
    'Location features',
    'Outdoor',
    'Parking and facilities',
    'Services'
];

export const AMENITY_DETAILS: Record<string, Amenity> = {
    // Internet and office
    'wifi': {
        id: 'wifi',
        label: 'Wifi',
        description: 'Wireless technology that lets devices connect to the internet',
        icon: Wifi,
        category: 'Internet and office'
    },
    'workspace': {
        id: 'workspace',
        label: 'Dedicated workspace',
        description: 'An area for focused activities that includes a desk or table and a power source',
        icon: Monitor,
        category: 'Internet and office'
    },
    'pocket_wifi': {
        id: 'pocket_wifi',
        label: 'Pocket wifi',
        description: 'Portable wireless internet device',
        icon: Wifi,
        category: 'Internet and office'
    },

    // Entertainment
    'tv': {
        id: 'tv',
        label: 'TV',
        description: 'A device for watching television',
        icon: Tv,
        category: 'Entertainment'
    },
    'piano': {
        id: 'piano',
        label: 'Piano',
        description: 'A large musical instrument played by pressing keys',
        icon: Music,
        category: 'Entertainment'
    },
    'sound_system': {
        id: 'sound_system',
        label: 'Sound system',
        description: 'System for playing music or audio',
        icon: Speaker,
        category: 'Entertainment'
    },
    'record_player': {
        id: 'record_player',
        label: 'Record player',
        description: 'Device for playing vinyl records',
        icon: Disc,
        category: 'Entertainment'
    },
    'ping_pong_table': {
        id: 'ping_pong_table',
        label: 'Ping pong table',
        description: 'Table for playing table tennis',
        icon: Trophy,
        category: 'Entertainment'
    },
    'pool_table': {
        id: 'pool_table',
        label: 'Pool table',
        description: 'Table for playing billiards',
        icon: Trophy,
        category: 'Entertainment'
    },
    'game_console': {
        id: 'game_console',
        label: 'Game console',
        description: 'Video game console',
        icon: Gamepad2,
        category: 'Entertainment'
    },

    // Kitchen and dining
    'kitchen': {
        id: 'kitchen',
        label: 'Kitchen',
        description: 'A space for cooking meals that includes at least a refrigerator, oven, and stovetop',
        icon: Utensils,
        category: 'Kitchen and dining'
    },
    'coffee_maker': {
        id: 'coffee_maker',
        label: 'Coffee maker',
        description: 'A machine that brews coffee',
        icon: Coffee,
        category: 'Kitchen and dining'
    },
    'refrigerator': {
        id: 'refrigerator',
        label: 'Refrigerator',
        description: 'Appliance for keeping food cold',
        icon: Refrigerator,
        category: 'Kitchen and dining'
    },
    'microwave': {
        id: 'microwave',
        label: 'Microwave',
        description: 'Appliance for heating food quickly',
        icon: Microwave,
        category: 'Kitchen and dining'
    },
    'dishwasher': {
        id: 'dishwasher',
        label: 'Dishwasher',
        description: 'Machine for washing dishes automatically',
        icon: Droplets,
        category: 'Kitchen and dining'
    },
    'toaster': {
        id: 'toaster',
        label: 'Toaster',
        description: 'Appliance for toasting bread',
        icon: Flame,
        category: 'Kitchen and dining'
    },
    'blender': {
        id: 'blender',
        label: 'Blender',
        description: 'Appliance for mixing food',
        icon: Zap,
        category: 'Kitchen and dining'
    },
    'stove': {
        id: 'stove',
        label: 'Stove',
        description: 'Electric or gas stove',
        icon: ChefHat,
        category: 'Kitchen and dining'
    },
    'oven': {
        id: 'oven',
        label: 'Oven',
        description: 'Oven for baking and roasting',
        icon: ChefHat,
        category: 'Kitchen and dining'
    },
    'trash_compactor': {
        id: 'trash_compactor',
        label: 'Trash compactor',
        description: 'Device for compacting trash',
        icon: Trash2,
        category: 'Kitchen and dining'
    },
    'wine_glasses': {
        id: 'wine_glasses',
        label: 'Wine glasses',
        description: 'Glasses for drinking wine',
        icon: Wine,
        category: 'Kitchen and dining'
    },
    'rice_maker': {
        id: 'rice_maker',
        label: 'Rice maker',
        description: 'Appliance for cooking rice',
        icon: CookingPot,
        category: 'Kitchen and dining'
    },

    // Bedroom and laundry
    'washer': {
        id: 'washer',
        label: 'Washer',
        description: 'A machine that washes dirty clothes',
        icon: WashingMachine,
        category: 'Bedroom and laundry'
    },
    'dryer': {
        id: 'dryer',
        label: 'Dryer',
        description: 'A machine that dries clothes',
        icon: Shirt,
        category: 'Bedroom and laundry'
    },
    'iron': {
        id: 'iron',
        label: 'Iron',
        description: 'Tool to remove wrinkles from clothes',
        icon: Shirt, // Using Shirt as proxy for Iron if specific icon missing
        category: 'Bedroom and laundry'
    },
    'room_darkening_shades': {
        id: 'room_darkening_shades',
        label: 'Room-darkening shades',
        description: 'Shades that block out light',
        icon: Moon,
        category: 'Bedroom and laundry'
    },
    'safe': {
        id: 'safe',
        label: 'Safe',
        description: 'Safe for storing valuables',
        icon: Lock,
        category: 'Bedroom and laundry'
    },
    'private_living_room': {
        id: 'private_living_room',
        label: 'Private living room',
        description: 'Living room exclusive to guests',
        icon: Sofa,
        category: 'Bedroom and laundry'
    },

    // Parking and facilities
    'parking': {
        id: 'parking',
        label: 'Free parking on premises',
        description: 'Parking on-site that\'s free of charge',
        icon: Car,
        category: 'Parking and facilities'
    },
    'paid_parking': {
        id: 'paid_parking',
        label: 'Paid parking on premises',
        description: 'Parking at the listing that requires payment',
        icon: Car,
        category: 'Parking and facilities'
    },
    'gym': {
        id: 'gym',
        label: 'Gym',
        description: 'Fitness center with exercise equipment',
        icon: Dumbbell,
        category: 'Parking and facilities'
    },
    'pool': {
        id: 'pool',
        label: 'Pool',
        description: 'A private or shared swimming pool',
        icon: Waves,
        category: 'Parking and facilities'
    },
    'hottub': {
        id: 'hottub',
        label: 'Hot tub',
        description: 'A large tub full of hot water',
        icon: Bath,
        category: 'Parking and facilities'
    },
    'paid_parking_off_premises': {
        id: 'paid_parking_off_premises',
        label: 'Paid parking off premises',
        description: 'Paid parking located nearby',
        icon: Car,
        category: 'Parking and facilities'
    },
    'sauna': {
        id: 'sauna',
        label: 'Sauna',
        description: 'Room used for hot air or steam baths',
        icon: CloudFog,
        category: 'Parking and facilities'
    },

    // Heating and cooling
    'air_conditioning': {
        id: 'air_conditioning',
        label: 'Air conditioning',
        description: 'A system that cools and controls the humidity of an indoor space',
        icon: Wind,
        category: 'Heating and cooling'
    },
    'heating': {
        id: 'heating',
        label: 'Heating',
        description: 'Indoor heating system for cold days',
        icon: Flame,
        category: 'Heating and cooling'
    },
    'portable_fans': {
        id: 'portable_fans',
        label: 'Portable fans',
        description: 'Fans that can be moved around',
        icon: Fan,
        category: 'Heating and cooling'
    },
    'fireplace': {
        id: 'fireplace',
        label: 'Indoor fireplace',
        description: 'A structure for a domestic fire',
        icon: Flame,
        category: 'Heating and cooling'
    },

    // Home safety
    'smoke_alarm': {
        id: 'smoke_alarm',
        label: 'Smoke alarm',
        description: 'Alarm that detects smoke and fire',
        icon: ShieldAlert,
        category: 'Home safety'
    },
    'carbon_monoxide_alarm': {
        id: 'carbon_monoxide_alarm',
        label: 'Carbon monoxide alarm',
        description: 'Alarm that detects carbon monoxide gas',
        icon: ShieldAlert,
        category: 'Home safety'
    },
    'fire_extinguisher': {
        id: 'fire_extinguisher',
        label: 'Fire extinguisher',
        description: 'Device to put out small fires',
        icon: FireExtinguisher,
        category: 'Home safety'
    },
    'first_aid_kit': {
        id: 'first_aid_kit',
        label: 'First aid kit',
        description: 'Collection of supplies for medical treatment',
        icon: Heart,
        category: 'Home safety'
    },
    'security_cameras': {
        id: 'security_cameras',
        label: 'Security cameras',
        description: 'Security cameras on the property',
        icon: Camera,
        category: 'Home safety'
    },
    'lock_on_bedroom': {
        id: 'lock_on_bedroom',
        label: 'Lock on bedroom door',
        description: 'Safety lock on the bedroom door',
        icon: Lock,
        category: 'Home safety'
    },
    'table_corner_guards': {
        id: 'table_corner_guards',
        label: 'Table corner guards',
        description: 'Guards to protect from sharp corners',
        icon: Shield,
        category: 'Home safety'
    },
    'window_guards': {
        id: 'window_guards',
        label: 'Window guards',
        description: 'Guards on windows for safety',
        icon: Shield,
        category: 'Home safety'
    },
    'outlet_covers': {
        id: 'outlet_covers',
        label: 'Outlet covers',
        description: 'Covers for electrical outlets',
        icon: Plug,
        category: 'Home safety'
    },

    // Outdoor
    'bbq': {
        id: 'bbq',
        label: 'BBQ grill',
        description: 'Equipment for cooking food outdoors',
        icon: Flame,
        category: 'Outdoor'
    },
    'patio': {
        id: 'patio',
        label: 'Patio or balcony',
        description: 'Outdoor space adjoining the listing',
        icon: Sun,
        category: 'Outdoor'
    },
    'sun_loungers': {
        id: 'sun_loungers',
        label: 'Sun loungers',
        description: 'Chairs for sunbathing',
        icon: Sun,
        category: 'Outdoor'
    },
    'outdoor_shower': {
        id: 'outdoor_shower',
        label: 'Outdoor shower',
        description: 'Shower located outdoors',
        icon: ShowerHead,
        category: 'Outdoor'
    },
    'garden': {
        id: 'garden',
        label: 'Backyard',
        description: 'Open space at the back of the property',
        icon: Sun,
        category: 'Outdoor'
    },

    // Location features
    'beach_access': {
        id: 'beach_access',
        label: 'Beach access',
        description: 'Direct access to a beach',
        icon: Umbrella,
        category: 'Location features'
    },
    'lake_access': {
        id: 'lake_access',
        label: 'Lake access',
        description: 'Direct access to a lake',
        icon: Waves,
        category: 'Location features'
    },
    'ski_in_ski_out': {
        id: 'ski_in_ski_out',
        label: 'Ski-in/Ski-out',
        description: 'Direct access to ski slopes',
        icon: Snowflake,
        category: 'Location features'
    },
    'waterfront': {
        id: 'waterfront',
        label: 'Waterfront',
        description: 'Property is located right next to water',
        icon: Waves,
        category: 'Location features'
    },
    'resort_access': {
        id: 'resort_access',
        label: 'Resort access',
        description: 'Access to resort amenities',
        icon: Palmtree,
        category: 'Location features'
    },
    'private_entrance': {
        id: 'private_entrance',
        label: 'Private entrance',
        description: 'Separate entrance for guests',
        icon: Key,
        category: 'Location features'
    },

    // Services
    'breakfast': {
        id: 'breakfast',
        label: 'Breakfast',
        description: 'Breakfast is provided',
        icon: Coffee,
        category: 'Services'
    },
    'cleaning': {
        id: 'cleaning',
        label: 'Cleaning available during stay',
        description: 'Cleaning services are available',
        icon: Droplets,
        category: 'Services'
    },
    'luggage_dropoff': {
        id: 'luggage_dropoff',
        label: 'Luggage dropoff allowed',
        description: 'Guests can drop off luggage early',
        icon: Briefcase,
        category: 'Services'
    }
};

export const getAllAmenities = (): Amenity[] => Object.values(AMENITY_DETAILS);

export const getAmenitiesByCategory = (category: AmenityCategory): Amenity[] => {
    return getAllAmenities().filter(amenity => amenity.category === category);
};
