import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';

// ============================================================================
// Types
// ============================================================================

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
    saveDraft: () => Promise<void>;
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

    const saveDraft = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                // Redirect to login if no user ID
                window.location.href = '/';
                throw new Error('Please log in to save your listing');
            }

            const url = draft.id
                ? `/listings/${draft.id}`
                : '/listings';

            // Prepare payload
            const payload: any = {
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

            let response;
            if (draft.id) {
                response = await apiClient.put(url, payload);
            } else {
                response = await apiClient.post(url, payload);
            }

            const data = response.data;

            // Save amenities if listing was created
            if (data.listing?.id && draft.amenities.length > 0) {
                await apiClient.post(`/listings/${data.listing.id}/amenities`, {
                    amenities: draft.amenities
                });
            }

            setDraft(prev => ({
                ...prev,
                id: data.listing?.id || prev.id,
                isDirty: false,
                lastSaved: new Date().toISOString(),
            }));

            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                ...draft,
                id: data.listing?.id || draft.id,
                isDirty: false,
                lastSaved: new Date().toISOString(),
            }));

        } catch (error: any) {
            console.error('Failed to save draft:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to save';
            setSaveError(errorMessage);

            // If unauthorized, redirect to login
            if (error.response?.status === 401) {
                window.location.href = '/';
            }
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
                id: data.listing.id,
                step: draft.step,
                propertyType: data.listing.property_type,
                amenities: data.amenities || [],
                photos: data.photos?.map((p: any) => p.url) || [],
                videos: data.videos?.map((v: any) => v.url) || [],
                coverPhotoIndex: data.photos?.findIndex((p: any) => p.is_cover === 1) || 0,
                title: data.listing.title || '',
                description: data.listing.description || '',
                instantBook: data.listing.instant_book === 1,
                minNights: data.listing.min_nights || 1,
                maxNights: data.listing.max_nights,
                maxGuests: data.listing.max_guests,
                bedrooms: data.listing.bedrooms,
                beds: data.listing.beds,
                bathrooms: data.listing.bathrooms,
                pricePerNight: data.listing.price_per_night,
                cleaningFee: data.listing.cleaning_fee,
                currency: data.listing.currency || 'XAF',
                safetyDevices: data.listing.safety_devices ? JSON.parse(data.listing.safety_devices) : [],
                houseRules: data.listing.house_rules || '',
                address: data.listing.address,
                city: data.listing.city,
                country: data.listing.country || 'Cameroon',
                isDirty: false,
            };

            setDraft(loadedDraft);
            localStorage.setItem(DRAFT_KEY, JSON.stringify(loadedDraft));

        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [draft.step]);

    const publishListing = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (!draft.id) {
            // Save first if not saved
            await saveDraft();
            if (!draft.id) {
                return { success: false, error: 'Failed to create listing' };
            }
        }

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                window.location.href = '/';
                return { success: false, error: 'Please log in to publish' };
            }

            await apiClient.post(`/listings/${draft.id}/publish`);

            // Clear draft after successful publish
            localStorage.removeItem(DRAFT_KEY);
            setDraft(defaultDraft);

            return { success: true };

        } catch (error: any) {
            console.error('Failed to publish listing:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to publish';
            return { success: false, error: errorMessage };
        }
    }, [draft.id, saveDraft]);

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
