import path from 'path';
import fs from 'fs';

describe('Web bundling configuration and dependencies', () => {
  const frontendRoot = path.resolve(__dirname, '..');
  const workspaceRoot = path.resolve(frontendRoot, '..');

  it('contains valid metro.config.js that exports default Metro config', () => {
    const metroConfigPath = path.join(frontendRoot, 'metro.config.js');
    expect(fs.existsSync(metroConfigPath)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const metroConfig = require(metroConfigPath);
    expect(metroConfig).toBeDefined();
    expect(typeof metroConfig).toBe('object');
    expect(metroConfig.resolver).toBeDefined();
  });

  it('contains necessary web dependencies in frontend package.json', () => {
    const packageJsonPath = path.join(frontendRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(pkg.dependencies['react-dom']).toBeDefined();
    expect(pkg.dependencies['react-native-web']).toBeDefined();
    expect(pkg.dependencies['@expo/metro-runtime']).toBeDefined();
    expect(pkg.dependencies['expo-font']).toBeDefined();
  });

  it('configures metro web bundler and expo-router in app.json', () => {
    const appJsonPath = path.join(frontendRoot, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    expect(appJson.expo.web.bundler).toBe('metro');
    expect(appJson.expo.plugins).toContain('expo-router');
  });

  it('contains necessary web scripts in frontend package.json', () => {
    const packageJsonPath = path.join(frontendRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(pkg.scripts.web).toBe('expo start --web');
    expect(pkg.scripts['build:web']).toBe('expo export -p web');
    expect(pkg.scripts.postinstall).toBeDefined();
  });

  it('handles expo web subcommand gracefully in local CLI wrapper', () => {
    const expoBinPath = path.join(frontendRoot, 'node_modules', 'expo', 'bin', 'cli');
    expect(fs.existsSync(expoBinPath)).toBe(true);

    const cliContent = fs.readFileSync(expoBinPath, 'utf8');
    expect(cliContent).toContain("process.argv[2] === 'web'");
    expect(cliContent).toContain("splice(2, 1, 'start', '--web')");
  });

  it('has valid web entrypoint and verifies dist output when present', () => {
    const webEntry = path.join(frontendRoot, 'app', '_layout.tsx');
    expect(fs.existsSync(webEntry)).toBe(true);

    const distIndexPath = path.join(frontendRoot, 'dist', 'index.html');
    if (fs.existsSync(distIndexPath)) {
      const htmlContent = fs.readFileSync(distIndexPath, 'utf8');
      expect(htmlContent).toContain('<div id="root"></div>');
      expect(htmlContent).toContain('_expo/static/js/web/');
    }
  });

  it('verifies workspace root structure and script delegation to frontend subfolder', () => {
    const rootPkgPath = path.join(workspaceRoot, 'package.json');
    expect(fs.existsSync(rootPkgPath)).toBe(true);

    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    expect(rootPkg.private).toBe(true);
    expect(rootPkg.scripts.web).toContain('--prefix frontend');
    expect(rootPkg.scripts.start).toContain('--prefix frontend');
    expect(rootPkg.scripts.test).toContain('--prefix frontend');
    expect(rootPkg.scripts['build:web']).toContain('--prefix frontend');
    expect(rootPkg.scripts['type-check']).toContain('--prefix frontend');
    expect(rootPkg.scripts.postinstall).toBe('npm --prefix frontend install');

    const rootGitignorePath = path.join(workspaceRoot, '.gitignore');
    expect(fs.existsSync(rootGitignorePath)).toBe(true);
    const gitignoreContent = fs.readFileSync(rootGitignorePath, 'utf8');
    expect(gitignoreContent).toContain('frontend/node_modules/');
    expect(gitignoreContent).toContain('frontend/dist/');
  });
});
