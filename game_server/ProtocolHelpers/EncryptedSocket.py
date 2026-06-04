import socket
from ProtocolHelpers.GameCryptoEngine import GameCryptoEngine
from ProtocolHelpers.PacketFramer import PacketFramer

RECV_BUFFER_SIZE = 1024

class EncryptedSocket:
    def __init__(self, sock: socket.socket):
        self.sock = sock
        self.framer = PacketFramer()
        self.crypto_engine = GameCryptoEngine()

    def execute_server_handshake(self) -> bool:
        """
        Executes the Server-side handshake sequence.
        Generates RSA keys, sends public key, and waits for the encrypted AES key.
        """
        try:
            # 1. Generate RSA keys and get public PEM bytes
            pub_key_bytes = self.crypto_engine.generate_handshake_keys()
            
            # 2. Frame and send to client
            handshake_packet = PacketFramer.frame_payload(pub_key_bytes)
            self.sock.sendall(handshake_packet)
            print("[Handshake] Sent public RSA identity key to client.")
            
            # 3. Block until we receive the client's encrypted AES key frame
            while not self.crypto_engine.is_handshake_complete():
                chunk = self.sock.recv(RECV_BUFFER_SIZE)
                if not chunk:
                    return False
                
                self.framer.append(chunk)
                payload_frame = self.framer.next_frame()
                
                if payload_frame:
                    # 4. Decrypt the key to unlock secure AES mode
                    self.crypto_engine.decrypt_handshake_session_key(payload_frame)
                    print("[Handshake] Successfully unlocked AES session key. Connection secure.")
                    return True
            return False
        except Exception as e:
            print(f"[Handshake] Error during negotiation: {e}")
            return False

    def send_str(self, msg_str: str) -> None:
        """Encrypts a string, wraps it with a length prefix, and sends it over TCP."""
        if not self.crypto_engine.is_handshake_complete():
            raise RuntimeError("Cannot send data: Crypto handshake is not completed yet.")
            
        # 1. Encrypt message payload via AES-GCM
        encrypted_bytes = self.crypto_engine.encrypt_message(msg_str)
        
        # 2. Wrap with 4-byte length prefix
        framed_packet = PacketFramer.frame_payload(encrypted_bytes)
        
        # 3. Fire down the wire
        self.sock.sendall(framed_packet)

    def recv_str(self) -> str | None:
        """
        Non-blocking/blocking chunk compiler. Returns a fully decrypted 
        string when a packet frame is completed. Returns None if the socket disconnects.
        """
        # Step 1: Check if there's already a complete frame sitting in our buffer
        payload_frame = self.framer.next_frame()
        if payload_frame is not None:
            return self.crypto_engine.decrypt_message(payload_frame)

        # Step 2: If not, pull new chunks from the raw network socket
        try:
            while True:
                chunk = self.sock.recv(RECV_BUFFER_SIZE)
                if not chunk:
                    return None # Connection closed cleanly by remote host
                    
                self.framer.append(chunk)
                
                # Check again if a complete packet has formed
                payload_frame = self.framer.next_frame()
                if payload_frame is not None:
                    return self.crypto_engine.decrypt_message(payload_frame)
                    
                # Frame is incomplete; loop back and block on self.sock.recv() again
            
        except ConnectionResetError:
            return None # Client disconnected abruptly

    def close(self) -> None:
        """Cleanly closes the underlying network socket."""
        self.sock.close()