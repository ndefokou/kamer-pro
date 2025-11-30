import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import apiClient from '@/api/client';

// ============================================================================
// Types
// ============================================================================

interface Photo {
    url: string;
    is_cover: number;
}

interface Video {
    url: string;
}

interface UpdateListingPayload {
    property_type?: string;
    title?: string | null;
    description?: string | null;
    price_per_night?: number;
    currency?: string;
    cleaning_fee?: number;
    max_guests?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    instant_book?: boolean;
    min_nights?: number;
    max_nights?: number;
    safety_devices?: string[];
    house_rules?: string;
    address?: string;
    city?: string;
    country?: string;
}

export interface ListingDraft {
    id?: string;
    step: number; // Current step (0-8)

    // Step 0: Property basics
    propertyType?: string;

    // Step 1: Amenities
    amenities: string[];

    // Step 2: Photos & Videos
    photos: string[];
    videos: string[];
    coverPhotoIndex: number;

    // Step 3: Title
    title: string;

    // Step 4: Description
    description: string;

    // Step 5: Booking settings
    instantBook: boolean;
    minNights: number;
    maxNights?: number;
    maxGuests?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;

    // Step 6: Pricing
    pricePerNight?: number;
    cleaningFee?: number;
    currency: string;

    // Step 7: Safety
    safetyDevices: string[];
    houseRules: string;

    // Location (optional for now)
    address?: string;
    city?: string;
    country?: string;

    // Metadata
    lastSaved?: string;
    isDirty: boolean;
}

interface HostContextType {
    draft: ListingDraft;
    updateDraft: (updates: Partial<ListingDraft>) => void;
    saveDraft: () => Promise<string | undefined>;
    loadDraft: (id?: string) => Promise<void>;
    publishListing: () => Promise<{ success: boolean; error?: string }>;
    resetDraft: () => void;
    goToStep: (step: number) => void;
    nextStep: () => void;
    previousStep: () => void;
    isSaving: boolean;
    saveError: string | null;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultDraft: ListingDraft = {
    step: 0,
    amenities: [],
    photos: [],
    videos: [],
    coverPhotoIndex: 0,
    title: '',
    description: '',
    instantBook: false,
    minNights: 1,
    currency: 'XAF',
    safetyDevices: [],
    houseRules: '',
    country: 'Cameroon',
    isDirty: false,
};

// ============================================================================
// Context
// ============================================================================

const HostContext = createContext<HostContextType | undefined>(undefined);

const DRAFT_KEY = 'mboamaison_listing_draft';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export const HostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [draft, setDraft] = useState<ListingDraft>(defaultDraft);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                setDraft({ ...defaultDraft, ...parsed });
            } catch (error) {
                console.error('Failed to parse saved draft:', error);
            }
        }
    }, []);

    // Auto-save to localStorage
    useEffect(() => {
        if (draft.isDirty) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [draft]);

    // Periodic backend sync
    useEffect(() => {
        const interval = setInterval(() => {
            if (draft.isDirty && draft.id) {
                saveDraft();
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [draft]);

    const updateDraft = useCallback((updates: Partial<ListingDraft>) => {
        setDraft(prev => ({
            ...prev,
            ...updates,
            isDirty: true,
        }));
    }, []);

    const saveDraft = useCallback(async (): Promise<string | undefined> => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                window.location.href = '/';
                throw new Error('Please log in to save your listing');
            }

            const payload: UpdateListingPayload = {
                property_type: draft.propertyType,
                title: draft.title || null,
                description: draft.description || null,
                price_per_night: draft.pricePerNight,
                currency: draft.currency,
                cleaning_fee: draft.cleaningFee,
                max_guests: draft.maxGuests,
                bedrooms: draft.bedrooms,
                beds: draft.beds,
                bathrooms: draft.bathrooms,
                instant_book: draft.instantBook,
                min_nights: draft.minNights,
                max_nights: draft.maxNights,
                safety_devices: draft.safetyDevices,
                house_rules: draft.houseRules,
                address: draft.address,
                city: draft.city,
                country: draft.country,
            };

            let listingId = draft.id;

            if (!listingId) {
                // If it's a new listing, create it first to get an ID
                const createResponse = await apiClient.post('/listings', {
                    property_type: draft.propertyType,
                });
                listingId = createResponse.data.id;
                if (!listingId) {
                    throw new Error('Failed to create new listing.');
                }
            }

            // Now, with an ID, update the listing with the full payload
            await apiClient.put(`/listings/${listingId}`, payload);

            // Sync amenities and photos
            if (draft.amenities.length > 0) {
                await apiClient.post(`/listings/${listingId}/amenities`, {
                    amenities: draft.amenities,
                });
            }
            if (draft.photos.length > 0) {
                const photoPayload = draft.photos.map((url, index) => ({
                    url,
                    is_cover: index === draft.coverPhotoIndex,
                    display_order: index,
                }));
                await apiClient.post(`/listings/${listingId}/photos`, {
                    photos: photoPayload,
                });
            }

            setDraft(prev => ({
                ...prev,
                id: listingId,
                isDirty: false,
                lastSaved: new Date().toISOString(),
            }));

            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                ...draft,
                id: listingId,
                isDirty: false,
                lastSaved: new Date().toISOString(),
            }));

            return listingId;

        } catch (error) {
            console.error('Failed to save draft:', error);
            let errorMessage = 'Failed to save';
            if (error instanceof AxiosError && error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            setSaveError(errorMessage);

            if (error instanceof AxiosError && error.response?.status === 401) {
                window.location.href = '/';
            }
            return undefined;
        } finally {
            setIsSaving(false);
        }
    }, [draft]);

    const loadDraft = useCallback(async (id?: string) => {
        if (!id) {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    setDraft({ ...defaultDraft, ...parsed });
                } catch (error) {
                    console.error('Failed to parse saved draft:', error);
                }
            }
            return;
        }

        try {
            const response = await apiClient.get(`/listings/${id}`);
            const data = response.data;

            // Convert backend data to draft format
            const loadedDraft: ListingDraft = {
                id: data.id,
                step: draft.step,
                propertyType: data.property_type,
                amenities: data.amenities || [],
                photos: data.photos?.map((p: Photo) => p.url) || [],
                videos: data.videos?.map((v: Video) => v.url) || [],
                coverPhotoIndex: data.photos?.findIndex((p: Photo) => p.is_cover === 1) || 0,
                title: data.title || '',
                description: data.description || '',
                instantBook: data.instant_book === 1,
                minNights: data.min_nights || 1,
                maxNights: data.max_nights,
                maxGuests: data.max_guests,
                bedrooms: data.bedrooms,
                beds: data.beds,
                bathrooms: data.bathrooms,
                pricePerNight: data.price_per_night,
                cleaningFee: data.cleaning_fee,
                currency: data.currency || 'XAF',
                safetyDevices: data.safety_devices ? JSON.parse(data.safety_devices) : [],
                houseRules: data.house_rules || '',
                address: data.address,
                city: data.city,
                country: data.country || 'Cameroon',
                isDirty: false,
            };

            setDraft(loadedDraft);
            localStorage.setItem(DRAFT_KEY, JSON.stringify(loadedDraft));

        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [draft.step]);

    const publishListing = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        let listingId = draft.id;

        if (!listingId) {
            // Save first if not saved
            listingId = await saveDraft();
            if (!listingId) {
                return { success: false, error: 'Failed to create listing' };
            }
        }

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                window.location.href = '/';
                return { success: false, error: 'Please log in to publish' };
            }

            await apiClient.post(`/listings/${listingId}/publish`);

            // Clear draft after successful publish
            localStorage.removeItem(DRAFT_KEY);
            setDraft(defaultDraft);

            return { success: true };

        } catch (error) {
            console.error('Failed to publish listing:', error);
            let errorMessage = 'Failed to publish';
            if (error instanceof AxiosError && error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            return { success: false, error: errorMessage };
        }
    }, [draft, saveDraft]);

    const resetDraft = useCallback(() => {
        setDraft(defaultDraft);
        localStorage.removeItem(DRAFT_KEY);
    }, []);

    const goToStep = useCallback((step: number) => {
        setDraft(prev => ({ ...prev, step, isDirty: true }));
    }, []);

    const nextStep = useCallback(() => {
        setDraft(prev => ({ ...prev, step: prev.step + 1, isDirty: true }));
    }, []);

    const previousStep = useCallback(() => {
        setDraft(prev => ({ ...prev, step: Math.max(0, prev.step - 1), isDirty: true }));
    }, []);

    const value: HostContextType = {
        draft,
        updateDraft,
        saveDraft,
        loadDraft,
        publishListing,
        resetDraft,
        goToStep,
        nextStep,
        previousStep,
        isSaving,
        saveError,
    };

    return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
};

export const useHost = () => {
    const context = useContext(HostContext);
    if (!context) {
        throw new Error('useHost must be used within a HostProvider');
    }
    return context;
};
