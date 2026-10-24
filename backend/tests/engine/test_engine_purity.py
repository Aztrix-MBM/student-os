import ast
from pathlib import Path


FORBIDDEN_MODULES = {
    "sqlalchemy",
    "fastapi",
    "pydantic",
    "requests",
    "httpx",
    "aiohttp",
    "app.db",
    "app.models",
    "app.routers",
    "app.schemas",
}


def test_engine_has_zero_db_or_framework_imports():
    """
    Architectural rule enforcement:
    Modules in backend/app/engine/ must be 100% pure algorithmic functions
    with zero dependencies on database ORMs (SQLAlchemy), web frameworks (FastAPI),
    or network/HTTP libraries.
    """
    engine_dir = Path(__file__).resolve().parent.parent.parent / "app" / "engine"
    assert engine_dir.exists(), f"Engine directory not found at {engine_dir}"

    py_files = list(engine_dir.glob("*.py"))
    assert len(py_files) >= 4, f"Expected at least 4 engine files, found {len(py_files)}"

    violations = []

    for file_path in py_files:
        tree = ast.parse(file_path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for forbidden in FORBIDDEN_MODULES:
                        if alias.name == forbidden or alias.name.startswith(f"{forbidden}."):
                            violations.append((file_path.name, alias.name, node.lineno))
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    for forbidden in FORBIDDEN_MODULES:
                        if node.module == forbidden or node.module.startswith(f"{forbidden}."):
                            violations.append((file_path.name, node.module, node.lineno))

    assert not violations, f"Forbidden framework/DB imports detected in app/engine/: {violations}"
