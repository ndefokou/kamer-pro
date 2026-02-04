import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (imagePath: string) => {
  if (!imagePath) {
    return "";
  }
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
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
