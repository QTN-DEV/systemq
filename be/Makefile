.PHONY: lint
lint:
	ruff check --fix .
	python -m py_compile app/**/*.py

.PHONY: lint-fix
lint-fix:
	ruff check --fix .

.PHONY: format
format:
	ruff format .

.PHONY: format-check
format-check:
	ruff format --check .
