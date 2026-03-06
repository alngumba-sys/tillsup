The Netlify deploy errored, with the following guidance provided:

**Diagnosis**

- [line 55](#L55) shows Vite/Rollup failing to resolve `figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png`. The custom `figma:` scheme is not configured in this Vite project, so the build cannot locate that asset and exits.

**Solution**

1. In the source, search for `figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png` (for example, the component that renders the empty state).  
2. Verify that the actual PNG file exists in the repository (e.g., under `src/assets` or `public`). Add it if it’s missing.
3. Update the import to use a path that Vite understands, such as a relative or alias-based path:

   ```ts
   import emptyStateImage from '../assets/empty-state.png';
   ```

4. If you deliberately rely on the `figma:` protocol, install and configure the plugin that provides that resolver (for example, a Figma/Vite integration) before re-running the Netlify build.

After adjusting the import (and committing the asset if needed), redeploy on Netlify and the build should complete successfully.

The relevant error logs are:

Line 41:   production
Line 42: [96m[1m​[22m[39m
Line 43: [96m[1mBuild command from Netlify app                                [22m[39m
Line 44: [96m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 45: ​
Line 46: [36m$ npm run build[39m
Line 47: > @figma/my-make-file@0.0.1 build
Line 48: > vite build
Line 49: [36mvite v6.3.5 [32mbuilding for production...[36m[39m
Line 50: transforming...
Line 51: Failed during stage 'building site': Build script returned non-zero exit code: 2
Line 52: [32m✓[39m 75 modules transformed.
Line 53: [31m✗[39m Build failed in 1.18s
Line 54: [31merror during build:
Line 55: [31m[vite]: Rollup failed to resolve import "figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png" from "/opt/build/repo/sr
Line 56: This is most likely unintended because it can break your application at runtime.
Line 57: If you do want to externalize this module explicitly add it to
Line 58: `build.rollupOptions.external`[31m
Line 59:     at viteLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46345:15)
Line 60:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46403:18
Line 61:     at onwarn (file:///opt/build/repo/node_modules/@vitejs/plugin-react/dist/index.js:90:7)
Line 62:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46401:7
Line 63:     at onRollupLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46393:5)
Line 64:     at onLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46043:7)
Line 65:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:20958:32
Line 66:     at Object.logger [as onLog] (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:22945:9)
Line 67:     at ModuleLoader.handleInvalidResolvedId (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21689:26)
Line 68:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21647:26[39m
Line 69: [91m[1m​[22m[39m
Line 70: [91m[1m"build.command" failed                                        [22m[39m
Line 71: [91m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 72: ​
Line 73:   [31m[1mError message[22m[39m
Line 74:   Command failed with exit code 1: npm run build
Line 75: ​
Line 76:   [31m[1mError location[22m[39m
Line 77:   In Build command from Netlify app:
Line 78:   npm run build
Line 79: ​
Line 80:   [31m[1mResolved config[22m[39m
Line 81:   build:
Line 82:     command: npm run build
Line 83:     commandOrigin: ui
Line 84:     publish: /opt/build/repo/dist
Line 85:     publishOrigin: ui
Line 86: Build failed due to a user error: Build script returned non-zero exit code: 2
Line 87: Failing build: Failed to build site
Line 88: Finished processing build request in 10.431s