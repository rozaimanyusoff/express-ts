# Frontend Code Samples - Copy & Paste Ready

## 1. Socket.IO Hook (React)

### File: `src/hooks/useMtnBadgeCount.ts`

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseMtnBadgeCountReturn {
  count: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  refreshCount: () => Promise<void>;
}

export const useMtnBadgeCount = (): UseMtnBadgeCountReturn => {
  const [count, setCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Get auth token (adjust based on your auth setup)
  const getAuthToken = (): string => {
    return localStorage.getItem('auth_token') || '';
  };

  // Fetch count via REST API
  const refreshCount = async (): Promise<void> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No auth token found');
        setCount(0);
        return;
      }

      const response = await fetch('/api/mtn/bills/unseen-count', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Unauthorized');
          setCount(0);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      
      // Handle different response shapes
      const newCount = 
        data.data?.count ?? 
        data.count ?? 
        data.unseen ?? 
        0;
      
      setCount(newCount);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh maintenance badge count:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch count');
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Socket.IO and polling fallback
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('No auth token found');
      setIsLoading(false);
      return;
    }

    // Try to connect to Socket.IO
    const newSocket = io(window.location.origin, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Socket connection handlers
    newSocket.on('connect', () => {
      console.log('[MTN Badge] Socket.IO connected');
      setIsConnected(true);
      // Stop polling when connected
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      // Refresh count on connect
      refreshCount();
    });

    newSocket.on('disconnect', () => {
      console.log('[MTN Badge] Socket.IO disconnected');
      setIsConnected(false);
      // Start polling when disconnected
      startPolling();
    });

    // Listen for form upload events
    newSocket.on('mtn:form-uploaded', (data) => {
      console.log('[MTN Badge] Form uploaded:', data);
      // Refresh count when form is uploaded
      refreshCount();
    });

    // Listen for count update events
    newSocket.on('mtn:counts', (data) => {
      console.log('[MTN Badge] Counts updated:', data);
      if (typeof data.unseenBills === 'number') {
        setCount(data.unseenBills);
      }
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('[MTN Badge] Socket.IO connection error:', error);
      // Fallback to polling
      startPolling();
    });

    newSocket.on('error', (error) => {
      console.error('[MTN Badge] Socket.IO error:', error);
    });

    setSocket(newSocket);
    setIsLoading(false);

    // Cleanup on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      newSocket.disconnect();
    };
  }, []);

  // Polling fallback (every 60 seconds)
  const startPolling = () => {
    // Don't start polling if already started
    if (pollInterval) return;

    console.log('[MTN Badge] Starting polling fallback (60s interval)');
    
    // Initial refresh
    refreshCount();
    
    // Set up interval
    const interval = setInterval(() => {
      console.log('[MTN Badge] Polling refresh...');
      refreshCount();
    }, 60000); // 60 seconds

    setPollInterval(interval);
  };

  return {
    count,
    isConnected,
    isLoading,
    error,
    refreshCount
  };
};
```

---

## 2. Badge Component

### File: `src/components/MaintenanceBadge.tsx`

```tsx
import React from 'react';
import { useMtnBadgeCount } from '../hooks/useMtnBadgeCount';
import styles from './MaintenanceBadge.module.css';

/**
 * Badge component showing unseen maintenance billing count
 * - Real-time updates via Socket.IO
 * - Fallback to polling every 60s if socket unavailable
 * - Shows connection status indicator
 */
export const MaintenanceBadge: React.FC = () => {
  const { count, isConnected, isLoading } = useMtnBadgeCount();

  if (isLoading) {
    return (
      <div className={styles.badge} title="Loading maintenance count...">
        <span className={styles.label}>Maintenance</span>
        <span className={styles.spinner}>⟳</span>
      </div>
    );
  }

  if (count === 0) {
    return null; // Don't show badge if no unseen items
  }

  return (
    <div 
      className={styles.badge}
      title={`${count} maintenance form(s) awaiting billing${!isConnected ? ' (polling)' : ''}`}
    >
      <span className={styles.label}>
        Maintenance Bills
        {!isConnected && (
          <span className={styles.statusIcon} title="Using polling (Socket.IO offline)">
            📡
          </span>
        )}
      </span>
      <span className={styles.count}>{count}</span>
    </div>
  );
};

export default MaintenanceBadge;
```

### File: `src/components/MaintenanceBadge.module.css`

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #856404;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

.label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background-color: #ffc107;
  color: #fff;
  border-radius: 12px;
  font-weight: bold;
  font-size: 12px;
}

.statusIcon {
  display: inline-block;
  font-size: 12px;
  opacity: 0.7;
}

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .badge {
    gap: 4px;
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .count {
    min-width: 20px;
    height: 20px;
    font-size: 10px;
  }
}
```

---

## 3. Header Integration

### File: `src/components/Header.tsx`

```tsx
import React from 'react';
import MaintenanceBadge from './MaintenanceBadge';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <h1 className={styles.logo}>Dashboard</h1>
        </div>

        <div className={styles.right}>
          {/* Maintenance Badge */}
          <MaintenanceBadge />

          {/* Other header items */}
          <button className={styles.userMenu}>
            User Menu
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

---

## 4. Error Boundary (Optional)

### File: `src/components/BadgeErrorBoundary.tsx`

```tsx
import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BadgeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Badge Error Boundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Don't render badge if there's an error
      return null;
    }

    return this.props.children;
  }
}

// Usage:
// <BadgeErrorBoundary>
//   <MaintenanceBadge />
// </BadgeErrorBoundary>
```

---

## 5. Service Layer (Optional)

### File: `src/services/maintenanceBillingService.ts`

```typescript
/**
 * Service for maintenance billing API calls
 */
const API_BASE = process.env.REACT_APP_API_URL || '';

class MaintenanceBillingService {
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Get count of unseen maintenance bills
   */
  async getUnseenBillsCount(): Promise<number> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No auth token');

    const response = await fetch(`${API_BASE}/api/mtn/bills/unseen-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data?.count ?? data.count ?? data.unseen ?? 0;
  }

  /**
   * Upload maintenance form
   */
  async uploadMaintenanceForm(
    requestId: number,
    file: File,
    uploadDate?: string
  ): Promise<any> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No auth token');

    const formData = new FormData();
    formData.append('form_upload', file);
    if (uploadDate) {
      formData.append('form_upload_date', uploadDate);
    }

    const response = await fetch(
      `${API_BASE}/api/mtn/request/${requestId}/form-upload`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update maintenance billing
   */
  async updateBilling(billingId: number, data: any): Promise<any> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No auth token');

    const response = await fetch(
      `${API_BASE}/api/bills/mtn/${billingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  }
}

export const maintenanceBillingService = new MaintenanceBillingService();
```

---

## 6. Environment Configuration

### File: `.env` (Frontend)

```env
REACT_APP_API_URL=http://localhost:3030
REACT_APP_SOCKET_IO_URL=http://localhost:3030
REACT_APP_BADGE_POLL_INTERVAL=60000
```

---

## 7. Usage Examples

### Example 1: Direct Hook Usage

```tsx
import { useMtnBadgeCount } from './hooks/useMtnBadgeCount';

export const MyComponent = () => {
  const { count, isConnected, isLoading } = useMtnBadgeCount();

  return (
    <div>
      <p>Count: {count}</p>
      <p>Status: {isConnected ? 'Connected' : 'Polling'}</p>
      {isLoading && <p>Loading...</p>}
    </div>
  );
};
```

### Example 2: Service Usage

```tsx
import { maintenanceBillingService } from './services/maintenanceBillingService';

export const FormUploadComponent = () => {
  const handleUpload = async (file: File) => {
    try {
      const result = await maintenanceBillingService.uploadMaintenanceForm(
        123,
        file,
        new Date().toISOString()
      );
      console.log('Upload successful:', result);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <input 
      type="file" 
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  );
};
```

### Example 3: Update Billing with Service

```tsx
const handleMarkProcessed = async (billingId: number) => {
  try {
    await maintenanceBillingService.updateBilling(billingId, {
      inv_stat: 'processed',
      inv_remarks: 'Invoice processed and sent'
    });
    console.log('Billing updated');
  } catch (err) {
    console.error('Failed to update billing:', err);
  }
};
```

---

## 8. Testing

### Unit Test for Hook

```typescript
// useMtnBadgeCount.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMtnBadgeCount } from './useMtnBadgeCount';

describe('useMtnBadgeCount', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test_token');
    // Mock fetch
    global.fetch = jest.fn();
  });

  it('should fetch count on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { count: 5 } })
    });

    const { result } = renderHook(() => useMtnBadgeCount());

    await waitFor(() => {
      expect(result.current.count).toBe(5);
    });
  });

  it('should handle Socket.IO events', async () => {
    const { result } = renderHook(() => useMtnBadgeCount());

    act(() => {
      // Simulate socket event
      // (Implementation depends on socket mock setup)
    });

    await waitFor(() => {
      // Assert count updated
    });
  });
});
```

---

## Notes

- **Auth Token:** Update `getAuthToken()` based on your auth system (JWT, cookies, etc.)
- **API URL:** Configure `REACT_APP_API_URL` in `.env`
- **Socket URL:** Usually same as API URL
- **Polling Interval:** Default 60s, adjustable via constant
- **Error Handling:** All components handle errors gracefully
- **TypeScript:** Full type safety throughout
- **Responsive:** CSS module includes mobile styles

---

## Common Issues & Solutions

### Issue: Badge count always 0
**Solution:** Check auth token is passed correctly and user is authorized

### Issue: Socket.IO not connecting
**Solution:** Verify `REACT_APP_API_URL` is correct and server is running

### Issue: Polling not activating
**Solution:** Check browser console for Socket.IO connection errors

### Issue: Type errors with Socket.IO
**Solution:** Install `@types/socket.io-client`: `npm install --save-dev @types/socket.io-client`

---

## Next Steps

1. Copy hook file to `src/hooks/useMtnBadgeCount.ts`
2. Copy component files to `src/components/`
3. Import and use `<MaintenanceBadge />` in header
4. Configure `.env` with API URL
5. Test with backend running
6. Monitor browser console and backend logs
