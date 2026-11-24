package com.luxresilient.app.widget

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import java.util.Calendar

/**
 * Invisible trampoline for taps on the Routine widget list. Starting an activity straight from a
 * widget click is always allowed (a broadcast receiver is not), so the tap lands here, does its work
 * and finishes immediately: either it edits the item in the background or it opens the app.
 */
class RoutineActionActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            handle(intent)
        } catch (e: Exception) {
            Log.e("RoutineActionActivity", "tap failed: ${e.message}", e)
        }
        finish()
        overridePendingTransition(0, 0)
    }

    private fun handle(i: Intent?) {
        i ?: return
        val action = i.getStringExtra(RoutineTap.EXTRA_ACTION) ?: return
        val habitId = i.getStringExtra(RoutineTap.EXTRA_HABIT_ID)
        val subtaskId = i.getStringExtra(RoutineTap.EXTRA_SUBTASK_ID)
        val taskId = i.getStringExtra(RoutineTap.EXTRA_TASK_ID)
        val projectId = i.getStringExtra(RoutineTap.EXTRA_PROJECT_ID)
        val amount = i.getIntExtra(RoutineTap.EXTRA_AMOUNT, 1)
        val willBeDone = i.getBooleanExtra(RoutineTap.EXTRA_WILL_BE_DONE, true)

        when (action) {
            RoutineTap.TOGGLE_HABIT -> if (habitId != null) { feedback(willBeDone); RoutineActions.toggleHabit(this, habitId) }
            RoutineTap.TOGGLE_SUBTASK -> if (habitId != null && subtaskId != null) { feedback(willBeDone); RoutineActions.toggleSubtask(this, habitId, subtaskId) }
            RoutineTap.ADD_QUANTITY -> if (habitId != null) { feedback(false); RoutineActions.addQuantity(this, habitId, amount) }
            RoutineTap.COMPLETE_TASK -> if (taskId != null) { feedback(true); RoutineActions.completeTask(this, taskId) }
            RoutineTap.OPEN_PROJECT -> openApp(if (projectId != null) "luxapp://focus-session?projectId=${Uri.encode(projectId)}" else "luxapp://routine")
            RoutineTap.OPEN_JOURNAL -> openApp("luxapp://journal?date=${RoutineEngine.dayKey(Calendar.getInstance())}")
            else -> openApp("luxapp://routine")
        }
    }

    /** Same pleasant tick / chime as the other widgets (respects the shared sound setting). */
    private fun feedback(completes: Boolean) {
        val prefs = getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        if (!prefs.getBoolean("sound_effects", true)) return
        if (completes) WidgetSoundPlayer.playCompleteSound() else WidgetSoundPlayer.playTickSound()
    }

    private fun openApp(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        startActivity(intent)
    }
}
