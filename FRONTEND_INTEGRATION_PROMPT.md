# Frontend Integration Prompt

You are a React/TypeScript developer integrating a real-time badge notification system into an Express.js backend maintenance application.

## Context

The backend has implemented Socket.IO event emissions for maintenance request badges that should:
1. **Increase** when a user submits a new maintenance request
2. **Decrease** when an admin responds to/updates that request
3. Show a **real-time counter** in the header/navbar without requiring page refresh

## Backend Events Available

The backend emits three Socket.IO events:

### Event: `mtn:badge-count`
**Fired:** Whenever pending request count changes  
**Payload:**
```javascript
{
  count: 5,
  type: 'new-request' | 'request-updated' | 'broadcast',
  action?: 'verified' | 'rejected',
  timestamp: "2025-12-04T10:30:00Z"
}
```

### Event: `mtn:new-request`
**Fired:** When new maintenance request is created  
**Payload:**
```javascript
{
  requestId: 12345,
  requester: "000317",
  timestamp: "2025-12-04T10:30:00Z",
  message: "New maintenance request submitted"
}
```

### Event: `mtn:request-updated`
**Fired:** When admin verifies/approves/rejects a request  
**Payload:**
```javascript
{
  requestId: 12345,
  action: 'verified' | 'approved' | 'rejected',
  updatedBy: "000500",
  timestamp: "2025-12-04T10:30:00Z",
  message: "Maintenance request verified"
}
```

## REST Fallback Endpoint

If Socket.IO fails, poll this endpoint:

```
GET /api/mtn/bills/unseen-count
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "message": "Unseen bills count retrieved successfully",
  "data": { "count": 5 }
}
```

Poll every 60 seconds if Socket.IO is disconnected.

## Requirements

### Must Have
- [ ] Socket.IO client connected to backend on app load
- [ ] Listen for `mtn:badge-count` event
- [ ] Display badge with current count in header
- [ ] Badge only shows if count > 0
- [ ] Badge persists until page reload or socket disconnect
- [ ] No errors in console on Socket.IO failures

### Should Have
- [ ] REST polling fallback when Socket.IO unavailable
- [ ] Listen to `mtn:new-request` and show toast notification
- [ ] Listen to `mtn:request-updated` and show toast notification
- [ ] Display badge count in browser tab title (optional)
- [ ] Smooth CSS animations on badge updates

### Nice to Have
- [ ] Badge pulse animation when new request arrives
- [ ] Sound notification on new request
- [ ] User preference to disable notifications
- [ ] Notification history/log
- [ ] Redux/Zustand state management for badge count

## Implementation Checklist

### Step 1: Socket.IO Service
- [ ] Create `src/services/socketService.ts`
- [ ] Initialize Socket.IO connection with token auth
- [ ] Export `initializeSocket()` function
- [ ] Export `getSocket()` function to retrieve instance
- [ ] Handle connect/disconnect events
- [ ] Log errors to console (dev mode)

### Step 2: Custom Hook
- [ ] Create `src/hooks/useMtnBadge.ts`
- [ ] Initialize Socket.IO on mount
- [ ] Listen to `mtn:badge-count` event
- [ ] Update state with count
- [ ] Setup polling interval if socket disconnected
- [ ] Return `{ count, loading }`
- [ ] Cleanup event listeners on unmount

### Step 3: Badge Component
- [ ] Create `src/components/MtnBadge.tsx`
- [ ] Use `useMtnBadge()` hook
- [ ] Only render if count > 0
- [ ] Display count (or "99+" if > 99)
- [ ] Add CSS styling with animations
- [ ] Add hover title showing "X pending requests"

### Step 4: Header Integration
- [ ] Import `MtnBadge` component in Header/Navbar
- [ ] Place badge next to "Maintenance" link
- [ ] Verify badge displays correctly
- [ ] Test responsive design

### Step 5: Notifications (Optional)
- [ ] Listen to `mtn:new-request` event
- [ ] Show toast notification on new request
- [ ] Listen to `mtn:request-updated` event
- [ ] Show toast notification on update
- [ ] Use your toast library (react-toastify, sonner, etc.)

### Step 6: Testing
- [ ] Create test request via POST /api/mtn/request
- [ ] Verify badge increments in real-time
- [ ] Admin updates request via PUT /api/mtn/request/:id/admin
- [ ] Verify badge decrements in real-time
- [ ] Disconnect Socket.IO (DevTools > Network > Offline)
- [ ] Verify polling fallback starts (60s interval)
- [ ] Reconnect and verify Socket.IO resumes

## Code Structure

```
src/
├── services/
│   └── socketService.ts          ← Initialize Socket.IO
├── hooks/
│   └── useMtnBadge.ts            ← Badge logic hook
├── components/
│   ├── MtnBadge.tsx              ← Badge UI component
│   ├── MtnBadge.css              ← Badge styling
│   └── Header.tsx                ← Add badge here
└── pages/
    └── App.tsx                   ← Initialize socket on load
```

## CSS Styling Options

### Option 1: Tailwind CSS
```jsx
<span className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse ml-2">
  {count > 99 ? '99+' : count}
</span>
```

### Option 2: Bootstrap
```jsx
<span className="badge badge-danger ms-2">
  {count > 99 ? '99+' : count}
</span>
```

### Option 3: Custom CSS
```css
.badge {
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
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
}
```

## Key Implementation Details

### Socket.IO Service Must Include
```typescript
export const initializeSocket = (token?: string) => {
  // Create new socket with auth and reconnection options
  // Handle connect/disconnect/error events
  // Return socket instance
};

export const getSocket = (): Socket | null => {
  // Return the socket instance (or null if not initialized)
};
```

### Hook Must Include
```typescript
export const useMtnBadge = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to mtn:badge-count event
    // Update count state
    // Setup polling if socket disconnected
    // Cleanup on unmount
  }, []);

  return { count, loading };
};
```

### Component Must Include
```typescript
export const MtnBadge: React.FC = () => {
  const { count } = useMtnBadge();
  
  if (count === 0) return null; // Don't show empty badge
  
  return (
    <span className="badge" title={`${count} pending requests`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};
```

## Error Handling

### Socket.IO Failures
- Don't crash app if Socket.IO unavailable
- Log errors to console in development
- Fall back to REST polling automatically
- Show graceful degradation

### Network Issues
- Handle disconnect events
- Start polling interval on disconnect
- Resume Socket.IO listener on reconnect
- Prevent duplicate event listeners

### State Management
- Initialize count to 0
- Keep count in component state only (unless using Redux)
- No persistence needed (fetch on app load)
- Clean up listeners to prevent memory leaks

## Browser Compatibility

- [ ] Works on Chrome/Edge (latest)
- [ ] Works on Firefox (latest)
- [ ] Works on Safari (latest)
- [ ] Responsive on mobile (badge still visible)
- [ ] No console errors

## Performance Considerations

- [ ] Socket.IO connection established once on app load
- [ ] Event listeners cleaned up on component unmount
- [ ] No unnecessary re-renders (use memoization if needed)
- [ ] Polling interval set to 60 seconds (not too aggressive)
- [ ] Badge component lightweight and fast

## Accessibility

- [ ] Badge has `title` attribute (hover text)
- [ ] Badge color has sufficient contrast (AA standard)
- [ ] Badge doesn't hide other content
- [ ] Screen reader can access badge text

## Testing Checklist

```bash
# Manual Testing
1. Open app → Socket connects (check DevTools > Network)
2. Create maintenance request → Badge shows 1
3. Create another request → Badge shows 2
4. Admin updates first request → Badge shows 1
5. Turn off network → Badge remains, polling starts
6. Turn on network → Badge updates via Socket.IO again
7. Refresh page → Badge initializes correctly
```

## Common Pitfalls to Avoid

❌ **Don't:** Create new Socket connection on every render  
✅ **Do:** Initialize once in App.tsx useEffect with empty dependency array

❌ **Don't:** Forget to cleanup event listeners  
✅ **Do:** Remove listeners in useEffect cleanup function

❌ **Don't:** Show badge for count === 0  
✅ **Do:** Only render badge when count > 0

❌ **Don't:** Poll too frequently  
✅ **Do:** Poll every 60 seconds (or less frequently)

❌ **Don't:** Ignore Socket.IO errors  
✅ **Do:** Log and handle gracefully

## Testing Endpoints (via cURL)

### Create Request (Badge +1)
```bash
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "req_date": "2025-12-04",
    "ramco_id": "000317",
    "asset_id": 115,
    "costcenter_id": 1,
    "location_id": 1,
    "ctc_m": "0100000000",
    "svc_opt": "1,2,3",
    "req_comment": "Test"
  }'
```

### Admin Update (Badge -1)
```bash
REQ_ID=12345  # From create response
curl -X PUT "http://localhost:3030/api/mtn/request/$REQ_ID/admin" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "verification_stat": 1,
    "ws_id": 5,
    "major_opt": "1,2"
  }'
```

### Check Badge (REST Fallback)
```bash
curl 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H "Authorization: Bearer $TOKEN"
```

## Documentation References

For full implementation details, see:
- **Full Code Examples:** `QUICK_SNIPPETS.md`
- **Complete Setup Guide:** `FRONTEND_BADGE_SETUP.md`
- **Architecture Overview:** `NOTIFICATION_SERVICE.md`
- **Master Index:** `BADGE_SYSTEM_INDEX.md`

---

**Ready to implement?** Start with Socket.IO service, then build the hook, component, and integrate into header. Test with the cURL endpoints provided above.

Good luck! 🚀
