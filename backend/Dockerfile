# Builder Stage
FROM rust:slim-bookworm AS builder

WORKDIR /usr/src/app

# Install build dependencies (pkg-config, libssl-dev, sqlite3)
RUN apt-get update && apt-get install -y pkg-config libssl-dev libsqlite3-dev

# Copy manifests first for caching
COPY Cargo.toml Cargo.lock ./
# Create dummy main to build deps
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# Copy actual source
COPY . .
# Touch main to force rebuild
RUN touch src/main.rs
RUN cargo build --release

# Runtime Stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy binary
COPY --from=builder /usr/src/app/target/release/backend /app/backend

# Copy assets
COPY tarot_data.json /app/

# Copy migrations if needed explicitly, though usually embedded.
# If using sqlx::migrate!("./migrations"), it's embedded.
# Copy .env example or just rely on ENV vars
# COPY .env .env 

EXPOSE 3000

CMD ["./backend"]
