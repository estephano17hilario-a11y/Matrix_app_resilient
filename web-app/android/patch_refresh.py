import sys

file_path = 'C:/Users/estep/Matrix_app_resilient/web-app/android/app/src/main/java/com/luxresilient/app/widget/SupabaseWidgetClient.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('    @Synchronized\n    private fun refreshAccessToken(): String? {')
if start_idx == -1:
    print('Failed to find refreshAccessToken')
    sys.exit(1)

end_idx = content.find('    fun isAuthenticated(): Boolean {', start_idx)
if end_idx == -1:
    print('Failed to find end of refreshAccessToken')
    sys.exit(1)

new_func = """    @Synchronized
    private fun refreshAccessToken(): String? {
        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        var refreshToken = prefs.getString("refresh_token", null)

        // Try to get the latest refresh token from CapacitorStorage
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val sbSession = capPrefs.getString("sb-aysntbpxjejxumpqvlbz-auth-token", null)
            if (!sbSession.isNullOrEmpty()) {
                val jsonObj = JsonParser.parseString(sbSession).asJsonObject
                val capRefreshToken = jsonObj.get("refresh_token")?.asString
                if (!capRefreshToken.isNullOrEmpty()) {
                    refreshToken = capRefreshToken
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading refresh_token from CapacitorStorage", e)
        }

        if (refreshToken.isNullOrEmpty()) {
            Log.w(TAG, "No refresh token available to refresh session")
            return null
        }

        Log.d(TAG, "Refreshing access token...")
        var connection: HttpURLConnection? = null
        return try {
            val url = URL("$SUPABASE_URL/auth/v1/token?grant_type=refresh_token")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val payload = mapOf("refresh_token" to refreshToken)
            val writer = OutputStreamWriter(connection.outputStream)
            writer.write(gson.toJson(payload))
            writer.flush()
            writer.close()

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()

                val responseObj = JsonParser.parseString(response).asJsonObject
                val newAccessToken = responseObj.get("access_token")?.asString
                val newRefreshToken = responseObj.get("refresh_token")?.asString
                val userObj = responseObj.getAsJsonObject("user")
                val userId = userObj?.get("id")?.asString

                if (!newAccessToken.isNullOrEmpty() && !userId.isNullOrEmpty()) {
                    // Save back to lux_widget_auth
                    prefs.edit()
                        .putString("user_id", userId)
                        .putString("access_token", newAccessToken)
                        .putString("refresh_token", newRefreshToken ?: refreshToken)
                        .putLong("last_sync", System.currentTimeMillis())
                        .apply()
                        
                    // ALSO save back to CapacitorStorage so the App doesn't get logged out!
                    try {
                        val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                        capPrefs.edit()
                            .putString("sb-aysntbpxjejxumpqvlbz-auth-token", response)
                            .apply()
                        Log.d(TAG, "Successfully synced refreshed token back to CapacitorStorage")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to sync refreshed token to CapacitorStorage", e)
                    }

                    Log.d(TAG, "Token refreshed successfully")
                    newAccessToken
                } else {
                    null
                }
            } else {
                Log.e(TAG, "Token refresh failed with code $responseCode")
                try {
                    val errReader = BufferedReader(InputStreamReader(connection.errorStream))
                    Log.e(TAG, "Token refresh error body: ${errReader.readText()}")
                    errReader.close()
                } catch (_: Exception) {}
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing token: ${e.message}", e)
            null
        } finally {
            connection?.disconnect()
        }
    }

    /**
"""

content = content[:start_idx] + new_func + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
