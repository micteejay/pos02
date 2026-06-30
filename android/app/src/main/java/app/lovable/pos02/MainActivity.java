package app.lovable.pos02;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Dynamic initialization of Firebase if it's missing (prevents crash on push notifications registration)
        try {
            Class<?> firebaseAppClass = Class.forName("com.google.firebase.FirebaseApp");
            java.util.List<?> apps = (java.util.List<?>) firebaseAppClass.getMethod("getApps", android.content.Context.class).invoke(null, this);
            if (apps.isEmpty()) {
                Class<?> firebaseOptionsBuilderClass = Class.forName("com.google.firebase.FirebaseOptions$Builder");
                Object builder = firebaseOptionsBuilderClass.getConstructor().newInstance();
                
                firebaseOptionsBuilderClass.getMethod("setApiKey", String.class).invoke(builder, "dummy-api-key");
                firebaseOptionsBuilderClass.getMethod("setApplicationId", String.class).invoke(builder, "1:1234567890:android:1234567890");
                firebaseOptionsBuilderClass.getMethod("setProjectId", String.class).invoke(builder, "dummy-project-id");
                
                Object options = firebaseOptionsBuilderClass.getMethod("build").invoke(builder);
                
                Class<?> firebaseOptionsClass = Class.forName("com.google.firebase.FirebaseOptions");
                firebaseAppClass.getMethod("initializeApp", android.content.Context.class, firebaseOptionsClass).invoke(null, this, options);
                android.util.Log.d("POS_INIT", "Successfully initialized Firebase with dummy options via reflection.");
            } else {
                android.util.Log.d("POS_INIT", "Firebase already initialized by provider.");
            }
        } catch (ClassNotFoundException e) {
            android.util.Log.w("POS_INIT", "FirebaseApp class not found. Skipping dynamic initialization.");
        } catch (Exception e) {
            android.util.Log.e("POS_INIT", "Failed to dynamically initialize Firebase", e);
        }
    }
}

