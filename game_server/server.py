import asyncio
import websockets
from ClientInfo import ClientInfo
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
        async with websockets.serve(self.init_connection, protocol.IP_ADDR, protocol.PORT):
            await asyncio.Future()

    # initialize the connection with a client - "handshake" before connection
    async def init_connection(self, websocket: websockets.ServerConnection):
        rec_text = await websocket.recv()
        req_type, req_data = parse_request(rec_text)
        if not req_type or not isinstance(req_data, str):
            await websocket.close()
            return

        client_name: str = req_data
        new_client = ClientInfo(websocket, client_name)

        # check if the name is already registered
        if self.get_client_info(new_client.name) != None:
            await new_client.send(build_broadcast_msg(new_client, MsgType.ERR_NAME_TAKEN))
            return await self.init_connection(websocket)
        
        await new_client.send(build_broadcast_msg(new_client, MsgType.ACCEPT_CONNECTION))
        await self.handle_client(new_client)

    # Get ClientInfo by the client's id
    # Returns None if the client isn't connected
    def get_client_info(self, client_name: str) -> ClientInfo | None:
        for c in self.clients:
            if c.name == client_name:
                return c
        return None

    async def handle_client(self, client: ClientInfo):
        await self.onClientConnect(client)
        try:
            if self.curr_maze:
                await client.send(build_broadcast_msg(client, MsgType.MAZE, self.curr_maze))
            async for msg in client.websocket:
                await self.onReceiveMessage(client, msg)
        finally:
            await self.onClientDisconnect(client)
            await client.websocket.close()
    
    async def onClientDisconnect(self, client: ClientInfo):
        self.clients.remove(client)
        await self.broadcast(build_broadcast_msg(client, MsgType.PLAYER_DISCONNECTED))
        print(f"{client.to_string()} disconnected");


    async def onClientConnect(self, client: ClientInfo):
        self.clients.append(client)
        await self.broadcast(build_broadcast_msg(client, MsgType.PLAYER_CONNECTED), client)
        print(f"{client.to_string()} connected")


    async def onReceiveMessage(self, sender: ClientInfo, msg_str: str):
        req_type, req_data = parse_request(msg_str)
        if not req_type: return
        
        bc_msg = self.generate_broadcast(req_type, req_data)
        if not bc_msg: return

        bc_type, bc_data, exclude_sender = bc_msg

        exclude = None
        if exclude_sender: exclude = sender

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
    
    
    async def broadcast(self, message: str, exclude: ClientInfo | None = None):
        if len(self.clients) == 0:
            return

        send_tasks = [
            client.send(message)
            for client in self.clients
            if (not exclude) or (client.name != exclude.name)
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
