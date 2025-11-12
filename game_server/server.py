import asyncio
import json
import websockets
import protocol
from protocol import MsgType, parse_request, build_broadcast_msg

class Server:
    def __init__(self):
        self.clients = []
        self.running = True
        self.curr_maze = None

    async def start_server(self):
        print(f"Server listening on ws://{protocol.IP_ADDR}:{protocol.PORT}")
        server_task = asyncio.create_task(self.server_loop())
        terminal_task = asyncio.create_task(self.handle_terminal_input())

        await asyncio.gather(server_task, terminal_task)

    async def server_loop(self):
        async with websockets.serve(self.handle_client, protocol.IP_ADDR, protocol.PORT):
            await asyncio.Future()


    async def handle_client(self, websocket: websockets.ServerConnection):
        await self.onClientConnect(websocket)
        try:
            if self.curr_maze:
                await websocket.send(build_broadcast_msg(websocket, MsgType.MAZE, self.curr_maze))
            async for msg in websocket:
                await self.onReceiveMessage(websocket, msg)
        finally:
            await self.onClientDisconnect(websocket)
            await websocket.close()


    async def onClientDisconnect(self, websocket: websockets.ServerConnection):
        self.clients.remove(websocket)
        await self.broadcast(build_broadcast_msg(websocket, MsgType.PLAYER_DISCONNECTED))
        print(f"{websocket.remote_address} disconnected");


    async def onClientConnect(self, websocket: websockets.ServerConnection):
        self.clients.append(websocket)
        await self.broadcast(build_broadcast_msg(websocket, MsgType.PLAYER_CONNECTED), websocket)
        print(f"{websocket.remote_address} connected")


    async def onReceiveMessage(self, sender: websockets.ServerConnection, msg_str: str):
        request = parse_request(msg_str)
        if not request: return

        req_type, req_data = request
        bc_msg = self.generate_broadcast(req_type, req_data)
        if not bc_msg: return

        bc_type, bc_data, exclude_sender = bc_msg

        exclude = sender
        if not exclude_sender: exclude = None

        await self.broadcast(build_broadcast_msg(sender, bc_type, bc_data), exclude)
    
    
    # generate a broadcast from an incoming message
    def generate_broadcast(self, req_type: MsgType, req_data: str | None) -> tuple[MsgType, str | None, bool] | None:
        match req_type:
            case MsgType.CONNECT_REQUEST:
                return MsgType.PLAYER_CONNECTED, None, True

            case MsgType.MAZE:
                self.curr_maze = req_data
                return MsgType.MAZE, self.curr_maze, True
            
            case MsgType.UPDATE_POS:
                return MsgType.UPDATE_POS, req_data, True
            
            case _:
                return None
    
    
    async def broadcast(self, message: str, exclude=None):
        if len(self.clients) == 0:
            return

        send_tasks = [
            client.send(message)
            for client in self.clients
            if client != exclude
        ]

        await asyncio.gather(*send_tasks, return_exceptions=True)
    
    
    async def handle_terminal_input(self):
        while self.running:
            user_input = (await asyncio.to_thread(input)).upper()
            
            if user_input == 'QUIT':
                print("Server shutting down...")
                self.running = False
                break
            elif user_input == 'MAZE':
                print(self.curr_maze)
            else:
                print(f"Unknown command: {user_input}")


if __name__ == "__main__":
    server = Server()

    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        print("\nServer stopped manually.")
    # except Exception as e:
    #     print(f"An unexpected error occurred: {e}")
