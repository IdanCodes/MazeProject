import asyncio
import inspect
import uuid
from collections import defaultdict

class EventBus:
    def __init__(self):
        # Structure: { "event_name": { "uuid_123": callback_func } }
        self._subscribers = defaultdict(dict)

    def subscribe(self, event_type: str, callback_id: uuid.UUID, callback: callable) -> None:
        """Adds a listener and returns a unique ID."""
        self._subscribers[event_type][callback_id] = callback

    def unsubscribe(self, event_type: str, callback_id: uuid.UUID) -> bool:
        """Removes a listener using its unique ID."""
        if event_type in self._subscribers:
            # .pop() removes the key and returns the value (or None if missing)
            return self._subscribers[event_type].pop(callback_id, None) is not None
        return False

    async def emit(self, event_type, *args, **kwargs):
        """Triggers all listeners for an event."""
        # Use .values() to iterate over the actual functions
        handlers = self._subscribers.get(event_type, {}).values()
        for callback in list(handlers):
            asyncio.create_task(callback(*args, **kwargs))