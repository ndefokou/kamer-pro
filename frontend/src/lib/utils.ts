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
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8082";
  const imagePathClean = imagePath.startsWith("/")
    ? imagePath.substring(1)
    : imagePath;
  return `${backendUrl}/${imagePathClean}`;
};

export const formatPrice = (price: number) => {
  return `${price.toLocaleString()} FCFA`;
};
