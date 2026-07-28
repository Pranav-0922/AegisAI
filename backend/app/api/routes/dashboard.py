from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["dashboard"])


class ConnectionManager:
    """
    Minimal in-memory WebSocket connection registry.

    Fine for a single backend instance (which is all the free tier gives you
    anyway). If this ever needs to scale across multiple instances, swap
    this for a Redis pub/sub-backed manager -- the route below doesn't change.
    """

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active):
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/dashboard/live")
async def dashboard_live(websocket: WebSocket):
    """
    Examiners connect here to receive real-time score updates and new
    linguistic events as they happen. Payloads match the DashboardUpdate
    schema in app/schemas/schemas.py.
    """
    await manager.connect(websocket)
    try:
        while True:
            # This endpoint is push-only from the server's side; we still
            # need to await something so the connection stays open and we
            # notice disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
