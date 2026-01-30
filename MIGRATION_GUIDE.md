# Migration Guide: Implementing Network Optimizations

This guide helps you integrate the network optimization features into your existing components.

## Quick Start Checklist

- [ ] Add NetworkStatusIndicator to your app
- [ ] Replace image tags with OptimizedImage
- [ ] Update listing queries to use pagination
- [ ] Add network quality checks for heavy operations
- [ ] Test offline functionality

## Step 1: Add Network Status Indicator

Add the indicator to your main App component or layout:

```tsx
// In App.tsx
import NetworkStatusIndicator from './components/NetworkStatusIndicator';

function App() {
  return (
    <>
      <Router>
        {/* Your routes */}
      </Router>
      <NetworkStatusIndicator />
    </>
  );
}
```

## Step 2: Update Image Components

### Before:
```tsx
// PropertyCard.tsx
<img 
  src={listing.photos[0]?.url} 
  alt={listing.listing.title}
  className="w-full h-48 object-cover"
/>
```

### After:
```tsx
// PropertyCard.tsx
import OptimizedImage from './OptimizedImage';

<OptimizedImage
  src={listing.photos[0]?.url} 
  alt={listing.listing.title}
  className="w-full h-48 object-cover"
  priority={index < 4} // First 4 images load immediately
/>
```

## Step 3: Update PhotoGallery Component

```tsx
// PhotoGallery.tsx
import OptimizedImage from './OptimizedImage';
import { useConnectionQuality } from '../services/networkService';

export const PhotoGallery = ({ photos }) => {
  const { shouldPreloadImages } = useConnectionQuality();
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photo, index) => (
        <OptimizedImage
          key={photo.id}
          src={photo.url}
          alt={`Photo ${index + 1}`}
          priority={index === 0} // Cover image loads first
          className="w-full h-64 object-cover rounded-lg"
        />
      ))}
    </div>
  );
};
```

## Step 4: Update Listing Pages with Pagination

### Before:
```tsx
// SearchResults.tsx
const { data: listings } = useQuery({
  queryKey: ['listings', filters],
  queryFn: () => getProducts(filters),
});
```

### After:
```tsx
// SearchResults.tsx
import { usePagination, useInfiniteScroll } from '../hooks/usePagination';
import { useConnectionQuality } from '../services/networkService';

const SearchResults = () => {
  const { recommendedPageSize } = useConnectionQuality();
  const [allListings, setAllListings] = useState([]);
  
  const pagination = usePagination({
    adaptivePageSize: true, // Adjusts based on network
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ['listings', filters, pagination.offset, pagination.pageSize],
    queryFn: () => getProducts({
      ...filters,
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
  });
  
  // Update hasMore based on results
  useEffect(() => {
    if (data) {
      setAllListings(prev => [...prev, ...data]);
      pagination.setHasMore(data.length === pagination.pageSize);
    }
  }, [data]);
  
  // Infinite scroll
  const { setObserverTarget } = useInfiniteScroll({
    onLoadMore: pagination.nextPage,
    hasMore: pagination.hasMore,
    isLoading,
  });
  
  return (
    <div>
      {allListings.map(listing => (
        <PropertyCard key={listing.listing.id} listing={listing} />
      ))}
      
      {isLoading && <LoadingSpinner />}
      
      {/* Infinite scroll trigger */}
      <div ref={setObserverTarget} className="h-10" />
    </div>
  );
};
```

## Step 5: Add Network-Aware Features

### Disable Heavy Features on Slow Connections:

```tsx
// ListingDetails.tsx
import { useConnectionQuality } from '../services/networkService';

const ListingDetails = () => {
  const { isSlowConnection, shouldReduceQuality } = useConnectionQuality();
  
  return (
    <div>
      {/* Always show basic info */}
      <ListingInfo />
      
      {/* Conditionally load heavy components */}
      {!isSlowConnection && (
        <>
          <MapView location={listing.location} />
          <VideoTour videos={listing.videos} />
        </>
      )}
      
      {isSlowConnection && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
          <p>Map and videos disabled on slow connection to save data.</p>
          <button onClick={() => setForceLoad(true)}>
            Load anyway
          </button>
        </div>
      )}
    </div>
  );
};
```

### Optimize File Uploads:

```tsx
// PhotoUpload.tsx
import { useConnectionQuality } from '../services/networkService';

const PhotoUpload = () => {
  const { recommendedImageQuality, isSlowConnection } = useConnectionQuality();
  
  const handleFileSelect = async (files: File[]) => {
    if (isSlowConnection) {
      // Compress images more aggressively on slow connections
      const compressed = await compressImages(files, {
        maxWidth: 1200,
        quality: 0.6,
      });
      await uploadImages(compressed);
    } else {
      await uploadImages(files);
    }
  };
  
  return (
    <div>
      {isSlowConnection && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
          Images will be compressed to save bandwidth on your connection.
        </div>
      )}
      <FileUploader onSelect={handleFileSelect} />
    </div>
  );
};
```

## Step 6: Add Offline Support Messages

```tsx
// Messages.tsx
import { useNetworkInfo } from '../services/networkService';

const Messages = () => {
  const { isOnline } = useNetworkInfo();
  const [pendingMessages, setPendingMessages] = useState([]);
  
  const sendMessage = async (content: string) => {
    if (!isOnline) {
      // Queue message for later
      setPendingMessages(prev => [...prev, { content, timestamp: Date.now() }]);
      toast.info('Message will be sent when you\'re back online');
      return;
    }
    
    await sendMessageAPI(content);
  };
  
  // Send pending messages when back online
  useEffect(() => {
    if (isOnline && pendingMessages.length > 0) {
      pendingMessages.forEach(msg => sendMessageAPI(msg.content));
      setPendingMessages([]);
    }
  }, [isOnline, pendingMessages]);
  
  return (
    <div>
      {!isOnline && (
        <div className="p-4 bg-orange-50 text-orange-800 rounded mb-4">
          You're offline. Messages will be sent when connection is restored.
        </div>
      )}
      {/* Message UI */}
    </div>
  );
};
```

## Step 7: Update PropertyCard Component

```tsx
// PropertyCard.tsx
import OptimizedImage from './OptimizedImage';
import { useConnectionQuality } from '../services/networkService';

export const PropertyCard = ({ listing, index = 0 }) => {
  const { shouldReduceQuality } = useConnectionQuality();
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <OptimizedImage
        src={listing.photos[0]?.url}
        alt={listing.listing.title}
        className="w-full h-48 object-cover"
        priority={index < 6} // First 6 cards load immediately
        quality={shouldReduceQuality ? 'low' : undefined}
      />
      
      <div className="p-4">
        <h3 className="font-semibold">{listing.listing.title}</h3>
        <p className="text-gray-600">{listing.listing.city}</p>
        <p className="font-bold mt-2">
          {listing.listing.price_per_night} {listing.listing.currency}/night
        </p>
      </div>
    </div>
  );
};
```

## Step 8: Add Cache Warming on App Load

```tsx
// App.tsx
import { useEffect } from 'react';
import { dbService } from './services/dbService';
import { getProducts } from './api/client';

function App() {
  useEffect(() => {
    // Warm up cache on app load
    const warmCache = async () => {
      try {
        // Fetch  listings in background
        const listings = await getProducts({ limit: 20 });
        console.log('Cache warmed with', listings.length, 'listings');
      } catch (error) {
        console.log('Cache warming failed, will load on demand');
      }
    };
    
    warmCache();
    
    // Clean expired cache daily
    const cleanupInterval = setInterval(() => {
      dbService.clearExpiredCache();
    }, 1000 * 60 * 60 * 24); // 24 hours
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  return <YourApp />;
}
```

## Step 9: Add Loading States

```tsx
// LoadingSpinner.tsx
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  const { isSlowConnection } = useConnectionQuality();
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-gray-600">{message}</p>
      {isSlowConnection && (
        <p className="mt-2 text-sm text-yellow-600">
          Slow connection detected. This may take a moment...
        </p>
      )}
    </div>
  );
};
```

## Step 10: Test Offline Functionality

### Chrome DevTools:
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Test your app:
   - Browse cached listings ✓
   - View cached images ✓
   - See offline indicator ✓
   - Try to load new content (should show cached or error)

### Test Slow Connection:
1. In Network tab, select "Slow 3G"
2. Verify:
   - Smaller page sizes ✓
   - Lower quality images ✓
   - Cache-first behavior ✓
   - Network indicator shows "Slow Connection" ✓

## Common Issues & Solutions

### Issue: Images not caching
**Solution:** Check that the image URLs are accessible and CORS is enabled

### Issue: Cache growing too large
**Solution:** Reduce TTL values or run `clearExpiredCache()` more frequently

### Issue: Pagination not working
**Solution:** Ensure you're updating `hasMore` based on response length

### Issue: Network quality always shows "unknown"
**Solution:** Network Information API may not be supported. Fallback to online/offline only.

## Performance Monitoring

Add this to track cache effectiveness:

```tsx
// useEffect in App.tsx
useEffect(() => {
  const logCacheStats = async () => {
    const stats = await dbService.getCacheStats();
    console.log('Cache Statistics:', {
      totalItems: Object.values(stats).reduce((a, b) => a + b, 0),
      breakdown: stats,
    });
  };
  
  // Log every 5 minutes
  const interval = setInterval(logCacheStats, 1000 * 60 * 5);
  return () => clearInterval(interval);
}, []);
```

## Next Steps

1. ✅ Implement all changes above
2. ✅ Test on real slow network (use phone on 3G)
3. ✅ Monitor cache hit rates
4. ✅ Gather user feedback
5. 🔄 Iterate and optimize based on metrics

## Need Help?

- Check `NETWORK_OPTIMIZATION.md` for detailed documentation
- Review example implementations in the codebase
- Test with Chrome DevTools Network throttling
