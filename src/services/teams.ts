import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Team,
  TeamMember,
  TeamActivity,
  TeamMemberActivitySummary,
  TeamActivityFeedItem,
} from '../types';

// Teams are stored in a top-level collection since they're shared across users
const teamsRef = () => collection(db, 'teams');
const teamMembersRef = (teamId: string) =>
  collection(db, 'teams', teamId, 'members');
const teamActivityRef = (teamId: string) =>
  collection(db, 'teams', teamId, 'activity');

/**
 * Generate a random 6-character invite code
 */
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ============================================================================
// TEAM CRUD OPERATIONS
// ============================================================================

/**
 * Create a new team
 */
export const createTeam = async (
  creatorId: string,
  name: string,
  displayName: string
): Promise<{ teamId: string; inviteCode: string }> => {
  const inviteCode = generateInviteCode();

  const teamData: Omit<Team, 'id'> = {
    name,
    invite_code: inviteCode,
    creator_id: creatorId,
    member_ids: [creatorId],
    created_at: new Date().toISOString(),
    status: 'active',
    settings: {
      max_members: 5,
    },
  };

  const teamRef = await addDoc(teamsRef(), teamData);

  // Add creator as first member
  await addDoc(teamMembersRef(teamRef.id), {
    user_id: creatorId,
    display_name: displayName,
    joined_at: new Date().toISOString(),
    notification_settings: {
      challenge_completions: true,
      habit_completions: true,
      daily_reminders: true,
    },
  });

  return { teamId: teamRef.id, inviteCode };
};

/**
 * Get a team by ID
 */
export const getTeamById = async (teamId: string): Promise<Team | null> => {
  const ref = doc(db, 'teams', teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
};

/**
 * Get a team by invite code
 */
export const getTeamByInviteCode = async (
  inviteCode: string
): Promise<Team | null> => {
  const q = query(
    teamsRef(),
    where('invite_code', '==', inviteCode.toUpperCase()),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Team;
};

/**
 * Get the team a user belongs to
 */
export const getUserTeam = async (userId: string): Promise<Team | null> => {
  const q = query(
    teamsRef(),
    where('member_ids', 'array-contains', userId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Team;
};

/**
 * Update team settings
 */
export const updateTeam = async (
  teamId: string,
  data: Partial<Pick<Team, 'name' | 'settings'>>
): Promise<void> => {
  const ref = doc(db, 'teams', teamId);
  await updateDoc(ref, data);
};

/**
 * Archive a team (soft delete)
 */
export const archiveTeam = async (teamId: string): Promise<void> => {
  const ref = doc(db, 'teams', teamId);
  await updateDoc(ref, { status: 'archived' });
};

// ============================================================================
// TEAM MEMBER OPERATIONS
// ============================================================================

/**
 * Join a team
 */
export const joinTeam = async (
  teamId: string,
  userId: string,
  displayName: string
): Promise<void> => {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');
  if (team.status !== 'active') throw new Error('Team is no longer active');
  if (team.member_ids.length >= team.settings.max_members) {
    throw new Error('Team is full');
  }
  if (team.member_ids.includes(userId)) {
    throw new Error('You are already a member of this team');
  }

  // Check if user is already in another team
  const existingTeam = await getUserTeam(userId);
  if (existingTeam) {
    throw new Error('You are already in a team. Leave your current team first.');
  }

  // Add to member_ids array
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    member_ids: [...team.member_ids, userId],
  });

  // Add member document
  await addDoc(teamMembersRef(teamId), {
    user_id: userId,
    display_name: displayName,
    joined_at: new Date().toISOString(),
    notification_settings: {
      challenge_completions: true,
      habit_completions: true,
      daily_reminders: true,
    },
  });
};

/**
 * Leave a team
 */
export const leaveTeam = async (
  teamId: string,
  userId: string
): Promise<void> => {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  // Remove from member_ids array
  const newMemberIds = team.member_ids.filter((id) => id !== userId);

  // If no members left, archive the team
  if (newMemberIds.length === 0) {
    await archiveTeam(teamId);
  } else {
    // If creator leaves, assign new creator to oldest remaining member
    let updates: Partial<Team> = { member_ids: newMemberIds };
    if (team.creator_id === userId) {
      // Get all members sorted by join date
      const members = await getTeamMembers(teamId);
      const remainingMembers = members.filter((m) => m.user_id !== userId);
      if (remainingMembers.length > 0) {
        // Sort by joined_at ascending and pick first
        remainingMembers.sort(
          (a, b) =>
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        updates = { ...updates, creator_id: remainingMembers[0].user_id };
      }
    }

    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, updates);
  }

  // Delete member document
  const memberQuery = query(
    teamMembersRef(teamId),
    where('user_id', '==', userId)
  );
  const memberSnap = await getDocs(memberQuery);
  for (const memberDoc of memberSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }
};

/**
 * Remove a member from a team (creator only)
 */
export const removeMember = async (
  teamId: string,
  creatorId: string,
  memberToRemoveId: string
): Promise<void> => {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');
  if (team.creator_id !== creatorId) {
    throw new Error('Only the team creator can remove members');
  }
  if (memberToRemoveId === creatorId) {
    throw new Error('Cannot remove yourself. Use leave team instead.');
  }

  await leaveTeam(teamId, memberToRemoveId);
};

/**
 * Get all members of a team
 */
export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const snap = await getDocs(teamMembersRef(teamId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
};

/**
 * Update member's display name or notification settings
 */
export const updateMember = async (
  teamId: string,
  userId: string,
  data: Partial<Pick<TeamMember, 'display_name' | 'notification_settings'>>
): Promise<void> => {
  const memberQuery = query(
    teamMembersRef(teamId),
    where('user_id', '==', userId)
  );
  const snap = await getDocs(memberQuery);
  if (snap.empty) throw new Error('Member not found');

  await updateDoc(snap.docs[0].ref, data);
};

// ============================================================================
// TEAM ACTIVITY OPERATIONS
// ============================================================================

/**
 * Log activity when a team member completes a challenge or habit
 */
export const logTeamActivity = async (
  teamId: string,
  userId: string,
  type: 'challenge' | 'habit',
  categoryId: string,
  categoryName: string,
  habitCount?: number
): Promise<void> => {
  const activityData: Omit<TeamActivity, 'id'> = {
    user_id: userId,
    date: getTodayStr(),
    type,
    category_id: categoryId,
    category_name: categoryName,
    created_at: new Date().toISOString(),
  };

  if (type === 'habit' && habitCount !== undefined) {
    activityData.habit_count = habitCount;
  }

  await addDoc(teamActivityRef(teamId), activityData);
};

/**
 * Get today's activity for a team
 */
export const getTodayTeamActivity = async (
  teamId: string
): Promise<TeamActivity[]> => {
  const todayStr = getTodayStr();
  const q = query(teamActivityRef(teamId), where('date', '==', todayStr));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamActivity));
};

/**
 * Get today's activity as a feed (individual items with display names)
 * Sorted by most recent first
 */
export const getTodayTeamActivityFeed = async (
  teamId: string
): Promise<TeamActivityFeedItem[]> => {
  const members = await getTeamMembers(teamId);
  const todayActivity = await getTodayTeamActivity(teamId);

  // Create a map of user_id -> display_name
  const displayNames: Record<string, string> = {};
  members.forEach((m) => {
    displayNames[m.user_id] = m.display_name;
  });

  // Map activities to feed items and sort by time (most recent first)
  const feedItems: TeamActivityFeedItem[] = todayActivity
    .map((activity) => ({
      id: activity.id,
      user_id: activity.user_id,
      display_name: displayNames[activity.user_id] || 'Unknown',
      type: activity.type,
      category_name: activity.category_name,
      created_at: activity.created_at,
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return feedItems;
};

/**
 * Get activity for a specific date range
 */
export const getTeamActivityRange = async (
  teamId: string,
  startDate: string,
  endDate: string
): Promise<TeamActivity[]> => {
  // Firestore doesn't support range queries on string dates with ordering,
  // so we fetch and filter client-side
  const snap = await getDocs(teamActivityRef(teamId));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as TeamActivity))
    .filter((a) => a.date >= startDate && a.date <= endDate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Get activity summary for each team member for today
 */
export const getTeamMemberActivitySummary = async (
  teamId: string,
  userStreaks: Record<string, number> // userId -> currentStreak
): Promise<TeamMemberActivitySummary[]> => {
  const members = await getTeamMembers(teamId);
  const todayActivity = await getTodayTeamActivity(teamId);

  // Group activity by user
  const activityByUser: Record<string, TeamActivity[]> = {};
  todayActivity.forEach((a) => {
    if (!activityByUser[a.user_id]) activityByUser[a.user_id] = [];
    activityByUser[a.user_id].push(a);
  });

  return members.map((member) => {
    const userActivity = activityByUser[member.user_id] || [];
    const challengeActivity = userActivity.find((a) => a.type === 'challenge');
    const habitActivities = userActivity.filter((a) => a.type === 'habit');
    const totalHabits = habitActivities.reduce(
      (sum, a) => sum + (a.habit_count || 1),
      0
    );

    // Find most recent activity time
    let lastActivityTime: string | undefined;
    if (userActivity.length > 0) {
      const sorted = userActivity.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      lastActivityTime = sorted[0].created_at;
    }

    return {
      user_id: member.user_id,
      display_name: member.display_name,
      has_activity_today: userActivity.length > 0,
      challenge_completed: !!challengeActivity,
      challenge_category: challengeActivity?.category_name,
      habits_completed: totalHabits,
      last_activity_time: lastActivityTime,
      current_streak: userStreaks[member.user_id] || 0,
    };
  });
};

/**
 * Get weekly activity counts by day
 * Returns an array of 7 numbers representing active member counts for Mon-Sun
 */
export const getWeeklyTeamActivityCounts = async (
  teamId: string
): Promise<number[]> => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const startDate = toDateStr(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const endDate = toDateStr(sunday);

  const activity = await getTeamActivityRange(teamId, startDate, endDate);

  // For each day, count unique users who had activity
  const counts: number[] = [];
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(monday);
    checkDate.setDate(monday.getDate() + i);
    const dateStr = toDateStr(checkDate);

    // Only count days up to today
    if (checkDate > today) {
      counts.push(-1); // -1 indicates future day
    } else {
      const dayActivity = activity.filter((a) => a.date === dateStr);
      const uniqueUsers = new Set(dayActivity.map((a) => a.user_id));
      counts.push(uniqueUsers.size);
    }
  }

  return counts;
};

/**
 * Calculate combined team streak (consecutive days where at least one member was active)
 */
export const getTeamCombinedStreak = async (teamId: string): Promise<number> => {
  // Get all activity sorted by date descending
  const snap = await getDocs(teamActivityRef(teamId));
  const allActivity = snap.docs.map((d) => d.data() as TeamActivity);

  if (allActivity.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [...new Set(allActivity.map((a) => a.date))].sort().reverse();

  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  const dateSet = new Set(uniqueDates);

  // Streak must include today or yesterday
  let checkDate = new Date(today);
  if (!dateSet.has(todayStr)) {
    if (!dateSet.has(yesterdayStr)) {
      return 0;
    }
    checkDate = new Date(yesterday);
  }

  let streak = 0;
  while (dateSet.has(toDateStr(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
};

/**
 * Get team stats (combined streak, longest streak, days active)
 */
export const getTeamStats = async (
  teamId: string
): Promise<{ combinedStreak: number; longestStreak: number; daysActive: number }> => {
  const snap = await getDocs(teamActivityRef(teamId));
  const allActivity = snap.docs.map((d) => d.data() as TeamActivity);

  if (allActivity.length === 0) {
    return { combinedStreak: 0, longestStreak: 0, daysActive: 0 };
  }

  const uniqueDates = [...new Set(allActivity.map((a) => a.date))].sort();
  const daysActive = uniqueDates.length;

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const combinedStreak = await getTeamCombinedStreak(teamId);
  longestStreak = Math.max(longestStreak, combinedStreak);

  return { combinedStreak, longestStreak, daysActive };
};
