import apiClient from "@/api/client";

export interface RegistrationStartResponse {
  challenge: string;
  user_id: string;
  username: string;
}

export interface RegistrationCompleteResponse {
  message: string;
  user_id: number;
}

export interface AuthenticationStartResponse {
  challenge: string;
  username: string;
}

export interface AuthenticationCompleteResponse {
  message: string;
  token: string;
  user_id: number;
  username: string;
  email: string;
}

export class WebAuthService {
  async startRegistration(
    username: string,
  ): Promise<RegistrationStartResponse> {
    const response = await apiClient.post("/auth/register/start", {
      username,
    });
    return response.data;
  }

  async completeRegistration(
    username: string,
    credentialId: string,
    publicKey: string,
  ): Promise<RegistrationCompleteResponse> {
    const response = await apiClient.post("/auth/register/complete", {
      username,
      credential_id: credentialId,
      public_key: publicKey,
    });
    return response.data;
  }

  async startAuthentication(
    username: string,
  ): Promise<AuthenticationStartResponse> {
    const response = await apiClient.post("/auth/login/start", {
      username,
    });
    return response.data;
  }

  async completeAuthentication(
    username: string,
    signature: string,
  ): Promise<AuthenticationCompleteResponse> {
    const response = await apiClient.post("/auth/login/complete", {
      username,
      signature,
    });
    return response.data;
  }

  // Helper to encode data to base64
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper to decode base64 to ArrayBuffer
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
