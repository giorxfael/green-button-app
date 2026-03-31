'use server'
import { db } from '../lib/firebase'; // Ensure this points to your admin-ready config
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function sendPingAction(message: string, senderId: string) {
  const pingRef = doc(db, "notifications", "current");
  await setDoc(pingRef, {
    message: message || "🔔",
    sender: senderId,
    status: "pending",
    timestamp: Timestamp.now()
  });
  
  await addDoc(collection(db, "history"), {
    message: message || "🔔",
    sender: senderId,
    status: "pending",
    timestamp: Timestamp.now()
  });
}

export async function cancelPingAction() {
  const q = query(collection(db, "history"), where("status", "==", "pending"), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(doc(db, "history", snap.docs[0].id), { status: "CANCELED" });
  }
  await deleteDoc(doc(db, "notifications", "current"));
}