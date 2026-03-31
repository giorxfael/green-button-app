'use server'

import { db } from '../lib/firebase'; 
import { 
  doc, 
  setDoc,      // Added for sendPingAction
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  limit,      // Added for cancelPingAction
  getDocs, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Sends a live ping and records it in the history collection.
 */
export async function sendPingAction(message: string, senderId: string) {
  try {
    // 1. Update the live notification for the other phone to see
    const pingRef = doc(db, "notifications", "current");
    await setDoc(pingRef, {
      message: message || "🔔",
      sender: senderId,
      status: "pending",
      timestamp: Timestamp.now()
    });
    
    // 2. Add the entry to the history list
    await addDoc(collection(db, "history"), {
      message: message || "🔔",
      sender: senderId,
      status: "pending",
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error("Error sending ping:", error);
    throw new Error("Failed to send ping");
  }
}

/**
 * Cancels a pending ping by updating history and deleting the live doc.
 */
export async function cancelPingAction() {
  try {
    // 1. Find the most recent pending history item
    const q = query(
      collection(db, "history"), 
      where("status", "==", "pending"), 
      limit(1)
    );
    const snap = await getDocs(q);
    
    // 2. Flip it to CANCELED so it shows red in the UI
    if (!snap.empty) {
      const historyId = snap.docs[0].id;
      await updateDoc(doc(db, "history", historyId), {
        status: "CANCELED"
      });
    }

    // 3. Delete the live notification document
    await deleteDoc(doc(db, "notifications", "current"));
  } catch (error) {
    console.error("Error canceling ping:", error);
    throw new Error("Failed to cancel ping");
  }
}