const fs = require('fs');
const path = require('path');

let xml = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- Overall Widget Background Image (for dynamic opacity) -->
    <ImageView
        android:id="@+id/widget_background_image"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scaleType="fitXY"
        android:src="@drawable/widget_background" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:paddingStart="8dp"
        android:paddingEnd="8dp"
        android:paddingTop="8dp"
        android:paddingBottom="10dp">

        <!-- Header: Month Selector + Settings -->
        <RelativeLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:paddingBottom="6dp">

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_alignParentStart="true"
                android:layout_centerVertical="true"
                android:orientation="horizontal"
                android:gravity="center_vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="📅"
                    android:textSize="14sp"
                    android:layout_marginEnd="6dp" />

                <TextView
                    android:id="@+id/widget_title"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Journal"
                    android:textColor="#FFFFFF"
                    android:textSize="13sp"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/widget_month_text"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:text="Month 2026"
                    android:textColor="#4DFFFFFF"
                    android:textSize="12sp"
                    android:textStyle="bold" />
            </LinearLayout>

            <!-- Month switches & settings -->
            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_alignParentEnd="true"
                android:layout_centerVertical="true"
                android:orientation="horizontal"
                android:gravity="center_vertical">

                <!-- Prev Month -->
                <FrameLayout
                    android:id="@+id/btn_prev_month"
                    android:layout_width="28dp"
                    android:layout_height="28dp"
                    android:layout_marginEnd="4dp"
                    android:background="@drawable/widget_refresh_bg"
                    android:clickable="true"
                    android:focusable="true">
                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_gravity="center"
                        android:text="◀"
                        android:textColor="#B3FFFFFF"
                        android:textSize="10sp" />
                </FrameLayout>

                <!-- Next Month -->
                <FrameLayout
                    android:id="@+id/btn_next_month"
                    android:layout_width="28dp"
                    android:layout_height="28dp"
                    android:layout_marginEnd="4dp"
                    android:background="@drawable/widget_refresh_bg"
                    android:clickable="true"
                    android:focusable="true">
                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_gravity="center"
                        android:text="▶"
                        android:textColor="#B3FFFFFF"
                        android:textSize="10sp" />
                </FrameLayout>

                <!-- Settings Button -->
                <FrameLayout
                    android:id="@+id/widget_settings_btn"
                    android:layout_width="28dp"
                    android:layout_height="28dp"
                    android:background="@drawable/widget_refresh_bg"
                    android:clickable="true"
                    android:focusable="true">
                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_gravity="center"
                        android:text="⚙️"
                        android:textColor="#B3FFFFFF"
                        android:textSize="12sp" />
                </FrameLayout>
            </LinearLayout>
        </RelativeLayout>

        <!-- Weekdays Row -->
        <TableLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:stretchColumns="*">
            <TableRow android:layout_width="match_parent" android:layout_height="wrap_content">
`;

// Add weekday initials row
const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
for (const day of days) {
    xml += `                <TextView
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:gravity="center"
                    android:text="${day}"
                    android:textColor="#4DFFFFFF"
                    android:textSize="9sp"
                    android:textStyle="bold"
                    android:paddingTop="2dp"
                    android:paddingBottom="2dp" />\n`;
}

xml += `            </TableRow>
        </TableLayout>

        <!-- Calendar Cells Grid -->
        <TableLayout
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1"
            android:stretchColumns="*">
`;

// Generate 6 rows, each with 7 columns = 42 cells total (indexed 1 to 42)
for (let r = 0; r < 6; r++) {
    xml += `            <TableRow android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1">\n`;
    for (let c = 0; c < 7; c++) {
        const id = r * 7 + c + 1;
        xml += `                <LinearLayout
                    android:id="@+id/cell_${id}"
                    android:layout_width="0dp"
                    android:layout_height="match_parent"
                    android:layout_weight="1"
                    android:orientation="vertical"
                    android:gravity="center"
                    android:layout_margin="1dp"
                    android:background="@drawable/widget_refresh_bg"
                    android:padding="2dp">
                    
                    <TextView
                        android:id="@+id/day_text_${id}"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:textColor="#B3FFFFFF"
                        android:textSize="9sp"
                        android:textStyle="bold"
                        android:text="" />
                        
                    <TextView
                        android:id="@+id/day_emoji_${id}"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:textSize="11sp"
                        android:text="" />
                </LinearLayout>\n`;
    }
    xml += `            </TableRow>\n`;
}

xml += `        </TableLayout>
    </LinearLayout>
</FrameLayout>
`;

fs.writeFileSync(path.join(__dirname, '..', '..', 'Matrix_app_resilient', 'web-app', 'android', 'app', 'src', 'main', 'res', 'layout', 'widget_journal_calendar.xml'), xml);
console.log("widget_journal_calendar.xml generated successfully!");
