#pragma once
#include <string>

struct Config {
    float trailWidth = 18.0f;
    float particleSize = 2.4f;
    float decay = 0.04f;
    float density = 1.0f;
    float bloom = 12.0f;
    int   burstCount = 26;
    float burstForce = 1.0f;
    float gravity = 0.06f;
    bool  persistentTrail = true;
    bool  pauseOnFullscreen = true;
};

namespace ConfigManager {
    Config Load(const std::wstring& path);
}