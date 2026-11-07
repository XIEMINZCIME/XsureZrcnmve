using System;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace XsureZrcnmve
{
    public partial class MainWindow : Window
    {
        private VzcHost? _vzc;

        public MainWindow()
        {
            InitializeComponent();
            _ = LoadUI();
        }

        private async Task LoadUI()
        {
            try
            {
                await WebViewUI.EnsureCoreWebView2Async(null);
                var core = WebViewUI.CoreWebView2;

                // XZ 根目录：正式运行时是 exe 所在目录；VS 调试时自动向上回溯。
                string root = VzcHost.ResolveXzRoot(AppDomain.CurrentDomain.BaseDirectory);
                _vzc = new VzcHost(root);
                var host = _vzc;
                host.MapHosts(core);

                var scan = host.Scan();
                Console.WriteLine($"[XZ] 根目录 {root} / VZC {scan.Mods.Count} 条 / 警告 {scan.Warnings.Count} 条");

                // 网页 → C#：退出、重新扫描、激活指定 VZC
                core.WebMessageReceived += (s, e) =>
                {
                    string? msg = e.TryGetWebMessageAsString();
                    if (msg == "exit") Application.Current?.Shutdown();
                    else if (msg == "vzc:reload") host.PostRegistry(core);
                    else if (msg != null && msg.StartsWith("vzc:activate:", StringComparison.Ordinal))
                        host.Activate(msg.Substring("vzc:activate:".Length), core);
                };

                // C# → 网页：DOM 就绪后推送注册表
                core.NavigationCompleted += (s, e) =>
                {
                    if (e.IsSuccess) host.PostRegistry(core);
                };

                if (host.HasCore)
                {
                    WebViewUI.Source = new Uri($"https://{VzcHost.CoreHostName}/index.html");
                }
                else
                {
                    // 找不到 Core_Dimension 时给一个干净的诊断页，而不是静默黑屏
                    WebViewUI.NavigateToString(
                        "<!doctype html><meta charset='utf-8'>" +
                        "<body style='margin:0;background:#0A0C10;color:#A0B8F0;font:14px/2 Microsoft YaHei;padding:40px'>" +
                        "<h2 style='color:#8FA8E8'>CORE_DIMENSION 未找到</h2>" +
                        "<div>期望目录：" + System.Net.WebUtility.HtmlEncode(host.CoreRoot) + "</div>" +
                        "<div>VZC 扫描结果：" + scan.Mods.Count + " 条</div>" +
                        "<div style='color:#66759B'>按 Esc 退出观测</div></body>");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "WebView2 加载失败，请确保已安装 WebView2 运行库。\n错误信息：" + ex.Message);
                Application.Current?.Shutdown();
            }
        }
    }
}
