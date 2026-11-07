using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;

namespace XsureZrcnmve
{
    /// <summary>
    /// VZC 主机 —— XsureZrcnmve 3.0「VZC 创作扩展」的宿主侧实现。
    ///
    /// 规范（来自 3.0 正式版公告）：
    ///   将 VZC 主程序 *.mixz 与 manifest.json 放入
    ///   XZ根目录\vzcs\VZC名称\版本号\ ，启动 XZ 后自动扫描加载。
    ///
    /// 本类负责：定位根目录、扫描版本目录、解析 manifest.json、识别 *.vzc 声明式
    /// 内容定义并做基础相容性校验、选择生效版本、把 Mod 注册表推给 WebView2 前端、
    /// 以及把 vzcs/ 映射成虚拟站点供前端取资源。
    ///
    /// 边界：*.mixz 是「基于 NepInRx 13（ZC・X#・.NET 13）」编译的主程序，
    /// 其二进制格式与执行方式不在本工程内，本类不做臆测。*.vzc 是可读的声明式
    /// JSON，本类只读其顶层字段，不写、不改、不执行。它只把入口文件 URL 与
    /// manifest / *.vzc 声明交给前端运行时 / 未来真正的 MixzExecutor。
    /// 想接上真正的执行器时，替换 Activate() 里的投递逻辑即可，其余不用动。
    /// </summary>
    public sealed class VzcHost
    {
        public const string CoreHostName = "core.local";
        public const string VzcsHostName = "vzcs.local";

        private readonly string _xzRoot;

        public VzcHost(string xzRoot)
        {
            _xzRoot = Path.GetFullPath(xzRoot);
        }

        public string XzRoot => _xzRoot;
        public string VzcsRoot => Path.Combine(_xzRoot, "vzcs");
        public string CoreRoot => Path.Combine(_xzRoot, "Core_Dimension");

        /// <summary>
        /// exe 在 XZ 根目录时直接命中；用 Visual Studio 调试时（bin\Debug\netX）
        /// 向上回溯几层找 Core_Dimension / vzcs，避免路径写死。
        /// </summary>
        public static string ResolveXzRoot(string startDir)
        {
            var dir = new DirectoryInfo(Path.GetFullPath(startDir));
            for (int i = 0; i < 6 && dir != null; i++, dir = dir.Parent)
            {
                if (Directory.Exists(Path.Combine(dir.FullName, "Core_Dimension")) ||
                    Directory.Exists(Path.Combine(dir.FullName, "vzcs")))
                    return dir.FullName;
            }
            return Path.GetFullPath(startDir);
        }

        /// <summary>把本地目录挂成两个虚拟站点，前端即可用 https:// 加载模块与模型。</summary>
        public void MapHosts(CoreWebView2 core)
        {
            if (!Directory.Exists(VzcsRoot)) Directory.CreateDirectory(VzcsRoot);

            if (Directory.Exists(CoreRoot))
            {
                core.SetVirtualHostNameToFolderMapping(
                    CoreHostName, CoreRoot, CoreWebView2HostResourceAccessKind.Allow);
            }
            core.SetVirtualHostNameToFolderMapping(
                VzcsHostName, VzcsRoot, CoreWebView2HostResourceAccessKind.Allow);
        }

        public bool HasCore => File.Exists(Path.Combine(CoreRoot, "index.html"));

        // ---------------------------------------------------------------- 数据模型
        public sealed class VzcMod
        {
            public string Id { get; set; } = "";
            public string Name { get; set; } = "";
            public string Title { get; set; } = "";
            public string Description { get; set; } = "";
            public string Author { get; set; } = "";
            public string Version { get; set; } = "";
            public string Type { get; set; } = "vzc";
            public string Icon { get; set; } = "";
            public string Entry { get; set; } = "";        // manifest.entry，缺省时取首个 *.mixz
            public string EntryUrl { get; set; } = "";    // https://vzcs.local/.../xxx.mixz
            public string WebEntryUrl { get; set; } = ""; // manifest.webEntry，可选
            public string RootPath { get; set; } = "";
            public string BaseUrl { get; set; } = "";
            public bool HasMixz { get; set; }
            public bool HasManifest { get; set; }
            public bool HasOfficialCert { get; set; }
            public string Auth { get; set; } = "unverified";
            public string Status { get; set; } = "ready";
            public Dictionary<string, object> Extra { get; set; } = new();

            // *.vzc 声明式内容定义：只把解析结果带入注册表，不触碰 .mixz 二进制
            public bool HasVzc { get; set; }
            public VzcDefinition? Vzc { get; set; }
            // compatible / incompatible / unknown（未发现 *.vzc 时为 unknown）
            public string VzcCompatibility { get; set; } = "unknown";
        }

        /// <summary>
        /// *.vzc 声明式内容定义的顶层字段（按用户提供实例，原样读取，不做扩展推断）。
        /// loader 段用于基础相容性校验；本类不解析任何二进制、不假设容器布局。
        /// </summary>
        public sealed class VzcDefinition
        {
            public string VzcVersion { get; set; } = "";      // vzc_version
            public string ModId { get; set; } = "";           // mod_id
            public string ModName { get; set; } = "";         // mod_name
            public string Author { get; set; } = "";          // author
            public string Version { get; set; } = "";         // version
            public string Kind { get; set; } = "";            // kind
            public string Runtime { get; set; } = "";         // loader.runtime
            public string EngineVersion { get; set; } = "";   // loader.engine_version
            public string DefinitionFile { get; set; } = "";  // 该 *.vzc 文件名
        }

        public sealed class ScanResult
        {
            public List<VzcMod> Mods { get; set; } = new();
            public List<string> Warnings { get; set; } = new();
        }

        // ---------------------------------------------------------------- 扫描
        /// <summary>每个 VZC 名称下只启用版本号最高的那个版本。</summary>
        public ScanResult Scan()
        {
            var result = new ScanResult();
            if (!Directory.Exists(VzcsRoot)) return result;

            foreach (var nameDir in Directory.EnumerateDirectories(VzcsRoot).OrderBy(p => p))
            {
                string name = Path.GetFileName(nameDir);
                if (name.StartsWith("_") || name.StartsWith(".")) continue; // _demo / 隐藏目录跳过

                var versions = Directory.EnumerateDirectories(nameDir)
                    .Where(d => !Path.GetFileName(d).StartsWith("."))
                    .OrderBy(d => new VersionKey(Path.GetFileName(d)), Comparer<VersionKey>.Create((a, b) => a.CompareTo(b)))
                    .ToList();
                if (versions.Count == 0) continue;

                foreach (string verDir in versions)
                {
                    var mod = ReadMod(nameDir, name, verDir, result.Warnings);
                    if (mod == null) continue;
                    // 状态优先级：incompatible > awaiting-mixz-spec > active / inactive。
                    // 缺 *.mixz 且未声明 webEntry 的版本保留 awaiting-mixz-spec，
                    // 不再被版本择优无条件覆盖；其余仍按「同名只启用最高版本」判定。
                    bool isLatest = verDir == versions[versions.Count - 1];
                    bool awaitingMixz = !mod.HasMixz && string.IsNullOrEmpty(mod.WebEntryUrl);
                    if (mod.VzcCompatibility == "incompatible")
                        mod.Status = "incompatible";
                    else if (awaitingMixz)
                        mod.Status = "awaiting-mixz-spec";
                    else
                        mod.Status = isLatest ? "active" : "inactive";
                    result.Mods.Add(mod);
                }
            }
            return result;
        }

        private VzcMod? ReadMod(string nameDir, string name, string verDir, List<string> warnings)
        {
            string version = Path.GetFileName(verDir);
            string manifestPath = Path.Combine(verDir, "manifest.json");
            string baseUrl = $"https://{VzcsHostName}/{Uri.EscapeDataString(name)}/{Uri.EscapeDataString(version)}";

            var mod = new VzcMod
            {
                Id = name,
                Name = name,
                Title = name,
                Version = version,
                RootPath = verDir,
                BaseUrl = baseUrl,
                HasManifest = File.Exists(manifestPath),
            };

            // *.mixz 主程序：优先 manifest.entry，否则取目录里第一个
            var mixzFiles = Directory.EnumerateFiles(verDir, "*.mixz").OrderBy(p => p).ToList();
            mod.HasMixz = mixzFiles.Count > 0;

            if (mod.HasManifest)
            {
                try
                {
                    using var doc = JsonDocument.Parse(File.ReadAllText(manifestPath));
                    var root = doc.RootElement;
                    mod.Title = Str(root, "title") ?? Str(root, "name") ?? name;
                    mod.Name = Str(root, "name") ?? name;
                    mod.Description = Str(root, "description") ?? Str(root, "desc") ?? "";
                    mod.Author = Str(root, "author") ?? "";
                    mod.Version = Str(root, "version") ?? version;
                    mod.Type = Str(root, "type") ?? "vzc";
                    mod.Icon = Str(root, "icon") ?? "";
                    mod.Entry = Str(root, "entry") ?? "";
                    mod.WebEntryUrl = Str(root, "webEntry") ?? Str(root, "web_entry") ?? "";

                    foreach (var p in root.EnumerateObject())
                    {
                        if (p.Value.ValueKind == JsonValueKind.Object ||
                            p.Value.ValueKind == JsonValueKind.Array) continue;
                        mod.Extra[p.Name] = p.Value.ToString();
                    }
                }
                catch (Exception ex)
                {
                    warnings.Add($"{name}/{version}: manifest.json 解析失败 — {ex.Message}");
                }
            }
            else
            {
                warnings.Add($"{name}/{version}: 缺少 manifest.json");
            }

            // ---- *.vzc 声明式内容定义（只读顶层字段，不触碰任何二进制）----
            var vzcFiles = Directory.EnumerateFiles(verDir, "*.vzc").OrderBy(p => p).ToList();
            mod.HasVzc = vzcFiles.Count > 0;
            if (mod.HasVzc)
            {
                // 多定义合并规则未由规范确认：只解析首个并记 warning，不臆造合并语义
                if (vzcFiles.Count > 1)
                    warnings.Add($"{name}/{version}: 发现 {vzcFiles.Count} 个 *.vzc，仅解析首个 {Path.GetFileName(vzcFiles[0])}");
                try
                {
                    using var vdoc = JsonDocument.Parse(File.ReadAllText(vzcFiles[0]));
                    var vroot = vdoc.RootElement;
                    var def = new VzcDefinition
                    {
                        VzcVersion = Str(vroot, "vzc_version") ?? "",
                        ModId = Str(vroot, "mod_id") ?? "",
                        ModName = Str(vroot, "mod_name") ?? "",
                        Author = Str(vroot, "author") ?? "",
                        Version = Str(vroot, "version") ?? "",
                        Kind = Str(vroot, "kind") ?? "",
                        DefinitionFile = Path.GetFileName(vzcFiles[0]),
                    };
                    if (vroot.ValueKind == JsonValueKind.Object &&
                        vroot.TryGetProperty("loader", out var loader) &&
                        loader.ValueKind == JsonValueKind.Object)
                    {
                        def.Runtime = Str(loader, "runtime") ?? "";
                        def.EngineVersion = Str(loader, "engine_version") ?? "";
                    }
                    mod.Vzc = def;

                    // 基础相容性校验：只校验声明，不加载 / 不解析 .mixz 二进制
                    if (!string.Equals(def.Runtime, "NepInRx-13", StringComparison.OrdinalIgnoreCase))
                    {
                        mod.VzcCompatibility = "incompatible";
                        warnings.Add($"{name}/{version}: .vzc 不相容 — loader.runtime='{def.Runtime}'，要求 'NepInRx-13'");
                    }
                    if (!IsEngine3xCompatible(def.EngineVersion))
                    {
                        mod.VzcCompatibility = "incompatible";
                        warnings.Add($"{name}/{version}: .vzc 不相容 — loader.engine_version='{def.EngineVersion}' 与 3.x 不相容（或格式待规范确认）");
                    }
                    if (mod.VzcCompatibility != "incompatible")
                        mod.VzcCompatibility = "compatible";
                }
                catch (Exception ex)
                {
                    mod.VzcCompatibility = "unknown";
                    warnings.Add($"{name}/{version}: *.vzc 解析失败 — {ex.Message}");
                }
            }

            if (!string.IsNullOrEmpty(mod.Entry))
            {
                // 防目录穿越：只允许落在当前版本目录内
                string resolved = Path.GetFullPath(Path.Combine(verDir, mod.Entry));
                if (!resolved.StartsWith(Path.GetFullPath(verDir) + Path.DirectorySeparatorChar,
                        StringComparison.OrdinalIgnoreCase))
                {
                    warnings.Add($"{name}/{version}: entry 越界，已忽略");
                    mod.Entry = "";
                }
                else if (!File.Exists(resolved))
                {
                    warnings.Add($"{name}/{version}: entry 指向的文件不存在");
                }
            }
            if (string.IsNullOrEmpty(mod.Entry) && mod.HasMixz)
                mod.Entry = Path.GetFileName(mixzFiles[0]);

            if (!string.IsNullOrEmpty(mod.Entry))
                mod.EntryUrl = baseUrl + "/" + Uri.EscapeDataString(mod.Entry.Replace('\\', '/'));
            if (!string.IsNullOrEmpty(mod.WebEntryUrl) && !mod.WebEntryUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                mod.WebEntryUrl = baseUrl + "/" + mod.WebEntryUrl.Replace('\\', '/');

            // 官方证书只做「存在性」标记，不做密码学校验：
            // 真正的验签需要 xzc.xiemi.cer 的公钥与签名算法规范（Android 端为 verifyZip）。
            mod.HasOfficialCert = File.Exists(Path.Combine(verDir, "xzc.xiemi.cer")) ||
                                  File.Exists(Path.Combine(nameDir, "xzc.xiemi.cer")) ||
                                  File.Exists(Path.Combine(VzcsRoot, "xzc.xiemi.cer"));
            mod.Auth = mod.HasOfficialCert ? "cert-present" : "unverified";

            if (!mod.HasMixz && string.IsNullOrEmpty(mod.WebEntryUrl))
            {
                mod.Status = "awaiting-mixz-spec";
                warnings.Add($"{name}/{version}: 未找到 *.mixz 主程序，且未声明 webEntry");
            }
            return mod;
        }

        private static string? Str(JsonElement obj, string key)
        {
            if (obj.ValueKind != JsonValueKind.Object) return null;
            if (!obj.TryGetProperty(key, out var v)) return null;
            return v.ValueKind == JsonValueKind.String ? v.GetString() : v.ToString();
        }

        // engine_version 与 3.x 的相容性判定。
        // 知识缺口：该字段的取值规范（是否区间表达式、是否 SemVer 范围）尚未确认。
        // 此处只做保守判定：字符串中存在「主版本为 3」的版本令牌即视为相容，
        // 兼容 3.0.0 / 3.1 / 3.x / ^3.0.0 / >=3.0.0 / >=3.0.0 <4.0.0 等常见写法；
        // 解析不出主版本 3 即返回 false（由调用方记 warning 并标 incompatible）。
        // 不臆造完整区间语法；规范确认后应替换为本方法的严格实现。
        private static bool IsEngine3xCompatible(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return false;
            foreach (Match m in Regex.Matches(raw, @"(?<![0-9])(\d+)(?:\.\d+|[.xX])*"))
            {
                if (int.TryParse(m.Groups[1].Value, out int major) && major == 3) return true;
            }
            return false;
        }

        private readonly struct VersionKey : IComparable<VersionKey>
        {
            private readonly int[] _parts;
            private readonly string _raw;
            public VersionKey(string raw)
            {
                _raw = raw;
                _parts = raw.Split('.', '-', '_')
                            .Select(s => int.TryParse(s.TrimStart('v', 'V'), out int n) ? n : 0)
                            .ToArray();
            }
            public int CompareTo(VersionKey other)
            {
                int n = Math.Max(_parts.Length, other._parts.Length);
                for (int i = 0; i < n; i++)
                {
                    int a = i < _parts.Length ? _parts[i] : 0;
                    int b = i < other._parts.Length ? other._parts[i] : 0;
                    if (a != b) return a.CompareTo(b);
                }
                return string.Compare(_raw, other._raw, StringComparison.OrdinalIgnoreCase);
            }
        }

        // ---------------------------------------------------------------- 与前端通信
        // 注册表统一按 camelCase 序列化，与 Core_Dimension/vzc-runtime.js 的读取键一致。
        // 不设 DictionaryKeyPolicy：VzcMod.Extra 的键是 manifest 原始字段名，必须原样保留。
        private static readonly JsonSerializerOptions RegistryJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        public void PostRegistry(CoreWebView2 core, ScanResult? scan = null)
        {
            scan ??= Scan();
            string json = JsonSerializer.Serialize(new
            {
                type = "vzc:registry",
                root = VzcsRoot,
                mods = scan.Mods,
                warnings = scan.Warnings,
            }, RegistryJsonOptions);
            core.PostWebMessageAsJson(json);
        }

        /// <summary>
        /// 激活某个 VZC。这里是「执行器接缝」：当前实现把入口 URL 交给前端运行时，
        /// 接上 NepInRx 13 的真实执行器后，在此处改为载入并运行 *.mixz。
        /// </summary>
        public void Activate(string id, CoreWebView2 core)
        {
            var mod = Scan().Mods.FirstOrDefault(m =>
                m.Status == "active" &&
                string.Equals(m.Id, id, StringComparison.OrdinalIgnoreCase));
            if (mod == null) return;

            core.PostWebMessageAsJson(JsonSerializer.Serialize(new
            {
                type = "vzc:activate",
                mod,
            }, RegistryJsonOptions));
        }
    }
}
