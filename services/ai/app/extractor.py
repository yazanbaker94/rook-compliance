import re
from dataclasses import asdict, dataclass

@dataclass(frozen=True)
class ProposedObligation:
    title: str
    requirement: str
    frequency: str
    source_page: int
    source_text: str
    confidence: float

FREQUENCIES = {
    "monthly": "Monthly",
    "each calendar month": "Monthly",
    "quarterly": "Quarterly",
    "annual": "Annual",
    "annually": "Annual",
    "each sample": "For each sample",
}

def _page_sections(text: str):
    marker = re.compile(r"(?:---\s*)?PAGE\s+(\d+)(?:\s*---)?", re.IGNORECASE)
    matches = list(marker.finditer(text))
    if not matches:
        return [(1, text)]
    sections = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        sections.append((int(match.group(1)), text[match.end():end]))
    return sections

def _frequency(sentence: str) -> str:
    lowered = sentence.lower()
    for phrase, label in FREQUENCIES.items():
        if phrase in lowered:
            return label
    return "As required"

def _title(sentence: str) -> str:
    lowered = sentence.lower()
    if "inspect" in lowered:
        return "Complete required inspection"
    if "retain" in lowered or "record" in lowered:
        return "Retain supporting records"
    if "submit" in lowered or "report" in lowered:
        return "Prepare required submission"
    if "notify" in lowered:
        return "Notify regulator of event"
    return "Review approval requirement"

def extract_obligations(text: str):
    proposals = []
    obligation_terms = re.compile(r"\b(shall|must|required to|no later than)\b", re.IGNORECASE)
    for page, section in _page_sections(text):
        sentences = re.split(r"(?<=[.!?])\s+", section)
        for sentence in sentences:
            lines = [line.strip() for line in sentence.splitlines() if line.strip()]
            first_obligation_line = next((index for index, line in enumerate(lines) if obligation_terms.search(line)), -1)
            if first_obligation_line < 0:
                continue
            start = first_obligation_line
            match = obligation_terms.search(lines[first_obligation_line])
            if match and not lines[first_obligation_line][:match.start()].strip() and first_obligation_line > 0:
                previous = lines[first_obligation_line - 1]
                if len(previous.split()) >= 4 and not previous.isupper() and not re.match(r"^\d+(?:\.\d+)?\b", previous):
                    start -= 1
            clean = " ".join(" ".join(lines[start:]).split())
            if len(clean) < 25 or not obligation_terms.search(clean):
                continue
            proposals.append(ProposedObligation(
                title=_title(clean),
                requirement=clean,
                frequency=_frequency(clean),
                source_page=page,
                source_text=clean,
                confidence=0.96 if "shall" in clean.lower() or "must" in clean.lower() else 0.86,
            ))
    return [asdict(item) for item in proposals]
