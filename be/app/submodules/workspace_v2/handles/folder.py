import shutil
from pathlib import Path


class FolderHandle:
    def __init__(self, path: Path) -> None:
        self.path = path

    def delete(self) -> None:
        shutil.rmtree(self.path)