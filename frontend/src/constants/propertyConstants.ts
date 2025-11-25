/**
 * Shared constants for property categories, conditions, and locations
 * This ensures consistency across all components
 */

export interface CategoryOption {
    key: string;
    value: string;
}

export interface ConditionOption {
    key: string;
    value: string;
}

export interface LocationOption {
    key: string;
    value: string;
}

/**
 * Property Categories
 * These categories are used across the application for filtering and product creation
 */
export const PROPERTY_CATEGORIES: CategoryOption[] = [
    { key: "all", value: "All" },

    // Residential
    { key: "room", value: "room" },
    { key: "villa", value: "villa" },
    { key: "apartment", value: "apartment" },
    { key: "studio", value: "studio" },
    { key: "furnished_apartment", value: "furnished_apartment" },
    { key: "furnished_studio", value: "furnished_studio" },
    { key: "furnished_room", value: "furnished_room" },

    // Commercial
    { key: "shop", value: "shop" },
    { key: "office", value: "office" },

    // Hospitality
    { key: "hotel", value: "hotel" },
];

/**
 * Property Conditions/Status
 * These represent whether a property is for sale or for rent
 */
export const PROPERTY_CONDITIONS: ConditionOption[] = [
    { key: "all", value: "All" },
    { key: "for_sale", value: "for_sale" },
    { key: "for_rent", value: "for_rent" },
];

/**
 * Locations in Cameroon
 * Major cities where properties can be listed
 */
export const PROPERTY_LOCATIONS: LocationOption[] = [
    { key: "all", value: "All" },
    { key: "douala", value: "Douala" },
    { key: "yaounde", value: "Yaoundé" },
    { key: "garoua", value: "Garoua" },
    { key: "bamenda", value: "Bamenda" },
    { key: "maroua", value: "Maroua" },
    { key: "bafoussam", value: "Bafoussam" },
    { key: "ngaoundere", value: "Ngaoundéré" },
    { key: "bertoua", value: "Bertoua" },
    { key: "ebolowa", value: "Ebolowa" },
    { key: "kumba", value: "Kumba" },
    { key: "limbe", value: "Limbe" },
    { key: "buea", value: "Buea" },
];
