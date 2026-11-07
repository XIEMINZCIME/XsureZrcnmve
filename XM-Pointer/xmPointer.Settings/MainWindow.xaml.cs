using Microsoft.UI.Xaml;
using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace BAPointer.Settings;

public sealed partial class MainWindow : Window
{
    private WebBridge? _bridge;
    private readonly string _overlayExe;

    public MainWindow()
    {
        InitializeComponent();

        // 配置路径：%LOCALAPPDATA%\BAPointer\config.json
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var appDir = Path.Combine(local, "BAPointer");
        Directory.CreateDirectory(appDir);

        var configPath = Path.Combine(appDir, "config.json");
        var uiFolder = Path.Combine(AppContext.BaseDirectory, "ui");
        _overlayExe = Path.Combine(AppContext.BaseDirectory, "BAPointer.Overlay.exe");

        // 首次运行：把内置默认配置复制到 LocalAppData
        if (!File.Exists(configPath))
        {
            var defaultConfig = Path.Combine(AppContext.BaseDirectory, "config.json");
            if (File.Exists(defaultConfig))
                File.Copy(defaultConfig, configPath);
        }

        // 创建 Bridge 并初始化
        _bridge = new WebBridge(Browser, uiFolder, configPath);
        _ = _bridge.InitializeAsync();

        EnsureOverlayRunning();
    }

    private void EnsureOverlayRunning()
    {
        if (!File.Exists(_overlayExe))
        {
            Debug.WriteLine($"[MainWindow] Overlay not found: {_overlayExe}");
            return;
        }

        if (Process.GetProcessesByName("BAPointer.Overlay").Length > 0)
            return;

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = _overlayExe,
                UseShellExecute = true,
                WorkingDirectory = AppContext.BaseDirectory
            });
            Debug.WriteLine("[MainWindow] Overlay started.");
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[MainWindow] Failed to start overlay: {ex.Message}");
        }
    }
}