/**
 * CANONICAL PATHS & SYSTEM CONSTANTS
 * Single source of truth for all storage paths, vaults, and file names.
 * Prevents path drift, arbitrary folder creation, or relative path mismatches.
 */

const path = require('path');
const fs = require('fs');

const MCP_ROOT = 'C:\\mcp';
const ENGINE_ROOT = 'C:\\mcp\\job-search-mcp-engine';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getScreenshotsVault(dateStr = getTodayString(), shift = 'shift1') {
  const vault = path.join(ENGINE_ROOT, 'screenshots', dateStr, shift);
  if (!fs.existsSync(vault)) {
    fs.mkdirSync(vault, { recursive: true });
  }
  return vault;
}

const CANONICAL_PATHS = {
  MCP_ROOT,
  ENGINE_ROOT,
  BRAVE_EXE: 'C:\\Users\\LENOVO\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  CDP_PORT: 9222,
  CDP_URL: 'http://127.0.0.1:9222',
  RESUMES_DIR: path.join(ENGINE_ROOT, 'resumes'),
  PROFILE_FILE: fs.existsSync(path.join(ENGINE_ROOT, 'data', 'candidate', 'candidate_screening_profile.json'))
    ? path.join(ENGINE_ROOT, 'data', 'candidate', 'candidate_screening_profile.json')
    : path.join(ENGINE_ROOT, 'candidate_screening_profile.json'),
  
  // Daily 5-File Architecture (resolves root or data/ folder dynamically)
  getFile3Today: (dateStr = getTodayString()) => {
    const rootPath = path.join(ENGINE_ROOT, `total_todays_${dateStr}.json`);
    if (fs.existsSync(rootPath)) return rootPath;
    const cleanPath = path.join(ENGINE_ROOT, 'data', 'daily', `total_todays_${dateStr}.json`);
    return fs.existsSync(cleanPath) ? cleanPath : rootPath;
  },
  getFile4Verified: (dateStr = getTodayString()) => {
    const rootPath = path.join(ENGINE_ROOT, `verified_todays_${dateStr}.json`);
    if (fs.existsSync(rootPath)) return rootPath;
    const cleanPath = path.join(ENGINE_ROOT, 'data', 'daily', `verified_todays_${dateStr}.json`);
    return fs.existsSync(cleanPath) ? cleanPath : rootPath;
  },
  getFile5Applied: (dateStr = getTodayString()) => {
    const rootPath = path.join(ENGINE_ROOT, `applied_todays_${dateStr}.json`);
    if (fs.existsSync(rootPath)) return rootPath;
    const cleanPath = path.join(ENGINE_ROOT, 'data', 'daily', `applied_todays_${dateStr}.json`);
    return fs.existsSync(cleanPath) ? cleanPath : rootPath;
  },
  getFile1Historical: () => {
    const rootPath = path.join(ENGINE_ROOT, 'total_historical_except_today.json');
    if (fs.existsSync(rootPath)) return rootPath;
    const cleanPath = path.join(ENGINE_ROOT, 'data', 'historical', 'total_historical_except_today.json');
    return fs.existsSync(cleanPath) ? cleanPath : rootPath;
  },
  getFile2LifetimeApplied: () => {
    const rootPath = path.join(ENGINE_ROOT, 'applied_lifetime_except_today.json');
    if (fs.existsSync(rootPath)) return rootPath;
    const cleanPath = path.join(ENGINE_ROOT, 'data', 'historical', 'applied_lifetime_except_today.json');
    return fs.existsSync(cleanPath) ? cleanPath : rootPath;
  }
};

module.exports = {
  CANONICAL_PATHS,
  getScreenshotsVault,
  getTodayString
};
