# 🎯 Frontend Task: Implement Live Badge Notifications

## Task Summary
Integrate Socket.IO real-time badge notifications into React/TypeScript frontend. Badge should display count of pending maintenance requests and update in real-time when users submit or admins process requests.

## What You're Building

A badge component in the header that:
- Shows pending maintenance request count
- Updates in real-time via Socket.IO
- Falls back to REST polling if Socket.IO fails
- Shows notifications for new/updated requests

## Backend Already Has ✅

- Socket.IO server running at backend URL
- Event: `mtn:badge-count` - sends current count when it changes
- Event: `mtn:new-request` - sends when new request created
- Event: `mtn:request-updated` - sends when admin updates request
- REST endpoint: `GET /api/mtn/bills/unseen-count` - polling fallback

## Files to Create

```
src/services/socketService.ts      ← Socket.IO client setup
src/hooks/useMtnBadge.ts           ← Custom hook for badge logic
src/components/MtnBadge.tsx        ← Badge UI component
src/components/MtnBadge.css        ← Badge styling
```

## Core Implementation Flow

```
App.tsx mount
    ↓
initializeSocket() - Connect to backend
    ↓
useMtnBadge hook - Listen to 'mtn:badge-count' event
    ↓
MtnBadge component - Display count in header
    ↓
User/admin action on backend
    ↓
Backend emits 'mtn:badge-count' event
    ↓
Hook receives event, updates state
    ↓
Component re-renders with new count ✓
```

## Implementation Steps (In Order)

### 1️⃣ Create Socket Service (`src/services/socketService.ts`)

```typescript
import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token?: string) => {
  if (socket) return socket;
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3030';
  
  socket = io(backendUrl, {
    ...(token && { auth: { token } }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => console.log('✅ Socket connected'));
  socket.on('disconnect', () => console.log('⚠️ Socket disconnected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err));

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
```

### 2️⃣ Create Hook (`src/hooks/useMtnBadge.ts`)

```typescript
import { useEffect, useState } from 'react';
import { getSocket, initializeSocket } from '../services/socketService';

export const useMtnBadge = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      fetchCount();
      return;
    }

    // Listen for badge updates
    const handleBadgeCount = (data: any) => {
      setCount(data.count || 0);
      setLoading(false);
    };

    socket.on('mtn:badge-count', handleBadgeCount);
    fetchCount(); // Initial fetch

    // Poll if socket disconnected
    const interval = setInterval(() => {
      if (!socket.connected) {
        fetchCount();
      }
    }, 60000); // Every 60 seconds

    return () => {
      socket.off('mtn:badge-count', handleBadgeCount);
      clearInterval(interval);
    };
  }, []);

  const fetchCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/mtn/bills/unseen-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCount(data.data?.count || 0);
    } catch (error) {
      console.error('Badge fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading };
};
```

### 3️⃣ Create Component (`src/components/MtnBadge.tsx`)

```typescript
import React from 'react';
import { useMtnBadge } from '../hooks/useMtnBadge';
import './MtnBadge.css';

export const MtnBadge: React.FC = () => {
  const { count } = useMtnBadge();

  if (count === 0) return null;

  return (
    <span className="mtn-badge" title={`${count} pending requests`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};
```

### 4️⃣ Create Styles (`src/components/MtnBadge.css`)

```css
.mtn-badge {
  display: inline-block;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 24px;
  font-weight: bold;
  font-size: 0.75rem;
  margin-left: 8px;
  animation: pulse 2s infinite;
  vertical-align: middle;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(220, 53, 69, 0);
  }
}
```

### 5️⃣ Initialize Socket in App (`src/App.tsx`)

```typescript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    initializeSocket(token);
  }
}, []);
```

### 6️⃣ Add Badge to Header

```typescript
import { MtnBadge } from './components/MtnBadge';

export const Header: React.FC = () => {
  return (
    <header className="navbar">
      <a href="/maintenance">
        Maintenance
        <MtnBadge />
      </a>
    </header>
  );
};
```

## Testing (After Implementation)

### Test 1: Real-time Creation
```bash
# Terminal 1: Watch frontend console for events
# Terminal 2: Create request
TOKEN="your_jwt_token"
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ramco_id":"000317","asset_id":115,"svc_opt":"1,2","costcenter_id":1,"location_id":1,"ctc_m":"0100000000"}'

# Expected: Badge increments to 1 in real-time ✅
```

### Test 2: Real-time Update
```bash
# Terminal: Admin updates request
REQ_ID=12345
ADMIN_TOKEN="admin_jwt_token"
curl -X PUT "http://localhost:3030/api/mtn/request/$REQ_ID/admin" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"verification_stat":1,"ws_id":5}'

# Expected: Badge decrements in real-time ✅
```

### Test 3: Polling Fallback
```
1. DevTools > Network > Set to Offline
2. Wait for Socket.IO to disconnect
3. Badge should still show count from REST poll
4. Turn network back on
5. Badge resumes Socket.IO updates
```

## Optional Enhancements

### Add Notifications
```typescript
socket?.on('mtn:new-request', (data) => {
  toast.success(`New request #${data.requestId}`);
});

socket?.on('mtn:request-updated', (data) => {
  toast.info(`Request #${data.requestId} ${data.action}`);
});
```

### Add Tab Title Update
```typescript
socket?.on('mtn:badge-count', (data) => {
  document.title = data.count > 0 ? `(${data.count}) Dashboard` : 'Dashboard';
});
```

### Use Redux/Zustand (Optional)
Store badge count in state management instead of component state for global access.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge not showing | Check token in localStorage, Socket.IO connected (DevTools) |
| No updates | Check backend running, CORS enabled, token valid |
| High CPU usage | Verify polling interval is 60s, not too frequent |
| Memory leak | Ensure event listeners cleaned up in hook return |
| CORS error | Check backend CORS config for Socket.IO |

## Browser DevTools Debugging

```javascript
// Open Console, paste this to test:
const socket = io('http://localhost:3030');

socket.on('connect', () => console.log('✅ Connected'));
socket.on('mtn:badge-count', (data) => console.log('📊 Badge:', data));
socket.on('mtn:new-request', (data) => console.log('🆕 New:', data));
socket.on('mtn:request-updated', (data) => console.log('✏️ Updated:', data));

// Create test request
fetch('/api/mtn/request', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    ramco_id: "000317",
    asset_id: 115,
    svc_opt: "1,2"
  })
}).then(r => r.json()).then(console.log);
```

## Dependencies Required

```bash
npm install socket.io-client
```

Optional:
```bash
npm install react-toastify  # For notifications
```

## Estimated Time
- Socket Service: 5 min
- Hook: 10 min
- Component: 5 min
- Integration: 5 min
- Testing: 10 min
- **Total: ~35 minutes**

## Questions?

Refer to detailed documentation:
- `QUICK_SNIPPETS.md` - Code examples for all frameworks
- `FRONTEND_BADGE_SETUP.md` - Complete setup guide
- `NOTIFICATION_SERVICE.md` - Backend details
- `BADGE_SYSTEM_INDEX.md` - Architecture overview

---

**Start with Step 1 (Socket Service) and work through sequentially. Test after each step.** 🚀
