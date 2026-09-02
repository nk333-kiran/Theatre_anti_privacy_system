# Proguard / R8 Configuration for Theatre Anti-Piracy Native Android App

# Keep data models serialized by Gson / Retrofit
-keep class com.theatre.antipiracy.data.models.** { *; }

# Keep Retrofit interfaces and annotations
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Keep Android KeyStore and Security Crypto models
-keep class androidx.security.crypto.** { *; }

# Keep ML Kit Barcode models
-keep class com.google.mlkit.vision.barcode.** { *; }

# Strip sensitive debug logging in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
