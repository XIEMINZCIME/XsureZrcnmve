#pragma once

namespace D3D11Renderer {
    bool Init(HWND hwnd, UINT width, UINT height);
    void RenderFrame();
    void Cleanup();
}