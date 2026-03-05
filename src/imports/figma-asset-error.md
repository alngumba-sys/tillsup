The Netlify deploy errored, with the following guidance provided:

**Diagnosis**

- The build stops with Vite/Rollup being unable to resolve `figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png`, see [line 54](#L54-L57). This `figma:` protocol is only available inside Figma’s runtime, so the bundler cannot find that asset during the Netlify build.

**Solution**

- Replace the `figma:` import with a resolvable path. Add the PNG file to your repo (for example under `src/assets/` or `public/`) and import it using a relative/static path so Vite can bundle it:

  ```ts
  import icon from '../assets/4f0019b6de17d228838092e3bc909e9dc8e3832f.png';
  ```

  Update any components that referenced the `figma:` asset to use this new import path.

- Commit the asset file and the code changes, then push again to trigger a new Netlify build.

The relevant error logs are:

Line 42: [96m[1m​[22m[39m
Line 43: [96m[1mBuild command from Netlify app                                [22m[39m
Line 44: [96m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 45: ​
Line 46: [36m$ npm run build[39m
Line 47: > @figma/my-make-file@0.0.1 build
Line 48: > vite build
Line 49: [36mvite v6.3.5 [32mbuilding for production...[36m[39m
Line 50: transforming...
Line 51: [32m✓[39m 246 modules transformed.
Line 52: [31m✗[39m Build failed in 1.66s
Line 53: [31merror during build:
Line 54: [31m[vite]: Rollup failed to resolve import "figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png" from "/opt/build/repo/sr
Line 55: This is most likely unintended because it can break your application at runtime.
Line 56: If you do want to externalize this module explicitly add it to
Line 57: `build.rollupOptions.external`[31m
Line 58:     at viteLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46345:15)
Line 59:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46403:18
Line 60:     at onwarn (file:///opt/build/repo/node_modules/@vitejs/plugin-react/dist/index.js:90:7)
Line 61:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46401:7
Line 62:     at onRollupLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46393:5)
Line 63:     at onLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46043:7)
Line 64:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:20958:32
Line 65:     at Object.logger [as onLog] (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:22945:9)
Line 66:     at ModuleLoader.handleInvalidResolvedId (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21689:26)
Line 67:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21647:26[39m
Line 68: [91m[1m​[22m[39m
Line 69: [91m[1m"build.command" failed                                        [22m[39m
Line 70: [91m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 71: ​
Line 72:   [31m[1mError message[22m[39m
Line 73:   Command failed with exit code 1: npm run build
Line 74: ​
Line 75:   [31m[1mError location[22m[39m
Line 76:   In Build command from Netlify app:
Line 77:   npm run build
Line 78: ​
Line 79:   [31m[1mResolved config[22m[39m
Line 80:   build:
Line 81:     command: npm run build
Line 82:     commandOrigin: ui
Line 83:     publish: /opt/build/repo/dist
Line 84:     publishOrigin: ui
Line 85: Failed during stage 'building site': Build script returned non-zero exit code: 2
Line 86: Build failed due to a user error: Build script returned non-zero exit code: 2
Line 87: Failing build: Failed to build site
Line 88: Finished processing build request in 11.287s