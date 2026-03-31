'use server'

import { db } from '../lib/firebase'; 
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  limit,      
  getDocs, 
  orderBy, // Add this
  Timestamp 
} from 'firebase/firestore';

export async function sendPingAction(message: string, senderId: string) {
  const msg = message || "🔔";
  const timestamp = Timestamp.now();
  
  // Set the live notification
  await setDoc(doc(db, "notifications", "current"), {
    message: msg,
    sender: senderId,
    status: "pending",
    timestamp
  });
  
  // Add to history
  await addDoc(collection(db, "history"), {
    message: msg,
    sender: senderId,
    status: "pending",
    timestamp
  });
}

export async function cancelPingAction() {
  // 1. Target the ABSOLUTE latest pending item to prevent "Pending" ghosts
  const q = query(
    collection(db, "history"), 
    where("status", "==", "pending"), 
    orderBy("timestamp", "desc"), // Ensure we get the most recent one
    limit(1)
  );
  
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    await updateDoc(doc(db, "history", snap.docs[0].id), {
      status: "CANCELED"
    });
  }

  await deleteDoc(doc(db, "notifications", "current"));
}