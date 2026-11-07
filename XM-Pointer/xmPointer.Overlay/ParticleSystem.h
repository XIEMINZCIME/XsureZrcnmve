#pragma once
#include "Config.h"
#include "MouseHook.h"

struct Particle {
    float x, y;
    float vx, vy;
    float size;
    float life;
    float grav;
    bool  accent;
};

namespace ParticleSystem {
    void Init();
    void Update(float dt, const Config& cfg, const MouseSnapshot& mouse);
    void Render();
}