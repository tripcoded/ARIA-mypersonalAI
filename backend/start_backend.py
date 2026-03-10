import subprocess


DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200


def main() -> None:
    with open("uvicorn.log", "ab") as stdout, open("uvicorn.err.log", "ab") as stderr:
        subprocess.Popen(
            [
                r"venv\Scripts\python.exe",
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=".",
            stdout=stdout,
            stderr=stderr,
            creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
        )


if __name__ == "__main__":
    main()
