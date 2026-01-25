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

RUN mkdir -p /app/.insightface

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download InsightFace model (buffalo_l)
RUN python -c "from insightface.app import FaceAnalysis; app=FaceAnalysis(name='buffalo_l'); app.prepare(ctx_id=-1, det_size=(640,640))"

COPY app ./app

WORKDIR /app/app

EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "--timeout", "120", "main:app"]
