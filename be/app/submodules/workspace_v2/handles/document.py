from pathlib import Path

# for files with .md extension
class DocumentHandle:
    def __init__(self, path: Path) -> None:
        if path.suffix.lower() != ".md":
            self.path = path.with_suffix(".md")
        else:
            self.path = path

    def update(self, content: str) -> None:
        self.path.write_text(content, encoding="utf-8")

    def read(self) -> str:
        return self.path.read_text(encoding="utf-8")

    @property
    def title(self) -> str:
        return self.path.stem

    def exists(self) -> bool:
        return self.path.exists()

    def delete(self) -> None:
        self.path.unlink(missing_ok=False)