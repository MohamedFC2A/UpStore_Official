/**
 * storeWallet.mjs — Resilient Wallet & Credit Balance Engine for UpStore Telegram Bot
 * 
 * Features:
 * - Dual persistence (Local disk `user_wallets.json` + Supabase `site_settings`)
 * - Minimum top-up enforcement: $5.00 USDT / 250 EGP / 20 SAR
 * - Integrates referral earnings + direct recharges
 * - Atomic credit and debit operations with audit history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = path.join(__dirname, 'user_wallets.json');

export const MIN_TOPUP_USD = 5.0;
export const MIN_TOPUP_EGP = 250;
export const MIN_TOPUP_SAR = 20;

// In-memory wallet store: Map<chatId, { balance: number, totalRecharged: number, totalSpent: number, transactions: [] }>
const wallets = new Map();

export function loadWalletsFromDisk() {
  try {
    if (fs.existsSync(WALLET_FILE)) {
      const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
      for (const [chatId, record] of Object.entries(data)) {
        wallets.set(String(chatId), {
          balance: Number(record.balance) || 0,
          totalRecharged: Number(record.totalRecharged) || 0,
          totalSpent: Number(record.totalSpent) || 0,
          transactions: Array.isArray(record.transactions) ? record.transactions : [],
          updatedAt: record.updatedAt || new Date().toISOString(),
        });
      }
      console.log(`[StoreWallet] Loaded ${wallets.size} wallets from disk.`);
    }
  } catch (err) {
    console.warn('[StoreWallet] Error loading wallets from disk:', err.message);
  }
}

export function saveWalletsToDisk() {
  try {
    const obj = {};
    for (const [chatId, record] of wallets.entries()) {
      obj[chatId] = record;
    }
    fs.writeFileSync(WALLET_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[StoreWallet] Error saving wallets to disk:', err.message);
  }
}

// Load initially
loadWalletsFromDisk();

/**
 * Get user wallet data.
 */
export async function getUserWallet(chatId, supabaseClient = null) {
  const idStr = String(chatId);
  let record = wallets.get(idStr);

  if (!record && supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('site_settings')
        .select('value')
        .eq('key', `tg_wallet_${idStr}`)
        .single();
      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        record = {
          balance: Number(parsed.balance) || 0,
          totalRecharged: Number(parsed.totalRecharged) || 0,
          totalSpent: Number(parsed.totalSpent) || 0,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        wallets.set(idStr, record);
        saveWalletsToDisk();
      }
    } catch {}
  }

  if (!record) {
    record = {
      balance: 0.0,
      totalRecharged: 0.0,
      totalSpent: 0.0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    wallets.set(idStr, record);
  }

  return {
    chatId: idStr,
    balance: Number(record.balance.toFixed(2)),
    totalRecharged: Number(record.totalRecharged.toFixed(2)),
    totalSpent: Number(record.totalSpent.toFixed(2)),
    transactions: record.transactions,
  };
}

/**
 * Credit user wallet (top-up, refund, or bonus).
 */
export async function creditUserWallet(chatId, amount, reason = 'TOPUP', meta = {}, supabaseClient = null) {
  const idStr = String(chatId);
  const numAmount = Math.max(0, Number(amount) || 0);
  if (numAmount <= 0) return await getUserWallet(idStr, supabaseClient);

  // Enforce minimum top-up amount for deposits/recharges ($5.00)
  const isExempt = ['REFUND', 'BONUS', 'ADMIN_ADJUST', 'REFERRAL_REWARD'].includes(reason.toUpperCase());
  if (!isExempt && numAmount < MIN_TOPUP_USD) {
    throw new Error(`Minimum top-up amount is $${MIN_TOPUP_USD.toFixed(2)} USD (received $${numAmount.toFixed(2)})`);
  }

  const wallet = await getUserWallet(idStr, supabaseClient);
  wallet.balance = Number((wallet.balance + numAmount).toFixed(2));
  wallet.totalRecharged = Number((wallet.totalRecharged + numAmount).toFixed(2));
  wallet.transactions.unshift({
    id: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'CREDIT',
    amount: numAmount,
    reason,
    meta,
    timestamp: new Date().toISOString(),
  });
  if (wallet.transactions.length > 50) wallet.transactions.pop();

  wallets.set(idStr, {
    balance: wallet.balance,
    totalRecharged: wallet.totalRecharged,
    totalSpent: wallet.totalSpent,
    transactions: wallet.transactions,
    updatedAt: new Date().toISOString(),
  });
  saveWalletsToDisk();

  if (supabaseClient) {
    try {
      await supabaseClient.from('site_settings').upsert({
        key: `tg_wallet_${idStr}`,
        value: JSON.stringify(wallets.get(idStr)),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[StoreWallet Supabase Upsert Warning]:', err.message);
    }
  }

  return wallet;
}

/**
 * Debit user wallet (purchase deduction).
 * Returns { success: boolean, wallet: object, error?: string }
 */
export async function debitUserWallet(chatId, amount, reason = 'PURCHASE', meta = {}, supabaseClient = null) {
  const idStr = String(chatId);
  const numAmount = Math.max(0, Number(amount) || 0);

  const wallet = await getUserWallet(idStr, supabaseClient);
  if (wallet.balance < numAmount) {
    return {
      success: false,
      wallet,
      error: 'INSUFFICIENT_BALANCE',
      required: numAmount,
      shortage: Number((numAmount - wallet.balance).toFixed(2)),
    };
  }

  wallet.balance = Number((wallet.balance - numAmount).toFixed(2));
  wallet.totalSpent = Number((wallet.totalSpent + numAmount).toFixed(2));
  wallet.transactions.unshift({
    id: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'DEBIT',
    amount: numAmount,
    reason,
    meta,
    timestamp: new Date().toISOString(),
  });
  if (wallet.transactions.length > 50) wallet.transactions.pop();

  wallets.set(idStr, {
    balance: wallet.balance,
    totalRecharged: wallet.totalRecharged,
    totalSpent: wallet.totalSpent,
    transactions: wallet.transactions,
    updatedAt: new Date().toISOString(),
  });
  saveWalletsToDisk();

  if (supabaseClient) {
    try {
      await supabaseClient.from('site_settings').upsert({
        key: `tg_wallet_${idStr}`,
        value: JSON.stringify(wallets.get(idStr)),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[StoreWallet Supabase Upsert Warning]:', err.message);
    }
  }

  return {
    success: true,
    wallet,
    newBalance: wallet.balance,
  };
}
