import asyncio
import json
import time
from types import SimpleNamespace
import websockets
from ClientInfo import ClientInfo
from MazeGen.MazeGenerator import generateDFSRectMaze
from MazeGen.Maze import Maze
import protocol
from protocol import MsgType, is_valid_position, parse_request, build_broadcast_msg

# Game Loop Calls Per Second
GAME_LOOP_RATE = 20
DEFAULT_MAZE_DIMENSIONS = SimpleNamespace(width=13, height=13)
class Server:
    def __init__(self):
        self.clients = []
        self.dirty_pos_dict = {} # clients whose information was not updated yet. format: { clientName: pos }
        self.running = True
        self.stored_maze: Maze = generateDFSRectMaze(DEFAULT_MAZE_DIMENSIONS.width, DEFAULT_MAZE_DIMENSIONS.height)


    async def start_server(self):
        print(f"Server listening on ws://{protocol.IP_ADDR}:{protocol.PORT}")
        server_task = asyncio.create_task(self.server_loop())
        terminal_task = asyncio.create_task(self.handle_terminal_input())
        game_task = asyncio.create_task(self.game_loop())

        await asyncio.gather(server_task, game_task, terminal_task)


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
        await self.on_client_connect(client)
        try:
            async for msg in client.websocket:
                await self.on_receive_message(client, msg)
        finally:
            await self.on_client_disconnect(client)
            await client.websocket.close()
    
    async def on_client_disconnect(self, client: ClientInfo):
        self.clients.remove(client)
        await self.send_broadcast(build_broadcast_msg(client, MsgType.PLAYER_DISCONNECTED))
        print(f"{client.to_string()} disconnected");


    async def on_client_connect(self, client: ClientInfo):
        await self.send_broadcast(build_broadcast_msg(client, MsgType.PLAYER_CONNECTED), client)
        await client.send(build_broadcast_msg(None, MsgType.MAZE, self.stored_maze.get_matrix()))
        for c in self.clients:
            await client.send(build_broadcast_msg(None, MsgType.PLAYER_CONNECTED, c.get_player_info()))
        self.clients.append(client)
        print(f"{client.to_string()} connected")


    async def on_receive_message(self, sender: ClientInfo, msg_str: str):
        req_type, req_data = parse_request(msg_str)
        if req_type:
            await self.fulfill_request(sender, req_type, req_data)

    async def fulfill_request(self, sender: ClientInfo, req_type: MsgType, req_data: dict | None):
        if req_type == MsgType.UPDATE_POS:
            asyncio.create_task(self.update_pos(sender, req_data))
        if req_type == MsgType.SET_READY:
            asyncio.create_task(self.set_ready(sender, req_data))

        bc_msg = self.generate_broadcast(req_type, req_data)
        if not bc_msg: return

        bc_type, bc_data, exclude_sender = bc_msg

        exclude = None
        if exclude_sender: exclude = sender

        await self.send_broadcast(build_broadcast_msg(sender, bc_type, bc_data), exclude)


    async def update_pos(self, sender: ClientInfo, pos: dict):
        if is_valid_position(pos):
            self.dirty_pos_dict[sender.name] = sender.position = {
                "x": pos["x"],
                "y": pos["y"]
            }

    async def set_ready(self, sender: ClientInfo, isReady: bool):
        if isinstance(isReady, bool):
            sender.isReady = isReady
    
    # generate a broadcast from an incoming message
    # returns: (bc_type, bc_data, exclude_sender) | None
    def generate_broadcast(self, req_type: MsgType, req_data: str | None) -> tuple[MsgType, str | None, bool] | None:
        match req_type:
            case MsgType.CONNECT_REQUEST:
                return MsgType.PLAYER_CONNECTED, None, True

            case MsgType.MAZE:
                self.stored_maze = req_data
                return MsgType.MAZE, self.stored_maze, True
            
            case MsgType.SET_READY:
                if isinstance(req_data, bool):
                    return MsgType.SET_READY, req_data, True
            
            case _:
                return None
    
    
    async def send_broadcast(self, message: str, exclude: ClientInfo | None = None):
        if len(self.clients) == 0:
            return

        send_tasks = [
            client.send(message)
            for client in self.clients
            if (not exclude) or (client.name != exclude.name)
        ]

        await asyncio.gather(*send_tasks, return_exceptions=True)
    
    async def regen_maze(self):
        self.stored_maze = generateDFSRectMaze(DEFAULT_MAZE_DIMENSIONS.width, DEFAULT_MAZE_DIMENSIONS.height)
        for c in self.clients:
            await c.send(build_broadcast_msg(None, MsgType.MAZE, self.stored_maze.get_matrix()))
        print("Sent new maze successfully!")

    async def handle_terminal_input(self):
        while self.running:
            user_input = (await asyncio.to_thread(input)).upper()
            
            if user_input == 'QUIT':
                print("Server shutting down...")
                self.running = False
                break
            elif user_input == 'MAZE':
                print(self.stored_maze.get_matrix())
            elif user_input == 'NEW_MAZE':
                asyncio.create_task(self.regen_maze())
            else:
                print(f"Unknown command: {user_input}")

    async def game_loop(self):
        while self.running:
            start = time.perf_counter()

            # send dirty positions
            if len(self.dirty_pos_dict):
                dirty_pos_msg = build_broadcast_msg(None, MsgType.UPDATE_POS, self.dirty_pos_dict)
                await self.send_broadcast(dirty_pos_msg, None)
                self.dirty_pos_dict.clear()

            await asyncio.sleep(max(1. / GAME_LOOP_RATE - (time.perf_counter() - start), 0))


if __name__ == "__main__":
    server = Server()

    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        print("\nServer stopped manually.")
    # except Exception as e:
    #     print(f"An unexpected error occurred: {e}")
