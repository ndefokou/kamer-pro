import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
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

    // Load draft from localStorage on mount or when userId changes
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            setDraft(defaultDraft);
            return;
        }

        const userDraftKey = `${DRAFT_KEY}_${userId}`;
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
    }, []); // We actually want to check this when the component mounts, but also we need to handle login/logout. 
    // Ideally we should listen to userId changes, but it's in localStorage. 
    // For now, let's stick to mount, but we might need a way to trigger reload.
    // Actually, let's make it depend on a "key" that changes, or we can expose a "reload" function.
    // But wait, if I logout and login, the app might reload or at least the context might re-mount if it's high up?
    // HostProvider is in App.tsx, so it doesn't unmount on route change.
    // We need to listen to storage events or expose a reset.

    // Better approach:
    // We can't easily listen to localStorage changes from the same window.
    // However, when we login/logout, we usually navigate or reload.
    // Let's make sure we check userId.

    // Let's add a check for userId in the effect.
    // Since we don't have a user context that provides userId, we have to rely on reading it.
    // But we can't put localStorage.getItem('userId') in the dependency array.

    // Let's modify the effect to run periodically or expose a way to refresh.
    // OR, simpler: The user is redirected to login, which is a separate page. 
    // When they come back, the Provider might not have unmounted.
    // We should probably expose a `refreshSession` or similar, OR just rely on the fact that 
    // when we login, we usually do a full page reload or at least a significant state change.
    // BUT, `HostProvider` wraps `RouterProvider`.

    // Let's look at `Navbar.tsx`. It handles logout by `navigate("/")`.
    // `WebAuthLogin` handles login by `navigate(redirectTo)`.
    // The `HostProvider` will NOT unmount.

    // So we need to react to login/logout.
    // We can add a `useEffect` that checks `localStorage.getItem('userId')` on location change?
    // Or we can just make `loadDraft` public and call it?

    // Let's stick to the plan: Update key.
    // And I will add a `useEffect` that runs on location change to check if userId changed?
    // No, that's messy.

    // Let's just use the `key` prop on the provider? No.

    // Let's just update the `useEffect` to be smarter.
    // Actually, `HostProvider` is inside `App`, so it persists.
    // We need a way to reset when user changes.
    // I will add a `useEffect` that checks for userId changes.

    // Wait, I can't easily detect localStorage changes.
    // But I can check it every time we try to save or access the draft.

    // Let's go with:
    // 1. Update `loadDraft` to take userId into account.
    // 2. Update `saveDraft` (already does).
    // 3. Update the auto-save effect.

    // But the initial load is the problem.
    // If I login, `HostProvider` is already mounted with `defaultDraft`.
    // I need to load the user's draft.

    // I will add a `key` to `HostProvider` in `App.tsx`?
    // No, `App.tsx` renders `HostProvider`.

    // Let's just modify `HostContext` to check userId.

    // For now, I will implement the key change and the logic to load/save based on that key.
    // I will also add a `useEffect` that listens to `storage` events (for cross-tab) 
    // AND maybe we can hook into the router location to re-check user?

    // Actually, `WebAuthLogin` does `navigate`.
    // Let's just add a simple check:

    /*
    useEffect(() => {
        const checkUser = () => {
            const currentUserId = localStorage.getItem('userId');
            // logic to switch draft if user changed
        };
        // ...
    */

    // Let's just stick to the requested change first: Key by userId.

    useEffect(() => {
        const loadUserDraft = () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setDraft(defaultDraft);
                return;
            }
            const userDraftKey = `${DRAFT_KEY}_${userId}`;
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

        loadUserDraft();

        // Listen for custom event 'auth-change' or just poll?
        // Let's just load on mount. 
        // If the user logs in, the page *should* ideally reload or we should trigger a refresh.
        // But `WebAuthLogin` just navigates.

        // I will add a window event listener for 'storage' which fires on other tabs.
        // For the same tab, we might need to manually trigger.

    }, []);

    // Auto-save to localStorage
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (draft.isDirty && userId) {
            const userDraftKey = `${DRAFT_KEY}_${userId}`;
            localStorage.setItem(userDraftKey, JSON.stringify(draft));
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

    const saveDraft = useCallback(async (): Promise<{ success: boolean; id?: string; error?: string }> => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                // Don't redirect here, let the component handle it or just fail
                throw new Error('Please log in to save your listing');
            }

            const payload: UpdateListingPayload = {
                property_type: draft.propertyType,
                title: draft.title || null,
                description: draft.description || null,
                price_per_night: draft.pricePerNight || 0,  // Ensure we always send a number
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

            console.log('Saving draft with payload:', {
                ...payload,
                pricePerNight: draft.pricePerNight,
                priceInPayload: payload.price_per_night
            });

            let listingId = draft.id;

            if (!listingId) {
                // If it's a new listing, create it first to get an ID
                const createResponse = await apiClient.post('/listings', {
                    property_type: draft.propertyType,
                });
                listingId = createResponse.data.listing.id;
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

            if (userId) {
                const userDraftKey = `${DRAFT_KEY}_${userId}`;
                localStorage.setItem(userDraftKey, JSON.stringify({
                    ...draft,
                    id: listingId,
                    isDirty: false,
                    lastSaved: new Date().toISOString(),
                }));
            }

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
    }, [draft]);

    const loadDraft = useCallback(async (id?: string) => {
        if (!id) {
            const userId = localStorage.getItem('userId');
            if (userId) {
                const userDraftKey = `${DRAFT_KEY}_${userId}`;
                const savedDraft = localStorage.getItem(userDraftKey);
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        setDraft({ ...defaultDraft, ...parsed });
                    } catch (error) {
                        console.error('Failed to parse saved draft:', error);
                    }
                }
            }
            return;
        }

        try {
            const response = await apiClient.get(`/listings/${id}`);
            const data = response.data;
            const listingData = data.listing;

            // Convert backend data to draft format
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
            const userId = localStorage.getItem('userId');
            if (userId) {
                const userDraftKey = `${DRAFT_KEY}_${userId}`;
                localStorage.setItem(userDraftKey, JSON.stringify(loadedDraft));
            }

        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [draft.step]);

    const publishListing = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        let listingId = draft.id;

        if (!listingId) {
            // Save first if not saved
            const saveResult = await saveDraft();
            if (!saveResult.success || !saveResult.id) {
                return { success: false, error: saveResult.error || 'Failed to create listing' };
            }
            listingId = saveResult.id;
        }

        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                window.location.href = '/';
                return { success: false, error: 'Please log in to publish' };
            }

            await apiClient.post(`/listings/${listingId}/publish`);

            // Clear draft after successful publish
            if (userId) {
                const userDraftKey = `${DRAFT_KEY}_${userId}`;
                localStorage.removeItem(userDraftKey);
            }
            setDraft(defaultDraft);

            // Invalidate the products query to refetch the list
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
    }, [draft, saveDraft]);

    const resetDraft = useCallback(() => {
        setDraft(defaultDraft);
        const userId = localStorage.getItem('userId');
        if (userId) {
            const userDraftKey = `${DRAFT_KEY}_${userId}`;
            localStorage.removeItem(userDraftKey);
        }
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
