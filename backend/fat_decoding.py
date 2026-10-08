"""
fat_decoding.py
Decoding / encoding layer for the 10 Random Forest features.
Code meanings: World Bank Microdata Library, FAT India 2021-2023 (catalog 8230),
data dictionary F1, variable pages V18 (a5a), V889 (d3a), V891 (d3c),
V907 (d7a), V908 (d7b), V94 (b13b5).

The trained model is NOT touched. Raw codes stay as the model saw them.
"""
from __future__ import annotations
import pandas as pd

MODEL_FEATURES = ["s7", "a6", "d3c", "a5a", "b5f_decoded", "b5g_decoded",
                  "d3a", "d7a", "d7b", "b13b5"]

# ---------------------------------------------------------------- official maps
# Shared official scheme on d3a/d7a/d7b/b13b5: 1 Yes, 2 No, -9 Don't Know, -7 Not Applicable
YES_NO_OFFICIAL = {1: "Yes", 2: "No", -9: "Don't know", -7: "Not applicable"}

A5A_OFFICIAL = {
    1: "Agriculture", 2: "Livestock", 3: "Food Processing", 4: "Wearing apparel",
    5: "Motor vehicles", 6: "Pharmaceuticals", 7: "Wholesale or retail",
    8: "Financial services", 9: "Land transport", 10: "Health services",
    11: "Leather goods", 12: "Accommodation", 13: "Bricks", 14: "Cement",
    15: "Iron and Steel", 101: "Other manufacturing", 102: "Other services",
}
# Codes that actually occur in your data (the model has only ever seen these)
A5A_OBSERVED = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 101, 102]

DECODE_MAPS = {
    "a5a": A5A_OFFICIAL,
    "d3a": YES_NO_OFFICIAL,
    "d7a": YES_NO_OFFICIAL,
    "d7b": YES_NO_OFFICIAL,
    "b13b5": YES_NO_OFFICIAL,
}


def decode_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add *_decoded columns. Originals are kept. Raises on any unmapped code."""
    out = df.copy()
    for col, mp in DECODE_MAPS.items():
        bad = sorted(set(out[col].dropna().unique()) - set(mp))
        if bad:
            raise ValueError(f"{col}: codes not in official codebook: {bad}")
        out[f"{col}_decoded"] = out[col].map(mp)

    # d3c: the codebook gives a label ("No. - needed to borrow but not get it")
    # and a name only for -9 (Don't Know). All other values are plain numbers,
    # NOT categories. So: numeric count, with -9 -> missing + explicit flag.
    c = out["d3c"]
    out["d3c_dont_know"] = c.eq(-9)
    out["d3c_decoded"] = c.where(c.ne(-9)).astype("Int64")
    return out


# ------------------------------------------------------- frontend <-> model
FE_YES_NO = ["Yes", "No"]
FE_YES_NO_DK = ["Yes", "No", "Don't know"]
_FE_TO_RAW = {"Yes": 1, "No": 2, "Don't know": -9}

# b5f_decoded / b5g_decoded were fed to the model as these strings
# (per your CSV: b5f Yes/No, b5g Yes/No/Don't Know). Verified at runtime below.
_FE_TO_B5G = {"Yes": "Yes", "No": "No", "Don't know": "Don't Know"}
_FE_TO_B5F = {"Yes": "Yes", "No": "No"}

SECTOR_TO_CODE = {A5A_OFFICIAL[c]: c for c in A5A_OBSERVED}

FRONTEND_SCHEMA = {
    "employees":                 {"type": "integer", "min": 5, "max": 4000},   # s7
    "year_started":              {"type": "year", "dont_know_allowed": True},  # a6
    "sector":                    {"type": "dropdown", "options": list(SECTOR_TO_CODE)},  # a5a
    "loan_needed_not_received_count": {"type": "integer", "min": 0, "dont_know_allowed": True},  # d3c
    "has_website":               {"type": "yes_no", "options": FE_YES_NO},       # b5f
    "uses_social_media":         {"type": "yes_no_dk", "options": FE_YES_NO_DK},  # b5g
    "financed_equipment":        {"type": "yes_no_dk", "options": FE_YES_NO_DK},  # d3a
    "aware_gov_support":         {"type": "yes_no", "options": FE_YES_NO},       # d7a (no -9 in data)
    "benefited_gov_support":     {"type": "yes_no_dk", "options": FE_YES_NO_DK},  # d7b
    "sells_via_own_website":     {"type": "yes_no_dk", "options": FE_YES_NO_DK},  # b13b5
}


def _yn(value: str, allowed: list[str], field: str) -> str:
    if value not in allowed:
        raise ValueError(f"{field}: {value!r} not in {allowed}")
    return value


def encode_payload(p: dict) -> tuple[dict, list[str]]:
    """Frontend payload -> exact raw/model representation. Returns (row, warnings)."""
    warns: list[str] = []
    s7 = int(p["employees"])
    if not 5 <= s7 <= 4000:
        warns.append(f"employees={s7} outside training range 5-4000")

    year = p.get("year_started")
    a6 = -9 if year is None else int(year)
    if year is not None and year > 2017:
        warns.append(f"year_started={year} later than any training firm (max 2017)")

    cnt = p.get("loan_needed_not_received_count")
    d3c = -9 if cnt is None else int(cnt)
    if cnt is not None and not 0 <= d3c <= 31:
        warns.append(f"d3c={d3c} outside training range 0-31")

    sector = p["sector"]
    if sector not in SECTOR_TO_CODE:
        raise ValueError(f"sector: {sector!r} not one of {list(SECTOR_TO_CODE)}")

    row = {
        "s7": s7,
        "a6": a6,
        "d3c": d3c,
        "a5a": SECTOR_TO_CODE[sector],
        "b5f_decoded": _FE_TO_B5F[_yn(p["has_website"], FE_YES_NO, "has_website")],
        "b5g_decoded": _FE_TO_B5G[_yn(p["uses_social_media"], FE_YES_NO_DK, "uses_social_media")],
        "d3a": _FE_TO_RAW[_yn(p["financed_equipment"], FE_YES_NO_DK, "financed_equipment")],
        "d7a": _FE_TO_RAW[_yn(p["aware_gov_support"], FE_YES_NO, "aware_gov_support")],
        "d7b": _FE_TO_RAW[_yn(p["benefited_gov_support"], FE_YES_NO_DK, "benefited_gov_support")],
        "b13b5": _FE_TO_RAW[_yn(p["sells_via_own_website"], FE_YES_NO_DK, "sells_via_own_website")],
    }
    return row, warns


def predict(model, payload: dict, threshold: float = 0.33, pos_label=1) -> dict:
    """pos_label = the class value your model uses for Adopter (check model.classes_)."""
    row, warns = encode_payload(payload)
    cols = list(getattr(model, "feature_names_in_", MODEL_FEATURES))
    X = pd.DataFrame([row])[cols]
    p = float(model.predict_proba(X)[0][list(model.classes_).index(pos_label)])
    return {"probability": p, "threshold": threshold,
            "label": "Adopter" if p >= threshold else "Non-Adopter",
            "warnings": warns, "model_input": row}


# ------------------------------------------------------------ verification
def row_to_payload(r: pd.Series) -> dict:
    """Rebuild what the frontend would have sent, from an existing CSV row."""
    to_fe = {1: "Yes", 2: "No", -9: "Don't know"}
    return {
        "employees": int(r["s7"]),
        "year_started": None if r["a6"] == -9 else int(r["a6"]),
        "sector": A5A_OFFICIAL[int(r["a5a"])],
        "loan_needed_not_received_count": None if r["d3c"] == -9 else int(r["d3c"]),
        "has_website": r["b5f_decoded"],
        "uses_social_media": "Don't know" if r["b5g_decoded"] == "Don't Know" else r["b5g_decoded"],
        "financed_equipment": to_fe[int(r["d3a"])],
        "aware_gov_support": to_fe[int(r["d7a"])],
        "benefited_gov_support": to_fe[int(r["d7b"])],
        "sells_via_own_website": to_fe[int(r["b13b5"])],
    }


def verify_roundtrip(df: pd.DataFrame, model=None, pos_label=1) -> None:
    """decode -> frontend payload -> encode must reproduce every training row exactly;
    optionally also confirms identical model probabilities."""
    rows = [encode_payload(row_to_payload(r))[0] for _, r in df.iterrows()]
    enc = pd.DataFrame(rows)[MODEL_FEATURES]
    ref = df[MODEL_FEATURES].reset_index(drop=True)
    mism = (enc.astype(object) != ref.astype(object))
    assert not mism.to_numpy().any(), f"round-trip mismatch in: {list(mism.columns[mism.any()])}"
    if model is not None:
        cols = list(getattr(model, "feature_names_in_", MODEL_FEATURES))
        i = list(model.classes_).index(pos_label)
        p_ref = model.predict_proba(ref[cols])[:, i]
        p_enc = model.predict_proba(enc[cols])[:, i]
        assert (p_ref == p_enc).all(), "probabilities differ after round-trip"
    print(f"OK: {len(df)} rows round-trip exactly" + (" and give identical probabilities" if model is not None else ""))