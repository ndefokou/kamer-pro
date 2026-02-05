import re

file_path = "/home/arthur/Documents/Web-site/kamer-pro/backend/src/routes/listings.rs"

with open(file_path, "r") as f:
    content = f.read()

# 1. Update get_host_listings loop
host_listing_loop_pattern = r"let mut out: Vec<ListingWithDetails> = Vec::with_capacity\(listings\.len\(\)\);\s+for l in listings \{\s+let sid = l\.id\.clone\(\);\s+let safety_items: Vec<String> = l\s+\.safety_devices\s+\.as_ref\(\)\s+\.and_then\(\|s\| serde_json::from_str\(s\)\.ok\(\)\)\s+\.unwrap_or_default\(\);\s+out\.push\(ListingWithDetails \{\s+listing: l,\s+amenities: Vec::new\(\),\s+photos: photos_map\.remove\(&sid\)\.unwrap_or_default\(\),\s+videos: Vec::new\(\),\s+safety_items,\s+unavailable_dates: Vec::new\(\),\s+contact_phone: contact_phone\.clone\(\),\s+host_avatar: host_avatar\.clone\(\),\s+host_username: None,\s+\}\);\s+\}"

host_listing_replacement = """    let mut out: Vec<MarketplaceListing> = Vec::with_capacity(listings.len());
    for l in listings {
        let sid = l.id.clone();
        out.push(MarketplaceListing {
            listing: MarketplaceListingInner {
                id: l.id,
                host_id,
                title: l.title,
                city: l.city,
                price_per_night: l.price_per_night,
                currency: l.currency,
                property_type: l.property_type,
            },
            photos: photos_map.remove(&sid).unwrap_or_default(),
            host_avatar: host_avatar.clone(),
            host_username: None,
        });
    }"""

# 2. Update get_my_listings loop
my_listing_loop_pattern = r"let mut out: Vec<ListingWithDetails> = Vec::with_capacity\(listings\.len\(\)\);\s+for l in listings \{\s+let sid = l\.id\.clone\(\);\s+let safety_items: Vec<String> = l\s+\.safety_devices\s+\.as_ref\(\)\s+\.and_then\(\|s\| serde_json::from_str\(s\)\.ok\(\)\)\s+\.unwrap_or_default\(\);\s+out\.push\(ListingWithDetails \{\s+listing: l,\s+amenities: Vec::new\(\),\s+photos: photos_map\.remove\(&sid\)\.unwrap_or_default\(\),\s+videos: Vec::new\(\),\s+safety_items,\s+unavailable_dates: Vec::new\(\),\s+contact_phone: None,\s+host_avatar: None,\s+host_username: None,\s+\}\);\s+\}"

my_listing_replacement = """    let mut out: Vec<MarketplaceListing> = Vec::with_capacity(listings.len());
    for l in listings {
        let sid = l.id.clone();
        out.push(MarketplaceListing {
            listing: MarketplaceListingInner {
                id: l.id,
                host_id: user_id,
                title: l.title,
                city: l.city,
                price_per_night: l.price_per_night,
                currency: l.currency,
                property_type: l.property_type,
            },
            photos: photos_map.remove(&sid).unwrap_or_default(),
            host_avatar: None,
            host_username: None,
        });
    }"""

new_content = re.sub(host_listing_loop_pattern, host_listing_replacement, content)
new_content = re.sub(my_listing_loop_pattern, my_listing_replacement, new_content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Successfully updated loops in listings.rs")
