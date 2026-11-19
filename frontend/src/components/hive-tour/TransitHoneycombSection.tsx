'use client';

import React, { useState } from 'react';
import {
  Train,
  Network,
  Zap,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { HoneycombSvg } from './HiveSvgProps';
import MiniWorkerBee from './MiniWorkerBee';
import { TransitProviderInfo } from './types';

export type MetricLens = 'daily_trains' | 'trips_learned';

export const PROVIDERS: TransitProviderInfo[] = [
  // TIER 1: Hero Heart of the Romanian Hive
  {
    id: 'cfr',
    name: 'CFR Călători',
    fullName: 'Compania Națională de Transport Feroviar CFR Călători S.A.',
    tagline: 'Everywhere in Romania',
    story:
      'The historic backbone of Romanian travel, reaching every corner from the Black Sea coast to the highest Carpathian mountain passes across all 8 national rail magistrales.',
    popularDestinations: [
      'Bucharest ⇄ Brașov',
      'Cluj-Napoca ⇄ Timișoara',
      'Iași ⇄ Bucharest',
      'Constanța ⇄ Bucharest',
    ],
    tier: 'hero',
    type: 'rail',
    badge: 'National Flagship Rail',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#D97706',
    coverage: '100% Nationwide Network (All 8 National Magistrales)',
    fleet: 'IC, IR, RE, R (All 8 National Magistrales)',
    syncFeature:
      'Our bees learned from 985,705 real journeys to safeguard your connections at major transfer hubs like Brașov, Ploiești, and Adjud with automated cushions.',
    iconName: 'Train',
    trainingRuns: 985705,
    datasetShare: 64.78,
    dailyActiveTrains: 1256,
    distinctCorridorRoutes: 479,
    meanDelayMinutes: 30.44,
    medianDelayMinutes: 29.8,
    electricTractionPct: 86.6,
    dieselTractionPct: 13.4,
    sampleTrains: ['R 9473', 'R 4205', 'R 4207', 'R 4335', 'R 4331'],
    sourceFile: 'dataset_real_2023_2026.parquet + trenuri-2025-2026_sntfc.xml',
    cluster: 'primary',
  },

  // TIER 2: Regional Express & Strategic Rail Hubs
  {
    id: 'tfc',
    name: 'Transferoviar Călători',
    fullName: 'Transferoviar Călători S.A. (TFC)',
    tagline: 'Fast Regional Shortcuts',
    story:
      'Nimble, comfortable commuter and regional trains connecting Bucharest, Buzău, Galați, and Transylvania with high frequency and punctuality.',
    popularDestinations: [
      'Bucharest ⇄ Buzău',
      'Cluj-Napoca ⇄ Oradea',
      'Bucharest ⇄ Galați',
      'Titan Sud ⇄ Oltenița',
    ],
    tier: 'large',
    type: 'rail',
    badge: 'Regional & Commuter Express',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#F59E0B',
    coverage: 'București, Buzău, Galați, and Cluj Lines',
    fleet: 'Bombardier Talent & Alstom Coradia DMUs',
    syncFeature:
      'Bees track 176,053 past trips to guarantee smooth, stress-free transfers from regional commuter lines onto mainline national trains.',
    iconName: 'Train',
    trainingRuns: 176053,
    datasetShare: 11.57,
    dailyActiveTrains: 303,
    distinctCorridorRoutes: 62,
    meanDelayMinutes: 26.01,
    medianDelayMinutes: 25.4,
    electricTractionPct: 93.2,
    dieselTractionPct: 6.8,
    sampleTrains: ['R 10242', 'R 10362', 'R 10239', 'R 10364', 'R 10289'],
    sourceFile: 'dataset_real_2023_2026.parquet + trenuri-2025-2026_tfc.xml',
    cluster: 'primary',
  },
  {
    id: 'regio',
    name: 'Regio Călători',
    fullName: 'Regio Călători S.R.L.',
    tagline: 'Everyday Town & City Links',
    story:
      'Friendly, dependable everyday connections serving communities across Moldavia, Banat, and Transylvania with convenient schedules for workers and students.',
    popularDestinations: [
      'Brașov ⇄ Gheorgheni',
      'Timișoara ⇄ Arad',
      'Iași ⇄ Hârlău',
      'Iași ⇄ Dorohoi',
    ],
    tier: 'large',
    type: 'rail',
    badge: 'Private Regional Network',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#F59E0B',
    coverage: 'Moldavia, Banat & Transylvania Regional Lines',
    fleet: 'Alstom & Duewag Regional Railcars',
    syncFeature:
      'With 332,514 trips in our hive memory, Beeline synchronizes regional departures with mainline intercity arrivals.',
    iconName: 'Train',
    trainingRuns: 332514,
    datasetShare: 21.85,
    dailyActiveTrains: 273,
    distinctCorridorRoutes: 81,
    meanDelayMinutes: 28.78,
    medianDelayMinutes: 28.2,
    electricTractionPct: 79.7,
    dieselTractionPct: 20.3,
    sampleTrains: ['R 10564', 'R 10619', 'RE 10506', 'R 10645', 'R 10739'],
    sourceFile: 'dataset_real_2023_2026.parquet + trenuri-2025-2026_regio-calatori.xml',
    cluster: 'primary',
  },
  {
    id: 'interregional',
    name: 'Interregional Călători',
    fullName: 'Interregional Călători S.R.L. (IRC)',
    tagline: 'Transylvanian & Western Links',
    story:
      'Modern regional railcars gliding through scenic northwestern Romania, keeping Cluj-Napoca, Oradea, Satu Mare, and Târgu Mureș effortlessly linked.',
    popularDestinations: [
      'Cluj-Napoca ⇄ Baia Mare',
      'Oradea ⇄ Satu Mare',
      'Cluj-Napoca ⇄ Târgu Mureș',
    ],
    tier: 'large',
    type: 'rail',
    badge: 'Transylvanian Rail Links',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Cluj-Napoca, Oradea, Satu Mare & Târgu Mureș Corridors',
    fleet: 'Siemens Desiro & Regional Railcars',
    syncFeature:
      'Trained across 103,647 journeys to protect regional transfers between northern cities and mainline connections.',
    iconName: 'Train',
    trainingRuns: 103647,
    datasetShare: 6.81,
    dailyActiveTrains: 216,
    distinctCorridorRoutes: 59,
    meanDelayMinutes: 30.62,
    medianDelayMinutes: 30.2,
    electricTractionPct: 58.8,
    dieselTractionPct: 41.2,
    sampleTrains: ['R 10619', 'RE 10506', 'R 10645', 'R 10739', 'R 10609'],
    sourceFile: 'trenuri-2025-2026_interregional-calatori.xml + dataset_real_2023_2026.parquet',
    cluster: 'extended',
  },
  {
    id: 'bucuresti-hub',
    name: 'București Nord Hub',
    fullName: 'Gara de Nord Central Railway Terminal Hub',
    tagline: 'Main National Meeting Point',
    story:
      'Romania’s bustling grand central station where 5 national magistrales intersect, welcoming travelers from across the nation and the airport express.',
    popularDestinations: [
      'Bucharest Central Terminal',
      'Otopeni Airport Express',
      'All 8 Mainline Magistrales',
    ],
    tier: 'large',
    type: 'junction',
    badge: 'Primary National Rail Junction',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Magistrales 300, 500, 700, 800 & 900 Central Interchange',
    fleet: 'Magistrales 300, 500, 700, 800 & 900',
    syncFeature:
      'Bees monitor 327,609 station movements to ensure platform changes remain relaxed even during peak travel rush hours.',
    iconName: 'Network',
    trainingRuns: 327609,
    datasetShare: 21.53,
    dailyActiveTrains: 601,
    distinctCorridorRoutes: 75,
    meanDelayMinutes: 29.07,
    medianDelayMinutes: 27.5,
    electricTractionPct: 94.7,
    dieselTractionPct: 5.3,
    sampleTrains: ['IR 11506', 'IR 11505', 'IR 11534', 'IR 11532', 'IR 11525'],
    sourceFile: 'dataset_real_2023_2026.parquet (BCT Hub origin/dest)',
    cluster: 'extended',
  },
  {
    id: 'carpathian-danube-hub',
    name: 'Carpathian & Danube Hubs',
    fullName: 'Strategic Mountain Pass & River Junction Rail Network',
    tagline: 'Mountain & Bridge Crossings',
    story:
      'The dramatic gateways through the Prahova Valley pass and historic Danube river bridges, linking Wallachia to Transylvania and the Black Sea.',
    popularDestinations: [
      'Predeal Mountain Pass',
      'Brașov Mountain Gate',
      'Ploiești Sud Interchange',
      'Făurei Danube Bridge',
    ],
    tier: 'large',
    type: 'junction',
    badge: 'Mountain & Bridge Crossings',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Brașov, Ploiești Sud, Făurei & Predeal Mountain Pass',
    fleet: 'Brașov, Ploiești Sud, Făurei & Predeal Pass',
    syncFeature:
      'Studied 125,866 mountain journeys to add smart winter buffers and protect connections through single-track mountain gorges.',
    iconName: 'Network',
    trainingRuns: 125866,
    datasetShare: 8.27,
    dailyActiveTrains: 262,
    distinctCorridorRoutes: 44,
    meanDelayMinutes: 27.79,
    medianDelayMinutes: 26.3,
    electricTractionPct: 100.0,
    dieselTractionPct: 0.0,
    sampleTrains: ['IR 11534', 'IR 11532', 'IR 11533', 'IR 11537', 'IR 11538'],
    sourceFile: 'dataset_real_2023_2026.parquet (mountain_pass=1 & single_track=1)',
    cluster: 'extended',
  },

  // TIER 3: Compact Boutique Express & Dedicated Feeder
  {
    id: 'astra',
    name: 'Astra Trans Carpatic',
    fullName: 'Astra Trans Carpatic S.R.L.',
    tagline: 'Cozy Long-Distance & Sleepers',
    story:
      'Romania’s luxury boutique railway featuring private sleeper cabins with en-suite showers, daytime salon cars, and complimentary morning coffee.',
    popularDestinations: [
      'Bucharest ⇄ Arad',
      'Brașov ⇄ Timișoara',
      'Bucharest ⇄ Constanța',
    ],
    tier: 'compact',
    type: 'rail',
    badge: 'Premium Long-Distance Rail',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#D97706',
    coverage: 'București – Brașov – Arad – Timișoara / Constanța',
    fleet: 'Modern AC InterRegio, Sleeper & Couchette',
    syncFeature:
      'Over 15,219 overnight runs modeled so you wake up refreshed at your destination with guaranteed connections.',
    iconName: 'Train',
    trainingRuns: 15219,
    datasetShare: 1.0,
    dailyActiveTrains: 21,
    distinctCorridorRoutes: 12,
    meanDelayMinutes: 29.92,
    medianDelayMinutes: 22.6,
    electricTractionPct: 100.0,
    dieselTractionPct: 0.0,
    sampleTrains: ['IR 11506', 'IR 11505', 'IR 11534', 'IR 11532', 'IR 11525'],
    sourceFile: 'dataset_real_2023_2026.parquet + trenuri-2025-2026_astratranscarpatic.xml',
    cluster: 'primary',
  },
  {
    id: 'ferotrafic',
    name: 'Ferotrafic TFI',
    fullName: 'Ferotrafic TFI S.R.L.',
    tagline: 'Direct Regional Links',
    story:
      'Dedicated express services connecting capital routes to regional hubs in Moldavia and Dobrogea with reliable daily departures.',
    popularDestinations: [
      'Bucharest ⇄ Constanța',
      'Bucharest ⇄ Iași',
      'Bucharest ⇄ Suceava',
    ],
    tier: 'compact',
    type: 'rail',
    badge: 'Direct Regional Express',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Regional Branch Lines & Interconnecting Rail Corridors',
    fleet: 'Branch-Line & Commuter Rail Units',
    syncFeature:
      'Live daily express feed tracked by our bees to guarantee timely alignment with regional departures.',
    iconName: 'Train',
    trainingRuns: 0,
    datasetShare: 0.0,
    dailyActiveTrains: 18,
    distinctCorridorRoutes: 10,
    meanDelayMinutes: 0.0,
    medianDelayMinutes: 0.0,
    electricTractionPct: 100.0,
    dieselTractionPct: 0.0,
    sampleTrains: ['11785', '11764', '11754', '11780', '11763'],
    sourceFile: 'trenuri-2025-2026_ferotrafictfi.xml',
    cluster: 'extended',
  },
  {
    id: 'softrans',
    name: 'Softrans',
    fullName: 'Softrans S.R.L. (Hyperion Train Fleet)',
    tagline: 'Modern Electric Hyperion',
    story:
      'Sleek electric Hyperion trains crafted in Craiova, offering whisper-quiet journeys, free Wi-Fi, and power sockets from Oltenia to the Black Sea.',
    popularDestinations: [
      'Craiova ⇄ Bucharest',
      'Bucharest ⇄ Brașov',
      'Bucharest ⇄ Constanța',
    ],
    tier: 'compact',
    type: 'rail',
    badge: 'Hyperion Electric Rail',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#D97706',
    coverage: 'Craiova – București Nord – Brașov / Constanța',
    fleet: 'Hyperion 25kV AC Dual-Voltage EMUs',
    syncFeature:
      '12,160 electric runs learned by our bees for precision arrival timing along high-speed corridors.',
    iconName: 'Zap',
    trainingRuns: 12160,
    datasetShare: 0.8,
    dailyActiveTrains: 16,
    distinctCorridorRoutes: 6,
    meanDelayMinutes: 28.44,
    medianDelayMinutes: 28.5,
    electricTractionPct: 100.0,
    dieselTractionPct: 0.0,
    sampleTrains: ['RE 11612', 'RE 11631', 'IR 11683', 'RE 11632', 'RE 11614'],
    sourceFile: 'dataset_real_2023_2026.parquet + trenuri-2025-2026_softrans.xml',
    cluster: 'primary',
  },
];

export const TOTAL_DATASET_RUNS = 1521651;
export const TOTAL_XML_DAILY_TRAINS = 2103;
export const TOTAL_XML_CORRIDOR_ROUTES = 709;

export const TransitHoneycombSection: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<TransitProviderInfo>(PROVIDERS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<MetricLens>('daily_trains');

  // Provider lookup by ID for organic layout placement
  const providerMap = React.useMemo(() => {
    const map = new Map<string, TransitProviderInfo>();
    PROVIDERS.forEach((p) => map.set(p.id, p));
    return map;
  }, []);

  const topRow = [
    providerMap.get('softrans')!,
    providerMap.get('carpathian-danube-hub')!,
    providerMap.get('astra')!,
  ].filter(Boolean);

  const middleRow = [
    providerMap.get('tfc')!,
    providerMap.get('cfr')!,
    providerMap.get('bucuresti-hub')!,
  ].filter(Boolean);

  const bottomRow = [
    providerMap.get('regio')!,
    providerMap.get('ferotrafic')!,
    providerMap.get('interregional')!,
  ].filter(Boolean);

  return (
    <section
      id="tour-providers"
      aria-label="The Synchronized Transit Honeycomb"
      className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      {/* Chapter 2 Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 mb-3 shadow-xs">
          <Network className="w-3.5 h-3.5 text-amber-600" />
          <span>CHAPTER 2 • THE CONNECTED NETWORK</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
          The Synchronized Transit Honeycomb
        </h3>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          Romania’s rail network connects breathtaking mountain passes, vibrant cities, and quiet country
          towns. Beeline brings all 7 passenger train companies and key transfer junctions into one
          synchronized honey hive — studying 1,521,651 past journeys across 2,103 daily trains so your
          transfers always feel effortless.
        </p>
      </div>

      {/* STAGE 1: Concept 9 — Live Day-in-the-Hive Counter & Simple 2-Way Toggle */}
      <div className="mb-10 p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-50/95 via-amber-100/60 to-orange-50/80 border-2 border-amber-300/80 shadow-md backdrop-blur-sm">
        {/* Giant Warm Scoreboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Metric 1: Daily Active Trains */}
          <div className="p-4 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🚆
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-stone-950 font-mono tracking-tight leading-none">
                2,103
              </div>
              <div className="text-xs sm:text-sm font-black text-stone-900 mt-1">
                Active Trains
              </div>
              <div className="text-[11px] font-medium text-stone-500">
                Running Every Single Day
              </div>
            </div>
          </div>

          {/* Metric 2: Connected Routes */}
          <div className="p-4 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🗺️
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-stone-950 font-mono tracking-tight leading-none">
                709
              </div>
              <div className="text-xs sm:text-sm font-black text-stone-900 mt-1">
                Direct &amp; Connected Routes
              </div>
              <div className="text-[11px] font-medium text-stone-500">
                Across All of Romania
              </div>
            </div>
          </div>

          {/* Metric 3: Trips Learned by Our Bees */}
          <div className="p-4 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🍯
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight leading-none">
                1,521,651
              </div>
              <div className="text-xs sm:text-sm font-black text-stone-900 mt-1">
                Real Trips Learned
              </div>
              <div className="text-[11px] font-medium text-amber-900/80">
                Studied by Our Bees So You Arrive Relaxed
              </div>
            </div>
          </div>
        </div>

        {/* Consumer-Friendly 2-Way Lens Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-amber-200/80">
          <div className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-2">
            <span className="text-base">🐝</span>
            <span>Explore the Hive by:</span>
          </div>

          <div
            data-testid="honeycomb-metric-toggle"
            role="group"
            aria-label="Honeycomb View Switcher"
            className="flex items-center gap-1.5 p-1 rounded-2xl bg-amber-100/80 border border-amber-300/80 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setActiveLens('daily_trains')}
              aria-pressed={activeLens === 'daily_trains'}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeLens === 'daily_trains'
                  ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-600'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-amber-200/60'
              }`}
            >
              <span>🚆 Daily Trains &amp; Routes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens('trips_learned')}
              aria-pressed={activeLens === 'trips_learned'}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeLens === 'trips_learned'
                  ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-600'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-amber-200/60'
              }`}
            >
              <span>🍯 Trips Learned by Our Bees</span>
            </button>
          </div>
        </div>
      </div>

      {/* STAGE 2: Concept 2 — Natural Size-Weighted Organic Beehive & Playful Story Cards */}
      <div className="flex flex-col items-center justify-center relative">
        {/* Organic Size-Weighted Beehive Cluster */}
        <div
          data-testid="svg-honeycomb"
          className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center gap-4 sm:gap-6 py-6"
        >
          {/* Background Decorative SVG Honeycomb Lattice & Ambient Nectar Bridges */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 -z-0">
            <HoneycombSvg size={480} />
          </div>

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none -z-0 overflow-visible opacity-40 hidden sm:block"
            viewBox="0 0 800 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="nectarBridgeFlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {/* Curved nectar bridges linking satellite cells to central CFR and hubs */}
            <path
              d="M 220 100 Q 400 130 400 270"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d="M 580 100 Q 400 130 400 270"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d="M 240 270 L 400 270 L 560 270"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="3"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d="M 400 270 Q 400 440 220 480"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d="M 400 270 Q 400 440 580 480"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d="M 400 270 L 400 480"
              stroke="url(#nectarBridgeFlow)"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              fill="none"
            />
          </svg>

          {/* Row 1: Outer Satellites (Softrans • Carpathian & Danube Hubs • Astra Trans Carpatic) */}
          <div className="w-full flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
            {topRow.map((p) => (
              <HoneycombHexCell
                key={p.id}
                provider={p}
                activeLens={activeLens}
                isSelected={selectedProvider.id === p.id}
                isHovered={hoveredId === p.id}
                onHover={(h) => setHoveredId(h ? p.id : null)}
                onSelect={() => setSelectedProvider(p)}
              />
            ))}
          </div>

          {/* Row 2: Heart of the Hive (Transferoviar Călători • CFR Călători HERO XL • București Nord Hub) */}
          <div className="w-full flex items-center justify-center gap-4 sm:gap-7 flex-wrap my-1 sm:my-2">
            {middleRow.map((p) => (
              <HoneycombHexCell
                key={p.id}
                provider={p}
                activeLens={activeLens}
                isSelected={selectedProvider.id === p.id}
                isHovered={hoveredId === p.id}
                onHover={(h) => setHoveredId(h ? p.id : null)}
                onSelect={() => setSelectedProvider(p)}
              />
            ))}
          </div>

          {/* Row 3: Regional Links & Express Feeder (Regio Călători • Ferotrafic TFI • Interregional Călători) */}
          <div className="w-full flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
            {bottomRow.map((p) => (
              <HoneycombHexCell
                key={p.id}
                provider={p}
                activeLens={activeLens}
                isSelected={selectedProvider.id === p.id}
                isHovered={hoveredId === p.id}
                onHover={(h) => setHoveredId(h ? p.id : null)}
                onSelect={() => setSelectedProvider(p)}
              />
            ))}
          </div>

          {/* Hive Guidance Subtitle */}
          <div className="flex items-center justify-center gap-2 mt-2 text-xs font-semibold text-stone-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Click or hover any honeycomb cell to read its traveler story</span>
          </div>
        </div>

        {/* Playful Floating Honey Story Card (Warm Traveler Postcard) */}
        <div
          data-testid="provider-story-card"
          className="w-full max-w-3xl mx-auto mt-6 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-50/95 via-white to-amber-100/60 border-2 border-amber-300/80 shadow-xl backdrop-blur-sm transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span
                className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-black uppercase border mb-1.5 shadow-xs ${selectedProvider.badgeColor}`}
              >
                {selectedProvider.badge}
              </span>
              <h4 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight leading-tight">
                {selectedProvider.name}
              </h4>
              <div className="text-xs sm:text-sm font-semibold text-amber-900/80 italic mt-0.5">
                &ldquo;{selectedProvider.tagline}&rdquo;
              </div>
            </div>

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md relative"
              style={{ backgroundColor: selectedProvider.accentColor }}
            >
              {selectedProvider.type === 'junction' ? (
                <Network className="w-6 h-6" />
              ) : selectedProvider.iconName === 'Zap' ? (
                <Zap className="w-6 h-6" />
              ) : (
                <Train className="w-6 h-6" />
              )}
              <MiniWorkerBee variant="safe" size={16} className="absolute -top-2 -right-2" />
            </div>
          </div>

          {/* Friendly 1-2 sentence Plain-English Story */}
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-medium mb-5">
            {selectedProvider.story}
          </p>

          {/* 3 Clear Honey Pills (No Progress Bars or File Paths) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {/* Pill 1: Trains Running Every Day */}
            <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3">
              <span className="text-2xl select-none" aria-hidden="true">
                🚆
              </span>
              <div>
                <div className="text-lg font-black text-stone-950 font-mono leading-none">
                  {selectedProvider.dailyActiveTrains.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-stone-600 mt-1">
                  Trains Running Every Day
                </div>
              </div>
            </div>

            {/* Pill 2: Routes Covered */}
            <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3">
              <span className="text-2xl select-none" aria-hidden="true">
                🗺️
              </span>
              <div>
                <div className="text-lg font-black text-stone-950 font-mono leading-none">
                  {selectedProvider.distinctCorridorRoutes}
                </div>
                <div className="text-xs font-bold text-stone-600 mt-1">
                  Routes Covered
                </div>
              </div>
            </div>

            {/* Pill 3: Trips Learned by Our Bees */}
            <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/80 shadow-xs flex items-center gap-3">
              <span className="text-2xl select-none" aria-hidden="true">
                🍯
              </span>
              <div>
                <div className="text-lg font-black text-amber-950 font-mono leading-none">
                  {selectedProvider.trainingRuns > 0
                    ? selectedProvider.trainingRuns.toLocaleString()
                    : 'Daily Feed'}
                </div>
                <div className="text-xs font-bold text-stone-600 mt-1">
                  {selectedProvider.trainingRuns > 0
                    ? 'Past Trips Learned by Our Bees'
                    : 'Daily Express Feed Tracked by Our Bees'}
                </div>
              </div>
            </div>
          </div>

          {/* Popular Destinations Pill Bar */}
          <div className="p-3.5 rounded-2xl bg-amber-100/60 border border-amber-200/80 mb-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>Popular Destinations &amp; Scenic Routes:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProvider.popularDestinations.map((dest) => (
                <span
                  key={dest}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-white text-stone-800 border border-amber-300/70 shadow-xs"
                >
                  📍 {dest}
                </span>
              ))}
            </div>
          </div>

          {/* Friendly Bee Sync Note */}
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950 leading-relaxed font-medium">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-900 block mb-0.5">
                How Our Bees Keep You On Time:
              </span>
              <span>{selectedProvider.syncFeature}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Synchronized Romanian Rail Hive
            </span>
            <span>Click any hexagon cell above to explore</span>
          </div>
        </div>
      </div>
    </section>
  );
};

interface HoneycombHexCellProps {
  provider: TransitProviderInfo;
  activeLens: MetricLens;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}

const HoneycombHexCell: React.FC<HoneycombHexCellProps> = ({
  provider,
  activeLens,
  isSelected,
  isHovered,
  onHover,
  onSelect,
}) => {
  const isHero = provider.tier === 'hero';
  const isLarge = provider.tier === 'large';
  const isJunction = provider.type === 'junction';
  const isEmerald = provider.accentColor === '#059669';

  // Liquid honey fill gauge calculation
  // In daily_trains mode: proportional to daily trains (1,256 is 100%)
  // In trips_learned mode: proportional to trips learned share with sqrt scale so boutique cells have rich golden honey
  const gaugePercent =
    activeLens === 'daily_trains'
      ? Math.max(12, Math.min(100, Math.round((provider.dailyActiveTrains / 1256) * 100)))
      : provider.trainingRuns > 0
      ? Math.max(16, Math.min(100, Math.round(Math.sqrt(provider.datasetShare / 64.78) * 100)))
      : 16;

  // Sizing by Tier
  const sizeClasses = isHero
    ? 'w-64 sm:w-72 min-h-[220px] sm:min-h-[240px] p-4 sm:p-5 rounded-3xl'
    : isLarge
    ? 'w-44 sm:w-52 min-h-[175px] sm:min-h-[190px] p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl'
    : 'w-36 sm:w-44 min-h-[155px] sm:min-h-[165px] p-2.5 sm:p-3 rounded-2xl';

  // Background and border styling
  const fillGradient = isHero
    ? isSelected
      ? 'from-amber-300 via-amber-400 to-amber-500 ring-4 ring-amber-400 shadow-2xl scale-105'
      : isHovered
      ? 'from-amber-200 via-amber-300 to-amber-400 ring-2 ring-amber-300 shadow-xl scale-102'
      : 'from-amber-100 via-amber-200 to-amber-300 ring-2 ring-amber-300/80 shadow-lg'
    : isSelected
    ? isEmerald
      ? 'from-emerald-200 via-emerald-300 to-emerald-400 ring-2 ring-emerald-500 shadow-xl scale-105'
      : 'from-amber-200 via-amber-300 to-amber-400 ring-2 ring-amber-500 shadow-xl scale-105'
    : isHovered
    ? isEmerald
      ? 'from-emerald-50 via-emerald-100 to-emerald-200 border-2 border-emerald-300 shadow-md scale-102'
      : 'from-amber-50 via-amber-100 to-amber-200 border-2 border-amber-300 shadow-md scale-102'
    : isEmerald
    ? 'from-white via-emerald-50/50 to-emerald-100/30 border-2 border-emerald-200 shadow-xs'
    : 'from-white via-amber-50/60 to-amber-100/40 border-2 border-amber-200 shadow-xs';

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => {
        onHover(true);
        onSelect();
      }}
      onBlur={() => onHover(false)}
      aria-label={`Inspect ${provider.name}`}
      aria-pressed={isSelected}
      className={`relative flex flex-col justify-between transition-all duration-300 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gradient-to-br ${sizeClasses} ${fillGradient} ${
        isSelected ? 'z-20' : isHovered ? 'z-10' : 'z-0'
      }`}
    >
      {/* Top inside Hexagon: Role Icon & Tagline Badge */}
      <div className="w-full flex items-center justify-between gap-1">
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          {isJunction ? (
            <Network className="w-4 h-4 text-emerald-800" />
          ) : provider.iconName === 'Zap' ? (
            <Zap className="w-4 h-4 text-amber-800" />
          ) : (
            <Train className={`w-4 h-4 ${isEmerald ? 'text-emerald-800' : 'text-amber-800'}`} />
          )}
        </div>

        <span
          className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full truncate ${
            isHero
              ? 'bg-amber-950 text-amber-100'
              : isSelected
              ? 'bg-stone-950/20 text-stone-950'
              : isEmerald
              ? 'bg-emerald-200/80 text-emerald-950'
              : 'bg-amber-200/80 text-amber-950'
          }`}
        >
          {isHero ? 'Everywhere in Romania' : provider.tagline}
        </span>
      </div>

      {/* Floating Happy MiniWorkerBee hovering on Tier 1 Hero */}
      {isHero && (
        <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 drop-shadow-md">
          <MiniWorkerBee variant="safe" size={24} />
        </div>
      )}

      {/* Provider Name */}
      <div className="text-center my-1 px-1">
        <span
          className={`font-black block leading-tight tracking-tight text-stone-950 ${
            isHero ? 'text-base sm:text-lg' : isLarge ? 'text-xs sm:text-sm' : 'text-xs'
          }`}
        >
          {provider.name}
        </span>
        {isHero && (
          <span className="text-[10px] font-bold text-amber-950/80 uppercase tracking-wider block mt-0.5">
            ★ Heart of the Hive
          </span>
        )}
      </div>

      {/* Middle: Real Codebase Metrics depending on active lens */}
      <div className="w-full space-y-1 my-1">
        {/* Metric Pill 1 (Highlighted by lens) */}
        <div
          className={`w-full text-center px-1.5 py-0.5 rounded-lg font-mono transition-all ${
            isHero ? 'text-xs' : 'text-[10px]'
          } ${
            activeLens === 'daily_trains'
              ? 'bg-amber-400 text-stone-950 font-black shadow-xs ring-1 ring-amber-600/50'
              : 'bg-white/70 text-stone-800 font-semibold'
          }`}
        >
          {provider.dailyActiveTrains.toLocaleString()} Trains/Day • {provider.distinctCorridorRoutes} Routes
        </div>

        {/* Metric Pill 2 (Highlighted by lens) */}
        <div
          className={`w-full text-center px-1.5 py-0.5 rounded-lg font-mono transition-all ${
            isHero ? 'text-xs' : 'text-[10px]'
          } ${
            activeLens === 'trips_learned'
              ? 'bg-amber-400 text-stone-950 font-black shadow-xs ring-1 ring-amber-600/50'
              : 'bg-white/70 text-stone-800 font-semibold'
          }`}
        >
          {provider.trainingRuns > 0
            ? `${provider.trainingRuns.toLocaleString()} Trips Learned`
            : 'Daily Express Feed'}
        </div>
      </div>

      {/* Bottom: Proportional SVG Liquid Honey Fill Gauge */}
      <div className="w-full pt-1 border-t border-amber-300/40 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-[9px] font-semibold text-stone-600 px-0.5 mb-0.5">
          <span>Honey Level</span>
          <span className="font-mono">{gaugePercent}%</span>
        </div>
        <svg
          viewBox="0 0 100 8"
          className="w-full h-2 rounded-full overflow-hidden bg-amber-100/80 border border-amber-300/40 shadow-inner"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`honeyGauge-${provider.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width={`${gaugePercent}%`}
            height="8"
            fill={`url(#honeyGauge-${provider.id})`}
            rx="4"
            className="transition-all duration-700 ease-out"
          />
        </svg>
      </div>
    </button>
  );
};

export default TransitHoneycombSection;
