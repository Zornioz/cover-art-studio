// Builds the Windows portable .exe and NSIS installer into release/.
//
// electron-builder's own exe-editing step (winCodeSign) extracts an archive containing
// symlinks, which fails on Windows without admin rights / Developer Mode. To avoid that
// we build the unpacked app without that step, set icon + version info with rcedit
// ourselves, and then package the prepackaged folder.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import rcedit from 'rcedit'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const unpacked = 'release/win-unpacked'
const exe = `${unpacked}/CoverArt Studio.exe`

function run(args) {
  const result = spawnSync('npx', ['electron-builder', ...args, '-c.win.signAndEditExecutable=false'], {
    stdio: 'inherit',
    shell: true
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['--win', '--dir'])

await rcedit(exe, {
  icon: 'resources/icon.ico',
  'version-string': {
    ProductName: 'CoverArt Studio',
    FileDescription: 'CoverArt Studio',
    CompanyName: pkg.author,
    OriginalFilename: 'CoverArt Studio.exe'
  },
  'file-version': pkg.version,
  'product-version': pkg.version
})

run(['--win', '--prepackaged', unpacked])
