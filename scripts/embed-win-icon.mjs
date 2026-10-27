/**
 * embed-win-icon.mjs
 *
 * Electrobun ビルド直後に launcher.exe へアプリアイコンを埋め込みます。
 *
 * 背景:
 *   Electrobun は `build.win.icon` 設定を rcedit で launcher.exe へ埋め込もうと
 *   しますが、パス解決バグ（CI ビルド時の絶対パス参照）により失敗します。
 *   結果としてタスクバー / ウィンドウ / Explorer に Bun のロゴが表示されます。
 *
 * 処理:
 *   1. `build/<channel>-win-x64/<app>/bin/launcher.exe` を特定
 *   2. rcedit で assets/icon.ico + バージョン情報を埋め込み
 *   3. Resources/*.tar.zst を再パッケージ（自動アップデート配信分に反映）
 *
 * 実行: node scripts/embed-win-icon.mjs [channel]
 *       （package.json の desktop:build:canary 等に組み込み済み）
 */
import {
  cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const channel = process.env.CHANNEL ?? process.argv[2] ?? 'canary'
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version

const buildPlatformDir = join(root, 'build', `${channel}-win-x64`)
if (!existsSync(buildPlatformDir)) {
  // Linux / macOS ビルドでは何もしない（Windows ディレクトリが無い）。
  console.log(`[embed-win-icon] ${buildPlatformDir} が無いためスキップ（非 Windows ビルド）`)
  process.exit(0)
}

const inner = readdirSync(buildPlatformDir).find((n) => statSync(join(buildPlatformDir, n)).isDirectory())
if (!inner) {
  console.warn('[embed-win-icon] build ディレクトリ内にアプリバンドルが見つかりません。スキップ。')
  process.exit(0)
}

const appDir = join(buildPlatformDir, inner)
const iconIco = join(root, 'assets', 'icon.ico')

let launcherTarget = join(appDir, 'bin', 'launcher.exe')
let needsTempExt = false

if (!existsSync(launcherTarget)) {
  const noExt = join(appDir, 'bin', 'launcher')
  if (existsSync(noExt)) {
    launcherTarget = noExt
    needsTempExt = true
  }
}

if (!existsSync(launcherTarget)) {
  console.warn(`[embed-win-icon] launcher が見つかりません: ${launcherTarget}`)
  process.exit(0)
}
if (!existsSync(iconIco)) {
  console.warn('[embed-win-icon] assets/icon.ico がありません。先に npm run icons を実行してください。')
  process.exit(1)
}

// --- 1. launcher.exe へアイコン/バージョン情報を埋め込み ---
try {
  const { rcedit } = await import('rcedit')
  const pathToPatch = needsTempExt ? `${launcherTarget}.exe` : launcherTarget
  if (needsTempExt) {
    cpSync(launcherTarget, pathToPatch)
  }

  await rcedit(pathToPatch, {
    icon: iconIco,
    'version-string': {
      FileDescription: 'KIE STUDIO',
      ProductName: 'KIE STUDIO',
      CompanyName: 'KIE STUDIO',
      OriginalFilename: 'launcher.exe',
    },
    'file-version': version,
    'product-version': version,
  })

  if (needsTempExt) {
    cpSync(pathToPatch, launcherTarget)
  }
  console.log('[embed-win-icon] launcher へアイコン/バージョン情報を埋め込み済み')

  // Setup.exe にもアイコンを埋め込み
  const setupExes = readdirSync(buildPlatformDir).filter((f) => f.endsWith('.exe'))
  for (const sExe of setupExes) {
    try {
      await rcedit(join(buildPlatformDir, sExe), { icon: iconIco })
      console.log(`[embed-win-icon] ${sExe} へアイコン埋め込み済み`)
    } catch {
      // ignore
    }
  }
} catch (err) {
  console.warn(`[embed-win-icon] rcedit 失敗（ビルドは続行）: ${err.message}`)
  process.exit(0)
}

// --- 2. tar.zst を再パッケージ（自動アップデート配信分にアイコン反映） ---
const resDir = join(appDir, 'Resources')
if (!existsSync(resDir)) {
  console.log('[embed-win-icon] Resources/ が無いため tar.zst 再パッケージをスキップ')
  process.exit(0)
}
const zstName = readdirSync(resDir).find((f) => f.endsWith('.tar.zst'))
if (!zstName) {
  console.log('[embed-win-icon] tar.zst が無いため再パッケージをスキップ')
  process.exit(0)
}

const zigCandidates = [
  join(root, 'node_modules', 'electrobun', 'dist-win-x64', 'zig-zstd.exe'),
  join(root, 'installer', 'win', 'staging', 'bin', 'zig-zstd.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'ai.kie.studio', channel, 'app', 'bin', 'zig-zstd.exe'),
]
const zigZstd = zigCandidates.find(existsSync)

const zstPath = join(resDir, zstName)
const tmp = mkdtempSync(join(tmpdir(), 'kie-icon-repack-'))
try {
  // 展開
  try {
    execSync(`tar -xf "${zstPath}" -C "${tmp}"`, { stdio: 'pipe' })
  } catch {
    if (!zigZstd) {
      console.warn('[embed-win-icon] tar.zst 展開に失敗し zig-zstd もありません。再パッケージをスキップ。')
      process.exit(0)
    }
    const tarFile = join(tmp, 'payload.tar')
    execSync(`"${zigZstd}" decompress -i "${zstPath}" -o "${tarFile}" --no-timing`, { stdio: 'pipe' })
    execSync(`tar -xf "${tarFile}" -C "${tmp}"`, { stdio: 'pipe' })
  }

  // 展開されたツリー内の launcher.exe へアイコン埋め込み
  const topEntries = readdirSync(tmp).filter((n) => n !== 'payload.tar')
  if (topEntries.length === 1) {
    const innerLauncher = join(tmp, topEntries[0], 'bin', 'launcher.exe')
    if (existsSync(innerLauncher)) {
      try {
        const { rcedit } = await import('rcedit')
        await rcedit(innerLauncher, {
          icon: iconIco,
          'version-string': {
            FileDescription: 'KIE STUDIO',
            ProductName: 'KIE STUDIO',
            CompanyName: 'KIE STUDIO',
            OriginalFilename: 'launcher.exe',
          },
          'file-version': version,
          'product-version': version,
        })
        console.log('[embed-win-icon] tar.zst 内の launcher.exe をパッチ済みバイナリで置換')
      } catch (err) {
        console.warn(`[embed-win-icon] tar.zst 内の launcher.exe へのアイコン埋め込み失敗: ${err.message}`)
      }
    }
  }

  // 再圧縮（.tar.zst）
  const tarOut = join(tmp, 'repack.tar')
  if (topEntries.length === 1) {
    execSync(`tar -cf "${tarOut}" -C "${tmp}" "${topEntries[0]}"`, { stdio: 'pipe' })
  } else {
    execSync(`tar -cf "${tarOut}" -C "${tmp}" .`, { stdio: 'pipe' })
  }

  // zstd 圧縮: zig-zstd をプライマリ、tar.exe をフォールバックとする。
  let repacked = false
  if (zigZstd) {
    try {
      execSync(`"${zigZstd}" compress -i "${tarOut}" -o "${zstPath}" --no-timing`, { stdio: 'pipe' })
      repacked = true
    } catch { /* フォールバックへ */ }
  }
  if (!repacked) {
    try {
      execSync(`tar -cf "${zstPath}" --zstd -C "${repackSrc}" .`, { stdio: 'pipe' })
      repacked = true
    } catch { /* 最終フォールバック */ }
  }
  if (!repacked) {
    console.warn('[embed-win-icon] tar.zst 再圧縮に失敗。')
  }

  // artifacts/ にも同名ファイルがあれば同期
  const artifactsZst = join(root, 'artifacts', zstName)
  if (existsSync(artifactsZst)) {
    cpSync(zstPath, artifactsZst, { force: true })
    console.log(`[embed-win-icon] artifacts/${zstName} へ同期済み`)
  }

  console.log('[embed-win-icon] tar.zst 再パッケージ完了')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
