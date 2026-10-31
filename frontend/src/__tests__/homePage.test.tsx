import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage, { MAX_BEE_DISPLACEMENT_PX } from '../app/page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('HomePage Screen-Size Hero with Dynamic Mascot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Beeline title and disruptive message', () => {
    render(<HomePage />);
    
    // Check prominent h1 app title & badge
    expect(screen.getByRole('heading', { level: 1, name: /^Beeline$/i })).toBeInTheDocument();
    expect(screen.getByText(/Transit Planner/i)).toBeInTheDocument();
    expect(screen.getByText(/Beeline • Romanian Transit Solved/i)).toBeInTheDocument();
    
    // Check disruptive headline (h2)
    expect(screen.getByRole('heading', { level: 2, name: /Romanian Transit is Chaotic\./i })).toBeInTheDocument();
    expect(screen.getByText(/We Made It Effortless\./i)).toBeInTheDocument();
    
    // Check disruptive value prop
    expect(screen.getByText(/Stop gambling on delayed CFR trains/i)).toBeInTheDocument();
  });

  it('strictly contains ZERO map elements (Strict Invariant 1)', () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector('.leaflet-container')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('map')).toBeNull();
  });

  it('starts with default explorer mascot gear and initial search inputs, with right card removed', () => {
    const { container } = render(<HomePage />);
    
    // Mascot in background is in default explorer gear
    const bgContainer = container.querySelector('[data-testid="background-flying-mascot"]');
    expect(bgContainer).toBeInTheDocument();
    expect(bgContainer).toHaveAttribute('data-gear', 'default');

    // Right card has been removed from hero layout
    expect(screen.queryByText(/Ready to buzz across Romania! Pick your route\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manual debug override active/i)).not.toBeInTheDocument();

    // Inputs are present
    expect(screen.getByPlaceholderText(/e\.g\. Galați/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Brașov/i)).toBeInTheDocument();
  });

  it('searches corridors and dynamically changes mascot gear to route gears', () => {
    const { container } = render(<HomePage />);
    const bgContainer = container.querySelector('[data-testid="background-flying-mascot"]');
    
    const searchBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(searchBtn);

    // After search, route trifecta cards appear
    expect(screen.getByText(/Synchronized Corridors Found/i)).toBeInTheDocument();
    expect(screen.getAllByText(/SAFE ROUTE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FAST ROUTE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ECONOMY/i).length).toBeGreaterThan(0);

    // Defaults to SAFE route gear upon search with dynamic entrance and shine
    expect(bgContainer).toHaveAttribute('data-gear', 'safe');
    expect(bgContainer?.querySelector('[data-gear-status="entering"]')).toBeInTheDocument();
    expect(bgContainer?.querySelector('[data-testid="mascot-gear-shine"]')).toBeInTheDocument();

    // Click Fast Route triggers dynamic gear change
    const fastCard = screen.getAllByText(/FAST ROUTE/i)[0].closest('div');
    if (fastCard) fireEvent.click(fastCard);
    expect(bgContainer).toHaveAttribute('data-gear', 'fast');
    expect(bgContainer?.querySelector('[data-gear-status="exiting"]')).toHaveClass('animate-gear-radial-exit');
    expect(bgContainer?.querySelector('[data-gear-status="entering"]')).toHaveClass('animate-gear-enter-top');
    expect(bgContainer?.querySelector('[data-testid="mascot-gear-shine"]')).toBeInTheDocument();

    // Click Economy Route
    const economyCard = screen.getAllByText(/ECONOMY/i)[0].closest('div');
    if (economyCard) fireEvent.click(economyCard);
    expect(bgContainer).toHaveAttribute('data-gear', 'economy');

    // Click Modify to reset back to default
    const modifyBtn = screen.getByRole('button', { name: /Modify/i });
    fireEvent.click(modifyBtn);

    // Returned to default explorer mascot gear
    expect(bgContainer).toHaveAttribute('data-gear', 'default');
    expect(screen.getByRole('button', { name: /Find Synchronized Routes/i })).toBeInTheDocument();
  });

  it('does not allow gear selection in regular UI but allows manual override in Debug Tools popup', () => {
    const { container } = render(<HomePage />);
    const bgContainer = container.querySelector('[data-testid="background-flying-mascot"]');
    
    // Regular UI must NOT expose the gear chips
    expect(screen.queryByRole('button', { name: /⚡ Fast/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /🛡️ Safe/i })).not.toBeInTheDocument();

    // Open discrete Debug Tools popup
    const debugTrigger = screen.getByRole('button', { name: /Debug Tools/i });
    expect(debugTrigger).toBeInTheDocument();
    expect(debugTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(debugTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(debugTrigger);
    expect(debugTrigger).toHaveAttribute('aria-expanded', 'true');

    // Modal is now open, showing override options
    expect(screen.getByText(/Mascot Gear Override Panel/i)).toBeInTheDocument();

    // Toggle to Fast gear manually
    const fastChip = screen.getByRole('button', { name: /⚡ Fast/i });
    fireEvent.click(fastChip);
    expect(bgContainer).toHaveAttribute('data-gear', 'fast');

    // Toggle to Safe gear manually
    const safeChip = screen.getByRole('button', { name: /🛡️ Safe/i });
    fireEvent.click(safeChip);
    expect(bgContainer).toHaveAttribute('data-gear', 'safe');

    // Toggle to Economy gear manually
    const economyChip = screen.getByRole('button', { name: /🍯 Economy/i });
    fireEvent.click(economyChip);
    expect(bgContainer).toHaveAttribute('data-gear', 'economy');

    // Toggle back to Default gear
    const defaultChip = screen.getByRole('button', { name: /🧭 Default/i });
    fireEvent.click(defaultChip);
    expect(bgContainer).toHaveAttribute('data-gear', 'default');

    // Reset to Automatic Route Mode
    const resetAutoBtn = screen.getByRole('button', { name: /Reset to Automatic Route Mode/i });
    fireEvent.click(resetAutoBtn);

    // Close the debug popup
    const closeBtn = screen.getByRole('button', { name: /Close Debug Tools/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Mascot Gear Override Panel/i)).not.toBeInTheDocument();
    expect(debugTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the scaled-up background flying bee mascot in a non-intrusive container', () => {
    const { container } = render(<HomePage />);
    const bgContainer = container.querySelector('[data-testid="background-flying-mascot"]');
    expect(bgContainer).toBeInTheDocument();
    expect(bgContainer).toHaveClass('pointer-events-none');
    expect(bgContainer).toHaveClass('fixed');
    expect(bgContainer).toHaveAttribute('aria-hidden', 'true');

    const flyingBee = bgContainer?.querySelector('.animate-bee-dynamic-flight');
    expect(flyingBee).toBeInTheDocument();
  });

  it('smoothly follows mouse movements over/near the background bee clamped to max 4rem (64px)', () => {
    const { container } = render(<HomePage />);
    const anchor = container.querySelector('[data-testid="bee-mascot-anchor"]') as HTMLElement;
    const follow = container.querySelector('[data-testid="bee-mascot-follow"]') as HTMLElement;
    expect(anchor).toBeInTheDocument();
    expect(follow).toBeInTheDocument();

    // Mock bounding rect for predictable coordinates in JSDOM: anchor at (800, 100) with size (300, 300) -> center (950, 250)
    anchor.getBoundingClientRect = () => ({
      left: 800,
      top: 100,
      right: 1100,
      bottom: 400,
      width: 300,
      height: 300,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    // Initial resting displacement is 0
    expect(follow).toHaveAttribute('data-displacement-x', '0.00');
    expect(follow).toHaveAttribute('data-displacement-y', '0.00');
    expect(follow).toHaveAttribute('data-near', 'false');

    // Move mouse near the bee: center is (950, 250). Target at (980, 290) -> deltaX = 30, deltaY = 40, distance = 50 (< 64px)
    fireEvent.mouseMove(window, { clientX: 980, clientY: 290 });
    expect(follow).toHaveAttribute('data-near', 'true');
    expect(follow.getAttribute('data-displacement-x')).toBe('30.00');
    expect(follow.getAttribute('data-displacement-y')).toBe('40.00');
    expect(follow.style.transform).toBe('translate3d(30.00px, 40.00px, 0)');

    // Move mouse further away: Target at (1150, 450) -> deltaX = 200, deltaY = 200, distance = 282.84px
    // Must be strictly clamped to MAX_BEE_DISPLACEMENT_PX = 64px (4rem)
    fireEvent.mouseMove(window, { clientX: 1150, clientY: 450 });
    expect(follow).toHaveAttribute('data-near', 'true');
    const dispX = parseFloat(follow.getAttribute('data-displacement-x') || '0');
    const dispY = parseFloat(follow.getAttribute('data-displacement-y') || '0');
    const totalDisp = Math.hypot(dispX, dispY);
    expect(totalDisp).toBeCloseTo(MAX_BEE_DISPLACEMENT_PX, 1);
    expect(follow.getAttribute('data-displacement-rem-x')).toBe((dispX / 16).toFixed(3));
    expect(follow.getAttribute('data-displacement-rem-y')).toBe((dispY / 16).toFixed(3));

    // Move mouse far outside proximity radius (e.g. clientX: 100, clientY: 100 -> dist > 800px)
    fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    expect(follow).toHaveAttribute('data-near', 'false');
    expect(follow).toHaveAttribute('data-displacement-x', '0.00');
    expect(follow).toHaveAttribute('data-displacement-y', '0.00');
    expect(follow.style.transform).toBe('translate3d(0.00px, 0.00px, 0)');
  });

  it('resets displacement smoothly to 0 when mouse leaves window', () => {
    const { container } = render(<HomePage />);
    const anchor = container.querySelector('[data-testid="bee-mascot-anchor"]') as HTMLElement;
    const follow = container.querySelector('[data-testid="bee-mascot-follow"]') as HTMLElement;

    anchor.getBoundingClientRect = () => ({
      left: 800,
      top: 100,
      right: 1100,
      bottom: 400,
      width: 300,
      height: 300,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    // Move mouse over bee
    fireEvent.mouseMove(anchor, { clientX: 970, clientY: 270 });
    expect(follow).toHaveAttribute('data-near', 'true');

    // Mouse leaves the document
    fireEvent(document, new Event('mouseleave'));
    expect(follow).toHaveAttribute('data-near', 'false');
    expect(follow).toHaveAttribute('data-displacement-x', '0.00');
    expect(follow).toHaveAttribute('data-displacement-y', '0.00');
  });

  it('resets displacement to 0 when window loses focus (blur)', () => {
    const { container } = render(<HomePage />);
    const anchor = container.querySelector('[data-testid="bee-mascot-anchor"]') as HTMLElement;
    const follow = container.querySelector('[data-testid="bee-mascot-follow"]') as HTMLElement;

    anchor.getBoundingClientRect = () => ({
      left: 800,
      top: 100,
      right: 1100,
      bottom: 400,
      width: 300,
      height: 300,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    // Move mouse over bee
    fireEvent.mouseMove(window, { clientX: 970, clientY: 270 });
    expect(follow).toHaveAttribute('data-near', 'true');

    // Window blur event fires
    fireEvent(window, new Event('blur'));
    expect(follow).toHaveAttribute('data-near', 'false');
    expect(follow).toHaveAttribute('data-displacement-x', '0.00');
    expect(follow).toHaveAttribute('data-displacement-y', '0.00');
  });

  it('correctly clamps negative displacement vectors without producing negative zeros (-0.00)', () => {
    const { container } = render(<HomePage />);
    const anchor = container.querySelector('[data-testid="bee-mascot-anchor"]') as HTMLElement;
    const follow = container.querySelector('[data-testid="bee-mascot-follow"]') as HTMLElement;

    anchor.getBoundingClientRect = () => ({
      left: 800,
      top: 100,
      right: 1100,
      bottom: 400,
      width: 300,
      height: 300,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    // Move mouse top-left of bee center (950, 250): target at (850, 150) -> deltaX = -100, deltaY = -100
    fireEvent.mouseMove(window, { clientX: 850, clientY: 150 });
    expect(follow).toHaveAttribute('data-near', 'true');

    const dispX = parseFloat(follow.getAttribute('data-displacement-x') || '0');
    const dispY = parseFloat(follow.getAttribute('data-displacement-y') || '0');
    expect(dispX).toBeLessThan(0);
    expect(dispY).toBeLessThan(0);
    expect(follow.getAttribute('data-displacement-x')).not.toContain('-0.00');
    expect(follow.getAttribute('data-displacement-y')).not.toContain('-0.00');

    const totalDisp = Math.hypot(dispX, dispY);
    expect(totalDisp).toBeCloseTo(MAX_BEE_DISPLACEMENT_PX, 1);
  });

  it('respects prefers-reduced-motion by ignoring mouse tracking', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { container } = render(<HomePage />);
    const anchor = container.querySelector('[data-testid="bee-mascot-anchor"]') as HTMLElement;
    const follow = container.querySelector('[data-testid="bee-mascot-follow"]') as HTMLElement;

    anchor.getBoundingClientRect = () => ({
      left: 800,
      top: 100,
      right: 1100,
      bottom: 400,
      width: 300,
      height: 300,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    // Move mouse near bee
    fireEvent.mouseMove(window, { clientX: 980, clientY: 290 });
    expect(follow).toHaveAttribute('data-near', 'false');
    expect(follow).toHaveAttribute('data-displacement-x', '0.00');
    expect(follow).toHaveAttribute('data-displacement-y', '0.00');

    window.matchMedia = originalMatchMedia;
  });


  it('swaps origin and destination when swap button is pressed', () => {
    render(<HomePage />);
    const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/e\.g\. Brașov/i) as HTMLInputElement;

    expect(originInput.value).toBe('Galați');
    expect(destInput.value).toBe('București Nord');

    const swapBtn = screen.getByTitle(/Swap Origin and Destination/i);
    fireEvent.click(swapBtn);

    expect(originInput.value).toBe('București Nord');
    expect(destInput.value).toBe('Galați');
  });

  it('populates fields when a popular Romanian corridor is clicked', () => {
    render(<HomePage />);
    const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/e\.g\. Brașov/i) as HTMLInputElement;

    const brasovBtn = screen.getByRole('button', { name: /București ⇄ Brașov/i });
    fireEvent.click(brasovBtn);

    expect(originInput.value).toBe('București Nord');
    expect(destInput.value).toBe('Brașov');
  });

  it('validates empty inputs and identical origin/destination', () => {
    render(<HomePage />);
    const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i);
    const searchBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });

    // Empty origin
    fireEvent.change(originInput, { target: { value: '' } });
    fireEvent.click(searchBtn);
    expect(screen.getByText(/Please provide a departure origin station or city/i)).toBeInTheDocument();

    // Identical origin and destination
    fireEvent.change(originInput, { target: { value: 'Brașov' } });
    const destInput = screen.getByPlaceholderText(/e\.g\. Brașov/i);
    fireEvent.change(destInput, { target: { value: 'Brașov' } });
    fireEvent.click(searchBtn);
    expect(screen.getByText(/Origin and destination cannot be identical/i)).toBeInTheDocument();
  });

  it('navigates to /trips when booking button is pressed', () => {
    render(<HomePage />);
    
    // Search first
    fireEvent.click(screen.getByRole('button', { name: /Find Synchronized Routes/i }));

    const bookBtn = screen.getByRole('button', { name: /Book SAFE Route in Trip Planner/i });
    fireEvent.click(bookBtn);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/trips?origin=Gala%C8%9Bi&destination=Bucure%C8%99ti+Nord&pillar=MOST_RELIABLE')
    );
  });

  it('ensures foreground interactive elements remain fully accessible and responsive', () => {
    render(<HomePage />);
    
    // Inputs are typeable and accessible
    const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i);
    fireEvent.change(originInput, { target: { value: 'Iași' } });
    expect(originInput).toHaveValue('Iași');

    // Swap button is clickable
    const swapBtn = screen.getByTitle(/Swap Origin and Destination/i);
    expect(swapBtn).not.toBeDisabled();
    fireEvent.click(swapBtn);
    expect(originInput).toHaveValue('București Nord');

    // Corridor buttons are clickable
    const corridorBtn = screen.getByRole('button', { name: /Cluj ⇄ Timișoara/i });
    fireEvent.click(corridorBtn);
    expect(originInput).toHaveValue('Cluj-Napoca');

    // Search button submits cleanly
    const searchBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(searchBtn);
    expect(screen.getByText(/Synchronized Corridors Found/i)).toBeInTheDocument();
  });
});
