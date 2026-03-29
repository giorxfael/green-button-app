import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export async function POST(request: Request) {
  try {
    const { message, senderId } = await request.json();
    const notificationRef = db.collection("notifications").doc("current");

    // TRANSACTION: Prevents "Double Push"
    await db.runTransaction(async (t) => {
      const doc = await t.get(notificationRef);
      const data = doc.data();

      // If there is a pending ping, don't allow a new one
      if (data?.status === "pending") {
        throw new Error("ALREADY_PENDING");
      }

      const historyRef = db.collection("history").doc();
      const pingData = { 
        status: "pending", 
        message: message || "🔔", 
        sender: senderId, // Track who sent it
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
      };

      t.set(historyRef, pingData);
      t.set(notificationRef, { ...pingData, historyId: historyRef.id });
    });

    // Send Push Notification to the OTHER person
    const targetId = senderId === 'iPhone1' ? 'iPhone2' : 'iPhone1';
    const tokenDoc = await db.collection("tokens").doc(targetId).get();
    const token = tokenDoc.data()?.token;

    if (token) {
      await admin.messaging().send({
        token: token,
        notification: { title: "BGB", body: "Ping Received" },
        apns: { payload: { aps: { sound: "default" } } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "ALREADY_PENDING") {
      return NextResponse.json({ error: "Conflict" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}