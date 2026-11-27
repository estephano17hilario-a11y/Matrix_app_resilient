package com.luxresilient.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires a scheduled coach message, and re-arms the pending ones after a reboot or an app update. */
public class CoachNotifyReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (CoachNotifier.ACTION_FIRE.equals(action)) {
            int id = intent.getIntExtra(CoachNotifier.EXTRA_ID, 0);
            CoachNotifier.post(context, id, intent.getStringExtra(CoachNotifier.EXTRA_NAME), intent.getStringExtra(CoachNotifier.EXTRA_BODY));
            CoachNotifier.remove(context, id);
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            CoachNotifier.rearmAll(context);
        }
    }
}
