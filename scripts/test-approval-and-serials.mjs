import { generate16DigitSerial } from './telegram-support-bot.mjs';

console.log('🧪 Testing 16-digit serial key generator...');
for (let i = 0; i < 5; i++) {
  const serial = generate16DigitSerial();
  const digitsOnly = serial.replace(/-/g, '');
  console.log(`  Serial ${i + 1}: ${serial} (Length: ${digitsOnly.length} digits, Valid format: ${/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(serial)})`);
  if (!/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(serial) || digitsOnly.length !== 16) {
    throw new Error(`Invalid serial generated: ${serial}`);
  }
}

console.log('✅ 16-digit serial generation is 100% verified.');
