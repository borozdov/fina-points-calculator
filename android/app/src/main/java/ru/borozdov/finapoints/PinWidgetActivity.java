package ru.borozdov.finapoints;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

public class PinWidgetActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = getSystemService(AppWidgetManager.class);
            ComponentName provider = new ComponentName(this, FinaWidgetProvider.class);

            if (manager != null && manager.isRequestPinAppWidgetSupported()) {
                manager.requestPinAppWidget(provider, null, null);
                finish();
                return;
            }
        }

        Toast.makeText(this, R.string.widget_pin_unsupported, Toast.LENGTH_LONG).show();
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
