"""
Quick manual test: connects to /dashboard/live and prints everything it
receives. Run this in one terminal, then run the curl sequence in another
-- you should see score_update / new_event messages appear here live.
"""
import asyncio
import json
import websockets


async def listen():
    uri = "ws://localhost:8000/dashboard/live"
    async with websockets.connect(uri) as ws:
        print(f"Connected to {uri}, listening...")
        try:
            async for message in ws:
                data = json.loads(message)
                print(f"  <- {data['type']}: {json.dumps(data, indent=2)}")
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed.")


if __name__ == "__main__":
    asyncio.run(listen())
