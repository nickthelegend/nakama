/**
 * Globals Hermes lacks, installed before @mysten/sui loads.
 * - crypto.getRandomValues: Ed25519 key generation draws from it (backed by expo-crypto's native CSPRNG).
 * - TextEncoder/TextDecoder and Buffer: used by BCS and base64 helpers.
 */
import 'fast-text-encoding';
import * as ExpoCrypto from 'expo-crypto';
import { Buffer } from 'buffer';

const g = globalThis as any;
if (!g.crypto) g.crypto = {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => ExpoCrypto.getRandomValues(array as any) as T;
}
if (typeof g.Buffer === 'undefined') g.Buffer = Buffer;

export {};
