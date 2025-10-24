import { useContext } from "react";
import { MessagingContext } from "@/contexts/MessagingContextTypes";

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider");
  }
  return context;
};