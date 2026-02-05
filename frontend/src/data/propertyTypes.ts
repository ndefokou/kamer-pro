import { Home, Building2, Hotel, Castle, DoorOpen } from 'lucide-react';

export const propertyTypes = [
    { id: 'apartment', label: 'Apartment', icon: Building2, description: 'A place within a multi-unit building' },
    { id: 'house', label: 'House', icon: Home, description: 'A standalone home' },
    { id: 'villa', label: 'Villa', icon: Castle, description: 'A luxurious standalone property' },
    { id: 'studio', label: 'Studio', icon: Hotel, description: 'A single-room living space' },
    { id: 'room', label: 'Room', icon: DoorOpen, description: 'A private room in a shared property' },
];
