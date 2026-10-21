<?php
/**
 * Zomi Translator - automatic website sync for cPanel (zomitranslator.com).
 *
 * Mirrors the official site (https://zomilanguage.rork.app) into public_html
 * whenever a new version is published there. Safe to run often: it does
 * nothing until the published version changes.
 *
 * Run from a cPanel Cron Job (every 15 minutes), for example:
 *   /usr/local/bin/php /home/YOUR_CPANEL_USER/public_html/zomi-sync.php
 *
 * Every file is checked against its SHA-256 fingerprint before anything is
 * replaced; if any download fails, the live site is left untouched.
 * This file updates itself together with the site.
 */

declare(strict_types=1);

const ZOMI_STATE_FILE = '.zomi-site-state.json';
const ZOMI_LOCK_FILE = '.zomi-sync.lock';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

define('ZOMI_SOURCE', rtrim((string) (getenv('ZOMI_SOURCE') ?: 'https://zomilanguage.rork.app'), '/'));
$target = rtrim((string) (getenv('ZOMI_TARGET') ?: __DIR__), '/');
$force = in_array('--force', $argv ?? [], true);

function out(string $msg): void
{
    fwrite(STDOUT, '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL);
}

function fail(string $msg): void
{
    fwrite(STDERR, '[' . date('Y-m-d H:i:s') . '] ERROR: ' . $msg . PHP_EOL);
    exit(1);
}

function fetch(string $url): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_USERAGENT => 'ZomiSync/1.0',
            CURLOPT_HTTPHEADER => ['Cache-Control: no-cache'],
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false || $code !== 200) {
            throw new RuntimeException("$url -> HTTP $code $err");
        }
        return (string) $body;
    }
    $ctx = stream_context_create(['http' => [
        'timeout' => 120,
        'header' => "User-Agent: ZomiSync/1.0\r\nCache-Control: no-cache\r\n",
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    $status = isset($http_response_header[0]) ? $http_response_header[0] : '';
    if ($body === false || strpos($status, ' 200') === false) {
        throw new RuntimeException("$url -> $status");
    }
    return $body;
}

function safe_path(string $p): bool
{
    return $p !== ''
        && preg_match('#^[A-Za-z0-9._\-/]+$#', $p) === 1
        && strpos($p, '..') === false
        && $p[0] !== '/'
        && strpos($p, '.zomi-') !== 0;
}

function clear_dir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) ?: [] as $f) {
        if ($f !== '.' && $f !== '..') {
            @unlink("$dir/$f");
        }
    }
    @rmdir($dir);
}

if (!is_dir($target) || !is_writable($target)) {
    fail("Target folder is not writable: $target");
}

$lock = fopen("$target/" . ZOMI_LOCK_FILE, 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    out('Another sync is running. Skipping.');
    exit(0);
}

try {
    $manifest = json_decode(fetch(ZOMI_SOURCE . '/site-manifest.json?t=' . time()), true);
} catch (Throwable $e) {
    fail('Could not read the published site: ' . $e->getMessage());
}
if (!is_array($manifest) || !isset($manifest['version'], $manifest['files']) || !is_array($manifest['files'])) {
    fail('The published site manifest is not valid.');
}

$state = [];
if (is_file("$target/" . ZOMI_STATE_FILE)) {
    $state = json_decode((string) file_get_contents("$target/" . ZOMI_STATE_FILE), true) ?: [];
}
$version = (string) $manifest['version'];
if (!$force && ($state['version'] ?? '') === $version) {
    out("Up to date ($version).");
    exit(0);
}

out('New version ' . $version . ' found (was ' . ($state['version'] ?? 'none') . '). Downloading...');

// 1. Download everything into a staging folder and verify it.
$staging = "$target/.zomi-staging";
clear_dir($staging);
mkdir($staging, 0755, true);

$plan = []; // installed path => staged file
foreach ($manifest['files'] as $f) {
    if (!is_array($f)) {
        fail('The published site manifest is not valid.');
    }
    $src = (string) ($f['path'] ?? '');
    $dest = (string) ($f['as'] ?? $src);
    $sha = strtolower((string) ($f['sha256'] ?? ''));
    if (!safe_path($src) || !safe_path(ltrim($dest, '.') ?: 'x') || strlen($sha) !== 64) {
        fail("Unsafe or invalid entry in manifest: $src");
    }
    $staged = "$staging/" . md5($dest);
    $existing = "$target/$dest";
    if (is_file($existing) && hash_file('sha256', $existing) === $sha) {
        copy($existing, $staged);
    } else {
        try {
            $body = fetch(ZOMI_SOURCE . '/' . str_replace('%2F', '/', rawurlencode($src)));
        } catch (Throwable $e) {
            clear_dir($staging);
            fail('Download failed, live site unchanged: ' . $e->getMessage());
        }
        if (hash('sha256', $body) !== $sha) {
            clear_dir($staging);
            fail("Checksum mismatch for $src, live site unchanged.");
        }
        file_put_contents($staged, $body);
    }
    $plan[$dest] = $staged;
}

// 2. Install: assets first, index.html last so visitors never get a page whose files are missing.
uksort($plan, static function (string $a, string $b): int {
    return ($a === 'index.html') <=> ($b === 'index.html') ?: strcmp($a, $b);
});
foreach ($plan as $dest => $staged) {
    $final = "$target/$dest";
    $dir = dirname($final);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (!rename($staged, $final)) {
        fail("Could not write $dest");
    }
    @chmod($final, 0644);
}

// 3. Remove files from the previous version that are gone now (only files this script installed).
$removed = 0;
foreach (($state['files'] ?? []) as $old) {
    if (is_string($old) && !isset($plan[$old]) && safe_path(ltrim($old, '.') ?: 'x') && is_file("$target/$old")) {
        @unlink("$target/$old");
        $removed++;
    }
}

clear_dir($staging);
file_put_contents("$target/" . ZOMI_STATE_FILE, json_encode([
    'version' => $version,
    'builtAt' => $manifest['builtAt'] ?? null,
    'syncedAt' => date('c'),
    'files' => array_keys($plan),
], JSON_PRETTY_PRINT));

out('Installed ' . count($plan) . " files, removed $removed old files. zomitranslator.com now runs $version.");
