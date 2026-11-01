export interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  is_guest: boolean;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface MFALoginChallengeResponse {
  mfa_required: true;
  mfa_session_token: string;
  message: string;
}

export interface MFASetupResponse {
  secret: string;
  otpauth_url: string;
  qr_code_base64: string;
  backup_codes: string[];
}

export interface SessionResponse {
  session_id: string;
  device_info?: string | null;
  ip_address?: string | null;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token?: string | null;
}

export interface SavedRouteResponse {
  id: string;
  origin_name: string;
  destination_name: string;
  plan: any;
  created_at: string;
}
