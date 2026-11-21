import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginPage from '../app/login/page';
import VerifyEmailPage from '../app/verify-email/page';
import { checkPasswordBreach, checkEmailBreach } from '../services/breachCheckerService';

// Mock useRouter and useSearchParams
const mockPush = jest.fn();
let currentSearchTab: string | null = null;
let currentSearchToken: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'tab') return currentSearchTab;
      if (key === 'token') return currentSearchToken;
      return null;
    },
  }),
}));

// Mock AuthContext
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockVerifyEmail = jest.fn();
const mockResendVerification = jest.fn();
const mockContinueAsGuest = jest.fn();
let mockUser: any = null;
let mockIsAuthenticated = false;
let mockPendingRecoveryCodes: string[] | null = null;
const mockClearPendingRecoveryCodes = jest.fn(() => {
  mockPendingRecoveryCodes = null;
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    pendingRecoveryCodes: mockPendingRecoveryCodes,
    clearPendingRecoveryCodes: mockClearPendingRecoveryCodes,
    login: mockLogin,
    signup: mockSignup,
    verifyEmail: mockVerifyEmail,
    resendVerification: mockResendVerification,
    continueAsGuest: mockContinueAsGuest,
    mfaChallenge: null,
    verifyMFA: jest.fn(),
    cancelMFA: jest.fn(),
  }),
}));

describe('Breach Checker Service', () => {
  it('detects common breached passwords and provides urgent warnings', async () => {
    const result = await checkPasswordBreach('password123');
    expect(result.isCompromised).toBe(true);
    expect(result.breachCount).toBeGreaterThan(0);
    expect(result.warningMessage).toContain('Critical Security Alert');
    expect(result.warningMessage).toContain('credential-stuffing');
  });

  it('marks safe, strong uncompromised passwords as clean', async () => {
    const result = await checkPasswordBreach('Xk9#mP$7vL@qZ2!wE9');
    expect(result.isCompromised).toBe(false);
    expect(result.breachCount).toBe(0);
    expect(result.recommendation).toBeDefined();
  });

  it('flags known compromised email addresses in historical security breaches', async () => {
    const result = await checkEmailBreach('test.breached@example.com');
    expect(result.isCompromised).toBe(true);
    expect(result.breaches.length).toBeGreaterThan(0);
    expect(result.warningMessage).toContain('historical data breaches');
  });
});

describe('LoginPage & SignUp Portal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentSearchTab = null;
    currentSearchToken = null;
    mockUser = null;
    mockIsAuthenticated = false;
    mockPendingRecoveryCodes = null;
  });

  it('renders the login tab with username/email and password parameters', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Beeline Traveler Portal/i })).toBeInTheDocument();
    expect(screen.getByText(/Username or Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Beeline/i })).toBeInTheDocument();

    // Verify "Explore as Guest" / "Continue as Guest" CTA is completely absent
    expect(screen.queryByRole('button', { name: /explore as.*guest|continue as.*guest/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/continue as guest/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/explore as guest/i)).not.toBeInTheDocument();
  });

  it('strictly does NOT render any "Explore as a Guest" or "Continue as Guest" CTA on /login', () => {
    render(<LoginPage />);
    expect(screen.queryByRole('button', { name: /guest/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/explore as.*guest/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continue as.*guest/i)).not.toBeInTheDocument();
  });

  it('submits login with either username or email identifier and NEVER renders recovery codes UI', async () => {
    mockLogin.mockImplementationOnce(async () => {
      mockUser = {
        id: 'u-traveler-123',
        email: 'alexandra@beeline.io',
        username: 'alexandra_transit',
        is_guest: false,
        email_verified: true,
      };
      mockIsAuthenticated = true;
      mockPendingRecoveryCodes = null;
      return true;
    });
    render(<LoginPage />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Beeline/i });

    // Verify recovery codes are NOT present before login
    expect(screen.queryByTestId('recovery-codes-modal')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Emergency Recovery Codes/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/BEE-/i)).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(identifierInput, { target: { value: 'alexandra_transit' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret#2026!' } });
      fireEvent.click(submitBtn);
    });

    expect(mockLogin).toHaveBeenCalledWith('alexandra_transit', 'Secret#2026!');

    // Verify recovery codes are NEVER revealed after completing login (0ms flash)
    expect(screen.queryByTestId('recovery-codes-modal')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Emergency Recovery Codes/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/BEE-/i)).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders clean minimal redirecting state (null) during post-login redirect and NEVER flashes recovery codes', () => {
    mockUser = {
      id: 'u-traveler-123',
      email: 'alexandra@beeline.io',
      username: 'alexandra_transit',
      is_guest: false,
      email_verified: true,
    };
    mockIsAuthenticated = true;

    const { container } = render(<LoginPage />);

    // Container should render null (empty DOM) during post-login redirect
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('recovery-codes-modal')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Emergency Recovery Codes/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/BEE-/i)).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('switches to Sign Up tab and renders email, verification email, username, password and retype password fields', async () => {
    render(<LoginPage />);

    // Click Create Account tab
    const signupTabBtn = screen.getByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(signupTabBtn);
    });

    // Verify all requested parameters exist
    expect(screen.getByText(/^Email Address$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/traveler@example\.com/i)).toBeInTheDocument();

    expect(screen.getByText(/Verification Email \(Confirm Email\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Retype your email address/i)).toBeInTheDocument();

    expect(screen.getByText(/^Username$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. alexandra22/i)).toBeInTheDocument();

    expect(screen.getByText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Create a strong password/i)).toBeInTheDocument();

    expect(screen.getByText(/Retype Password \(Confirm Password\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm your password/i)).toBeInTheDocument();
  });

  it('validates matching verification email and matching retype password', async () => {
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });

    const emailInput = screen.getByPlaceholderText(/traveler@example\.com/i);
    const verifyEmailInput = screen.getByPlaceholderText(/Retype your email address/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'traveler@beeline.io' } });
      fireEvent.change(verifyEmailInput, { target: { value: 'traveler@beeline.io' } });
    });

    // Expect green match indicator
    expect(screen.getByText(/Emails Match/i)).toBeInTheDocument();

    const passInput = screen.getByPlaceholderText(/Create a strong password/i);
    const retypePassInput = screen.getByPlaceholderText(/Confirm your password/i);

    await act(async () => {
      fireEvent.change(passInput, { target: { value: 'SafePassword#2026' } });
      fireEvent.change(retypePassInput, { target: { value: 'SafePassword#2026' } });
    });

    // Expect green match indicator
    expect(screen.getByText(/Passwords Match/i)).toBeInTheDocument();
  });

  it('displays breach alert and warns user to change password when compromised password is typed', async () => {
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });

    const passInput = screen.getByPlaceholderText(/Create a strong password/i);

    // Enter known breached password
    await act(async () => {
      fireEvent.change(passInput, { target: { value: 'password123' } });
    });

    // Wait for breach checker inspection
    await waitFor(() => {
      expect(screen.getByTestId('breach-inspector-alert')).toBeInTheDocument();
      expect(screen.getByText(/Password Compromised in Data Breaches!/i)).toBeInTheDocument();
      expect(screen.getByText(/Please change this password immediately to something unique!/i)).toBeInTheDocument();
    });

    // The submit button is disabled or changes text to alert user
    const submitBtn = screen.getByRole('button', { name: /Change Compromised Password to Continue/i });
    expect(submitBtn).toBeDisabled();
  });

  it('transitions to email verification step after successful signup submission', async () => {
    mockSignup.mockResolvedValueOnce({
      verification_required: true,
      email: 'alexandra@example.com',
      message: 'Verification code sent to your email.',
      expires_in_minutes: 15,
    });

    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });

    fireEvent.change(screen.getByPlaceholderText(/traveler@example\.com/i), {
      target: { value: 'alexandra@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Retype your email address/i), {
      target: { value: 'alexandra@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. alexandra22/i), {
      target: { value: 'alexandra' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Create a strong password/i), {
      target: { value: 'SafePassword#2026' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), {
      target: { value: 'SafePassword#2026' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Beeline Account/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockSignup).toHaveBeenCalledWith(
      'alexandra@example.com',
      'SafePassword#2026',
      'alexandra',
      'alexandra'
    );

    // Verify transition to inline "Verify Your Email" step
    expect(screen.getByRole('heading', { level: 2, name: /Verify Your Email/i })).toBeInTheDocument();
    expect(screen.getByText(/alexandra@example\.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wrong email\? Go back/i })).toBeInTheDocument();
  });

  it('verifies 6-digit OTP, sets AuthContext user as authenticated, keeps 3 recovery codes visible without auto-redirect until explicit user confirmation', async () => {
    mockSignup.mockResolvedValueOnce({
      verification_required: true,
      email: 'alexandra@example.com',
      message: 'Verification code sent to your email.',
      expires_in_minutes: 15,
    });

    const recoveryCodes = ['BEE-1234-5678', 'BEE-9876-5432', 'BEE-4321-8765'];
    const authenticatedUser = {
      id: 'u1',
      email: 'alexandra@example.com',
      is_guest: false,
      is_active: true,
      mfa_enabled: false,
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T12:00:00Z',
    };

    // Simulate AuthContext.verifyEmail setting user/isAuthenticated and pendingRecoveryCodes
    mockVerifyEmail.mockImplementationOnce(async () => {
      mockUser = authenticatedUser;
      mockIsAuthenticated = true;
      mockPendingRecoveryCodes = recoveryCodes;
      return {
        access_token: 'valid-jwt-token',
        refresh_token: 'valid-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: authenticatedUser,
        recovery_codes: recoveryCodes,
      };
    });

    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });

    fireEvent.change(screen.getByPlaceholderText(/traveler@example\.com/i), {
      target: { value: 'alexandra@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Retype your email address/i), {
      target: { value: 'alexandra@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. alexandra22/i), {
      target: { value: 'alexandra' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Create a strong password/i), {
      target: { value: 'SafePassword#2026' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), {
      target: { value: 'SafePassword#2026' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Beeline Account/i }));
    });

    expect(mockSignup).toHaveBeenCalledWith(
      'alexandra@example.com',
      'SafePassword#2026',
      'alexandra',
      'alexandra'
    );

    // Enter 6-digit OTP code
    const codeInput = screen.getByLabelText(/6-digit verification code/i);
    expect(codeInput).toBeInTheDocument();

    // Clear mockPush to ensure no auto-redirect occurs during verification
    mockPush.mockClear();

    await act(async () => {
      fireEvent.change(codeInput, { target: { value: '654321' } });
      fireEvent.click(screen.getByRole('button', { name: /Verify Email/i }));
    });

    expect(mockVerifyEmail).toHaveBeenCalledWith({
      email: 'alexandra@example.com',
      code: '654321',
    });

    // CRITICAL ASSERTION: router.push must NOT have been called automatically,
    // despite user and isAuthenticated now being true!
    expect(mockPush).not.toHaveBeenCalled();

    // Verify all 3 recovery codes rendered and visible in DOM
    expect(screen.getByRole('heading', { level: 2, name: /Emergency Recovery Codes/i })).toBeInTheDocument();
    expect(screen.getByText('BEE-1234-5678')).toBeInTheDocument();
    expect(screen.getByText('BEE-9876-5432')).toBeInTheDocument();
    expect(screen.getByText('BEE-4321-8765')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy All Codes/i })).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Continue to Beeline/i });
    expect(continueBtn).toBeInTheDocument();

    // Still not redirected while viewing recovery codes
    expect(mockPush).not.toHaveBeenCalled();

    // Explicit user confirmation: clicking "Continue to Beeline"
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    // NOW router.push to '/' MUST be called
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('automatically opens email verification step when login returns EMAIL_NOT_VERIFIED (403)', async () => {
    const error: any = new Error('Please verify your email address before signing in.');
    error.status = 403;
    error.code = 'EMAIL_NOT_VERIFIED';
    error.email = 'unverified.traveler@beeline.io';
    mockLogin.mockRejectedValueOnce(error);

    render(<LoginPage />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Beeline/i });

    await act(async () => {
      fireEvent.change(identifierInput, { target: { value: 'unverified.traveler@beeline.io' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret#2026!' } });
      fireEvent.click(submitBtn);
    });

    // Automatically transitions to verification step pre-filled with email
    expect(screen.getByRole('heading', { level: 2, name: /Verify Your Email/i })).toBeInTheDocument();
    expect(screen.getByText(/unverified\.traveler@beeline\.io/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
  });

  it('allows resending code and supports returning to signup with Wrong email action', async () => {
    mockResendVerification.mockResolvedValueOnce({
      message: 'A fresh verification code was sent to your email.',
    });

    // Start with 403 login to reach verification screen directly
    const error: any = new Error('Please verify your email address before signing in.');
    error.status = 403;
    error.code = 'EMAIL_NOT_VERIFIED';
    error.email = 'typo@beeline.io';
    mockLogin.mockRejectedValueOnce(error);

    render(<LoginPage />);
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i), {
        target: { value: 'typo@beeline.io' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: 'Secret#2026!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Beeline/i }));
    });

    // Test resend code button
    const resendBtn = screen.getByRole('button', { name: /Resend code/i });
    await act(async () => {
      fireEvent.click(resendBtn);
    });
    expect(mockResendVerification).toHaveBeenCalledWith('typo@beeline.io');

    // Test Wrong email action returns to signup form
    const backBtn = screen.getByRole('button', { name: /Wrong email\? Go back/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    expect(screen.getByRole('button', { name: /Create Beeline Account/i })).toBeInTheDocument();
  });
});

describe('VerifyEmailPage (Magic Link & Direct Token Verification)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentSearchTab = null;
    currentSearchToken = null;
    mockUser = null;
    mockIsAuthenticated = false;
    mockPendingRecoveryCodes = null;
  });

  it('verifies magic-link token on mount, displays 3 recovery codes, and does NOT auto-redirect until explicit user confirmation', async () => {
    currentSearchToken = 'valid-magic-link-token';
    const recoveryCodes = ['BEE-REC1-1111', 'BEE-REC2-2222', 'BEE-REC3-3333'];
    const authenticatedUser = {
      id: 'u-magic-1',
      email: 'traveler@beeline.io',
      is_guest: false,
      is_active: true,
      mfa_enabled: false,
    };

    mockVerifyEmail.mockImplementationOnce(async () => {
      mockUser = authenticatedUser;
      mockIsAuthenticated = true;
      mockPendingRecoveryCodes = recoveryCodes;
      return {
        access_token: 'valid-jwt-token',
        refresh_token: 'valid-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: authenticatedUser,
        recovery_codes: recoveryCodes,
      };
    });

    render(<VerifyEmailPage />);

    // Wait for token verification to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Account Verified!/i })).toBeInTheDocument();
    });

    expect(mockVerifyEmail).toHaveBeenCalledWith({ token: 'valid-magic-link-token' });

    // CRITICAL: Assert router.push has NOT been called automatically
    expect(mockPush).not.toHaveBeenCalled();

    // Verify all 3 recovery codes are in DOM
    expect(screen.getByText('BEE-REC1-1111')).toBeInTheDocument();
    expect(screen.getByText('BEE-REC2-2222')).toBeInTheDocument();
    expect(screen.getByText('BEE-REC3-3333')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy All Codes/i })).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /I Have Saved My Codes — Continue/i });
    expect(continueBtn).toBeInTheDocument();

    // Still not redirected
    expect(mockPush).not.toHaveBeenCalled();

    // Click Continue button
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    // Now navigation to '/' occurs
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('verifies manual code submission on verify-email page, displays 3 recovery codes, and does NOT auto-redirect until explicit confirmation', async () => {
    currentSearchToken = null;
    const recoveryCodes = ['BEE-MAN1-1111', 'BEE-MAN2-2222', 'BEE-MAN3-3333'];
    const authenticatedUser = {
      id: 'u-manual-1',
      email: 'manual@beeline.io',
      is_guest: false,
      is_active: true,
      mfa_enabled: false,
    };

    mockVerifyEmail.mockImplementationOnce(async () => {
      mockUser = authenticatedUser;
      mockIsAuthenticated = true;
      mockPendingRecoveryCodes = recoveryCodes;
      return {
        access_token: 'valid-jwt-token',
        refresh_token: 'valid-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: authenticatedUser,
        recovery_codes: recoveryCodes,
      };
    });

    render(<VerifyEmailPage />);

    // Manual input form should be rendered
    expect(screen.getByRole('heading', { level: 2, name: /Enter Verification Code/i })).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/traveler@example\.com/i);
    const codeInput = screen.getByPlaceholderText(/e\.g\. 123456/i);
    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'manual@beeline.io' } });
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
    });

    expect(mockVerifyEmail).toHaveBeenCalledWith({ email: 'manual@beeline.io', code: '123456' });

    // Recovery codes card appears
    expect(screen.getByRole('heading', { level: 2, name: /Account Verified!/i })).toBeInTheDocument();
    expect(screen.getByText('BEE-MAN1-1111')).toBeInTheDocument();
    expect(screen.getByText('BEE-MAN2-2222')).toBeInTheDocument();
    expect(screen.getByText('BEE-MAN3-3333')).toBeInTheDocument();

    // router.push not called automatically
    expect(mockPush).not.toHaveBeenCalled();

    // Click Continue
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /I Have Saved My Codes — Continue/i }));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
