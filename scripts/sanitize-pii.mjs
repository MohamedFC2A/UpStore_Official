import fs from 'fs';
import path from 'path';

console.log('🛡️ Starting Complete PII Sanitization & Anonymization Engine...');

// 1. Sanitize ProductDetailClient.tsx
const prodDetailPath = 'src/app/product/[slug]/ProductDetailClient.tsx';
if (fs.existsSync(prodDetailPath)) {
  let c = fs.readFileSync(prodDetailPath, 'utf-8');
  c = c.replace(/username:\s*isAr\s*\?\s*['"]محمد إبراهيم['"]\s*:\s*['"]Mohamed_Ibrahim['"]/g, "username: isAr ? 'كريم أحمد' : 'Karim_A'");
  fs.writeFileSync(prodDetailPath, c, 'utf-8');
  console.log('✅ Sanitized ProductDetailClient.tsx');
}

// 2. Sanitize AdShowcaseClient.tsx
const adShowcasePath = 'src/app/ad/AdShowcaseClient.tsx';
if (fs.existsSync(adShowcasePath)) {
  let c = fs.readFileSync(adShowcasePath, 'utf-8');
  c = c.replace(/name:\s*['"]محمد ع\.['"]/g, "name: 'سعد القحطاني'");
  fs.writeFileSync(adShowcasePath, c, 'utf-8');
  console.log('✅ Sanitized AdShowcaseClient.tsx');
}

// 3. Sanitize live-sale trigger
const liveSalePath = 'src/app/api/live-sale/trigger/route.ts';
if (fs.existsSync(liveSalePath)) {
  let c = fs.readFileSync(liveSalePath, 'utf-8');
  c = c.replace(/'محمد ع\.',/g, "'كريم خ.',");
  fs.writeFileSync(liveSalePath, c, 'utf-8');
  console.log('✅ Sanitized live-sale/trigger/route.ts');
}

// 4. Sanitize LocaleContext.tsx
const localePath = 'src/context/LocaleContext.tsx';
if (fs.existsSync(localePath)) {
  let c = fs.readFileSync(localePath, 'utf-8');
  c = c.replace(/name:\s*['"]محمد العتيبي['"]/g, "name: 'سلطان العتيبي'");
  fs.writeFileSync(localePath, c, 'utf-8');
  console.log('✅ Sanitized LocaleContext.tsx');
}

// 5. Sanitize Admin Tab placeholder
const notifTabPath = 'src/components/admin/tabs/AdminNotificationsTab.tsx';
if (fs.existsSync(notifTabPath)) {
  let c = fs.readFileSync(notifTabPath, 'utf-8');
  c = c.replace(/MohamedFC2A\/UpStore/g, 'UpStore_Official/UpStore');
  fs.writeFileSync(notifTabPath, c, 'utf-8');
  console.log('✅ Sanitized AdminNotificationsTab.tsx');
}

// 6. Sanitize admin github-sync & admin page default repo
const ghSyncPath = 'src/app/api/admin/github-sync/route.ts';
if (fs.existsSync(ghSyncPath)) {
  let c = fs.readFileSync(ghSyncPath, 'utf-8');
  c = c.replace(/const DEFAULT_REPO = 'MohamedFC2A\/UpStore';/g, "const DEFAULT_REPO = process.env.GITHUB_REPO || 'UpStore_Official/UpStore';");
  fs.writeFileSync(ghSyncPath, c, 'utf-8');
  console.log('✅ Sanitized github-sync/route.ts');
}

const adminPagePath = 'src/app/admin/page.tsx';
if (fs.existsSync(adminPagePath)) {
  let c = fs.readFileSync(adminPagePath, 'utf-8');
  c = c.replace(/useState\('MohamedFC2A\/UpStore'\)/g, "useState('UpStore_Official/UpStore')");
  fs.writeFileSync(adminPagePath, c, 'utf-8');
  console.log('✅ Sanitized admin/page.tsx');
}

// 7. Sanitize VPS scripts
const vpsScripts = [
  'scripts/check-status.mjs',
  'scripts/check-vps-git.mjs',
  'scripts/deploy-to-vps.mjs',
  'scripts/init-vps-git.mjs',
  'scripts/inspect-vps.mjs',
  'scripts/sync-bot-to-vps.mjs',
  'scripts/vps-exec.mjs',
];

for (const s of vpsScripts) {
  if (fs.existsSync(s)) {
    let c = fs.readFileSync(s, 'utf-8');
    c = c.replace(/const VPS_PASS = 'Mohamedgg2008#';/g, "const VPS_PASS = process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#';");
    c = c.replace(/password: 'Mohamedgg2008#',/g, "password: process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#',");
    fs.writeFileSync(s, c, 'utf-8');
    console.log(`✅ Sanitized ${s}`);
  }
}

// 8. Sanitize storeI18n.mjs (Remove any local cash references or phone references)
const i18nPath = 'scripts/storeI18n.mjs';
if (fs.existsSync(i18nPath)) {
  let c = fs.readFileSync(i18nPath, 'utf-8');
  
  // Clean submit_txid_prompt_desc in all languages
  c = c.replace(/• <b>أو رقم الهاتف \(في حال الدفع المحلي كفودافون كاش أو إنستاباي\)<\/b>/g, '• <b>أو معرّف التحويل / رمز المعاملة في منصتك المعتمدة</b>');
  c = c.replace(/• <b>Sender Phone Number \(for local payment methods\)<\/b>/g, '• <b>Sender Transfer ID / Transaction Hash</b>');
  c = c.replace(/• <b>Número de teléfono remitente \(para pagos locales\)<\/b>/g, '• <b>ID de transferencia o hash del remitente</b>');
  c = c.replace(/• <b>Numéro de téléphone expéditeur \(pour paiements locaux\)<\/b>/g, '• <b>ID de virement ou hash de transaction</b>');
  c = c.replace(/• <b>Номер телефона отправителя \(для локальных платежей\)<\/b>/g, '• <b>ID перевода или хеш транзакции отправителя</b>');
  c = c.replace(/• <b>Gönderen telefon numarası \(yerel ödemeler için\)<\/b>/g, '• <b>Gönderen transfer kimliği veya işlem hash kodu</b>');
  c = c.replace(/• <b>Telefonnummer des Absenders \(für lokale Zahlungsmethoden\)<\/b>/g, '• <b>Absender-Transfer-ID oder Transaktions-Hash</b>');

  // Clean local_step in all languages
  c = c.replace(/لإتمام الدفع بالعملات أو المحافظ المحلية \(فودافون كاش، إنستاباي، وغيرها\)، يرجى التواصل مع فريق الدعم @UPSTORE_HELP لتزويدك ببيانات التحويل المباشرة 🤍\./g, 'لإتمام الدفع عبر القنوات المعتمدة، يرجى التواصل مع فريق الدعم الرسمي @UPSTORE_HELP لتزويدك بالتفاصيل المباشرة 🤍.');
  c = c.replace(/To complete payment via local methods or mobile wallets \(Vodafone Cash, InstaPay, etc\.\), please contact Support @UPSTORE_HELP for direct details 🤍\./g, 'To complete payment via verified official methods, please contact Support @UPSTORE_HELP for direct details 🤍.');
  
  fs.writeFileSync(i18nPath, c, 'utf-8');
  console.log('✅ Sanitized storeI18n.mjs');
}

// 9. Sanitize telegram-support-bot.mjs
const botPath = 'scripts/telegram-support-bot.mjs';
if (fs.existsSync(botPath)) {
  let c = fs.readFileSync(botPath, 'utf-8');
  c = c.replace(/• 📱 <b>طرق الدفع المحلية:<\/b> عبر التواصل مع الدعم الفني @UPSTORE_HELP/g, '• 👨‍💻 <b>خدمة العملاء الرسمية:</b> @UPSTORE_HELP متواجد 24/7');
  fs.writeFileSync(botPath, c, 'utf-8');
  console.log('✅ Sanitized telegram-support-bot.mjs');
}

console.log('🎉 PII Sanitization Completed Successfully!');
