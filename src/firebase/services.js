import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, writeBatch, where,
} from 'firebase/firestore';
import { db } from './config';
import { seedCompetitions, seedMembers, seedTeams } from '../data/seedData';

// ── Detect if Firebase is configured ─────────────────
const isFirebaseConfigured = () => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return key && key !== 'your-api-key-here' && !key.startsWith('your-');
};

let runtimeFirebaseOffline = false;

const useLocalStore = () => !isFirebaseConfigured() || runtimeFirebaseOffline;

const markFirebaseOffline = (error) => {
  runtimeFirebaseOffline = true;
  return error;
};

const isNotFoundError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('no document to update') || message.includes('not-found') || message.includes('not found');
};

// ── LocalStorage fallback store ──────────────────────
function createLocalStore(key, seed) {
  const load = () => {
    try {
      const raw = localStorage.getItem(`ct_${key}`);
      return raw ? JSON.parse(raw) : [...seed];
    } catch { return [...seed]; }
  };
  const save = (data) => localStorage.setItem(`ct_${key}`, JSON.stringify(data));
  let listeners = [];
  const notify = () => { const d = load(); listeners.forEach(cb => cb(d)); };

  return {
    subscribe(cb) {
      listeners.push(cb);
      cb(load());
      return () => { listeners = listeners.filter(l => l !== cb); };
    },
    getAll() { return load(); },
    getById(id) { return load().find(i => i.id === id) || null; },
    add(item) {
      const data = load();
      const newItem = { ...item, id: `${key}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() };
      data.push(newItem);
      save(data);
      notify();
      return newItem;
    },
    update(id, updates) {
      const data = load();
      const idx = data.findIndex(i => i.id === id);
      if (idx >= 0) { data[idx] = { ...data[idx], ...updates }; save(data); notify(); }
    },
    remove(id) {
      const data = load().filter(i => i.id !== id);
      save(data);
      notify();
    },
    query(filterFn) { return load().filter(filterFn); },
  };
}

const localMembers = createLocalStore('members', seedMembers);
const localCompetitions = createLocalStore('competitions', seedCompetitions);
const localTeams = createLocalStore('teams', seedTeams);

// ── Members ──────────────────────────────────────────
const membersRef = () => collection(db, 'members');

export function subscribeMembers(callback) {
  if (useLocalStore()) return localMembers.subscribe(callback);
  const q = query(membersRef(), orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => { console.warn('Firebase error, falling back to local:', err); markFirebaseOffline(err); localMembers.subscribe(callback); });
}

export async function addMember(data) {
  if (useLocalStore()) return localMembers.add(data);
  try {
    const docRef = await addDoc(membersRef(), { ...data, createdAt: serverTimestamp() });
    return { id: docRef.id, ...data };
  } catch (error) {
    markFirebaseOffline(error);
    return localMembers.add(data);
  }
}

export async function updateMember(id, data) {
  if (useLocalStore()) return localMembers.update(id, data);
  try {
    return await setDoc(doc(db, 'members', id), data, { merge: true });
  } catch (error) {
    markFirebaseOffline(error);
    return localMembers.update(id, data);
  }
}

export async function deleteMember(id) {
  if (useLocalStore()) {
    // Remove from all teams too
    const teams = localTeams.getAll();
    teams.forEach(t => {
      if (t.memberIds?.includes(id)) {
        localTeams.update(t.id, { memberIds: t.memberIds.filter(m => m !== id) });
      }
    });
    return localMembers.remove(id);
  }
  const teamsSnap = await getDocs(collection(db, 'teams'));
  const batch = writeBatch(db);
  teamsSnap.docs.forEach((teamDoc) => {
    const teamData = teamDoc.data();
    if (teamData.memberIds?.includes(id)) {
      batch.update(teamDoc.ref, { memberIds: teamData.memberIds.filter((mid) => mid !== id) });
    }
  });
  batch.delete(doc(db, 'members', id));
  try {
    return await batch.commit();
  } catch (error) {
    markFirebaseOffline(error);
    const teams = localTeams.getAll();
    teams.forEach(t => {
      if (t.memberIds?.includes(id)) {
        localTeams.update(t.id, { memberIds: t.memberIds.filter(m => m !== id) });
      }
    });
    return localMembers.remove(id);
  }
}

// ── Competitions ─────────────────────────────────────
const competitionsRef = () => collection(db, 'competitions');

export function subscribeCompetitions(callback) {
  if (useLocalStore()) return localCompetitions.subscribe(callback);
  const q = query(competitionsRef(), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => { console.warn('Firebase error, falling back to local:', err); markFirebaseOffline(err); localCompetitions.subscribe(callback); });
}

export async function addCompetition(data) {
  if (useLocalStore()) return localCompetitions.add(data);
  try {
    const docRef = await addDoc(competitionsRef(), { ...data, createdAt: serverTimestamp() });
    return { id: docRef.id, ...data };
  } catch (error) {
    markFirebaseOffline(error);
    return localCompetitions.add(data);
  }
}

export async function updateCompetition(id, data) {
  if (useLocalStore()) return localCompetitions.update(id, data);
  try {
    return await setDoc(doc(db, 'competitions', id), data, { merge: true });
  } catch (error) {
    if (!isNotFoundError(error)) {
      markFirebaseOffline(error);
      return localCompetitions.update(id, data);
    }
    try {
      return await setDoc(doc(db, 'competitions', id), data, { merge: true });
    } catch (fallbackError) {
      markFirebaseOffline(fallbackError);
      return localCompetitions.update(id, data);
    }
  }
}

export async function deleteCompetition(id) {
  if (useLocalStore()) {
    localTeams.getAll().filter(t => t.competitionId === id).forEach(t => localTeams.remove(t.id));
    return localCompetitions.remove(id);
  }
  const teamsSnap = await getDocs(query(collection(db, 'teams'), where('competitionId', '==', id)));
  const batch = writeBatch(db);
  teamsSnap.docs.forEach((teamDoc) => batch.delete(teamDoc.ref));
  batch.delete(doc(db, 'competitions', id));
  try {
    return await batch.commit();
  } catch (error) {
    markFirebaseOffline(error);
    localTeams.getAll().filter(t => t.competitionId === id).forEach(t => localTeams.remove(t.id));
    return localCompetitions.remove(id);
  }
}

export async function getCompetition(id) {
  if (useLocalStore()) return localCompetitions.getById(id);
  try {
    const snap = await getDoc(doc(db, 'competitions', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    markFirebaseOffline(error);
    return localCompetitions.getById(id);
  }
}

// ── Teams ────────────────────────────────────────────
export function subscribeTeams(competitionId, callback) {
  if (useLocalStore()) {
    return localTeams.subscribe(all => callback(all.filter(t => t.competitionId === competitionId)));
  }
  return onSnapshot(collection(db, 'teams'), (snap) => {
    const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(
      teams
        .filter((team) => team.competitionId === competitionId)
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    );
  }, (err) => {
    console.warn('Firebase teams listener failed:', err);
    markFirebaseOffline(err);
    callback([]);
  });
}

export function subscribeAllTeams(callback) {
  if (useLocalStore()) return localTeams.subscribe(callback);
  return onSnapshot(collection(db, 'teams'), (snap) => {
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    );
  }, (err) => {
    console.warn('Firebase teams listener failed:', err);
    markFirebaseOffline(err);
    callback([]);
  });
}

export async function addTeam(data) {
  if (useLocalStore()) return localTeams.add({ ...data, memberIds: data.memberIds || [] });
  try {
    const docRef = await addDoc(collection(db, 'teams'), { ...data, memberIds: data.memberIds || [], createdAt: serverTimestamp() });
    return { id: docRef.id, ...data, memberIds: data.memberIds || [] };
  } catch (error) {
    markFirebaseOffline(error);
    return localTeams.add({ ...data, memberIds: data.memberIds || [] });
  }
}

export async function updateTeam(id, data) {
  if (useLocalStore()) return localTeams.update(id, data);
  try {
    return await setDoc(doc(db, 'teams', id), data, { merge: true });
  } catch (error) {
    markFirebaseOffline(error);
    return localTeams.update(id, data);
  }
}

export async function deleteTeam(id) {
  if (useLocalStore()) return localTeams.remove(id);
  try {
    return await deleteDoc(doc(db, 'teams', id));
  } catch (error) {
    markFirebaseOffline(error);
    return localTeams.remove(id);
  }
}
