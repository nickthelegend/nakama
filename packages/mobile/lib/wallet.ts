import * as SecureStore from 'expo-secure-store';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';

/**
 * The in-app wallet: one Sui Ed25519 key, created on this phone and kept in the OS keystore (expo-secure-store).
 * The secret leaves this module only through revealSecret(), which only the backup screen calls
 * after the owner confirms. Nothing here logs it.
 */
const KEY = 'nakama.wallet.v1';
const OPTS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let cached: Ed25519Keypair | null = null;

export async function loadWallet(): Promise<string | null> {
  const secret = await SecureStore.getItemAsync(KEY, OPTS);
  if (!secret) return null;
  cached = Ed25519Keypair.fromSecretKey(secret);
  return cached.toSuiAddress();
}

export async function createWallet(): Promise<string> {
  const kp = Ed25519Keypair.generate();
  await SecureStore.setItemAsync(KEY, kp.getSecretKey(), OPTS);
  cached = kp;
  return kp.toSuiAddress();
}

/** Signs the exact transaction bytes the server built for this address. Returns base64 bytes and signature for /execute. */
export async function signTransactionBytes(base64: string): Promise<{ bytes: string; signature: string }> {
  if (!cached) throw Error('Wallet not loaded');
  return cached.signTransaction(fromBase64(base64));
}

/** Only for the backup screen, after the owner taps "Reveal". */
export async function revealSecret(): Promise<string> {
  const secret = await SecureStore.getItemAsync(KEY, OPTS);
  if (!secret) throw Error('No wallet on this phone');
  return secret;
}
