# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

-keep class com.luxresilient.app.** { *; }
-keep class com.luxresilient.app.FocusPlugin { *; }
-keep class com.luxresilient.app.FocusService { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends android.app.Service

# Rules from com.revenuecat.purchases:purchases-store-amazon, minus its global -dontoptimize
# (that module's consumer rules are ignored in build.gradle via optimization.keepRules.ignoreFrom).
-dontwarn com.amazon.**
-keep class com.amazon.** { *; }
-keepattributes *Annotation*

# Capacitor reads @CapacitorPlugin / @Permission / @PluginMethod by reflection. With the optimising R8
# profile those annotations were stripped from the built-in plugins, so Bridge.getPermissionStates()
# got a null annotation and LocalNotifications.checkPermissions() threw a NullPointerException on the
# plugin thread, which killed the whole app (right after sign-up and on every launch with a session).
-keep class com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.annotation.CapacitorPlugin
-keep @interface com.getcapacitor.annotation.Permission
-keep @interface com.getcapacitor.annotation.PermissionCallback
-keep @interface com.getcapacitor.annotation.ActivityCallback
-keep @interface com.getcapacitor.PluginMethod
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}
