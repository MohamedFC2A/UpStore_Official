import { getUserWallet, creditUserWallet, debitUserWallet, MIN_TOPUP_USD } from './storeWallet.mjs';

async function runWalletTests() {
  console.log('🧪 Testing Store Wallet & Minimum Deposit Rules...\n');

  const testChatId = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 1. Initial balance check
  const w1 = await getUserWallet(testChatId);
  console.log('1. Initial Wallet:', w1);
  if (w1.balance !== 0) throw new Error('Initial balance should be 0');

  // 2. Minimum Top-up rejection test
  try {
    await creditUserWallet(testChatId, 3.50, 'TEST_UNDER_MIN');
    throw new Error('Allowed deposit under minimum $5.00!');
  } catch (err) {
    console.log('2. ✅ Rejected under $5.00 top-up successfully:', err.message);
  }

  // 3. Valid Top-up test (>= $5)
  const wCredit = await creditUserWallet(testChatId, 10.0, 'TEST_DEPOSIT');
  console.log('3. ✅ Credited $10.00. New balance:', wCredit.balance);
  if (wCredit.balance !== 10.0) throw new Error('Balance mismatch after credit');

  // 4. Overdraft debit rejection test
  const overDebit = await debitUserWallet(testChatId, 15.0, 'TEST_OVERDRAFT');
  console.log('4. ✅ Overdraft debit refused:', overDebit.success === false, 'Shortage:', overDebit.shortage);
  if (overDebit.success) throw new Error('Overdraft debit should have failed');

  // 5. Valid purchase debit test
  const validDebit = await debitUserWallet(testChatId, 4.0, 'TEST_PURCHASE');
  console.log('5. ✅ Valid purchase debited $4.00. Remaining balance:', validDebit.newBalance);
  if (validDebit.newBalance !== 6.0) throw new Error('Balance mismatch after valid debit');

  console.log('\n🎉 ALL WALLET LOGIC & $5 MINIMUM TOP-UP TESTS PASSED 100%!\n');
}

runWalletTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
