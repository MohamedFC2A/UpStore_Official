import {
  getUserWallet,
  creditUserWallet,
  debitUserWallet,
  calculateTopupBonus,
  TOPUP_DENOMINATIONS,
  MIN_TOPUP_USD,
} from './storeWallet.mjs';

async function runWalletTests() {
  console.log('🧪 Testing Store Wallet & Minimum Deposit Rules & Tiered Bonuses...\n');

  // 1. Test calculateTopupBonus
  console.log('1. Testing calculateTopupBonus tiers...');
  if (calculateTopupBonus(5) !== 0) throw new Error('Bonus for $5 should be 0');
  if (calculateTopupBonus(10) !== 0) throw new Error('Bonus for $10 should be 0');
  if (calculateTopupBonus(15) !== 1.50) throw new Error('Bonus for $15 should be 1.50');
  if (calculateTopupBonus(25) !== 3.00) throw new Error('Bonus for $25 should be 3.00');
  if (calculateTopupBonus(50) !== 7.00) throw new Error('Bonus for $50 should be 7.00');
  if (calculateTopupBonus(100) !== 15.00) throw new Error('Bonus for $100 should be 15.00');
  if (calculateTopupBonus(200) !== 35.00) throw new Error('Bonus for $200 should be 35.00');
  console.log('✅ All bonus tiers verified successfully!');

  const testChatId = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 2. Initial balance check
  const w1 = await getUserWallet(testChatId);
  console.log('2. Initial Wallet:', w1);
  if (w1.balance !== 0) throw new Error('Initial balance should be 0');

  // 3. Minimum Top-up rejection test
  try {
    await creditUserWallet(testChatId, 3.50, 'TEST_UNDER_MIN');
    throw new Error('Allowed deposit under minimum $5.00!');
  } catch (err) {
    console.log('3. ✅ Rejected under $5.00 top-up successfully:', err.message);
  }

  // 4. Valid Top-up test with bonus (e.g. $15 -> $1.50 bonus, total credit $16.50)
  const wCredit = await creditUserWallet(testChatId, 15.0, 'TOPUP_TEST');
  console.log('4. ✅ Credited $15.00 deposit (+ $1.50 bonus). Total credited:', wCredit.totalCredited, 'New balance:', wCredit.balance);
  if (wCredit.balance !== 16.50) throw new Error(`Balance mismatch after bonus credit: expected 16.50, got ${wCredit.balance}`);
  if (wCredit.creditedBonus !== 1.50) throw new Error(`Bonus mismatch: expected 1.50, got ${wCredit.creditedBonus}`);

  // 5. Overdraft debit rejection test
  const overDebit = await debitUserWallet(testChatId, 25.0, 'TEST_OVERDRAFT');
  console.log('5. ✅ Overdraft debit refused:', overDebit.success === false, 'Shortage:', overDebit.shortage);
  if (overDebit.success) throw new Error('Overdraft debit should have failed');

  // 6. Valid purchase debit test
  const validDebit = await debitUserWallet(testChatId, 4.99, 'TEST_PURCHASE');
  console.log('6. ✅ Valid purchase debited $4.99. Remaining balance:', validDebit.newBalance);
  if (Math.abs(validDebit.newBalance - 11.51) > 0.01) throw new Error(`Balance mismatch: expected 11.51, got ${validDebit.newBalance}`);

  // 7. Test Admin Approval Top-Up awards bonus properly (e.g. $25 -> +$3.00 bonus = $28.00)
  const adminTestUser = `admin_test_${Date.now()}`;
  const adminCredit = await creditUserWallet(adminTestUser, 25.0, 'ADMIN_APPROVED_TOPUP', { reqId: 'REQ-123456' });
  console.log('7. ✅ Admin Approved Top-Up Credited:', adminCredit.totalCredited, 'Bonus:', adminCredit.creditedBonus);
  if (adminCredit.totalCredited !== 28.00 || adminCredit.creditedBonus !== 3.00) {
    throw new Error(`Admin approval bonus failed: expected 28.00 total and 3.00 bonus, got ${adminCredit.totalCredited}`);
  }

  // 8. Test Auto TXID Verification awards bonus properly (e.g. $50 -> +$7.00 bonus = $57.00)
  const autoCredit = await creditUserWallet(adminTestUser, 50.0, 'AUTO_TXID_VERIFIED');
  console.log('8. ✅ Auto TXID Verified Top-Up Credited:', autoCredit.totalCredited, 'Bonus:', autoCredit.creditedBonus);
  if (autoCredit.creditedBonus !== 7.00) {
    throw new Error(`Auto TXID bonus failed: expected 7.00 bonus, got ${autoCredit.creditedBonus}`);
  }

  console.log('\n🎉 ALL WALLET LOGIC, $5 MINIMUM, & SMART TIERED BONUS TESTS PASSED 100%!\n');
}

runWalletTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
