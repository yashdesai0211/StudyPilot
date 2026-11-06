"""StudyPilot Windows desktop launcher. Loads the existing web app locally."""
from pathlib import Path
import sys


def resource_path(relative: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / relative


def main() -> None:
    try:
        import webview
    except ImportError as exc:
        raise SystemExit("Missing dependency. Run: py -m pip install -r Windows/requirements.txt") from exc

    index = resource_path("web/index.html")
    if not index.is_file():
        raise SystemExit(f"StudyPilot web files were not packaged: {index}")
    webview.create_window(
        "StudyPilot — Created by Yash Desai",
        index.as_uri(),
        width=1280,
        height=820,
        min_size=(360, 560),
        background_color="#f5f3ee",
    )
    webview.start()


if __name__ == "__main__":
    main()
