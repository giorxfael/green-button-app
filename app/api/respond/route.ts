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

// app/api/respond/route.ts

export async function POST(request: Request) {
  try {
    const { answer, textResponse } = await request.json();
    const notificationRef = db.collection("notifications").doc("current");
    const snap = await notificationRef.get();
    const data = snap.data();

    if (data?.historyId) {
      const updateData = {
        status: textResponse ? "replied" : answer,
        // CRITICAL: Save the text response to a NEW field called replyText
        // Do NOT update the 'message' field here
        replyText: textResponse || null, 
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("history").doc(data.historyId).update(updateData);
      await notificationRef.update(updateData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}