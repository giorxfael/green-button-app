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

export async function POST(request: Request) {
  try {
    // 1. EXTRACT THE MESSAGE FROM THE POST BODY
    const body = await request.json();
    const customMessage = body.message || "New Ping! Check the app.";

    // 2. Get the receiver token
    const tokenDoc = await db.collection("tokens").doc("receiver").get();
    const token = tokenDoc.data()?.token;

    // 3. Create History Log with the specific message
    const historyRef = db.collection("history").doc();
    const pingData = { 
      status: "pending", 
      message: customMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    };
    await historyRef.set(pingData);

    // 4. Update Current Notification
    await db.collection("notifications").doc("current").set({
      ...pingData,
      historyId: historyRef.id
    });

    // 5. Send Push Notification with your Emojis/Text
    if (token) {
      await messaging.send({
        token: token,
        notification: { 
          title: "BGB", 
          body: customMessage // This makes the emojis show on the lock screen
        },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}