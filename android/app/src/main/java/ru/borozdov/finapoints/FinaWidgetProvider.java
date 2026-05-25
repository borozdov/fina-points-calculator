package ru.borozdov.finapoints;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class FinaWidgetProvider extends AppWidgetProvider {
    private static final String PREFS = "fina_widget_state";

    private static final String ACTION_TOGGLE_MODE = "ru.borozdov.finapoints.widget.TOGGLE_MODE";
    private static final String ACTION_TOGGLE_POOL = "ru.borozdov.finapoints.widget.TOGGLE_POOL";
    private static final String ACTION_TOGGLE_GENDER = "ru.borozdov.finapoints.widget.TOGGLE_GENDER";
    private static final String ACTION_PREV_EVENT = "ru.borozdov.finapoints.widget.PREV_EVENT";
    private static final String ACTION_NEXT_EVENT = "ru.borozdov.finapoints.widget.NEXT_EVENT";
    private static final String ACTION_DEC_VALUE = "ru.borozdov.finapoints.widget.DEC_VALUE";
    private static final String ACTION_INC_VALUE = "ru.borozdov.finapoints.widget.INC_VALUE";
    private static final String ACTION_CYCLE_STEP = "ru.borozdov.finapoints.widget.CYCLE_STEP";

    private static final String MODE_TIME = "time";
    private static final String MODE_POINTS = "points";
    private static final String POOL_SCM = "SCM";
    private static final String POOL_LCM = "LCM";
    private static final String GENDER_MEN = "Men";
    private static final String GENDER_WOMEN = "Women";

    private static final int DEFAULT_TIME_HUNDREDTHS = 1990;
    private static final int DEFAULT_POINTS = 1000;
    private static final int MIN_TIME_HUNDREDTHS = 1;
    private static final int MAX_TIME_HUNDREDTHS = 359999;
    private static final int MIN_POINTS = 1;
    private static final int MAX_POINTS = 9999;
    private static final int[] TIME_STEPS = new int[] {1, 10, 100, 1000};
    private static final int[] POINT_STEPS = new int[] {1, 10, 100};
    private static final int DEFAULT_TIME_STEP_INDEX = 2;
    private static final int DEFAULT_POINT_STEP_INDEX = 1;

    private static final String[] EVENT_ORDER = new String[] {
            "50m Freestyle",
            "100m Freestyle",
            "200m Freestyle",
            "400m Freestyle",
            "800m Freestyle",
            "1500m Freestyle",
            "50m Backstroke",
            "100m Backstroke",
            "200m Backstroke",
            "50m Breaststroke",
            "100m Breaststroke",
            "200m Breaststroke",
            "50m Butterfly",
            "100m Butterfly",
            "200m Butterfly",
            "100m Medley",
            "200m Medley",
            "400m Medley"
    };

    private static JSONObject baseTimes;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (isWidgetAction(action)) {
            int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                applyAction(context, appWidgetId, action);
                updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId);
            }
            return;
        }

        super.onReceive(context, intent);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateWidget(context, appWidgetManager, appWidgetId);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        SharedPreferences.Editor editor = prefs(context).edit();
        for (int appWidgetId : appWidgetIds) {
            String prefix = key(appWidgetId, "");
            editor.remove(prefix + "mode");
            editor.remove(prefix + "pool");
            editor.remove(prefix + "gender");
            editor.remove(prefix + "event");
            editor.remove(prefix + "time");
            editor.remove(prefix + "points");
            editor.remove(prefix + "timeStep");
            editor.remove(prefix + "pointStep");
        }
        editor.apply();
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        WidgetState state = loadState(context, appWidgetId);
        double baseTime = getBaseTime(context, state.pool, state.gender, state.event);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fina_converter);

        views.setTextViewText(R.id.widget_mode, state.mode.equals(MODE_TIME) ? "сек → очки" : "очки → сек");
        views.setTextViewText(R.id.widget_pool, state.pool.equals(POOL_SCM) ? "25м" : "50м");
        views.setTextViewText(R.id.widget_gender, state.gender.equals(GENDER_MEN) ? "М" : "Ж");
        views.setTextViewText(R.id.widget_event, shortEventLabel(state.event));

        if (baseTime <= 0) {
            views.setTextViewText(R.id.widget_value_label, "ЗНАЧЕНИЕ");
            views.setTextViewText(R.id.widget_value, "-");
            views.setTextViewText(R.id.widget_result_label, "РЕЗУЛЬТАТ");
            views.setTextViewText(R.id.widget_result, "НЕТ БАЗЫ");
        } else if (state.mode.equals(MODE_TIME)) {
            double seconds = state.timeHundredths / 100.0;
            int points = calculatePoints(baseTime, seconds);
            views.setTextViewText(R.id.widget_value_label, "СЕКУНДЫ · " + formatTimeStep(state.timeStepIndex));
            views.setTextViewText(R.id.widget_value, formatTime(seconds));
            views.setTextViewText(R.id.widget_result_label, "ОЧКИ FINA");
            views.setTextViewText(R.id.widget_result, String.valueOf(points));
        } else {
            double seconds = calculateTime(baseTime, state.points);
            views.setTextViewText(R.id.widget_value_label, "ОЧКИ · " + formatPointStep(state.pointStepIndex));
            views.setTextViewText(R.id.widget_value, String.valueOf(state.points));
            views.setTextViewText(R.id.widget_result_label, "ВРЕМЯ");
            views.setTextViewText(R.id.widget_result, formatTime(seconds));
        }

        views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent(context, appWidgetId));
        views.setOnClickPendingIntent(R.id.widget_mode, actionPendingIntent(context, appWidgetId, ACTION_TOGGLE_MODE, 1));
        views.setOnClickPendingIntent(R.id.widget_pool, actionPendingIntent(context, appWidgetId, ACTION_TOGGLE_POOL, 2));
        views.setOnClickPendingIntent(R.id.widget_gender, actionPendingIntent(context, appWidgetId, ACTION_TOGGLE_GENDER, 3));
        views.setOnClickPendingIntent(R.id.widget_prev_event, actionPendingIntent(context, appWidgetId, ACTION_PREV_EVENT, 4));
        views.setOnClickPendingIntent(R.id.widget_next_event, actionPendingIntent(context, appWidgetId, ACTION_NEXT_EVENT, 5));
        views.setOnClickPendingIntent(R.id.widget_dec, actionPendingIntent(context, appWidgetId, ACTION_DEC_VALUE, 6));
        views.setOnClickPendingIntent(R.id.widget_inc, actionPendingIntent(context, appWidgetId, ACTION_INC_VALUE, 7));
        views.setOnClickPendingIntent(R.id.widget_value_panel, actionPendingIntent(context, appWidgetId, ACTION_CYCLE_STEP, 8));

        manager.updateAppWidget(appWidgetId, views);
    }

    private static boolean isWidgetAction(String action) {
        return ACTION_TOGGLE_MODE.equals(action)
                || ACTION_TOGGLE_POOL.equals(action)
                || ACTION_TOGGLE_GENDER.equals(action)
                || ACTION_PREV_EVENT.equals(action)
                || ACTION_NEXT_EVENT.equals(action)
                || ACTION_DEC_VALUE.equals(action)
                || ACTION_INC_VALUE.equals(action)
                || ACTION_CYCLE_STEP.equals(action);
    }

    private static void applyAction(Context context, int appWidgetId, String action) {
        WidgetState state = loadState(context, appWidgetId);

        if (ACTION_TOGGLE_MODE.equals(action)) {
            state.mode = state.mode.equals(MODE_TIME) ? MODE_POINTS : MODE_TIME;
        } else if (ACTION_TOGGLE_POOL.equals(action)) {
            state.pool = state.pool.equals(POOL_SCM) ? POOL_LCM : POOL_SCM;
            state.event = ensureAvailableEvent(context, state.pool, state.gender, state.event);
        } else if (ACTION_TOGGLE_GENDER.equals(action)) {
            state.gender = state.gender.equals(GENDER_MEN) ? GENDER_WOMEN : GENDER_MEN;
            state.event = ensureAvailableEvent(context, state.pool, state.gender, state.event);
        } else if (ACTION_PREV_EVENT.equals(action)) {
            state.event = cycleEvent(context, state.pool, state.gender, state.event, -1);
        } else if (ACTION_NEXT_EVENT.equals(action)) {
            state.event = cycleEvent(context, state.pool, state.gender, state.event, 1);
        } else if (ACTION_DEC_VALUE.equals(action)) {
            if (state.mode.equals(MODE_TIME)) {
                state.timeHundredths = Math.max(MIN_TIME_HUNDREDTHS, state.timeHundredths - timeStep(state.timeStepIndex));
            } else {
                state.points = Math.max(MIN_POINTS, state.points - pointStep(state.pointStepIndex));
            }
        } else if (ACTION_INC_VALUE.equals(action)) {
            if (state.mode.equals(MODE_TIME)) {
                state.timeHundredths = Math.min(MAX_TIME_HUNDREDTHS, state.timeHundredths + timeStep(state.timeStepIndex));
            } else {
                state.points = Math.min(MAX_POINTS, state.points + pointStep(state.pointStepIndex));
            }
        } else if (ACTION_CYCLE_STEP.equals(action)) {
            if (state.mode.equals(MODE_TIME)) {
                state.timeStepIndex = (state.timeStepIndex + 1) % TIME_STEPS.length;
            } else {
                state.pointStepIndex = (state.pointStepIndex + 1) % POINT_STEPS.length;
            }
        }

        saveState(context, appWidgetId, state);
    }

    private static WidgetState loadState(Context context, int appWidgetId) {
        SharedPreferences prefs = prefs(context);
        WidgetState state = new WidgetState();
        state.mode = prefs.getString(key(appWidgetId, "mode"), MODE_TIME);
        state.pool = prefs.getString(key(appWidgetId, "pool"), POOL_SCM);
        state.gender = prefs.getString(key(appWidgetId, "gender"), GENDER_MEN);
        state.event = prefs.getString(key(appWidgetId, "event"), "50m Freestyle");
        state.timeHundredths = prefs.getInt(key(appWidgetId, "time"), DEFAULT_TIME_HUNDREDTHS);
        state.points = prefs.getInt(key(appWidgetId, "points"), DEFAULT_POINTS);
        state.timeStepIndex = clampIndex(prefs.getInt(key(appWidgetId, "timeStep"), DEFAULT_TIME_STEP_INDEX), TIME_STEPS.length);
        state.pointStepIndex = clampIndex(prefs.getInt(key(appWidgetId, "pointStep"), DEFAULT_POINT_STEP_INDEX), POINT_STEPS.length);
        state.event = ensureAvailableEvent(context, state.pool, state.gender, state.event);
        return state;
    }

    private static void saveState(Context context, int appWidgetId, WidgetState state) {
        prefs(context).edit()
                .putString(key(appWidgetId, "mode"), state.mode)
                .putString(key(appWidgetId, "pool"), state.pool)
                .putString(key(appWidgetId, "gender"), state.gender)
                .putString(key(appWidgetId, "event"), state.event)
                .putInt(key(appWidgetId, "time"), state.timeHundredths)
                .putInt(key(appWidgetId, "points"), state.points)
                .putInt(key(appWidgetId, "timeStep"), state.timeStepIndex)
                .putInt(key(appWidgetId, "pointStep"), state.pointStepIndex)
                .apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String key(int appWidgetId, String name) {
        return "widget_" + appWidgetId + "_" + name;
    }

    private static String ensureAvailableEvent(Context context, String pool, String gender, String event) {
        if (getBaseTime(context, pool, gender, event) > 0) {
            return event;
        }
        List<String> events = availableEvents(context, pool, gender);
        return events.isEmpty() ? "50m Freestyle" : events.get(0);
    }

    private static String cycleEvent(Context context, String pool, String gender, String current, int delta) {
        List<String> events = availableEvents(context, pool, gender);
        if (events.isEmpty()) {
            return current;
        }
        int index = events.indexOf(current);
        if (index < 0) {
            index = 0;
        }
        int next = (index + delta + events.size()) % events.size();
        return events.get(next);
    }

    private static List<String> availableEvents(Context context, String pool, String gender) {
        List<String> events = new ArrayList<>();
        for (String event : EVENT_ORDER) {
            if (getBaseTime(context, pool, gender, event) > 0) {
                events.add(event);
            }
        }
        return events;
    }

    private static double getBaseTime(Context context, String pool, String gender, String event) {
        try {
            JSONObject times = loadBaseTimes(context);
            return times.getJSONObject(pool).getJSONObject(gender).getDouble(event);
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static JSONObject loadBaseTimes(Context context) throws Exception {
        if (baseTimes != null) {
            return baseTimes;
        }

        try (InputStream stream = context.getAssets().open("public/data/fina_base_times.json")) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int read;
            while ((read = stream.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            baseTimes = new JSONObject(buffer.toString("UTF-8"));
            return baseTimes;
        }
    }

    private static int calculatePoints(double baseTime, double seconds) {
        if (baseTime <= 0 || seconds <= 0) {
            return 0;
        }
        double points = 1000 * Math.pow(baseTime / seconds, 3);
        if (points > MAX_POINTS) {
            return MAX_POINTS;
        }
        return Math.max(0, (int) Math.floor(points));
    }

    private static double calculateTime(double baseTime, int points) {
        if (baseTime <= 0 || points <= 0) {
            return 0;
        }

        double time = roundHundredths(baseTime / Math.pow(points / 1000.0, 1.0 / 3.0));
        int guard = 0;
        while (calculatePoints(baseTime, time) < points && time > 0.01 && guard++ < 10000) {
            time = roundHundredths(time - 0.01);
        }
        while (time > 0.01 && calculatePoints(baseTime, roundHundredths(time - 0.01)) == calculatePoints(baseTime, time) && guard++ < 20000) {
            time = roundHundredths(time - 0.01);
        }
        return time;
    }

    private static double roundHundredths(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static String formatTime(double seconds) {
        if (seconds <= 0) {
            return "0.00";
        }
        double rounded = roundHundredths(seconds);
        if (rounded < 60) {
            return String.format(Locale.US, "%.2f", rounded);
        }

        int minutes = (int) Math.floor(rounded / 60);
        double remaining = rounded - (minutes * 60);
        return String.format(Locale.US, "%d:%05.2f", minutes, remaining);
    }

    private static int clampIndex(int index, int length) {
        return index >= 0 && index < length ? index : 0;
    }

    private static int timeStep(int stepIndex) {
        return TIME_STEPS[clampIndex(stepIndex, TIME_STEPS.length)];
    }

    private static int pointStep(int stepIndex) {
        return POINT_STEPS[clampIndex(stepIndex, POINT_STEPS.length)];
    }

    private static String formatTimeStep(int stepIndex) {
        int step = timeStep(stepIndex);
        if (step >= 100) {
            return (step / 100) + "с";
        }
        return "0." + (step == 10 ? "10" : "01") + "с";
    }

    private static String formatPointStep(int stepIndex) {
        return String.valueOf(pointStep(stepIndex));
    }

    private static String shortEventLabel(String event) {
        if ("50m Freestyle".equals(event)) return "50 в/с";
        if ("100m Freestyle".equals(event)) return "100 в/с";
        if ("200m Freestyle".equals(event)) return "200 в/с";
        if ("400m Freestyle".equals(event)) return "400 в/с";
        if ("800m Freestyle".equals(event)) return "800 в/с";
        if ("1500m Freestyle".equals(event)) return "1500 в/с";
        if ("50m Backstroke".equals(event)) return "50 спина";
        if ("100m Backstroke".equals(event)) return "100 спина";
        if ("200m Backstroke".equals(event)) return "200 спина";
        if ("50m Breaststroke".equals(event)) return "50 брасс";
        if ("100m Breaststroke".equals(event)) return "100 брасс";
        if ("200m Breaststroke".equals(event)) return "200 брасс";
        if ("50m Butterfly".equals(event)) return "50 батт";
        if ("100m Butterfly".equals(event)) return "100 батт";
        if ("200m Butterfly".equals(event)) return "200 батт";
        if ("100m Medley".equals(event)) return "100 к/п";
        if ("200m Medley".equals(event)) return "200 к/п";
        if ("400m Medley".equals(event)) return "400 к/п";
        return event;
    }

    private static PendingIntent actionPendingIntent(Context context, int appWidgetId, String action, int requestCode) {
        Intent intent = new Intent(context, FinaWidgetProvider.class);
        intent.setAction(action);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId * 10 + requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent openAppPendingIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context,
                appWidgetId * 10 + 9,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static class WidgetState {
        String mode;
        String pool;
        String gender;
        String event;
        int timeHundredths;
        int points;
        int timeStepIndex;
        int pointStepIndex;
    }
}
