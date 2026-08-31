export interface ArabPaymentMethod {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'wallet' | 'bank' | 'instant_transfer';
  badgeAr?: string;
  badgeEn?: string;
  providerIcon?: string;
}

export interface ArabCountryConfig {
  code: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  flagUrl: string;
  currencyCode: string;
  currencyNameAr: string;
  currencyNameEn: string;
  popularMethods: ArabPaymentMethod[];
}

export const ARAB_COUNTRIES_PAYMENT_DATA: ArabCountryConfig[] = [
  {
    code: 'SA',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    flag: '🇸🇦',
    flagUrl: 'https://flagcdn.com/w80/sa.png',
    currencyCode: 'SAR',
    currencyNameAr: 'ريال سعودي',
    currencyNameEn: 'SAR',
    popularMethods: [
      { id: 'sa_stc', nameAr: 'محفظة STC Pay', nameEn: 'STC Pay Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'sa_urpay', nameAr: 'محفظة يورباي الراجحي (UrPay)', nameEn: 'UrPay Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'sa_tiqmo', nameAr: 'محفظة تيقمو الرقمية (Tiqmo)', nameEn: 'Tiqmo Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sa_mobily', nameAr: 'محفظة موبايلي باي (Mobily Pay)', nameEn: 'Mobily Pay', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sa_alinma', nameAr: 'محفظة الإنماء باي (Alinma Pay)', nameEn: 'Alinma Pay', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sa_sarie', nameAr: 'نظام سريع للتحويل اللحظي (Sarie)', nameEn: 'Sarie Instant Transfer', type: 'instant_transfer', badgeAr: 'تحويل لحظي', badgeEn: 'Instant' },
      { id: 'sa_rajhi', nameAr: 'تحويل مصرف الراجحي (IBAN)', nameEn: 'Al Rajhi Bank Transfer (IBAN)', type: 'bank', badgeAr: 'آيبان مباشر', badgeEn: 'IBAN' },
      { id: 'sa_snb', nameAr: 'تحويل البنك الأهلي السعودي (SNB)', nameEn: 'SNB Bank Transfer (IBAN)', type: 'bank', badgeAr: 'آيبان مباشر', badgeEn: 'IBAN' },
      { id: 'sa_riyad', nameAr: 'تحويل بنك الرياض (Riyad Bank)', nameEn: 'Riyad Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'sa_d360', nameAr: 'بنك D360 الرقمي', nameEn: 'D360 Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
    ],
  },
  {
    code: 'AE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    flag: '🇦🇪',
    flagUrl: 'https://flagcdn.com/w80/ae.png',
    currencyCode: 'AED',
    currencyNameAr: 'درهم إماراتي',
    currencyNameEn: 'AED',
    popularMethods: [
      { id: 'ae_aani', nameAr: 'منظومة آني للتحويل الفوري (Aani)', nameEn: 'Aani Instant Payments', type: 'instant_transfer', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'ae_careem', nameAr: 'محفظة كريم باي (Careem Pay)', nameEn: 'Careem Pay Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'ae_emoney', nameAr: 'محفظة اتصالات (e& money)', nameEn: 'e& money Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ae_botim', nameAr: 'محفظة بوتيم باي (Botim Pay)', nameEn: 'Botim Pay Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ae_wio', nameAr: 'بنك ويو الرقمي (Wio Personal)', nameEn: 'Wio Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'ae_liv', nameAr: 'بنك ليف الرقمي (Liv. by ENBD)', nameEn: 'Liv. Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'ae_enbd', nameAr: 'تحويل بنك الإمارات دبي الوطني (ENBD)', nameEn: 'Emirates NBD IBAN', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ae_adcb', nameAr: 'تحويل بنك أبوظبي التجاري (ADCB)', nameEn: 'ADCB Bank IBAN', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ae_fab', nameAr: 'تحويل بنك أبوظبي الأول (FAB)', nameEn: 'FAB Bank IBAN', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ae_mashreq', nameAr: 'تحويل بنك المشرق (Mashreq Bank)', nameEn: 'Mashreq Bank IBAN', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'KW',
    nameAr: 'دولة الكويت',
    nameEn: 'Kuwait',
    flag: '🇰🇼',
    flagUrl: 'https://flagcdn.com/w80/kw.png',
    currencyCode: 'KWD',
    currencyNameAr: 'دينار كويتي',
    currencyNameEn: 'KWD',
    popularMethods: [
      { id: 'kw_wafy', nameAr: 'محفظة وافي الرقمية (Wafy)', nameEn: 'Wafy Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'kw_weyay', nameAr: 'بنك وياي الوطني الرقمي (Weyay)', nameEn: 'Weyay Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'kw_ooredoo', nameAr: 'محفظة أوريدو الكويت (Ooredoo Cash)', nameEn: 'Ooredoo Cash KW', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'kw_zain', nameAr: 'محفظة زين كاش الكويت (Zain Cash)', nameEn: 'Zain Cash KW', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'kw_nbk', nameAr: 'تحويل بنك الكويت الوطني (NBK IBAN)', nameEn: 'NBK Transfer (IBAN)', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'kw_kfh', nameAr: 'تحويل بيت التمويل الكويتي (KFH بيتك)', nameEn: 'KFH Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'kw_boubyan', nameAr: 'تحويل بنك بوبيان (Boubyan Bank)', nameEn: 'Boubyan Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'kw_gulf', nameAr: 'تحويل بنك الخليج (Gulf Bank)', nameEn: 'Gulf Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'QA',
    nameAr: 'دولة قطر',
    nameEn: 'Qatar',
    flag: '🇶🇦',
    flagUrl: 'https://flagcdn.com/w80/qa.png',
    currencyCode: 'QAR',
    currencyNameAr: 'ريال قطري',
    currencyNameEn: 'QAR',
    popularMethods: [
      { id: 'qa_fawran', nameAr: 'نظام فوراً للتحويل الفوري (Fawran)', nameEn: 'Fawran Instant Transfer', type: 'instant_transfer', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'qa_ooredoo', nameAr: 'محفظة أوريدو موني (Ooredoo Money)', nameEn: 'Ooredoo Money Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'qa_ipay', nameAr: 'محفظة فودافون آي باي (Vodafone iPay)', nameEn: 'Vodafone iPay Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'qa_qnb', nameAr: 'تحويل بنك قطر الوطني (QNB IBAN)', nameEn: 'QNB Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'qa_qib', nameAr: 'تحويل مصرف قطر الإسلامي (QIB)', nameEn: 'QIB Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'qa_cbq', nameAr: 'تحويل البنك التجاري القطري (CBQ Transfer)', nameEn: 'CBQ Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'qa_rayan', nameAr: 'تحويل مصرف الريان (Masraf Al Rayan)', nameEn: 'Masraf Al Rayan', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'OM',
    nameAr: 'سلطنة عُمان',
    nameEn: 'Oman',
    flag: '🇴🇲',
    flagUrl: 'https://flagcdn.com/w80/om.png',
    currencyCode: 'OMR',
    currencyNameAr: 'ريال عماني',
    currencyNameEn: 'OMR',
    popularMethods: [
      { id: 'om_thawani', nameAr: 'محفظة ثواني الذكية (Thawani Pay)', nameEn: 'Thawani Pay Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'om_payplus', nameAr: 'محفظة باي بلس عُمانتل (PayPlus)', nameEn: 'PayPlus Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'om_ooredoo', nameAr: 'محفظة أوريدو موني عُمان (Ooredoo Oman)', nameEn: 'Ooredoo Money Oman', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'om_mpgs', nameAr: 'نظام المقاصة اللحظي بالجوال (MPClear)', nameEn: 'MPClear Mobile Transfer', type: 'instant_transfer', badgeAr: 'تحويل لحظي', badgeEn: 'Instant' },
      { id: 'om_muscat', nameAr: 'تحويل بنك مسقط (Bank Muscat IBAN)', nameEn: 'Bank Muscat Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'om_dhofar', nameAr: 'تحويل بنك ظفار (Bank Dhofar)', nameEn: 'Bank Dhofar Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'om_nbo', nameAr: 'تحويل البنك الوطني العماني (NBO)', nameEn: 'NBO Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'om_sohar', nameAr: 'تحويل بنك صحار الدولي (Sohar International)', nameEn: 'Sohar International', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'BH',
    nameAr: 'مملكة البحرين',
    nameEn: 'Bahrain',
    flag: '🇧🇭',
    flagUrl: 'https://flagcdn.com/w80/bh.png',
    currencyCode: 'BHD',
    currencyNameAr: 'دينار بحريني',
    currencyNameEn: 'BHD',
    popularMethods: [
      { id: 'bh_benefit', nameAr: 'بنفت باي تحويل فوري (BenefitPay / Fawri+)', nameEn: 'BenefitPay Fawri+', type: 'instant_transfer', badgeAr: 'فوري 0%', badgeEn: 'Instant' },
      { id: 'bh_stc', nameAr: 'محفظة إس تي سي باي البحرين (stc pay)', nameEn: 'stc pay Bahrain', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'bh_ila', nameAr: 'بنك إلى الرقمي (ila Digital Bank)', nameEn: 'ila Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'bh_nbb', nameAr: 'تحويل بنك البحرين الوطني (NBB IBAN)', nameEn: 'NBB Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'bh_bbk', nameAr: 'تحويل بنك البحرين والكويت (BBK)', nameEn: 'BBK Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'bh_salam', nameAr: 'تحويل بنك السلام (Al Salam Bank)', nameEn: 'Al Salam Bank', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'bh_bisb', nameAr: 'تحويل بنك البحرين الإسلامي (BisB)', nameEn: 'BisB Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'EG',
    nameAr: 'جمهورية مصر العربية',
    nameEn: 'Egypt',
    flag: '🇪🇬',
    flagUrl: 'https://flagcdn.com/w80/eg.png',
    currencyCode: 'EGP',
    currencyNameAr: 'جنيه مصري',
    currencyNameEn: 'EGP',
    popularMethods: [
      { id: 'eg_instapay', nameAr: 'إنستاباي - تحويل لحظي IPN (InstaPay)', nameEn: 'InstaPay Egypt (IPN)', type: 'instant_transfer', badgeAr: 'لحظي 0%', badgeEn: 'Instant' },
      { id: 'eg_vodafone', nameAr: 'محفظة فودافون كاش (Vodafone Cash)', nameEn: 'Vodafone Cash Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'eg_orange', nameAr: 'محفظة أورنج كاش (Orange Cash)', nameEn: 'Orange Cash Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'eg_etisalat', nameAr: 'محفظة اتصالات كاش (Etisalat Cash)', nameEn: 'Etisalat Cash Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'eg_we', nameAr: 'محفظة وي باي (WE Pay)', nameEn: 'WE Pay Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'eg_telda', nameAr: 'تطبيق تيلدا المالي (Telda)', nameEn: 'Telda App', type: 'wallet', badgeAr: 'تطبيق مالي', badgeEn: 'Fintech' },
      { id: 'eg_fawry', nameAr: 'فوري كاش / إيداع فوري (Fawry)', nameEn: 'Fawry Direct Deposit', type: 'instant_transfer', badgeAr: 'إيداع فوري', badgeEn: 'Instant' },
      { id: 'eg_nbe', nameAr: 'تحويل البنك الأهلي المصري (NBE IBAN)', nameEn: 'NBE Bank Transfer (IBAN)', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'eg_misr', nameAr: 'تحويل بنك مصر (Banque Misr IBAN)', nameEn: 'Banque Misr Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'eg_cib', nameAr: 'تحويل البنك التجاري الدولي (CIB IBAN)', nameEn: 'CIB Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'JO',
    nameAr: 'المملكة الأردنية الهاشمية',
    nameEn: 'Jordan',
    flag: '🇯🇴',
    flagUrl: 'https://flagcdn.com/w80/jo.png',
    currencyCode: 'JOD',
    currencyNameAr: 'دينار أردني',
    currencyNameEn: 'JOD',
    popularMethods: [
      { id: 'jo_cliq', nameAr: 'نظام كليك للتحويل الفوري (CliQ)', nameEn: 'CliQ Instant Transfer', type: 'instant_transfer', badgeAr: 'تحويل لحظي', badgeEn: 'Instant' },
      { id: 'jo_zain', nameAr: 'محفظة زين كاش الأردن (Zain Cash JO)', nameEn: 'Zain Cash Jordan', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'jo_orange', nameAr: 'محفظة أورنج موني الأردن (Orange Money)', nameEn: 'Orange Money Jordan', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'jo_uwallet', nameAr: 'محفظة يوووليت أمنية (UWallet)', nameEn: 'UWallet Umniah', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'jo_dinarak', nameAr: 'محفظة دينارك (Dinarak)', nameEn: 'Dinarak Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'jo_reflect', nameAr: 'بنك ريفلكت الرقمي (Reflect Bank)', nameEn: 'Reflect Digital Bank', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'jo_arab', nameAr: 'تحويل البنك العربي (Arab Bank IBAN)', nameEn: 'Arab Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'jo_housing', nameAr: 'تحويل بنك الإسكان (Housing Bank)', nameEn: 'Housing Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'jo_etihad', nameAr: 'تحويل بنك الاتحاد (Bank al Etihad)', nameEn: 'Bank al Etihad Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'IQ',
    nameAr: 'جمهورية العراق',
    nameEn: 'Iraq',
    flag: '🇮🇶',
    flagUrl: 'https://flagcdn.com/w80/iq.png',
    currencyCode: 'IQD',
    currencyNameAr: 'دينار عراقي',
    currencyNameEn: 'IQD',
    popularMethods: [
      { id: 'iq_zain', nameAr: 'محفظة زين كاش العراق (Zain Cash IQ)', nameEn: 'Zain Cash Iraq', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'iq_asia', nameAr: 'محفظة آسيا حوالة (AsiaHawala)', nameEn: 'AsiaHawala Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'iq_fastpay', nameAr: 'محفظة فاست باي (FastPay Iraq)', nameEn: 'FastPay Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'iq_fib', nameAr: 'المصرف العراقي الأول الرقمي (FIB)', nameEn: 'First Iraqi Bank (FIB)', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'iq_neo', nameAr: 'مصرف نيو الرقمي (Neo Bank Iraq)', nameEn: 'Neo Bank Iraq', type: 'bank', badgeAr: 'بنك رقمي', badgeEn: 'Digital Bank' },
      { id: 'iq_nass', nameAr: 'محفظة ناس والت (NassWallet)', nameEn: 'NassWallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'iq_tbi', nameAr: 'تحويل المصرف العراقي للتجارة (TBI)', nameEn: 'Trade Bank of Iraq (TBI)', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'iq_baghdad', nameAr: 'تحويل مصرف بغداد (Bank of Baghdad)', nameEn: 'Bank of Baghdad', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'DZ',
    nameAr: 'الجمهورية الجزائرية',
    nameEn: 'Algeria',
    flag: '🇩🇿',
    flagUrl: 'https://flagcdn.com/w80/dz.png',
    currencyCode: 'DZD',
    currencyNameAr: 'دينار جزائري',
    currencyNameEn: 'DZD',
    popularMethods: [
      { id: 'dz_baridi', nameAr: 'تطبيق بريدي موب (BaridiMob - CCP)', nameEn: 'BaridiMob (Algérie Poste)', type: 'instant_transfer', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'dz_ccp', nameAr: 'حساب البريد الجاري CCP (CCP Transfer)', nameEn: 'CCP Postal Account', type: 'bank', badgeAr: 'بريد جاري', badgeEn: 'CCP' },
      { id: 'dz_paysera', nameAr: 'تحويل بايسيرا الجزائر (Paysera Local)', nameEn: 'Paysera DZ Local', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'dz_bna', nameAr: 'تحويل البنك الوطني الجزائري (BNA)', nameEn: 'BNA Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'dz_bea', nameAr: 'تحويل بنك الجزائر الخارجي (BEA)', nameEn: 'BEA Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'dz_cpa', nameAr: 'تحويل القرض الشعبي الجزائري (CPA)', nameEn: 'CPA Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'dz_baraka', nameAr: 'تحويل بنك البركة الجزائري (Al Baraka DZ)', nameEn: 'Al Baraka Bank DZ', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'MA',
    nameAr: 'المملكة المغربية',
    nameEn: 'Morocco',
    flag: '🇲🇦',
    flagUrl: 'https://flagcdn.com/w80/ma.png',
    currencyCode: 'MAD',
    currencyNameAr: 'درهم مغربي',
    currencyNameEn: 'MAD',
    popularMethods: [
      { id: 'ma_cashplus', nameAr: 'محفظة كاش بلوس (Cash Plus)', nameEn: 'Cash Plus Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'ma_wafacash', nameAr: 'محفظة وفاكاش جيبي (Wafacash Jibi)', nameEn: 'Wafacash Jibi Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ma_cih', nameAr: 'تحويل بنك CIH (CIH Bank Transfer)', nameEn: 'CIH Bank Transfer', type: 'bank', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'ma_barid', nameAr: 'بريد بنك موبيل (Barid Bank Mobile)', nameEn: 'Barid Bank Mobile', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'App' },
      { id: 'ma_attijari', nameAr: 'التجاري وفا بنك (Attijariwafa Bank)', nameEn: 'Attijariwafa Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ma_chaabi', nameAr: 'تحويل البنك الشعبي (Banque Populaire)', nameEn: 'Banque Populaire Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ma_bmce', nameAr: 'تحويل بنك أفريقيا BMCE (Bank of Africa)', nameEn: 'BMCE Bank of Africa', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ma_orange', nameAr: 'محفظة أورنج موني المغرب (Orange Money)', nameEn: 'Orange Money Morocco', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ma_inwi', nameAr: 'محفظة إنوي موني (Inwi Money)', nameEn: 'Inwi Money Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
    ],
  },
  {
    code: 'TN',
    nameAr: 'الجمهورية التونسية',
    nameEn: 'Tunisia',
    flag: '🇹🇳',
    flagUrl: 'https://flagcdn.com/w80/tn.png',
    currencyCode: 'TND',
    currencyNameAr: 'دينار تونسي',
    currencyNameEn: 'TND',
    popularMethods: [
      { id: 'tn_flouci', nameAr: 'محفظة فلوسي الرقمية (Flouci App)', nameEn: 'Flouci Digital Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'tn_d17', nameAr: 'تطبيق D17 البريد التونسي (D17 La Poste)', nameEn: 'D17 La Poste Tunisienne', type: 'instant_transfer', badgeAr: 'بريد فوري', badgeEn: 'Instant' },
      { id: 'tn_sobflous', nameAr: 'محفظة صب فلوس (Sobflous)', nameEn: 'Sobflous Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'tn_biat', nameAr: 'تحويل بنك تونس العربي الدولي (BIAT)', nameEn: 'BIAT Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'tn_attijari', nameAr: 'تحويل التجاري بنك تونس (Attijari Bank)', nameEn: 'Attijari Bank Tunisia', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'tn_amen', nameAr: 'تحويل أمان بنك (Amen Bank)', nameEn: 'Amen Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'tn_zitouna', nameAr: 'تحويل بنك الزيتونة (Banque Zitouna)', nameEn: 'Banque Zitouna Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'LY',
    nameAr: 'دولة ليبيا',
    nameEn: 'Libya',
    flag: '🇱🇾',
    flagUrl: 'https://flagcdn.com/w80/ly.png',
    currencyCode: 'LYD',
    currencyNameAr: 'دينار ليبي',
    currencyNameEn: 'LYD',
    popularMethods: [
      { id: 'ly_sadad', nameAr: 'محفظة سداد الإلكترونية (Sadad Pay)', nameEn: 'Sadad Pay Libya', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'ly_mobicash', nameAr: 'خدمة موبي كاش مصرف الوحدة (MobiCash)', nameEn: 'MobiCash Wahda Bank', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ly_yusr', nameAr: 'خدمة يسر باي مصرف الجمهورية (Yusr Pay)', nameEn: 'Yusr Pay Jumhouria Bank', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ly_aman', nameAr: 'أمان موبايل مصرف الأمان (Aman Mobile)', nameEn: 'Aman Mobile Bank', type: 'bank', badgeAr: 'تطبيق مصرفي', badgeEn: 'Bank App' },
      { id: 'ly_moamalat', nameAr: 'تطبيق معاملات للمدفوعات (Moamalat)', nameEn: 'Moamalat App', type: 'instant_transfer', badgeAr: 'دفع فوري', badgeEn: 'Instant' },
      { id: 'ly_nab', nameAr: 'تحويل مصرف شمال أفريقيا (North Africa Bank)', nameEn: 'North Africa Bank Transfer', type: 'bank', badgeAr: 'تحويل مصرفي', badgeEn: 'Bank' },
      { id: 'ly_bcdx', nameAr: 'تحويل مصرف التجارة والتنمية (BCDX)', nameEn: 'Commerce & Development Bank', type: 'bank', badgeAr: 'تحويل مصرفي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'SD',
    nameAr: 'جمهورية السودان',
    nameEn: 'Sudan',
    flag: '🇸🇩',
    flagUrl: 'https://flagcdn.com/w80/sd.png',
    currencyCode: 'SDG',
    currencyNameAr: 'جنيه سوداني',
    currencyNameEn: 'SDG',
    popularMethods: [
      { id: 'sd_bankak', nameAr: 'تطبيق بنكك - بنك الخرطوم (Bankak)', nameEn: 'Bankak (Bank of Khartoum)', type: 'instant_transfer', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'sd_fawry', nameAr: 'تطبيق فوري - بنك فيصل الإسلامي (Fawry)', nameEn: 'Fawry (Faisal Islamic Bank)', type: 'instant_transfer', badgeAr: 'تحويل فوري', badgeEn: 'Instant' },
      { id: 'sd_okash', nameAr: 'تطبيق أوكاش - بنك أمدرمان (O-Cash ONB)', nameEn: 'O-Cash (Omdurman National)', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sd_sayir', nameAr: 'تطبيق ساير - بنك البركة السوداني', nameEn: 'Sayir (Al Baraka Sudan)', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank' },
      { id: 'sd_balad', nameAr: 'تطبيق بلد موبايل - بنك البلد (Balad)', nameEn: 'Balad Mobile App', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'YE',
    nameAr: 'الجمهورية اليمنية',
    nameEn: 'Yemen',
    flag: '🇾🇪',
    flagUrl: 'https://flagcdn.com/w80/ye.png',
    currencyCode: 'YER',
    currencyNameAr: 'ريال يمني',
    currencyNameEn: 'YER',
    popularMethods: [
      { id: 'ye_kuraimi', nameAr: 'جيب الكريمي - بنك الكريمي (Jayeeb Kuraimi)', nameEn: 'Kuraimi Jayeeb Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'ye_floosak', nameAr: 'محفظة فلوسك - كاك بنك (Floosak CAC)', nameEn: 'Floosak Wallet CAC', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ye_jawwali', nameAr: 'محفظة جوالي - بنك اليمن والكويت (Jawali)', nameEn: 'Jawali Wallet YKB', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ye_onecash', nameAr: 'محفظة ون كاش (OneCash)', nameEn: 'OneCash Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ye_pyes', nameAr: 'محفظة بايس - بنك الأمل (PYES Al-Amal)', nameEn: 'PYES Wallet Al-Amal', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ye_transfer', nameAr: 'حوالة الكريمي والنجم المباشرة', nameEn: 'Kuraimi / Al Najm Transfer', type: 'instant_transfer', badgeAr: 'حوالة سريعة', badgeEn: 'Transfer' },
      { id: 'ye_tadhamon', nameAr: 'تحويل بنك التضامن الإسلامي (Tadhamon)', nameEn: 'Tadhamon Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'LB',
    nameAr: 'الجمهورية اللبنانية',
    nameEn: 'Lebanon',
    flag: '🇱🇧',
    flagUrl: 'https://flagcdn.com/w80/lb.png',
    currencyCode: 'USD',
    currencyNameAr: 'دولار أمريكي / ليرة',
    currencyNameEn: 'USD / LBP',
    popularMethods: [
      { id: 'lb_whish', nameAr: 'محفظة ويش موني (Whish Money App)', nameEn: 'Whish Money Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'lb_omt', nameAr: 'محفظة OMT باي (OMT Pay Wallet)', nameEn: 'OMT Pay Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'lb_bob', nameAr: 'بوب فاينانس - بنك بيروت (BoB Finance)', nameEn: 'BoB Finance Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'lb_suyool', nameAr: 'محفظة سيول الرقمية (Suyool App)', nameEn: 'Suyool Digital App', type: 'wallet', badgeAr: 'محفظة رقمية', badgeEn: 'Fintech' },
      { id: 'lb_purpl', nameAr: 'محفظة بيربل (Purpl Digital Wallet)', nameEn: 'Purpl Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'lb_cashunited', nameAr: 'كاش يونايتد (Cash United Transfer)', nameEn: 'Cash United Transfer', type: 'instant_transfer', badgeAr: 'حوالة نقدية', badgeEn: 'Cash' },
    ],
  },
  {
    code: 'MR',
    nameAr: 'الجمهورية الإسلامية الموريتانية',
    nameEn: 'Mauritania',
    flag: '🇲🇷',
    flagUrl: 'https://flagcdn.com/w80/mr.png',
    currencyCode: 'MRU',
    currencyNameAr: 'أوقية موريتانية',
    currencyNameEn: 'MRU',
    popularMethods: [
      { id: 'mr_bankily', nameAr: 'تطبيق بنكيلي - البنك الشعبي (Bankily BPM)', nameEn: 'Bankily (BPM)', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'mr_masrvi', nameAr: 'تطبيق مصرفي - بنك BCI (Masrvi)', nameEn: 'Masrvi (BCI Bank)', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'mr_sedad', nameAr: 'محفظة سداد - بريد موريتانيا (Sedad)', nameEn: 'Sedad (Mauripost)', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'mr_click', nameAr: 'تطبيق كليك - بنك باميس (Click BAMIS)', nameEn: 'Click BAMIS Bank', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank' },
      { id: 'mr_amanty', nameAr: 'تطبيق أمانتي - بنك الأمانة (Amanty)', nameEn: 'Amanty Bank App', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'PS',
    nameAr: 'دولة فلسطين',
    nameEn: 'Palestine',
    flag: '🇵🇸',
    flagUrl: 'https://flagcdn.com/w80/ps.png',
    currencyCode: 'ILS',
    currencyNameAr: 'شيكل / دينار / دولار',
    currencyNameEn: 'ILS / JOD / USD',
    popularMethods: [
      { id: 'ps_jawwal', nameAr: 'محفظة جوال باي الفلسطينية (Jawwal Pay)', nameEn: 'Jawwal Pay Palestine', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'ps_palpay', nameAr: 'محفظة بال باي - بنك فلسطين (PalPay)', nameEn: 'PalPay (Bank of Palestine)', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ps_ooredoo', nameAr: 'محفظة أوريدو كاش فلسطين (Ooredoo Cash)', nameEn: 'Ooredoo Cash Palestine', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'ps_reflect', nameAr: 'تطبيق ريفلكت فلسطين (Reflect Palestine)', nameEn: 'Reflect Palestine Bank', type: 'instant_transfer', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank App' },
      { id: 'ps_bop', nameAr: 'تحويل بنك فلسطين (Bank of Palestine IBAN)', nameEn: 'Bank of Palestine IBAN', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'ps_pib', nameAr: 'تحويل البنك الإسلامي الفلسطيني (PIB)', nameEn: 'PIB Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'SY',
    nameAr: 'الجمهورية العربية السورية',
    nameEn: 'Syria',
    flag: '🇸🇾',
    flagUrl: 'https://flagcdn.com/w80/sy.png',
    currencyCode: 'SYP',
    currencyNameAr: 'ليرة سورية',
    currencyNameEn: 'SYP',
    popularMethods: [
      { id: 'sy_syriatel', nameAr: 'سيريتل كاش (Syriatel Cash)', nameEn: 'Syriatel Cash Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'sy_mtn', nameAr: 'إم تي إن كاش (MTN Cash)', nameEn: 'MTN Cash Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sy_shamcash', nameAr: 'شام كاش (Sham Cash)', nameEn: 'Sham Cash Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'sy_haram', nameAr: 'حوالات الهرم والفؤاد الفورية', nameEn: 'Al-Haram / Al-Fouad Transfer', type: 'instant_transfer', badgeAr: 'حوالة سريعة', badgeEn: 'Transfer' },
      { id: 'sy_bemo', nameAr: 'تحويل بنك بيمو السعودي الفرنسي (BBSF)', nameEn: 'BBSF Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'sy_baraka', nameAr: 'تحويل بنك البركة سورية (Al Baraka)', nameEn: 'Al Baraka Syria Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'sy_cham', nameAr: 'تحويل بنك الشام (Cham Bank)', nameEn: 'Cham Bank Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'SO',
    nameAr: 'جمهورية الصومال',
    nameEn: 'Somalia',
    flag: '🇸🇴',
    flagUrl: 'https://flagcdn.com/w80/so.png',
    currencyCode: 'USD',
    currencyNameAr: 'دولار / شلن',
    currencyNameEn: 'USD / SOS',
    popularMethods: [
      { id: 'so_evc', nameAr: 'خدمة EVC Plus هرمز (EVC Plus Hormuud)', nameEn: 'EVC Plus Hormuud', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Instant' },
      { id: 'so_zaad', nameAr: 'خدمة زاد تيليسوم (Zaad Telesom)', nameEn: 'Zaad Telesom Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'so_sahal', nameAr: 'خدمة ساهل جوليس (Sahal Golis)', nameEn: 'Sahal Golis Wallet', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'so_edahab', nameAr: 'خدمة إي دهب دهب شيل (e-Dahab)', nameEn: 'e-Dahab Dahabshiil', type: 'wallet', badgeAr: 'محفظة', badgeEn: 'Wallet' },
      { id: 'so_premier', nameAr: 'تحويل بنك بريمير (Premier Bank)', nameEn: 'Premier Bank Wallet', type: 'bank', badgeAr: 'تطبيق بنكي', badgeEn: 'Bank' },
      { id: 'so_salaam', nameAr: 'تحويل بنك السلام الصومال (Salaam Bank)', nameEn: 'Salaam Somali Bank', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'DJ',
    nameAr: 'جمهورية جيبوتي',
    nameEn: 'Djibouti',
    flag: '🇩🇯',
    flagUrl: 'https://flagcdn.com/w80/dj.png',
    currencyCode: 'DJF',
    currencyNameAr: 'فرنك جيبوتي',
    currencyNameEn: 'DJF',
    popularMethods: [
      { id: 'dj_waafi', nameAr: 'محفظة وافي دي موني (Waafi / D-Money)', nameEn: 'Waafi / D-Money Djibouti', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'dj_bcimr', nameAr: 'تحويل بنك التجارة والصناعة للبحر الأحمر (BCIMR)', nameEn: 'BCI Mer Rouge Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
      { id: 'dj_cac', nameAr: 'تحويل بنك كاك جيبوتي (CAC International)', nameEn: 'CAC International Bank', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
  {
    code: 'KM',
    nameAr: 'اتحاد جزر القمر',
    nameEn: 'Comoros',
    flag: '🇰🇲',
    flagUrl: 'https://flagcdn.com/w80/km.png',
    currencyCode: 'KMF',
    currencyNameAr: 'فرنك قمري',
    currencyNameEn: 'KMF',
    popularMethods: [
      { id: 'km_comocash', nameAr: 'محفظة كومو كاش (Comocash)', nameEn: 'Comocash Wallet', type: 'wallet', badgeAr: 'محفظة فورية', badgeEn: 'Wallet' },
      { id: 'km_snpsf', nameAr: 'الشركة الوطنية للبريد والخدمات المالية (SNPSF)', nameEn: 'SNPSF Comoros Post', type: 'bank', badgeAr: 'بريد ومالية', badgeEn: 'Postal' },
      { id: 'km_bic', nameAr: 'تحويل البنك الدولي لجزر القمر (BIC Comores)', nameEn: 'BIC Comores Transfer', type: 'bank', badgeAr: 'تحويل بنكي', badgeEn: 'Bank' },
    ],
  },
];

// Pre-indexed map for instant O(1) country lookups
export const ARAB_COUNTRIES_MAP = new Map<string, ArabCountryConfig>(
  ARAB_COUNTRIES_PAYMENT_DATA.map((c) => [c.code.toUpperCase(), c])
);

export function getArabCountryConfig(countryCode?: string): ArabCountryConfig {
  const code = (countryCode || 'SA').toUpperCase();
  return ARAB_COUNTRIES_MAP.get(code) || ARAB_COUNTRIES_PAYMENT_DATA[0];
}

export interface ArabiPayLimit {
  minAmount: number;
  currencyCode: string;
  symbolAr: string;
  symbolEn: string;
}

export const ARABI_PAY_MINIMUMS: Record<string, ArabiPayLimit> = {
  EG: { minAmount: 300, currencyCode: 'EGP', symbolAr: 'ج.م', symbolEn: 'EGP' },
  SA: { minAmount: 50, currencyCode: 'SAR', symbolAr: 'ر.س', symbolEn: 'SAR' },
  AE: { minAmount: 50, currencyCode: 'AED', symbolAr: 'د.إ', symbolEn: 'AED' },
  KW: { minAmount: 5, currencyCode: 'KWD', symbolAr: 'د.ك', symbolEn: 'KWD' },
  QA: { minAmount: 50, currencyCode: 'QAR', symbolAr: 'ر.ق', symbolEn: 'QAR' },
  OM: { minAmount: 6, currencyCode: 'OMR', symbolAr: 'ر.ع', symbolEn: 'OMR' },
  BH: { minAmount: 6, currencyCode: 'BHD', symbolAr: 'د.ب', symbolEn: 'BHD' },
  JO: { minAmount: 10, currencyCode: 'JOD', symbolAr: 'د.أ', symbolEn: 'JOD' },
  IQ: { minAmount: 18000, currencyCode: 'IQD', symbolAr: 'د.ع', symbolEn: 'IQD' },
  DZ: { minAmount: 1800, currencyCode: 'DZD', symbolAr: 'د.ج', symbolEn: 'DZD' },
  MA: { minAmount: 135, currencyCode: 'MAD', symbolAr: 'د.م', symbolEn: 'MAD' },
  TN: { minAmount: 42, currencyCode: 'TND', symbolAr: 'د.ت', symbolEn: 'TND' },
  LY: { minAmount: 65, currencyCode: 'LYD', symbolAr: 'د.ل', symbolEn: 'LYD' },
  SD: { minAmount: 8000, currencyCode: 'SDG', symbolAr: 'ج.س', symbolEn: 'SDG' },
  YE: { minAmount: 3400, currencyCode: 'YER', symbolAr: 'ر.ي', symbolEn: 'YER' },
  LB: { minAmount: 14, currencyCode: 'USD', symbolAr: '$', symbolEn: 'USD' },
  MR: { minAmount: 540, currencyCode: 'MRU', symbolAr: 'أ.م', symbolEn: 'MRU' },
  PS: { minAmount: 50, currencyCode: 'ILS', symbolAr: 'شيكل', symbolEn: 'ILS' },
  SY: { minAmount: 180000, currencyCode: 'SYP', symbolAr: 'ل.س', symbolEn: 'SYP' },
  SO: { minAmount: 14, currencyCode: 'USD', symbolAr: '$', symbolEn: 'USD' },
  DJ: { minAmount: 2400, currencyCode: 'DJF', symbolAr: 'ف.ج', symbolEn: 'DJF' },
  KM: { minAmount: 6200, currencyCode: 'KMF', symbolAr: 'ف.ق', symbolEn: 'KMF' },
  US: { minAmount: 14, currencyCode: 'USD', symbolAr: '$', symbolEn: 'USD' },
  GLOBAL: { minAmount: 14, currencyCode: 'USD', symbolAr: '$', symbolEn: 'USD' },
};

export function getArabiPayMinimum(countryCode?: string): ArabiPayLimit {
  const code = (countryCode || 'SA').toUpperCase();
  return ARABI_PAY_MINIMUMS[code] || ARABI_PAY_MINIMUMS['GLOBAL'];
}

export function buildArabTelegramHelpUrl(params: {
  country: ArabCountryConfig;
  selectedMethod: ArabPaymentMethod;
  items: Array<{ name: string; quantity: number }>;
  displayPrice: string;
  isArabic: boolean;
  orderRef?: string;
  sessionId?: string;
  isBoosted?: boolean;
  walletTopupAmount?: string;
}): string {
  const { country, selectedMethod, items, displayPrice, isArabic, orderRef, sessionId, isBoosted, walletTopupAmount } = params;
  const ref = orderRef || sessionId || 'ARABI-REQUEST';

  const itemsSummary = items
    .map((it) => `${it.name} (x${it.quantity})`)
    .join('، ');

  const boostNoteAr = isBoosted && walletTopupAmount
    ? `\n• [ترقية الحد الأدنى]: تم تطبيق الحد الأدنى وشحن رصيد فائض: ${walletTopupAmount} في محفظة العميل بـ UpStore!`
    : '';

  const boostNoteEn = isBoosted && walletTopupAmount
    ? `\n• [Minimum Limit Upgrade]: ${walletTopupAmount} will be credited as excess balance into user's UpStore wallet!`
    : '';

  const text = isArabic
    ? `مرحباً فريق دعم Arabi Pay بمتجر UpStore\nأود إتمام طلبي وتزويدي ببيانات الدفع المعتمدة:\n\n• رقم الطلب الرسمي: #${ref}\n• الدولة: ${country.nameAr}\n• وسيلة الدفع (Arabi Pay): ${selectedMethod.nameAr}\n• المنتجات: ${itemsSummary || 'طلب رقمي'}\n• المبلغ المطلوب سداده: ${displayPrice}${boostNoteAr}\n\nيرجى تزويدي ببيانات المحفظة / التحويل اللحظي للمتابعة وتفعيل الطلب فوراً. شكراً لكم.`
    : `Hello Arabi Pay Support Team at UpStore\nI would like to complete my order with my preferred direct local payment method:\n\n• Official Order Ref: #${ref}\n• Country: ${country.nameEn}\n• Payment Method (Arabi Pay): ${selectedMethod.nameEn}\n• Items: ${itemsSummary || 'Digital Order'}\n• Amount to Pay: ${displayPrice}${boostNoteEn}\n\nPlease provide the wallet / direct transfer details for instant fulfillment. Thank you.`;

  return `https://t.me/UpStore_help?text=${encodeURIComponent(text)}`;
}
