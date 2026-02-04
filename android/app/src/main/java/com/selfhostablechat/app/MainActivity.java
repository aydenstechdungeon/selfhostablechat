package com.selfhostablechat.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SelfHostableChat";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable debugging for WebView
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Activity destroyed");
    }
}
