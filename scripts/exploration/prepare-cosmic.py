"""Download measured catalogues and bounded JPL ephemerides. No synthetic objects.
Requires astropy. JPL requests are serial and raw responses retain checksums.
"""

import gzip
import csv, hashlib, io, json, math, subprocess, urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from astropy.cosmology import Planck18

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/web/public/exploration/cosmic/catalogue.json"
objects, sources = [], []


def fetch(name, url, query=None):
    args = [
        "curl",
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        "--max-time",
        "180",
        "-A",
        "ZeroToBeyond-CosmicExplorer/1.0 (https://zerotobeyond.pages.dev/)",
    ]
    if query:
        args += [
            "--data-urlencode",
            "REQUEST=doQuery",
            "--data-urlencode",
            "LANG=ADQL",
            "--data-urlencode",
            "FORMAT=csv",
            "--data-urlencode",
            "QUERY=" + query,
        ]
    cache = Path("/tmp/ztb-cosmic-raw")
    cache.mkdir(exist_ok=True)
    key = cache / hashlib.sha256((url + (query or "")).encode()).hexdigest()
    raw = key.read_bytes() if key.exists() else subprocess.check_output(args + [url])
    if not key.exists():
        key.write_bytes(raw)
    sources.append(
        dict(
            name=name,
            url=url,
            query=query or url,
            sha256=hashlib.sha256(raw).hexdigest(),
        )
    )
    return gzip.decompress(raw).decode() if url.endswith(".gz") else raw.decode()


def xyz(ra, dec, d):
    ra, dec = math.radians(float(ra)), math.radians(float(dec))
    return [
        d * math.cos(dec) * math.cos(ra),
        d * math.cos(dec) * math.sin(ra),
        d * math.sin(dec),
    ]


start = datetime.now(timezone.utc).date() - timedelta(days=15)
stop = start + timedelta(days=30)
# J2000 equatorial vectors relative to the Sun; kilometres and TDB.
bodies = [
    ("Sun", "10", "star", 695700, "#fff7e3"),
    ("Mercury", "199", "planet", 2439.7, "#b6aba3"),
    ("Venus", "299", "planet", 6051.8, "#e9d5af"),
    ("Earth", "399", "planet", 6371, "#79b9ef"),
    ("Moon", "301", "moon", 1737.4, "#c1c3c8"),
    ("Mars", "499", "planet", 3389.5, "#d38b67"),
    ("Jupiter", "599", "planet", 69911, "#d4baa1"),
    ("Saturn", "699", "planet", 58232, "#e6d6ab"),
    ("Uranus", "799", "planet", 25362, "#b4dfdf"),
    ("Neptune", "899", "planet", 24622, "#7099d3"),
    ("James Webb", "-170", "spacecraft", 0, "#ffd878"),
    ("Voyager 1", "-31", "spacecraft", 0, "#8ce2c2"),
    ("Voyager 2", "-32", "spacecraft", 0, "#8ce2c2"),
    ("New Horizons", "-98", "spacecraft", 0, "#ed8def"),
    ("Parker Solar Probe", "-96", "spacecraft", 0, "#ffb080"),
    ("Juno", "-61", "spacecraft", 0, "#ed8def"),
]
for name, code, kind, radius, color in bodies:
    p = dict(
        format="json",
        COMMAND="'" + code + "'",
        CENTER="'500@10'",
        MAKE_EPHEM="'YES'",
        EPHEM_TYPE="'VECTORS'",
        START_TIME="'" + str(start) + "'",
        STOP_TIME="'" + str(stop) + "'",
        STEP_SIZE="'6 h'",
        OUT_UNITS="'KM-S'",
        VEC_TABLE="'2'",
        CSV_FORMAT="'YES'",
        REF_PLANE="'FRAME'",
        REF_SYSTEM="'ICRF'",
        TIME_TYPE="'TDB'",
        OBJ_DATA="'NO'",
    )
    url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(p)
    data = json.loads(fetch("JPL Horizons: " + name, url))
    text = data.get("result", "")
    if data.get("error") or "$$SOE" not in text:
        raise RuntimeError(name + ": " + str(data.get("error", text[-500:])))
    rows = list(
        csv.reader(io.StringIO(text.split("$$SOE")[1].split("$$EOE")[0].strip()))
    )
    samples = [dict(jd=float(r[0]), position=[float(x) for x in r[2:5]]) for r in rows]
    if len(samples) != 121 or any(
        not math.isfinite(v) for s in samples for v in s["position"]
    ):
        raise ValueError(name)
    objects.append(
        dict(
            id=code,
            name=name,
            kind=kind,
            radiusKm=radius,
            color=color,
            position=samples[60]["position"],
            samples=samples,
            source="https://ssd.jpl.nasa.gov/horizons/",
            method="Horizons ephemeris; heliocentric ICRF, km; 6-hour linear interpolation, not live telemetry",
            epoch=str(start) + " to " + str(stop) + " TDB",
        )
    )
    print(name, flush=True)
# HYG covers the whole sky; unknown-distance sentinel rows are excluded.
raw = fetch(
    "HYG v4.1 — David Nash / Astronexus; CC BY-SA 4.0",
    "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv",
)
sources[-1][
    "query"
] = "0 < distance < 100000 pc (exclude unknown-distance sentinel); magnitude <=8 OR distance <=100 pc; sorted by apparent magnitude"
stars = []
for r in csv.DictReader(io.StringIO(raw)):
    distance, magnitude = float(r["dist"]), float(r["mag"])
    if not 0 < distance < 100000 or not math.isfinite(distance):
        continue
    if magnitude > 8 and distance > 100:
        continue
    stars.append(
        dict(
            id="hyg-" + r["id"],
            name=r["proper"]
            or r["bf"].strip()
            or ("HIP " + r["hip"] if r["hip"] else "HYG " + r["id"]),
            kind="star",
            position=[float(r[k]) * 3.085677581491367e13 for k in ("x", "y", "z")],
            color="#e4e7ed",
            magnitude=magnitude,
            colorIndex=float(r["ci"]) if r["ci"] else None,
            source="https://github.com/astronexus/HYG-Database",
            method="HYG v4.1 / Hipparcos, Yale and Gliese; published distance; all-sky brightness/nearby selection. Marker size encodes apparent magnitude, not physical radius.",
            epoch="Catalogue J2000.0; not live positions",
        )
    )
if len(stars) < 1000:
    raise ValueError("HYG returned too few valid stars")
objects.extend(sorted(stars, key=lambda o: o["magnitude"]))
print("HYG", len(stars), flush=True)
# Stratified real spectroscopic detections, never filled outside survey coverage.
for low, high in [(0.003, 0.1), (0.1, 0.5), (0.5, 1), (1, 2), (2, 8)]:
    sql = f"SELECT TOP 2000 specObjID,ra,dec,z,class FROM SpecObj WHERE sciencePrimary=1 AND zWarning=0 AND z>{low} AND z<={high} AND class IN ('GALAXY','QSO') ORDER BY specObjID"
    url = (
        "https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?"
        + urllib.parse.urlencode({"cmd": sql, "format": "csv"})
    )
    raw = fetch("SDSS DR17", url)
    lines = raw.splitlines()
    raw = "\n".join(l for l in lines if not l.startswith("#"))
    rows = list(csv.DictReader(io.StringIO(raw)))
    for r in rows:
        if "z" not in r:
            raise ValueError("Invalid SDSS response: " + raw[:300])
        z = float(r["z"])
        d = Planck18.comoving_distance(z).value * 3.085677581491367e19
        objects.append(
            dict(
                id="sdss-" + r["specObjID"],
                name="SDSS " + r["specObjID"],
                kind="quasar" if r["class"] == "QSO" else "galaxy",
                position=xyz(r["ra"], r["dec"], d),
                color="#e4c59d" if r["class"] == "GALAXY" else "#c9a3ff",
                redshift=z,
                lookbackGyr=float(Planck18.lookback_time(z).value),
                source="https://www.sdss4.org/dr17/",
                method="Measured spectroscopic redshift; Planck18 comoving distance; colour denotes category, not observed colour",
                epoch="DR17 catalogue; observations on our past light cone",
            )
        )
    print("SDSS", low, len(rows), flush=True)
result = dict(
    version=1,
    retrieved=datetime.now(timezone.utc).isoformat(),
    objects=objects,
    sources=sources,
    limits=[
        "Measured objects only; incomplete, quality-filtered, deterministic catalogue samples.",
        "No invented galaxy shapes, star systems, or cosmic-web filaments.",
        "Star catalogue positions are fixed at their catalogue epoch. Galaxy distances are cosmology-derived, not a simultaneous photograph.",
        "Marker radii and brightness are enlarged for selection; neutral/category marker colours are not true-colour photographs.",
        "Survey extent is not the edge of the universe.",
        "HYG is an all-sky measured bright/nearby star selection, not a complete Milky Way census. Catalogue holes are not empty space.",
        "HYG v4.1 derived stellar dataset: attribution David Nash / Astronexus, CC BY-SA 4.0. Original catalogue contributions credited by HYG.",
        "Star glyphs show apparent brightness; unknown physical radii are never invented.",
    ],
)
OUT.parent.mkdir(parents=True, exist_ok=True)
chunks = []
for offset in range(0, len(objects), 20000):
    part = OUT.with_name(f"catalogue-{offset // 20000 + 1}.json")
    part.write_text(json.dumps(objects[offset : offset + 20000], separators=(",", ":")))
    chunks.append(f"/exploration/cosmic/{part.name}")
OUT.write_text(json.dumps({**result, "objects": [], "chunks": chunks}, separators=(",", ":")))
print("Saved", len(objects), "objects", OUT, flush=True)

solar = {
    **result,
    "objects": [o for o in objects if o.get("samples")],
    "sources": [s for s in sources if "Horizons" in s["name"]],
    "limits": [
        "Bounded Horizons snapshot, not live telemetry. Linear interpolation every six hours."
    ],
}
OUT.with_name("solar-system.json").write_text(json.dumps(solar, separators=(",", ":")))
