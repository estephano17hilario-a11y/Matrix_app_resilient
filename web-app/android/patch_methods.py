import sys

file_path = 'C:/Users/estep/Matrix_app_resilient/web-app/android/app/src/main/java/com/luxresilient/app/widget/SupabaseWidgetClient.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if methods already exist
if 'fun fetchTasks()' in content:
    print('Methods already exist')
    sys.exit(0)

# Add methods before "private fun filterTodayHabits"
target_str = "    private fun filterTodayHabits"
insert_idx = content.find(target_str)

methods = """
    /**
     * Fetch tasks (quests)
     */
    fun fetchTasks(): List<TaskData> {
        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.quests&deleted=eq.false&select=data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val tasks = mutableListOf<TaskData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val task = gson.fromJson(data, TaskData::class.java)
                        if (task.completed != true) {
                            tasks.add(task)
                        }
                    } catch (e: Exception) {}
                }
            }
            tasks
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun completeTask(taskId: String): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val tasks = fetchTasks()
            val task = tasks.find { it.id == taskId } ?: return false

            val updatedTask = task.copy(completed = true)
            val recordId = "${userId}_quests_${taskId}"
            val encodedId = URLEncoder.encode(recordId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
            
            val payload = mapOf(
                "data" to updatedTask,
                "deleted" to false
            )
            val jsonBody = gson.toJson(payload)

            var success = makePatchRequest(url, jsonBody, accessToken)
            if (!success) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    success = makePatchRequest(url, jsonBody, newAccessToken)
                }
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    fun fetchBadHabits(): List<BadHabitData> {
        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.badHabits&deleted=eq.false&select=data"

            var response = makeGetRequest(url, accessToken)
            
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val habits = mutableListOf<BadHabitData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val habit = gson.fromJson(data, BadHabitData::class.java)
                        habits.add(habit)
                    } catch (e: Exception) {}
                }
            }
            habits
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun incrementBadHabitQuantity(habit: BadHabitData, amount: Int): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val currentVal = habit.dynamicBalance ?: 0
            val newVal = currentVal + amount
            val updatedHabit = habit.copy(
                dynamicBalance = newVal
            )
            
            val recordId = "${userId}_badHabits_${habit.id}"
            val encodedId = URLEncoder.encode(recordId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
            
            val payload = mapOf("data" to updatedHabit, "deleted" to false)
            val jsonBody = gson.toJson(payload)

            var success = makePatchRequest(url, jsonBody, accessToken)
            if (!success) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    success = makePatchRequest(url, jsonBody, newAccessToken)
                }
            }
            success
        } catch (e: Exception) {
            false
        }
    }

"""

content = content[:insert_idx] + methods + content[insert_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Methods restored successfully!')
