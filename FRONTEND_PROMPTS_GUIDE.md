# 📋 Frontend Prompts & Documentation - Ready to Use

## 🎯 Choose Your Prompt Based on Team Needs

### For Quick Implementation (Start Here)
📄 **`FRONTEND_TASK.md`** ⭐ RECOMMENDED
- Step-by-step implementation guide
- Copy-paste ready code for all 4 files
- Testing procedures with cURL commands
- ~35-45 minutes to complete
- Best for: Getting started quickly

### For Detailed Requirements
📄 **`FRONTEND_INTEGRATION_PROMPT.md`**
- Complete requirements checklist
- Architecture breakdown
- Error handling details
- Performance considerations
- Accessibility guidelines
- Best for: Senior engineers, code review

### For Existing Developers (Ultra-Concise)
📄 **`QUICK_SNIPPETS.md`**
- Copy-paste code ready
- Multiple CSS framework options (Tailwind, Bootstrap, CSS)
- React Toastify integration
- Browser console testing
- Best for: Developers who know what they're doing

### For Complete Reference
📄 **`FRONTEND_BADGE_SETUP.md`**
- Complete React implementation guide
- Socket.IO setup with examples
- Custom hooks with full code
- Component examples
- Material-UI, Chakra UI options
- Error handling & fallback
- Best for: Comprehensive understanding

---

## 🚀 Quick Start (2 Minutes)

### For Your Frontend Team Lead:
**Send this prompt:**

> "Implement Socket.IO live badge for maintenance requests. 
> 
> Backend emits:
> - Event `mtn:badge-count` with {count, type, timestamp}
> - REST fallback: GET /api/mtn/bills/unseen-count
>
> Create 4 files:
> 1. src/services/socketService.ts - Initialize Socket.IO
> 2. src/hooks/useMtnBadge.ts - Listen to badge-count event, poll if disconnected
> 3. src/components/MtnBadge.tsx - Display count only if > 0
> 4. src/components/MtnBadge.css - Circular red badge with pulse animation
>
> Integrate into Header, test with cURL. See FRONTEND_TASK.md for full details."

---

## 📊 Documentation Map

```
Choose your entry point:

┌─────────────────────────────────────────┐
│         ALL FRONTEND DEVELOPERS         │
│              START HERE                 │
└─────────────────────────┬───────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   🏃 Quick             📖 Detailed      💻 Code
   (35 min)            (Comprehensive)   (Copy-Paste)
        │                 │                 │
        ▼                 ▼                 ▼
  FRONTEND_TASK.md    FRONTEND_BADGE_    QUICK_SNIPPETS.md
                      SETUP.md & 
                      FRONTEND_INTEGRATION
                      _PROMPT.md
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                   ✅ IMPLEMENTATION
```

---

## 📁 Complete File List for Frontend

| File | Purpose | Use When |
|------|---------|----------|
| `FRONTEND_TASK.md` | Step-by-step implementation (350 lines) | Starting implementation |
| `FRONTEND_INTEGRATION_PROMPT.md` | Detailed requirements & checklist | Requirements review |
| `QUICK_SNIPPETS.md` | Copy-paste code snippets (550+ lines) | Need actual code |
| `FRONTEND_BADGE_SETUP.md` | Complete React guide | Learning/reference |
| `BADGE_SYSTEM_INDEX.md` | Architecture overview | Understanding system |
| `NOTIFICATION_SERVICE.md` | Backend event details | Debugging/integration |

---

## 🔄 Recommended Reading Order

### For Frontend Dev (React/TypeScript)
1. Read: `FRONTEND_TASK.md` (10 min)
2. Copy: Code from `QUICK_SNIPPETS.md` (5 min)
3. Implement: 4 files (20 min)
4. Test: With cURL commands (10 min)
5. Deploy: Push to staging
6. Total: ~45 minutes

### For Frontend Architect/Lead
1. Read: `FRONTEND_INTEGRATION_PROMPT.md` (15 min)
2. Review: `FRONTEND_BADGE_SETUP.md` (10 min)
3. Review checklist in: `FRONTEND_TASK.md` (5 min)
4. Assign to team

### For Full Understanding
1. Overview: `BADGE_SYSTEM_INDEX.md` (5 min)
2. Backend details: `NOTIFICATION_SERVICE.md` (10 min)
3. Frontend setup: `FRONTEND_BADGE_SETUP.md` (15 min)
4. Implementation: `FRONTEND_TASK.md` (10 min)

---

## 💡 Quick Implementation Summary

### 4 Files to Create
```typescript
// 1. Service (Initialize Socket)
src/services/socketService.ts
  export const initializeSocket = (token) => { /* ... */ }
  export const getSocket = () => { /* ... */ }

// 2. Hook (Listen to Events)
src/hooks/useMtnBadge.ts
  export const useMtnBadge = () => {
    const [count, setCount] = useState(0);
    socket.on('mtn:badge-count', (data) => setCount(data.count));
    return {count};
  }

// 3. Component (Display Badge)
src/components/MtnBadge.tsx
  if (count === 0) return null;
  return <span className="badge">{count}</span>;

// 4. Styles
src/components/MtnBadge.css
  .badge { background: #dc3545; border-radius: 50%; }
```

### Integration (2 Places)
```typescript
// 1. App.tsx - Initialize socket
useEffect(() => {
  const token = localStorage.getItem('token');
  initializeSocket(token);
}, []);

// 2. Header component - Add badge
<a href="/maintenance">
  Maintenance
  <MtnBadge />
</a>
```

### Testing (3 Tests)
```bash
# Create request (badge +1)
curl -X POST /api/mtn/request -H "Authorization: Bearer $TOKEN" ...

# Admin update (badge -1)
curl -X PUT /api/mtn/request/:id/admin -H "Authorization: Bearer $TOKEN" ...

# Check count (REST fallback)
curl /api/mtn/bills/unseen-count -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Dependencies

```bash
npm install socket.io-client
# Optional:
npm install react-toastify  # For notifications
```

---

## 🎓 What You'll Learn

By implementing this, you'll understand:
- ✅ Socket.IO client connection and event listeners
- ✅ Custom React hooks with side effects
- ✅ Polling fallback patterns
- ✅ Real-time UI updates
- ✅ Component composition
- ✅ State management in React
- ✅ Error handling and resilience

---

## 🏆 Success Criteria

After implementation, verify:
- [ ] Badge appears in header
- [ ] Create request → badge shows +1
- [ ] Admin updates → badge shows -1
- [ ] Disconnect network → polling works
- [ ] Reconnect → Socket.IO resumes
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Badge hides when count = 0

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Badge not updating | Check token in localStorage, Socket.IO connection |
| CORS error | Verify backend CORS config |
| Memory leak | Ensure event listeners cleaned up in useEffect return |
| High CPU | Verify polling interval is 60s, not too frequent |
| No connection | Check backend URL in socketService |

---

## 📞 Support Resources

- Questions about implementation? → `FRONTEND_TASK.md`
- Need code examples? → `QUICK_SNIPPETS.md`
- Want full guide? → `FRONTEND_BADGE_SETUP.md`
- Debugging Socket.IO? → Browser DevTools Console
- Backend questions? → `NOTIFICATION_SERVICE.md`

---

## 🎯 TL;DR

**Send to your frontend team:**

> 📄 See `FRONTEND_TASK.md` for complete step-by-step guide.
> 
> In 45 minutes:
> - Create 4 files (service, hook, component, styles)
> - Add Socket.IO event listener
> - Display real-time badge in header
> - Test with provided cURL commands
> 
> All code examples in `QUICK_SNIPPETS.md`
> 
> Backend ready ✅ → Your turn! 🚀

---

**Status: ✅ All frontend documentation ready. Pick a prompt and start implementing!**

Last Generated: December 4, 2025
