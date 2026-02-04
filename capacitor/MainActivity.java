package com.selfhostablechat.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.janeasystems.rn_nodejs_mobile.RNNodeJsMobileModule;

public class MainActivity extends BridgeActivity {
    private static final int SERVER_PORT = 3422;
    private static final String SERVER_SCRIPT = "index.js";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startNodeJsServer();
    }

    private void startNodeJsServer() {
        new Thread(() -> {
            try {
                android.util.Log.d("SelfHostableChat", "Starting Node.js server on port " + SERVER_PORT);

                // Start Node.js with the bundled server script
                // The nodejs-mobile module handles the Node.js runtime
                RNNodeJsMobileModule.startNodeWithArguments(
                    this,
                    SERVER_SCRIPT,
                    new String[]{
                        "--port", String.valueOf(SERVER_PORT),
                        "--env", "production"
                    }
                );

                android.util.Log.d("SelfHostableChat", "Node.js server started successfully");
            } catch (Exception e) {
                android.util.Log.e("SelfHostableChat", "Failed to start Node.js server", e);
            }
        }).start();

        // Wait a bit for server to start before loading the webview
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // nodejs-mobile handles cleanup
    }
}
