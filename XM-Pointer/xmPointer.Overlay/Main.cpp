#include "pch.h"
#include "Config.h"
#include "MouseHook.h"
#include "ParticleSystem.h"
#include "D3D11Renderer.h"
#include "OverlayWindow.h"

#include <shlobj.h>
#pragma comment(lib, "shell32.lib")

// 全局配置与路径
std::mutex g_cfgMutex;
Config g_cfg;
std::wstring g_configPath;

// 配置轮询线程
void ConfigPollThread() {
    FILETIME lastWrite = {};
    while (true) {
        WIN32_FILE_ATTRIBUTE_DATA fad;
        if (GetFileAttributesExW(g_configPath.c_str(), GetFileExInfoStandard, &fad)) {
            if (CompareFileTime(&fad.ftLastWriteTime, &lastWrite) != 0) {
                lastWrite = fad.ftLastWriteTime;
                Config c = ConfigManager::Load(g_configPath);
                std::lock_guard<std::mutex> lock(g_cfgMutex);
                g_cfg = c;
            }
        }
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE, PWSTR, int) {
    // 1. 获取配置路径 %LOCALAPPDATA%\BAPointer\config.json
    wchar_t localAppData[MAX_PATH];
    SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, 0, localAppData);
    g_configPath = std::wstring(localAppData) + L"\\BAPointer\\config.json";

    {
        std::lock_guard<std::mutex> lock(g_cfgMutex);
        g_cfg = ConfigManager::Load(g_configPath);
    }

    // 2. 创建覆盖层窗口
    if (!OverlayWindow::Create(hInstance)) return 1;

    // 3. 初始化渲染器
    UINT w = GetSystemMetrics(SM_CXSCREEN);
    UINT h = GetSystemMetrics(SM_CYSCREEN);
    if (!D3D11Renderer::Init(OverlayWindow::GetHandle(), w, h)) {
        OverlayWindow::Destroy();
        return 1;
    }

    // 4. 初始化模块
    ParticleSystem::Init();
    if (!MouseHook::Start()) {
        MessageBoxW(nullptr, L"Failed to install mouse hook.", L"BA Pointer", MB_ICONERROR);
        return 1;
    }

    // 5. 启动配置监听
    std::thread configThread(ConfigPollThread);
    configThread.detach();

    // 6. 主循环
    MSG msg = {};
    auto lastTime = std::chrono::steady_clock::now();

    while (msg.message != WM_QUIT) {
        if (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        } else {
            auto now = std::chrono::steady_clock::now();
            float dt = std::chrono::duration<float>(now - lastTime).count();
            lastTime = now;

            // 抓取鼠标并更新粒子
            MouseSnapshot m = MouseHook::ConsumeSnapshot();
            Config currentCfg;
            { 
                std::lock_guard<std::mutex> lock(g_cfgMutex); 
                currentCfg = g_cfg; 
            }
            
            ParticleSystem::Update(dt, currentCfg, m);
            D3D11Renderer::RenderFrame();

            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    // 7. 清理
    MouseHook::Stop();
    D3D11Renderer::Cleanup();
    OverlayWindow::Destroy();
    
    return 0;
}