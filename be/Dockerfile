FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=0

WORKDIR /app

RUN apt-get update && \
    apt-get install --no-install-recommends -y build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements_unix.txt* ./ 

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements_unix.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
