#include "pch.h"
#include "MouseHook.h"

#include <thread>
#include <atomic>

namespace
{
    HHOOK                g_hook         = nullptr;
    DWORD                g_hookThreadId = 0;
    std::atomic<bool>    g_running{ false };
    std::thread          g_thread;

    MouseSnapshot        g_state;
    std::mutex           g_stateMutex;

    LRESULT CALLBACK HookProc(int nCode, WPARAM wParam, LPARAM lParam)
    {
        if (nCode >= 0)
        {
            auto* ms = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);

            std::lock_guard<std::mutex> lock(g_stateMutex);
            g_state.x = static_cast<float>(ms->pt.x);
            g_state.y = static_cast<float>(ms->pt.y);

            if (wParam == WM_LBUTTONDOWN)
                g_state.leftDown = true;
            else if (wParam == WM_LBUTTONUP)
                g_state.leftDown = false;
        }
        return CallNextHookEx(g_hook, nCode, wParam, lParam);
    }

    // 钩子线程：SetWindowsHookEx 必须在有消息循环的线程里调用，
    // 否则钩子会失效或收不到回调。
    void ThreadProc()
    {
        g_hookThreadId = GetCurrentThreadId();
        g_hook = SetWindowsHookExW(WH_MOUSE_LL, HookProc, nullptr, 0);

        if (!g_hook)
        {
            g_running = false;
            return;
        }

        MSG msg = {};
        while (g_running && GetMessageW(&msg, nullptr, 0, 0) > 0)
        {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        if (g_hook)
        {
            UnhookWindowsHookEx(g_hook);
            g_hook = nullptr;
        }

        // 唤醒可能卡在 GetMessage 的线程
        if (g_hookThreadId != 0)
            PostThreadMessageW(g_hookThreadId, WM_QUIT, 0, 0);
    }
}

namespace MouseHook
{
    bool Start()
    {
        if (g_running.exchange(true))
            return true; // 已在运行

        g_thread = std::thread(ThreadProc);

        // 等一下让钩子安装完成，避免调用方立刻 GetSnapshot 拿到零坐标
        for (int i = 0; i < 50 && !g_hook; ++i)
            Sleep(2);

        return g_hook != nullptr;
    }

    void Stop()
    {
        if (!g_running.exchange(false))
            return;

        // 先卸钩子再发 WM_QUIT，避免回调里再触发一次
        if (g_hook)
        {
            UnhookWindowsHookEx(g_hook);
            g_hook = nullptr;
        }

        if (g_hookThreadId != 0)
            PostThreadMessageW(g_hookThreadId, WM_QUIT, 0, 0);

        if (g_thread.joinable())
            g_thread.join();

        g_hookThreadId = 0;
    }

    MouseSnapshot GetSnapshot()
    {
        std::lock_guard<std::mutex> lock(g_stateMutex);
        return g_state;
    }

    MouseSnapshot ConsumeSnapshot()
    {
        std::lock_guard<std::mutex> lock(g_stateMutex);
        MouseSnapshot snap = g_state;
        g_state.lastX = g_state.x;
        g_state.lastY = g_state.y;
        return snap;
    }
}