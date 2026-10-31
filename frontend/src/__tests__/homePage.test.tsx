import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../app/page';

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

  it('starts with default explorer mascot gear and initial search inputs', () => {
    render(<HomePage />);
    
    // Mascot is in default explorer gear
    expect(screen.getAllByText(/EXPLORER/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Aviator Goggles & Explorer Knot/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready to buzz across Romania!/i)).toBeInTheDocument();

    // Inputs are present
    expect(screen.getByPlaceholderText(/e\.g\. Galați/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Brașov/i)).toBeInTheDocument();
  });

  it('searches corridors and dynamically changes mascot gear to route gears', () => {
    render(<HomePage />);
    
    const searchBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(searchBtn);

    // After search, route trifecta cards appear
    expect(screen.getByText(/Synchronized Corridors Found/i)).toBeInTheDocument();
    expect(screen.getAllByText(/SAFE ROUTE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FAST ROUTE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ECONOMY/i).length).toBeGreaterThan(0);

    // Defaults to SAFE route gear upon search
    expect(screen.getByText(/Romanian Transfer Shield/i)).toBeInTheDocument();
    expect(screen.getByText(/Transfer Shield active: 100% connection guarantee!/i)).toBeInTheDocument();

    // Click Fast Route
    const fastCard = screen.getAllByText(/FAST ROUTE/i)[0].closest('div');
    if (fastCard) fireEvent.click(fastCard);
    expect(screen.getByText(/Supersonic Speed Visor & Scarf/i)).toBeInTheDocument();
    expect(screen.getByText(/Supersonic mode! Zero stopovers, maximum speed\./i)).toBeInTheDocument();

    // Click Economy Route
    const economyCard = screen.getAllByText(/ECONOMY/i)[0].closest('div');
    if (economyCard) fireEvent.click(economyCard);
    expect(screen.getByText(/Nectar Jar & Bargain Specs/i)).toBeInTheDocument();
    expect(screen.getByText(/Sweetest fare found! Pocket the leftover nectar\./i)).toBeInTheDocument();

    // Click Modify to reset back to default
    const modifyBtn = screen.getByRole('button', { name: /Modify/i });
    fireEvent.click(modifyBtn);

    // Returned to default explorer mascot gear
    expect(screen.getByText(/Aviator Goggles & Explorer Knot/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Synchronized Routes/i })).toBeInTheDocument();
  });

  it('does not allow gear selection in regular UI but allows manual override in Debug Tools popup', () => {
    render(<HomePage />);
    
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
    expect(screen.getAllByText(/Supersonic Speed Visor & Scarf/i).length).toBeGreaterThan(0);

    // Toggle to Safe gear manually
    const safeChip = screen.getByRole('button', { name: /🛡️ Safe/i });
    fireEvent.click(safeChip);
    expect(screen.getAllByText(/Romanian Transfer Shield/i).length).toBeGreaterThan(0);

    // Toggle to Economy gear manually
    const economyChip = screen.getByRole('button', { name: /🍯 Economy/i });
    fireEvent.click(economyChip);
    expect(screen.getAllByText(/Nectar Jar & Bargain Specs/i).length).toBeGreaterThan(0);

    // Toggle back to Default gear
    const defaultChip = screen.getByRole('button', { name: /🧭 Default/i });
    fireEvent.click(defaultChip);
    expect(screen.getAllByText(/Aviator Goggles & Explorer Knot/i).length).toBeGreaterThan(0);

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
});
