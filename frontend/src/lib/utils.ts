import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (imagePath: string) => {
  if (!imagePath) {
    return "";
  }

  // If it's already a complete URL (http/https), return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // If it's a data URL or blob, return as-is
  if (imagePath.startsWith("data:") || imagePath.startsWith("blob:")) {
    return imagePath;
  }

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

  // If we have a Supabase URL and the path looks like a storage path
  if (supabaseUrl && (imagePath.includes('/') || imagePath.includes('listing') || imagePath.includes('image'))) {
    // Clean the path - remove leading slash if present
    const cleanPath = imagePath.startsWith("/") ? imagePath.substring(1) : imagePath;

    // If the path already includes 'storage/v1/object/public', it's a partial Supabase URL
    if (cleanPath.includes('storage/v1/object/public')) {
      return `${supabaseUrl}/${cleanPath}`;
    }

    // Otherwise, construct the full Supabase storage URL
    // Using 'images' bucket as configured in backend
    return `${supabaseUrl}/storage/v1/object/public/images/${cleanPath}`;
  }

  // Fallback: use backend URL for serving images
  let base = (import.meta.env.VITE_BACKEND_URL as string | undefined)
    || (import.meta.env.VITE_API_URL as string | undefined)
    || "/api";

  // Avoid shipping localhost base URLs to production environments
  try {
    const isLocal = /localhost|127\.0\.0\.1/.test(base);
    const runningLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (isLocal && !runningLocal) {
      base = "/api";
    }
  } catch { /* noop */ }

  const imagePathClean = imagePath.startsWith("/")
    ? imagePath.substring(1)
    : imagePath;
  const sep = base.endsWith("/") ? "" : "/";
  return `${base}${sep}${imagePathClean}`;
};


export const formatPrice = (price: number) => {
  return `${price.toLocaleString()} FCFA`;
};
