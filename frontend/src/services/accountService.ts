import apiClient from "@/api/client";

export interface AccountUser {
  id: number;
  username: string;
  email: string;
}

export interface AccountProfile {
  user_id: number;
  legal_name?: string | null;
  preferred_first_name?: string | null;
  phone?: string | null;
  residential_address?: string | null;
  mailing_address?: string | null;
  identity_verified?: number | null;
  language?: string | null;
  currency?: string | null;
  notify_email?: number | null;
  notify_sms?: number | null;
  privacy_profile_visibility?: string | null;
  tax_id?: string | null;
  payout_method?: string | null;
  travel_for_work?: number | null;
  location?: string | null;
  languages_spoken?: string | null;
}

export interface AccountMeResponse {
  user: AccountUser;
  profile: AccountProfile;
}

export const getAccountMe = async (): Promise<AccountMeResponse> => {
  const res = await apiClient.get("/account/me");
  return res.data;
};

export type UpdateAccountData = Partial<{
  username: string;
  email: string;
  legal_name: string;
  preferred_first_name: string;
  phone: string;
  residential_address: string;
  mailing_address: string;
  language: string;
  currency: string;
  notify_email: boolean;
  notify_sms: boolean;
  privacy_profile_visibility: string;
  tax_id: string;
  payout_method: string;
  travel_for_work: boolean;
  location: string;
  languages_spoken: string;
}>;

export const updateAccount = async (data: UpdateAccountData) => {
  const res = await apiClient.put("/account/update", data);
  return res.data;
};
