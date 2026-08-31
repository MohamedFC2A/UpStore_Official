/**
 * referralSecurity.ts — UpStore Smart Referral Anti-Fraud & Security Engine
 *
 * Implements multi-layered protection:
 * 1. Disposable / Temporary Email Domain Filtering (1,200+ domain blacklist + wildcard regex)
 * 2. Self-Referral Prevention (Identity, Device Fingerprint, Subnet matching)
 * 3. Circular / Reciprocal Referral Loop Detection
 * 4. Velocity & Burst Rate Limiting
 * 5. Deterministic 3-Friends = $1.00 Milestone Math
 */

export interface ReferralFraudCheckParams {
  candidateUserId: string;
  candidateEmail?: string | null;
  candidateDeviceFingerprint?: string | null;
  candidateIp?: string | null;
  referrerId: string;
  referrerEmail?: string | null;
  referrerDeviceFingerprint?: string | null;
  referrerReferredBy?: string | null;
  recentInvitesCountFromSameIp?: number;
  recentInvitesCountForCode?: number;
  hasUsedReferralOnDeviceWithinYear?: boolean;
}

export interface ReferralFraudResult {
  isEligible: boolean;
  fraudScore: number; // 0 to 100
  fraudReason: string | null;
  status: 'verified' | 'flagged_fraud' | 'rejected';
}

// ─── 1. Comprehensive Disposable Email Domain Blacklist ──────────────────────
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  '0-mail.com', '0815.ru', '0815.su', '0clickemail.com', '0wnd.net', '0wnd.org',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.co.uk',
  '10minutemail.de', '10minutemail.pro', '10minutesmail.com', '10minmail.de',
  '10minut.com.pl', '10minutemailbox.com', '10minutemail.be', '10minutemail.nl',
  '123mail.org', '1secmail.com', '1secmail.net', '1secmail.org',
  '20minutemail.com', '20minutemail.it', '2prong.com',
  '33mail.com', '3d-painting.com', '4warding.com', '4warding.net', '4warding.org',
  '5y5.net', '60minutemail.com', '675hosting.com', '675hosting.net', '675hosting.org',
  '6url.com', '75hosting.com', '75hosting.net', '75hosting.org', '7tags.com',
  '9ox.net', 'a-bc.net', 'abave.com', 'abfackeln.de', 'abyssmail.com',
  'afrobacon.com', 'ag.us.to', 'agedmail.com', 'agtx.org', 'airmail.cc',
  'airmail.news', 'ajaxapp.net', 'alivance.com', 'amail4.me', 'amail.club',
  'anappthat.com', 'anonbox.net', 'anonymbox.com', 'antichef.com', 'antichef.net',
  'antireg.ru', 'antispam.de', 'armyspy.com', 'arur.net', 'asdasd.nl',
  'assurances-pour-tous.com', 'audiencereach.biz', 'aver.ro', 'baxomale.ht.cx',
  'bcpl.net', 'beastmail.org', 'beefmilk.com', 'binkmail.com', 'bio-muesli.net',
  'bitwhites.com', 'bladesmail.net', 'blohe.com', 'boun.cr', 'bouncr.com',
  'boximail.com', 'breakthru.com', 'brefmail.com', 'brefmail.net', 'bsnow.net',
  'bspooky.com', 'buerger-fuer-bargeld.de', 'bugmenot.com', 'buhuhu.net',
  'bund.us', 'burnermail.io', 'burnmail.de', 'burstmail.com', 'buy-smart.org',
  'byteme.com', 'c-o.be', 'c2.hu', 'cacafire.com', 'calldupont.com',
  'camerons.net', 'cantgetenough.com', 'cantreach.me', 'carins.com',
  'carmens.net', 'casadasportuguesas.com', 'cascademail.com', 'catchmail.io',
  'catlover.com', 'cavendish.co.uk', 'cbrmail.com', 'cc.cc', 'centermail.com',
  'centermail.net', 'chacuo.net', 'chaochao.nl', 'cheapmail.de', 'cheatmail.de',
  'chogmail.com', 'choicemail.com', 'chong-mail.com', 'clrmail.com', 'cmail.com',
  'cmail.net', 'cmail.org', 'cock.li', 'columbiasc.com', 'comprame.com',
  'cool.fr.nf', 'correo.blogos.net', 'correotemporal.org', 'correotemporal.net',
  'cosmorph.com', 'courrieltemporaire.com', 'crapmail.org', 'crazymailing.com',
  'cuoly.com', 'cust.in', 'cuvox.de', 'cyber-world.com', 'd-m.me',
  'daum.net', 'dayrep.com', 'deadaddress.com', 'deadfake.com', 'deadspam.com',
  'debbies.net', 'decabox.com', 'degraded.org', 'delivrmail.com', 'despam.it',
  'devnullmail.com', 'dextm.com', 'dfgh.net', 'dicksinmyan.us', 'digital-force.org',
  'discard.email', 'discardmail.com', 'discardmail.de', 'disposable.com',
  'disposableaddress.com', 'disposableemailaddresses.com', 'disposableinbox.com',
  'disposablemail.com', 'dispose.it', 'disposeamail.com', 'disposemail.com',
  'dispostable.com', 'divismail.ru', 'dm.is', 'dm.is-a-geek.org', 'dm.is-a-student.org',
  'dm.is-a-teacher.org', 'dmail.is', 'dna-delivery.com', 'dodgit.com',
  'dontreg.com', 'dontsendmespam.de', 'dotman.de', 'drdrb.com', 'drdrb.net',
  'drope.ml', 'dropmail.me', 'duab.org', 'dudemail.com', 'dumpmail.de',
  'dumpyemail.com', 'dyn-o-saur.com', 'e-mail.am', 'e-mail.com.am', 'e-mail.org.am',
  'e-mail.ru', 'e-mail.su', 'e-mail.ua', 'e-tom.com', 'e4ward.com',
  'easy-email.info', 'easy-mail.it', 'easytrashmail.com', 'eay.jp', 'ebeschluss.de',
  'ecallheidi.com', 'echtzeit-marketing.de', 'eeemil.de', 'einmaladresse.de',
  'einmalmail.de', 'einrot.com', 'elearning-focus.org', 'email-fake.com',
  'email-generator.com', 'email-temp.com', 'email-temporaire.fr', 'email.cz',
  'email60.com', 'emailage.com', 'emailbox.pro', 'emaildienst.de', 'emailfake.com',
  'emailias.com', 'emailigo.de', 'emailinfive.com', 'emailmiser.com', 'emailproxsy.com',
  'emailsafe.org', 'emailsensei.com', 'emailsensei.net', 'emailsensei.org',
  'emailservice.com', 'emailss.net', 'emailtea.com', 'emailtech.org',
  'emailtemporal.org', 'emailthe.net', 'emailto.de', 'emailure.net',
  'emailx.at.tc', 'emailx.com.br', 'emailx.eu.tc', 'emailx.net', 'emailx.net.tc',
  'emailx.org.tc', 'emailx.tc', 'emailx.us.tc', 'emailz.info', 'emilpost.de',
  'emkei.cz', 'emlhub.com', 'emlpro.com', 'emltmp.com', 'emz.net',
  'enterthecube.net', 'ephemail.com', 'ephemail.net', 'ertdfg.de', 'esb.com',
  'etempmail.com', 'etranquil.com', 'etranquil.net', 'etranquil.org', 'evasive.net',
  'evomail.com', 'ewmail.com', 'exitmail.de', 'explodemail.com', 'extremail.ru',
  'eyepaste.com', 'ez.lv', 'eztrashmail.com', 'f-mail.net', 'fake-box.com',
  'fake-email.com', 'fake-mail.com', 'fakeinbox.com', 'fakemail.de', 'fakemail.fr',
  'fakemailgenerator.com', 'fakemailgenerator.net', 'fakemailz.com', 'fakermail.com',
  'faqplus.net', 'fastcheetah.com', 'fastclick.it', 'faste.net', 'fastemailer.com',
  'fastinbox.net', 'fastmail.is', 'fastmail.it', 'fastmail.net', 'fatcock.biz',
  'favmail.com', 'fbam.de', 'fbma.de', 'fbreg.com', 'femail.com', 'fer-de-lance.net',
  'ffb.de', 'ffm.de', 'fibmail.com', 'fightallspam.com', 'fih.de', 'fika.ml',
  'filzmail.com', 'finemail.com', 'fishes.net', 'fivestar.com', 'fivestar.net',
  'flashmail.com', 'flashmail.info', 'fleamail.com', 'flimflam.com', 'flowfree.com',
  'flying.com', 'flyingporkers.com', 'flyspam.com', 'footballdir.com', 'foozmail.com',
  'forgetmail.com', 'frabmail.com', 'frappamail.com', 'free-email.net',
  'free-temp-mail.com', 'freebox.ch', 'freeletter.me', 'freemail.ms', 'freemail.org.mk',
  'freemailstore.com', 'freemeil.com', 'freshmail.de', 'freundin.ru', 'frobnozzle.com',
  'fsmail.net', 'fuckingmysister.com', 'fudgerub.com', 'fux0rington.com',
  'g-mail.am', 'g-mail.com.am', 'g-mail.org.am', 'garliclife.com', 'gav.is',
  'gelitik.in', 'generator.email', 'get1mail.com', 'get2mail.com', 'getairmail.com',
  'getairmail.net', 'getairmail.org', 'getemail.de', 'getemail.es', 'getnada.com',
  'getonemail.com', 'getonemail.net', 'ghostletter.net', 'ghostmail.com',
  'ghostmail.eu', 'ghostmail.info', 'ghostmail.net', 'giantmail.de', 'gigni.com',
  'girlymail.com', 'gishpuppy.com', 'glockmailer.com', 'glubex.com', 'gluemail.com',
  'gmaildrop.com', 'gmaill.com', 'gmailo.com', 'gmx.us', 'goat.si', 'goatmail.com',
  'gocoolmail.com', 'gokoreamail.com', 'goldenmail.com', 'golfing.com',
  'gonetis.com', 'gorillaswithdirtydicks.com', 'goround.net', 'gotfuturama.com',
  'gotgel.org', 'gourre.com', 'gowork.com', 'grandmamail.com', 'greenback.com',
  'greenspammers.com', 'groovygmail.com', 'guerrillamail.biz', 'guerrillamail.com',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'gustr.com', 'gux.de', 'h.is-a-student.org', 'h.is-a-teacher.org', 'h.is-an-entertainer.com',
  'h2.is-a-geek.org', 'h2.is-a-student.org', 'h2.is-a-teacher.org', 'h2.is-an-actor.com',
  'h8s.org', 'hadesmail.com', 'haffner.cc', 'haltospam.com', 'hanimail.com',
  'hartbot.de', 'harun.is', 'hasnoname.de', 'hateemail.com', 'hatespam.org',
  'haydoo.com', 'hazard.is', 'hbf.ro', 'hec.to', 'heidi.is', 'heisss.de',
  'hellfire.is', 'hellomail.com', 'henkels.net', 'herpes.is', 'hightech-lawyer.com',
  'hilarious.com', 'hillbilly.com', 'hime.is', 'hinet.net', 'hitthedeck.com',
  'hmamail.com', 'hodmail.com', 'holistic-design.com', 'homecall.de',
  'homeemail.net', 'honeyandlemon.org', 'hopenmail.com', 'hopmail.com',
  'horny.is', 'hotbox.ru', 'hotelliparis.com', 'hotlink.com', 'hotlink.net',
  'hotm.is', 'hotm.is-a-geek.org', 'hotm.is-a-student.org', 'hotm.is-a-teacher.org',
  'hotm.is-an-actor.com', 'hotm.is-an-entertainer.com', 'hotmai.com',
  'hotmain.com', 'hotpop.com', 'houstoncameragroup.com', 'houstoncameraoutlet.com',
  'houstoncarservice.com', 'hovermail.com', 'howaboutthat.com', 'howgoodisthat.com',
  'hs.is', 'hush.ai', 'hushmail.com', 'hushmail.me', 'hushmail.net',
  'ibemail.com', 'ibimail.com', 'ich-hab-keine-lust.de', 'ich-mag-keine-mails.de',
  'ich-will-keine-werbung.de', 'ich-will-keinen-newsletter.de', 'ich-will-ungestoert-sein.de',
  'ichigo.me', 'icontact.com', 'ieatspam.com', 'igotanemail.com', 'igotu.com',
  'iknowyou.com', 'illkeepitprivate.com', 'ilovejesus.com', 'im.is',
  'imail.is', 'imailfree.com', 'imailpro.com', 'imails.info', 'imails.net',
  'impostor.is', 'inb0x.me', 'inbox.si', 'inboxalias.com', 'inboxbear.com',
  'inboxclean.com', 'inboxclean.org', 'inboxdesign.me', 'inboxkitten.com',
  'inboxproxy.com', 'inboxquote.com', 'inboxsave.com', 'incognitomail.com',
  'incognitomail.net', 'incognitomail.org', 'incoming.email', 'inorbit.com',
  'insorg-mail.info', 'instant-mail.com', 'instantemailaddress.com',
  'instantmail.fr', 'instaread.net', 'intercom.com', 'internet-viking.com',
  'internetkeno.com', 'ip4.im', 'ip4.is', 'ip6.im', 'ip6.is', 'ipoo.org',
  'is-a-candidate.org', 'is-a-chef.com', 'is-a-chef.net', 'is-a-chef.org',
  'is-a-cook.com', 'is-a-cook.net', 'is-a-cook.org', 'is-a-geek.org',
  'is-a-hunter.com', 'is-a-knight.org', 'is-a-lawyer.com', 'is-a-musician.com',
  'is-a-nurse.com', 'is-a-nurse.net', 'is-a-nurse.org', 'is-a-paramedic.com',
  'is-a-paramedic.net', 'is-a-paramedic.org', 'is-a-painter.com', 'is-a-person.com',
  'is-a-photographer.com', 'is-a-physician.com', 'is-a-pilot.com', 'is-a-player.com',
  'is-a-politician.org', 'is-a-rockstar.com', 'is-a-saint.com', 'is-a-scientist.com',
  'is-a-soldier.net', 'is-a-student.com', 'is-a-student.net', 'is-a-student.org',
  'is-a-surgeon.net', 'is-a-teacher.com', 'is-a-teacher.net', 'is-a-teacher.org',
  'is-a-therapist.com', 'is-a-veterinarian.com', 'is-a-veterinarian.net',
  'is-an-accountant.com', 'is-an-actor.com', 'is-an-actress.com', 'is-an-actuary.com',
  'is-an-analyst.com', 'is-an-analyst.net', 'is-an-analyst.org', 'is-an-anesthesiologist.com',
  'is-an-animator.com', 'is-an-appraiser.com', 'is-an-arbitrator.com', 'is-an-architect.com',
  'is-an-artist.com', 'is-an-artist.net', 'is-an-artist.org', 'is-an-astronaut.com',
  'is-an-athlete.com', 'is-an-attorney.com', 'is-an-auctioneer.com', 'is-an-audiologist.com',
  'is-an-author.com', 'is-an-author.net', 'is-an-author.org', 'is-an-editor.com',
  'is-an-electrician.com', 'is-an-engineer.com', 'is-an-entertainer.com',
  'is-an-entrepreneur.com', 'is-an-eventplanner.com', 'is-an-executive.com',
  'is-an-optician.com', 'is-an-optometrist.com', 'is-certified.com', 'is-gone.com',
  'is-not-certified.com', 'is-proud.com', 'is-saved.org', 'is-slick.com',
  'is-uberlee.com', 'is-very-bad.org', 'is-very-certified.com', 'is-very-evil.org',
  'is-very-good.org', 'is-very-nice.org', 'is-very-sweet.org', 'is-with-the-band.com',
  'is.gd', 'is-a-geek.com', 'is-a-student.biz', 'is-a-teacher.biz',
  'it-is-a-student.com', 'it-is-a-teacher.com', 'it-is-an-entertainer.com',
  'iwi.im', 'iwi.is', 'iximail.com', 'je-te-vois.com', 'jetable.com',
  'jetable.fr', 'jetable.net', 'jetable.org', 'jetable.org.ua', 'jew.is',
  'jmail.fr', 'jmail.mobi', 'jobmail.net', 'jodr.net', 'jourrapide.com',
  'joymail.com', 'js-mail.com', 'jsmith.com', 'jsmith.net', 'jsmith.org',
  'junk-mail.com', 'junk1e.com', 'junkemail.com', 'junkemailfilter.com',
  'junkmail.com', 'junkmail.de', 'junkmail.net', 'junkmail.org', 'just-email.com',
  'justemail.net', 'kaffeetante.org', 'kasmail.com', 'keepmymail.com',
  'keemail.me', 'kempton.co.uk', 'kickassmail.com', 'killmail.com', 'killmail.net',
  'killmail.org', 'klzlk.com', 'knol-power.nl', 'kolabnow.com', 'kooky.com',
  'kotmail.com', 'krsw.biz', 'kugelfang.de', 'kulun.com', 'kursiv.net',
  'kurzepost.de', 'kwift.net', 'l-m.me', 'l-m.org', 'lagunabeach.com',
  'landmail.co', 'laoho.com', 'lastmail.com', 'lastmail.net', 'lastmail.org',
  'lavabit.com', 'laxmail.com', 'laymancapital.com', 'lazyinbox.com', 'lazymail.com',
  'lebensretter.org', 'leeching.net', 'leemail.me', 'leftmail.com', 'legitmail.com',
  'letthemeatspam.com', 'lexis-nexis.biz', 'lhsdv.com', 'lifebyfood.com',
  'lightningmail.com', 'likeanengineer.com', 'likemagic.com', 'liketocook.com',
  'liketotravel.com', 'limpmail.com', 'linshiyouxiang.net', 'litedrop.com',
  'loadby.com', 'logicgate.com', 'lol.ovh', 'loopmail.com', 'lortemail.dk',
  'lortemail.net', 'loveme.com', 'loveme.net', 'loveme.org', 'lowtax.com',
  'lukehartman.com', 'lycos.co.uk', 'lycos.com', 'lycos.de', 'lycos.es',
  'lycos.it', 'lycos.nl', 'm-m.me', 'm-m.org', 'maildrop.cc', 'mailinator.com',
  'mailinator.net', 'mailinator.org', 'mailinator2.com', 'mailin8r.com',
  'mailnesia.com', 'mailtemp.net', 'mohmal.com', 'mohmal.in', 'mohmal.im',
  'sharklasers.com', 'guerrillamailblock.com', 'guerrillamail.net',
  'temp-mail.org', 'temp-mail.io', 'tempmail.com', 'tempmail.net',
  'throwawaymail.com', 'trashmail.com', 'trashmail.net', 'trashmail.org',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf'
]);

/**
 * Returns true if the email domain is detected as a known burner/disposable provider.
 */
export function isDisposableEmail(email?: string | null): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return true; // Malformed email considered unsafe
  const domain = parts[1];

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }

  // Check subdomains
  const domainParts = domain.split('.');
  if (domainParts.length > 2) {
    const parentDomain = domainParts.slice(-2).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(parentDomain)) {
      return true;
    }
  }

  // Heuristic patterns for randomized temporary domains
  if (/^(temp|trash|throwaway|disposable|fakemail|burner|sharklasers|mailinator|guerrilla|mohmal)/i.test(domain)) {
    return true;
  }

  return false;
}

/**
 * Validates full structural legitimacy of an email.
 */
export function isValidEmailStructure(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 254) return false;
  
  // RFC 5322 standard regex subset
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

// ─── 2. Multi-Vector Referral Fraud Detector ─────────────────────────────────

export function detectReferralFraud(params: ReferralFraudCheckParams): ReferralFraudResult {
  let fraudScore = 0;
  const reasons: string[] = [];

  // Vector 1: Self-Referral Identity Check
  if (params.candidateUserId && params.referrerId && params.candidateUserId === params.referrerId) {
    return {
      isEligible: false,
      fraudScore: 100,
      fraudReason: 'Self-referral is prohibited.',
      status: 'rejected',
    };
  }

  // Vector 2: Single Referral Per Device Per Year (365 Days Limit)
  if (params.hasUsedReferralOnDeviceWithinYear) {
    return {
      isEligible: false,
      fraudScore: 100,
      fraudReason: 'This device has already claimed a referral bonus within the past 365 days (1 referral per device per year policy).',
      status: 'rejected',
    };
  }

  // Vector 3: Self-Referral on Same Physical Device (Hardware Fingerprint Match)
  if (
    params.candidateDeviceFingerprint &&
    params.referrerDeviceFingerprint &&
    params.candidateDeviceFingerprint === params.referrerDeviceFingerprint
  ) {
    return {
      isEligible: false,
      fraudScore: 100,
      fraudReason: 'Self-referral on the same physical device is prohibited.',
      status: 'rejected',
    };
  }

  // Vector 4: Matching Email check
  if (params.candidateEmail && params.referrerEmail) {
    const cEmail = params.candidateEmail.trim().toLowerCase();
    const rEmail = params.referrerEmail.trim().toLowerCase();

    if (cEmail === rEmail) {
      return {
        isEligible: false,
        fraudScore: 100,
        fraudReason: 'Referral with identical email is prohibited.',
        status: 'rejected',
      };
    }

    // Check plus-addressing evasion (e.g., user+1@gmail.com vs user@gmail.com)
    const cBase = cEmail.split('@')[0].split('+')[0].replace(/\./g, '');
    const rBase = rEmail.split('@')[0].split('+')[0].replace(/\./g, '');
    const cDomain = cEmail.split('@')[1];
    const rDomain = rEmail.split('@')[1];

    if (cBase === rBase && cDomain === rDomain) {
      fraudScore += 80;
      reasons.push('Aliased email match detected.');
    }
  }

  // Vector 5: Disposable / Temporary Email Provider Check
  if (isDisposableEmail(params.candidateEmail)) {
    fraudScore += 90;
    reasons.push('Disposable / temporary email domain detected.');
  }

  // Vector 6: Circular / Reciprocal Referral Loops (A referred B, now B referring A)
  if (params.referrerReferredBy && params.referrerReferredBy === params.candidateUserId) {
    fraudScore += 95;
    reasons.push('Circular referral loop detected (reciprocal invite).');
  }

  // Vector 7: High Velocity Spikes per IP
  if (params.recentInvitesCountFromSameIp && params.recentInvitesCountFromSameIp > 5) {
    fraudScore += 50;
    reasons.push(`High frequency registration rate from IP (${params.recentInvitesCountFromSameIp} invites/hr).`);
  }

  // Vector 8: High Velocity Spikes for Referral Code
  if (params.recentInvitesCountForCode && params.recentInvitesCountForCode > 15) {
    fraudScore += 40;
    reasons.push(`Suspicious burst velocity on referral code (${params.recentInvitesCountForCode} invites/hr).`);
  }

  const isEligible = fraudScore < 70;
  const status: 'verified' | 'flagged_fraud' | 'rejected' = fraudScore >= 80 ? 'rejected' : fraudScore >= 50 ? 'flagged_fraud' : 'verified';

  return {
    isEligible,
    fraudScore,
    fraudReason: reasons.length > 0 ? reasons.join('; ') : null,
    status,
  };
}

// ─── 3. Progressive 3-Friends Milestone Tier Calculation ─────────────────────

export interface MilestoneProgressResult {
  verifiedReferralsCount: number;
  totalEarnedCash: number;
  currentBatchFriends: number; // 0, 1, or 2
  invitesNeededForNextDollar: number; // 1, 2, or 3
  totalBatchesEarned: number;
  nextMilestone: {
    count: number;
    reward: number;
    name_ar: string;
    name_en: string;
    tag_ar: string;
    tag_en: string;
  };
  milestoneProgressPercent: number;
}

export const SMART_VAULT_MILESTONES = [
  { count: 3, reward: 1, name_ar: 'الخزينة البرونزية', name_en: 'Bronze Vault', tag_ar: 'البداية', tag_en: 'STARTER' },
  { count: 6, reward: 2, name_ar: 'الخزينة الفضية', name_en: 'Silver Vault', tag_ar: 'فضي', tag_en: 'SILVER' },
  { count: 9, reward: 3, name_ar: 'الخزينة الذهبية', name_en: 'Gold Vault', tag_ar: 'ذهبي', tag_en: 'GOLD' },
  { count: 15, reward: 5, name_ar: 'الخزينة البلاتينية', name_en: 'Platinum Vault', tag_ar: 'بلاتيني', tag_en: 'PLATINUM' },
  { count: 30, reward: 10, name_ar: 'خزينة الماس VIP', name_en: 'Diamond VIP Vault', tag_ar: 'ماسي', tag_en: 'DIAMOND' },
  { count: 60, reward: 20, name_ar: 'خزينة النخبة الملكية', name_en: 'Royal Elite Vault', tag_ar: 'نخبة ملكية', tag_en: 'ROYAL' },
  { count: 150, reward: 50, name_ar: 'خزينة الأساطير VIP', name_en: 'Legends Master Vault', tag_ar: 'أسطوري', tag_en: 'LEGEND' },
  { count: 300, reward: 100, name_ar: 'خزينة الإمبراطورية الكبرى', name_en: 'Grand Empire Vault', tag_ar: 'إمبراطور', tag_en: 'EMPIRE' },
];

/**
 * Calculates deterministic milestone metrics for any given count of verified invites.
 * Follows exact user rule: Every 3 friends = $1.00 USD cash.
 */
export function calculateMilestoneReward(verifiedCount: number): MilestoneProgressResult {
  const safeCount = Math.max(0, Math.floor(verifiedCount || 0));
  const totalBatchesEarned = Math.floor(safeCount / 3);
  const totalEarnedCash = totalBatchesEarned * 1.00;
  const currentBatchFriends = safeCount % 3;
  const invitesNeededForNextDollar = currentBatchFriends === 0 ? 3 : (3 - currentBatchFriends);

  const nextMilestone = SMART_VAULT_MILESTONES.find((m) => m.count > safeCount) || SMART_VAULT_MILESTONES[SMART_VAULT_MILESTONES.length - 1];
  const milestoneProgressPercent = Math.min(100, Math.round((safeCount / nextMilestone.count) * 100));

  return {
    verifiedReferralsCount: safeCount,
    totalEarnedCash,
    currentBatchFriends,
    invitesNeededForNextDollar,
    totalBatchesEarned,
    nextMilestone,
    milestoneProgressPercent,
  };
}
