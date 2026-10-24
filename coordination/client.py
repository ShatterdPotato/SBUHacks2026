"""Local coordinator client. Never prints bearer tokens or saved lease tokens."""
import argparse
import asyncio
import json
from pathlib import Path

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from .mailbox import AGENTS

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".coordination"
TOOLS = {"inbox": "read_inbox", "send": "send_message", "status": "report_status",
         "team": "get_team_status", "task": "update_task", "receipt": "acknowledge_message"}


async def main(args):
    credentials = json.loads((STATE / "credentials.json").read_text(encoding="utf-8"))
    session_file = STATE / ("session-" + args.agent + ".json")
    saved = json.loads(session_file.read_text(encoding="utf-8")) if session_file.exists() else {}
    payload = json.loads(Path(args.payload_file).read_text(encoding="utf-8-sig")) if args.payload_file else {}
    headers = {"Authorization": "Bearer " + credentials[args.agent]}
    async with streamablehttp_client(args.url, headers=headers, timeout=30) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            if args.action == "context":
                tool, payload = "get_context", {}
            elif args.action == "ack":
                tool, payload = "acknowledge_context", {"revision": saved["revision"],
                    "read_ticket": saved["read_ticket"], "summary": args.summary}
            else:
                tool = TOOLS[args.action]
                payload["lease_token"] = saved.get("lease_token", "")
            result = await session.call_tool(tool, payload)
            if result.isError:
                raise RuntimeError(" ".join(block.text for block in result.content if hasattr(block, "text")))
            data = result.structuredContent or json.loads(result.content[0].text)
            if args.action == "context":
                session_file.write_text(json.dumps({"revision": data["revision"], "read_ticket": data["read_ticket"]}), encoding="utf-8")
                print(json.dumps({k: v for k, v in data.items() if k != "read_ticket"}, indent=2))
            elif args.action == "ack":
                session_file.write_text(json.dumps(data), encoding="utf-8")
                print(json.dumps({k: v for k, v in data.items() if k != "lease_token"}, indent=2))
            else:
                print(json.dumps(data, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["context", "ack", *TOOLS])
    parser.add_argument("--agent", choices=AGENTS, default="aiden.sol")
    parser.add_argument("--url", default="http://127.0.0.1:8765/mcp")
    parser.add_argument("--summary", default="")
    parser.add_argument("--payload-file")
    asyncio.run(main(parser.parse_args()))
