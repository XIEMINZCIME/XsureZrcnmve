#include "pch.h"
#include "OverlayWindow.h"

namespace {
    HWND g_hwnd = nullptr;

    LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
        if (msg == WM_DESTROY) {
            PostQuitMessage(0);
            return 0;
        }
        if (msg == WM_NCHITTEST) return HTTRANSPARENT; // 点击穿透核心
        return DefWindowProc(hwnd, msg, wParam, lParam);
    }
}

namespace OverlayWindow {
    bool Create(HINSTANCE hInstance) {
        WNDCLASSEXW wc = { sizeof(wc) };
        wc.lpfnWndProc = WndProc;
        wc.hInstance = hInstance;
        wc.lpszClassName = L"BAPointerOverlay";
        RegisterClassExW(&wc);

        g_hwnd = CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOREDIRECTIONBITMAP,
            L"BAPointerOverlay", L"BA Pointer Overlay",
            WS_POPUP,
            0, 0, GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN),
            nullptr, nullptr, hInstance, nullptr);

        if (!g_hwnd) return false;

        ShowWindow(g_hwnd, SW_SHOW);
        UpdateWindow(g_hwnd);
        return true;
    }

    void Destroy() {
        if (g_hwnd) {
            DestroyWindow(g_hwnd);
            g_hwnd = nullptr;
        }
    }

    HWND GetHandle() { return g_hwnd; }
}