import { Shield, AlertTriangle, Info } from 'lucide-react';

export interface SafetyItem {
    id: string;
    label: string;
    description: string;
    category: 'considerations' | 'devices' | 'property_info';
    learnMoreUrl?: string;
}

export const SAFETY_CONSIDERATIONS: SafetyItem[] = [
    {
        id: 'not_safe_children_2_12',
        label: 'Not a good fit for children 2 – 12',
        description: 'This property has features that may not be safe for kids.',
        category: 'considerations',
    },
    {
        id: 'not_safe_infants_under_2',
        label: 'Not a good fit for infants under 2',
        description: 'This property has features that may not be safe for babies or toddlers this age.',
        category: 'considerations',
    },
    {
        id: 'no_pool_gate',
        label: 'Pool or hot tub doesn\'t have a gate or lock',
        description: 'Guests have access to an unsecured swimming pool or hot tub. Check your local laws for specific requirements.',
        category: 'considerations',
    },
    {
        id: 'nearby_water',
        label: 'Nearby water, like a lake or river',
        description: 'Guests have unrestricted access to a body of water, like an ocean, pond, creek, or wetlands, directly on or next to the property.',
        category: 'considerations',
    },
    {
        id: 'climbing_structure',
        label: 'Climbing or play structure(s) on the property',
        description: 'Guests will have access to structures like a playset, slide, swings, or climbing ropes.',
        category: 'considerations',
    },
    {
        id: 'heights_without_rails',
        label: 'There are heights without rails or protection',
        description: 'Guests have access to an area higher than 30 inches (76 centimeters), like a balcony, roof, terrace, or cliff, that doesn\'t have a rail or other protection.',
        category: 'considerations',
    },
    {
        id: 'dangerous_animals',
        label: 'Potentially dangerous animal(s) on the property',
        description: 'Guests and their pets will be around animals, like a horse, mountain lion, or farm animal, that could cause harm.',
        category: 'considerations',
    },
];

export const SAFETY_DEVICES: SafetyItem[] = [
    {
        id: 'exterior_security_camera',
        label: 'Exterior security camera present',
        description: 'This property has one or more exterior cameras that record or transmit video, images, or audio. You must disclose them if they\'re turned off.\n\nNote: Security cameras that monitor indoor spaces or outdoor areas where greater privacy is expected, like a shower, are not allowed.',
        category: 'devices',
    },
    {
        id: 'noise_decibel_monitor',
        label: 'Noise decibel monitor present',
        description: 'This property has one or more devices that can assess sound level but don\'t record audio.',
        category: 'devices',
    },
    {
        id: 'carbon_monoxide_alarm',
        label: 'Carbon monoxide alarm',
        description: 'A device that alerts if it detects unsafe levels of carbon monoxide (Check your local laws, which may require a working carbon monoxide detector in your listing)',
        category: 'devices',
    },
    {
        id: 'smoke_alarm',
        label: 'Smoke alarm',
        description: 'A device that alerts when it detects smoke (Check your local laws, which may require a working smoke detector in your listing)',
        category: 'devices',
    },
];

export const PROPERTY_INFO: SafetyItem[] = [
    {
        id: 'guests_climb_stairs',
        label: 'Guests must climb stairs',
        description: 'Guests should expect to walk up and down stairs during their stay.',
        category: 'property_info',
    },
    {
        id: 'potential_noise',
        label: 'Potential noise during stays',
        description: 'Guests should expect to hear some noise during their stay. For example, traffic, construction, or nearby businesses.',
        category: 'property_info',
    },
    {
        id: 'pets_on_property',
        label: 'Pet(s) live on the property',
        description: 'Guests may meet or interact with pets during their stay.',
        category: 'property_info',
    },
    {
        id: 'no_parking',
        label: 'No parking on the property',
        description: 'This property doesn\'t have dedicated parking spots for guests.',
        category: 'property_info',
    },
    {
        id: 'shared_spaces',
        label: 'Property has shared spaces',
        description: 'Guests should expect to share spaces, like a kitchen, bathroom, or patio, with other people during their stay.',
        category: 'property_info',
    },
    {
        id: 'limited_amenities',
        label: 'Limited essential amenities',
        description: 'Some common essentials are not included on this property. For example, wifi, running water, indoor shower.',
        category: 'property_info',
    },
    {
        id: 'weapons_on_property',
        label: 'Weapon(s) on the property',
        description: 'There\'s at least one weapon stored on this property. Check your local laws for specific requirements.\n\nReminder: Airbnb requires all weapons to be properly stored and secured.',
        category: 'property_info',
    },
];

export const getAllSafetyItems = (): SafetyItem[] => {
    return [...SAFETY_CONSIDERATIONS, ...SAFETY_DEVICES, ...PROPERTY_INFO];
};
