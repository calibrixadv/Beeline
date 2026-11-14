import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginPage from '../app/login/page';
import { checkPasswordBreach, checkEmailBreach } from '../services/breachCheckerService';

// Mock useRouter and useSearchParams
const mockPush = jest.fn();
let currentSearchTab: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'tab') return currentSearchTab;
      return null;
    },
  }),
}));

// Mock AuthContext
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockContinueAsGuest = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: mockLogin,
    signup: mockSignup,
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
  });

  it('renders the login tab with username/email and password parameters', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Beeline Traveler Portal/i })).toBeInTheDocument();
    expect(screen.getByText(/Username or Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Beeline/i })).toBeInTheDocument();
  });

  it('submits login with either username or email identifier', async () => {
    mockLogin.mockResolvedValueOnce(true);
    render(<LoginPage />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. alexandra or traveler@beeline\.io/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Beeline/i });

    await act(async () => {
      fireEvent.change(identifierInput, { target: { value: 'alexandra_transit' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret#2026!' } });
      fireEvent.click(submitBtn);
    });

    expect(mockLogin).toHaveBeenCalledWith('alexandra_transit', 'Secret#2026!');
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
});
