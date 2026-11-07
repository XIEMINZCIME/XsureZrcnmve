#pragma once

#include <windows.h>
#include <mutex>

// 全局鼠标状态快照。
// MSLLHOOKSTRUCT 给的是物理像素坐标，覆盖层也是全屏物理像素，直接对齐。
struct MouseSnapshot
{
    float x        = 0.0f;
    float y        = 0.0f;
    float lastX    = 0.0f;
    float lastY    = 0.0f;
    bool  leftDown = false;
};

namespace MouseHook
{
    // 启动全局低级鼠标钩子（内部独立线程 + 消息循环）。
    // 返回 true 表示钩子线程已成功启动。
    bool Start();

    // 停止钩子并等待线程退出。
    void Stop();

    // 取当前鼠标状态快照（线程安全）。
    MouseSnapshot GetSnapshot();

    // 消费当前鼠标状态：返回快照后把 lastX/lastY 更新为当前坐标，
    // 这样调用方拿到的 dx/dy 就是这一帧的位移。
    MouseSnapshot ConsumeSnapshot();
}