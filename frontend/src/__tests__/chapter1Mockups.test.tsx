import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import QueenBeesSection from '../components/hive-tour/QueenBeesSection';
import Variant1Amphitheater from '../components/hive-tour/chapter1-mockups/Variant1Amphitheater';
import Variant2SpatialPopOut from '../components/hive-tour/chapter1-mockups/Variant2SpatialPopOut';
import Variant3HorizontalAccordion from '../components/hive-tour/chapter1-mockups/Variant3HorizontalAccordion';
import Variant4LivingRailTrack from '../components/hive-tour/chapter1-mockups/Variant4LivingRailTrack';
import Variant5BentoTrainRadar from '../components/hive-tour/chapter1-mockups/Variant5BentoTrainRadar';
import Variant6MagneticHoneyPortal from '../components/hive-tour/chapter1-mockups/Variant6MagneticHoneyPortal';

describe('Chapter 1 Design Lab & Variant Architectures', () => {
  it('renders Chapter 1 unified production architecture: Queen Sanctuaries and Unified Beehive Route Preview Map', () => {
    const handleSelectQueen = jest.fn();
    const { container } = render(
      <QueenBeesSection activeGear="safe" onSelectQueen={handleSelectQueen} />
    );

    // Assert top Chapter 1 heading exists
    expect(screen.getByRole('heading', { level: 3, name: /The Three Queen Bees & Their Hive Swarms/i })).toBeInTheDocument();

    // Assert the 3 Queen sanctuary cards exist
    expect(screen.getByTestId('queen-card-safe')).toBeInTheDocument();
    expect(screen.getByTestId('queen-card-fast')).toBeInTheDocument();
    expect(screen.getByTestId('queen-card-economy')).toBeInTheDocument();

    // Assert Open Portal action buttons exist
    const safePortalBtn = screen.getByTestId('open-portal-safe');
    const fastPortalBtn = screen.getByTestId('open-portal-fast');
    const economyPortalBtn = screen.getByTestId('open-portal-economy');

    expect(safePortalBtn).toBeInTheDocument();
    expect(fastPortalBtn).toBeInTheDocument();
    expect(economyPortalBtn).toBeInTheDocument();

    // Assert Interactive Route Preview Map (#queen-route-preview)
    expect(screen.getByTestId('queen-route-preview')).toBeInTheDocument();

    // Assert the 7 generic Beehive stations
    const stations = container.querySelectorAll('[data-testid="preview-beehive-station"]');
    expect(stations.length).toBe(7);

    // Assert Queen-colored Bee Locomotive replaces train locomotive
    const beeLoco = container.querySelector('[data-testid="route-preview-bee-locomotive"]');
    expect(beeLoco).toBeInTheDocument();
    expect(beeLoco).toHaveAttribute('data-bee-color', 'safe');

    // Clicking Fast portal triggers onSelectQueen('fast')
    fireEvent.click(fastPortalBtn);
    expect(handleSelectQueen).toHaveBeenCalledWith('fast');

    // Strictly zero map or canvas elements
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
  });

  it('renders Variant 1 Royal Amphitheater with free-floating 2xl Queen, Royal Crown, and 6 orbiting mini bees', () => {
    const handleSelectQueen = jest.fn();
    const handleSelectGear = jest.fn();
    const { container } = render(
      <Variant1Amphitheater
        activeGear="safe"
        onSelectQueen={handleSelectQueen}
        onSelectGear={handleSelectGear}
      />
    );

    // Free-floating 2xl scale Queen Bee Mascot directly over background (no enclosing white box)
    const mascotImg = screen.getByRole('img', { name: /Queen Meli/i });
    expect(mascotImg).toBeInTheDocument();
    expect(mascotImg).toHaveAttribute('data-gear', 'safe');

    // Floating Royal Crown SVG is present
    const crowns = container.querySelectorAll('svg');
    expect(crowns.length).toBeGreaterThan(0);

    // 6 Orbiting MiniWorkerBees with data-mini-bee-variant
    const safeMiniBees = container.querySelectorAll('[data-mini-bee-variant="safe"]');
    expect(safeMiniBees.length).toBeGreaterThanOrEqual(6);

    // Dock cards preserve named queens and headings level 4
    const safeDockCard = screen.getByTestId('queen-card-safe');
    const fastDockCard = screen.getByTestId('queen-card-fast');
    const economyDockCard = screen.getByTestId('queen-card-economy');

    expect(safeDockCard).toBeInTheDocument();
    expect(fastDockCard).toBeInTheDocument();
    expect(economyDockCard).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

    expect(screen.getAllByText(/Queen Meli/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Queen Vira/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Queen Flora/i).length).toBeGreaterThan(0);

    // Clicking dock card calls both callbacks
    fireEvent.click(fastDockCard);
    expect(handleSelectQueen).toHaveBeenCalledWith('fast');
    expect(handleSelectGear).toHaveBeenCalledWith('fast');
    expect(fastDockCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders Queen Meli Live Junction Delay Simulator with dynamic buffer and SVG emerald shield', () => {
    const { container } = render(<Variant1Amphitheater activeGear="safe" />);

    // Check Simulator Header
    expect(screen.getByText(/Live Junction Delay Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Ploiești Sud \/ Făurei Junction/i)).toBeInTheDocument();
    expect(screen.getByText(/Train 1 \(IR 1572\) ➔ Train 2 \(RE 7570\)/i)).toBeInTheDocument();

    // ML v41 99.5% Transfer AUC badge
    expect(screen.getAllByText(/99\.5% Transfer AUC/i).length).toBeGreaterThan(0);

    // Interactive Delay Slider
    const delaySlider = screen.getByLabelText(/Incoming Delay for Train IR 1572/i);
    expect(delaySlider).toBeInTheDocument();
    expect(delaySlider).toHaveValue('8');

    // Remaining buffer starts at 18 - 8 = 10 min
    expect(screen.getByText(/10 min remaining/i)).toBeInTheDocument();

    // Change slider delay to +20 min (exceeds scheduled 18m buffer)
    fireEvent.change(delaySlider, { target: { value: '20' } });
    expect(delaySlider).toHaveValue('20');
    expect(screen.getByText(/0 min remaining/i)).toBeInTheDocument();
    expect(screen.getByText(/Algorithmic Hold Signal Dispatched/i)).toBeInTheDocument();

    // Quick preset buttons work
    const preset0m = screen.getByRole('button', { name: /\+0m/i });
    fireEvent.click(preset0m);
    expect(delaySlider).toHaveValue('0');
    expect(screen.getByText(/18 min remaining/i)).toBeInTheDocument();

    // SVG elements for Train 1 and Train 2
    expect(container.querySelector('svg text[fill="#38BDF8"]')).toBeInTheDocument();
  });

  it('renders Queen Vira Magistrala 300 Speed Comparator with -60 min saved and animated dual-track race', () => {
    render(<Variant1Amphitheater activeGear="fast" />);

    // Header & Corridor
    expect(screen.getByText(/Interactive Magistrala 300 Speed Comparator/i)).toBeInTheDocument();
    expect(screen.getByText(/Magistrala 300 \(București Nord ⇄ Brașov\)/i)).toBeInTheDocument();

    // -60 min saved counter
    expect(screen.getAllByText(/-60 min saved/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1h 45m direct express vs 2h 45m stopping regional/i)).toBeInTheDocument();

    // Mode buttons
    const directBtn = screen.getByRole('button', { name: /Direct InterCity \/ Hyperion/i });
    const stoppingBtn = screen.getByRole('button', { name: /Stopping Regio/i });
    expect(directBtn).toBeInTheDocument();
    expect(stoppingBtn).toBeInTheDocument();

    fireEvent.click(stoppingBtn);
    expect(stoppingBtn).toHaveClass('bg-blue-600');

    // Race simulation button
    const raceBtn = screen.getByRole('button', { name: /Simulate Race/i });
    expect(raceBtn).toBeInTheDocument();
    fireEvent.click(raceBtn);
  });

  it('renders Queen Flora Multi-Operator Fare Harvester with corridor selector and golden honey savings badge', () => {
    render(<Variant1Amphitheater activeGear="economy" />);

    // Header & Corridor Pills
    expect(screen.getByText(/Multi-Operator Fare Harvester/i)).toBeInTheDocument();
    const galatiPill = screen.getByRole('button', { name: /Galați ⇄ București Nord/i });
    const brasovPill = screen.getByRole('button', { name: /București ⇄ Brașov/i });
    const clujPill = screen.getByRole('button', { name: /Cluj ⇄ Timișoara/i });

    expect(galatiPill).toBeInTheDocument();
    expect(brasovPill).toBeInTheDocument();
    expect(clujPill).toBeInTheDocument();

    // Default Galați ⇄ București Nord prices
    expect(screen.getByText(/CFR Călători/i)).toBeInTheDocument();
    expect(screen.getByText(/63\.00 LEI/i)).toBeInTheDocument();
    expect(screen.getByText(/Softrans/i)).toBeInTheDocument();
    expect(screen.getByText(/35\.00 LEI/i)).toBeInTheDocument();
    expect(screen.getByText(/TFC/i)).toBeInTheDocument();
    expect(screen.getByText(/28\.50 LEI/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Regio Călători/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/24\.50 LEI/i).length).toBeGreaterThan(0);

    // Golden Honey Savings Badge
    expect(screen.getAllByText(/Golden Honey Savings Badge/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/38\.50 LEI \(61%\)/i)).toBeInTheDocument();

    // Click București ⇄ Brașov pill
    fireEvent.click(brasovPill);
    expect(screen.getAllByText(/Golden Honey Savings Badge/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/36\.00 LEI \(62%\)/i)).toBeInTheDocument();
  });

  /* ========================================================================= */
  /* VARIANT 2: 3D SPATIAL POP-OUT ARCHITECTURE TESTS                          */
  /* ========================================================================= */
  describe('Variant 2 Spatial Pop-Out Architecture', () => {
    it('renders 3 low-profile warm-wax glassmorphic cards with out-of-bounds mascot chambers', () => {
      const handleSelectQueen = jest.fn();
      const { container } = render(
        <Variant2SpatialPopOut activeGear="safe" onSelectQueen={handleSelectQueen} />
      );

      // 3 cards exist with proper testids
      const safeCard = screen.getByTestId('queen-card-safe');
      const fastCard = screen.getByTestId('queen-card-fast');
      const economyCard = screen.getByTestId('queen-card-economy');

      expect(safeCard).toBeInTheDocument();
      expect(fastCard).toBeInTheDocument();
      expect(economyCard).toBeInTheDocument();

      // Cards have warm-wax glassmorphic styling
      expect(safeCard).toHaveClass('backdrop-blur-md', 'bg-amber-50/45', 'border-amber-300/60');
      expect(fastCard).toHaveClass('backdrop-blur-md', 'bg-amber-50/45', 'border-amber-300/60');
      expect(economyCard).toHaveClass('backdrop-blur-md', 'bg-amber-50/45', 'border-amber-300/60');

      // Mascot chamber has -mt-20 out-of-bounds pop-out
      const popOutChambers = container.querySelectorAll('.-mt-20');
      expect(popOutChambers.length).toBe(3);

      // Headings level 4
      expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

      // Hero metric badges
      expect(screen.getAllByText(/96\/100 Buffer/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 Stopovers/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/-40% LEI/i).length).toBeGreaterThan(0);

      // 5 Mini Worker Bees per card (15 total)
      const safeBees = container.querySelectorAll('[data-mini-bee-variant="safe"]');
      const fastBees = container.querySelectorAll('[data-mini-bee-variant="fast"]');
      const economyBees = container.querySelectorAll('[data-mini-bee-variant="economy"]');

      expect(safeBees.length).toBe(5);
      expect(fastBees.length).toBe(5);
      expect(economyBees.length).toBe(5);
    });

    it('interactively toggles expandable telemetry drawers and responds to selection', () => {
      const handleSelectQueen = jest.fn();
      render(
        <Variant2SpatialPopOut activeGear="safe" onSelectQueen={handleSelectQueen} />
      );

      const fastCard = screen.getByTestId('queen-card-fast');

      // Click Fast Card selects Queen Vira
      fireEvent.click(fastCard);
      expect(handleSelectQueen).toHaveBeenCalledWith('fast');
      expect(fastCard).toHaveAttribute('aria-pressed', 'true');

      // Drawer for Vira shows Magistrala 300 Speed Bar
      expect(screen.getByText(/Magistrala 300 Speed Bar/i)).toBeInTheDocument();
      expect(screen.getByText(/-65m Travel Time Saved/i)).toBeInTheDocument();

      // Toggle drawer closed and open
      const toggleButtons = screen.getAllByRole('button', { name: /Live Rail Telemetry/i });
      expect(toggleButtons.length).toBe(3);

      // Click drawer toggle for fast
      fireEvent.click(toggleButtons[1]);
    });

    it('handles station/train inspection widgets inside drawers', () => {
      render(<Variant2SpatialPopOut activeGear="safe" />);

      // Safe Card has Meli's Junction Delay Shield
      expect(screen.getByText(/Junction Delay Shield/i)).toBeInTheDocument();
      expect(screen.getByText(/Ploiești Sud/i)).toBeInTheDocument();
      expect(screen.getByText(/IR 1572 \(Linia 2\)/i)).toBeInTheDocument();

      // Switch junction to Brașov
      const brasovJunctionBtn = screen.getByRole('button', { name: /^Brașov$/i });
      fireEvent.click(brasovJunctionBtn);
      expect(screen.getByText(/IC 531 \(Linia 1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/\+24 min/i)).toBeInTheDocument();

      // Switch to Economy and inspect multi-operator tickets
      const economyCard = screen.getByTestId('queen-card-economy');
      fireEvent.click(economyCard);

      expect(screen.getByText(/Multi-Operator Fare Harvester/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Regio Călători/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/24\.50 LEI/i)).toBeInTheDocument();

      // Click Softrans
      const softransBtn = screen.getByRole('button', { name: /Softrans/i });
      fireEvent.click(softransBtn);
      expect(screen.getByText(/35\.00 LEI/i)).toBeInTheDocument();
      expect(screen.getByText(/Hyperion electric train/i)).toBeInTheDocument();
    });

    it('strictly contains ZERO map or canvas elements (Strict Invariant)', () => {
      const { container } = render(<Variant2SpatialPopOut activeGear="safe" />);
      expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
    });
  });

  /* ========================================================================= */
  /* VARIANT 4: LIVING RAIL TRACK & HEX-NODES ARCHITECTURE TESTS               */
  /* ========================================================================= */
  describe('Variant 4 Living Rail Track & Hex-Nodes Architecture', () => {
    it('renders the sweeping SVG Point-A-to-Point-B golden railway track with timber sleepers, switches, and signal lights', () => {
      const handleSelectQueen = jest.fn();
      const handleSelectGear = jest.fn();
      const { container } = render(
        <Variant4LivingRailTrack
          activeGear="safe"
          onSelectQueen={handleSelectQueen}
          onSelectGear={handleSelectGear}
        />
      );

      // Verify variant container exists
      expect(screen.getByTestId('variant-4-living-rail-track')).toBeInTheDocument();
      expect(screen.getByText(/Living Golden Rail • Point A to Point B Flow/i)).toBeInTheDocument();

      // Station beacons Point A and Point B
      expect(screen.getByText('POINT A')).toBeInTheDocument();
      expect(screen.getByText('Your Station')).toBeInTheDocument();
      expect(screen.getByText('POINT B')).toBeInTheDocument();
      expect(screen.getByText('Your Destination')).toBeInTheDocument();

      // Check SVG elements: Switches (macazuri), signals
      expect(screen.getByTestId('rail-switch-south')).toBeInTheDocument();
      expect(screen.getByTestId('rail-switch-central')).toBeInTheDocument();
      expect(screen.getByTestId('rail-signal-meli')).toBeInTheDocument();
      expect(screen.getByTestId('rail-signal-vira')).toBeInTheDocument();
      expect(screen.getByTestId('rail-signal-flora')).toBeInTheDocument();

      // Express train and moving assembly exists
      expect(container.querySelector('#moving-train-assembly')).toBeInTheDocument();
    });

    it('renders 3 monumental double-hexagon royal hive portals with 6 orbiting mini bees each and level 4 headings', () => {
      const { container } = render(<Variant4LivingRailTrack activeGear="safe" />);

      // The 3 Queen Hex-Node Portals exist
      const safePortal = screen.getByTestId('queen-card-safe');
      const fastPortal = screen.getByTestId('queen-card-fast');
      const economyPortal = screen.getByTestId('queen-card-economy');

      expect(safePortal).toBeInTheDocument();
      expect(fastPortal).toBeInTheDocument();
      expect(economyPortal).toBeInTheDocument();

      // Required Level 4 headings
      expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

      // Names and Romanian Titles
      expect(screen.getAllByText(/Queen Meli/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Queen Vira/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Queen Flora/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Queen Meli — Royal Transfer Shield/i)).toBeInTheDocument();
      expect(screen.getByText(/Queen Vira — Supersonic Express Scout/i)).toBeInTheDocument();
      expect(screen.getByText(/Queen Flora — Smart Fare Harvester/i)).toBeInTheDocument();

      // Hero Metric Badges
      expect(screen.getByText(/96\/100 Buffer/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Stopovers/i)).toBeInTheDocument();
      expect(screen.getByText(/-40% LEI/i)).toBeInTheDocument();

      // 6 MiniWorkerBees per Queen (18 total)
      const safeBees = container.querySelectorAll('[data-mini-bee-variant="safe"]');
      const fastBees = container.querySelectorAll('[data-mini-bee-variant="fast"]');
      const economyBees = container.querySelectorAll('[data-mini-bee-variant="economy"]');

      expect(safeBees.length).toBe(6);
      expect(fastBees.length).toBe(6);
      expect(economyBees.length).toBe(6);
    });

    it('interactively animates the railway switches (macazuri), shifts signal aspects, and invokes onSelectGear/onSelectQueen', () => {
      const handleSelectQueen = jest.fn();
      const handleSelectGear = jest.fn();
      render(
        <Variant4LivingRailTrack
          activeGear="safe"
          onSelectQueen={handleSelectQueen}
          onSelectGear={handleSelectGear}
        />
      );

      const fastPortal = screen.getByTestId('queen-card-fast');
      const economyPortal = screen.getByTestId('queen-card-economy');
      const safePortal = screen.getByTestId('queen-card-safe');

      // Starts with safe selected
      expect(safePortal).toHaveAttribute('aria-pressed', 'true');
      expect(fastPortal).toHaveAttribute('aria-pressed', 'false');

      // Click Queen Vira (Fast)
      fireEvent.click(fastPortal);
      expect(handleSelectQueen).toHaveBeenCalledWith('fast');
      expect(handleSelectGear).toHaveBeenCalledWith('fast');
      expect(fastPortal).toHaveAttribute('aria-pressed', 'true');
      expect(safePortal).toHaveAttribute('aria-pressed', 'false');

      // Click Queen Flora (Economy)
      fireEvent.click(economyPortal);
      expect(handleSelectQueen).toHaveBeenCalledWith('economy');
      expect(handleSelectGear).toHaveBeenCalledWith('economy');
      expect(economyPortal).toHaveAttribute('aria-pressed', 'true');
      expect(fastPortal).toHaveAttribute('aria-pressed', 'false');

      // Click back to Queen Meli (Safe)
      fireEvent.click(safePortal);
      expect(handleSelectQueen).toHaveBeenCalledWith('safe');
      expect(handleSelectGear).toHaveBeenCalledWith('safe');
      expect(safePortal).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders the interactive Point A -> Point B Consumer Stage with Coffee vs Panic Tester, Time-Back Visualizer, and Money Harvester', () => {
      const { rerender } = render(<Variant4LivingRailTrack activeGear="safe" />);

      // Stage header
      expect(screen.getByText(/POINT A ➔ POINT B CONSUMER PLAYGROUND/i)).toBeInTheDocument();
      expect(screen.getByText(/The Coffee vs\. Panic Transfer Tester/i)).toBeInTheDocument();

      // Queen Meli: Coffee vs Panic Transfer Tester
      const late15Btn = screen.getByRole('button', { name: /\[ First Train \+15m Late \]/i });
      const late25Btn = screen.getByRole('button', { name: /\[ Heavy Snow \+25m Late \]/i });
      expect(late15Btn).toBeInTheDocument();
      expect(late25Btn).toBeInTheDocument();

      // Click late 15m
      fireEvent.click(late15Btn);
      expect(screen.getByText(/You still have 14 minutes to grab a warm coffee and walk calmly to your next train\./i)).toBeInTheDocument();

      // Click late 25m
      fireEvent.click(late25Btn);
      expect(screen.getByText(/Still 4 safe minutes\. You walk calmly to your next train\. 100% stress-free guarantee\./i)).toBeInTheDocument();

      // Switch to Queen Vira (Fast)
      rerender(<Variant4LivingRailTrack activeGear="fast" />);
      expect(screen.getByText(/The Time-Back Visualizer/i)).toBeInTheDocument();
      expect(screen.getByText(/\+45 min saved/i)).toBeInTheDocument();
      expect(screen.getByText(/14:15 — Already checking in and relaxing at your destination\./i)).toBeInTheDocument();

      // Switch to Queen Flora (Economy)
      rerender(<Variant4LivingRailTrack activeGear="economy" />);
      expect(screen.getByText(/The Pocket Money Harvester/i)).toBeInTheDocument();
      expect(screen.getByText(/Golden Savings Jar/i)).toBeInTheDocument();
      expect(screen.getByText(/Save 38\.50 LEI \(61% More Money\)/i)).toBeInTheDocument();

      // Click Weekend for Two
      const weekendBtn = screen.getByRole('button', { name: /\[ Weekend for Two \]/i });
      fireEvent.click(weekendBtn);
      expect(screen.getByText(/Save 154\.00 LEI \(Weekend For Two\)/i)).toBeInTheDocument();

      // Click Monthly Commute
      const monthlyBtn = screen.getByRole('button', { name: /\[ Monthly Commute \]/i });
      fireEvent.click(monthlyBtn);
      expect(screen.getByText(/Save 600\+ LEI Every Month/i)).toBeInTheDocument();
    });

    it('strictly contains ZERO map or canvas elements (Strict Invariant)', () => {
      const { container } = render(<Variant4LivingRailTrack activeGear="safe" />);
      expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
    });
  });

  /* ========================================================================= */
  /* VARIANT 3: 70%/15%/15% HORIZONTAL ACCORDION ARCHITECTURE TESTS            */
  /* ========================================================================= */
  describe('Variant 3 Horizontal Accordion Architecture', () => {
    it('renders 70%/15%/15% horizontal accordion with expanded sanctuary and compressed pillars', () => {
      const handleSelectQueen = jest.fn();
      const { container } = render(
        <Variant3HorizontalAccordion activeGear="safe" onSelectQueen={handleSelectQueen} />
      );

      // Main container exists
      expect(screen.getByTestId('variant-3-horizontal-accordion')).toBeInTheDocument();

      // 3 Queen Cards exist
      const safeCard = screen.getByTestId('queen-card-safe');
      const fastCard = screen.getByTestId('queen-card-fast');
      const economyCard = screen.getByTestId('queen-card-economy');

      expect(safeCard).toBeInTheDocument();
      expect(fastCard).toBeInTheDocument();
      expect(economyCard).toBeInTheDocument();

      // Safe Card starts expanded (70% flex-[4.5]), Fast and Economy start compressed (15% flex-1)
      expect(safeCard).toHaveAttribute('aria-pressed', 'true');
      expect(fastCard).toHaveAttribute('aria-pressed', 'false');
      expect(economyCard).toHaveAttribute('aria-pressed', 'false');

      // Headings level 4 exist for all 3 Queens
      expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

      // Mini worker bees exist for each queen variant
      const safeBees = container.querySelectorAll('[data-mini-bee-variant="safe"]');
      const fastBees = container.querySelectorAll('[data-mini-bee-variant="fast"]');
      const economyBees = container.querySelectorAll('[data-mini-bee-variant="economy"]');

      expect(safeBees.length).toBeGreaterThan(0);
      expect(fastBees.length).toBeGreaterThan(0);
      expect(economyBees.length).toBeGreaterThan(0);

      // Clicking compressed fast card smoothly expands it and triggers callbacks
      fireEvent.click(fastCard);
      expect(handleSelectQueen).toHaveBeenCalledWith('fast');
      expect(screen.getByTestId('queen-card-fast')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('queen-card-safe')).toHaveAttribute('aria-pressed', 'false');
    });

    it('interactively inspects 5 Romanian rail corridor stations on SVG diagram with Queen Meli safe telemetry', () => {
      render(<Variant3HorizontalAccordion activeGear="safe" />);

      // SVG corridor diagram exists
      expect(screen.getByLabelText(/Interactive Romanian Railway Corridor Diagram Galați to București Nord/i)).toBeInTheDocument();

      // All 5 stations exist
      expect(screen.getByTestId('station-pill-GLT')).toBeInTheDocument();
      expect(screen.getByTestId('station-pill-FAU')).toBeInTheDocument();
      expect(screen.getByTestId('station-pill-BZU')).toBeInTheDocument();
      expect(screen.getByTestId('station-pill-PLS')).toBeInTheDocument();
      expect(screen.getByTestId('station-pill-BCT')).toBeInTheDocument();

      // Default selected station Ploiești Sud displays 99.5% AUC Platform Transfer Shield
      expect(screen.getAllByText(/99\.5% Transfer AUC Shield/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Platform transfer shield at Ploiești Sud/i)).toBeInTheDocument();

      // Click Făurei Junction button: shows Single-track crossing cascade protection
      const faureiBtn = screen.getByTestId('station-pill-FAU');
      fireEvent.click(faureiBtn);
      expect(screen.getAllByText(/Single-Track Crossing Cascade Protection/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/99\.2% Anti-Cascade Interlock/i)).toBeInTheDocument();

      // Click Buzău Hub button: shows Turnaround buffer
      const buzauBtn = screen.getByTestId('station-pill-BZU');
      fireEvent.click(buzauBtn);
      expect(screen.getAllByText(/Turnaround Buffer & Dispatch Recovery/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/\+18 min ML Turnaround Buffer/i)).toBeInTheDocument();
    });

    it('inspects Queen Vira fast express corridor telemetry with 25kV electric traction and <1.5ms edge routing', () => {
      render(<Variant3HorizontalAccordion activeGear="fast" />);

      // Express scout header & mainline telemetry
      expect(screen.getByText(/25kV High-Speed Mainline Interlock/i)).toBeInTheDocument();

      // Ploiești Sud flyover bypass
      expect(screen.getByText(/Ploiești Sud High-Speed Flyover Bypass/i)).toBeInTheDocument();
      expect(screen.getAllByText(/160 km\/h Mainline Flyover/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/< 1\.1ms Routing Edge \(< 1\.5ms Edge Routing\)/i)).toBeInTheDocument();

      // Click Buzău station
      const buzauBtn = screen.getByTestId('station-pill-BZU');
      fireEvent.click(buzauBtn);
      expect(screen.getByText(/Buzău Mainline Electric Speedway/i)).toBeInTheDocument();
      expect(screen.getByText(/150 km\/h Mainline Track/i)).toBeInTheDocument();
    });

    it('inspects Queen Flora economy cumulative fare breakdown across CFR, TFC, and Regio Călători', () => {
      render(<Variant3HorizontalAccordion activeGear="economy" />);

      // Inspect București Nord for full corridor cumulative total
      const bucurestiBtn = screen.getByTestId('station-pill-BCT');
      fireEvent.click(bucurestiBtn);

      // Verify cumulative fare comparison
      expect(screen.getAllByText(/82\.50 LEI/i).length).toBeGreaterThan(0); // CFR Călători full fare
      expect(screen.getAllByText(/43\.00 LEI/i).length).toBeGreaterThan(0); // TFC fare
      expect(screen.getAllByText(/37\.50 LEI/i).length).toBeGreaterThan(0); // Regio Călători / Best Combined
      expect(screen.getAllByText(/Save 45\.00 LEI \(54\.5%\)/i).length).toBeGreaterThan(0);
    });

    it('strictly contains ZERO map or canvas elements (Strict Invariant)', () => {
      const { container } = render(<Variant3HorizontalAccordion activeGear="safe" />);
      expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
    });
  });

  /* ========================================================================= */
  /* VARIANT 5: ASYMMETRIC BENTO TRAIN RADAR ARCHITECTURE TESTS                */
  /* ========================================================================= */
  describe('Variant 5 Asymmetric Bento Train Radar Architecture', () => {
    it('renders the 12-column bento grid, 3 queen cards with crown and mini bee swarms', () => {
      const handleSelectQueen = jest.fn();
      const { container } = render(
        <Variant5BentoTrainRadar activeGear="safe" onSelectQueen={handleSelectQueen} />
      );

      // Bento container
      expect(screen.getByTestId('variant-5-bento-train-radar')).toBeInTheDocument();

      // The 3 Queen Cards exist with testids
      const safeCard = screen.getByTestId('queen-card-safe');
      const fastCard = screen.getByTestId('queen-card-fast');
      const economyCard = screen.getByTestId('queen-card-economy');

      expect(safeCard).toBeInTheDocument();
      expect(fastCard).toBeInTheDocument();
      expect(economyCard).toBeInTheDocument();

      // Heading level 4 for all 3 Queens
      expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

      // Mini Worker Bee swarms exist for each archetype
      expect(container.querySelectorAll('[data-mini-bee-variant="safe"]').length).toBeGreaterThanOrEqual(4);
      expect(container.querySelectorAll('[data-mini-bee-variant="fast"]').length).toBeGreaterThanOrEqual(4);
      expect(container.querySelectorAll('[data-mini-bee-variant="economy"]').length).toBeGreaterThanOrEqual(4);

      // Clicking fast card triggers selection
      fireEvent.click(fastCard);
      expect(handleSelectQueen).toHaveBeenCalledWith('fast');
      expect(fastCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('interactively switches hubs in Queen Meli radar and updates timeline telemetry & reliability gauge', () => {
      render(<Variant5BentoTrainRadar activeGear="safe" />);

      // Default hub is Ploiești Sud
      expect(screen.getAllByText(/Ploiești Sud/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Incoming IR 1572/i)).toBeInTheDocument();
      expect(screen.getByText(/ML Buffer Shield \+18m/i)).toBeInTheDocument();
      expect(screen.getByText(/Connecting RE 7570/i)).toBeInTheDocument();
      expect(screen.getByText(/t_arr \(14:22\) < t_dep \(14:40\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/96/i).length).toBeGreaterThan(0);

      // Switch to Brașov hub
      const brasovHubBtn = screen.getByRole('button', { name: /Brașov/i });
      fireEvent.click(brasovHubBtn);
      expect(screen.getByText(/Incoming IR 1631/i)).toBeInTheDocument();
      expect(screen.getByText(/ML Buffer Shield \+22m/i)).toBeInTheDocument();
      expect(screen.getByText(/Connecting R 3512/i)).toBeInTheDocument();
      expect(screen.getByText(/t_arr \(09:48\) < t_dep \(10:10\)/i)).toBeInTheDocument();

      // Switch to Făurei Single-Track hub
      const faureiHubBtn = screen.getByRole('button', { name: /Făurei Single-Track/i });
      fireEvent.click(faureiHubBtn);
      expect(screen.getByText(/Incoming IR 1774/i)).toBeInTheDocument();
      expect(screen.getByText(/ML Buffer Shield \+25m/i)).toBeInTheDocument();
      expect(screen.getByText(/Connecting RE 5003/i)).toBeInTheDocument();
      expect(screen.getByText(/t_arr \(16:15\) < t_dep \(16:40\)/i)).toBeInTheDocument();

      // Switch to București Nord hub
      const bucurestiHubBtn = screen.getByRole('button', { name: /București Nord/i });
      fireEvent.click(bucurestiHubBtn);
      expect(screen.getByText(/Incoming IC 538/i)).toBeInTheDocument();
      expect(screen.getByText(/ML Buffer Shield \+15m/i)).toBeInTheDocument();
      expect(screen.getByText(/Connecting IR 1587/i)).toBeInTheDocument();
      expect(screen.getByText(/t_arr \(18:32\) < t_dep \(18:47\)/i)).toBeInTheDocument();
    });

    it('interactively toggles train categories in Queen Vira speedometer and displays v35 inference badge', () => {
      render(<Variant5BentoTrainRadar activeGear="fast" />);

      // Check inference badge
      expect(screen.getByText(/v35/i)).toBeInTheDocument();
      expect(screen.getByText(/< 1\.5ms inference/i)).toBeInTheDocument();

      // Default IC InterCity category
      expect(screen.getAllByText(/160 km\/h/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 Stopovers/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/-45m saved/i).length).toBeGreaterThan(0);

      // Switch to Softrans Hyperion
      const softransBtn = screen.getByRole('button', { name: /Softrans Hyperion/i });
      fireEvent.click(softransBtn);
      expect(screen.getByText(/Hyperion RES 002/i)).toBeInTheDocument();
      expect(screen.getAllByText(/160 km\/h/i).length).toBeGreaterThan(0);

      // Switch to IR InterRegio
      const irBtn = screen.getByRole('button', { name: /IR InterRegio/i });
      fireEvent.click(irBtn);
      expect(screen.getByText(/IR 1632 Mainline/i)).toBeInTheDocument();
      expect(screen.getAllByText(/120 km\/h/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/1 Stopover \(Câmpina\)/i)).toBeInTheDocument();
      expect(screen.getByText(/-25m saved/i)).toBeInTheDocument();
    });

    it('renders Queen Flora 4 interactive tickets deck and calculates golden honey jar meter savings', () => {
      render(<Variant5BentoTrainRadar activeGear="economy" />);

      // The 4 interactive rail tickets are rendered
      expect(screen.getAllByText(/CFR Călători/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/63\.00 LEI/i)).toBeInTheDocument();

      expect(screen.getAllByText(/Astra Trans Carpatic/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/55\.00 LEI/i)).toBeInTheDocument();

      expect(screen.getAllByText(/TFC/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/28\.50 LEI/i)).toBeInTheDocument();

      expect(screen.getAllByText(/Regio Călători/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/24\.50 LEI/i)).toBeInTheDocument();

      // Honey jar meter calculates exact savings
      expect(screen.getByText(/GOLDEN HONEY JAR METER/i)).toBeInTheDocument();
      expect(screen.getAllByText(/-61\.1%/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/38\.50 LEI/i).length).toBeGreaterThan(0);

      // Click Astra Trans Carpatic ticket
      const astraCard = screen.getByText('55.00 LEI');
      fireEvent.click(astraCard);
      expect(screen.getAllByText(/-12\.7%/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/8\.00 LEI/i).length).toBeGreaterThan(0);

      // Click CFR baseline ticket
      const cfrCard = screen.getAllByText(/63\.00 LEI/i)[0];
      fireEvent.click(cfrCard);
      expect(screen.getAllByText(/0\.0%/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/CFR Full Fare Baseline: 63\.00 LEI/i)).toBeInTheDocument();
    });

    it('strictly contains ZERO map or canvas elements (Strict Invariant)', () => {
      const { container } = render(<Variant5BentoTrainRadar activeGear="safe" />);
      expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
    });
  });

  describe('Variant 6 Magnetic Honey Portal Architecture', () => {
    it('renders 3 liquid honey hexagonal portals, RoyalCrownSvg, and preserves all Queen strings', () => {
      const handleSelectQueen = jest.fn();
      const handleSelectGear = jest.fn();
      const { container } = render(
        <Variant6MagneticHoneyPortal
          activeGear="safe"
          onSelectQueen={handleSelectQueen}
          onSelectGear={handleSelectGear}
        />
      );

      // Portals exist with correct testids
      const safeCard = screen.getByTestId('queen-card-safe');
      const fastCard = screen.getByTestId('queen-card-fast');
      const economyCard = screen.getByTestId('queen-card-economy');

      expect(safeCard).toBeInTheDocument();
      expect(fastCard).toBeInTheDocument();
      expect(economyCard).toBeInTheDocument();

      // Heading Level 4 preserved
      expect(screen.getByRole('heading', { level: 4, name: /Queen Transfer Guard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Express Scout/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Queen Nectar Saver/i })).toBeInTheDocument();

      // Queen names preserved
      expect(screen.getAllByText(/Queen Meli/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Queen Vira/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Queen Flora/i).length).toBeGreaterThan(0);

      // Worker bees rendered with variant attribute
      expect(container.querySelectorAll('[data-mini-bee-variant="safe"]').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('[data-mini-bee-variant="fast"]').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('[data-mini-bee-variant="economy"]').length).toBeGreaterThan(0);

      // Clicking fast card invokes callbacks
      fireEvent.click(fastCard);
      expect(handleSelectQueen).toHaveBeenCalledWith('fast');
      expect(handleSelectGear).toHaveBeenCalledWith('fast');
      expect(fastCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders the cursor-following magnetic bee swarm field and morphs based on cursor zone', () => {
      render(<Variant6MagneticHoneyPortal activeGear="safe" />);
      const swarmField = screen.getByTestId('magnetic-worker-bee-swarm-field');
      expect(swarmField).toBeInTheDocument();

      const containerEl = screen.getByTestId('variant6-magnetic-portal-container');
      containerEl.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        width: 1000,
        height: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Move into Queen Meli zone (left < 36% -> clientX: 200)
      fireEvent.mouseMove(containerEl, { clientX: 200, clientY: 200 });
      expect(screen.getByText(/Emerald Guard/i)).toBeInTheDocument();

      // Move into Queen Vira zone (center 36%-64% -> clientX: 500)
      fireEvent.mouseMove(containerEl, { clientX: 500, clientY: 200 });
      expect(screen.getByText(/Supersonic Blue/i)).toBeInTheDocument();

      // Move into Queen Flora zone (right > 64% -> clientX: 800)
      fireEvent.mouseMove(containerEl, { clientX: 800, clientY: 200 });
      expect(screen.getByText(/Golden Nectar/i)).toBeInTheDocument();
    });

    it('renders the Live Corridor Telemetry Ribbon with trains and interactive simulation controls', () => {
      render(<Variant6MagneticHoneyPortal activeGear="safe" />);

      // Telemetry Ribbon is rendered
      expect(screen.getByTestId('live-corridor-telemetry-ribbon')).toBeInTheDocument();
      expect(screen.getByText(/LIVE CORRIDOR TELEMETRY RIBBON/i)).toBeInTheDocument();

      // All 3 Trains are rendered in the corridor timeline
      expect(screen.getByText('IR 1570')).toBeInTheDocument();
      expect(screen.getByText('IR 1572')).toBeInTheDocument();
      expect(screen.getByText('RE 7570')).toBeInTheDocument();

      // Interactive Simulation Control Buttons exist
      const delayBtn = screen.getByTestId('simulate-delay-btn');
      const expressBtn = screen.getByTestId('toggle-express-btn');
      const faresBtn = screen.getByTestId('compare-fares-btn');

      expect(delayBtn).toHaveTextContent(/Simulate \+20m Delay/i);
      expect(expressBtn).toHaveTextContent(/Toggle Express Priority/i);
      expect(faresBtn).toHaveTextContent(/Compare Operator Fares/i);

      // Toggle +20m delay
      fireEvent.click(delayBtn);
      expect(screen.getByText(/SIMULATION ACTIVE: \+20m Crossover Delay on IR 1572/i)).toBeInTheDocument();

      // Toggle Express Priority
      fireEvent.click(expressBtn);
      expect(screen.getByText(/SIMULATION ACTIVE: Supersonic Mainline Rail Priority Token Granted/i)).toBeInTheDocument();

      // Toggle Compare Fares
      fireEvent.click(faresBtn);
      expect(screen.getByText(/Queen Flora Multi-Operator Rail Fare Optimization Matrix/i)).toBeInTheDocument();
    });

    it('strictly contains ZERO map or canvas elements (Strict Invariant)', () => {
      const { container } = render(<Variant6MagneticHoneyPortal activeGear="safe" />);
      expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
    });
  });

  it('strictly contains ZERO map or canvas elements across Variant 1 (Strict Invariant)', () => {
    const { container } = render(<Variant1Amphitheater activeGear="safe" />);
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
  });
});
