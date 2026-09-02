import asyncio
from telethon import TelegramClient
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.functions.contacts import SearchRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

QUERIES = [
    "مجموعة شات",
    "جروب نقاش",
    "مجتمع الذكاء",
    "دردشة تقنية",
    "سوق العمل الحر",
    "قروب مصممين",
    "قروب مبرمجين",
    "تبادل خبرات",
    "خدمات رقمية",
    "سوق الخدمات المصغرة",
    "عالم التقنية شات",
    "AI Tools Chat",
    "ChatGPT Group Official",
    "Graphic Designers Arab Group",
    "Crypto Arab Chat",
    "Binance Arabic Community"
]

async def find_large():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    all_chats = set()

    for q in QUERIES:
        try:
            res = await client(SearchRequest(q=q, limit=20))
            for c in res.chats:
                uname = getattr(c, 'username', None)
                if uname:
                    all_chats.add(uname)
        except Exception:
            pass

    print(f"Checking {len(all_chats)} total chats for pure open discussion groups...", flush=True)

    pure_open_groups = []

    for uname in all_chats:
        try:
            entity = await client.get_entity(uname)
            is_group = getattr(entity, 'megagroup', False) or getattr(entity, 'gigagroup', False)
            is_broadcast = getattr(entity, 'broadcast', False)
            
            if not is_group or is_broadcast:
                continue
            
            stars = getattr(entity, 'send_paid_messages_stars', None)
            if stars:
                continue

            full = await client(GetFullChannelRequest(entity))
            total = getattr(full.full_chat, 'participants_count', 0) or 0
            online = getattr(full.full_chat, 'online_count', 0) or 0

            # Collect groups
            pure_open_groups.append({
                "username": uname,
                "title": getattr(entity, 'title', uname),
                "total": total,
                "online": online
            })
            print(f"✅ FOUND: @{uname} | Title: '{getattr(entity, 'title', uname)}' | Members: {total:,} | Online: {online:,}", flush=True)
        except Exception:
            pass

    pure_open_groups.sort(key=lambda x: (x['online'], x['total']), reverse=True)

    print(f"\n🏆 Total Verified Open Groups: {len(pure_open_groups)}", flush=True)
    for i, g in enumerate(pure_open_groups, 1):
        print(f"{i}. @{g['username']} - '{g['title']}' ({g['total']:,} members, {g['online']:,} online)", flush=True)

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(find_large())
