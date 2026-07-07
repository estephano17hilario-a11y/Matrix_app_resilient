import sys

file_path = 'C:/Users/estep/Matrix_app_resilient/web-app/android/app/src/main/java/com/luxresilient/app/widget/SupabaseWidgetClient.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('    private fun getCredentials(): Pair<String?, String?> {')
if start_idx == -1:
    print('Failed to find getCredentials')
    sys.exit(1)

end_idx = content.find('    fun fetchHabits(): List<HabitData> {', start_idx)
if end_idx == -1:
    print('Failed to find fetchHabits')
    sys.exit(1)

new_func = """    private fun getCredentials(): Pair<String?, String?> {
        // ALWAYS check CapacitorStorage first as it is the Single Source of Truth
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val sessionJson = capPrefs.getString("sb-aysntbpxjejxumpqvlbz-auth-token", null)
            if (!sessionJson.isNullOrEmpty()) {
                val root = JsonParser.parseString(sessionJson).asJsonObject
                val access = root.get("access_token")?.asString
                val refresh = root.get("refresh_token")?.asString
                val userObj = root.getAsJsonObject("user")
                val uid = userObj?.get("id")?.asString

                if (!access.isNullOrEmpty() && !uid.isNullOrEmpty()) {
                    // Sync it back to lux_widget_auth for fallback
                    val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("user_id", uid)
                        .putString("access_token", access)
                        .putString("refresh_token", refresh ?: "")
                        .putLong("last_sync", System.currentTimeMillis())
                        .apply()
                    
                    Log.d(TAG, "getCredentials: Using fresh session from CapacitorStorage for user $uid")
                    return Pair(uid, access)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "getCredentials: Error reading from CapacitorStorage: ${e.message}", e)
        }

        // Fallback to lux_widget_auth only if CapacitorStorage is empty/invalid
        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null)
        val accessToken = prefs.getString("access_token", null)
        Log.d(TAG, "getCredentials: Falling back to cached lux_widget_auth. userId=$userId, hasToken=${!accessToken.isNullOrEmpty()}")
        return Pair(userId, accessToken)
    }

    /**
"""

content = content[:start_idx] + new_func + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched getCredentials successfully!')
