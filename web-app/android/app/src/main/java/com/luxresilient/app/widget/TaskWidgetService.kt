package com.luxresilient.app.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.luxresilient.app.R
import java.text.SimpleDateFormat
import java.util.*

class TaskWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        return TaskWidgetFactory(this.applicationContext, widgetId)
    }
}

class TaskWidgetFactory(private val context: Context, private val widgetId: Int) : RemoteViewsService.RemoteViewsFactory {

    private val client = SupabaseWidgetClient(context)
    private var tasks = listOf<TaskData>()
    private var attributes = mapOf<String, AttributeData>()
    private val TAG = "TaskWidgetFactory"

    override fun onCreate() {
        Log.d(TAG, "Factory created for widget $widgetId")
    }

    override fun onDataSetChanged() {
        Log.d(TAG, "Data set changed - refreshing tasks for widget $widgetId")
        
        val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val timeframe = configPrefs.getString("task_timeframe_widget_$widgetId", "ALL") ?: "ALL"
        val hideCompleted = configPrefs.getBoolean("task_hide_completed_widget_$widgetId", true)

        // Fetch including completed if we want to show completed, otherwise only incomplete
        val fetchedTasks = client.fetchTasks(includeCompleted = !hideCompleted)
        attributes = client.fetchAttributes()

        // Filter and Sort Tasks
        tasks = fetchedTasks.filter { task ->
            // 1. Completion filter
            if (hideCompleted && task.completed) return@filter false
            
            // 2. Timeframe filter
            if (timeframe != "ALL") {
                if (task.deadline.isNullOrEmpty()) {
                    timeframe == "DAY" // Treat no deadline as today
                } else {
                    isTaskInTimeframe(task.deadline, timeframe)
                }
            } else {
                true
            }
        }.sortedWith(compareBy<TaskData> { it.completed }
            .thenByDescending { !it.completed && !it.deadline.isNullOrEmpty() && it.deadline!! < SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }
            .thenBy { it.deadline ?: "9999-12-31" }
            .thenBy {
                when (it.difficulty) {
                    "S" -> 1
                    "A" -> 2
                    "B" -> 3
                    "C" -> 4
                    else -> 5
                }
            }
        )
        Log.d(TAG, "Loaded ${tasks.size} tasks for widget $widgetId (timeframe: $timeframe, hideCompleted: $hideCompleted)")
    }

    private fun isTaskInTimeframe(deadlineStr: String?, timeframe: String): Boolean {
        if (deadlineStr.isNullOrEmpty()) return false
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val deadlineDate = sdf.parse(deadlineStr) ?: return false
            
            val calDeadline = Calendar.getInstance().apply { time = deadlineDate }
            val calToday = Calendar.getInstance()
            
            fun zeroTime(c: Calendar) {
                c.set(Calendar.HOUR_OF_DAY, 0)
                c.set(Calendar.MINUTE, 0)
                c.set(Calendar.SECOND, 0)
                c.set(Calendar.MILLISECOND, 0)
            }
            zeroTime(calToday)
            zeroTime(calDeadline)
            
            when (timeframe) {
                "DAY" -> calDeadline.timeInMillis == calToday.timeInMillis
                "WEEK" -> {
                    val calStart = Calendar.getInstance().apply {
                        time = calToday.time
                        set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
                        zeroTime(this)
                    }
                    val calEnd = Calendar.getInstance().apply {
                        time = calStart.time
                        add(Calendar.DAY_OF_YEAR, 6)
                        set(Calendar.HOUR_OF_DAY, 23)
                        set(Calendar.MINUTE, 59)
                    }
                    calDeadline.timeInMillis >= calStart.timeInMillis && calDeadline.timeInMillis <= calEnd.timeInMillis
                }
                "MONTH" -> {
                    calDeadline.get(Calendar.YEAR) == calToday.get(Calendar.YEAR) &&
                    calDeadline.get(Calendar.MONTH) == calToday.get(Calendar.MONTH)
                }
                "8_WEEKS" -> {
                    val calEnd = Calendar.getInstance().apply {
                        time = calToday.time
                        add(Calendar.WEEK_OF_YEAR, 8)
                    }
                    calDeadline.timeInMillis >= calToday.timeInMillis && calDeadline.timeInMillis <= calEnd.timeInMillis
                }
                "3_MONTHS" -> {
                    val calEnd = Calendar.getInstance().apply {
                        time = calToday.time
                        add(Calendar.MONTH, 3)
                    }
                    calDeadline.timeInMillis >= calToday.timeInMillis && calDeadline.timeInMillis <= calEnd.timeInMillis
                }
                "YEAR" -> {
                    calDeadline.get(Calendar.YEAR) == calToday.get(Calendar.YEAR)
                }
                else -> true
            }
        } catch (e: Exception) {
            false
        }
    }

    override fun onDestroy() {
        tasks = emptyList()
        attributes = emptyMap()
    }

    override fun getCount(): Int {
        return tasks.size
    }

    override fun getViewAt(position: Int): RemoteViews {
        if (position >= tasks.size) {
            return RemoteViews(context.packageName, R.layout.widget_task_item)
        }
        val task = tasks[position]
        val views = RemoteViews(context.packageName, R.layout.widget_task_item)
        
        val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val opacity = configPrefs.getInt("card_opacity", 90)
        val cardSize = configPrefs.getString("card_size", "medium") ?: "medium"
        val cardSpacing = configPrefs.getString("card_spacing", "medio") ?: "medio"
        val gradientStyle = configPrefs.getString("gradient_style", "radial") ?: "radial"
        val borderStyle = configPrefs.getString("border_style", "both") ?: "both"

        // 1. Spacing (Bottom Margin Simulation via Root Wrapper padding)
        val density = context.resources.displayMetrics.density
        val spacingPx = when (cardSpacing) {
            "poco" -> 0
            "grande" -> (12 * density).toInt()
            else -> (6 * density).toInt()
        }
        views.setViewPadding(R.id.task_item_root_wrapper, 0, 0, 0, spacingPx)

        // 2. Card Size Padding inside Card
        val verticalPadding = when (cardSize) {
            "super_thin" -> (3 * density).toInt()
            "thin" -> (5 * density).toInt()
            "large" -> (16 * density).toInt()
            else -> (10 * density).toInt()
        }
        views.setViewPadding(R.id.task_content_container, (12 * density).toInt(), verticalPadding, (12 * density).toInt(), verticalPadding)

        // 3. Card Opacity via Background ImageView
        val alphaInt = (opacity * 2.55).toInt().coerceIn(0, 255)
        views.setInt(R.id.task_card_background, "setImageAlpha", alphaInt)

        // 4. Attribute Color parsing
        val attributeData = if (task.attribute != null) attributes[task.attribute] else null
        val baseColor = attributeData?.color ?: "#6366f1"
        val parsedColor = try { Color.parseColor(baseColor) } catch (e: Exception) { Color.parseColor("#6366f1") }

        // 5. Glow / Gradient Background
        val hasGlow = (gradientStyle != "none") || (borderStyle == "card" || borderStyle == "both")
        if (hasGlow) {
            views.setViewVisibility(R.id.task_glow_background, View.VISIBLE)
            val widthPx = (320 * density).toInt()
            val heightPx = when (cardSize) {
                "super_thin" -> (36 * density).toInt()
                "thin" -> (46 * density).toInt()
                "large" -> (84 * density).toInt()
                else -> (64 * density).toInt()
            }
            val glowBitmap = createGlowBackground(widthPx, heightPx, parsedColor, opacity, gradientStyle, borderStyle)
            views.setImageViewBitmap(R.id.task_glow_background, glowBitmap)
        } else {
            views.setViewVisibility(R.id.task_glow_background, View.GONE)
        }

        // 6. Title text size and completed state
        views.setTextViewText(R.id.task_title, task.title)
        if (cardSize == "super_thin") {
            views.setFloat(R.id.task_title, "setTextSize", 11.5f)
        } else if (cardSize == "thin") {
            views.setFloat(R.id.task_title, "setTextSize", 13f)
        } else {
            views.setFloat(R.id.task_title, "setTextSize", 15f)
        }

        if (task.completed) {
            views.setTextColor(R.id.task_title, Color.parseColor("#99FFFFFF"))
            views.setViewVisibility(R.id.task_type_icon, View.GONE)
            views.setViewVisibility(R.id.task_check_icon, View.GONE)
        } else {
            views.setTextColor(R.id.task_title, Color.WHITE)
            views.setViewVisibility(R.id.task_type_icon, View.VISIBLE)
            views.setViewVisibility(R.id.task_check_icon, View.GONE)
        }

        // 7. Check Circle Button
        val borderCircleEnabled = (borderStyle == "circle" || borderStyle == "both")
        val circleBitmap = createCircleButton(context, parsedColor, task.completed, borderCircleEnabled)
        views.setImageViewBitmap(R.id.task_check_circle, circleBitmap)

        // 8. Emoji Icon
        val emoji = TraitIcons.getEmoji(task.attribute)
        views.setTextViewText(R.id.task_type_icon, emoji)

        // 9. Difficulty Badge
        views.setTextViewText(R.id.task_difficulty, task.difficulty)
        val diffColor = when (task.difficulty) {
            "S" -> "#d8b4fe"
            "A" -> "#fda4af"
            "B" -> "#fdba74"
            "C" -> "#67e8f9"
            else -> "#cbd5e1"
        }
        views.setTextColor(R.id.task_difficulty, Color.parseColor(diffColor))

        // 10. Rewards (XP / Gold)
        val xp = task.xpReward.toInt()
        if (xp > 0 && cardSize != "super_thin") {
            views.setViewVisibility(R.id.task_xp, View.VISIBLE)
            views.setTextViewText(R.id.task_xp, "+$xp XP")
        } else {
            views.setViewVisibility(R.id.task_xp, View.GONE)
        }

        val gold = task.gold ?: 0
        if (gold > 0 && cardSize != "super_thin") {
            views.setViewVisibility(R.id.task_gold, View.VISIBLE)
            views.setTextViewText(R.id.task_gold, "+$gold Oro")
        } else {
            views.setViewVisibility(R.id.task_gold, View.GONE)
        }

        // 11. Deadline Display
        if (!task.deadline.isNullOrEmpty() && cardSize != "super_thin" && cardSize != "thin") {
            views.setViewVisibility(R.id.task_deadline, View.VISIBLE)
            views.setTextViewText(R.id.task_deadline, task.deadline)
        } else {
            views.setViewVisibility(R.id.task_deadline, View.GONE)
        }

        // 12. Fill Intent for click actions
        val fillIntent = Intent().apply {
            action = TaskWidgetProvider.ACTION_COMPLETE_TASK
            putExtra(TaskWidgetProvider.EXTRA_TASK_ID, task.id)
        }
        views.setOnClickFillInIntent(R.id.task_complete_btn, fillIntent)

        return views
    }

    private fun createGlowBackground(
        width: Int,
        height: Int,
        color: Int,
        opacity: Int,
        gradientStyle: String,
        borderStyle: String
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val alphaInt = (opacity * 2.55).toInt().coerceIn(0, 255)
        val bgPaint = Paint().apply {
            this.color = Color.parseColor("#050505")
            this.alpha = alphaInt
            this.isAntiAlias = true
        }
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRoundRect(rect, 24f, 24f, bgPaint)
        
        if (gradientStyle == "radial") {
            val glowPaint = Paint().apply {
                this.isAntiAlias = true
                val colors = intArrayOf(
                    Color.argb((alphaInt * 0.25).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.argb((alphaInt * 0.08).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.TRANSPARENT
                )
                val stops = floatArrayOf(0f, 0.4f, 1f)
                this.shader = RadialGradient(
                    width * 0.15f, height * 0.5f,
                    height * 0.9f,
                    colors, stops,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRoundRect(rect, 24f, 24f, glowPaint)
        } else if (gradientStyle == "vertical") {
            val glowPaint = Paint().apply {
                this.isAntiAlias = true
                val colors = intArrayOf(
                    Color.argb((alphaInt * 0.25).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.TRANSPARENT
                )
                this.shader = LinearGradient(
                    0f, height.toFloat(),
                    0f, 0f,
                    colors, null,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRoundRect(rect, 24f, 24f, glowPaint)
        } else if (gradientStyle == "center_radial") {
            val glowPaint = Paint().apply {
                this.isAntiAlias = true
                val colors = intArrayOf(
                    Color.argb((alphaInt * 0.35).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.argb((alphaInt * 0.10).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.TRANSPARENT
                )
                val stops = floatArrayOf(0f, 0.5f, 1f)
                this.shader = RadialGradient(
                    width * 0.5f, height * 0.5f,
                    maxOf(width, height) * 0.7f,
                    colors, stops,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRoundRect(rect, 24f, 24f, glowPaint)
        }

        val drawBorder = (borderStyle == "card" || borderStyle == "both")
        if (drawBorder) {
            val borderPaint = Paint().apply {
                this.isAntiAlias = true
                this.style = Paint.Style.STROKE
                this.strokeWidth = 2.5f
                this.color = Color.argb((alphaInt * 0.35).toInt(), Color.red(color), Color.green(color), Color.blue(color))
            }
            canvas.drawRoundRect(rect, 24f, 24f, borderPaint)
        }

        return bitmap
    }

    private fun createCircleButton(
        context: Context,
        color: Int,
        completed: Boolean,
        borderCircleEnabled: Boolean
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val sizePx = (40 * density).toInt()
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val paint = Paint().apply {
            this.isAntiAlias = true
        }

        val center = sizePx / 2f
        val radius = sizePx / 2f - (2 * density)

        if (completed) {
            paint.style = Paint.Style.FILL
            paint.color = color
            canvas.drawCircle(center, center, radius, paint)

            if (borderCircleEnabled) {
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 2 * density
                val hsl = FloatArray(3)
                androidx.core.graphics.ColorUtils.colorToHSL(color, hsl)
                hsl[2] = (hsl[2] + 0.20f).coerceIn(0f, 1f)
                paint.color = androidx.core.graphics.ColorUtils.HSLToColor(hsl)
                canvas.drawCircle(center, center, radius, paint)
            }

            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 2.5f * density
            paint.color = Color.BLACK
            paint.strokeCap = Paint.Cap.ROUND
            
            val startX = center - (5 * density)
            val startY = center
            val midX = center - (1.5f * density)
            val midY = center + (3.5f * density)
            val endX = center + (5 * density)
            val endY = center - (3.5f * density)

            canvas.drawLine(startX, startY, midX, midY, paint)
            canvas.drawLine(midX, midY, endX, endY, paint)
        } else {
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#1AFFFFFF")
            canvas.drawCircle(center, center, radius, paint)

            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 1.5f * density
            paint.color = if (borderCircleEnabled) color else Color.parseColor("#1AFFFFFF")
            canvas.drawCircle(center, center, radius, paint)
        }

        return bitmap
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 10
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
