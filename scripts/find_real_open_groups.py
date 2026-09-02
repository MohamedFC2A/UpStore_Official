import asyncio
from telethon import TelegramClient
from telethon.tl.functions.channels import GetFullChannelRequest, JoinChannelRequest
from telethon.tl.functions.contacts import SearchRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

# Massive pool of high-potential search terms to discover active open supergroups
SEARCH_KEYWORDS = [
    # AI & Tools
    "شات الذكاء الاصطناعي",
    "جروب الذكاء الاصطناعي",
    "نقاشات الذكاء الاصطناعي",
    "ChatGPT بالعربي شات",
    "مجتمع ChatGPT",
    "برومبتات الذكاء الاصطناعي",
    "AI Tools Group",
    "ChatGPT Discussion",
    "Midjourney Chat",
    
    # Freelance & Work
    "شات الفريلانسرز",
    "جروب العمل الحر",
    "مستقلين مصر",
    "فريلانس مصر شات",
    "Freelancers Arab Group",
    "Freelance Egypt Chat",
    "وظائف وعمل حر",
    
    # Design & Video
    "شات المصممين العرب",
    "جروب المصممين",
    "ملتقى المصممين",
    "كانفا برو شات",
    "Graphic Designers Chat",
    "Canva Designers Group",
    "مونتاج وكاب كات",
    "صناع المحتوى العرب",
    
    # Tech & Programming & Subscriptions
    "نقاشات المبرمجين",
    "مبرمجين ومطورين عرب",
    "مجتمع التقنية العربي",
    "اشتراكات وتطبيقات شات",
    "عروض الحسابات والبرامج",
    "تبادل الخبرات الرقمية",
    "Arab Developers Group",
    "Tech Discussion Arab",
    "Digital Marketing Chat",
    "Binance Arab Group",
    "Bybit Arab Group"
]

# Additional seed candidates
KNOWN_CANDIDATES = [
    "chatgpt_arabic_group",
    "ai_arabic_group",
    "freelancers_egypt_chat",
    "arab_designers_group",
    "canva_arab_group",
    "programming_arab_chat",
    "tech_arab_group",
    "arab_freelancers_hub",
    "digital_mena_chat",
    "ai_creators_arab",
    "developers_arab_chat",
    "content_creators_arab",
    "designers_hub_arab",
    "chatgpt_users_arab",
    "freelancing_mena",
    "egypt_freelancers_chat",
    "ai_discussion_arab",
    "graphic_chat_arab",
    "arab_tech_forum",
    "sub_deals_arab"
]

async def discover_real_open_groups():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    print("════════════════════════════════════════════════════════════", flush=True)
    print("🔍 DEEP TELEGRAM SEARCH FOR PURE OPEN DISCUSSION GROUPS", flush=True)
    print("════════════════════════════════════════════════════════════\n", flush=True)

    discovered_usernames = set(KNOWN_CANDIDATES)

    # 1. Search Telegram Global API across all keywords
    for idx, kw in enumerate(SEARCH_KEYWORDS, 1):
        try:
            print(f"[{idx}/{len(SEARCH_KEYWORDS)}] Searching for: '{kw}'...", flush=True)
            res = await client(SearchRequest(q=kw, limit=20))
            for chat in res.chats:
                uname = getattr(chat, 'username', None)
                if uname and uname not in discovered_usernames:
                    discovered_usernames.add(uname)
            await asyncio.sleep(0.3)
        except Exception as e:
            # print(f"Search error: {e}", flush=True)
            pass

    print(f"\n📋 Total Discovered Candidates: {len(discovered_usernames)} channels/groups.", flush=True)
    print("🔬 Verifying which candidates are 100% PURE OPEN GROUPS (Not broadcast channels)...\n", flush=True)

    verified_open_groups = []

    for uname in discovered_usernames:
        try:
            entity = await client.get_entity(uname)
            
            # Check 1: Must be a Supergroup / Megagroup, NOT a Broadcast Channel
            is_group = getattr(entity, 'megagroup', False) or getattr(entity, 'gigagroup', False)
            is_broadcast = getattr(entity, 'broadcast', False)
            
            if not is_group or is_broadcast:
                continue # Skip broadcast channels

            # Check 2: Must NOT have Stars fee
            stars = getattr(entity, 'send_paid_messages_stars', None)
            if stars and stars > 0:
                continue # Skip paid stars groups

            # Check 3: Check default banned rights for members
            banned_rights = getattr(entity, 'default_banned_rights', None)
            if banned_rights and getattr(banned_rights, 'send_messages', False):
                continue # Skip groups where normal members are banned from sending messages

            # Check 4: Get full channel details (member counts)
            full = await client(GetFullChannelRequest(entity))
            total_members = getattr(full.full_chat, 'participants_count', 0) or 0
            online_count = getattr(full.full_chat, 'online_count', 0) or 0

            # Only accept groups with real audiences (> 200 members)
            if total_members >= 100:
                group_data = {
                    "username": uname,
                    "title": getattr(entity, 'title', uname),
                    "total_members": total_members,
                    "online_count": online_count
                }
                verified_open_groups.append(group_data)
                print(f"  ✅ VERIFIED OPEN GROUP: @{uname} | '{group_data['title']}' | Members: {total_members:,} | Online: {online_count:,}", flush=True)

        except Exception:
            pass

    # Sort verified groups by online active members & total members
    verified_open_groups.sort(key=lambda x: (x['online_count'], x['total_members']), reverse=True)

    print("\n════════════════════════════════════════════════════════════", flush=True)
    print(f"🎉 FOUND {len(verified_open_groups)} 100% PURE OPEN CHAT GROUPS", flush=True)
    print("════════════════════════════════════════════════════════════\n", flush=True)

    for i, g in enumerate(verified_open_groups[:25], 1):
        print(f"{i}. 💬 @{g['username']} — {g['title']}")
        print(f"   👥 {g['total_members']:,} members | 🟢 {g['online_count']:,} online\n", flush=True)

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(discover_real_open_groups())
