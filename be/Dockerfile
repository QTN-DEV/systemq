FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=0

RUN adduser --disabled-password --gecos "" fastapi

WORKDIR /app

RUN apt-get update && \
    apt-get install --no-install-recommends -y build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements_unix.txt* ./ 

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements_unix.txt

COPY . .

RUN chown -R fastapi:fastapi /app

USER fastapi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]