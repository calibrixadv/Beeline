export interface UserProfile {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_guest: boolean;
  is_active: boolean;
  mfa_enabled: boolean;
  email_verified?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteCorridorSummary {
  origin: string;
  destination: string;
  tripCount: number;
  totalDistanceKm: number;
  moneySavedLei: number;
  minutesSaved: number;
  topOperator: string;
}

export interface UserTravelStats {
  totalTrips: number;
  moneySavedLei: number;
  minutesSaved: number;
  totalDistanceKm: number;
  co2SavedKg: number;
  comparisonBaseline: string;
  favoriteRoute: RouteCorridorSummary | null;
  topRoutes: RouteCorridorSummary[];
}

export interface TicketResponse {
  ticketNumber: string;
  trainNumber: string;
  carNumber: string;
  seatNumber: string;
  classType: string;
  passengerName: string;
  qrCodePayload: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
}

export interface BookingResponse {
  bookingId: string;
  bookingReference: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'REFUNDED';
  createdAt: string;
  totalAmountLei: number;
  currency: string;
  passengerCount: number;
  seatPreference?: string;
  contactEmail?: string;
  contactPhone?: string;
  tickets: TicketResponse[];
}


export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
  recovery_codes?: string[];
}

export interface SignUpResponse {
  verification_required: boolean;
  email: string;
  message: string;
  expires_in_minutes: number;
}

export interface VerifyEmailRequest {
  email?: string;
  code?: string;
  token?: string;
  remember_me?: boolean;
}

export interface ResendVerificationResponse {
  message: string;
  expires_in_minutes?: number;
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
  alertMuted?: boolean;
  alertLeadMinutes?: 5 | 10 | 30 | 60;
}

export interface BreachCheckResult {
  is_password_compromised: boolean;
  password_breach_count: number;
  is_email_compromised: boolean;
  email_breach_count: number;
  breaches: string[];
  warning?: string | null;
  recommendation: string;
}

export interface NotificationStatusResponse {
  emailNotificationsEnabled: boolean;
  departureReminderMinutes: number;
  emailMode: string;
  mailpitWebUrl?: string | null;
  sentCount: number;
}

export interface TestDepartureAlertRequest {
  trainNumber?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  delayMinutes?: number;
}

export interface TestDepartureAlertResponse {
  message: string;
  recipientEmail: string;
  trainNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  delayMinutes: number;
}

export interface UserPreferences {
  default_pillar?: 'safe' | 'fast' | 'economy';
  home_station_code?: string;
  min_transfer_buffer_minutes?: number;
  preferred_operators?: string[];
  email_security_alerts?: boolean;
  email_delay_alerts?: boolean;
  email_notifications?: boolean;
  departure_reminder_minutes?: number;
  theme?: 'cozy_hive' | 'high_contrast';
}
