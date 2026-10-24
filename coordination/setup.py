"""Generate private credentials and configure this user's Codex without logging secrets."""
from __future__ import annotations

import argparse
import json
import re
import secrets
import tomllib
from pathlib import Path

from .mailbox import AGENTS

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".coordination"


def initialize():
    STATE.mkdir(exist_ok=True)
    path = STATE / "credentials.json"
    if not path.exists():
        path.write_text(json.dumps({agent: secrets.token_urlsafe(48) for agent in AGENTS}, indent=2), encoding="utf-8")
    tokens = json.loads(path.read_text(encoding="utf-8"))
    if set(tokens) != set(AGENTS):
        raise ValueError("Existing credentials have unexpected agent identities.")
    return tokens


def configure_codex(tokens, config_path: Path):
    original = config_path.read_text(encoding="utf-8-sig") if config_path.exists() else ""
    before = tomllib.loads(original)
    entry = ("\n[mcp_servers.xtrain_mailbox]\n"
             'url = "http://127.0.0.1:8765/mcp"\n'
             'http_headers = { Authorization = ' + json.dumps("Bearer " + tokens["aiden.sol"]) + " }\n"
             "startup_timeout_sec = 30\n"
             "tool_timeout_sec = 60\n")
    pattern = r"(?ms)^\[mcp_servers\.xtrain_mailbox\][^\n]*\n.*?(?=^\[|\Z)"
    if "xtrain_mailbox" in before.get("mcp_servers", {}):
        if re.search(r"(?m)^\[mcp_servers\.xtrain_mailbox\.", original):
            raise ValueError("Existing mailbox has subtables; review config manually before changing it.")
        result, count = re.subn(pattern, lambda _: entry.lstrip("\n"), original)
        if count != 1:
            raise ValueError("Cannot safely replace the existing mailbox configuration.")
    else:
        result = original.rstrip() + "\n" + entry
    after = tomllib.loads(result)
    expected = dict(before)
    expected["mcp_servers"] = dict(before.get("mcp_servers", {}))
    expected["mcp_servers"]["xtrain_mailbox"] = after["mcp_servers"]["xtrain_mailbox"]
    if expected != after:
        raise ValueError("Refusing to change unrelated Codex settings.")
    backup = STATE / "codex-config.before.toml"
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    config_path.parent.mkdir(exist_ok=True, parents=True)
    config_path.write_text(result, encoding="utf-8")


def write_connection_notes(tokens, public_url: str):
    public_url = public_url.rstrip("/")
    endpoint = public_url + "/mcp" if public_url else "PUBLIC_URL_NOT_STARTED_YET"
    notes = ["# Private XTrain connector setup", "",
             "Keep this file local; share only the selected teammate's credential privately.",
             "Never paste these credentials into GitHub, public issues, or TEAM_CONTEXT.md.", "",
             f"Public MCP URL: {endpoint}", "Local Codex URL: http://127.0.0.1:8765/mcp", "",
             "For Claude web: Customize > Connectors > Add custom connector.",
             "Use the public MCP URL. Choose No sign in for OAuth, then add the",
             "Authorization request header below for the selected agent. Enable the",
             "connector in the conversation and paste the startup prompt from coordination/README.md.",
             "The header is the authentication; do not omit it.", ""]
    for agent, token in tokens.items():
        notes.extend([f"## {agent}", "", f"Authorization: Bearer {token}", ""])
    notes.extend(["Quick Tunnel addresses change after restart. Keep the host awake.",
                  "An idle Claude conversation must still be prompted to check its inbox.", ""])
    (STATE / "CONNECTIONS.private.md").write_text("\n".join(notes), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--configure-codex", action="store_true")
    parser.add_argument("--public-url", default="")
    args = parser.parse_args()
    credentials = initialize()
    write_connection_notes(credentials, args.public_url)
    if args.configure_codex:
        configure_codex(credentials, Path.home() / ".codex" / "config.toml")
    print("Private credentials and connection notes prepared in .coordination/. No secrets printed.")
    if args.configure_codex:
        print("Codex mailbox entry configured; unrelated settings preserved. Refresh MCP tools in the app.")
