FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    gdb \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /sandbox

COPY gdb_tracer.py /sandbox/gdb_tracer.py

# Non-root user for security
RUN useradd -m -u 1001 tracer && \
    chown -R tracer:tracer /sandbox

USER tracer

ENTRYPOINT ["python3", "/sandbox/gdb_tracer.py"]
