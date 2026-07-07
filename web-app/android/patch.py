import sys
import re

file_path = 'C:/Users/estep/Matrix_app_resilient/web-app/android/app/src/main/java/com/luxresilient/app/widget/HabitWidgetService.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

sig_old = '''configPrefs: android.content.SharedPreferences
    ): RemoteViews {'''
sig_new = '''configPrefs: android.content.SharedPreferences,
        viewsIn: RemoteViews? = null,
        prefix: String = ""
    ): RemoteViews {'''
content = content.replace(sig_old, sig_new)

view_init_old = 'val views = RemoteViews(context.packageName, layoutId)'
view_init_new = 'val views = viewsIn ?: RemoteViews(context.packageName, layoutId)'
content = content.replace(view_init_old, view_init_new)

color_old = 'val parsedColor = item.color'
color_new = '''val parsedColor = item.color

        // Helper to get prefixed ID
        fun getId(name: String): Int {
            return if (prefix.isEmpty()) {
                context.resources.getIdentifier(name, "id", context.packageName)
            } else {
                context.resources.getIdentifier(prefix + name, "id", context.packageName)
            }
        }'''
content = content.replace(color_old, color_new)

start_idx = content.find('private fun buildSingleHabitView')
end_idx = content.find('private fun createGlowBackground')

body = content[start_idx:end_idx]

def replace_id(match):
    name = match.group(1)
    item_ids = [
        'habit_item_root_wrapper', 'habit_card_background', 'habit_glow_background',
        'habit_type_icon', 'habit_title', 'habit_streak', 'habit_complete_btn', 'habit_check_circle',
        'habit_check_icon', 'habit_subtasks_container', 'habit_quantity_container',
        'habit_quantity_minus', 'habit_quantity_text', 'habit_quantity_plus', 'habit_quantity_value',
        'habit_quantity_label'
    ]
    if name in item_ids or name.startswith('subtask_'):
        return f'getId("{name}")'
    return match.group(0)

body = re.sub(r'R\.id\.([a-zA-Z0-9_]+)', replace_id, body)

content = content[:start_idx] + body + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Modified successfully!')
