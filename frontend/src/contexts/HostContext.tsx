import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuth } from './AuthContext';

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
    latitude?: number;
    longitude?: number;
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

    // Location
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;

    // Metadata
    lastSaved?: string;
    isDirty: boolean;
}

interface HostContextType {
    draft: ListingDraft;
    updateDraft: (updates: Partial<ListingDraft>) => void;
    saveDraft: () => Promise<{ success: boolean; id?: string; error?: string }>;
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
    const queryClient = useQueryClient();
    const { user, loading: authLoading } = useAuth();

    const updateDraft = useCallback((updates: Partial<ListingDraft>) => {
        setDraft(prev => ({
            ...prev,
            ...updates,
            isDirty: true,
        }));
    }, []);

    const saveDraft = useCallback(async (): Promise<{ success: boolean; id?: string; error?: string }> => {
        if (!user) {
            const errorMsg = 'Please log in to save your listing';
            setSaveError(errorMsg);
            return { success: false, error: errorMsg };
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const payload: UpdateListingPayload = {
                property_type: draft.propertyType,
                title: draft.title || null,
                description: draft.description || null,
                price_per_night: draft.pricePerNight || 0,
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
                latitude: draft.latitude,
                longitude: draft.longitude,
            };

            let listingId = draft.id;

            if (!listingId) {
                const createResponse = await apiClient.post('/listings', {
                    property_type: draft.propertyType,
                });
                listingId = createResponse.data.listing.id;
                if (!listingId) {
                    throw new Error('Failed to create new listing.');
                }
            }

            await apiClient.put(`/listings/${listingId}`, payload);

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

            const updatedDraftState = {
                ...draft,
                id: listingId,
                isDirty: false,
                lastSaved: new Date().toISOString(),
            };
            setDraft(updatedDraftState);

            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            localStorage.setItem(userDraftKey, JSON.stringify(updatedDraftState));

            return { success: true, id: listingId };

        } catch (error) {
            console.error('Failed to save draft:', error);
            let errorMessage = 'Failed to save';
            if (error instanceof AxiosError && error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            setSaveError(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setIsSaving(false);
        }
    }, [draft, user]);

    // Load draft from localStorage on mount or when user changes
    useEffect(() => {
        const loadUserDraft = () => {
            if (!user) {
                setDraft(defaultDraft);
                return;
            }

            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            const savedDraft = localStorage.getItem(userDraftKey);

            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    setDraft({ ...defaultDraft, ...parsed });
                } catch (error) {
                    console.error('Failed to parse saved draft:', error);
                    setDraft(defaultDraft);
                }
            } else {
                setDraft(defaultDraft);
            }
        };

        if (!authLoading) {
            loadUserDraft();
        }
    }, [user, authLoading]);

    // Auto-save to localStorage
    useEffect(() => {
        if (draft.isDirty && user) {
            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            localStorage.setItem(userDraftKey, JSON.stringify(draft));
        }
    }, [draft, user]);

    // Periodic backend sync
    useEffect(() => {
        if (!user || authLoading) {
            return;
        }

        const interval = setInterval(() => {
            if (draft.isDirty && draft.id) {
                saveDraft();
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [draft, user, authLoading, saveDraft]);

    const loadDraft = useCallback(async (id?: string) => {
        if (!user) return;

        if (!id) {
            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            const savedDraft = localStorage.getItem(userDraftKey);
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
            const listingData = data.listing;

            const loadedDraft: ListingDraft = {
                id: listingData.id,
                step: draft.step,
                propertyType: listingData.property_type,
                amenities: data.amenities || [],
                photos: data.photos?.map((p: Photo) => p.url) || [],
                videos: data.videos?.map((v: Video) => v.url) || [],
                coverPhotoIndex: data.photos?.findIndex((p: Photo) => p.is_cover === 1) || 0,
                title: listingData.title || '',
                description: listingData.description || '',
                instantBook: listingData.instant_book === 1,
                minNights: listingData.min_nights || 1,
                maxNights: listingData.max_nights,
                maxGuests: listingData.max_guests,
                bedrooms: listingData.bedrooms,
                beds: listingData.beds,
                bathrooms: listingData.bathrooms,
                pricePerNight: listingData.price_per_night,
                cleaningFee: listingData.cleaning_fee,
                currency: listingData.currency || 'XAF',
                safetyDevices: listingData.safety_devices
                    ? JSON.parse(listingData.safety_devices)
                    : [],
                houseRules: listingData.house_rules || '',
                address: listingData.address,
                city: listingData.city,
                country: listingData.country || 'Cameroon',
                latitude: listingData.latitude,
                longitude: listingData.longitude,
                isDirty: false,
            };

            setDraft(loadedDraft);
            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            localStorage.setItem(userDraftKey, JSON.stringify(loadedDraft));

        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [draft.step, user]);

    const publishListing = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Please log in to publish' };
        }

        let listingId = draft.id;

        if (!listingId) {
            const saveResult = await saveDraft();
            if (!saveResult.success || !saveResult.id) {
                return { success: false, error: saveResult.error || 'Failed to create listing' };
            }
            listingId = saveResult.id;
        }

        try {
            await apiClient.post(`/listings/${listingId}/publish`);

            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            localStorage.removeItem(userDraftKey);
            setDraft(defaultDraft);

            await queryClient.invalidateQueries({ queryKey: ['products'] });

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
    }, [draft, saveDraft, user, queryClient]);

    const resetDraft = useCallback(() => {
        setDraft(defaultDraft);
        if (user) {
            const userDraftKey = `${DRAFT_KEY}_${user.id}`;
            localStorage.removeItem(userDraftKey);
        }
    }, [user]);

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
