import sys

file_path = 'C:/Users/estep/Matrix_app_resilient/web-app/android/app/src/main/java/com/luxresilient/app/widget/SupabaseWidgetClient.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('private fun getCredentials(): Pair<String?, String?> {')
end_idx = content.find('    private fun makeGetRequest(urlStr: String, accessToken: String): String? {')

if start_idx == -1 or end_idx == -1:
    print('Failed to find bounds')
    sys.exit(1)

new_func = """    private fun getCredentials(): Pair<String?, String?> {
        // Try CapacitorStorage first (Single Source of Truth)
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val sbSession = capPrefs.getString("sb-aysntbpxjejxumpqvlbz-auth-token", null)
            if (!sbSession.isNullOrEmpty()) {
                val jsonObj = JsonParser.parseString(sbSession).asJsonObject
                val capAccessToken = jsonObj.get("access_token")?.asString
                val capUserId = jsonObj.getAsJsonObject("user")?.get("id")?.asString
                if (!capAccessToken.isNullOrEmpty() && !capUserId.isNullOrEmpty()) {
                    // Sync it back to lux_widget_auth for fallback
                    val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("user_id", capUserId)
                        .putString("access_token", capAccessToken)
                        .putString("refresh_token", jsonObj.get("refresh_token")?.asString ?: "")
                        .apply()
                    return Pair(capUserId, capAccessToken)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading from CapacitorStorage", e)
        }

        // Fallback to lux_widget_auth
        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null)
        val accessToken = prefs.getString("access_token", null)
        return Pair(userId, accessToken)
    }

"""

content = content[:start_idx] + new_func + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
