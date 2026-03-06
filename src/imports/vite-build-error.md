The Netlify deploy errored, with the following guidance provided:

**Diagnosis**

- [line 61](#L61) shows Vite/Rollup aborting because it cannot resolve the import `figma:asset/21a330cd4033b51a67a4c364b3c77fd54c1bb825.png`. The build looks for an actual file or alias that matches that bare specifier, can’t find one, and stops.

**Solution**

1. Search your sources for `figma:asset/21a330cd4033b51a67a4c364b3c77fd54c1bb825.png` (for example, `git grep "figma:asset"`). That import is Figma‑specific and has no corresponding file in the repo.
2. Decide how you want the asset bundled for the web build:
   - If you have the original PNG, add it to the repo (e.g., `src/assets/...`) and update the import to a relative/alias path that Vite understands:

     ```tsx
     import myImage from '../assets/my-image.png';
     ```

   - Or configure a Vite alias that points `figma:asset` to the directory containing the committed asset:

     ```ts
     // vite.config.ts
     import path from 'node:path';

     export default defineConfig({
       resolve: {
         alias: {
           'figma:asset': path.resolve(__dirname, 'src/assets'),
         },
       },
     });
     ```

     (Make sure the matching PNG file is actually checked into `src/assets` before relying on the alias.)

Once the import targets a real file that exists in the repository, `npm run build` will succeed on Netlify.

The relevant error logs are:

Line 49: [96m[1m​[22m[39m
Line 50: [96m[1mBuild command from Netlify app                                [22m[39m
Line 51: [96m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 52: ​
Line 53: [36m$ npm run build[39m
Line 54: > @figma/my-make-file@0.0.1 build
Line 55: > vite build
Line 56: [36mvite v6.3.5 [32mbuilding for production...[36m[39m
Line 57: transforming...
Line 58: [32m✓[39m 43 modules transformed.
Line 59: [31m✗[39m Build failed in 1.09s
Line 60: [31merror during build:
Line 61: [31m[vite]: Rollup failed to resolve import "figma:asset/21a330cd4033b51a67a4c364b3c77fd54c1bb825.png" from "/opt/build/repo/sr
Line 62: This is most likely unintended because it can break your application at runtime.
Line 63: If you do want to externalize this module explicitly add it to
Line 64: `build.rollupOptions.external`[31m
Line 65:     at viteLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46345:15)
Line 66:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46403:18
Line 67:     at onwarn (file:///opt/build/repo/node_modules/@vitejs/plugin-react/dist/index.js:90:7)
Line 68:     at file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46401:7
Line 69:     at onRollupLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46393:5)
Line 70:     at onLog (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46043:7)
Line 71:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:20958:32
Line 72:     at Object.logger [as onLog] (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:22945:9)
Line 73:     at ModuleLoader.handleInvalidResolvedId (file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21689:26)
Line 74:     at file:///opt/build/repo/node_modules/rollup/dist/es/shared/node-entry.js:21647:26[39m
Line 75: [91m[1m​[22m[39m
Line 76: [91m[1m"build.command" failed                                        [22m[39m
Line 77: [91m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 78: ​
Line 79:   [31m[1mError message[22m[39m
Line 80:   Command failed with exit code 1: npm run build
Line 81: ​
Line 82:   [31m[1mError location[22m[39m
Line 83:   In Build command from Netlify app:
Line 84:   npm run build
Line 85: ​
Line 86:   [31m[1mResolved config[22m[39m
Line 87:   build:
Line 88:     command: npm run build
Line 89:     commandOrigin: ui
Line 90:     publish: /opt/build/repo/dist
Line 91:     publishOrigin: ui
Line 92: Failed during stage 'building site': Build script returned non-zero exit code: 2
Line 93: Build failed due to a user error: Build script returned non-zero exit code: 2
Line 94: Failing build: Failed to build site
Line 95: Finished processing build request in 15.061s