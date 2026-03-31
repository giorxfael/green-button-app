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
  Timestamp 
} from 'firebase/firestore';

export async function sendPingAction(message: string, senderId: string) {
  const msg = message || "🔔";
  const timestamp = Timestamp.now();
  
  await setDoc(doc(db, "notifications", "current"), {
    message: msg,
    sender: senderId,
    status: "pending",
    timestamp
  });
  
  await addDoc(collection(db, "history"), {
    message: msg,
    sender: senderId,
    status: "pending",
    timestamp
  });
}

export async function cancelPingAction() {
  try {
    // 1. Find ANY pending item (Simple query to avoid Index errors)
    const q = query(
      collection(db, "history"), 
      where("status", "==", "pending"), 
      limit(1)
    );
    
    const snap = await getDocs(q);
    
    // 2. Update if found
    if (!snap.empty) {
      await updateDoc(doc(db, "history", snap.docs[0].id), {
        status: "CANCELED"
      });
      console.log("History updated to CANCELED");
    }

    // 3. Always try to delete the live doc
    await deleteDoc(doc(db, "notifications", "current"));
    return { success: true };
  } catch (error) {
    console.error("Action Error:", error);
    return { success: false, error: String(error) };
  }
}