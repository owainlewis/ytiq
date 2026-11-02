# Container for Cloud Run. The UI is already built into ytiq/static, so no Node step.
FROM python:3.12-slim

ARG LITESTREAM_VERSION=0.3.13
ADD https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-amd64.tar.gz /tmp/litestream.tar.gz
RUN tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz && rm /tmp/litestream.tar.gz

COPY --from=ghcr.io/astral-sh/uv:0.9.22 /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY ytiq ./ytiq
RUN uv sync --frozen --no-dev

COPY deploy/litestream.yml /etc/litestream.yml
COPY deploy/entrypoint.sh /entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH" \
    YTIQ_DB_PATH=/data/ytiq.db \
    PORT=8080

CMD ["/entrypoint.sh"]
