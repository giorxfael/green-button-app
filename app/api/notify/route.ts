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
const messaging = admin.messaging();

export async function POST() {
  try {
    // 1. Get the receiver token
    const tokenDoc = await db.collection("tokens").doc("receiver").get();
    const token = tokenDoc.data()?.token;

    // 2. Create History Log
    const historyRef = db.collection("history").doc();
    const pingData = { status: "pending", timestamp: admin.firestore.FieldValue.serverTimestamp() };
    await historyRef.set(pingData);

    // 3. Update Current Notification (Only ONCE)
    await db.collection("notifications").doc("current").set({
      ...pingData,
      historyId: historyRef.id
    });

    // 4. Send ONE Push Notification
    if (token) {
      await messaging.send({
        token: token,
        notification: { title: "GB APP", body: "New Ping! Check the app." },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}