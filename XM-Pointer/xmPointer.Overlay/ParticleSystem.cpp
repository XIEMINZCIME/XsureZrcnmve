#include "pch.h"
#include "ParticleSystem.h"

namespace {
    std::vector<Particle> g_particles;
    std::mutex g_particlesMutex;
}

namespace ParticleSystem {
    void Init() {
        g_particles.clear();
    }

    void Update(float dt, const Config& cfg, const MouseSnapshot& m) {
        float dx = m.x - m.lastX;
        float dy = m.y - m.lastY;
        float speed = std::sqrt(dx * dx + dy * dy);

        bool canTrail = cfg.persistentTrail || m.leftDown;

        std::lock_guard<std::mutex> lock(g_particlesMutex);

        // 生成拖尾
        if (canTrail && speed > 0.5f) {
            if ((float)rand() / RAND_MAX < cfg.density || speed > 6.0f) {
                Particle p{};
                p.x = m.x;
                p.y = m.y;
                p.vx = dx * 0.32f;
                p.vy = dy * 0.32f;
                p.size = cfg.particleSize * (0.5f + (float)rand() / RAND_MAX * 0.8f);
                p.life = 1.0f;
                p.grav = 0.0f;
                p.accent = ((float)rand() / RAND_MAX) > 0.82f;
                g_particles.push_back(p);
            }
        }

        // 更新状态
        for (auto& p : g_particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.grav;
            p.vx *= 0.97f;
            p.vy *= 0.97f;
            p.life -= cfg.decay;
        }

        // 剔除死亡粒子
        g_particles.erase(
            std::remove_if(g_particles.begin(), g_particles.end(),
                [](const Particle& p) { return p.life <= 0; }),
            g_particles.end());

        // 限制上限
        if (g_particles.size() > 1400) {
            g_particles.erase(g_particles.begin(), g_particles.begin() + (g_particles.size() - 1400));
        }
    }

    void Render() {
        // 注意：目前为占位。正式的线段 Shader 渲染后续再补。
        // 这里是将粒子交给 D3D11 渲染器的地方。
    }
}