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
  const base = (import.meta.env.VITE_BACKEND_URL as string | undefined)
    || (import.meta.env.VITE_API_URL as string | undefined)
    || "/api";
  const imagePathClean = imagePath.startsWith("/")
    ? imagePath.substring(1)
    : imagePath;
  const sep = base.endsWith("/") ? "" : "/";
  return `${base}${sep}${imagePathClean}`;
};

export const formatPrice = (price: number) => {
  return `${price.toLocaleString()} FCFA`;
};
