import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserData {
  profile: {
    name: string;
    activity: string;
    breakType: string;
    suggestedFrequency: number;
  };
  breaks: { time: string; message: string; active: boolean }[];
  history: { time: string; message: string }[];
  completedBreaks: { timestamp: string; message: string; duration: number; energyLevel?: 'low' | 'medium' | 'high' | null }[];
  language: 'sv' | 'en';
}

export async function saveUserData(uid: string, data: UserData): Promise<void> {
  await setDoc(doc(db, 'users', uid), data);
}

export async function loadUserData(uid: string): Promise<UserData | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    return snap.data() as UserData;
  }
  return null;
}
