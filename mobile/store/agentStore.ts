// Zustand global store for agent state
import { create } from 'zustand';

export type SourceStatus = 'pending' | 'ingested' | 'failed';
export type ActionStatus = 'pending' | 'running' | 'success' | 'failed' | 'retrying' | 'skipped' | 'rolled_back' | 'recovered';

export interface Source {
  id: string;
  type: 'pdf' | 'web' | 'csv' | 'json' | 'feed';
  name: string;
  credibility_score: number;
  recency_score: number;
  timestamp: string;
  status: SourceStatus;
  metadata?: Record<string, any>;
}

export interface Insight {
  id: string;
  type: 'risk' | 'opportunity' | 'trend' | 'anomaly' | 'contradiction' | 'signal';
  title: string;
  description: string;
  sources: string[];
  confidence: number;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  metric?: string;
  value?: string;
  trend?: string;
}

export interface Contradiction {
  id: string;
  metric: string;
  source_a_id: string;
  source_b_id: string;
  value_a: string;
  value_b: string;
  winner_id: string;
  resolution_reason: string;
  investigation_path: string[];
}

export interface Action {
  id: string;
  name: string;
  type: string;
  description: string;
  cost_pkr: number;
  time_estimate_hours: number;
  status: ActionStatus;
  sequence_order: number;
  constraints_violated: string[];
  rationale?: string;
  recovery_action?: string;
}

export interface ActionExecution {
  id: string;
  action_id: string;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  cost_actual: number;
  latency_ms: number;
  status: ActionStatus;
  error_message?: string;
  recovery_action?: string;
  retry_count: number;
}

export interface SystemState {
  stock_level_units: number;
  stockout_risk_pct: number;
  supplier_status: string;
  pending_orders: number;
  customer_notifications_sent: number;
  delivery_estimate_days: number;
  monitoring_active: boolean;
  emergency_order_placed: boolean;
}

export interface TraceEntry {
  id: string;
  step_index: number;
  trace_type: 'planning' | 'tool_call' | 'constraint_check' | 'decision' | 'failure' | 'recovery' | 'outcome';
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  reasoning?: string;
  decision?: string;
  timestamp: string;
}

export interface StreamEvent {
  event: string;
  action_id?: string;
  action_name?: string;
  status?: string;
  error?: string;
  recovery_action?: string;
  recovery_log?: any[];
  before_state?: SystemState;
  after_state?: SystemState;
  cost_pkr?: number;
  latency_ms?: number;
  running_total_cost?: number;
  outcome?: any;
  timestamp: string;
}

interface AgentStore {
  // Session
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Data
  sources: Source[];
  insights: Insight[];
  contradictions: Contradiction[];
  actions: Action[];
  executions: ActionExecution[];
  trace: TraceEntry[];
  streamEvents: StreamEvent[];
  workplan: string[];
  constraintSummary: Record<string, any> | null;
  noiseReport: Record<string, any> | null;
  trends: any[];

  // States
  beforeState: SystemState | null;
  afterState: SystemState | null;
  totalCostPkr: number;
  totalLatencyMs: number;
  isExecuting: boolean;
  executionComplete: boolean;

  // Actions
  setSessionId: (id: string | null) => void;
  setSources: (sources: Source[]) => void;
  setAnalysisResult: (result: any) => void;
  addStreamEvent: (event: StreamEvent) => void;
  updateActionStatus: (actionId: string, status: ActionStatus) => void;
  setOutcome: (before: SystemState, after: SystemState, cost: number, latency: number) => void;
  setTrace: (trace: TraceEntry[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setExecuting: (v: boolean) => void;
  setExecutionComplete: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null, isLoading: false, error: null,
  sources: [], insights: [], contradictions: [], actions: [],
  executions: [], trace: [], streamEvents: [], workplan: [],
  constraintSummary: null, noiseReport: null, trends: [],
  beforeState: null, afterState: null,
  totalCostPkr: 0, totalLatencyMs: 0,
  isExecuting: false, executionComplete: false,
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),
  setSources: (sources) => set({ sources }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  setExecuting: (v) => set({ isExecuting: v }),
  setExecutionComplete: (v) => set({ executionComplete: v }),

  setAnalysisResult: (result) => set({
    insights: result.insights || [],
    contradictions: result.contradictions || [],
    actions: result.actions || [],
    workplan: result.workplan || [],
    constraintSummary: result.constraint_summary || null,
    noiseReport: result.noise_report || null,
    trends: result.trends || [],
    // Reset execution state for new analysis
    executionComplete: false,
    beforeState: null,
    afterState: null,
    totalCostPkr: 0,
    totalLatencyMs: 0,
    streamEvents: [],
  }),

  addStreamEvent: (event) => {
    set((state) => ({ streamEvents: [...state.streamEvents, event] }));
    if (event.event === 'action_start') {
      get().updateActionStatus(event.action_id!, 'running');
    } else if (event.event === 'action_complete') {
      get().updateActionStatus(event.action_id!, event.status as ActionStatus);
    } else if (event.event === 'action_failed') {
      get().updateActionStatus(event.action_id!, 'failed');
    } else if (event.event === 'action_recovered') {
      get().updateActionStatus(event.action_id!, event.final_status as ActionStatus || 'success');
    } else if (event.event === 'chain_complete') {
      set({
        beforeState: event.before_state || null,
        afterState: event.after_state || null,
        totalCostPkr: event.total_cost_pkr || 0,
        totalLatencyMs: event.total_latency_ms || 0,
        executionComplete: true,
        isExecuting: false,
      });
    }
  },

  updateActionStatus: (actionId, status) =>
    set((state) => ({
      actions: state.actions.map((a) => a.id === actionId ? { ...a, status } : a),
    })),

  setOutcome: (before, after, cost, latency) =>
    set({ beforeState: before, afterState: after, totalCostPkr: cost, totalLatencyMs: latency }),

  setTrace: (trace) => set({ trace }),
  reset: () => set(initialState),
}));
