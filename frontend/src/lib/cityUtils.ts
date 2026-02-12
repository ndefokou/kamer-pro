import { Product } from "@/api/client";

export const normalizeCity = (s?: string) => (s || "").trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export const preferredOrder = ["yaounde", "douala", "kribi"];

export const knownCities = {
    yaounde: { display: 'Yaounde', lat: 3.8480, lon: 11.5021, synonyms: ['bastos', 'biyem', 'nkolbisson', 'melen', 'odza', 'nkolmesseng', 'nkoabang', 'ekounou', 'essos', 'madagascar'] },
    douala: { display: 'Douala', lat: 4.0511, lon: 9.7679, synonyms: ['akwa', 'bonapriso', 'bonanjo', 'deido', 'makepe', 'ndogbong', 'logbaba', 'bepanda', 'bonamoussadi'] },
    kribi: { display: 'Kribi', lat: 2.9400, lon: 9.9100, synonyms: ['mpalla', 'londji', 'ebambe', 'lolabe'] },
    buea: { display: 'Buea', lat: 4.1527, lon: 9.2410, synonyms: ['molyko', 'muea', 'mile 17', 'bongo square', 'great soppo', 'small soppo', 'bokwango'] },
    limbe: { display: 'Limbe', lat: 4.0167, lon: 9.2167, synonyms: ['mile 4', 'mile 2', 'down beach', 'ngueme', 'batoke', 'bobende'] },
    bamenda: { display: 'Bamenda', lat: 5.9631, lon: 10.1591, synonyms: ['mankon', 'bambili', 'nkambé', 'kumbo'] },
    bafoussam: { display: 'Bafoussam', lat: 5.4769, lon: 10.4170, synonyms: ['bandjoun'] },
    dschang: { display: 'Dschang', lat: 5.4500, lon: 10.0667, synonyms: [] },
    foumban: { display: 'Foumban', lat: 5.7275, lon: 10.9014, synonyms: [] },
    bangante: { display: 'Bangangté', lat: 5.1500, lon: 10.5167, synonyms: ['bagangte'] },
    ngaoundere: { display: 'Ngaoundere', lat: 7.3263, lon: 13.5847, synonyms: ['adamawa', 'tibati', 'meiganga'] },
    garoua: { display: 'Garoua', lat: 9.3000, lon: 13.4000, synonyms: [] },
    maroua: { display: 'Maroua', lat: 10.5956, lon: 14.3247, synonyms: ['far north'] },
    bertoua: { display: 'Bertoua', lat: 4.5833, lon: 13.6833, synonyms: [] },
    ebolowa: { display: 'Ebolowa', lat: 2.9000, lon: 11.1500, synonyms: ['south'] },
} as const;

export const regions = {
    'centre': ['yaounde'],
    'littoral': ['douala', 'nkongsamba', 'edea'],
    'south': ['kribi', 'ebolowa'],
    'southwest': ['buea', 'limbe', 'tiko', 'kumba'],
    'northwest': ['bamenda', 'kumbo', 'ndop'],
    'west': ['bafoussam', 'dschang', 'bandjoun', 'bangante', 'foumban'],
    'adamawa': ['ngaoundere', 'tibati', 'meiganga'],
    'north': ['garoua'],
    'far north': ['maroua', 'kousseri'],
    'east': ['bertoua', 'batouri'],
} as const;

export const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const inferCity = (p: Product): string => {
    const text = [p.listing.city, p.listing.address, p.listing.title].filter(Boolean).join(' ');
    const norm = normalizeCity(text);
    if (norm) {
        for (const key of preferredOrder) {
            if (norm.includes(key)) return knownCities[key as keyof typeof knownCities].display;
            const syns = knownCities[key as keyof typeof knownCities].synonyms;
            if (syns.some(s => norm.includes(s))) return knownCities[key as keyof typeof knownCities].display;
        }
        for (const key of (Object.keys(knownCities) as Array<keyof typeof knownCities>)) {
            if ((preferredOrder as readonly string[]).includes(key as string)) continue;
            if (norm.includes(key)) return knownCities[key].display;
            const syns = knownCities[key].synonyms;
            if (syns.some(s => norm.includes(s))) return knownCities[key].display;
        }
    }
    if (p.listing.latitude && p.listing.longitude) {
        const { latitude, longitude } = p.listing;
        let best: { key: keyof typeof knownCities; dist: number } | null = null;
        (Object.keys(knownCities) as Array<keyof typeof knownCities>).forEach((key) => {
            const city = knownCities[key];
            const d = distanceKm(latitude!, longitude!, city.lat, city.lon);
            if (!best || d < best.dist) best = { key, dist: d };
        });
        if (best && best.dist <= 80) {
            return knownCities[best.key].display;
        }
    }
    return '';
};
