FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	INSIGHTFACE_HOME=/app/.insightface

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	g++ \
	cmake \
	pkg-config \
	libgl1 \
	libglib2.0-0 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN mkdir -p /app/.insightface

WORKDIR /app/app

EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "--timeout", "120", "main:app"]
