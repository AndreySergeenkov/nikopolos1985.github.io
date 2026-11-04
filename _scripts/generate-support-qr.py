"""Regenerate the four donation QR images from the addresses in support/index.html.

Dependency: py -m pip install "qrcode[pil]"
Run from any directory: py _scripts/generate-support-qr.py
The QR payload is the exact address, without an amount or payment-service URL.
"""

from html.parser import HTMLParser
from pathlib import Path

import qrcode


ROOT = Path(__file__).resolve().parents[1]


class Addresses(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.addresses = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "code" and "wallet-address" in attrs.get("class", "").split():
            self.current = attrs["id"].removesuffix("-address")
            self.addresses[self.current] = ""

    def handle_data(self, data):
        if self.current:
            self.addresses[self.current] += data

    def handle_endtag(self, tag):
        if tag == "code":
            self.current = None


def main():
    parser = Addresses()
    parser.feed((ROOT / "support/index.html").read_text(encoding="utf-8"))
    expected = {"ethereum", "bitcoin", "solana", "tron"}
    if set(parser.addresses) != expected:
        raise ValueError("Expected exactly the Ethereum, Bitcoin, Solana and TRON addresses")
    output = ROOT / "support/qr"
    output.mkdir(parents=True, exist_ok=True)
    for coin, address in parser.addresses.items():
        address = address.strip()
        if not address or any(char.isspace() for char in address):
            raise ValueError(f"Missing address or embedded whitespace: {coin}")
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
        qr.add_data(address)
        qr.make(fit=True)
        qr.make_image(fill_color="black", back_color="white").save(output / f"{coin}.png")
        print(f"Generated {coin}.png")


if __name__ == "__main__":
    main()
