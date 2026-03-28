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
    const receiverDoc = await db.collection('tokens').doc('receiver').get();
    if (!receiverDoc.exists) return NextResponse.json({ error: 'No receiver' }, { status: 404 });
    const token = receiverDoc.data()?.token;

    // 1. Create a PERMANENT history record
    const historyRef = db.collection('history').doc();
    const historyId = historyRef.id;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await historyRef.set({
      type: 'ping',
      status: 'pending',
      timestamp: now,
    });

    // 2. Update the "current" doc for the real-time UI
    await db.collection('notifications').doc('current').set({
      status: 'pending',
      timestamp: now,
      historyId: historyId // Save the reference
    });

    const message = {
      notification: { title: 'BIG GREEN BUTTON', body: 'Tap to answer!' },
      token: token,
    };

    await messaging.send(message);
    return NextResponse.json({ success: true, historyId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
