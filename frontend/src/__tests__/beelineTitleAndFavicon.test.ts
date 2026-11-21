import fs from 'fs';
import path from 'path';

// Mock CSS imports before importing layout
jest.mock('../app/globals.css', () => ({}), { virtual: true });

import { metadata } from '../app/layout';

describe('Strict "Beeline" Site Title and Mascot Favicon', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('exports strictly "Beeline" as site title and metadata in RootLayout', () => {
    expect(metadata.title).toBe('Beeline');
    expect(metadata.applicationName).toBe('Beeline');

    // OpenGraph
    expect(metadata.openGraph).toBeDefined();
    expect((metadata.openGraph as Record<string, unknown>).title).toBe('Beeline');
    expect((metadata.openGraph as Record<string, unknown>).siteName).toBe('Beeline');

    // Twitter
    expect(metadata.twitter).toBeDefined();
    expect((metadata.twitter as Record<string, unknown>).title).toBe('Beeline');
  });

  it('wires /favicon.svg into icons metadata in RootLayout', () => {
    expect(metadata.icons).toBeDefined();
    const icons = metadata.icons as {
      icon: Array<{ url: string; type?: string }>;
      shortcut: string[];
      apple: Array<{ url: string; type?: string }>;
    };

    expect(icons.icon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/favicon.svg', type: 'image/svg+xml' }),
      ])
    );
    expect(icons.shortcut).toContain('/favicon.svg');
    expect(icons.apple).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/favicon.svg', type: 'image/svg+xml' }),
      ])
    );
  });

  it('ensures public/favicon.svg exists and contains mascot SVG elements', () => {
    const faviconPath = path.join(rootDir, 'public/favicon.svg');
    expect(fs.existsSync(faviconPath)).toBe(true);

    const svgContent = fs.readFileSync(faviconPath, 'utf8');
    // Check SVG tag & namespace
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');

    // Check golden-amber honey tones
    expect(svgContent).toMatch(/#FBBF24|#F59E0B|#FDE047|#D97706/i);

    // Check dark charcoal / espresso accents (#1C1917)
    expect(svgContent).toContain('#1C1917');

    // Check wings, antennae, stripes, stinger
    expect(svgContent).toContain('beelineWingGrad');
    expect(svgContent).toContain('ellipse');
    expect(svgContent).toContain('stroke-linecap="round"'); // stripes & antennae
  });

  it('ensures app/icon.svg and app/apple-icon.svg exist for Next.js metadata', () => {
    const appIconPath = path.join(rootDir, 'src/app/icon.svg');
    const appleIconPath = path.join(rootDir, 'src/app/apple-icon.svg');

    expect(fs.existsSync(appIconPath)).toBe(true);
    expect(fs.existsSync(appleIconPath)).toBe(true);

    const iconContent = fs.readFileSync(appIconPath, 'utf8');
    const appleIconContent = fs.readFileSync(appleIconPath, 'utf8');

    expect(iconContent).toContain('<svg');
    expect(appleIconContent).toContain('<svg');
    expect(iconContent).toContain('#1C1917');
    expect(appleIconContent).toContain('#1C1917');
  });

  it('ensures public manifests specify "Beeline" as name and short_name', () => {
    const webmanifestPath = path.join(rootDir, 'public/manifest.webmanifest');
    const jsonManifestPath = path.join(rootDir, 'public/manifest.json');

    expect(fs.existsSync(webmanifestPath)).toBe(true);
    expect(fs.existsSync(jsonManifestPath)).toBe(true);

    const webmanifest = JSON.parse(fs.readFileSync(webmanifestPath, 'utf8'));
    const jsonManifest = JSON.parse(fs.readFileSync(jsonManifestPath, 'utf8'));

    expect(webmanifest.name).toBe('Beeline');
    expect(webmanifest.short_name).toBe('Beeline');
    expect(jsonManifest.name).toBe('Beeline');
    expect(jsonManifest.short_name).toBe('Beeline');

    expect(webmanifest.icons[0].src).toBe('/favicon.svg');
  });

  it('verifies no sub-route page or layout exports conflicting title metadata or sets document.title', () => {
    const appDir = path.join(rootDir, 'src/app');
    const files = fs.readdirSync(appDir, { recursive: true }) as string[];

    for (const file of files) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
      const fullPath = path.join(appDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check document.title assignment
      expect(content).not.toMatch(/document\.title\s*=/);

      // If exporting metadata, ensure title is not overridden to something else
      if (file !== 'layout.tsx' && content.includes('export const metadata')) {
        throw new Error(`Unexpected metadata export in ${file}`);
      }
    }
  });
});
