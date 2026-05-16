# --- 1. Low-Level Packet Framing Component ---
import struct


class PacketFramer:
    """
    Handles buffering chunks from a TCP socket stream and pulling out complete 
    frames framed by a 4-byte Big-Endian length header.
    """
    def __init__(self):
        self.buffer = b""

    def append(self, chunk: bytes):
        self.buffer += chunk

    def next_frame(self) -> bytes | None:
        if len(self.buffer) < 4:
            return None
        
        # Read 4-byte big-endian length header (Equivalent to Node.js readUInt32BE)
        msg_len = struct.unpack('!I', self.buffer[:4])[0]
        
        if len(self.buffer) < 4 + msg_len:
            return None # The whole payload frame hasn't arrived yet

        payload = self.buffer[4:4 + msg_len]
        self.buffer = self.buffer[4 + msg_len:] # Advance stream buffer forward
        return payload

    @staticmethod
    def frame_payload(payload: bytes) -> bytes:
        """Prepends a 4-byte Big-Endian network header to raw bytes."""
        header = struct.pack('!I', len(payload))
        return header + payload
    