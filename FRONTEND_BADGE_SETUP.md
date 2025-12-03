# Frontend Implementation Guide - Live Badge Notifications

## Prerequisites

Ensure your frontend has Socket.IO client installed:

```bash
npm install socket.io-client
```

## Basic Setup

### 1. Initialize Socket Connection

```typescript
// src/services/socketService.ts
import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3030';
  
  socket = io(backendUrl, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Connected to backend notifications');
  });

  socket.on('disconnect', () => {
    console.log('⚠️ Disconnected from backend, will reconnect...');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    // Fallback to polling
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### 2. Create Badge Notification Hook

```typescript
// src/hooks/useMtnBadge.ts
import { useEffect, useState } from 'react';
import { getSocket } from '../services/socketService';

export const useMtnBadge = () => {
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      console.warn('Socket not initialized');
      fetchInitialCount(); // Fallback to REST
      return;
    }

    // Listen for badge count updates
    socket.on('mtn:badge-count', (data) => {
      console.log('📊 Badge count updated:', data);
      setBadgeCount(data.count || 0);
      setLoading(false);
    });

    // Listen for new requests
    socket.on('mtn:new-request', (data) => {
      console.log('🆕 New request:', data);
      // Optional: Show toast notification
      showNotification({
        type: 'success',
        title: 'New Request',
        message: `New maintenance request #${data.requestId} submitted`
      });
    });

    // Listen for request updates
    socket.on('mtn:request-updated', (data) => {
      console.log('✏️ Request updated:', data);
      showNotification({
        type: 'info',
        title: `Request ${data.action}`,
        message: `Request #${data.requestId} has been ${data.action}`
      });
    });

    // Fetch initial count on mount
    fetchInitialCount();

    // Cleanup
    return () => {
      socket.off('mtn:badge-count');
      socket.off('mtn:new-request');
      socket.off('mtn:request-updated');
    };
  }, []);

  // Fallback: REST polling if socket fails
  const fetchInitialCount = async () => {
    try {
      const response = await fetch('/api/mtn/bills/unseen-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBadgeCount(data.data?.count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch badge count:', error);
      setLoading(false);
    }
  };

  // Optional: Setup polling interval as fallback
  useEffect(() => {
    const socket = getSocket();
    
    // Only poll if socket is not connected
    if (!socket || !socket.connected) {
      const pollInterval = setInterval(fetchInitialCount, 60000); // Poll every 60s
      return () => clearInterval(pollInterval);
    }
  }, []);

  return { badgeCount, loading };
};

// Helper: Show notification toast
const showNotification = (config: any) => {
  // Use your toast library (react-toastify, react-hot-toast, etc.)
  console.log('🔔 Notification:', config);
  // Example with react-toastify:
  // toast[config.type](config.message, { title: config.title });
};
```

### 3. Badge Component

```typescript
// src/components/MtnBadge.tsx
import React from 'react';
import { useMtnBadge } from '../hooks/useMtnBadge';

export const MtnBadge: React.FC = () => {
  const { badgeCount, loading } = useMtnBadge();

  if (badgeCount === 0) return null;

  return (
    <span 
      className="badge badge-danger" 
      title={`${badgeCount} pending maintenance requests`}
    >
      {badgeCount}
    </span>
  );
};
```

### 4. Usage in Navigation/Header

```typescript
// src/components/Header.tsx
import React from 'react';
import { MtnBadge } from './MtnBadge';

export const Header: React.FC = () => {
  return (
    <header className="navbar">
      <nav>
        <a href="/">Home</a>
        <a href="/maintenance">
          Maintenance
          <MtnBadge />
        </a>
      </nav>
    </header>
  );
};
```

## Complete Example (React)

### App.tsx Setup

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { initializeSocket } from './services/socketService';
import { Header } from './components/Header';
import { MaintenancePage } from './pages/MaintenancePage';

const App: React.FC = () => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Initialize socket connection on app load
      initializeSocket(token);
    }
  }, []);

  return (
    <div className="app">
      <Header />
      <main>
        <MaintenancePage />
      </main>
    </div>
  );
};

export default App;
```

## Event Payload Examples

### `mtn:badge-count` Event

```javascript
// Emitted when badge count changes
{
  count: 5,                              // Number of pending requests
  type: 'new-request',                   // 'new-request' | 'request-updated' | 'broadcast'
  action?: 'verified' | 'rejected',      // Only when type='request-updated'
  timestamp: '2025-12-04T10:30:00Z'
}
```

### `mtn:new-request` Event

```javascript
// Emitted when new request created
{
  requestId: 12345,
  requester: "000317",
  timestamp: "2025-12-04T10:30:00Z",
  message: "New maintenance request submitted"
}
```

### `mtn:request-updated` Event

```javascript
// Emitted when admin updates request
{
  requestId: 12345,
  action: "verified",                    // 'verified' | 'approved' | 'rejected'
  updatedBy: "000500",
  timestamp: "2025-12-04T10:35:00Z",
  message: "Maintenance request verified"
}
```

## Styling Examples

### Bootstrap Badge

```html
<span class="badge badge-danger">5</span>
```

### Tailwind Badge

```html
<span class="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">5</span>
```

### Custom CSS

```css
.notification-badge {
  display: inline-block;
  min-width: 20px;
  padding: 0.25rem 0.5rem;
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  text-align: center;
  font-weight: bold;
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

## Error Handling & Fallback

The implementation automatically handles failures:

1. **Socket Connection Fails** → Falls back to REST polling
2. **REST Polling Fails** → Shows cached badge count or 0
3. **Both Fail** → Badge remains visible but may be stale

```typescript
// In your hook
const fetchWithFallback = async () => {
  try {
    // Try socket first
    const socket = getSocket();
    if (socket?.connected) {
      return; // Already listening
    }
    
    // Fallback to REST
    const response = await fetch('/api/mtn/bills/unseen-count');
    const data = await response.json();
    setBadgeCount(data.data?.count || 0);
  } catch (error) {
    // Keep existing count
    console.error('Badge fetch failed:', error);
  }
};
```

## Performance Considerations

1. **Polling Interval** - Set to 60 seconds to reduce server load
2. **Socket Reconnection** - Max 5 attempts with exponential backoff
3. **Badge Updates** - Only update DOM when count changes
4. **Memory Cleanup** - Remove event listeners on component unmount

## Testing in Browser

Open browser DevTools console:

```javascript
// Mock Socket.IO if needed
const socket = io('http://localhost:3030');

// Listen for all events
socket.on('mtn:badge-count', (data) => {
  console.log('Badge:', data);
});

socket.on('mtn:new-request', (data) => {
  console.log('New:', data);
});

// Simulate creating a request
fetch('/api/mtn/request', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    ramco_id: "000317",
    asset_id: 115,
    svc_opt: "1,2"
  })
}).then(r => r.json()).then(console.log);

// Watch badge count increase
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge not updating | Check Socket.IO connection in DevTools Network tab |
| CORS errors | Verify CORS configured in backend |
| Token not sent | Ensure token in localStorage and valid |
| Polling too slow | Reduce polling interval or check socket connection |
| High memory usage | Verify event listeners are cleaned up |

## Next Steps

1. ✅ Copy socket service code to your project
2. ✅ Create badge component with hook
3. ✅ Add to header/navbar
4. ✅ Test with create/update requests
5. ✅ Deploy and monitor logs

## Support

Refer to main documentation: `NOTIFICATION_SERVICE.md`
