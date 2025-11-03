/**
 * File Hash Utilities
 * For duplicate book detection
 */

import crypto from "crypto";

/**
 * Calculate MD5 hash of file buffer
 * Fast and sufficient for duplicate detection
 */
export function calculateFileHash(buffer: Buffer): string {
  const hash = crypto.createHash("md5");
  hash.update(buffer);
  return hash.digest("hex");
}

/**
 * Calculate SHA-256 hash (more secure, slower)
 * Use for content-based deduplication
 */
export function calculateSHA256Hash(buffer: Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

/**
 * Calculate hash of text content
 * For content-based duplicate detection
 */
export function calculateContentHash(text: string): string {
  const hash = crypto.createHash("md5");
  // Normalize text: lowercase, remove extra whitespace
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  hash.update(normalized);
  return hash.digest("hex");
}

/**
 * Check if two hashes match
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}
