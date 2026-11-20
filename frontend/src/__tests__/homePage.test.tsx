import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage, { MAX_BEE_DISPLACEMENT_PX } from '../app/page';
import HomePageGhostSkeleton from '../components/HomePageGhostSkeleton';

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

  it('renders the clean Beeline title and disruptive message without clutter labels', () => {
    render(<HomePage />);
    
    // Check prominent h1 app title
    expect(screen.getByRole('heading', { level: 1, name: /^Beeline$/i })).toBeInTheDocument();
    
    // Ensure clutter labels have been removed from the hero
    expect(screen.queryByText(/Transit Planner/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Romanian Transit Solved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Zero Missed Connections/i)).not.toBeInTheDocument();
    
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

  it('allows selecting route preference and dynamically changes mascot gear to route gears', () => {
    const { container } = render(<HomePage />);
    const bgContainer = container.querySelector('[data-testid="background-flying-mascot"]');
    
    // Initial gear is default
    expect(bgContainer).toHaveAttribute('data-gear', 'default');

    // Click Protected preference
    const prefProtected = screen.getByTestId('pref-protected');
    fireEvent.click(prefProtected);
    expect(bgContainer).toHaveAttribute('data-gear', 'safe');
    expect(bgContainer?.querySelector('[data-gear-status="entering"]')).toBeInTheDocument();
    expect(bgContainer?.querySelector('[data-testid="mascot-gear-shine"]')).toBeInTheDocument();

    // Click Fast preference triggers dynamic gear change
    const prefFast = screen.getByTestId('pref-fast');
    fireEvent.click(prefFast);
    expect(bgContainer).toHaveAttribute('data-gear', 'fast');
    expect(bgContainer?.querySelector('[data-gear-status="exiting"]')).toHaveClass('animate-gear-radial-exit');
    expect(bgContainer?.querySelector('[data-gear-status="entering"]')).toHaveClass('animate-gear-enter-top');
    expect(bgContainer?.querySelector('[data-testid="mascot-gear-shine"]')).toBeInTheDocument();

    // Click Eco preference
    const prefEco = screen.getByTestId('pref-eco');
    fireEvent.click(prefEco);
    expect(bgContainer).toHaveAttribute('data-gear', 'economy');

    // Card never mutates into "SYNCHRONIZED CORRIDORS FOUND" or "Modify"
    expect(screen.queryByText(/SYNCHRONIZED CORRIDORS FOUND/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Modify$/i })).not.toBeInTheDocument();
  });

  it('increments/decrements travel date via compact − / + stepper arrows within bounds and excludes unwanted copy', () => {
    render(<HomePage />);

    const prevBtn = screen.getByTestId('date-step-prev');
    const nextBtn = screen.getByTestId('date-step-next');
    const dateInput = screen.getByTestId('travel-date-picker') as HTMLInputElement;

    const initialDate = dateInput.value;
    expect(initialDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // prev button is disabled on today's date
    expect(prevBtn).toBeDisabled();

    // Click next day (+)
    fireEvent.click(nextBtn);
    expect(dateInput.value).not.toBe(initialDate);
    expect(prevBtn).not.toBeDisabled();

    // Click prev day (−)
    fireEvent.click(prevBtn);
    expect(dateInput.value).toBe(initialDate);
    expect(prevBtn).toBeDisabled();

    // Unwanted strings must NOT exist in the DOM
    expect(screen.queryByText(/This Weekend/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1 Month/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CFR SA \/ IRIS Verified/i)).not.toBeInTheDocument();
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

  it('toggles glassmorphic ghost layout via Debug Tools modal and restores hero form upon stopping', () => {
    const { container } = render(<HomePage />);

    // Open Debug Tools
    const debugTrigger = screen.getByRole('button', { name: /Open Debug Tools/i });
    fireEvent.click(debugTrigger);

    // Check modal opened with Test Loading State button
    const testLoadingBtn = screen.getByTestId('debug-toggle-loading-state');
    expect(testLoadingBtn).toHaveTextContent(/Test Loading State/i);

    // Click "Test Loading State"
    fireEvent.click(testLoadingBtn);

    // Ghost layout is rendered
    expect(screen.getByTestId('homepage-ghost-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('ghost-hero-search-card')).toBeInTheDocument();
    const queenGhostCards = screen.getAllByTestId('ghost-queen-card');
    expect(queenGhostCards.length).toBe(3);
    expect(container.querySelectorAll('.glass-shimmer-overlay').length).toBeGreaterThanOrEqual(4);

    // Main hero form is hidden while loading
    expect(screen.queryByPlaceholderText(/e\.g\. Galați/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /^Beeline$/i })).not.toBeInTheDocument();

    // Open Debug Tools again and stop loading state
    const debugTrigger2 = screen.getByRole('button', { name: /Open Debug Tools/i });
    fireEvent.click(debugTrigger2);

    const stopLoadingBtn = screen.getByTestId('debug-toggle-loading-state');
    expect(stopLoadingBtn).toHaveTextContent(/Stop Loading State/i);
    fireEvent.click(stopLoadingBtn);

    // Ghost skeleton is removed and main hero is restored
    expect(screen.queryByTestId('homepage-ghost-skeleton')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Galați/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /^Beeline$/i })).toBeInTheDocument();
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

  it('navigates directly to /trips when Find Synchronized Routes is clicked', () => {
    render(<HomePage />);
    
    // Select Fast preference
    fireEvent.click(screen.getByTestId('pref-fast'));

    // Submit corridor search
    const searchBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(searchBtn);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/trips?origin=Gala%C8%9Bi&destination=Bucure%C8%99ti+Nord&date=')
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('pillar=FASTEST')
    );
    expect(screen.queryByText(/SYNCHRONIZED CORRIDORS FOUND/i)).not.toBeInTheDocument();
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
    expect(mockPush).toHaveBeenCalled();
  });

  it('renders all rail & urban transit providers in the scrollytelling honeycomb (Test 17)', () => {
    const { container } = render(<HomePage />);

    // Chapter 2 heading exists
    expect(
      screen.getByRole('heading', { level: 2, name: /Romanian Rail Network/i })
    ).toBeInTheDocument();

    // Core DOM test ID and section id are preserved
    expect(container.querySelector('#tour-providers')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="svg-honeycomb"]')).toBeInTheDocument();

    // Clean stat line totals
    expect(screen.getByText(/2,103 trains\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/709 routes/i)).toBeInTheDocument();

    // All 7 Romanian railway operators are rendered in the honeycomb and ledger
    expect(screen.getAllByText('CFR Călători').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transferoviar Călători').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Regio Călători').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interregional Călători').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Astra Trans Carpatic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ferotrafic TFI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Softrans').length).toBeGreaterThan(0);

    // Confirm exact verified train numbers in the DOM
    expect(screen.getAllByText(/1,256 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/303 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/273 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/216 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/21 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/18 \/ day/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/16 \/ day/i).length).toBeGreaterThan(0);

    // Default active operator is CFR Călători
    expect(screen.getByText(/479 routes/i)).toBeInTheDocument();

    // Bidirectional sync: clicking Transferoviar Călători hexagon activates it
    const tfcHex = container.querySelector('[data-testid="svg-honeycomb"] [aria-label="Transferoviar Călători"]');
    expect(tfcHex).toBeInTheDocument();
    if (tfcHex) {
      fireEvent.click(tfcHex);
      expect(tfcHex).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/62 routes/i)).toBeInTheDocument();
    }

    // Bidirectional sync: clicking Softrans row in ledger activates it
    const softransButtons = screen.getAllByRole('button', { name: /Softrans/i });
    const softransLedger = softransButtons[softransButtons.length - 1];
    fireEvent.click(softransLedger);
    expect(softransLedger).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/6 routes/i)).toBeInTheDocument();

    // Strict Invariant 1: Strictly zero map canvases, Leaflet, or <map> elements
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);

    // Strict Invariant 2: Strictly zero scientific file names or data-science jargon in visible DOM text
    expect(screen.queryByText(/\.parquet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.xml/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Out-of-Fold/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Corpus/i)).not.toBeInTheDocument();

    // Strict Invariant 3: Strictly zero urban public transit
    expect(screen.queryByText(/Metrorex/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bSTB\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transurb/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CTP Cluj/i)).not.toBeInTheDocument();
  });

  it('renders the 3 Queen Bee cards, archetype-matched Mini Worker Bees, and rich SVG props (Test 18)', () => {
    const { container } = render(<HomePage />);

    // Chapter 1 heading
    expect(screen.getByRole('heading', { level: 3, name: /The Three Queen Bees & Their Hive Swarms/i })).toBeInTheDocument();

    // The 3 Queen Bee Cards exist
    const safeQueenCard = container.querySelector('[data-testid="queen-card-safe"]');
    const fastQueenCard = container.querySelector('[data-testid="queen-card-fast"]');
    const economyQueenCard = container.querySelector('[data-testid="queen-card-economy"]');

    expect(safeQueenCard).toBeInTheDocument();
    expect(fastQueenCard).toBeInTheDocument();
    expect(economyQueenCard).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

    // Archetype-matched minimalist Mini Worker Bees exist
    const fastMiniBees = container.querySelectorAll('[data-mini-bee-variant="fast"]');
    const safeMiniBees = container.querySelectorAll('[data-mini-bee-variant="safe"]');
    const economyMiniBees = container.querySelectorAll('[data-mini-bee-variant="economy"]');

    expect(fastMiniBees.length).toBeGreaterThan(0);
    expect(safeMiniBees.length).toBeGreaterThan(0);
    expect(economyMiniBees.length).toBeGreaterThan(0);

    // Rich physical SVG props in Chapter 2
    expect(container.querySelector('[data-testid="svg-honeycomb"]')).toBeInTheDocument();

    // Explicit negative assertions verifying Chapter 3 props and section are completely removed
    expect(container.querySelector('#tour-ecosystem')).toBeNull();
    expect(screen.queryByText(/Inside The Cozy Hive/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-beehive')).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-honey-pot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-honey-spoon')).not.toBeInTheDocument();

    // Hovering/clicking Queen card triggers selection
    if (fastQueenCard) {
      fireEvent.click(fastQueenCard);
      expect(fastQueenCard).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('supports Jump Back CTA and enforces strict invariants (Test 19)', () => {
    // Mock window.scrollTo
    const originalScrollTo = window.scrollTo;
    window.scrollTo = jest.fn();

    const { container } = render(<HomePage />);

    // Strict Invariant 1: Strictly contains ZERO map or canvas elements across the whole page
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);

    // Scroll companion guide is completely removed
    expect(container.querySelector('[data-testid="scroll-companion-guide"]')).toBeNull();

    // Simulate window scroll into queens chapter
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true });
    fireEvent.scroll(window);

    // Simulate window scroll into providers chapter
    Object.defineProperty(window, 'scrollY', { value: 1200, writable: true, configurable: true });
    fireEvent.scroll(window);

    // Click "Plan Your Route Now" CTA button and verify focus on origin input
    const ctaBtn = screen.getByRole('button', { name: /Plan Your Route Now/i });
    expect(ctaBtn).toBeInTheDocument();
    fireEvent.click(ctaBtn);

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 })
    );

    window.scrollTo = originalScrollTo;
  });

  it('asserts named mascots, complete Chapter 3 removal, and zero map/canvas elements (Test 20)', () => {
    // Mock window.scrollTo
    const originalScrollTo = window.scrollTo;
    window.scrollTo = jest.fn();

    const { container } = render(<HomePage />);

    // Scroll into providers chapter
    Object.defineProperty(window, 'scrollY', { value: 1200, writable: true, configurable: true });
    fireEvent.scroll(window);

    // Assert that Queen Meli, Queen Vira, and Queen Flora are rendered in the DOM
    expect(screen.getAllByText(/Queen Meli/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Queen Vira/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Queen Flora/i).length).toBeGreaterThan(0);

    // Verify Chapter 3 (#tour-ecosystem) is completely removed
    expect(container.querySelector('#tour-ecosystem')).toBeNull();
    expect(screen.queryByText(/Inside The Cozy Hive/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-beehive')).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-honey-pot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-honey-spoon')).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.52M/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.5ms/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/99\.5%/i)).not.toBeInTheDocument();

    // Strict Invariant 1: Strictly zero map or canvas elements anywhere in container
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);

    window.scrollTo = originalScrollTo;
  });

  it('renders Chapter 1 unified production architecture: Design 4 Top Sanctuaries + Design 6 Beehive Route Preview Map with Open Portal triggers (Test 21)', () => {
    // Mock scrollIntoView for jsdom
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    const mockScrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

    const { container } = render(<HomePage />);

    // 1. Verify Top Chapter 1 Royal Hex-Sanctuaries and "Open Portal" buttons
    const safePortalBtn = screen.getByTestId('open-portal-safe');
    const fastPortalBtn = screen.getByTestId('open-portal-fast');
    const economyPortalBtn = screen.getByTestId('open-portal-economy');

    expect(safePortalBtn).toBeInTheDocument();
    expect(fastPortalBtn).toBeInTheDocument();
    expect(economyPortalBtn).toBeInTheDocument();

    // 2. Verify Interactive Route Preview Map (#queen-route-preview)
    const previewMap = container.querySelector('#queen-route-preview');
    expect(previewMap).toBeInTheDocument();
    expect(screen.getByTestId('queen-route-preview')).toBeInTheDocument();

    // 3. Verify exactly 7 Beehive Stations (data-testid="preview-beehive-station")
    const stations = container.querySelectorAll('[data-testid="preview-beehive-station"]');
    expect(stations.length).toBe(7);

    // Verify all 7 generic beehive station names are rendered
    expect(screen.getAllByText(/Point A • Origin Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Meadow Vale Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sunny Creek Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Central Junction Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amber Ridge Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Orchard Valley Hive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Point B • Destination Hive/i).length).toBeGreaterThan(0);

    // 4. Verify Express Bee Locomotive replaces train locomotive (Strict Invariant)
    const beeLocomotive = container.querySelector('[data-testid="route-preview-bee-locomotive"]');
    expect(beeLocomotive).toBeInTheDocument();
    // Default safe gear matches Meli's signature color
    expect(beeLocomotive).toHaveAttribute('data-bee-color', 'safe');

    // 5. Assert Consumer Story 1: Reliability (Safe - Queen Meli)
    // Story: Always arrive on time, built-in cushion/margin of error accounts for extra time in case another train is delayed
    expect(screen.getAllByText(/Always Arrive On Time\. Built-In Cushion for Any Delay\./i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+20 min Built-In Delay Buffer/i).length).toBeGreaterThan(0);

    // Click delay stress test button (+15 min unexpected delay on leg 1)
    const delayBtn = screen.getByTestId('safe-delay-btn');
    fireEvent.click(delayBtn);
    expect(screen.getAllByText(/15 minutes of unexpected delay absorbed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100% On Time/i).length).toBeGreaterThan(0);

    // 6. Assert Consumer Story 2: Fast (Queen Vira) via Open Portal button
    fireEvent.click(fastPortalBtn);
    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(beeLocomotive).toHaveAttribute('data-bee-color', 'fast');

    // Story: There is simply no faster route from A to B, maximum speed, zero wasted stops
    expect(screen.getAllByText(/There Is Simply No Faster Route From A to B\./i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/-55 minutes saved/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Skipped • 0 Wasted Stops/i).length).toBeGreaterThan(0);

    // 7. Assert Consumer Story 3: Economy (Queen Flora) via Open Portal button
    fireEvent.click(economyPortalBtn);
    expect(beeLocomotive).toHaveAttribute('data-bee-color', 'economy');

    // Story: Calm, unrushed journey with longer stops when you have no deadline, keep most money in your pocket
    expect(
      screen.getAllByText(/Calm, Unrushed Journey with Longer Stops When You Have No Deadline\./i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Save up to 40%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+12m Relaxed Stop/i).length).toBeGreaterThan(0);

    // Verify calm unhurried stops and pocket savings promise
    expect(screen.getAllByText(/stretch your legs, zero rush/i).length).toBeGreaterThan(0);

    // 8. Strict Invariant 1: Strictly zero map or canvas elements anywhere in DOM
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);

    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('renders HomePageGhostSkeleton directly with accessibility semantics and zero map/canvas elements', () => {
    const { container } = render(<HomePageGhostSkeleton />);

    const skeleton = screen.getByTestId('homepage-ghost-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-live', 'polite');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading Beeline home page');

    expect(screen.getByTestId('ghost-hero-search-card')).toBeInTheDocument();
    expect(screen.getAllByTestId('ghost-queen-card').length).toBe(3);
    expect(container.querySelectorAll('.glass-shimmer-overlay').length).toBeGreaterThanOrEqual(4);

    // Strict Invariants: strictly 0 canvas, 0 leaflet-container, 0 map elements
    expect(container.querySelectorAll('canvas').length).toBe(0);
    expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
    expect(container.querySelectorAll('map').length).toBe(0);
  });
});
