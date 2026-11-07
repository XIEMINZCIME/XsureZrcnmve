using Microsoft.UI.Xaml.Controls;
using Microsoft.Web.WebView2.Core;
using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace BAPointer.Settings;

/// <summary>
/// 封装 WebView2 与 HTML UI 之间的双向通信。
/// 职责：
///   - 虚拟主机映射（把 ui/ 文件夹暴露成 https://bapointer.local）
///   - 接收 UI 发来的 applyConfig / uiReady
///   - 把磁盘上的配置推回 UI
///   - 写配置文件
/// </summary>
public sealed class WebBridge
{
    private const string VirtualHost = "bapointer.local";
    private const string TrustedOrigin = $"https://{VirtualHost}";

    private readonly WebView2 _webView;
    private readonly string _uiFolder;
    private readonly string _configPath;

    public WebBridge(WebView2 webView, string uiFolder, string configPath)
    {
        _webView = webView ?? throw new ArgumentNullException(nameof(webView));
        _uiFolder = uiFolder ?? throw new ArgumentNullException(nameof(uiFolder));
        _configPath = configPath ?? throw new ArgumentNullException(nameof(configPath));
    }

    /// <summary>
    /// 初始化 WebView2：设置虚拟主机、注册消息接收器、导航到入口页。
    /// 必须在 UI 线程调用。
    /// </summary>
    public async Task InitializeAsync()
    {
        await _webView.EnsureCoreWebView2Async();

        // 把本地 ui/ 文件夹映射成 https://bapointer.local，避免 file:/// 被拦截
        _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            VirtualHost,
            _uiFolder,
            CoreWebView2HostResourceAccessKind.Allow);

        // 消息接收器必须在 Navigate 之前注册，否则 uiReady 可能漏掉
        _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

        // 导航到入口页
        _webView.CoreWebView2.Navigate($"{TrustedOrigin}/bapointer.html");
    }

    /// <summary>
    /// 主动把当前配置推送给 UI。UI 收到 configLoaded 后会回填滑块和开关。
    /// </summary>
    public async Task PushConfigToWebAsync()
    {
        string json = File.Exists(_configPath)
            ? await File.ReadAllTextAsync(_configPath)
            : "{}";

        JsonElement payload;
        try { payload = JsonSerializer.Deserialize<JsonElement>(json); }
        catch (JsonException) { payload = JsonSerializer.Deserialize<JsonElement>("{}"); }

        PostToWeb(new { type = "configLoaded", payload });
    }

    // ============================================================
    // Web → 原生
    // ============================================================
    private async void OnWebMessageReceived(
        CoreWebView2 sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        // 来源校验：防止导航到外部页面后仍能调用宿主逻辑
        if (!args.Source.StartsWith(TrustedOrigin, StringComparison.OrdinalIgnoreCase))
            return;

        string json = args.WebMessageAsJson;
        if (string.IsNullOrWhiteSpace(json)) return;

        WebMessage? msg;
        try { msg = JsonSerializer.Deserialize<WebMessage>(json); }
        catch (JsonException) { return; }

        if (msg?.Type is null) return;

        switch (msg.Type)
        {
            case "uiReady":
                // UI 已加载完毕，推送当前配置
                await PushConfigToWebAsync();
                break;

            case "applyConfig":
                if (msg.Payload is not null)
                {
                    await File.WriteAllTextAsync(_configPath, msg.Payload.Value.GetRawText());
                    PostToWeb(new
                    {
                        type = "configSaved",
                        timestamp = DateTimeOffset.Now.ToString("HH:mm:ss")
                    });
                    Debug.WriteLine($"[WebBridge] Config saved → {_configPath}");
                }
                break;

            default:
                Debug.WriteLine($"[WebBridge] Unknown message type: {msg.Type}");
                break;
        }
    }

    // ============================================================
    // 原生 → Web
    // ============================================================
    private void PostToWeb(object obj)
    {
        if (_webView.CoreWebView2 is null) return;
        _webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(obj));
    }

    // ============================================================
    // DTO
    // ============================================================
    private sealed class WebMessage
    {
        public string? Type { get; set; }
        public JsonElement? Payload { get; set; }
    }
}