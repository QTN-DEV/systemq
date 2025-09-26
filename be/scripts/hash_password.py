#!/usr/bin/env python3
"""Simple password hashing script for development."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.security import hash_password

if __name__ == "__main__":
    password = input("Enter password to hash: ")
    hashed = hash_password(password)
    print(f"\nHashed password: {hashed}")
