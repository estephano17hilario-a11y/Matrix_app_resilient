package com.luxresilient.app.widget

import com.google.gson.annotations.SerializedName

/**
 * Data models matching the TypeScript Habit interface from types/index.ts
 */

data class HabitCollection(
    val id: String,
    @SerializedName("collection_name") val collectionName: String,
    @SerializedName("user_id") val userId: String,
    val data: HabitData,
    val deleted: Boolean = false
)

data class HabitData(
    val id: String,
    val title: String,
    val description: String? = null,
    val streak: Int = 0,
    val completedToday: Boolean = false,
    val attribute: String = "",
    val subAttribute: String? = null,
    val totalCompletions: Int = 0,
    val frequency: String = "DAILY",
    val frequencyDays: List<Int>? = null,
    val type: String = "SIMPLE", // SIMPLE | QUANTITY | CHECKLIST | BOOLEAN
    val iconName: String? = null,
    val targetValue: Int? = null,
    val currentValue: Int? = null,
    val unit: String? = null,
    val isDivided: Boolean? = null,
    val dividedMode: String? = null,
    val dividedQuantity: Int? = null,
    val dividedInterval: Int? = null,
    val dividedTimes: List<DividedTime>? = null,
    val checklist: List<ChecklistItem>? = null,
    val reminderTime: String? = null,
    val history: List<String>? = null,
    val valueHistory: Map<String, Int>? = null,
    val customColor: String? = null,
    val archived: Boolean? = false,
    val createdAt: Long? = null,
    val monthlyType: String? = null,
    val monthlyFlexibleCount: Int? = null,
    val weeklyType: String? = null,
    val weeklyFlexibleCount: Int? = null,
    val order: Int? = null,
    val rewardedGold: Int? = null,
    val rewardedXp: Int? = null,
    val lastUpdatedDate: String? = null,
    val monthlyLastDay: Boolean? = false,
    val nextInstanceTime: String? = null
)

data class DividedTime(
    val id: String,
    val time: String,
    val amount: Int
)

data class ChecklistItem(
    val id: String,
    val text: String,
    val completed: Boolean = false,
    val color: String? = null,
    val days: List<Int>? = null,
    val reminderTime: String? = null,
    val history: List<String>? = null
)

data class AttributeData(
    val id: String,
    val label: String? = null,
    val color: String? = null,
    val iconName: String? = null,
    val level: Int = 1,
    val xp: Int = 0,
    val maxXp: Int = 100
)

/**
 * Maps trait IDs to their emoji icons for widget display
 * (since we can't use Lucide icons natively)
 */
object TraitIcons {
    private val TRAIT_EMOJI_MAP = mapOf(
        "DISCIPLINA" to "🎯",
        "FISICO" to "💪",
        "MENTAL" to "🧠",
        "SOCIAL" to "👥",
        "ESPIRITU" to "👻",
        "FINANZAS" to "💰",
        "CREATIVIDAD" to "🎨",
        "ORDEN" to "⚓",
        "LIDERAZGO" to "👑",
        "RESILIENCIA" to "🛡️",
        "VITALIDAD" to "⚡",
        "ESTILO" to "🪶"
    )

    private val TRAIT_COLOR_MAP = mapOf(
        "DISCIPLINA" to "#3b82f6",
        "FISICO" to "#ef4444",
        "MENTAL" to "#06b6d4",
        "SOCIAL" to "#ec4899",
        "ESPIRITU" to "#8b5cf6",
        "FINANZAS" to "#10b981",
        "CREATIVIDAD" to "#f59e0b",
        "ORDEN" to "#64748b",
        "LIDERAZGO" to "#6366f1",
        "RESILIENCIA" to "#f97316",
        "VITALIDAD" to "#84cc16",
        "ESTILO" to "#d946ef"
    )

    fun getEmoji(traitId: String?): String = TRAIT_EMOJI_MAP[traitId] ?: "⭐"
    fun getColor(traitId: String?): String = TRAIT_COLOR_MAP[traitId] ?: "#6366f1"
}

data class BadHabitData(
    val id: String,
    val title: String,
    val attribute: String,
    val subAttribute: String? = null,
    val streak: Int = 0,
    val intelligentStreak: Boolean? = false,
    val isDynamic: Boolean? = false,
    val dynamicTargetType: String? = null,
    val dynamicBalance: Int? = null,
    val currentTarget: Int? = null,
    val archived: Boolean? = false,
    val order: Int? = null
)

data class TaskData(
    val id: String,
    val title: String,
    val description: String? = null,
    val completed: Boolean = false,
    val difficulty: String = "C",
    val xpReward: Double = 0.0,
    val gold: Int? = 0,
    val attribute: String? = null,
    val subAttribute: String? = null,
    val isSmartQuest: Boolean? = false,
    val deadline: String? = null,
    val archived: Boolean? = false,
    val order: Int? = null,
    val projectId: String? = null
)

data class ProjectData(
    val id: String,
    val title: String,
    val description: String? = null,
    val attribute: String? = null,
    val color: String? = null,
    val iconName: String? = null,
    val goalTarget: Int = 0,
    val goalFrequency: String? = null,
    val uiFrequency: String? = null,
    val uiTarget: Double? = null,
    val uiUnit: String? = null,
    val monthlyType: String? = null,
    val monthlyFlexibleCount: Int? = null,
    val monthlyLastDay: Boolean? = null,
    val workingDays: List<Int>? = null,
    val pomoDuration: Int = 25,
    val breakDuration: Int = 5,
    val totalTime: Int = 0,
    val streak: Int = 0,
    val sessions: List<SessionData>? = null
)

data class SessionData(
    val id: String,
    val type: String? = null,
    val duration: Int = 0, // seconds
    val date: String? = null
)

data class DailyFeedEntryData(
    val id: String,
    val date: String,
    val tasksCompleted: Int = 0,
    val tasksTotal: Int = 0,
    val focusMinutes: Int = 0,
    val focusSessions: Int = 0,
    val habitsCompleted: Int = 0,
    val habitsTotal: Int = 0,
    val xpEarned: Int = 0,
    val goldEarned: Int = 0,
    val topProjects: List<TopProjectData>? = null
)

data class TopProjectData(
    val name: String,
    val minutes: Int,
    val color: String? = null
)

