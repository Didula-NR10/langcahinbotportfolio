"""One-worker Uvicorn entry point for container hosts with a dynamic PORT."""

import os

import uvicorn


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT must be between 1 and 65535")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        access_log=False,
        proxy_headers=True,
        forwarded_allow_ips=os.environ.get("TRUSTED_PROXY_IPS", "127.0.0.1"),
    )


if __name__ == "__main__":
    main()
