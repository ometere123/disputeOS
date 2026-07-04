# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import re
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Vocabulary — shared enums used across templates, cases, verdicts, appeals.
# ---------------------------------------------------------------------------

VERDICT_CATEGORIES = {
    "complainant_wins",
    "respondent_wins",
    "split_settlement",
    "partial_refund",
    "redo_required",
    "no_fault",
    "insufficient_evidence",
    "unverifiable",
    "manual_review_required",
    "appeal_granted",
    "appeal_rejected",
}

# Verdict categories a validator review is allowed to *resolve to* directly.
# appeal_granted / appeal_rejected are outcomes of the appeal flow, not of
# the first-pass review.
PRIMARY_VERDICT_CATEGORIES = VERDICT_CATEGORIES - {"appeal_granted", "appeal_rejected"}

FALLBACK_VERDICT_CATEGORIES = {"insufficient_evidence", "unverifiable", "manual_review_required"}

WINNER_CATEGORIES = {"complainant", "respondent", "split", "none"}

EVIDENCE_ALIGNMENT_BANDS = ["none", "weak", "moderate", "strong", "decisive"]
RULE_FIT_BANDS = ["none", "weak", "partial", "strong", "exact"]

SETTLEMENT_MODES = {
    "escrow_release",
    "refund",
    "split_payment",
    "non_monetary_verdict",
    "external_settlement_instruction",
}

APPEAL_BASES = {
    "new_evidence",
    "wrong_rule_interpretation",
    "evidence_misread",
    "timeline_misread",
    "settlement_disproportionate",
    "identity_or_party_error",
}

# App-scoped roles an app owner can delegate. "owner" itself is never stored
# here — it is derived from RegisteredApp.owner directly.
APP_ROLES = {"admin", "moderator"}

# Safety cap on the protocol-level settlement fee — 10% max, set by the
# protocol admin (the address that deployed the contract).
MAX_PROTOCOL_FEE_BPS = 1000

# Settlement bands per the Equivalence Principle strategy (Spec section 18 / 21).
# Validators compare *bands*, not raw basis points, so a leader saying 6000/4000
# and a validator saying 6500/3500 still agree: both round to the 6000/4000 band.
SETTLEMENT_BANDS = [0, 2500, 5000, 7500, 10000]

# Confidence is compared in coarse bands too, so 80 vs 84 still agrees.
CONFIDENCE_BAND_WIDTH = 20

LIST_DELIMITER = "|"


def _nearest_band(value: int, bands: list) -> int:
    return min(bands, key=lambda b: abs(b - value))


def _confidence_band(confidence: int) -> int:
    return min(confidence // CONFIDENCE_BAND_WIDTH, 100 // CONFIDENCE_BAND_WIDTH)


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _is_probably_url(value: str) -> bool:
    return bool(re.match(r"^https?://[^\s]{4,}$", value.strip()))


def _join_list(items) -> str:
    return LIST_DELIMITER.join(str(item) for item in items)


def _split_list(value: str) -> list:
    return [part for part in value.split(LIST_DELIMITER) if part]


# ---------------------------------------------------------------------------
# Evidence fetching — called inside nondet closures (get_webpage is nondet).
# Each validator independently fetches the same URLs; the Equivalence Principle
# then makes them agree on the conclusion drawn from the content, not the raw
# text. This is the core trust-minimized evidence review story.
# ---------------------------------------------------------------------------

FETCH_CHARS_PER_URL = 1500   # cap per URL so one huge page can't swamp prompt
FETCH_CHARS_TOTAL   = 6000   # cap across all URLs combined


def _fetch_evidence_block(evidence_data: list) -> str:
    """Build the Evidence section of the prompt, fetching each URL.

    evidence_data: list of (ev_type, title, party_label, statement, url)
    """
    sections = []
    total_chars = 0
    for ev_type, title, party_label, statement, url in evidence_data:
        if total_chars >= FETCH_CHARS_TOTAL:
            fetched = "(skipped — total fetch budget reached)"
        else:
            try:
                raw_page = gl.nondet.get_webpage(url)
                content = raw_page.strip()[:FETCH_CHARS_PER_URL]
                total_chars += len(content)
                fetched = content if content else "(page returned empty content)"
            except Exception as exc:
                fetched = f"(fetch failed: {exc})"
        sections.append(
            f"- [{ev_type}] {title} (submitted by {party_label})\n"
            f"  Statement: {statement}\n"
            f"  URL: {url}\n"
            f"  Fetched content:\n{fetched}"
        )
    return "\n\n".join(sections) if sections else "No evidence was submitted."


def _fetch_url_list(urls: list) -> str:
    """Fetch a plain list of URLs (used for appeal additional evidence)."""
    if not urls:
        return "None provided."
    parts = []
    for url in urls:
        try:
            content = gl.nondet.get_webpage(url).strip()[:FETCH_CHARS_PER_URL]
            parts.append(f"URL: {url}\nContent:\n{content or '(empty)'}")
        except Exception as exc:
            parts.append(f"URL: {url}\nContent: (fetch failed: {exc})")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# LLM JSON parsing — module-level so they can be called from nondet closures
# without pickling `self` (a storage-backed Contract instance).
# ---------------------------------------------------------------------------


def _clean_json_text(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"```$", "", text.strip())
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace >= 0 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text.strip()


def _fallback_verdict(allowed_verdicts: set, reason_code: str, short_reason: str) -> dict:
    if "manual_review_required" in allowed_verdicts:
        verdict = "manual_review_required"
    elif "insufficient_evidence" in allowed_verdicts:
        verdict = "insufficient_evidence"
    elif allowed_verdicts:
        verdict = sorted(allowed_verdicts)[0]
    else:
        verdict = "manual_review_required"

    return {
        "verdict": verdict,
        "winner": "none",
        "complainant_bps": 5000,
        "respondent_bps": 5000,
        "confidence": 0,
        "evidence_alignment": "none",
        "rule_fit": "none",
        "appeal_allowed": True,
        "reason_code": reason_code[:64],
        "short_reason": short_reason[:240],
    }


def _fallback_appeal(reason_code: str, short_reason: str) -> dict:
    return {
        "appeal_verdict": "manual_review_required",
        "final_verdict_changed": False,
        "new_verdict": "",
        "new_complainant_bps": 5000,
        "new_respondent_bps": 5000,
        "confidence": 0,
        "reason_code": reason_code[:64],
        "short_reason": short_reason[:240],
    }


def _parse_and_normalize_verdict(raw: str, allowed_verdicts: set) -> dict:
    try:
        data = json.loads(_clean_json_text(raw))
    except Exception:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_validator_json",
            "Validator output was not valid JSON, so the case requires manual review.",
        )

    if not isinstance(data, dict):
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_validator_shape",
            "Validator output was not a JSON object, so the case requires manual review.",
        )

    verdict = str(data.get("verdict", "")).strip().lower()
    if verdict not in allowed_verdicts:
        return _fallback_verdict(
            allowed_verdicts,
            "unsupported_verdict",
            "Validator returned an unsupported verdict, so the case requires manual review.",
        )

    winner = str(data.get("winner", "")).strip().lower()
    if winner not in WINNER_CATEGORIES:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_winner",
            "Validator returned an invalid winner category, so the case requires manual review.",
        )

    try:
        complainant_bps = int(round(float(data.get("complainant_bps", 0))))
        respondent_bps = int(round(float(data.get("respondent_bps", 0))))
    except Exception:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_settlement_split",
            "Validator returned a non-numeric settlement split, so the case requires manual review.",
        )
    if complainant_bps + respondent_bps != 10000:
        respondent_bps = 10000 - complainant_bps
    if not (0 <= complainant_bps <= 10000) or not (0 <= respondent_bps <= 10000):
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_settlement_range",
            "Validator returned a settlement outside the allowed range, so the case requires manual review.",
        )

    try:
        confidence = int(round(float(data.get("confidence", 0))))
    except Exception:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_confidence",
            "Validator returned non-numeric confidence, so the case requires manual review.",
        )
    confidence = max(0, min(100, confidence))

    evidence_alignment = str(data.get("evidence_alignment", "")).strip().lower()
    if evidence_alignment not in EVIDENCE_ALIGNMENT_BANDS:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_evidence_alignment",
            "Validator returned an invalid evidence alignment band, so the case requires manual review.",
        )

    rule_fit = str(data.get("rule_fit", "")).strip().lower()
    if rule_fit not in RULE_FIT_BANDS:
        return _fallback_verdict(
            allowed_verdicts,
            "invalid_rule_fit",
            "Validator returned an invalid rule-fit band, so the case requires manual review.",
        )

    appeal_allowed = bool(data.get("appeal_allowed", False))

    reason_code = re.sub(r"[^a-z0-9_]+", "_", str(data.get("reason_code", "unspecified")).strip().lower()).strip("_")
    if not reason_code:
        reason_code = "unspecified"
    reason_code = reason_code[:64]

    short_reason = str(data.get("short_reason", "")).strip()[:240]

    return {
        "verdict": verdict,
        "winner": winner,
        "complainant_bps": complainant_bps,
        "respondent_bps": respondent_bps,
        "confidence": confidence,
        "evidence_alignment": evidence_alignment,
        "rule_fit": rule_fit,
        "appeal_allowed": appeal_allowed,
        "reason_code": reason_code,
        "short_reason": short_reason,
    }


def _parse_and_normalize_appeal(raw: str, allowed_verdicts: set) -> dict:
    try:
        data = json.loads(_clean_json_text(raw))
    except Exception:
        return _fallback_appeal(
            "invalid_appeal_json",
            "Appeal validator output was not valid JSON, so the appeal requires manual review.",
        )

    if not isinstance(data, dict):
        return _fallback_appeal(
            "invalid_appeal_shape",
            "Appeal validator output was not a JSON object, so the appeal requires manual review.",
        )

    appeal_verdict = str(data.get("appeal_verdict", "")).strip().lower()
    if appeal_verdict not in {"appeal_granted", "appeal_rejected", "manual_review_required"}:
        return _fallback_appeal(
            "invalid_appeal_verdict",
            "Appeal validator returned an invalid appeal category, so the appeal requires manual review.",
        )

    final_verdict_changed = bool(data.get("final_verdict_changed", False))

    new_verdict = str(data.get("new_verdict", "")).strip().lower()
    if final_verdict_changed and new_verdict not in allowed_verdicts:
        return _fallback_appeal(
            "unsupported_appeal_verdict",
            "Appeal validator returned an unsupported new verdict, so the appeal requires manual review.",
        )

    try:
        new_complainant_bps = int(round(float(data.get("new_complainant_bps", 0))))
        new_respondent_bps = int(round(float(data.get("new_respondent_bps", 0))))
    except Exception:
        return _fallback_appeal(
            "invalid_appeal_split",
            "Appeal validator returned a non-numeric settlement split, so the appeal requires manual review.",
        )
    if new_complainant_bps + new_respondent_bps != 10000:
        new_respondent_bps = 10000 - new_complainant_bps
    if not (0 <= new_complainant_bps <= 10000) or not (0 <= new_respondent_bps <= 10000):
        return _fallback_appeal(
            "invalid_appeal_split_range",
            "Appeal validator returned a settlement outside the allowed range, so the appeal requires manual review.",
        )

    try:
        confidence = int(round(float(data.get("confidence", 0))))
    except Exception:
        return _fallback_appeal(
            "invalid_appeal_confidence",
            "Appeal validator returned non-numeric confidence, so the appeal requires manual review.",
        )
    confidence = max(0, min(100, confidence))

    reason_code = re.sub(r"[^a-z0-9_]+", "_", str(data.get("reason_code", "unspecified")).strip().lower()).strip("_")
    if not reason_code:
        reason_code = "unspecified"
    reason_code = reason_code[:64]

    short_reason = str(data.get("short_reason", "")).strip()[:240]

    return {
        "appeal_verdict": appeal_verdict,
        "final_verdict_changed": final_verdict_changed,
        "new_verdict": new_verdict,
        "new_complainant_bps": new_complainant_bps,
        "new_respondent_bps": new_respondent_bps,
        "confidence": confidence,
        "reason_code": reason_code,
        "short_reason": short_reason,
    }


# ---------------------------------------------------------------------------
# Storage-compatible dataclasses — the reusable Dispute Packet objects.
# ---------------------------------------------------------------------------


@allow_storage
@dataclass
class RegisteredApp:
    app_id: u256
    owner: Address
    name: str
    domain: str
    description: str
    active: bool
    created_at: u256


@allow_storage
@dataclass
class DisputeTemplate:
    template_id: u256
    app_id: u256
    name: str
    case_type: str
    rules: str
    required_evidence: str
    allowed_verdicts: str  # LIST_DELIMITER-joined verdict categories
    settlement_mode: str
    appeal_enabled: bool
    appeal_window: u256
    public_visibility: bool


@allow_storage
@dataclass
class DisputeCase:
    case_id: u256
    app_id: u256
    template_id: u256
    complainant: Address
    respondent: Address
    case_summary: str
    requested_remedy: str
    respondent_response: str
    settlement_amount: str
    status: str
    created_at: u256
    evidence_deadline: u256
    verdict_finalized: bool
    payout_claimed: bool


@allow_storage
@dataclass
class EvidenceItem:
    evidence_id: u256
    case_id: u256
    submitted_by: Address
    evidence_type: str
    title: str
    statement: str
    public_url: str
    submitted_at: u256


@allow_storage
@dataclass
class Verdict:
    case_id: u256
    verdict: str
    winner: str
    complainant_bps: u256
    respondent_bps: u256
    confidence: u256
    evidence_alignment: str
    rule_fit: str
    appeal_allowed: bool
    reason_code: str
    short_reason: str
    issued_at: u256


@allow_storage
@dataclass
class Appeal:
    appeal_id: u256
    case_id: u256
    filed_by: Address
    basis: str
    statement: str
    evidence_urls: str  # LIST_DELIMITER-joined URLs
    status: str
    result: str
    created_at: u256


# ---------------------------------------------------------------------------
# The Contract
# ---------------------------------------------------------------------------


@gl.evm.contract_interface
class _Recipient:
    """Stub interface used purely to route a native GEN value transfer to a
    plain address (EOA). It has no real methods — GenVM's ghost-contract
    mechanism handles the external transfer when emit_transfer is called."""

    class View:
        pass

    class Write:
        pass


class DisputeOSProtocol(gl.Contract):
    # Apps
    apps: TreeMap[u256, RegisteredApp]
    all_app_ids: DynArray[u256]
    next_app_id: u256

    # Templates
    templates: TreeMap[u256, DisputeTemplate]
    all_template_ids: DynArray[u256]
    next_template_id: u256

    # Cases
    cases: TreeMap[u256, DisputeCase]
    all_case_ids: DynArray[u256]
    next_case_id: u256
    case_funded_wei: TreeMap[u256, u256]

    # Evidence (flat list, filtered by case_id on read)
    all_evidence: DynArray[EvidenceItem]
    next_evidence_id: u256

    # Verdicts & appeals
    verdicts: TreeMap[u256, Verdict]
    appeals: TreeMap[u256, Appeal]
    next_appeal_id: u256

    # App-scoped roles. Key is "{app_id}:{address_hex}" -> role ("admin" /
    # "moderator" / "" once revoked). role_holder_keys is an append-only log
    # of every key ever granted, used to enumerate roles for an app since
    # TreeMap itself cannot be iterated by key.
    app_roles: TreeMap[str, str]
    role_holder_keys: DynArray[str]

    # Protocol-level settlement fee. protocol_admin is fixed at deploy time
    # (the deployer) and is the only address that can change the fee.
    protocol_admin: Address
    protocol_fee_recipient: Address
    protocol_fee_bps: u256

    def __init__(self):
        self.next_app_id = u256(1)
        self.next_template_id = u256(1)
        self.next_case_id = u256(1)
        self.next_evidence_id = u256(1)
        self.next_appeal_id = u256(1)
        self.protocol_admin = gl.message.sender_address
        self.protocol_fee_recipient = gl.message.sender_address
        self.protocol_fee_bps = u256(0)

    # -----------------------------------------------------------------
    # App & template methods
    # -----------------------------------------------------------------

    @gl.public.write
    def register_app(self, name: str, domain: str, description: str) -> u256:
        if not (3 <= len(name) <= 80):
            raise gl.vm.UserError("app name must be 3 to 80 characters")
        if not (3 <= len(domain) <= 120):
            raise gl.vm.UserError("domain must be 3 to 120 characters")
        if len(description) == 0:
            raise gl.vm.UserError("description cannot be empty")

        app_id = self.next_app_id
        self.apps[app_id] = RegisteredApp(
            app_id=app_id,
            owner=gl.message.sender_address,
            name=name,
            domain=domain,
            description=description,
            active=True,
            created_at=u256(_now()),
        )
        self.all_app_ids.append(app_id)
        self.next_app_id = u256(app_id + 1)
        return app_id

    @gl.public.write
    def create_template(
        self,
        app_id: u256,
        name: str,
        case_type: str,
        rules: str,
        required_evidence: str,
        allowed_verdicts: list,
        settlement_mode: str,
        appeal_enabled: bool,
        appeal_window: u256,
        public_visibility: bool,
    ) -> u256:
        app = self._get_app_or_raise(app_id)
        if gl.message.sender_address != app.owner:
            raise gl.vm.UserError("only the app owner can create templates")
        if not app.active:
            raise gl.vm.UserError("app is not active")
        if not (30 <= len(rules) <= 3000):
            raise gl.vm.UserError("template rules must be 30 to 3000 characters")
        if len(allowed_verdicts) == 0:
            raise gl.vm.UserError("template must define at least one allowed verdict")
        for v in allowed_verdicts:
            if v not in PRIMARY_VERDICT_CATEGORIES:
                raise gl.vm.UserError(f"unknown verdict category: {v}")
        if settlement_mode not in SETTLEMENT_MODES:
            raise gl.vm.UserError(f"unknown settlement mode: {settlement_mode}")

        template_id = self.next_template_id
        self.templates[template_id] = DisputeTemplate(
            template_id=template_id,
            app_id=app_id,
            name=name,
            case_type=case_type,
            rules=rules,
            required_evidence=required_evidence,
            allowed_verdicts=_join_list(allowed_verdicts),
            settlement_mode=settlement_mode,
            appeal_enabled=appeal_enabled,
            appeal_window=appeal_window,
            public_visibility=public_visibility,
        )
        self.all_template_ids.append(template_id)
        self.next_template_id = u256(template_id + 1)
        return template_id

    # -----------------------------------------------------------------
    # App role methods (admin / moderator delegation)
    # -----------------------------------------------------------------

    @gl.public.write
    def grant_role(self, app_id: u256, address: str, role: str) -> None:
        app = self._get_app_or_raise(app_id)
        if gl.message.sender_address != app.owner:
            raise gl.vm.UserError("only the app owner can grant roles")
        if role not in APP_ROLES:
            raise gl.vm.UserError(f"unknown role: {role} (expected admin or moderator)")
        addr = Address(address)
        if addr == app.owner:
            raise gl.vm.UserError("the app owner already has full access")

        key = self._role_key(app_id, addr)
        is_new_key = key not in self.app_roles
        self.app_roles[key] = role
        if is_new_key:
            self.role_holder_keys.append(key)

    @gl.public.write
    def revoke_role(self, app_id: u256, address: str) -> None:
        app = self._get_app_or_raise(app_id)
        if gl.message.sender_address != app.owner:
            raise gl.vm.UserError("only the app owner can revoke roles")
        addr = Address(address)
        key = self._role_key(app_id, addr)
        if key not in self.app_roles or not self.app_roles[key]:
            raise gl.vm.UserError("this address has no role to revoke")
        self.app_roles[key] = ""

    @gl.public.view
    def get_app_roles(self, app_id: u256) -> list:
        self._get_app_or_raise(app_id)
        prefix = f"{int(app_id)}:"
        results = []
        for key in self.role_holder_keys:
            if not key.startswith(prefix):
                continue
            role = self.app_roles[key] if key in self.app_roles else ""
            if not role:
                continue
            results.append({"address": key[len(prefix):], "role": role})
        return results

    # -----------------------------------------------------------------
    # Protocol fee administration
    # -----------------------------------------------------------------

    @gl.public.write
    def set_protocol_fee(self, recipient: str, fee_bps: u256) -> None:
        if gl.message.sender_address != self.protocol_admin:
            raise gl.vm.UserError("only the protocol admin can set the protocol fee")
        fee_bps_int = int(fee_bps)
        if not (0 <= fee_bps_int <= MAX_PROTOCOL_FEE_BPS):
            raise gl.vm.UserError(f"protocol fee must be between 0 and {MAX_PROTOCOL_FEE_BPS} bps")
        self.protocol_fee_recipient = Address(recipient)
        self.protocol_fee_bps = u256(fee_bps_int)

    @gl.public.view
    def get_protocol_fee_info(self) -> dict:
        return {
            "admin": self.protocol_admin.as_hex,
            "fee_recipient": self.protocol_fee_recipient.as_hex,
            "fee_bps": int(self.protocol_fee_bps),
        }

    # -----------------------------------------------------------------
    # Case methods
    # -----------------------------------------------------------------

    @gl.public.write
    def open_case(
        self,
        app_id: u256,
        template_id: u256,
        respondent: str,
        case_summary: str,
        requested_remedy: str,
        evidence_deadline: u256,
    ) -> u256:
        app = self._get_app_or_raise(app_id)
        if not app.active:
            raise gl.vm.UserError("app is not active")
        template = self._get_template_or_raise(template_id)
        if template.app_id != app_id:
            raise gl.vm.UserError("template does not belong to this app")

        respondent_addr = Address(respondent)
        complainant_addr = gl.message.sender_address
        if respondent_addr == complainant_addr:
            raise gl.vm.UserError("respondent cannot be the same address as complainant")
        if not (30 <= len(case_summary) <= 3000):
            raise gl.vm.UserError("case summary must be 30 to 3000 characters")
        if len(requested_remedy) == 0:
            raise gl.vm.UserError("requested remedy cannot be empty")
        if int(evidence_deadline) <= _now():
            raise gl.vm.UserError("evidence deadline must be in the future")

        case_id = self.next_case_id
        self.cases[case_id] = DisputeCase(
            case_id=case_id,
            app_id=app_id,
            template_id=template_id,
            complainant=complainant_addr,
            respondent=respondent_addr,
            case_summary=case_summary,
            requested_remedy=requested_remedy,
            respondent_response="",
            settlement_amount="0",
            status="case_opened",
            created_at=u256(_now()),
            evidence_deadline=evidence_deadline,
            verdict_finalized=False,
            payout_claimed=False,
        )
        self.case_funded_wei[case_id] = u256(0)
        self.all_case_ids.append(case_id)
        self.next_case_id = u256(case_id + 1)
        return case_id

    @gl.public.write.payable
    def fund_case(self, case_id: u256) -> None:
        case = self._get_case_or_raise(case_id)
        if case.status != "case_opened":
            raise gl.vm.UserError("case is not awaiting funding")
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("case with zero GEN in escrow mode is not allowed")

        self.case_funded_wei[case_id] = value
        case.settlement_amount = f"{int(value) / 10**18:g}"
        # Funding is what makes the case actionable: it notifies the
        # respondent and opens the evidence window in a single hop, since
        # this reference integration has no separate off-chain notifier.
        case.status = "evidence_open"

    @gl.public.write
    def respond_to_case(self, case_id: u256, response_statement: str) -> None:
        case = self._get_case_or_raise(case_id)
        if gl.message.sender_address != case.respondent:
            raise gl.vm.UserError("only the respondent can respond to this case")
        if case.status not in ("evidence_open",):
            raise gl.vm.UserError("case is not open for a respondent statement")
        if len(response_statement) == 0:
            raise gl.vm.UserError("response statement cannot be empty")
        case.respondent_response = response_statement

    @gl.public.write
    def submit_evidence(
        self,
        case_id: u256,
        evidence_type: str,
        title: str,
        statement: str,
        public_url: str,
    ) -> u256:
        case = self._get_case_or_raise(case_id)
        sender = gl.message.sender_address
        if sender not in (case.complainant, case.respondent):
            raise gl.vm.UserError("evidence from unrelated address is not allowed")
        if case.status != "evidence_open":
            raise gl.vm.UserError("evidence window is not open")
        if _now() > int(case.evidence_deadline):
            raise gl.vm.UserError("evidence deadline has passed")
        if not (20 <= len(statement) <= 2000):
            raise gl.vm.UserError("evidence statement must be 20 to 2000 characters")
        if not (8 <= len(public_url) <= 300) or not _is_probably_url(public_url):
            raise gl.vm.UserError("malformed evidence URL")

        party_count = sum(
            1 for e in self.all_evidence if e.case_id == case_id and e.submitted_by == sender
        )
        if party_count >= 8:
            raise gl.vm.UserError("max evidence items per party is 8")

        evidence_id = self.next_evidence_id
        self.all_evidence.append(
            EvidenceItem(
                evidence_id=evidence_id,
                case_id=case_id,
                submitted_by=sender,
                evidence_type=evidence_type,
                title=title,
                statement=statement,
                public_url=public_url,
                submitted_at=u256(_now()),
            )
        )
        self.next_evidence_id = u256(evidence_id + 1)
        return evidence_id

    @gl.public.write
    def close_evidence(self, case_id: u256) -> None:
        case = self._get_case_or_raise(case_id)
        sender = gl.message.sender_address
        app = self.apps[case.app_id]
        deadline_passed = _now() > int(case.evidence_deadline)
        is_party_or_owner = sender in (case.complainant, case.respondent, app.owner)
        is_moderator = self._is_app_moderator_or_admin(case.app_id, sender)
        if case.status != "evidence_open":
            raise gl.vm.UserError("evidence window is not open")
        if not (is_party_or_owner or is_moderator or deadline_passed):
            raise gl.vm.UserError(
                "only a case party, the app owner, an app moderator/admin, or anyone after the deadline may close evidence"
            )
        case.status = "evidence_closed"

    @gl.public.write
    def request_verdict(self, case_id: u256) -> None:
        # No sender restriction: any address may trigger validator review once
        # evidence has closed (this already covers app owners and moderators).
        case = self._get_case_or_raise(case_id)
        if case.status != "evidence_closed":
            raise gl.vm.UserError("verdict request before evidence closes is not allowed")

        template = self.templates[case.template_id]
        evidence_items = [e for e in self.all_evidence if e.case_id == case_id]

        # Static parts (no storage access inside closures — avoids pickling self).
        _header = self._build_verdict_prompt_header(case, template)
        _task = DisputeOSProtocol._VERDICT_TASK
        _allowed = set(_split_list(template.allowed_verdicts)) | FALLBACK_VERDICT_CATEGORIES
        # Evidence data as plain tuples so the closure captures only primitives.
        _evidence_data = [
            (
                e.evidence_type,
                e.title,
                "complainant" if e.submitted_by == case.complainant else "respondent",
                e.statement,
                e.public_url,
            )
            for e in evidence_items
        ]

        def leader_fn():
            # Fetch inside the nondet context so each validator independently
            # retrieves and verifies the evidence URLs.
            evidence_block = _fetch_evidence_block(_evidence_data)
            full_prompt = f"{_header}\n\nEvidence (fetched):\n{evidence_block}\n{_task}"
            raw = gl.nondet.exec_prompt(full_prompt, response_format="json")
            return _parse_and_normalize_verdict(raw, _allowed)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            validator_data = leader_fn()
            return (
                leader_data["verdict"] == validator_data["verdict"]
                and leader_data["winner"] == validator_data["winner"]
                and _nearest_band(leader_data["complainant_bps"], SETTLEMENT_BANDS)
                == _nearest_band(validator_data["complainant_bps"], SETTLEMENT_BANDS)
                and leader_data["evidence_alignment"] == validator_data["evidence_alignment"]
                and leader_data["rule_fit"] == validator_data["rule_fit"]
                and leader_data["appeal_allowed"] == validator_data["appeal_allowed"]
                and _confidence_band(leader_data["confidence"])
                == _confidence_band(validator_data["confidence"])
                and leader_data["reason_code"] == validator_data["reason_code"]
            )

        verdict_data = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        self.verdicts[case_id] = Verdict(
            case_id=case_id,
            verdict=verdict_data["verdict"],
            winner=verdict_data["winner"],
            complainant_bps=u256(verdict_data["complainant_bps"]),
            respondent_bps=u256(verdict_data["respondent_bps"]),
            confidence=u256(verdict_data["confidence"]),
            evidence_alignment=verdict_data["evidence_alignment"],
            rule_fit=verdict_data["rule_fit"],
            appeal_allowed=verdict_data["appeal_allowed"] and template.appeal_enabled,
            reason_code=verdict_data["reason_code"],
            short_reason=verdict_data["short_reason"],
            issued_at=u256(_now()),
        )

        if verdict_data["verdict"] in FALLBACK_VERDICT_CATEGORIES:
            case.status = verdict_data["verdict"]
        else:
            case.status = "verdict_issued"

    @gl.public.write
    def resolve_manual_review(
        self,
        case_id: u256,
        verdict: str,
        winner: str,
        complainant_bps: u256,
        respondent_bps: u256,
        reason_code: str,
        short_reason: str,
    ) -> None:
        case = self._get_case_or_raise(case_id)
        app = self.apps[case.app_id]
        if gl.message.sender_address != app.owner:
            raise gl.vm.UserError("only the app owner can resolve a case flagged for manual review")
        if case.status != "manual_review_required":
            raise gl.vm.UserError("case is not awaiting manual review")

        template = self.templates[case.template_id]
        allowed = set(_split_list(template.allowed_verdicts))
        if verdict not in allowed:
            raise gl.vm.UserError(
                f"verdict must be one of the template's allowed verdicts: {', '.join(sorted(allowed))}"
            )
        if winner not in WINNER_CATEGORIES:
            raise gl.vm.UserError(f"unknown winner category: {winner}")

        complainant_bps_int = int(complainant_bps)
        respondent_bps_int = int(respondent_bps)
        if complainant_bps_int + respondent_bps_int != 10000:
            raise gl.vm.UserError("settlement split must sum to exactly 10000 bps")
        if not (0 <= complainant_bps_int <= 10000) or not (0 <= respondent_bps_int <= 10000):
            raise gl.vm.UserError("settlement split values must each be between 0 and 10000")

        clean_reason_code = re.sub(r"[^a-z0-9_]+", "_", reason_code.strip().lower()).strip("_")
        if not clean_reason_code:
            clean_reason_code = "manual_review_resolved"
        clean_reason_code = clean_reason_code[:64]

        self.verdicts[case_id] = Verdict(
            case_id=case_id,
            verdict=verdict,
            winner=winner,
            complainant_bps=u256(complainant_bps_int),
            respondent_bps=u256(respondent_bps_int),
            confidence=u256(100),
            evidence_alignment="decisive",
            rule_fit="exact",
            # Manual resolution is the app owner's final call — it does not
            # re-enter the automated appeal flow.
            appeal_allowed=False,
            reason_code=clean_reason_code,
            short_reason=short_reason.strip()[:240],
            issued_at=u256(_now()),
        )

        # No appeal window applies to a manual resolution, so this goes
        # straight to "finalized" rather than "verdict_issued" — that lets
        # claim_settlement proceed immediately without a redundant
        # finalize_case call waiting out a window that was never opened.
        case.status = "finalized"
        case.verdict_finalized = True

    # -----------------------------------------------------------------
    # Appeal methods
    # -----------------------------------------------------------------

    @gl.public.write
    def file_appeal(self, case_id: u256, basis: str, statement: str, evidence_urls: list) -> u256:
        case = self._get_case_or_raise(case_id)
        template = self.templates[case.template_id]
        sender = gl.message.sender_address

        if not template.appeal_enabled:
            raise gl.vm.UserError("appeals are not enabled for this template")
        if case.status != "verdict_issued":
            raise gl.vm.UserError("appeal is only allowed while a verdict is active and unappealed")
        if sender not in (case.complainant, case.respondent):
            raise gl.vm.UserError("only a case party may file an appeal")
        if basis not in APPEAL_BASES:
            raise gl.vm.UserError("appeal without a valid appeal basis is not allowed")

        verdict = self.verdicts[case_id]
        if not verdict.appeal_allowed:
            raise gl.vm.UserError("this verdict does not permit an appeal")
        if _now() > int(verdict.issued_at) + int(template.appeal_window):
            raise gl.vm.UserError("appeal after appeal window is not allowed")
        if case_id in self.appeals:
            raise gl.vm.UserError("an appeal has already been filed for this case")

        appeal_id = self.next_appeal_id
        self.appeals[case_id] = Appeal(
            appeal_id=appeal_id,
            case_id=case_id,
            filed_by=sender,
            basis=basis,
            statement=statement,
            evidence_urls=_join_list(evidence_urls),
            status="filed",
            result="",
            created_at=u256(_now()),
        )
        self.next_appeal_id = u256(appeal_id + 1)
        case.status = "appeal_window_open"
        return appeal_id

    @gl.public.write
    def request_appeal_review(self, case_id: u256) -> None:
        case = self._get_case_or_raise(case_id)
        if case.status != "appeal_window_open":
            raise gl.vm.UserError("no pending appeal to review for this case")
        appeal = self.appeals[case_id]
        if appeal.status != "filed":
            raise gl.vm.UserError("appeal has already been reviewed")

        case.status = "appeal_under_review"
        template = self.templates[case.template_id]
        verdict = self.verdicts[case_id]
        evidence_items = [e for e in self.all_evidence if e.case_id == case_id]

        _header = self._build_appeal_prompt_header(case, template, verdict, appeal)
        _task = DisputeOSProtocol._APPEAL_TASK
        _allowed = set(_split_list(template.allowed_verdicts)) | FALLBACK_VERDICT_CATEGORIES
        _evidence_data = [
            (
                e.evidence_type,
                e.title,
                "complainant" if e.submitted_by == case.complainant else "respondent",
                e.statement,
                e.public_url,
            )
            for e in evidence_items
        ]
        _appeal_urls = _split_list(appeal.evidence_urls)

        def leader_fn():
            evidence_block = _fetch_evidence_block(_evidence_data)
            appeal_fetched = _fetch_url_list(_appeal_urls)
            full_prompt = (
                f"{_header}\n\n"
                f"Additional appeal evidence (fetched):\n{appeal_fetched}\n\n"
                f"Original case evidence (fetched):\n{evidence_block}\n"
                f"{_task}"
            )
            raw = gl.nondet.exec_prompt(full_prompt, response_format="json")
            return _parse_and_normalize_appeal(raw, _allowed)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            validator_data = leader_fn()
            return (
                leader_data["appeal_verdict"] == validator_data["appeal_verdict"]
                and leader_data["final_verdict_changed"] == validator_data["final_verdict_changed"]
                and leader_data["new_verdict"] == validator_data["new_verdict"]
                and _nearest_band(leader_data["new_complainant_bps"], SETTLEMENT_BANDS)
                == _nearest_band(validator_data["new_complainant_bps"], SETTLEMENT_BANDS)
                and _confidence_band(leader_data["confidence"])
                == _confidence_band(validator_data["confidence"])
                and leader_data["reason_code"] == validator_data["reason_code"]
            )

        appeal_data = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        if appeal_data["final_verdict_changed"]:
            verdict.verdict = appeal_data["new_verdict"]
            verdict.complainant_bps = u256(appeal_data["new_complainant_bps"])
            verdict.respondent_bps = u256(appeal_data["new_respondent_bps"])
            verdict.confidence = u256(appeal_data["confidence"])
            verdict.reason_code = appeal_data["reason_code"]
            verdict.short_reason = appeal_data["short_reason"]
            verdict.appeal_allowed = False

        appeal.status = "resolved"
        appeal.result = appeal_data["appeal_verdict"]

        if appeal_data["appeal_verdict"] == "manual_review_required":
            case.status = "manual_review_required"
        else:
            case.status = "finalized"
            case.verdict_finalized = True

    # -----------------------------------------------------------------
    # Finalization & settlement
    # -----------------------------------------------------------------

    @gl.public.write
    def finalize_case(self, case_id: u256) -> None:
        case = self._get_case_or_raise(case_id)
        if case.status != "verdict_issued":
            raise gl.vm.UserError("case is not in a finalizable state")

        verdict = self.verdicts[case_id]
        template = self.templates[case.template_id]

        # Note: filing an appeal moves status away from "verdict_issued"
        # immediately (see file_appeal), so reaching this point already
        # guarantees no appeal was filed for this verdict.
        if _now() <= int(verdict.issued_at) + int(template.appeal_window):
            raise gl.vm.UserError("appeal window is still open")

        case.status = "finalized"
        case.verdict_finalized = True

    @gl.public.write
    def claim_settlement(self, case_id: u256) -> None:
        case = self._get_case_or_raise(case_id)
        if case.status != "finalized":
            raise gl.vm.UserError("claim before finalization is not allowed")
        if case.payout_claimed:
            raise gl.vm.UserError("double claim is not allowed")

        template = self.templates[case.template_id]
        verdict = self.verdicts[case_id]

        if verdict.verdict == "manual_review_required":
            raise gl.vm.UserError("no settlement while verdict is manual_review_required")

        bps_sum = int(verdict.complainant_bps) + int(verdict.respondent_bps)
        if bps_sum != 10000:
            raise gl.vm.UserError("settlement split does not equal 10000 bps")

        if template.settlement_mode not in ("escrow_release", "refund", "split_payment"):
            # external_settlement_instruction / non_monetary_verdict: the
            # integrated app reads the verdict and settles off-chain or on
            # its own ledger. DisputeOS just marks the case settled.
            case.status = "settled"
            case.payout_claimed = True
            return

        funded = self.case_funded_wei[case_id]
        if funded == u256(0):
            case.status = "settlement_failed"
            raise gl.vm.UserError("no escrowed GEN is available for this case")

        fee_bps_int = int(self.protocol_fee_bps)
        fee_amount = (int(funded) * fee_bps_int) // 10000 if fee_bps_int > 0 else 0
        distributable = int(funded) - fee_amount

        complainant_share = (distributable * int(verdict.complainant_bps)) // 10000
        respondent_share = distributable - complainant_share

        if fee_amount > 0:
            _Recipient(self.protocol_fee_recipient).emit_transfer(value=u256(fee_amount), on="finalized")
        if complainant_share > 0:
            _Recipient(case.complainant).emit_transfer(value=u256(complainant_share), on="finalized")
        if respondent_share > 0:
            _Recipient(case.respondent).emit_transfer(value=u256(respondent_share), on="finalized")

        case.payout_claimed = True
        case.status = "settled"

    # -----------------------------------------------------------------
    # Read methods
    # -----------------------------------------------------------------

    @gl.public.view
    def get_app(self, app_id: u256) -> dict:
        return self._app_to_dict(self._get_app_or_raise(app_id))

    @gl.public.view
    def get_template(self, template_id: u256) -> dict:
        return self._template_to_dict(self._get_template_or_raise(template_id))

    @gl.public.view
    def get_case(self, case_id: u256) -> dict:
        return self._case_to_dict(self._get_case_or_raise(case_id))

    @gl.public.view
    def get_case_evidence(self, case_id: u256) -> list:
        self._get_case_or_raise(case_id)
        return [self._evidence_to_dict(e) for e in self.all_evidence if e.case_id == case_id]

    @gl.public.view
    def get_case_verdict(self, case_id: u256) -> dict:
        self._get_case_or_raise(case_id)
        if case_id not in self.verdicts:
            return {}
        return self._verdict_to_dict(self.verdicts[case_id])

    @gl.public.view
    def get_case_appeal(self, case_id: u256) -> dict:
        self._get_case_or_raise(case_id)
        if case_id not in self.appeals:
            return {}
        return self._appeal_to_dict(self.appeals[case_id])

    @gl.public.view
    def get_cases_by_app(self, app_id: u256) -> list:
        self._get_app_or_raise(app_id)
        return [
            self._case_to_dict(self.cases[cid])
            for cid in self.all_case_ids
            if self.cases[cid].app_id == app_id
        ]

    @gl.public.view
    def get_cases_by_party(self, address: str) -> list:
        addr = Address(address)
        return [
            self._case_to_dict(self.cases[cid])
            for cid in self.all_case_ids
            if self.cases[cid].complainant == addr or self.cases[cid].respondent == addr
        ]

    @gl.public.view
    def get_app_templates(self, app_id: u256) -> list:
        self._get_app_or_raise(app_id)
        return [
            self._template_to_dict(self.templates[tid])
            for tid in self.all_template_ids
            if self.templates[tid].app_id == app_id
        ]

    @gl.public.view
    def get_all_apps(self) -> list:
        return [self._app_to_dict(self.apps[aid]) for aid in self.all_app_ids]

    @gl.public.view
    def get_all_cases(self) -> list:
        return [self._case_to_dict(self.cases[cid]) for cid in self.all_case_ids]

    # -----------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------

    def _get_app_or_raise(self, app_id: u256) -> RegisteredApp:
        if app_id not in self.apps:
            raise gl.vm.UserError("app not found")
        return self.apps[app_id]

    def _get_template_or_raise(self, template_id: u256) -> DisputeTemplate:
        if template_id not in self.templates:
            raise gl.vm.UserError("template not found")
        return self.templates[template_id]

    def _get_case_or_raise(self, case_id: u256) -> DisputeCase:
        if case_id not in self.cases:
            raise gl.vm.UserError("case not found")
        return self.cases[case_id]

    def _role_key(self, app_id: u256, address: Address) -> str:
        return f"{int(app_id)}:{address.as_hex}"

    def _is_app_moderator_or_admin(self, app_id: u256, address: Address) -> bool:
        key = self._role_key(app_id, address)
        role = self.app_roles[key] if key in self.app_roles else ""
        return role in ("admin", "moderator")

    def _app_to_dict(self, app: RegisteredApp) -> dict:
        return {
            "app_id": int(app.app_id),
            "owner": app.owner.as_hex,
            "name": app.name,
            "domain": app.domain,
            "description": app.description,
            "active": app.active,
            "created_at": int(app.created_at),
        }

    def _template_to_dict(self, t: DisputeTemplate) -> dict:
        return {
            "template_id": int(t.template_id),
            "app_id": int(t.app_id),
            "name": t.name,
            "case_type": t.case_type,
            "rules": t.rules,
            "required_evidence": t.required_evidence,
            "allowed_verdicts": _split_list(t.allowed_verdicts),
            "settlement_mode": t.settlement_mode,
            "appeal_enabled": t.appeal_enabled,
            "appeal_window": int(t.appeal_window),
            "public_visibility": t.public_visibility,
        }

    def _case_to_dict(self, c: DisputeCase) -> dict:
        return {
            "case_id": int(c.case_id),
            "app_id": int(c.app_id),
            "template_id": int(c.template_id),
            "complainant": c.complainant.as_hex,
            "respondent": c.respondent.as_hex,
            "case_summary": c.case_summary,
            "requested_remedy": c.requested_remedy,
            "respondent_response": c.respondent_response,
            "settlement_amount": c.settlement_amount,
            "status": c.status,
            "created_at": int(c.created_at),
            "evidence_deadline": int(c.evidence_deadline),
            "verdict_finalized": c.verdict_finalized,
            "payout_claimed": c.payout_claimed,
        }

    def _evidence_to_dict(self, e: EvidenceItem) -> dict:
        return {
            "evidence_id": int(e.evidence_id),
            "case_id": int(e.case_id),
            "submitted_by": e.submitted_by.as_hex,
            "evidence_type": e.evidence_type,
            "title": e.title,
            "statement": e.statement,
            "public_url": e.public_url,
            "submitted_at": int(e.submitted_at),
        }

    def _verdict_to_dict(self, v: Verdict) -> dict:
        return {
            "case_id": int(v.case_id),
            "verdict": v.verdict,
            "winner": v.winner,
            "complainant_bps": int(v.complainant_bps),
            "respondent_bps": int(v.respondent_bps),
            "confidence": int(v.confidence),
            "evidence_alignment": v.evidence_alignment,
            "rule_fit": v.rule_fit,
            "appeal_allowed": v.appeal_allowed,
            "reason_code": v.reason_code,
            "short_reason": v.short_reason,
            "issued_at": int(v.issued_at),
        }

    def _appeal_to_dict(self, a: Appeal) -> dict:
        return {
            "appeal_id": int(a.appeal_id),
            "case_id": int(a.case_id),
            "filed_by": a.filed_by.as_hex,
            "basis": a.basis,
            "statement": a.statement,
            "evidence_urls": _split_list(a.evidence_urls),
            "status": a.status,
            "result": a.result,
            "created_at": int(a.created_at),
        }

    # -- prompt construction -------------------------------------------------
    # These methods build the *static* parts of each prompt (context, rules,
    # parties, task). The *dynamic* evidence block — which requires fetching
    # each URL via gl.nondet.get_webpage — is built inside leader_fn so it
    # runs in the nondet context on every validator node independently.

    def _build_verdict_prompt_header(self, case: DisputeCase, template: DisputeTemplate) -> str:
        """Static header: everything except the Evidence block."""
        app = self.apps[case.app_id]
        return f"""You are the DisputeOS validator interpreter.

You are reviewing a dispute packet from an integrated app. Each evidence URL
below has been independently fetched so you can verify the content, not just
trust the submitting party's description.

App:
{app.name}

Case type:
{template.case_type}

Rules:
{template.rules}

Allowed verdicts:
{", ".join(_split_list(template.allowed_verdicts))}

Complainant:
{case.complainant.as_hex}

Respondent:
{case.respondent.as_hex}

Case summary:
{case.case_summary}

Requested remedy:
{case.requested_remedy}

Respondent response:
{case.respondent_response or "No response was submitted."}"""

    def _build_appeal_prompt_header(
        self,
        case: DisputeCase,
        template: DisputeTemplate,
        verdict: Verdict,
        appeal: Appeal,
    ) -> str:
        """Static header for the appeal review prompt."""
        return f"""You are the DisputeOS appeal reviewer.

This case already received a canonical verdict. An appeal has been filed
and must be evaluated on its own merits. Each evidence URL has been
independently fetched so you can verify content rather than trusting claims.

Original verdict:
{verdict.verdict} (winner: {verdict.winner}, split: {int(verdict.complainant_bps)}/{int(verdict.respondent_bps)} bps, reason: {verdict.short_reason})

Rules:
{template.rules}

Appeal basis:
{appeal.basis}

Appellant statement:
{appeal.statement}"""

    # -- static task blocks (appended after the dynamic evidence block) -------

    _VERDICT_TASK = """
Task:
Decide the fairest verdict according to the app rules and the fetched evidence.

Evaluate:
1. Which party's claim is better supported by the fetched content?
2. Does the fetched evidence match the stated rules?
3. Are fetched URLs inaccessible, irrelevant, or contradicting the statement?
4. Is the requested remedy proportional?
5. Should the settlement be full, split, partial, or none?
6. Should appeal be allowed?
7. Is the dispute unverifiable or requiring manual review?

Return exactly one JSON object and nothing else.
Do not use markdown fences, bullets, prose, comments, trailing commas, or extra keys.
Use double-quoted JSON strings and booleans true/false.
If the evidence is ambiguous or you cannot comply with this schema, choose
"manual_review_required" with winner "none" and a 5000/5000 split.

Required JSON schema:
{
  "verdict": "complainant_wins | respondent_wins | split_settlement | partial_refund | redo_required | no_fault | insufficient_evidence | unverifiable | manual_review_required",
  "winner": "complainant | respondent | split | none",
  "complainant_bps": 0_to_10000,
  "respondent_bps": 0_to_10000,
  "confidence": 0_to_100,
  "evidence_alignment": "none | weak | moderate | strong | decisive",
  "rule_fit": "none | weak | partial | strong | exact",
  "appeal_allowed": true_or_false,
  "reason_code": "short_snake_case",
  "short_reason": "max 240 chars"
}"""

    _APPEAL_TASK = """
Task:
1. Does the appeal introduce a meaningful reason to change the verdict?
2. Does the new fetched evidence shift the settlement?
3. Was the original rule interpretation materially wrong?
4. Was the original evidence reading materially wrong?

Return exactly one JSON object and nothing else.
Do not use markdown fences, bullets, prose, comments, trailing commas, or extra keys.
Use double-quoted JSON strings and booleans true/false.
If the appeal is ambiguous or you cannot comply with this schema, choose
"manual_review_required", set "final_verdict_changed" to false, and use a
5000/5000 split.

Required JSON schema:
{
  "appeal_verdict": "appeal_granted | appeal_rejected | manual_review_required",
  "final_verdict_changed": true_or_false,
  "new_verdict": "split_settlement",
  "new_complainant_bps": 0_to_10000,
  "new_respondent_bps": 0_to_10000,
  "confidence": 0_to_100,
  "reason_code": "short_snake_case",
  "short_reason": "max 240 chars"
}"""
