import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, writeBatch, where,
} from 'firebase/firestore';
import { db } from './config';
import { seedCompetitions, seedMembers, seedTeams } from '../data/seedData';

// ── Detect whether Firebase is configured ────────────
const isFirebaseConfigured = () => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return key && key !== 'your-api-key-here' && !key.startsWith('your-');
};

let runtimeFirebaseOffline = false;
const useLocalStore = () => !isFirebaseConfigured() || runtimeFirebaseOffline;
const markFirebaseOffline = (error) => {
  if (!runtimeFirebaseOffline) console.warn('Firebase unavailable — using local storage. Data will NOT be shared.', error);
  runtimeFirebaseOffline = true;
  return error;
};

// expose for a small banner in the UI
export const isOffline = () => runtimeFirebaseOffline;

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
  const notify = () => { const d = load(); listeners.forEach((cb) => cb(d)); };
  const newId = () => `${key}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    subscribe(cb) {
      listeners.push(cb);
      cb(load());
      return () => { listeners = listeners.filter((l) => l !== cb); };
    },
    getAll() { return load(); },
    getById(id) { return load().find((i) => i.id === id) || null; },
    add(item) {
      const data = load();
      const newItem = { ...item, id: item.id || newId(), createdAt: new Date().toISOString() };
      data.push(newItem);
      save(data);
      notify();
      return newItem;
    },
    addMany(items) {
      const data = load();
      const created = items.map((item) => ({ ...item, id: item.id || newId(), createdAt: new Date().toISOString() }));
      save([...data, ...created]);
      notify();
      return created;
    },
    update(id, updates) {
      const data = load();
      const idx = data.findIndex((i) => i.id === id);
      if (idx >= 0) { data[idx] = { ...data[idx], ...updates }; save(data); notify(); }
    },
    remove(id) {
      save(load().filter((i) => i.id !== id));
      notify();
    },
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
  return onSnapshot(q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { markFirebaseOffline(err); localMembers.subscribe(callback); });
}

export async function addMember(data) {
  if (useLocalStore()) return localMembers.add(data);
  try {
    const ref = await addDoc(membersRef(), { ...data, createdAt: serverTimestamp() });
    return { id: ref.id, ...data };
  } catch (error) { markFirebaseOffline(error); return localMembers.add(data); }
}

export async function addMembers(list) {
  if (!list.length) return [];
  if (useLocalStore()) return localMembers.addMany(list);
  try {
    const batch = writeBatch(db);
    const created = list.map((data) => {
      const ref = doc(membersRef());
      batch.set(ref, { ...data, createdAt: serverTimestamp() });
      return { id: ref.id, ...data };
    });
    await batch.commit();
    return created;
  } catch (error) { markFirebaseOffline(error); return localMembers.addMany(list); }
}

export async function updateMember(id, data) {
  if (useLocalStore()) return localMembers.update(id, data);
  try { return await setDoc(doc(db, 'members', id), data, { merge: true }); }
  catch (error) { markFirebaseOffline(error); return localMembers.update(id, data); }
}

export async function deleteMember(id) {
  if (useLocalStore()) {
    localTeams.getAll().forEach((t) => {
      if (t.memberIds?.includes(id)) localTeams.update(t.id, { memberIds: t.memberIds.filter((m) => m !== id) });
    });
    return localMembers.remove(id);
  }
  try {
    const teamsSnap = await getDocs(collection(db, 'teams'));
    const batch = writeBatch(db);
    teamsSnap.docs.forEach((teamDoc) => {
      const t = teamDoc.data();
      if (t.memberIds?.includes(id)) batch.update(teamDoc.ref, { memberIds: t.memberIds.filter((m) => m !== id) });
    });
    batch.delete(doc(db, 'members', id));
    return await batch.commit();
  } catch (error) {
    markFirebaseOffline(error);
    localTeams.getAll().forEach((t) => {
      if (t.memberIds?.includes(id)) localTeams.update(t.id, { memberIds: t.memberIds.filter((m) => m !== id) });
    });
    return localMembers.remove(id);
  }
}

// ── Competitions ─────────────────────────────────────
const competitionsRef = () => collection(db, 'competitions');

export function subscribeCompetitions(callback) {
  if (useLocalStore()) return localCompetitions.subscribe(callback);
  const q = query(competitionsRef(), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { markFirebaseOffline(err); localCompetitions.subscribe(callback); });
}

// Add any seed competition that's missing from the live data (matched by
// seedKey, falling back to name). Runs whether the collection is empty or
// already populated, so newly-added seed entries appear for everyone without
// creating duplicates. Note: a seed comp you delete will reappear on reload.
export async function reconcileSeedCompetitions(existing) {
  const have = new Set();
  existing.forEach((c) => { if (c.seedKey) have.add(c.seedKey); if (c.name) have.add(c.name); });
  const missing = seedCompetitions.filter((s) => !have.has(s.seedKey) && !have.has(s.name));
  if (!missing.length) return;
  if (useLocalStore()) { missing.forEach(({ id, ...data }) => localCompetitions.add(data)); return; }
  try {
    const batch = writeBatch(db);
    missing.forEach(({ id, ...data }) => batch.set(doc(competitionsRef()), { ...data, createdAt: serverTimestamp() }));
    await batch.commit();
  } catch (error) { markFirebaseOffline(error); missing.forEach(({ id, ...data }) => localCompetitions.add(data)); }
}

export async function addCompetition(data) {
  if (useLocalStore()) return localCompetitions.add(data);
  try {
    const ref = await addDoc(competitionsRef(), { ...data, createdAt: serverTimestamp() });
    return { id: ref.id, ...data };
  } catch (error) { markFirebaseOffline(error); return localCompetitions.add(data); }
}

export async function updateCompetition(id, data) {
  if (useLocalStore()) return localCompetitions.update(id, data);
  try { return await setDoc(doc(db, 'competitions', id), data, { merge: true }); }
  catch (error) { markFirebaseOffline(error); return localCompetitions.update(id, data); }
}

export async function deleteCompetition(id) {
  if (useLocalStore()) {
    localTeams.getAll().filter((t) => t.competitionId === id).forEach((t) => localTeams.remove(t.id));
    return localCompetitions.remove(id);
  }
  try {
    const teamsSnap = await getDocs(query(collection(db, 'teams'), where('competitionId', '==', id)));
    const batch = writeBatch(db);
    teamsSnap.docs.forEach((teamDoc) => batch.delete(teamDoc.ref));
    batch.delete(doc(db, 'competitions', id));
    return await batch.commit();
  } catch (error) {
    markFirebaseOffline(error);
    localTeams.getAll().filter((t) => t.competitionId === id).forEach((t) => localTeams.remove(t.id));
    return localCompetitions.remove(id);
  }
}

export async function getCompetition(id) {
  if (useLocalStore()) return localCompetitions.getById(id);
  try {
    const snap = await getDoc(doc(db, 'competitions', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) { markFirebaseOffline(error); return localCompetitions.getById(id); }
}

// ── Teams ────────────────────────────────────────────
const sortByCreated = (a, b) => {
  const av = a.createdAt?.seconds ?? new Date(a.createdAt || 0).getTime() / 1000;
  const bv = b.createdAt?.seconds ?? new Date(b.createdAt || 0).getTime() / 1000;
  return av - bv;
};

export function subscribeTeams(competitionId, callback) {
  if (useLocalStore()) {
    return localTeams.subscribe((all) => callback(all.filter((t) => t.competitionId === competitionId)));
  }
  return onSnapshot(collection(db, 'teams'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => t.competitionId === competitionId).sort(sortByCreated));
  }, (err) => { markFirebaseOffline(err); localTeams.subscribe((all) => callback(all.filter((t) => t.competitionId === competitionId))); });
}

export function subscribeAllTeams(callback) {
  if (useLocalStore()) return localTeams.subscribe(callback);
  return onSnapshot(collection(db, 'teams'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByCreated));
  }, (err) => { markFirebaseOffline(err); localTeams.subscribe(callback); });
}

export async function addTeam(data) {
  const payload = { ...data, memberIds: data.memberIds || [] };
  if (useLocalStore()) return localTeams.add(payload);
  try {
    const ref = await addDoc(collection(db, 'teams'), { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  } catch (error) { markFirebaseOffline(error); return localTeams.add(payload); }
}

export async function updateTeam(id, data) {
  if (useLocalStore()) return localTeams.update(id, data);
  try { return await setDoc(doc(db, 'teams', id), data, { merge: true }); }
  catch (error) { markFirebaseOffline(error); return localTeams.update(id, data); }
}

export async function deleteTeam(id) {
  if (useLocalStore()) return localTeams.remove(id);
  try { return await deleteDoc(doc(db, 'teams', id)); }
  catch (error) { markFirebaseOffline(error); return localTeams.remove(id); }
}

// Move a member into a target team for a competition, pulling them out of any
// other team in the SAME competition first (one team per person per comp).
// Pass targetTeamId = null to just remove them from all teams in the comp.
export async function moveMemberToTeam(memberId, targetTeamId, compTeams) {
  const tasks = [];
  for (const t of compTeams) {
    const inTeam = t.memberIds?.includes(memberId);
    if (t.id === targetTeamId) {
      if (!inTeam) tasks.push(updateTeam(t.id, { memberIds: [...(t.memberIds || []), memberId] }));
    } else if (inTeam) {
      tasks.push(updateTeam(t.id, { memberIds: t.memberIds.filter((m) => m !== memberId) }));
    }
  }
  await Promise.all(tasks);
}
