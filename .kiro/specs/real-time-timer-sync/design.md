# Design Document

## Overview

This design implements real-time timer synchronization using Supabase's real-time capabilities to achieve sub-100ms cross-browser updates. The solution eliminates polling-based synchronization and server-side memory state, replacing them with database-driven real-time subscriptions and optimized state management.

## Architecture

### Current Architecture Issues
- Mixed state management between server memory and Supabase
- 2-second polling intervals causing delays
- Separate API routes for different operations
- No real-time subscriptions

### New Architecture
- **Single Source of Truth**: Supabase database as the only state store
- **Real-time Subscriptions**: WebSocket-based updates via Supabase Realtime
- **Optimistic Updates**: Immediate UI updates with server confirmation
- **Server-side Time Calculations**: Accurate time tracking using database timestamps

## Components and Interfaces

### 1. Database Schema Optimization
```sql
-- Enhanced timer table with optimized indexing
CREATE TABLE IF NOT EXISTS global_timer (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_seconds INTEGER NOT NULL DEFAULT 1500,
  remaining_seconds INTEGER NOT NULL DEFAULT 1500,
  is_running BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT -- For conflict resolution
);

-- Enable real-time for the table
ALTER PUBLICATION supabase_realtime ADD TABLE global_timer;
```

### 2. Real-time Supabase Client
```typescript
interface TimerState {
  id: number;
  total_seconds: number;
  remaining_seconds: number;
  is_running: boolean;
  started_at: string | null;
  updated_at: string;
  session_id?: string;
}

interface TimerHook {
  timerState: TimerState | null;
  isLoading: boolean;
  error: string | null;
  updateTimer: (updates: Partial<TimerState>) => Promise<void>;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  createTimer: (minutes: number) => Promise<void>;
  applyHint: () => Promise<void>;
}
```

### 3. Custom Hook for Timer Management
The `useRealtimeTimer` hook will:
- Subscribe to real-time database changes
- Handle optimistic updates
- Manage local state synchronization
- Calculate accurate remaining time
- Handle connection recovery

### 4. Simplified API Routes
- **Single unified route**: `/api/timer` for all operations
- **Stateless operations**: No server-side memory storage
- **Database-only state**: All operations directly on Supabase
- **Timestamp-based calculations**: Server-side time accuracy

## Data Models

### TimerState Interface
```typescript
interface TimerState {
  id: number;
  total_seconds: number;
  remaining_seconds: number;
  is_running: boolean;
  started_at: string | null;
  updated_at: string;
  session_id?: string;
}
```

### Timer Operations
```typescript
type TimerAction = 
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'CREATE'; payload: { totalSeconds: number } }
  | { type: 'HINT' }
  | { type: 'SYNC'; payload: TimerState };
```

## Error Handling

### Connection Management
- **Automatic Reconnection**: Handle WebSocket disconnections
- **Offline Support**: Queue operations when offline
- **Conflict Resolution**: Handle simultaneous updates from multiple sessions
- **Fallback Polling**: Temporary polling if real-time fails

### Error Recovery
```typescript
interface ErrorHandling {
  retryConnection: () => void;
  handleSubscriptionError: (error: Error) => void;
  fallbackToPolling: () => void;
  queueOfflineOperations: (operation: TimerAction) => void;
}
```

## Testing Strategy

### Real-time Testing
- **Multi-browser synchronization tests**: Verify sub-100ms updates
- **Connection resilience tests**: Test reconnection scenarios
- **Concurrent operation tests**: Handle simultaneous user actions
- **Performance benchmarks**: Measure actual sync latency

### Integration Testing
- **Supabase integration**: Test real-time subscription reliability
- **API route optimization**: Verify stateless operation correctness
- **Database consistency**: Test concurrent update handling
- **Error scenario testing**: Network failures and recovery

## Implementation Approach

### Phase 1: Database and Real-time Setup
1. Optimize database schema and enable real-time
2. Configure Supabase client with real-time capabilities
3. Create unified API route for timer operations

### Phase 2: Real-time Hook Implementation
1. Implement `useRealtimeTimer` hook with subscriptions
2. Add optimistic updates and conflict resolution
3. Implement accurate time calculations

### Phase 3: Frontend Integration
1. Replace polling logic with real-time subscriptions
2. Update UI components to use new hook
3. Add error handling and connection status indicators

### Phase 4: Performance Optimization
1. Minimize subscription payload size
2. Implement efficient state diffing
3. Add performance monitoring and metrics

## Performance Considerations

### Optimization Strategies
- **Selective Updates**: Only propagate changed fields
- **Debounced Operations**: Prevent excessive database writes
- **Connection Pooling**: Efficient WebSocket management
- **Minimal Payload**: Reduce data transfer overhead

### Monitoring
- **Latency Metrics**: Track actual sync times
- **Connection Health**: Monitor WebSocket stability
- **Error Rates**: Track and alert on failures
- **Performance Dashboards**: Real-time sync performance visibility