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
    const { message } = await request.json(); // Accept any text/emoji
    const tokenDoc = await db.collection("tokens").doc("receiver").get();
    const token = tokenDoc.data()?.token;

    const historyRef = db.collection("history").doc();
    const pingData = { 
      status: "pending", 
      message: message || "Ping!", 
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    };
    
    await historyRef.set(pingData);
    await db.collection("notifications").doc("current").set({
      ...pingData,
      historyId: historyRef.id
    });

    if (token) {
      await messaging.send({
        token: token,
        notification: { 
          title: "New Message!", 
          body: message || "Check the app!" 
        },
        apns: { payload: { aps: { sound: "default" } } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}