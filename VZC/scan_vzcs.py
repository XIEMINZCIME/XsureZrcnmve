"""扫描 vzcs/<VZC名称>/<版本号>/ 并生成 vzcs/index.json。

用途：不启动 C# 宿主、直接用浏览器打开 Core_Dimension/index.html 时，
      VZC 运行时会读取这份注册表（同源静态服务器下可用）。
      宿主模式下由 VzcHost.cs 实时扫描，本脚本只作离线/调试用途。

字段契约（与 VzcHost.cs 的 VzcMod / VzcDefinition + CamelCase 序列化逐字段对齐）：
  Mod 输出 22 个 camelCase 键：
    id, name, title, description, author, version, type, icon, entry,
    entryUrl, webEntryUrl, rootPath, baseUrl, hasMixz, hasManifest,
    hasOfficialCert, auth, status, extra, hasVzc, vzc, vzcCompatibility
  vzc 子对象（*.vzc 声明式定义）输出 9 个 camelCase 键：
    vzcVersion, modId, modName, author, version, kind, runtime,
    engineVersion, definitionFile
  无 *.vzc 时 hasVzc=false / vzc=null / vzcCompatibility="unknown"。
  extra 的字典键保持 manifest.json 原始字段名，不做任何改名（对齐宿主
  不设 DictionaryKeyPolicy）；键名统一 camelCase，不出现 PascalCase。
  相容性：loader.runtime 必须为 NepInRx-13（忽略大小写）且
  engine_version 主版本为 3；不满足标 incompatible 并记 warning。
  状态优先级：incompatible > awaiting-mixz-spec > active / inactive。

用法：python VZC/scan_vzcs.py [XZ根目录]
"""

import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
VZCS = ROOT / "vzcs"

# 与 VzcHost.cs 的 NepInRx-13 校验、IsEngine3xCompatible 保守判定保持一致。
NEPINRX_RUNTIME = "NepInRx-13"
_ENGINE_TOKEN = re.compile(r"(?<![0-9])(\d+)(?:\.\d+|[.xX])*")


def engine_3x_compatible(raw):
    """字符串中是否存在「主版本为 3」的版本令牌（与宿主同一保守判定）。"""
    if not isinstance(raw, str) or not raw.strip():
        return False
    for m in _ENGINE_TOKEN.finditer(raw):
        try:
            if int(m.group(1)) == 3:
                return True
        except ValueError:
            continue
    return False


def _vzc_str(obj, key):
    """对齐 VzcHost.Str：从对象取标量转字符串；缺失或非对象返回空串。"""
    if not isinstance(obj, dict) or key not in obj:
        return ""
    v = obj[key]
    if isinstance(v, str):
        return v
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)


def read_vzc(path, warnings, label):
    """读取单个 *.vzc 顶层字段并做相容性校验，返回 (定义字典或 None, 相容性)。

    语义与 VzcHost.ReadMod 的 *.vzc 分支逐项对齐；只解析 JSON 声明，
    不触碰任何 *.mixz 二进制、不假设容器布局。
    """
    try:
        root = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        warnings.append(f"{label}: *.vzc 解析失败 — {exc}")
        return None, "unknown"

    loader = root.get("loader") if isinstance(root, dict) else None
    if not isinstance(loader, dict):
        loader = {}
    definition = {
        "vzcVersion": _vzc_str(root, "vzc_version"),
        "modId": _vzc_str(root, "mod_id"),
        "modName": _vzc_str(root, "mod_name"),
        "author": _vzc_str(root, "author"),
        "version": _vzc_str(root, "version"),
        "kind": _vzc_str(root, "kind"),
        "runtime": _vzc_str(loader, "runtime"),
        "engineVersion": _vzc_str(loader, "engine_version"),
        "definitionFile": path.name,
    }

    compat = "compatible"
    if definition["runtime"].lower() != NEPINRX_RUNTIME.lower():
        compat = "incompatible"
        warnings.append(
            f"{label}: .vzc 不相容 — loader.runtime='{definition['runtime']}'，要求 '{NEPINRX_RUNTIME}'")
    if not engine_3x_compatible(definition["engineVersion"]):
        compat = "incompatible"
        warnings.append(
            f"{label}: .vzc 不相容 — loader.engine_version='{definition['engineVersion']}' "
            f"与 3.x 不相容（或格式待规范确认）")
    return definition, compat


def version_key(text):
    return tuple(int(n) if n.isdigit() else 0 for n in re.split(r"[.\-_]", text)) or (0,)


def read_manifest(path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return {"__error__": str(exc)}


def scan():
    mods, warnings = [], []
    if not VZCS.is_dir():
        VZCS.mkdir(parents=True, exist_ok=True)

    for name_dir in sorted(p for p in VZCS.iterdir() if p.is_dir()):
        if name_dir.name.startswith(("_", ".")):
            continue
        versions = sorted(
            (p for p in name_dir.iterdir() if p.is_dir() and not p.name.startswith(".")),
            key=lambda p: version_key(p.name),
        )
        if not versions:
            continue
        latest = versions[-1]

        for ver_dir in versions:
            version = ver_dir.name
            base_url = f"https://vzcs.local/{quote(name_dir.name)}/{quote(version)}"
            manifest_path = ver_dir / "manifest.json"
            has_manifest = manifest_path.is_file()
            mf = read_manifest(manifest_path) if has_manifest else {}
            if "__error__" in mf:
                warnings.append(f"{name_dir.name}/{version}: manifest.json 解析失败 — {mf['__error__']}")
            if not has_manifest:
                warnings.append(f"{name_dir.name}/{version}: 缺少 manifest.json")

            mixz = sorted(ver_dir.glob("*.mixz"))
            vzc_files = sorted(ver_dir.glob("*.vzc"))
            has_vzc = bool(vzc_files)
            vzc_def = None
            vzc_compat = "unknown"
            label = f"{name_dir.name}/{version}"
            if has_vzc:
                if len(vzc_files) > 1:
                    warnings.append(
                        f"{label}: 发现 {len(vzc_files)} 个 *.vzc，仅解析首个 {vzc_files[0].name}")
                vzc_def, vzc_compat = read_vzc(vzc_files[0], warnings, label)

            entry = str(mf.get("entry") or "")
            if entry:
                resolved = (ver_dir / entry).resolve()
                if ver_dir.resolve() not in resolved.parents:
                    warnings.append(f"{name_dir.name}/{version}: entry 越界，已忽略")
                    entry = ""
                elif not resolved.is_file():
                    warnings.append(f"{name_dir.name}/{version}: entry 指向的文件不存在")
            if not entry and mixz:
                entry = mixz[0].name

            web_entry = str(mf.get("webEntry") or mf.get("web_entry") or "")
            if web_entry and not web_entry.startswith(("http://", "https://")):
                web_entry = base_url + "/" + web_entry.replace("\\", "/")

            cert = any(
                (p / "xzc.xiemi.cer").is_file()
                for p in (ver_dir, name_dir, VZCS)
            )
            # 状态优先级与 VzcHost.Scan() 一致：
            # incompatible > awaiting-mixz-spec > active / inactive
            awaiting_mixz = not mixz and not web_entry
            if awaiting_mixz:
                warnings.append(f"{label}: 未找到 *.mixz 主程序，且未声明 webEntry")
            if vzc_compat == "incompatible":
                status = "incompatible"
            elif awaiting_mixz:
                status = "awaiting-mixz-spec"
            else:
                status = "active" if ver_dir == latest else "inactive"

            mods.append({
                "id": name_dir.name,
                "name": str(mf.get("name") or name_dir.name),
                "title": str(mf.get("title") or mf.get("name") or name_dir.name),
                "description": str(mf.get("description") or mf.get("desc") or ""),
                "author": str(mf.get("author") or ""),
                "version": str(mf.get("version") or version),
                "type": str(mf.get("type") or "vzc"),
                "icon": str(mf.get("icon") or ""),
                "entry": entry,
                "entryUrl": base_url + "/" + quote(entry.replace("\\", "/")) if entry else "",
                "webEntryUrl": web_entry,
                "rootPath": str(ver_dir),
                "baseUrl": base_url,
                "hasMixz": bool(mixz),
                "hasManifest": has_manifest,
                "hasOfficialCert": cert,
                "auth": "cert-present" if cert else "unverified",
                "status": status,
                "extra": {k: str(v) for k, v in mf.items()
                          if not isinstance(v, (dict, list)) and k != "__error__"},
                "hasVzc": has_vzc,
                "vzc": vzc_def,
                "vzcCompatibility": vzc_compat,
            })

    return {"type": "vzc:registry", "root": str(VZCS), "mods": mods, "warnings": warnings}


def main():
    data = scan()
    out = VZCS / "index.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    active = [m for m in data["mods"] if m["status"] == "active"]
    print(f"[VZC] 扫描完成：{len(active)} 个生效版本 / 共 {len(data['mods'])} 条 → {out}")
    for w in data["warnings"]:
        print("  ! " + w)


if __name__ == "__main__":
    main()
