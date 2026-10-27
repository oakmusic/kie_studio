/**
 * build-win-portable.mjs
 *
 * Electrobun の Windows ビルド成果物からポータブル版 (ZIP) を生成します。
 * インストール不要で解凍後すぐに起動でき、データ (studio.db / media / catalog) は
 * ポータブルフォルダ内の `data/` に完結して保持されます。
 *
 * 処理:
 *   1. `installer/win/staging` (または tar.zst 展開) からアプリ本体ツリーを取得。
 *   2. ポータブル用ツリー `KIE STUDIO/` を構築:
 *      - `KIE STUDIO.exe`: csc.exe でビルドしたネイティブ GUI ランチャー (アイコン/バージョン埋込)
 *      - `KIE STUDIO.cmd`: コマンドライン実行用フォールバック
 *      - `portable.flag`: ポータブル認識用フラグ
 *      - `data/`: SQLite DB / 設定 / メディア用ローカル保存先
 *      - `bin/`, `Resources/`, `lib/`, `Info.plist`
 *   3. `tar -a -cf` で ZIP 化し、`release/<channel>-win-x64-KIESTUDIO-Portable.zip` を出力。
 *
 * 実行: node scripts/build-win-portable.mjs [channel]
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const channel = process.env.CHANNEL ?? process.argv[2] ?? 'stable'
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version

console.log(`[win-portable] Building Windows portable edition (channel: ${channel}, version: ${version})...`)

const stagingDir = join(root, 'installer', 'win', 'staging')
const buildPlatformDir = join(root, 'build', `${channel}-win-x64`)
const iconIco = join(root, 'assets', 'icon.ico')
const releaseDir = join(root, 'release')
const artifactsDir = join(root, 'artifacts')

mkdirSync(releaseDir, { recursive: true })

let sourceTree = ''
let tempExtractDir = ''

// --- 1. アプリツリーの調達 ---
if (existsSync(join(stagingDir, 'bin', 'launcher.exe')) && existsSync(join(stagingDir, 'Resources', 'version.json'))) {
  console.log(`[win-portable] Using prepared staging tree: ${stagingDir}`)
  sourceTree = stagingDir
} else {
  if (!existsSync(buildPlatformDir)) {
    console.error(`[win-portable] ${buildPlatformDir} が見つかりません。先に electrobun build を実行してください。`)
    process.exit(1)
  }
  const inner = readdirSync(buildPlatformDir).find((n) => statSync(join(buildPlatformDir, n)).isDirectory())
  if (!inner) throw new Error(`[win-portable] ${buildPlatformDir} 下にアプリバンドル dir がありません。`)
  const resDir = join(buildPlatformDir, inner, 'Resources')
  const zstName = readdirSync(resDir).find((f) => f.endsWith('.tar.zst'))
  if (!zstName) throw new Error(`[win-portable] ${resDir} 下に *.tar.zst がありません。`)
  const zstPath = join(resDir, zstName)

  tempExtractDir = mkdtempSync(join(tmpdir(), 'kie-portable-extract-'))
  console.log(`[win-portable] Extracting ${zstPath}...`)
  try {
    execSync(`tar -xf "${zstPath}" -C "${tempExtractDir}"`, { stdio: 'inherit' })
  } catch {
    const zigCandidates = [
      join(root, 'node_modules', 'electrobun', 'dist-win-x64', 'zig-zstd.exe'),
      join(process.env.LOCALAPPDATA ?? '', 'ai.kie.studio', channel, 'app', 'bin', 'zig-zstd.exe'),
    ]
    const zigZstd = zigCandidates.find(existsSync)
    if (!zigZstd) throw new Error('[win-portable] tar 展開に失敗し、zig-zstd フォールバックもありません。')
    const tarFile = join(tempExtractDir, 'payload.tar')
    execSync(`"${zigZstd}" decompress -i "${zstPath}" -o "${tarFile}" --no-timing`, { stdio: 'inherit' })
    execSync(`tar -xf "${tarFile}" -C "${tempExtractDir}"`, { stdio: 'inherit' })
  }

  const topEntries = readdirSync(tempExtractDir).filter((n) => n !== 'payload.tar')
  sourceTree =
    topEntries.length === 1 && statSync(join(tempExtractDir, topEntries[0])).isDirectory()
      ? join(tempExtractDir, topEntries[0])
      : tempExtractDir
}

// --- 2. ポータブルパッケージの構築 ---
const workTemp = mkdtempSync(join(tmpdir(), 'kie-portable-pkg-'))
const portableAppDir = join(workTemp, 'KIE STUDIO')
mkdirSync(portableAppDir, { recursive: true })

try {
  // アプリツリーをコピー
  const entries = ['bin', 'Resources', 'lib', 'Info.plist']
  for (const entry of entries) {
    const src = join(sourceTree, entry)
    if (existsSync(src)) {
      cpSync(src, join(portableAppDir, entry), { recursive: true })
    }
  }

  // launcher.exe / bun.exe へアイコン/バージョン情報を埋め込み
  if (existsSync(iconIco)) {
    try {
      const { rcedit } = await import('rcedit')
      for (const exeName of ['launcher.exe', 'bun.exe']) {
        const targetExe = join(portableAppDir, 'bin', exeName)
        if (existsSync(targetExe)) {
          await rcedit(targetExe, {
            icon: iconIco,
            'version-string': {
              FileDescription: 'KIE STUDIO',
              ProductName: 'KIE STUDIO',
              CompanyName: 'KIE STUDIO',
              OriginalFilename: exeName,
            },
            'file-version': version,
            'product-version': version,
          })
          console.log(`[win-portable] ${exeName} へアイコン/バージョン情報を埋め込み済み`)
        }
      }
      cpSync(iconIco, join(portableAppDir, 'app.ico'), { force: true })
      cpSync(iconIco, join(portableAppDir, 'bin', 'app.ico'), { force: true })
    } catch (err) {
      console.warn(`[win-portable] アイコン埋め込み失敗: ${err.message}`)
    }
  }

  // ポータブル用ローカル data ディレクトリ
  const dataDir = join(portableAppDir, 'data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, '.gitkeep'), '', 'utf8')

  // ポータブル識別フラグ
  writeFileSync(
    join(portableAppDir, 'portable.flag'),
    `version=${version}\nchannel=${channel}\nportable=1\n`,
    'utf8',
  )

  // 説明用テキスト
  const readmeContent = `=====================================================
  KIE STUDIO - Portable Edition (Windows x64)
  Version: ${version} (${channel})
=====================================================

How to run:
  Double-click "KIE STUDIO.exe" (or "KIE STUDIO.cmd").

Features:
  - 100% portable: No installation or administrator rights required.
  - Isolated storage: All database records, generated media, personas,
    and settings are stored locally in the "data\\" folder.
  - Safe to carry on USB sticks or external drives.
`
  writeFileSync(join(portableAppDir, 'README_PORTABLE.txt'), readmeContent, 'utf8')

  // cmd フォールバック
  const cmdContent = `@echo off
setlocal
cd /d "%~dp0"
set STUDIO_PORTABLE=1
set "STUDIO_APP_DIR=%~dp0"
set "STUDIO_BIN_DIR=%~dp0bin"
set "STUDIO_PORTABLE_DIR=%~dp0"
if not exist "data" mkdir "data"
start "" "%~dp0bin\\launcher.exe" %*
endlocal
`
  writeFileSync(join(portableAppDir, 'KIE STUDIO.cmd'), cmdContent, 'utf8')

  // --- 2.5 C# 製 GUI ランチャーのコンパイル (KIE STUDIO.exe) ---
  const cscCandidates = [
    join(process.env.WINDIR ?? 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    join(process.env.WINDIR ?? 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
  ]
  let csc = cscCandidates.find(existsSync)
  if (!csc) {
    try {
      csc = execSync('where csc', { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
    } catch {
      csc = undefined
    }
  }

  const outExe = join(portableAppDir, 'KIE STUDIO.exe')
  if (csc && existsSync(csc)) {
    const csCode = `using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("KIE STUDIO")]
[assembly: AssemblyProduct("KIE STUDIO")]
[assembly: AssemblyDescription("KIE STUDIO Portable")]
[assembly: AssemblyCompany("KIE STUDIO")]
[assembly: AssemblyVersion("${version}.0")]
[assembly: AssemblyFileVersion("${version}.0")]

class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string launcherPath = Path.Combine(baseDir, "bin", "launcher.exe");

            if (!File.Exists(launcherPath))
            {
                launcherPath = Path.Combine(baseDir, "launcher.exe");
            }

            if (!File.Exists(launcherPath))
            {
                MessageBox.Show(
                    "Could not find bin\\\\launcher.exe.\\nPlease ensure the application was extracted properly.",
                    "KIE STUDIO",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return 1;
            }

            string dataDir = Path.Combine(baseDir, "data");
            if (!Directory.Exists(dataDir))
            {
                Directory.CreateDirectory(dataDir);
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = launcherPath;
            psi.WorkingDirectory = Path.GetDirectoryName(launcherPath);
            psi.UseShellExecute = false;
            psi.EnvironmentVariables["STUDIO_PORTABLE"] = "1";
            psi.EnvironmentVariables["STUDIO_APP_DIR"] = baseDir;
            psi.EnvironmentVariables["STUDIO_BIN_DIR"] = Path.GetDirectoryName(launcherPath);
            psi.EnvironmentVariables["STUDIO_PORTABLE_DIR"] = baseDir;

            if (args != null && args.Length > 0)
            {
                string[] quoted = new string[args.Length];
                for (int i = 0; i < args.Length; i++)
                {
                    quoted[i] = args[i].Contains(" ") ? "\\"" + args[i] + "\\"" : args[i];
                }
                psi.Arguments = string.Join(" ", quoted);
            }

            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Failed to launch KIE STUDIO:\\n\\n" + ex.Message,
                "KIE STUDIO",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return 1;
        }
    }
}
`
    const csFile = join(workTemp, 'Launcher.cs')
    writeFileSync(csFile, csCode, 'utf8')
    const iconFlag = existsSync(iconIco) ? `"/win32icon:${iconIco}"` : ''
    try {
      execSync(`"${csc}" /nologo /target:winexe ${iconFlag} /out:"${outExe}" "${csFile}"`, {
        stdio: 'inherit',
      })
      console.log(`[win-portable] Compiled native GUI launcher: ${outExe}`)
    } catch (err) {
      console.warn(`[win-portable] Failed to compile C# launcher: ${err.message}`)
    }
  } else {
    console.warn('[win-portable] csc.exe not found; portable bundle will rely on KIE STUDIO.cmd and bin/launcher.exe.')
  }

  // --- 3. ZIP パッケージ化 ---
  const zipName = `${channel}-win-x64-KIESTUDIO-Portable.zip`
  const targetZip = join(releaseDir, zipName)

  if (existsSync(targetZip)) {
    rmSync(targetZip, { force: true })
  }

  console.log(`[win-portable] Creating archive: ${targetZip}...`)
  execSync(`tar -a -cf "${targetZip}" -C "${workTemp}" "KIE STUDIO"`, { stdio: 'inherit' })

  const zipStat = statSync(targetZip)
  console.log(`[win-portable] Successfully created ${zipName} (${(zipStat.size / 1024 / 1024).toFixed(2)} MB)`)

  // 便利用バージョン明記ファイル (例: KIESTUDIO-1.0.23-win-x64-portable.zip)
  const friendlyZipName = `KIESTUDIO-${version}-win-x64-portable.zip`
  const friendlyZip = join(releaseDir, friendlyZipName)
  cpSync(targetZip, friendlyZip, { force: true })
  console.log(`[win-portable] Copied to ${friendlyZipName}`)

  if (existsSync(artifactsDir)) {
    cpSync(targetZip, join(artifactsDir, zipName), { force: true })
    cpSync(targetZip, join(artifactsDir, friendlyZipName), { force: true })
    console.log(`[win-portable] Synced to artifacts/`)
  }
} finally {
  rmSync(workTemp, { recursive: true, force: true })
  if (tempExtractDir) rmSync(tempExtractDir, { recursive: true, force: true })
}
