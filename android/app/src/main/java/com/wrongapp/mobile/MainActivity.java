package com.wrongapp.mobile;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/** Keep a failed top-level navigation recoverable without replacing Capacitor's bridge. */
public class MainActivity extends BridgeActivity {
    private final Handler recoveryHandler = new Handler(Looper.getMainLooper());
    private View recoveryView;
    private TextView recoveryMessage;
    private String failedUrl;
    private boolean failed;
    private int retries;
    private final Runnable retry = () -> {
        if (bridge != null && failedUrl != null && !isFinishing()) {
            recoveryMessage.setText("Reconnecting…");
            bridge.getWebView().loadUrl(failedUrl);
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (bridge == null) return;
        createRecoveryView();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // A new navigation supersedes any pending retry of the previous URL.
                recoveryHandler.removeCallbacks(retry);
                failed = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    int code = error.getErrorCode();
                    boolean transientError = code == ERROR_CONNECT || code == ERROR_HOST_LOOKUP
                        || code == ERROR_TIMEOUT || code == ERROR_IO;
                    showRecovery(request.getUrl().toString(), transientError);
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                    showRecovery(request.getUrl().toString(), true);
                }
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                // Error documents can also finish loading. Never count them as recovery.
                if (!failed && url.startsWith(bridge.getConfig().getServerUrl())) {
                    recoveryHandler.removeCallbacks(retry);
                    recoveryView.setVisibility(View.GONE);
                    retries = 0;
                }
            }
        });
    }

    private void createRecoveryView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        int padding = Math.round(32 * getResources().getDisplayMetrics().density);
        panel.setPadding(padding, padding, padding, padding);
        panel.setBackgroundColor(Color.rgb(250, 250, 250));
        TextView title = new TextView(this);
        title.setText("Wrong.");
        title.setTextSize(36);
        title.setTextColor(Color.BLACK);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);
        recoveryMessage = new TextView(this);
        recoveryMessage.setTextSize(18);
        recoveryMessage.setTextColor(Color.BLACK);
        recoveryMessage.setGravity(Gravity.CENTER);
        recoveryMessage.setPadding(0, padding, 0, padding);
        recoveryMessage.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        panel.addView(recoveryMessage);
        Button button = new Button(this);
        button.setText("Try again");
        button.setOnClickListener(v -> {
            recoveryHandler.removeCallbacks(retry);
            retries = 0;
            retry.run();
        });
        panel.addView(button);
        recoveryView = panel;
        addContentView(panel, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        panel.setVisibility(View.GONE);
    }

    private void showRecovery(String url, boolean automaticRetry) {
        // Retry only our own HTTPS origin; never bypass certificate errors or switch origins.
        android.net.Uri uri = android.net.Uri.parse(url);
        android.net.Uri origin = android.net.Uri.parse(bridge.getConfig().getServerUrl());
        if (!"https".equals(uri.getScheme()) || !origin.getHost().equals(uri.getHost())) return;
        failed = true;
        failedUrl = url;
        recoveryHandler.removeCallbacks(retry);
        recoveryView.setVisibility(View.VISIBLE);
        recoveryView.bringToFront();
        recoveryMessage.setText("We couldn’t connect. Check your connection and try again.");
        if (automaticRetry && retries < 3) {
            long delay = new long[] {1000, 3000, 7000}[retries++];
            recoveryMessage.setText("Connection interrupted. Reconnecting…");
            recoveryHandler.postDelayed(retry, delay);
        }
    }

    @Override
    public void onDestroy() {
        recoveryHandler.removeCallbacks(retry);
        super.onDestroy();
    }
}
