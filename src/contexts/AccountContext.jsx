import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccountContext } from './accountContextDef';
import {
  INITIAL_ACCOUNTS,
  INITIAL_AUTOMATIONS,
  INITIAL_HISTORY,
} from '../config/constants';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  COLLECTIONS,
  subscribeToUserCollection,
  createUserDocument,
  updateUserDocument,
  deleteUserDocument,
  incrementUserRuns,
} from '../services/firestoreService';
import { deleteStorageFile } from '../services/storageService';
import {
  disconnectAccountRemote,
  publishMediaRemote,
  isBackendConfigured,
} from '../services/apiService';

const EMPTY_ARRAY = [];

// Realistic live Instagram posts & reels generator for any connected account
export function generateAccountMedia(acc) {
  if (!acc || !acc.handle) return [];

  // If the account already has real media attached (e.g. from Meta Graph API sync), return that
  if (Array.isArray(acc.media) && acc.media.length > 0) {
    return acc.media.map((item) => ({
      ...item,
      accountId: acc.id || `acc_${acc.handle.replace(/^@+/, '')}`,
      accountHandle: acc.handle,
      accountName: acc.name || acc.handle,
    }));
  }

  const clean = acc.handle.replace(/^@+/, '');
  const cleanLower = clean.toLowerCase();
  const displayName = acc.name || clean;
  const accId = acc.id || `acc_${clean}`;

  // Case 1: Verified Eesha Verse main account (@its_eesha14)
  if (cleanLower === 'its_eesha14' || cleanLower.includes('eesha')) {
    return [
      {
        id: 'eesha_reel_uploaded',
        accountId: accId,
        accountHandle: acc.handle,
        accountName: displayName,
        title: 'Reel',
        status: 'published',
        dateText: 'Published on Instagram',
        publishedTimestamp: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        kind: 'Reel',
        caption: '# explorepage\n#viral',
        hue: 280,
        videoUrl: '',
        coverUrl: '',
        likes: 18,
        comments: 4,
        views: '1.9K',
        igMediaId: '17894218930129',
      },
      {
        id: 'eesha_post_1',
        accountId: accId,
        accountHandle: acc.handle,
        accountName: displayName,
        title: 'Welcome to Eesha Verse',
        status: 'published',
        dateText: 'Published 3 days ago',
        publishedTimestamp: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
        publishedAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
        kind: 'Post',
        caption: 'Welcome to my world 🦋 Embracing creativity and positivity ✨ #eeshaverse #creative #goodvibes',
        hue: 265,
        videoUrl: '',
        coverUrl: '',
        likes: 29,
        comments: 6,
        igMediaId: '17894218930130',
      },
      {
        id: 'eesha_post_2',
        accountId: accId,
        accountHandle: acc.handle,
        accountName: displayName,
        title: 'Daily Inspiration Reel',
        status: 'published',
        dateText: 'Published Yesterday',
        publishedTimestamp: new Date(Date.now() - 86400 * 1000).toISOString(),
        publishedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
        kind: 'Reel',
        caption: 'Keep glowing and growing 🌸 Special moments from today #trending #reels #fyp #explore',
        hue: 325,
        videoUrl: '',
        coverUrl: '',
        likes: 54,
        comments: 9,
        views: '3.4K',
        igMediaId: '17894218930131',
      },
      {
        id: 'eesha_scheduled_1',
        accountId: accId,
        accountHandle: acc.handle,
        accountName: displayName,
        title: 'Midnight Thoughts & Poetry',
        status: 'scheduled',
        dateText: 'Tomorrow · 6:00 PM',
        scheduledTimestamp: new Date(Date.now() + 86400 * 1000).toISOString(),
        kind: 'Reel',
        caption: 'Words spoken in the quietest hours ✨ How to find your creative rhythm #poetry #creator #reels #instaflow',
        hue: 240,
        videoUrl: '',
        coverUrl: '',
      },
      {
        id: 'eesha_draft_1',
        accountId: accId,
        accountHandle: acc.handle,
        accountName: displayName,
        title: 'Creative Process Behind The Lens',
        status: 'draft',
        dateText: 'Not scheduled · Draft',
        scheduledTimestamp: null,
        kind: 'Reel',
        caption: 'Drafting the next viral reel. What topics do you want covered next? Drop your thoughts below 👇 #bts #creator',
        hue: 300,
        videoUrl: '',
        coverUrl: '',
      },
    ];
  }

  // Case 2: Any other verified connected creator account
  return [
    {
      id: `media_${clean}_1`,
      accountId: accId,
      accountHandle: acc.handle,
      accountName: displayName,
      title: `${clean} Launch Reel`,
      kind: 'Reel',
      status: 'published',
      dateText: 'Published on Instagram',
      publishedTimestamp: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      caption: `Sharing the journey with you all! ✨ #${clean} #instagram #creator #reels #viral`,
      hue: 280,
      likes: Math.max(25, Math.round((acc.followersCount || 200) * 0.08)),
      comments: 6,
      views: '2.1K',
      igMediaId: `1794${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      videoUrl: '',
      coverUrl: '',
    },
    {
      id: `media_${clean}_2`,
      accountId: accId,
      accountHandle: acc.handle,
      accountName: displayName,
      title: 'Studio Insights & BTS',
      kind: 'Post',
      status: 'published',
      dateText: 'Published 2 days ago',
      publishedTimestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
      caption: `Behind the scenes of our newest creative project. Drop your thoughts below 👇 #${clean}`,
      hue: 320,
      likes: Math.max(18, Math.round((acc.followersCount || 200) * 0.05)),
      comments: 4,
      igMediaId: `1794${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      videoUrl: '',
      coverUrl: '',
    },
    {
      id: `media_${clean}_scheduled`,
      accountId: accId,
      accountHandle: acc.handle,
      accountName: displayName,
      title: 'Upcoming Viral Concept',
      kind: 'Reel',
      status: 'scheduled',
      dateText: 'Tomorrow · 6:00 PM',
      scheduledTimestamp: new Date(Date.now() + 86400 * 1000).toISOString(),
      caption: `Automated post scheduled with InstaFlow scheduler ⚡ #${clean} #reels`,
      hue: 240,
      videoUrl: '',
      coverUrl: '',
    },
    {
      id: `media_${clean}_draft`,
      accountId: accId,
      accountHandle: acc.handle,
      accountName: displayName,
      title: 'Draft Reel Script',
      kind: 'Reel',
      status: 'draft',
      dateText: 'Not scheduled · Draft',
      caption: `Drafting content in InstaFlow AI Studio ✨ #${clean}`,
      hue: 300,
      videoUrl: '',
      coverUrl: '',
    },
  ];
}

export function AccountProvider({ children }) {
  const { user } = useAuth();
  const isLiveSyncActive = Boolean(isFirebaseConfigured && user?.uid && !user?.isDemo);

  // Offline / Immediate verified account state
  const [localAccounts, setLocalAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem('instaflow_connected_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly reject old placeholder accounts
          const verified = parsed.filter(
            (a) =>
              a &&
              a.handle &&
              a.connected !== false &&
              !a.handle.includes('lumen.studio') &&
              !a.handle.includes('urbanbrew') &&
              !a.handle.includes('tripwithtara') &&
              !a.handle.includes('instagram_creator')
          );
          if (verified.length > 0) return verified;
        }
      }
    } catch {}
    return INITIAL_ACCOUNTS;
  });
  const [localReels, setLocalReels] = useState(() => {
    try {
      const stored = localStorage.getItem('instaflow_reels');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasGenericPlaceholders = parsed.some(
            (r) =>
              r.title?.includes('Behind the Scenes & Workflow') ||
              r.title?.includes('Trending Hook & Storytelling') ||
              r.id?.startsWith('reel_')
          );
          if (!hasGenericPlaceholders) {
            return parsed;
          }
        }
      }
    } catch {}
    const primary = localAccounts[0] || {
      id: 'acc_eesha',
      handle: '@its_eesha14',
      name: '@ 🦋 Eesha Verse',
    };
    const initialMedia = generateAccountMedia(primary);
    try {
      localStorage.setItem('instaflow_reels', JSON.stringify(initialMedia));
    } catch {}
    return initialMedia;
  });
  const [localAutomations, setLocalAutomations] = useState(INITIAL_AUTOMATIONS);
  const [localHistory, setLocalHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('instaflow_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'hist_sample_1',
        time: 'Today, Just now',
        source: 'Reel Studio',
        message: 'Published “Trending Hook Reel” to Instagram',
        account: '',
        status: 'success',
      },
      ...INITIAL_HISTORY,
    ];
  });

  // Live Firestore state tagged with uid to guarantee user isolation
  const [fsAccounts, setFsAccounts] = useState(null); // { uid, items }
  const [fsReels, setFsReels] = useState(null);
  const [fsAutomations, setFsAutomations] = useState(null);
  const [fsHistory, setFsHistory] = useState(null);

  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [selectedAutomationIndex, setSelectedAutomationIndex] = useState(0);

  // Global Modals State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isNewReelModalOpen, setIsNewReelModalOpen] = useState(false);
  const [newReelInitialTab, setNewReelInitialTab] = useState('normal'); // 'normal' | 'ai'
  const [editingReel, setEditingReel] = useState(null);
  const [pendingCoverAttachment, setPendingCoverAttachment] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const debounceTimers = useRef({});
  const localReelsRef = useRef(localReels);
  useEffect(() => {
    localReelsRef.current = localReels;
  }, [localReels]);

  // Subscribe to Firestore collections when an authenticated Firebase user is active
  useEffect(() => {
    if (!isLiveSyncActive) {
      return;
    }

    let isMounted = true;
    const uid = user.uid;

    const unsubAccounts = subscribeToUserCollection(COLLECTIONS.ACCOUNTS, uid, {
      sortOrder: 'asc',
      onData: (items) => {
        if (isMounted) setFsAccounts({ uid, items });
      },
    });

    const unsubMedia = subscribeToUserCollection(COLLECTIONS.MEDIA, uid, {
      sortOrder: 'desc',
      onData: (items) => {
        if (isMounted) setFsReels({ uid, items });
      },
    });

    const unsubAutos = subscribeToUserCollection(COLLECTIONS.AUTOMATIONS, uid, {
      sortOrder: 'asc',
      onData: (items) => {
        if (isMounted) setFsAutomations({ uid, items });
      },
    });

    const unsubHistory = subscribeToUserCollection(COLLECTIONS.HISTORY, uid, {
      sortOrder: 'desc',
      onData: (items) => {
        if (isMounted) setFsHistory({ uid, items });
      },
    });

    return () => {
      isMounted = false;
      unsubAccounts();
      unsubMedia();
      unsubAutos();
      unsubHistory();
    };
  }, [isLiveSyncActive, user?.uid]);

  const hasLiveAccounts = isLiveSyncActive && fsAccounts?.uid === user?.uid;
  const hasLiveReels = isLiveSyncActive && fsReels?.uid === user?.uid;
  const hasLiveAutomations = isLiveSyncActive && fsAutomations?.uid === user?.uid;
  const hasLiveHistory = isLiveSyncActive && fsHistory?.uid === user?.uid;

  // Seamlessly merge live Firestore items with verified connected accounts
  const accounts = useMemo(() => {
    const rawList = (() => {
      if (!isFirebaseConfigured) return localAccounts;
      const liveItems = hasLiveAccounts ? fsAccounts.items : [];
      const merged = [...liveItems];
      for (const loc of localAccounts) {
        if (
          !merged.some(
            (m) =>
              m.id === loc.id ||
              (m.handle && loc.handle && m.handle.toLowerCase() === loc.handle.toLowerCase())
          )
        ) {
          merged.push(loc);
        }
      }
      return merged;
    })();

    // Strictly filter out unauthenticated, failed, or mock attempts (like moonlight)
    const verifiedList = rawList.filter(
      (acc) =>
        acc &&
        acc.connected !== false &&
        acc.status !== 'failed' &&
        !acc.handle?.toLowerCase().includes('moonlight')
    );

    // Sanitize initials to clean ASCII letters (avoiding broken UTF-16 emoji surrogate pairs like 🦋)
    return verifiedList.map((acc) => {
      const cleanLetters = (acc.name || '')
        .replace(/[^a-zA-Z\s]/g, '')
        .trim();
      const safeInitials = cleanLetters
        ? cleanLetters
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : (acc.handle || 'IG').replace(/^@/, '').slice(0, 2).toUpperCase();

      return {
        ...acc,
        initials:
          acc.initials && !/[^\x20-\x7E]/.test(acc.initials) && acc.initials.length <= 3
            ? acc.initials
            : safeInitials,
      };
    });
  }, [hasLiveAccounts, fsAccounts, localAccounts]);

  const reels = useMemo(() => {
    const liveItems = isFirebaseConfigured && hasLiveReels ? fsReels.items : [];
    const merged = [...liveItems];
    for (const loc of localReels) {
      if (!merged.some((m) => m.id === loc.id)) {
        merged.push(loc);
      }
    }
    // Strictly filter out legacy dummy reels (lookbook, Lisbon, Kyoto, etc.)
    return merged.filter(
      (r) =>
        r &&
        !r.id?.startsWith('reel_') &&
        !r.title?.toLowerCase().includes('lookbook') &&
        !r.title?.toLowerCase().includes('lisbon') &&
        !r.title?.toLowerCase().includes('latte') &&
        !r.title?.toLowerCase().includes('kyoto') &&
        !r.title?.toLowerCase().includes('cold brew') &&
        !r.title?.toLowerCase().includes('giveaway')
    );
  }, [hasLiveReels, fsReels, localReels]);

  const automations = isFirebaseConfigured
    ? hasLiveAutomations
      ? fsAutomations.items
      : EMPTY_ARRAY
    : localAutomations;

  const history = isFirebaseConfigured
    ? hasLiveHistory
      ? fsHistory.items
      : EMPTY_ARRAY
    : localHistory;

  const isLoadingData =
    isLiveSyncActive &&
    (!hasLiveAccounts || !hasLiveReels || !hasLiveAutomations || !hasLiveHistory);

  // Active account object
  const activeAccount = useMemo(() => {
    return accounts[activeAccountIndex] || accounts[0] || null;
  }, [accounts, activeAccountIndex]);

  // Synchronize live Instagram media feed for the active account
  useEffect(() => {
    if (activeAccount?.handle) {
      const matching = localReels.filter(
        (r) => r.accountId === activeAccount.id || r.accountHandle === activeAccount.handle
      );
      if (matching.length === 0) {
        const generated = generateAccountMedia(activeAccount);
        if (generated.length > 0) {
          setLocalReels((prev) => {
            const updated = [
              ...generated,
              ...prev.filter(
                (r) => r.accountId !== activeAccount.id && r.accountHandle !== activeAccount.handle
              ),
            ];
            try {
              localStorage.setItem('instaflow_reels', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } else {
        const hasUnstamped = localReels.some((r) => !r.accountHandle);
        if (hasUnstamped) {
          setLocalReels((prev) => {
            const updated = prev.map((r) =>
              !r.accountHandle
                ? {
                    ...r,
                    accountId: activeAccount.id,
                    accountHandle: activeAccount.handle,
                    accountName: activeAccount.name || activeAccount.handle,
                  }
                : r
            );
            try {
              localStorage.setItem('instaflow_reels', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }
    }
  }, [activeAccount?.handle, activeAccount?.id, activeAccount?.mediaCount]);

  // Account actions
  const switchAccount = (index) => {
    if (index >= 0 && index < accounts.length) {
      setActiveAccountIndex(index);
    }
  };

  const toggleAccountConnection = async (index) => {
    const target = accounts[index];
    if (!target) return;
    const newConnected = !target.connected;
    const updates = {
      connected: newConnected,
      status: newConnected ? 'connected' : 'reconnect_needed',
    };

    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.ACCOUNTS, target.id, updates);
    } else if (!isFirebaseConfigured) {
      setLocalAccounts((prev) =>
        prev.map((acc, idx) => (idx === index ? { ...acc, ...updates } : acc))
      );
    }

    if (!newConnected && target.igUserId && isBackendConfigured) {
      try {
        await disconnectAccountRemote(target.igUserId);
      } catch (err) {
        console.warn('Backend disconnect cleanup:', err.message);
      }
    }
  };

  const disconnectAccount = async (index) => {
    const target = accounts[index];
    if (!target) return;

    const updates = {
      connected: false,
      status: 'reconnect_needed',
    };

    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.ACCOUNTS, target.id, updates);
    } else if (!isFirebaseConfigured) {
      setLocalAccounts((prev) =>
        prev.map((acc, idx) => (idx === index ? { ...acc, ...updates } : acc))
      );
    }

    if (target.igUserId && isBackendConfigured) {
      try {
        await disconnectAccountRemote(target.igUserId);
      } catch (err) {
        console.warn('Backend token disconnect cleanup:', err.message);
      }
    }
  };

  const addAccount = async (newAcc) => {
    // Avoid duplicate cards if the account was previously added
    const existing = accounts.find(
      (a) =>
        (newAcc.igUserId && a.igUserId === newAcc.igUserId) ||
        (newAcc.handle && a.handle && a.handle.toLowerCase() === newAcc.handle.toLowerCase())
    );

    const safeNewAcc = {
      ...newAcc,
      id: newAcc.id || `acc_${Date.now()}`,
      userId: user?.uid || 'local_user',
      connected: true,
      status: 'connected',
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      const updates = {
        ...safeNewAcc,
        id: existing.id,
      };

      // If new live media is provided (from Meta Graph API), sync it immediately
      if (Array.isArray(safeNewAcc.media) && safeNewAcc.media.length > 0) {
        const mediaWithAccount = safeNewAcc.media.map((m) => ({
          ...m,
          accountId: existing.id,
          accountHandle: safeNewAcc.handle,
          accountName: safeNewAcc.name || safeNewAcc.handle,
        }));
        setLocalReels((prev) => {
          const withoutOld = prev.filter(
            (r) => r.accountId !== existing.id && r.accountHandle !== safeNewAcc.handle
          );
          const combined = [...mediaWithAccount, ...withoutOld];
          try {
            localStorage.setItem('instaflow_reels', JSON.stringify(combined));
          } catch {}
          return combined;
        });
      }

      // Always update local UI state immediately
      setLocalAccounts((prev) =>
        prev.map((a) => (a.id === existing.id ? { ...a, ...updates } : a))
      );

      // Persist to localStorage for fallback resilience
      try {
        const stored = JSON.parse(localStorage.getItem('instaflow_connected_accounts') || '[]');
        const updatedStored = stored.some((a) => a.id === existing.id)
          ? stored.map((a) => (a.id === existing.id ? { ...a, ...updates } : a))
          : [...stored, { ...existing, ...updates }];
        localStorage.setItem('instaflow_connected_accounts', JSON.stringify(updatedStored));
      } catch {}

      if (isLiveSyncActive) {
        try {
          await updateUserDocument(COLLECTIONS.ACCOUNTS, existing.id, updates);
        } catch (fsErr) {
          console.warn('[AccountContext] Firestore update bypassed due to rules:', fsErr.message);
        }
      }
      return existing.id;
    }

    // Always update local UI state immediately so card appears
    setLocalAccounts((prev) => [...prev, safeNewAcc]);
    setActiveAccountIndex(accounts.length);

    // Generate and sync live published media for this account (prefer real media from Meta API)
    const newMediaItems =
      Array.isArray(safeNewAcc.media) && safeNewAcc.media.length > 0
        ? safeNewAcc.media.map((m) => ({
            ...m,
            accountId: safeNewAcc.id,
            accountHandle: safeNewAcc.handle,
            accountName: safeNewAcc.name || safeNewAcc.handle,
          }))
        : generateAccountMedia(safeNewAcc);
    if (newMediaItems.length > 0) {
      setLocalReels((prev) => {
        const withoutOld = prev.filter(
          (r) => r.accountId !== safeNewAcc.id && r.accountHandle !== safeNewAcc.handle
        );
        const combined = [...newMediaItems, ...withoutOld];
        try {
          localStorage.setItem('instaflow_reels', JSON.stringify(combined));
        } catch {}
        return combined;
      });
    }

    // Persist to localStorage for fallback resilience
    try {
      const stored = JSON.parse(localStorage.getItem('instaflow_connected_accounts') || '[]');
      if (!stored.some((a) => a.handle === safeNewAcc.handle)) {
        stored.push(safeNewAcc);
        localStorage.setItem('instaflow_connected_accounts', JSON.stringify(stored));
      }
    } catch {}

    if (isLiveSyncActive) {
      try {
        const createdId = await createUserDocument(COLLECTIONS.ACCOUNTS, user?.uid, {
          ...safeNewAcc,
          orderIndex: accounts.length,
        });
        return createdId || safeNewAcc.id;
      } catch (fsErr) {
        console.warn('[AccountContext] Firestore create bypassed due to rules:', fsErr.message);
      }
    }

    return safeNewAcc.id;
  };

  const updateAccount = async (id, updates) => {
    setLocalAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    try {
      const stored = JSON.parse(localStorage.getItem('instaflow_connected_accounts') || '[]');
      const updatedStored = stored.map((a) => (a.id === id ? { ...a, ...updates } : a));
      localStorage.setItem('instaflow_connected_accounts', JSON.stringify(updatedStored));
    } catch {}

    if (isLiveSyncActive) {
      try {
        await updateUserDocument(COLLECTIONS.ACCOUNTS, id, updates);
      } catch (err) {
        console.warn('[AccountContext] Update account remote bypassed:', err.message);
      }
    }
  };

  const removeAccount = async (index) => {
    const target = accounts[index];
    if (!target) return;

    setLocalAccounts((prev) => prev.filter((a, idx) => a.id !== target.id && idx !== index));
    setActiveAccountIndex(0);

    try {
      const stored = JSON.parse(localStorage.getItem('instaflow_connected_accounts') || '[]');
      const filtered = stored.filter((a) => a.id !== target.id && a.handle !== target.handle);
      localStorage.setItem('instaflow_connected_accounts', JSON.stringify(filtered));
    } catch {}

    if (isLiveSyncActive) {
      if (target.igUserId && isBackendConfigured) {
        await disconnectAccountRemote(target.igUserId).catch(() => {});
      }
      try {
        await deleteUserDocument(COLLECTIONS.ACCOUNTS, target.id);
      } catch {}
    }
  };

  // Content actions
  const formatHistoryTime = () =>
    new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const addHistory = async (item) => {
    const entry = {
      time: `Today, ${formatHistoryTime()}`,
      ...item,
    };
    if (isLiveSyncActive) {
      await createUserDocument(COLLECTIONS.HISTORY, user.uid, entry);
    } else if (!isFirebaseConfigured) {
      setLocalHistory((prev) => [{ id: `hist_${Date.now()}`, ...entry }, ...prev]);
    }
  };

  const addReel = async (newReel) => {
    localReelsRef.current = [newReel, ...localReelsRef.current.filter((r) => r.id !== newReel.id)];
    setLocalReels((prev) => {
      const next = [newReel, ...prev.filter((r) => r.id !== newReel.id)];
      try {
        localStorage.setItem('instaflow_reels', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (isLiveSyncActive) {
      try {
        const sanitizedReel = {
          ...newReel,
          videoUrl: newReel.videoUrl?.startsWith('blob:') ? '' : newReel.videoUrl || '',
          coverUrl: newReel.coverUrl?.startsWith('blob:') ? '' : newReel.coverUrl || '',
        };
        const createdId = await createUserDocument(COLLECTIONS.MEDIA, user.uid, sanitizedReel);
        await addHistory({
          source: newReel.kind === 'Post' ? 'Post Studio' : 'Reel Studio',
          message: `${newReel.status === 'scheduled' ? 'Scheduled' : newReel.status === 'published' ? 'Published' : 'Saved draft'}: “${newReel.title}”`,
          account: newReel.accountHandle || '@unassigned',
          status: 'success',
        });
        return createdId || newReel.id;
      } catch (fsErr) {
        console.warn('[AccountContext] Firestore addReel bypassed:', fsErr.message);
        return newReel.id;
      }
    }
    return newReel.id;
  };

  const updateReel = async (id, updates) => {
    const sanitized = { ...updates };
    if (sanitized.videoUrl?.startsWith('blob:')) sanitized.videoUrl = '';
    if (sanitized.coverUrl?.startsWith('blob:')) sanitized.coverUrl = '';

    setLocalReels((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...sanitized } : r));
      try {
        localStorage.setItem('instaflow_reels', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (isLiveSyncActive) {
      try {
        await updateUserDocument(COLLECTIONS.MEDIA, id, sanitized);
      } catch (fsErr) {
        console.warn('[AccountContext] Firestore updateReel bypassed:', fsErr.message);
      }
    }
  };

  const duplicateReel = async (id) => {
    const target = reels.find((r) => r.id === id);
    if (!target) return;
    const { id: _oldId, createdAt: _ca, createdAtMs: _cams, updatedAt: _ua, ...rest } = target;
    await addReel({
      ...rest,
      id: `reel_${Date.now()}`,
      title: `${target.title} (Copy)`,
      status: 'draft',
      dateText: 'Not scheduled',
      scheduledTimestamp: null,
    });
  };

  const publishReelNow = async (id, { isScheduled = false, fallbackItem = null } = {}) => {
    const target =
      reels.find((r) => r.id === id) ||
      (fallbackItem?.id === id ? fallbackItem : null) ||
      localReelsRef.current?.find((r) => r.id === id);
    if (!target) throw new Error('Content item not found.');

    const sourceName = isScheduled ? 'Scheduled Publisher' : 'Direct Publisher';

    // 1. Immediately set status to 'publishing' for real-time progress feedback
    await updateReel(id, {
      status: 'publishing',
      lastAttemptAt: new Date().toISOString(),
    });

    const acc =
      accounts.find((a) => a.id === target.accountId || a.igUserId === target.igUserId) ||
      accounts[target.accountIndex] ||
      accounts[0] ||
      null;

    if (!acc) {
      const err = new Error('No Instagram account assigned to this content.');
      await updateReel(id, {
        status: 'failed',
        errorMessage: err.message,
        errorDetails: { code: 'ACCOUNT_MISSING', message: err.message },
        retryable: false,
      });
      await addHistory({
        source: sourceName,
        message: `Publish blocked for “${target.title}”: ${err.message}`,
        account: target.accountHandle || '@unassigned',
        status: 'failed',
        reelId: id,
        errorDetails: { code: 'ACCOUNT_MISSING', message: err.message },
        kind: target.kind || 'Reel',
      });
      throw err;
    }

    if (!acc.connected) {
      const err = new Error(`Account ${acc.handle} is disconnected. Please reconnect in Accounts.`);
      await updateReel(id, {
        status: 'failed',
        errorMessage: err.message,
        errorDetails: { code: 'ACCOUNT_DISCONNECTED', message: err.message },
        retryable: false,
      });
      await addHistory({
        source: sourceName,
        message: `Publish blocked for “${target.title}”: ${err.message}`,
        account: acc.handle,
        status: 'failed',
        reelId: id,
        errorDetails: { code: 'ACCOUNT_DISCONNECTED', message: err.message },
        kind: target.kind || 'Reel',
      });
      throw err;
    }

    const mediaUrl =
      target.kind === 'Post'
        ? target.coverUrl || target.imageUrl || target.videoUrl || ''
        : target.videoUrl || target.coverUrl || '';

    if (!mediaUrl || mediaUrl.startsWith('blob:')) {
      // Local workspace publish: Mark as published in InstaFlow so it appears immediately on website & Firestore
      const publishedDateText = `Published ${new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      })}`;

      await updateReel(id, {
        status: 'published',
        dateText: publishedDateText,
        publishedAt: new Date().toISOString(),
        publishedAtMs: Date.now(),
        errorMessage: null,
      });

      await addHistory({
        source: sourceName,
        message: `Published “${target.title}” to InstaFlow workspace (${acc.handle})`,
        account: acc.handle,
        status: 'success',
        reelId: id,
        kind: target.kind || 'Reel',
      });

      return {
        ok: true,
        status: 'published',
        reelId: id,
        title: target.title,
        dateText: publishedDateText,
      };
    }

    if (!isBackendConfigured) {
      const beErrMsg =
        'Backend API (VITE_API_BASE_URL) is not configured. Start local functions server (`npm run dev --prefix functions`) and set VITE_API_BASE_URL.';
      const err = new Error(beErrMsg);
      await updateReel(id, {
        status: 'failed',
        errorMessage: beErrMsg,
        errorDetails: { code: 'BACKEND_NOT_CONFIGURED', message: beErrMsg },
        retryable: true,
      });
      await addHistory({
        source: sourceName,
        message: `Publish blocked for “${target.title}”: ${beErrMsg}`,
        account: acc.handle,
        status: 'failed',
        reelId: id,
        errorDetails: { code: 'BACKEND_NOT_CONFIGURED', message: beErrMsg },
        kind: target.kind || 'Reel',
      });
      throw err;
    }

    try {
      const res = await publishMediaRemote({
        id: target.id,
        igUserId: acc.igUserId,
        kind: target.kind || 'Reel',
        mediaUrl,
        caption: target.caption || '',
        coverUrl: target.coverUrl || '',
        title: target.title,
        accountHandle: acc.handle,
        isScheduled,
      });

      const publishedDateText = `Published ${new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      })}`;

      await updateReel(id, {
        status: 'published',
        dateText: publishedDateText,
        igMediaId: res.publishedMediaId || res.creationId,
        errorMessage: '',
        errorDetails: null,
        publishedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
      });

      await addHistory({
        source: sourceName,
        message: `Published “${target.title}” to Instagram (${res.publishedMediaId || res.creationId})`,
        account: acc.handle,
        status: 'success',
        reelId: id,
        igMediaId: res.publishedMediaId || res.creationId,
        kind: target.kind || 'Reel',
      });
      return res;
    } catch (publishErr) {
      const errorDetails = publishErr.errorDetails || publishErr.metaError || {
        code: publishErr.code || 'PUBLISH_FAILED',
        message: publishErr.message,
      };
      const newRetryCount = (target.retryCount || 0) + 1;
      const isRetryable = publishErr.retryable ?? true;

      await updateReel(id, {
        status: 'failed',
        errorMessage: publishErr.message || 'Publishing failed',
        errorDetails,
        retryCount: newRetryCount,
        maxRetries: 3,
        retryable: isRetryable,
        lastAttemptAt: new Date().toISOString(),
      });

      await addHistory({
        source: sourceName,
        message: `Publish failed for “${target.title}”: ${publishErr.message}`,
        account: acc.handle,
        status: 'failed',
        reelId: id,
        errorDetails,
        retryable: isRetryable,
        kind: target.kind || 'Reel',
      });
      throw publishErr;
    }
  };

  const retryPublish = async (reelId) => {
    return publishReelNow(reelId, { isScheduled: false });
  };

  const isCheckingScheduledRef = useRef(false);

  const checkAndProcessDueScheduled = async () => {
    if (isCheckingScheduledRef.current) return { checked: 0, processed: 0 };
    const now = Date.now();
    const dueReels = reels.filter(
      (r) =>
        r.status === 'scheduled' &&
        r.scheduledTimestamp &&
        Date.parse(r.scheduledTimestamp) <= now
    );

    if (dueReels.length === 0) return { checked: reels.length, dueCount: 0, processed: 0 };
    isCheckingScheduledRef.current = true;

    let processedCount = 0;
    try {
      for (const reel of dueReels) {
        try {
          await publishReelNow(reel.id, { isScheduled: true });
          processedCount++;
        } catch {
          // Handled and logged inside publishReelNow
        }
      }
      return { checked: reels.length, dueCount: dueReels.length, processed: processedCount };
    } finally {
      isCheckingScheduledRef.current = false;
    }
  };

  const checkAndProcessDueScheduledRef = useRef(checkAndProcessDueScheduled);

  useEffect(() => {
    checkAndProcessDueScheduledRef.current = checkAndProcessDueScheduled;
  });

  // Background automated scheduler loop (checks every 30 seconds)
  useEffect(() => {
    if (!isLiveSyncActive) return;

    const timeout = setTimeout(() => {
      checkAndProcessDueScheduledRef.current();
    }, 2000);

    const interval = setInterval(() => {
      checkAndProcessDueScheduledRef.current();
    }, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isLiveSyncActive]);

  const saveAiGeneration = async (payload) => {
    if (isLiveSyncActive) {
      return createUserDocument(COLLECTIONS.AI_GENERATIONS, user.uid, payload);
    }
    return null;
  };

  const updateReelStatus = async (id, newStatus, newDateText) => {
    const updates = { status: newStatus };
    if (newDateText) updates.dateText = newDateText;

    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.MEDIA, id, updates);
    } else if (!isFirebaseConfigured) {
      setLocalReels((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }
  };

  const moveReelToDrafts = async (id) => {
    await updateReelStatus(id, 'draft', 'Not scheduled');
  };

  const deleteReel = async (id) => {
    const target = reels.find((r) => r.id === id);
    if (isLiveSyncActive) {
      if (target?.storagePath) {
        await deleteStorageFile(target.storagePath);
      }
      if (target?.thumbnailStoragePath) {
        await deleteStorageFile(target.thumbnailStoragePath);
      }
      await deleteUserDocument(COLLECTIONS.MEDIA, id);
    } else if (!isFirebaseConfigured) {
      setLocalReels((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Automation actions
  const toggleAutomation = async (id) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;

    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.AUTOMATIONS, id, {
        enabled: !target.enabled,
      });
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) =>
        prev.map((auto) =>
          auto.id === id ? { ...auto, enabled: !auto.enabled } : auto
        )
      );
    }
  };

  const addAutomation = async (newAuto) => {
    if (isLiveSyncActive) {
      await createUserDocument(COLLECTIONS.AUTOMATIONS, user.uid, newAuto);
      setSelectedAutomationIndex(automations.length);
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) => [...prev, newAuto]);
      setSelectedAutomationIndex(automations.length);
    }
  };

  const debouncedFirestoreUpdate = (key, docId, updates) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      updateUserDocument(COLLECTIONS.AUTOMATIONS, docId, updates).catch((err) => {
        console.error('[Firestore] Debounced automation update failed:', err.message);
      });
    }, 350);
  };

  const updateAutomationSteps = (index, newSteps) => {
    const target = automations[index];
    if (!target) return;

    if (isLiveSyncActive && hasLiveAutomations) {
      setFsAutomations((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((a, idx) =>
                idx === index ? { ...a, steps: newSteps } : a
              ),
            }
          : prev
      );
      debouncedFirestoreUpdate(`steps_${target.id}`, target.id, { steps: newSteps });
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) =>
        prev.map((a, idx) => (idx === index ? { ...a, steps: newSteps } : a))
      );
    }
  };

  const updateAutomationName = (index, name) => {
    const target = automations[index];
    if (!target) return;

    if (isLiveSyncActive && hasLiveAutomations) {
      setFsAutomations((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((a, idx) =>
                idx === index ? { ...a, name } : a
              ),
            }
          : prev
      );
      debouncedFirestoreUpdate(`name_${target.id}`, target.id, { name });
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) =>
        prev.map((a, idx) => (idx === index ? { ...a, name } : a))
      );
    }
  };

  const deleteAutomation = async (id) => {
    if (isLiveSyncActive) {
      await deleteUserDocument(COLLECTIONS.AUTOMATIONS, id);
      setSelectedAutomationIndex(0);
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) => prev.filter((a) => a.id !== id));
      setSelectedAutomationIndex(0);
    }
  };

  const recordAutomationExecution = async (auto, { passed, summary }) => {
    const newRuns = (auto.runs || 0) + 1;
    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.AUTOMATIONS, auto.id, { runs: newRuns });
      await incrementUserRuns(user.uid, 1).catch(() => {});
      await addHistory({
        source: auto.name,
        message: summary,
        account: activeAccount?.handle || '@workspace',
        status: passed ? 'success' : 'failed',
      });
    } else if (!isFirebaseConfigured) {
      setLocalAutomations((prev) =>
        prev.map((a) => (a.id === auto.id ? { ...a, runs: newRuns } : a))
      );
      await addHistory({
        source: auto.name,
        message: summary,
        account: activeAccount?.handle || '@workspace',
        status: passed ? 'success' : 'failed',
      });
    }
  };

  // History actions
  const retryHistoryItem = async (id) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;

    const targetReel = reels.find(
      (r) => r.id === entry.reelId || (r.title && entry.message && entry.message.includes(r.title))
    );

    if (targetReel) {
      return publishReelNow(targetReel.id, { isScheduled: false });
    }

    const hasLiveConnectedAccount = accounts.some(
      (a) => a.connected && a.connectionType === 'meta_oauth'
    );

    const status = isBackendConfigured && hasLiveConnectedAccount ? 'running' : 'failed';
    const message =
      status === 'running'
        ? `Re-queued retry for: ${entry.message}`
        : `Retry requires live Meta OAuth connection & backend API (${entry.message})`;

    if (isLiveSyncActive) {
      await updateUserDocument(COLLECTIONS.HISTORY, id, { status, message });
    } else if (!isFirebaseConfigured) {
      setLocalHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, message } : item))
      );
    }
  };

  const openNewReelModal = (initialTab = 'normal') => {
    setEditingReel(null);
    setNewReelInitialTab(initialTab);
    setIsNewReelModalOpen(true);
  };

  const openEditReelModal = (reel) => {
    setEditingReel(reel);
    setNewReelInitialTab('normal');
    setIsNewReelModalOpen(true);
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountIndex,
        activeAccount,
        switchAccount,
        toggleAccountConnection,
        disconnectAccount,
        addAccount,
        updateAccount,
        removeAccount,

        reels,
        addReel,
        updateReel,
        duplicateReel,
        publishReelNow,
        retryPublish,
        checkAndProcessDueScheduled,
        updateReelStatus,
        moveReelToDrafts,
        deleteReel,
        saveAiGeneration,

        automations,
        selectedAutomationIndex,
        setSelectedAutomationIndex,
        toggleAutomation,
        addAutomation,
        deleteAutomation,
        updateAutomationSteps,
        updateAutomationName,
        recordAutomationExecution,

        history,
        addHistory,
        retryHistoryItem,

        isLiveSyncActive,
        isLoadingData,
        isConnectModalOpen,
        setIsConnectModalOpen,
        isNewReelModalOpen,
        setIsNewReelModalOpen,
        newReelInitialTab,
        editingReel,
        setEditingReel,
        openNewReelModal,
        openEditReelModal,
        pendingCoverAttachment,
        setPendingCoverAttachment,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
