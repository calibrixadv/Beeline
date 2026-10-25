'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Train, 
  Briefcase, 
  User, 
  LogOut, 
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import MascotBee from './MascotBee';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Compass },
  { href: '/trips', label: 'Trips', icon: MapPin },
  { href: '/schedules', label: 'Schedules', icon: Calendar },
  { href: '/trains', label: 'Trains', icon: Train },
  { href: '/my-trip', label: 'My Trip', icon: Briefcase },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { trips } = useTrip();
  const { user, isAuthenticated, isGuest, logout, continueAsGuest } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Mascot */}
          <Link href="/" className="flex items-center gap-3 group">
            <MascotBee name="honey" size="sm" animated={false} />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent group-hover:from-yellow-300 group-hover:to-amber-500 transition-all">
                VoyageRail
              </span>
              <span className="text-[10px] text-amber-400/80 uppercase tracking-widest font-semibold -mt-1">
                Beeline Transit
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {href === '/my-trip' && trips.length > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold ${
                        isActive ? 'bg-stone-950 text-amber-400' : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      {trips.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User / Guest Account Controls */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5 bg-stone-800/90 border border-stone-700/60 rounded-full py-1.5 px-3">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left text-xs">
                  <span className="font-medium text-stone-200 truncate max-w-[110px]">
                    {user.full_name || (user.email ? user.email.split('@')[0] : 'Traveler')}
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {user.is_guest ? 'Guest Pass' : 'Traveler'}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Logout"
                  className="p-1 text-stone-400 hover:text-red-400 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => continueAsGuest()}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore as Guest</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-stone-900 px-4 pt-3 pb-5 space-y-2">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-amber-500 text-stone-950 font-semibold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
                {href === '/my-trip' && trips.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-stone-950">
                    {trips.length}
                  </span>
                )}
              </Link>
            );
          })}
          {user ? (
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium">Logged in as {user.email || 'Guest Traveler'}</span>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-red-400 font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                continueAsGuest();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 bg-amber-500 text-stone-950 font-semibold py-2 rounded-xl text-sm"
            >
              Explore as Guest
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
