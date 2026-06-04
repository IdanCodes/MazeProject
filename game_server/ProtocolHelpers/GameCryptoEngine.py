import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from protocol import NETWORK_ENCODING

NONCE_NUM_BYTES = 12

class GameCryptoEngine:
    """
    Manages RSA handshake key generation and stateful AES-GCM encryption/decryption 
    per client connection.
    """
    def __init__(self):
        self.private_key: rsa.RSAPrivateKey | None = None
        self.public_key: rsa.RSAPublicKey | None = None
        self.aes_key: bytes | None = None

    def generate_handshake_keys(self) -> bytes:
        """Generates RSA keys and returns the serialized Public Key PEM bytes to send to client."""
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.public_key = self.private_key.public_key()
        
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def decrypt_handshake_session_key(self, encrypted_aes_key_frame: bytes) -> None:
        """Decrypts the incoming AES key sent from the Electron proxy and assigns it."""
        if not self.private_key:
            raise RuntimeError("RSA Keys not initialized yet.")
            
        self.aes_key = self.private_key.decrypt(
            encrypted_aes_key_frame,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

    def is_handshake_complete(self) -> bool:
        return self.aes_key is not None

    def encrypt_message(self, plain_text_str: str) -> bytes:
        """Encrypts data into an AES-GCM payload structure: [12B Nonce] + [Ciphertext + 16B Tag]"""
        if not self.aes_key:
            raise RuntimeError("Attempted encryption before handshake complete.")
            
        aesgcm = AESGCM(self.aes_key)
        nonce = os.urandom(NONCE_NUM_BYTES)
        ciphertext = aesgcm.encrypt(nonce, plain_text_str.encode(NETWORK_ENCODING), None)
        return nonce + ciphertext

    def decrypt_message(self, aes_payload_frame: bytes) -> str:
        """Decrypts a structured AES-GCM network frame payload."""
        if not self.aes_key:
            raise RuntimeError("Attempted decryption before handshake complete.")
            
        if len(aes_payload_frame) < NONCE_NUM_BYTES:
            raise ValueError("Corrupt AES frame.")
            
        nonce = aes_payload_frame[:NONCE_NUM_BYTES]
        ciphertext = aes_payload_frame[NONCE_NUM_BYTES:]
        
        aesgcm = AESGCM(self.aes_key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode(NETWORK_ENCODING)
