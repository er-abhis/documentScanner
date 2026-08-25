# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# --- Google ML Kit Document Scanner (react-native-document-scanner-plugin) ---
# R8 strips these in release, causing scans to fail with a generic
# "Something went wrong… update Google Play services" error. Keep the ML Kit
# vision classes, the Play Services doc-scanner internals, and the RN module.
-keep class com.google.mlkit.** { *; }
-keep interface com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-keep class com.documentscanner.** { *; }
-dontwarn com.google.mlkit.**

# Keep ML Kit Text Recognition package
-keep class com.rnmlkit.textrecognition.** { *; }

# Google Play Services and Tasks
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-dontwarn com.google.android.gms.**

# ML Kit registers detectors/options via reflection over annotated components.
-keep class * implements com.google.mlkit.common.sdkinternal.OptionalModuleApi { *; }
-keep class * implements com.google.android.gms.common.api.OptionalModuleApi { *; }
-keepclassmembers class ** {
  @com.google.firebase.components.annotations.KeepForSdk *;
}
-keepnames class com.google.android.gms.common.annotation.KeepName
