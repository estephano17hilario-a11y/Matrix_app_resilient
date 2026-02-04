const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * DAILY REMINDER CRON JOB
 * Runs every minute to check if any user needs to be notified.
 * Best practice: Run every 15 min or 1 hour and batch, but for "exact time", we check often.
 * 
 * Schedule: "* * * * *" (Every minute)
 */
exports.sendDailyNotifications = functions.pubsub.schedule('* * * * *').onRun(async (context) => {
    const now = new Date();
    // Format current time to HH:mm (e.g., "17:00")
    // Note: Cloud Functions run in UTC usually. You must handle timezones.
    // Ideally, store user timezone or convert user preferred time to UTC.
    // For simplicity, we assume UTC here or rely on offset logic.
    
    // We will iterate through users who have notifications enabled.
    // OPTIMIZATION: In production, query a specific collection 'jobs' or 'reminders'
    // instead of scanning all users.
    
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    const usersSnapshot = await db.collection('users').get();
    
    const notificationsToSend = [];
    
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const settings = userData.settings?.notifications; // Assuming structure
        
        // 1. Check if enabled
        if (!settings || !settings.enabled || !settings.dailyReminder || !settings.fcmToken) return;
        
        // 2. Check Day of Week
        const currentDay = now.getDay(); // 0 = Sun, 1 = Mon
        if (!settings.reminderDays.includes(currentDay)) return;
        
        // 3. Check Time
        // This is tricky without Timezone. We assume the server time matches or we ignore TZ for MVP.
        // A better way: User sends "17:00" and "timezone: America/New_York".
        // We convert now to that timezone and compare.
        
        const userTime = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: settings.timeZone || 'UTC' 
        });
        
        if (userTime === settings.reminderTime) {
            notificationsToSend.push({
                token: settings.fcmToken,
                notification: {
                    title: "Matrix Protocol",
                    body: "It is time to synchronize your daily progress.",
                },
                data: {
                    type: "DAILY_REMINDER",
                    click_action: "FLUTTER_NOTIFICATION_CLICK" // or URL
                }
            });
        }
    });
    
    // 4. Send Batch
    if (notificationsToSend.length > 0) {
        // FCM sendAll is deprecated, use sendEach
        const promises = notificationsToSend.map(msg => messaging.send(msg));
        const results = await Promise.allSettled(promises);
        console.log(`Sent ${results.length} notifications.`);
    }
    
    return null;
});
