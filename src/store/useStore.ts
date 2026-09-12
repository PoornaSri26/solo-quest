import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Hunter,
  HunterStats,
  Quest,
  QuestStatus,
  Gate,
  DailyDungeon,
  DungeonTask,
  Notification,
  ShopItem,
  InventoryItem,
} from '../shared/types';
import { connectSocket, disconnectSocket, getConnectionStatus } from '../lib/socket';
import { getHunterAvatarUrl } from '../lib/avatars';
import { createAuthApi } from '../lib/api';

// Additional types for hunter profile
interface WeeklyActivityData {
  dailyActivity: {
    date: string;
    dungeonsCompleted: number;
    dungeonsTotal: number;
    questsCompleted: number;
  }[];
}

interface QuestSummary {
  total: number;
  completed: number;
  active: number;
  failed: number;
}

interface AppState {
  // User data
  hunter: Hunter | null;
  stats: HunterStats | null;

  // Quests
  quests: Quest[];
  activeQuests: Quest[];
  shadowQuests: Quest[];
  completedQuests: Quest[];

  // Gates
  gates: Gate[];

  // Dungeon
  dungeon: DailyDungeon | null;
  dungeonTasks: DungeonTask[];

  // Notifications
  notifications: Notification[];

  // Shop
  shopItems: ShopItem[];
  userInventory: InventoryItem[];

  // Hunter Profile Specific
  weeklyActivity: WeeklyActivityData;
  questSummary: QuestSummary;
  rankUpEvent: { rank: string; level: number } | null;

  // UI
  isQuestModalOpen: boolean;
  isEditQuestModalOpen: boolean;
  editingQuestId: string | null;

  // Auth
  token: string | null;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  // Actions
  fetchHunter: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchQuests: () => Promise<void>;
  fetchGates: () => Promise<void>;
  fetchDungeon: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  
  clearRankUpEvent: () => void;
  fetchShopItems: () => Promise<void>;
  fetchUserInventory: () => Promise<void>;
  fetchWeeklyStats: () => Promise<void>;
  fetchQuestSummary: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  initializeApp: () => Promise<void>;

  // Quest actions
  createQuest: (quest: Partial<Quest>) => Promise<void>;
  updateQuest: (id: string, changes: Partial<Quest>) => Promise<void>;
  deleteQuest: (id: string) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  failQuest: (questId: string) => Promise<void>;
  abandonQuest: (questId: string) => Promise<void>;

  // Gate actions
  createGate: (gate: Partial<Gate>) => Promise<void>;
  updateGate: (id: string, changes: Partial<Gate>) => Promise<void>;
  deleteGate: (id: string) => Promise<void>;

  // Dungeon actions
  toggleDungeonTask: (taskId: string) => Promise<void>;
  markDungeonComplete: () => Promise<void>;
  createDungeonTask: (title: string, rank?: string) => Promise<void>;
  deleteDungeonTask: (taskId: string) => Promise<void>;

  // Notification actions
  markNotificationAsRead: (id: string) => void;

  // Shop actions
  purchaseItem: (itemId: string) => Promise<void>;
  toggleEquip: (inventoryId: string) => Promise<void>;

  // UI actions
  openEditQuestModal: (questId: string) => void;
  closeEditQuestModal: () => void;

  // WebSocket
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}


// Helper to split quests into categories
const splitQuests = (quests: Quest[]) => {
  const active = quests.filter((q) => q.status === 'ACTIVE' || q.status === 'IN_PROGRESS');
  const shadow = quests.filter((q) => q.status === 'SHADOW');
  const completed = quests.filter((q) => q.status === 'COMPLETED');
  return { activeQuests: active, shadowQuests: shadow, completedQuests: completed };
};

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        hunter: null,
        stats: null,
        quests: [],
        activeQuests: [],
        shadowQuests: [],
        completedQuests: [],
        gates: [],
        dungeon: null,
        dungeonTasks: [],
        notifications: [],
        shopItems: [],
        userInventory: [],
        weeklyActivity: { dailyActivity: [] },
        questSummary: { total: 0, completed: 0, active: 0, failed: 0 },
        isQuestModalOpen: false,
        isEditQuestModalOpen: false,
        editingQuestId: null,
        token: null,
        isLoading: false,
        connectionStatus: 'disconnected',

        // ========================
        // Auth actions
        // ========================

        login: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const api = createAuthApi(() => get().token);
            const data = await api.post('/auth/login', { email, password });
            
            set({ token: data.token });

            // Connect WebSocket and fetch data
            get().connectWebSocket();
            await get().initializeApp();
          } catch (error) {
            console.error('Login error:', error);
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        register: async (email: string, password: string, displayName: string) => {
          set({ isLoading: true });
          try {
            const api = createAuthApi(() => get().token);
            const data = await api.post('/auth/register', { email, password, displayName });
            
            set({ token: data.token });

            get().connectWebSocket();
            await get().initializeApp();
          } catch (error) {
            console.error('Registration error:', error);
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        logout: () => {
          get().disconnectWebSocket();
          set({
            hunter: null,
            stats: null,
            quests: [],
            activeQuests: [],
            shadowQuests: [],
            completedQuests: [],
            gates: [],
            dungeon: null,
            dungeonTasks: [],
            notifications: [],
            shopItems: [],
            userInventory: [],
            weeklyActivity: { dailyActivity: [] },
            questSummary: { total: 0, completed: 0, active: 0, failed: 0 },
            rankUpEvent: null,
            isQuestModalOpen: false,
            isEditQuestModalOpen: false,
            editingQuestId: null,
            token: null,
          });
        },

        initializeApp: async () => {
          const state = get();
          if (!state.token) return;

          await Promise.all([
            state.fetchHunter(),
            state.fetchStats(),
            state.fetchQuests(),
            state.fetchGates(),
            state.fetchDungeon(),
            state.fetchNotifications(),
            state.fetchShopItems(),
          ]);
        },

        // ========================
        // WebSocket
        // ========================

        connectWebSocket: () => {
          const token = get().token;
          if (!token) return;

          set({ connectionStatus: 'connecting' });

          const socket = connectSocket(token);

          socket.on('connect', () => {
            set({ connectionStatus: 'connected' });
          });

          socket.on('disconnect', () => {
            set({ connectionStatus: 'disconnected' });
          });

          socket.on('connect_error', () => {
            set({ connectionStatus: 'disconnected' });
          });

          socket.on('stats:updated', (stats: HunterStats) => {
            set({ stats: { ...stats, xpToNext: stats.expToNext, progressPercent: stats.progressPercent } });
          });

          socket.on('quest:created', (quest: Quest) => {
            set((prev) => {
              if (prev.quests.some((q) => q.id === quest.id)) return prev;
              const quests = [quest, ...prev.quests];
              return { quests, ...splitQuests(quests) };
            });
          });

          socket.on('quest:updated', (quest: Quest) => {
            set((prev) => {
              const quests = prev.quests.map((q) => (q.id === quest.id ? quest : q));
              return { quests, ...splitQuests(quests) };
            });
          });

          socket.on('notification:new', (notif: Notification) => {
            set((prev) => ({
              notifications: [notif, ...prev.notifications],
            }));
          });

          socket.on('gate:updated', (gate: Gate) => {
            set((prev) => ({
              gates: prev.gates.map((g) => (g.id === gate.id ? gate : g)),
            }));
          });

          socket.on('dungeon:cleared', () => {
            // Refresh dungeon data
            get().fetchDungeon();
          });

          socket.on('level:up', (data: { level: number; rank: string }) => {
            console.log(`[System] Level Up! Now Level ${data.level} (Rank ${data.rank})`);
            set({ rankUpEvent: data });
          });
        },

        disconnectWebSocket: () => {
          disconnectSocket();
        },

        clearRankUpEvent: () => set({ rankUpEvent: null }),

        // ========================
        // Fetchers
        // ========================

        fetchHunter: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data = await api.get('/hunter/me');
            
            set({
              hunter: {
                id: data.id,
                hunterId: data.hunterId,
                displayName: data.displayName,
                email: data.email,
                avatarUrl: getHunterAvatarUrl(data.avatarUrl, data.hunterId || data.displayName),
                createdAt: data.createdAt,
              },
            });
          } catch (error) {
            console.error('Fetch hunter error:', error);
          }
        },

        fetchStats: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data = await api.get('/hunter/me');
            
            if (data.stats) {
              set({
                stats: {
                  ...data.stats,
                  xpToNext: data.stats.expToNext,
                  progressPercent: data.stats.progressPercent,
                },
              });
            }
          } catch (error) {
            console.error('Fetch stats error:', error);
          }
        },

        fetchQuests: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const response = await api.get('/quests');
            const data: Quest[] = response.data || response; // Handle both old and new response format

            set({ quests: data, ...splitQuests(data) });
          } catch (error) {
            console.error('Fetch quests error:', error);
          }
        },

        fetchGates: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const response = await api.get('/gates');
            const data: Gate[] = response.data || response; // Handle both old and new response format

            set({ gates: data });
          } catch (error) {
            console.error('Fetch gates error:', error);
          }
        },

        fetchDungeon: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data = await api.get('/dungeon');
            
            // Server returns the dungeon object with tasks array inside
            set({
              dungeon: data,
              dungeonTasks: data.tasks || [],
            });
          } catch (error) {
            console.error('Fetch dungeon error:', error);
          }
        },

        fetchNotifications: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data: Notification[] = await api.get('/notifications');
            
            set({ notifications: data });
          } catch (error) {
            console.error('Fetch notifications error:', error);
          }
        },

        fetchShopItems: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data: ShopItem[] = await api.get('/shop');
            
            set({ shopItems: data });
          } catch (error) {
            console.error('Fetch shop items error:', error);
          }
        },

        fetchUserInventory: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data: InventoryItem[] = await api.get('/user/inventory');
            
            set({ userInventory: data });
          } catch (error) {
            console.error('Fetch user inventory error:', error);
          }
        },

        fetchWeeklyStats: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data: WeeklyActivityData = await api.get('/stats/weekly');
            
            set({ weeklyActivity: data });
          } catch (error) {
            console.error('Fetch weekly stats error:', error);
          }
        },

        fetchQuestSummary: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data: QuestSummary = await api.get('/quests/summary');
            
            set({ questSummary: data });
          } catch (error) {
            console.error('Fetch quest summary error:', error);
          }
        },

        // ========================
        // Quest mutations
        // ========================

        createQuest: async (quest) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const newQuest: Quest = await api.post('/quests', quest);

            set((prev) => {
              if (prev.quests.some((q) => q.id === newQuest.id)) return prev;
              const quests = [newQuest, ...prev.quests];
              return { quests, ...splitQuests(quests) };
            });
          } catch (error) {
            console.error('Create quest error:', error);
            throw error;
          }
        },

        updateQuest: async (id, changes) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const updatedQuest: Quest = await api.patch(`/quests/${id}`, changes);

            set((prev) => {
              const quests = prev.quests.map((q) =>
                q.id === id ? updatedQuest : q
              );
              return { quests, ...splitQuests(quests) };
            });
          } catch (error) {
            console.error('Update quest error:', error);
            throw error;
          }
        },

        deleteQuest: async (id) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            await api.delete(`/quests/${id}`);

            set((prev) => {
              const quests = prev.quests.filter((q) => q.id !== id);
              return { quests, ...splitQuests(quests) };
            });
          } catch (error) {
            console.error('Delete quest error:', error);
            throw error;
          }
        },

        completeQuest: async (questId) => {
          // Server handles reward logic, we just update status
          await get().updateQuest(questId, { status: 'COMPLETED' as QuestStatus });
          // Stats will be updated via WebSocket
          await get().fetchStats();
        },

        failQuest: async (questId) => {
          await get().updateQuest(questId, { status: 'FAILED' as QuestStatus });
          await get().fetchStats();
        },

        abandonQuest: async (questId) => {
          await get().updateQuest(questId, { status: 'ARCHIVED' as QuestStatus });
        },

        // ========================
        // Gate actions
        // ========================

        createGate: async (gate) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const newGate: Gate = await api.post('/gates', gate);
            
            set((prev) => ({ gates: [newGate, ...prev.gates] }));
          } catch (error) {
            console.error('Create gate error:', error);
            throw error;
          }
        },

        updateGate: async (id, changes) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const updatedGate: Gate = await api.patch(`/gates/${id}`, changes);

            set((prev) => ({
              gates: prev.gates.map((g) => (g.id === id ? updatedGate : g)),
            }));
          } catch (error) {
            console.error('Update gate error:', error);
            throw error;
          }
        },

        deleteGate: async (id) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            await api.delete(`/gates/${id}`);

            set((prev) => ({
              gates: prev.gates.filter((g) => g.id !== id),
            }));
          } catch (error) {
            console.error('Delete gate error:', error);
            throw error;
          }
        },

        // ========================
        // Dungeon actions
        // ========================

        toggleDungeonTask: async (taskId: string) => {
          const state = get();

          // Optimistic update
          set((prev) => ({
            dungeonTasks: prev.dungeonTasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            ),
          }));

          if (state.token) {
            try {
              const api = createAuthApi(() => state.token);
              await api.patch(`/dungeon/tasks/${taskId}/toggle`);
            } catch (error) {
              console.error('Toggle dungeon task error:', error);
              // Revert on failure
              set((prev) => ({
                dungeonTasks: prev.dungeonTasks.map((t) =>
                  t.id === taskId ? { ...t, completed: !t.completed } : t
                ),
              }));
            }
          }
        },

        createDungeonTask: async (title: string, rank?: string) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const task: DungeonTask = await api.post('/dungeon/tasks', { title, rank: rank || 'E' });
            
            set((prev) => ({
              dungeonTasks: [...prev.dungeonTasks, task],
            }));
          } catch (error) {
            console.error('Create dungeon task error:', error);
            throw error;
          }
        },

        deleteDungeonTask: async (taskId: string) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            await api.delete(`/dungeon/tasks/${taskId}`);

            set((prev) => ({
              dungeonTasks: prev.dungeonTasks.filter((t) => t.id !== taskId),
            }));
          } catch (error) {
            console.error('Delete dungeon task error:', error);
            throw error;
          }
        },

        markDungeonComplete: async () => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            await api.post('/dungeon/complete');

            // Refresh stats and dungeon (server resets tasks)
            await get().fetchStats();
            await get().fetchDungeon();
          } catch (error) {
            console.error('Complete dungeon error:', error);
            throw error;
          }
        },

        // ========================
        // Notification actions
        // ========================

        markNotificationAsRead: (id: string) => {
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          }));

          const state = get();
          if (state.token) {
            const api = createAuthApi(() => state.token);
            api.patch(`/notifications/${id}/read`).catch(console.error);
          }
        },

        // ========================
        // Shop actions
        // ========================

        purchaseItem: async (itemId: string) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const data = await api.post(`/shop/purchase/${itemId}`);

            // Update stats (gold deducted) and inventory
            if (data.stats) {
              set({ stats: { ...data.stats, xpToNext: data.stats.expToNext, progressPercent: data.stats.progressPercent } });
            }

            // Refresh inventory
            await get().fetchUserInventory();
          } catch (error) {
            console.error('Purchase item error:', error);
            throw error;
          }
        },

        toggleEquip: async (inventoryId: string) => {
          const state = get();
          if (!state.token) return;

          try {
            const api = createAuthApi(() => state.token);
            const updated: InventoryItem = await api.patch(`/user/inventory/${inventoryId}/equip`);

            set((prev) => ({
              userInventory: prev.userInventory.map((i) =>
                i.id === inventoryId ? updated : i
              ),
            }));
          } catch (error) {
            console.error('Toggle equip error:', error);
          }
        },

        // ========================
        // UI actions
        // ========================

        openEditQuestModal: (questId: string) => {
          set({ isEditQuestModalOpen: true, editingQuestId: questId });
        },

        closeEditQuestModal: () => {
          set({ isEditQuestModalOpen: false, editingQuestId: null });
        },
      }),
      {
        name: 'solo-quest-storage',
        partialize: (state) => ({
          token: state.token,
        }),
      }
    )
  )
);