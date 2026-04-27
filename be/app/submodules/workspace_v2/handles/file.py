from pathlib import Path

class FileHandle:
    def __init__(self, path: Path) -> None:
        self.path = path

    def update(self, content: bytes) -> None:
        self.path.write_bytes(content)
        
    def read(self) -> bytes:
        return self.path.read_bytes()

    def exists(self) -> bool:
        return self.path.exists()

    def delete(self) -> None:
        self.path.unlink(missing_ok=False)