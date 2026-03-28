// ... (keep the imports and admin.initializeApp part same as before)

export async function POST(request: Request) {
  try {
    const { answer } = await request.json();
    const currentRef = db.collection("notifications").doc("current");
    const currentSnap = await currentRef.get();
    const historyId = currentSnap.data()?.historyId;

    const updateData = { status: answer, respondedAt: admin.firestore.FieldValue.serverTimestamp() };
    await currentRef.update(updateData);
    if (historyId) await db.collection("history").doc(historyId).update(updateData);

    const senderTokenDoc = await db.collection("tokens").doc("sender").get();
    const senderToken = senderTokenDoc.data()?.token;

    if (senderToken) {
      // CUSTOM PHRASES FOR NOTIFICATION
      const messageBody = answer === 'yes' ? "Yes I'm all yours!" : "HELL NO";
      
      await messaging.send({
        token: senderToken,
        notification: {
          title: "Response Received!",
          body: messageBody,
        },
        apns: { payload: { aps: { sound: "default" } } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}