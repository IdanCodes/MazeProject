import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import clsx from "clsx";

const SERVER_PORT = 3003;
const SERVER_IP = "127.0.0.1";
const SERVER_WS_URL: string = `ws://${SERVER_IP}:${SERVER_PORT}`;

interface Message {
  time: number;
  text: string;
  type: string;
}

function NetworkTests() {
  const [inputValue, setInputValue] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  const wsRef = useRef<WebSocket>(null);
  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  useEffect(() => {
    if (wsRef.current) return;
    addMessage(`Attempting to connect to ${SERVER_WS_URL}...`, "system");

    wsRef.current = new WebSocket(SERVER_WS_URL);

    wsRef.current.onopen = () => {
      addMessage("WebSocket Connected to Node.js intermediary", "system");
    };

    wsRef.current.onmessage = onReceiveMessage;

    wsRef.current.onerror = (error) => {
      addMessage(
        `WebSocket error has occurred "${JSON.stringify(error)}"`,
        "system",
      );
    };

    return () => {
      // Close the WebSocket connection when the component unmounts
      console.log("closing", isConnected);
      if (isConnected) wsRef.current!.close();
    };
  }, []);

  const addMessage = (text: string, type: string) => {
    setMessages((prev) => [...prev, { time: Date.now(), text, type }]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    e.preventDefault();
    setInputValue(e.target.value);
  };

  function sendMessage() {
    const toSend = inputValue.trim();
    if (toSend.length == 0 || !wsRef.current) return;
    if (!isConnected)
      return addMessage("Cannot send - WebSocket is not connected", "system");

    const socket = wsRef.current;
    socket.send(toSend);
    addMessage(toSend, "sent");
    setInputValue(""); // clear
  }

  function onReceiveMessage(event: MessageEvent) {
    addMessage(event.data, "received");
  }

  return (
    <div className="w-[80%] mx-auto flex flex-col justify-center h-fit border-5 gap-10 p-5">
      <input
        className="border-2 rounded-xl text-xl p-2"
        value={inputValue}
        placeholder="text to send..."
        type="text"
        onChange={handleInputChange}
      />
      <button
        className={clsx("border-2 text-xl font-bold cursor-pointer")}
        disabled={inputValue.length == 0}
        onClick={sendMessage}
      >
        Send Message
      </button>

      <h2 className="text-xl font-semibold mb-3 text-gray-700">
        Communication Log
      </h2>
      <div className="message-box p-4 space-y-2">
        {messages
          .slice()
          .reverse()
          .map((msg) => (
            <p key={msg.time} className={`text-sm ${msg.type}`}>
              {new Date(msg.time).toLocaleTimeString()}[{msg.type.toUpperCase()}
              ] {msg.text}
            </p>
          ))}
      </div>
      <div className="text-xs text-gray-400 mt-4">
        Target: `{SERVER_WS_URL}` (Python UDP Server)
      </div>
    </div>
  );
}

export default NetworkTests;
