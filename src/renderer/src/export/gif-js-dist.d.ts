// @types/gif.js only types the bare "gif.js" specifier, but that package's main entry
// (index.js) does NOT export the GIF class — only "gif.js/dist/gif.js" does (see gifEncoder.ts
// for why we import the dist file directly). Re-declare the subpath against the same types.
declare module 'gif.js/dist/gif.js' {
  import GIF = require('gif.js')
  export = GIF
}
