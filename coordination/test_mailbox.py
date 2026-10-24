"""Run with: python -m unittest coordination.test_mailbox -v."""
import json
import tempfile
import time
import unittest
from pathlib import Path

from starlette.testclient import TestClient

from .mailbox import AGENTS, ContextSource, CoordinationError, Mailbox
from .server import create_app
from .setup import configure_codex


class MailboxTests(unittest.TestCase):
    def setUp(self):
        temp_parent = Path(__file__).resolve().parents[1] / ".coordination" / "test-temp"
        temp_parent.mkdir(parents=True, exist_ok=True)
        self.directory = tempfile.TemporaryDirectory(dir=temp_parent)
        self.root = Path(self.directory.name)
        (self.root / "robot").mkdir()
        (self.root / "TEAM_CONTEXT.md").write_text("Read team context first. Orchestrator aiden.sol.", encoding="utf-8")
        (self.root / "robot" / "CONTEXT.md").write_text("Pi 4B, Grove sensors. Pins unknown.", encoding="utf-8")
        self.state = self.root / ".coordination"
        self.box = Mailbox(self.state / "mailbox.sqlite3", ContextSource(self.root))

    def tearDown(self):
        self.directory.cleanup()

    def lease(self, agent):
        context = self.box.get_context(agent)
        result = self.box.acknowledge_context(agent, context["revision"], context["read_ticket"],
                                              "Read both files; coordinate with aiden.sol and verify hardware pins.")
        return result["lease_token"]

    def test_all_operational_tools_require_read_and_ack(self):
        calls = [lambda: self.box.send_message("fullstack", "", "aiden.sol", "Interface", "Question"),
                 lambda: self.box.read_inbox("fullstack", ""),
                 lambda: self.box.acknowledge_message("fullstack", "", 1),
                 lambda: self.box.report_status("fullstack", "", "ready", "Ready"),
                 lambda: self.box.update_task("fullstack", "", "one", "fullstack", "Build interface"),
                 lambda: self.box.get_team_status("fullstack", "")]
        for call in calls:
            with self.assertRaisesRegex(CoordinationError, "READ_REQUIRED"):
                call()

    def test_read_ticket_is_one_use_and_bound_to_identity(self):
        context = self.box.get_context("fullstack")
        args = context["revision"], context["read_ticket"], "I read the team and hardware context in full."
        with self.assertRaisesRegex(CoordinationError, "READ_REQUIRED"):
            self.box.acknowledge_context("hardware.embedded", *args)
        self.box.acknowledge_context("fullstack", *args)
        with self.assertRaisesRegex(CoordinationError, "READ_REQUIRED"):
            self.box.acknowledge_context("fullstack", *args)

    def test_context_change_invalidates_existing_lease_and_unacked_ticket(self):
        lease = self.lease("fullstack")
        ticket = self.box.get_context("fullstack")
        (self.root / "robot" / "CONTEXT.md").write_text("New verified hardware information", encoding="utf-8")
        with self.assertRaisesRegex(CoordinationError, "CONTEXT_CHANGED"):
            self.box.read_inbox("fullstack", lease)
        with self.assertRaisesRegex(CoordinationError, "CONTEXT_CHANGED"):
            self.box.acknowledge_context("fullstack", ticket["revision"], ticket["read_ticket"], "I read the older context in full.")
        self.box.read_inbox("fullstack", self.lease("fullstack"))

    def test_expired_lease_and_cross_agent_lease_are_rejected(self):
        lease = self.lease("fullstack")
        with self.assertRaisesRegex(CoordinationError, "READ_REQUIRED"):
            self.box.read_inbox("hardware.embedded", lease)
        with self.box.connect() as db:
            db.execute("UPDATE leases SET expires=?", (time.time() - 1,))
        with self.assertRaisesRegex(CoordinationError, "READ_REQUIRED"):
            self.box.read_inbox("fullstack", lease)

    def test_messages_persist_and_private_inboxes_are_isolated(self):
        sender, receiver, other = self.lease("fullstack"), self.lease("aiden.sol"), self.lease("hardware.embedded")
        message = self.box.send_message("fullstack", sender, "aiden.sol", "Interface", "Propose timestamped frames.")
        restarted = Mailbox(self.state / "mailbox.sqlite3", ContextSource(self.root))
        self.assertEqual(restarted.read_inbox("aiden.sol", receiver)["messages"][0]["id"], message["message_id"])
        self.assertEqual(restarted.read_inbox("hardware.embedded", other)["messages"], [])
        with self.assertRaises(CoordinationError):
            restarted.acknowledge_message("hardware.embedded", other, message["message_id"])
        restarted.acknowledge_message("aiden.sol", receiver, message["message_id"])
        self.assertEqual(restarted.read_inbox("aiden.sol", receiver)["messages"], [])

    def test_broadcast_receipts_are_independent(self):
        one, two = self.lease("aiden.sol"), self.lease("fullstack")
        message = self.box.send_message("aiden.sol", one, "all", "Read context", "Check the current context first.")
        self.box.acknowledge_message("aiden.sol", one, message["message_id"])
        self.assertEqual(len(self.box.read_inbox("fullstack", two)["messages"]), 1)

    def test_only_orchestrator_assigns_and_completion_requires_evidence(self):
        lead, worker = self.lease("aiden.sol"), self.lease("fullstack")
        with self.assertRaises(CoordinationError):
            self.box.update_task("fullstack", worker, "api", "fullstack", "Agree on interface")
        self.box.update_task("aiden.sol", lead, "api", "fullstack", "Agree on interface")
        with self.assertRaises(CoordinationError):
            self.box.update_task("fullstack", worker, "api", "hardware.embedded", "Agree on interface")
        with self.assertRaises(CoordinationError):
            self.box.update_task("fullstack", worker, "api", "fullstack", "Agree on interface", "done")
        self.box.update_task("fullstack", worker, "api", "fullstack", "Agree on interface", "done", "Schema agreed in commit abc123")

    def test_remote_context_failure_does_not_fall_back_to_local(self):
        from unittest.mock import patch
        with patch("urllib.request.urlopen", side_effect=OSError("offline")):
            with self.assertRaisesRegex(CoordinationError, "Cloud context unavailable"):
                ContextSource(self.root, "https://raw.githubusercontent.com/example/repo/main").load()

    def test_codex_configuration_preserves_unrelated_settings_and_is_idempotent(self):
        config = self.root / "config.toml"
        config.write_text('model = "existing-model"\n[mcp_servers.other]\nurl = "https://example.com/mcp"\n', encoding="utf-8")
        import coordination.setup as setup
        old_state = setup.STATE
        setup.STATE = self.state
        try:
            tokens = {agent: agent.replace(".", "-") + "x" * 48 for agent in AGENTS}
            configure_codex(tokens, config)
            first = config.read_text(encoding="utf-8")
            configure_codex(tokens, config)
            self.assertEqual(config.read_text(encoding="utf-8"), first)
            self.assertIn('model = "existing-model"', first)
            self.assertIn("[mcp_servers.other]", first)
        finally:
            setup.STATE = old_state

    def test_http_authentication_and_real_mcp_tool_calls(self):
        tokens = {agent: agent.replace(".", "-") + "x" * 48 for agent in AGENTS}
        (self.state / "credentials.json").write_text(json.dumps(tokens), encoding="utf-8")
        with TestClient(create_app(self.root, self.state), base_url="http://127.0.0.1:8765") as client:
            self.assertEqual(client.get("/health").status_code, 200)
            self.assertEqual(client.post("/mcp", json={}).status_code, 401)
            headers = {"Authorization": "Bearer " + tokens["fullstack"],
                       "Accept": "application/json, text/event-stream"}
            initialized = client.post("/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 0,
                "method": "initialize", "params": {"protocolVersion": "2025-03-26", "capabilities": {},
                    "clientInfo": {"name": "xtrain-tests", "version": "1.0"}}})
            self.assertEqual(initialized.status_code, 200, initialized.text)
            headers["MCP-Protocol-Version"] = initialized.json()["result"]["protocolVersion"]

            def call(name, arguments):
                response = client.post("/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 1,
                    "method": "tools/call", "params": {"name": name, "arguments": arguments}})
                self.assertEqual(response.status_code, 200, response.text)
                return response.json()["result"]

            def data(result):
                self.assertFalse(result.get("isError"), result)
                return result.get("structuredContent") or json.loads(result["content"][0]["text"])

            blocked = call("read_inbox", {"lease_token": ""})
            self.assertTrue(blocked["isError"])
            context = data(call("get_context", {}))
            ack = data(call("acknowledge_context", {"revision": context["revision"],
                "read_ticket": context["read_ticket"], "summary": "Read both contexts; own fullstack and coordinate with aiden.sol."}))
            result = call("report_status", {"lease_token": ack["lease_token"], "state": "ready", "details": "HTTP integration verified."})
            self.assertEqual(data(result)["agent"], "fullstack")


if __name__ == "__main__":
    unittest.main()
