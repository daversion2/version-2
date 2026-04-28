import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CoachProfile,
  CoachApplication,
  CreateProgramInput,
  ProgramTemplate,
  User,
} from '../types';

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

const programsRef = () => collection(db, 'programs');
const applicationsRef = () => collection(db, 'coachApplications');

// ============================================================================
// COACH PROFILE
// ============================================================================

export const getCoachProfile = async (
  userId: string
): Promise<CoachProfile | null> => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const user = snap.data() as User;
  return user.coach_profile || null;
};

// ============================================================================
// COACH PROGRAMS
// ============================================================================

export const getCoachPrograms = async (
  coachId: string
): Promise<ProgramTemplate[]> => {
  const q = query(programsRef(), where('creator_id', '==', coachId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ProgramTemplate))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const createProgram = async (
  coachId: string,
  data: CreateProgramInput
): Promise<string> => {
  // Verify coach status
  const userSnap = await getDoc(doc(db, 'users', coachId));
  if (!userSnap.exists()) throw new Error('User not found');
  const user = userSnap.data() as User;
  if (!user.is_coach || !user.coach_profile) {
    throw new Error('User is not an approved coach');
  }

  const graceDays = data.duration_days >= 28 ? 3 : 2;
  const now = new Date().toISOString();

  const program: Omit<ProgramTemplate, 'id'> = {
    name: data.name.trim(),
    description: data.description.trim(),
    category: data.category,
    duration_days: data.duration_days,
    grace_days: graceDays,
    icon: data.icon,
    color: data.color,
    order: 999, // coach programs sort after system programs

    cold_turkey_days: [],
    gradual_build_days: [],

    cold_turkey_description: '',
    gradual_build_description: '',
    recommended_mode: 'gradual_build',

    completion_badge_name: `${data.name.trim()} Champion`,
    completion_bonus_points: 20,

    suggested_habits: [],

    is_premium: false,
    assignable_by_coach: true,

    creator_id: coachId,
    creator_name: user.coach_profile.display_name,
    creator_credentials: user.coach_profile.credentials,
    status: 'draft',

    created_at: now,
    updated_at: now,
  };

  const docRef = await addDoc(programsRef(), program);
  return docRef.id;
};

export const updateProgram = async (
  coachId: string,
  programId: string,
  updates: Partial<ProgramTemplate>
): Promise<void> => {
  const ref = doc(db, 'programs', programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Program not found');

  const program = snap.data() as ProgramTemplate;
  if (program.creator_id !== coachId) {
    throw new Error('You can only edit your own programs');
  }

  // Filter out undefined values and add updated_at
  const cleanUpdates = Object.fromEntries(
    Object.entries({ ...updates, updated_at: new Date().toISOString() })
      .filter(([_, v]) => v !== undefined)
  );

  // Don't allow changing creator_id
  delete cleanUpdates.creator_id;

  await updateDoc(ref, cleanUpdates);
};

export const publishProgram = async (
  coachId: string,
  programId: string
): Promise<void> => {
  const ref = doc(db, 'programs', programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Program not found');

  const program = snap.data() as ProgramTemplate;
  if (program.creator_id !== coachId) {
    throw new Error('You can only publish your own programs');
  }

  // Validate program has content before publishing
  if (program.cold_turkey_days.length === 0 && program.gradual_build_days.length === 0) {
    throw new Error('Program must have at least one mode with daily content before publishing');
  }

  await updateDoc(ref, {
    status: 'published',
    updated_at: new Date().toISOString(),
  });
};

export const archiveProgram = async (
  coachId: string,
  programId: string
): Promise<void> => {
  const ref = doc(db, 'programs', programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Program not found');

  const program = snap.data() as ProgramTemplate;
  if (program.creator_id !== coachId) {
    throw new Error('You can only archive your own programs');
  }

  await updateDoc(ref, {
    status: 'archived',
    updated_at: new Date().toISOString(),
  });
};

// ============================================================================
// COACH APPLICATION
// ============================================================================

export const getMyCoachApplication = async (
  userId: string
): Promise<CoachApplication | null> => {
  const q = query(applicationsRef(), where('user_id', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const apps = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as CoachApplication))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  return apps[0];
};

export const applyToBeCoach = async (
  userId: string,
  application: {
    username: string;
    email: string;
    display_name: string;
    bio: string;
    credentials?: string;
    website_url?: string;
  }
): Promise<string> => {
  // Check for existing pending application
  const q = query(
    applicationsRef(),
    where('user_id', '==', userId),
    where('status', '==', 'pending')
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('You already have a pending coach application');
  }

  const cleanData = Object.fromEntries(
    Object.entries({
      user_id: userId,
      ...application,
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
    }).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(applicationsRef(), cleanData);
  return docRef.id;
};
