import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { LoadingState } from '../components/LoadingState';
import {
  Users,
  DollarSign,
  CreditCard,
  CalendarClock,
  Activity,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Server,
  Ban,
  Trash2,
  ShieldCheck,
  X,
} from 'lucide-react';

// ============================================================
// Types (mirror server/src/adminRoutes.ts responses)
// ============================================================

interface Overview {
  users: {
    total: number;
    activeLast7d: number;
    newLast24h: number;
    newLast7d: number;
    deleted: number;
    paying: number;
    conversionRate: number;
  };
  quests: { total: number; completed: number; failed: number; active: number; completionRate: number };
  engagement: { totalGates: number; totalDungeons: number };
  revenue: {
    totalCents: number;
    last30dCents: number;
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    paymentMethods: { method: string; count: number }[];
  };
  subscriptions: { byPlan: { plan: string; count: number }[]; byStatus: { status: string; count: number }[] };
  generatedAt: string;
}

interface AdminUser {
  id: string;
  hunterId: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
  subscription?: { plan: string; status: string; endDate: string | null; cancelAtPeriodEnd: boolean } | null;
  hunterStats?: { level: number; rank: string; streak: number; lastActiveDate: string } | null;
  _count?: { quests: number; payments: number };
}

interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  user?: { email: string; displayName: string; hunterId: string };
}

interface AdminSubscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  cancelAtPeriodEnd: boolean;
  user: { id: string; email: string; displayName: string; hunterId: string };
}

interface ActivityItem {
  type: 'user_registered' | 'payment' | 'quest_completed' | 'analytics_event';
  at: string;
  message: string;
  detail?: string;
}

type Tab = 'overview' | 'users' | 'payments' | 'subscriptions' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
];

const fmtMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const daysUntil = (d?: string | null) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const planBadge = (plan?: string) => {
  const styles: Record<string, string> = {
    FREE: 'bg-surface text-text-secondary border-border-subtle',
    HUNTER_PASS: 'bg-violet-gate/20 text-violet-300 border-violet-gate',
    GUILD: 'bg-gold-primary/20 text-gold-primary border-gold-primary',
    ENTERPRISE: 'bg-crimson/20 text-crimson border-crimson',
  };
  return styles[plan || 'FREE'] || styles.FREE;
};

const statusColor = (status?: string) => {
  const styles: Record<string, string> = {
    ACTIVE: 'text-emerald-400',
    COMPLETED: 'text-emerald-400',
    CANCELED: 'text-crimson',
    FAILED: 'text-crimson',
    EXPIRED: 'text-crimson',
    PAST_DUE: 'text-amber-400',
    PENDING: 'text-amber-400',
    TRIALING: 'text-sky-400',
  };
  return styles[status || ''] || 'text-text-secondary';
};

// Reusable stat card
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }> = ({
  icon,
  label,
  value,
  sub,
  accent = 'text-gold-primary',
}) => (
  <div className="bg-surface border border-border-subtle rounded-sm p-4">
    <div className="flex items-center gap-2 text-text-secondary text-xs uppercase tracking-wider mb-2">
      {icon}
      <span>{label}</span>
    </div>
    <div className={`font-display text-2xl ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
  </div>
);

const AdminDashboardPage: React.FC = () => {
  const token = useStore((s) => s.token);
  const addToast = useStore((s) => s.addToast);

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userPagination, setUserPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState('');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentTotals, setPaymentTotals] = useState({ completedRevenueCents: 0, completedCount: 0 });
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [subCounts, setSubCounts] = useState({ expiringSoon: 0, expired: 0, active: 0, canceled: 0 });
  const [subFilter, setSubFilter] = useState<'all' | 'expiring' | 'expired' | 'active' | 'canceled'>('all');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return res.json();
    },
    [token]
  );

  const loadTab = useCallback(
    async (which: Tab, pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        if (which === 'overview') {
          setOverview(await authFetch('/admin/overview'));
        } else if (which === 'users') {
          const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
          if (userSearch.trim()) params.set('search', userSearch.trim());
          const data = await authFetch(`/admin/users?${params}`);
          setUsers(data.users);
          setUserPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages, total: data.pagination.total });
        } else if (which === 'payments') {
          const data = await authFetch('/admin/payments?page=1&limit=50');
          setPayments(data.payments);
          setPaymentTotals(data.totals);
        } else if (which === 'subscriptions') {
          const data = await authFetch(`/admin/subscriptions?filter=${subFilter}`);
          setSubscriptions(data.subscriptions);
          setSubCounts(data.counts);
        } else if (which === 'activity') {
          const data = await authFetch('/admin/activity?limit=60');
          setActivity(data.activity);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [authFetch, userSearch, subFilter]
  );

  useEffect(() => {
    loadTab(tab, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, subFilter]);

  // ------- User management actions -------
  const userAction = async (userId: string, path: string, body: any, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setActionBusy(userId);
    try {
      await authFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
      addToast('success', 'Action applied');
      await loadTab('users', page);
    } catch (err: any) {
      addToast('error', err.message || 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return;
    setActionBusy(user.id);
    try {
      await authFetch(`/admin/users/${user.id}`, { method: 'DELETE' });
      addToast('success', 'User deleted');
      await loadTab('users', page);
    } catch (err: any) {
      addToast('error', err.message || 'Delete failed');
    } finally {
      setActionBusy(null);
    }
  };

  const changeSub = async (userId: string, changes: Record<string, any>) => {
    setActionBusy(userId);
    try {
      await authFetch(`/admin/subscriptions/${userId}`, { method: 'PATCH', body: JSON.stringify(changes) });
      addToast('success', 'Subscription updated');
      await loadTab('subscriptions', page);
    } catch (err: any) {
      addToast('error', err.message || 'Update failed');
    } finally {
      setActionBusy(null);
    }
  };

  if (!token) return null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-gold-primary tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> System Administration
          </h1>
          <p className="text-sm text-text-secondary mt-1">Full platform control — superadmin only</p>
        </div>
        <button
          onClick={() => loadTab(tab, page)}
          className="flex items-center gap-2 px-3 py-2 bg-surface border border-border-subtle rounded-sm text-sm text-text-secondary hover:text-text-primary transition-fast"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-subtle overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-all ${
              tab === t.id
                ? 'border-gold-primary text-gold-primary font-medium'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-crimson/10 border border-crimson/40 text-crimson text-sm rounded-sm flex items-center gap-2" role="alert">
          <ShieldAlert className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading admin data..." />
      ) : (
        <>
          {/* ================= OVERVIEW ================= */}
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users className="w-4 h-4" />} label="Total Hunters" value={String(overview.users.total)} sub={`${overview.users.newLast7d} new this week`} />
                <StatCard icon={<Activity className="w-4 h-4" />} label="Active (7d)" value={String(overview.users.activeLast7d)} sub={`${overview.users.newLast24h} joined today`} accent="text-emerald-400" />
                <StatCard icon={<DollarSign className="w-4 h-4" />} label="Total Revenue" value={fmtMoney(overview.revenue.totalCents)} sub={`${fmtMoney(overview.revenue.last30dCents)} last 30d`} accent="text-gold-primary" />
                <StatCard icon={<CreditCard className="w-4 h-4" />} label="Paying Users" value={String(overview.users.paying)} sub={`${overview.users.conversionRate}% conversion`} accent="text-violet-300" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Quests" value={String(overview.quests.total)} sub={`${overview.quests.completionRate}% completed`} />
                <StatCard icon={<Server className="w-4 h-4" />} label="Gates" value={String(overview.engagement.totalGates)} sub={`${overview.engagement.totalDungeons} dungeons`} />
                <StatCard icon={<CalendarClock className="w-4 h-4" />} label="Payments" value={String(overview.revenue.completedPayments)} sub={`${overview.revenue.failedPayments} failed`} />
                <StatCard icon={<Ban className="w-4 h-4" />} label="Disabled Accounts" value={String(overview.users.deleted)} accent="text-crimson" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-surface border border-border-subtle rounded-sm p-4">
                  <h3 className="font-display text-sm text-text-primary mb-3 uppercase tracking-wider">Subscriptions by Plan</h3>
                  <div className="space-y-2">
                    {overview.subscriptions.byPlan.length === 0 && <p className="text-text-muted text-sm">No subscription data yet.</p>}
                    {overview.subscriptions.byPlan.map((p) => (
                      <div key={p.plan} className="flex items-center justify-between text-sm">
                        <span className={`px-2 py-0.5 border rounded-sm text-xs ${planBadge(p.plan)}`}>{p.plan}</span>
                        <span className="text-text-secondary">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-surface border border-border-subtle rounded-sm p-4">
                  <h3 className="font-display text-sm text-text-primary mb-3 uppercase tracking-wider">Payment Methods</h3>
                  <div className="space-y-2">
                    {overview.revenue.paymentMethods.length === 0 && <p className="text-text-muted text-sm">No completed payments yet.</p>}
                    {overview.revenue.paymentMethods.map((m) => (
                      <div key={m.method} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{m.method}</span>
                        <span className="text-text-primary">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= USERS ================= */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTab('users', 1)}
                    placeholder="Search by email, name or hunter ID..."
                    className="w-full pl-9 pr-3 py-2 bg-raised border border-border-subtle rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary"
                  />
                </div>
                <button onClick={() => loadTab('users', 1)} className="px-4 py-2 bg-gold-primary/20 border border-gold-primary text-gold-primary rounded-sm text-sm hover:bg-gold-primary/30 transition-fast">
                  Search
                </button>
              </div>

              <div className="overflow-x-auto border border-border-subtle rounded-sm">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Hunter</th>
                      <th className="text-left px-4 py-3 font-medium">Plan</th>
                      <th className="text-left px-4 py-3 font-medium">Level</th>
                      <th className="text-left px-4 py-3 font-medium">Joined</th>
                      <th className="text-left px-4 py-3 font-medium">Quests</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                          No users found.
                        </td>
                      </tr>
                    )}
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-raised/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-text-primary flex items-center gap-1.5">
                                {u.displayName}
                                {u.role === 'SUPERADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-gold-primary" title="Superadmin" />}
                              </div>
                              <div className="text-xs text-text-muted">{u.email}</div>
                              <div className="text-xs text-text-muted">{u.hunterId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 border rounded-sm text-xs ${planBadge(u.subscription?.plan)}`}>
                            {u.subscription?.plan || 'FREE'}
                          </span>
                          <div className={`text-xs mt-1 ${statusColor(u.subscription?.status)}`}>{u.subscription?.status || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {u.hunterStats ? `Lv.${u.hunterStats.level} ${u.hunterStats.rank}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-text-secondary">{u._count?.quests ?? 0}</td>
                        <td className="px-4 py-3">
                          {u.deletedAt ? <span className="text-crimson text-xs">Disabled</span> : <span className="text-emerald-400 text-xs">Active</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.role !== 'SUPERADMIN' ? (
                              <button
                                disabled={actionBusy === u.id}
                                onClick={() => userAction(u.id, `/admin/users/${u.id}/role`, { role: 'SUPERADMIN' }, `Promote ${u.email} to SUPERADMIN?`)}
                                className="p-1.5 text-text-muted hover:text-gold-primary transition-fast"
                                title="Promote to superadmin"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                disabled={actionBusy === u.id}
                                onClick={() => userAction(u.id, `/admin/users/${u.id}/role`, { role: 'USER' }, `Demote ${u.email} to regular user?`)}
                                className="p-1.5 text-text-muted hover:text-amber-400 transition-fast"
                                title="Demote to user"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                            {u.role !== 'SUPERADMIN' &&
                              (u.deletedAt ? (
                                <button
                                  disabled={actionBusy === u.id}
                                  onClick={() => userAction(u.id, `/admin/users/${u.id}/status`, { action: 'restore' }, `Restore ${u.email}?`)}
                                  className="p-1.5 text-text-muted hover:text-emerald-400 transition-fast"
                                  title="Restore account"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  disabled={actionBusy === u.id}
                                  onClick={() => userAction(u.id, `/admin/users/${u.id}/status`, { action: 'disable' }, `Disable ${u.email}?`)}
                                  className="p-1.5 text-text-muted hover:text-amber-400 transition-fast"
                                  title="Disable account"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              ))}
                            {u.role !== 'SUPERADMIN' && (
                              <button
                                disabled={actionBusy === u.id}
                                onClick={() => deleteUser(u)}
                                className="p-1.5 text-text-muted hover:text-crimson transition-fast"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>
                  Page {userPagination.page} of {Math.max(1, userPagination.totalPages)} — {userPagination.total} users
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={userPagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-border-subtle rounded-sm disabled:opacity-30 hover:border-gold-primary transition-fast"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={userPagination.page >= userPagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 border border-border-subtle rounded-sm disabled:opacity-30 hover:border-gold-primary transition-fast"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= PAYMENTS ================= */}
          {tab === 'payments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={<DollarSign className="w-4 h-4" />} label="Lifetime Revenue" value={fmtMoney(paymentTotals.completedRevenueCents)} />
                <StatCard icon={<CreditCard className="w-4 h-4" />} label="Completed Payments" value={String(paymentTotals.completedCount)} accent="text-emerald-400" />
                <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Avg. Payment" value={paymentTotals.completedCount > 0 ? fmtMoney(Math.round(paymentTotals.completedRevenueCents / paymentTotals.completedCount)) : '$0.00'} />
              </div>

              <div className="overflow-x-auto border border-border-subtle rounded-sm">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">User</th>
                      <th className="text-left px-4 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 py-3 font-medium">Method</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-raised/50">
                        <td className="px-4 py-3 text-text-secondary text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="text-text-primary">{p.user?.displayName || 'Unknown'}</div>
                          <div className="text-xs text-text-muted">{p.user?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gold-primary font-medium">{fmtMoney(p.amount)}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{p.paymentMethod}</td>
                        <td className={`px-4 py-3 text-xs font-medium ${statusColor(p.status)}`}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= SUBSCRIPTIONS ================= */}
          {tab === 'subscriptions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<CalendarClock className="w-4 h-4" />} label="Expiring ≤7d" value={String(subCounts.expiringSoon)} accent="text-amber-400" />
                <StatCard icon={<X className="w-4 h-4" />} label="Expired" value={String(subCounts.expired)} accent="text-crimson" />
                <StatCard icon={<Activity className="w-4 h-4" />} label="Active" value={String(subCounts.active)} accent="text-emerald-400" />
                <StatCard icon={<Ban className="w-4 h-4" />} label="Canceled/Past Due" value={String(subCounts.canceled)} />
              </div>

              <div className="flex gap-2 flex-wrap">
                {(['all', 'expiring', 'expired', 'active', 'canceled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubFilter(f)}
                    className={`px-3 py-1.5 text-xs border rounded-sm capitalize transition-fast ${
                      subFilter === f ? 'border-gold-primary text-gold-primary bg-gold-primary/10' : 'border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto border border-border-subtle rounded-sm">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">User</th>
                      <th className="text-left px-4 py-3 font-medium">Plan</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Ends</th>
                      <th className="text-left px-4 py-3 font-medium">Auto-renew</th>
                      <th className="text-right px-4 py-3 font-medium">Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                          No subscriptions for this filter.
                        </td>
                      </tr>
                    )}
                    {subscriptions.map((s) => {
                      const remaining = daysUntil(s.endDate);
                      return (
                        <tr key={s.id} className="hover:bg-raised/50">
                          <td className="px-4 py-3">
                            <div className="text-text-primary">{s.user.displayName}</div>
                            <div className="text-xs text-text-muted">{s.user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={s.plan}
                              onChange={(e) => changeSub(s.user.id, { plan: e.target.value })}
                              className="bg-raised border border-border-subtle rounded-sm text-xs px-2 py-1 text-text-primary focus:outline-none focus:border-gold-primary"
                              aria-label={`Plan for ${s.user.email}`}
                            >
                              {['FREE', 'HUNTER_PASS', 'GUILD', 'ENTERPRISE'].map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`px-4 py-3 text-xs font-medium ${statusColor(s.status)}`}>{s.status}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs">
                            {fmtDate(s.endDate)}
                            {remaining !== null && remaining >= 0 && remaining <= 7 && (
                              <span className="ml-2 text-amber-400">({remaining}d left)</span>
                            )}
                            {remaining !== null && remaining < 0 && <span className="ml-2 text-crimson">(expired)</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{s.cancelAtPeriodEnd ? 'No' : 'Yes'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) changeSub(s.user.id, { status: e.target.value });
                                }}
                                className="bg-raised border border-border-subtle rounded-sm text-xs px-2 py-1 text-text-secondary focus:outline-none focus:border-gold-primary"
                                aria-label={`Status override for ${s.user.email}`}
                              >
                                <option value="">Set status...</option>
                                {['ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING', 'EXPIRED'].map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= ACTIVITY ================= */}
          {tab === 'activity' && (
            <div className="bg-surface border border-border-subtle rounded-sm divide-y divide-border-subtle">
              {activity.length === 0 && <p className="p-6 text-center text-text-muted text-sm">No recent activity.</p>}
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-1 p-1.5 rounded-sm ${
                      item.type === 'payment'
                        ? 'text-gold-primary bg-gold-primary/10'
                        : item.type === 'user_registered'
                        ? 'text-emerald-400 bg-emerald-400/10'
                        : item.type === 'quest_completed'
                        ? 'text-violet-300 bg-violet-gate/10'
                        : 'text-sky-400 bg-sky-400/10'
                    }`}
                  >
                    {item.type === 'payment' ? (
                      <DollarSign className="w-4 h-4" />
                    ) : item.type === 'user_registered' ? (
                      <Users className="w-4 h-4" />
                    ) : item.type === 'quest_completed' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{item.message}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(item.at).toLocaleString()} • {item.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
