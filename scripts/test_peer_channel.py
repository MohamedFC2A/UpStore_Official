import asyncio
from telethon import TelegramClient
from telethon.tl.types import InputPeerChannel
from telethon.tl.functions.contacts import SearchRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

async def test_input_peer():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    res = await client(SearchRequest(q="مصممين", limit=3))
    for c in res.chats:
        if getattr(c, 'megagroup', False):
            print(f"Found: {c.title} (ID: {c.id}, AccessHash: {getattr(c, 'access_hash', 0)})")
            peer = InputPeerChannel(c.id, c.access_hash)
            print(f"Successfully constructed InputPeerChannel: {peer}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test_input_peer())
