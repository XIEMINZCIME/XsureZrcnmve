#pragma once

namespace OverlayWindow {
    bool Create(HINSTANCE hInstance);
    void Destroy();
    HWND GetHandle();
}