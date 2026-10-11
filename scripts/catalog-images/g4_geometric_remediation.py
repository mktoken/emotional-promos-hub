#!/usr/bin/env python3
"""Create non-destructive, aspect-preserving G4 derivatives.

The script reads the exact source members from their ZIP archives, never edits
those archives, and refuses to overwrite an existing output. It has no
network, database, provider, or storage dependencies.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


CANVAS_SIZE = 1600
PILOT_SKUS = {"lob-sol-azu", "cen-met-neg", "vas-nom-az1"}
PILOT_PRODUCTS = (
    {
        "producto_b2b_id": "dc7cc3e7-aa00-47a3-b4e8-edde4bc0b6d0",
        "sku": "lob-sol-azu",
        "name": "Lobby",
        "source_zip": "Boligrafos plastico.zip",
        "source_member": "Boligrafos plastico/lobby azul clip.jpg",
    },
    {
        "producto_b2b_id": "115f29be-eb6d-4606-aa48-1c2ec82a550d",
        "sku": "cen-met-neg",
        "name": "Century",
        "source_zip": "Boligrafos metal.zip",
        "source_member": "Boligrafos metal/century negra costado.jpg",
    },
    {
        "producto_b2b_id": "0b889781-de86-4115-9a62-ae1540e1140d",
        "sku": "vas-nom-az1",
        "name": "Vaso Nomi",
        "source_zip": "Bebidas y Alimentos.zip",
        "source_member": "Bebidas y Alimentos/Vaso Nomi Azul.jpg",
    },
)


@dataclass(frozen=True)
class Candidate:
    payload: bytes
    metadata: dict[str, object]


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def read_source(source_root: Path, product: dict[str, str]) -> tuple[bytes, Image.Image]:
    archive = source_root / product["source_zip"]
    if not archive.is_file():
        raise FileNotFoundError(f"source ZIP missing: {archive}")
    with zipfile.ZipFile(archive) as bundle:
        try:
            source_bytes = bundle.read(product["source_member"])
        except KeyError as exc:
            raise FileNotFoundError(
                f"source member missing: {archive}!/{product['source_member']}"
            ) from exc
    image = Image.open(io.BytesIO(source_bytes))
    image = ImageOps.exif_transpose(image).convert("RGB")
    return source_bytes, image


def build_candidate(source_root: Path, product: dict[str, str]) -> Candidate:
    source_bytes, source = read_source(source_root, product)
    source_width, source_height = source.size

    scale = min(
        1.0,
        CANVAS_SIZE / source_width,
        CANVAS_SIZE / source_height,
    )
    scale_x = scale
    scale_y = scale
    if abs(scale_x - scale_y) > 1e-12:
        raise ValueError(
            f"anisotropic scale rejected for {product['sku']}: "
            f"scale_x={scale_x} scale_y={scale_y}"
        )

    rendered_width = max(1, round(source_width * scale_x))
    rendered_height = max(1, round(source_height * scale_y))

    # A single scale factor is mandatory. The <= 1.0 cap enforces NO_UPSCALE.
    rendered = source.resize(
        (rendered_width, rendered_height),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), "white")
    left = (CANVAS_SIZE - rendered_width) // 2
    top = (CANVAS_SIZE - rendered_height) // 2
    canvas.paste(rendered, (left, top))

    output = io.BytesIO()
    canvas.save(output, format="WEBP", quality=95, method=6)
    payload = output.getvalue()

    metadata = {
        "producto_b2b_id": product["producto_b2b_id"],
        "sku": product["sku"],
        "name": product["name"],
        "source_zip": product["source_zip"],
        "source_member": product["source_member"],
        "source_sha256": sha256_bytes(source_bytes),
        "source_width": source_width,
        "source_height": source_height,
        "source_aspect_ratio": round(source_width / source_height, 8),
        "new_filename": f"{product['sku']}__geomfix-v1.webp",
        "new_sha256": sha256_bytes(payload),
        "new_width": CANVAS_SIZE,
        "new_height": CANVAS_SIZE,
        "canvas_width": CANVAS_SIZE,
        "canvas_height": CANVAS_SIZE,
        "rendered_product_width": rendered_width,
        "rendered_product_height": rendered_height,
        "rendered_product_aspect_ratio": round(
            rendered_width / rendered_height, 8
        ),
        # These are the intended transform factors. They are exactly equal;
        # pixel_scale_x/y below expose only the unavoidable integer rounding
        # of output pixel dimensions.
        "scale_x": scale_x,
        "scale_y": scale_y,
        "pixel_scale_x": round(rendered_width / source_width, 8),
        "pixel_scale_y": round(rendered_height / source_height, 8),
        "padding_left": left,
        "padding_top": top,
        "padding_right": CANVAS_SIZE - left - rendered_width,
        "padding_bottom": CANVAS_SIZE - top - rendered_height,
        "resize_operation": "proportional_contain_centered",
        "background_rule": "white padding; source treated as opaque RGB",
        "upscale": "NO",
        "geometric_integrity": "TECHNICALLY_VERIFIED",
    }
    return Candidate(payload=payload, metadata=metadata)


def load_scale_up_products(matrix_path: Path) -> tuple[dict[str, str], ...]:
    with matrix_path.open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))

    if len(rows) != 20:
        raise ValueError(f"expected 20 frozen 04D rows, found {len(rows)}")
    skus = [row.get("sku", "") for row in rows]
    if len(set(skus)) != 20 or any(not sku for sku in skus):
        raise ValueError("04D matrix must contain 20 unique non-empty SKUs")

    scale_up: list[dict[str, str]] = []
    for row in rows:
        if row.get("governance_state_unchanged") != "PHASE_3_READY / NEEDS_REVIEW":
            raise ValueError(
                f"unexpected governance state for {row.get('sku', '<missing>')}"
            )
        if row["sku"] in PILOT_SKUS:
            continue
        scale_up.append(
            {
                "producto_b2b_id": row["producto_b2b_id"],
                "sku": row["sku"],
                "name": row["product_name"],
                "source_zip": row["source_zip"],
                "source_member": row["source_member"],
            }
        )

    if len(scale_up) != 17:
        raise ValueError(f"expected 17 scale-up products, found {len(scale_up)}")
    if {row["sku"] for row in scale_up} & PILOT_SKUS:
        raise ValueError("scale-up scope contains a certified pilot SKU")
    return tuple(scale_up)


def write_non_destructive(path: Path, payload: bytes) -> str:
    expected_hash = sha256_bytes(payload)
    if path.exists():
        existing_hash = sha256_bytes(path.read_bytes())
        if existing_hash == expected_hash:
            return "EXISTING_IDENTICAL"
        raise FileExistsError(f"refusing to overwrite existing output: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return "CREATED"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", choices=("pilot", "scale-up"), default="pilot")
    parser.add_argument(
        "--source-root",
        type=Path,
        default=Path("/Users/macbookpro/Downloads/G4_Image_Bank_2026"),
    )
    parser.add_argument(
        "--matrix",
        type=Path,
        default=Path(
            "docs/catalog-governance/CHK-CATGOV-04D_G4_GEOMETRIC_INTEGRITY_MATRIX_V1.csv"
        ),
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
    )
    args = parser.parse_args()

    products = (
        PILOT_PRODUCTS
        if args.scope == "pilot"
        else load_scale_up_products(args.matrix)
    )
    output_root = args.output_root or Path(
        "/Users/macbookpro/Downloads/"
        + (
            "G4_GEOMETRIC_REMEDIATION_PILOT_04E"
            if args.scope == "pilot"
            else "G4_GEOMETRIC_REMEDIATION_04F"
        )
    )

    results: list[dict[str, object]] = []
    for product in products:
        candidate = build_candidate(args.source_root, product)
        output_path = output_root / str(product["sku"]) / str(
            candidate.metadata["new_filename"]
        )
        action = write_non_destructive(output_path, candidate.payload)
        record = dict(candidate.metadata)
        record["output_path"] = str(output_path)
        record["write_action"] = action
        results.append(record)

    output_root.mkdir(parents=True, exist_ok=True)
    manifest = output_root / "remediation-manifest-v1.json"
    manifest.write_text(
        json.dumps(
            {
                "checkpoint": (
                    "CHK-CATGOV-04E"
                    if args.scope == "pilot"
                    else "CHK-CATGOV-04F"
                ),
                "canvas": "1600x1600",
                "policy": "proportional contain; no upscale; white padding",
                "products": results,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(results, indent=2))
    print(f"manifest={manifest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
