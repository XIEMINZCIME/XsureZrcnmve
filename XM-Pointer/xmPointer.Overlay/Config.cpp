#include "pch.h"
#include "Config.h"

namespace ConfigManager {
    Config Load(const std::wstring& path) {
        Config c;
        std::ifstream f(path);
        if (!f.is_open()) return c;

        std::stringstream ss;
        ss << f.rdbuf();
        std::string s = ss.str();

        auto readFloat = [&](const std::string& key, float def) -> float {
            auto p = s.find("\"" + key + "\"");
            if (p == std::string::npos) return def;
            p = s.find(':', p);
            if (p == std::string::npos) return def;
            try { return std::stof(s.substr(p + 1)); } catch (...) { return def; }
        };
        auto readInt = [&](const std::string& key, int def) -> int {
            return (int)readFloat(key, (float)def);
        };
        auto readBool = [&](const std::string& key, bool def) -> bool {
            auto p = s.find("\"" + key + "\"");
            if (p == std::string::npos) return def;
            p = s.find(':', p);
            if (p == std::string::npos) return def;
            auto t = s.find("true", p);
            auto f2 = s.find("false", p);
            if (t != std::string::npos && (f2 == std::string::npos || t < f2)) return true;
            if (f2 != std::string::npos && (t == std::string::npos || f2 < t)) return false;
            return def;
        };

        c.trailWidth        = readFloat("width", 18.0f);
        c.particleSize      = readFloat("particleSize", 2.4f);
        c.decay             = readFloat("decay", 0.04f);
        c.density           = readFloat("density", 1.0f);
        c.bloom             = readFloat("bloom", 12.0f);
        c.burstCount        = readInt("count", 26);
        c.burstForce        = readFloat("force", 1.0f);
        c.gravity           = readFloat("gravity", 0.06f);
        c.persistentTrail   = readBool("persistentTrail", true);
        c.pauseOnFullscreen = readBool("pauseOnFullscreen", true);
        return c;
    }
}