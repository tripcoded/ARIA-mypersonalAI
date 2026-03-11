import os
from typing import Dict, List
from urllib.parse import parse_qs, urlparse

import pdfplumber
from github import Github
from github.GithubException import BadCredentialsException, GithubException, UnknownObjectException
from youtube_transcript_api import CouldNotRetrieveTranscript, YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    AgeRestricted,
    NoTranscriptFound,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
)

def process_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def extract_youtube_video_id(url: str) -> str:
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()
    path_parts = [part for part in parsed.path.split("/") if part]

    if host in {"youtu.be", "www.youtu.be"}:
        return path_parts[0] if path_parts else ""

    if "youtube.com" in host:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [""])[0]
        if path_parts and path_parts[0] in {"shorts", "embed", "live"}:
            return path_parts[1] if len(path_parts) > 1 else ""

    return ""


def process_youtube(url: str) -> str:
    """Extract transcript from a YouTube video URL."""
    video_id = extract_youtube_video_id(url)

    if not video_id:
        raise ValueError("Invalid YouTube URL")

    try:
        api = YouTubeTranscriptApi()
        try:
            transcript = api.fetch(video_id, languages=["en", "en-US"])
        except NoTranscriptFound:
            transcript_list = api.list(video_id)
            available_transcripts = list(transcript_list)
            if not available_transcripts:
                raise ValueError("No transcript was found for this video.")
            transcript = available_transcripts[0].fetch()
    except TranscriptsDisabled as exc:
        raise ValueError("This video does not have transcripts enabled.") from exc
    except NoTranscriptFound as exc:
        raise ValueError("No transcript was found for this video.") from exc
    except VideoUnavailable as exc:
        raise ValueError("This YouTube video is unavailable.") from exc
    except AgeRestricted as exc:
        raise ValueError("This video is age-restricted and its transcript cannot be accessed.") from exc
    except RequestBlocked as exc:
        raise ValueError("YouTube blocked the transcript request from this IP. Try again later or use a different network.") from exc
    except CouldNotRetrieveTranscript as exc:
        raise ValueError(f"Could not retrieve transcript for this video: {exc}") from exc
    except Exception as exc:
        raise ValueError(f"Failed to fetch YouTube transcript: {exc}") from exc

    text = " ".join(segment.text for segment in transcript).strip()
    if not text:
        raise ValueError("No transcript text was returned for this video.")

    return text


def extract_github_repo_name(repo_url: str) -> str:
    parsed = urlparse(repo_url.strip())
    host = parsed.netloc.lower()

    if host not in {"github.com", "www.github.com"}:
        raise ValueError("Invalid GitHub repository URL")

    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) < 2:
        raise ValueError("Invalid GitHub repository URL")

    owner = path_parts[0]
    repo = path_parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]

    if not owner or not repo:
        raise ValueError("Invalid GitHub repository URL")

    return f"{owner}/{repo}"


def process_github(repo_url: str, github_token: str = None) -> List[Dict[str, str]]:
    """Fetch all code files from a GitHub repository."""
    repo_name = extract_github_repo_name(repo_url)
    allowed_extensions = {".py", ".js", ".ts", ".tsx", ".md", ".txt", ".java", ".cpp", ".c"}
    max_files = int(os.getenv("GITHUB_MAX_FILES", "150"))
    max_file_bytes = int(os.getenv("GITHUB_MAX_FILE_BYTES", "200000"))

    g = Github(github_token)
    try:
        repo = g.get_repo(repo_name)
        tree = repo.get_git_tree(repo.default_branch, recursive=True)
    except BadCredentialsException as exc:
        raise ValueError("Invalid GitHub token. Update GITHUB_TOKEN in backend/.env.") from exc
    except UnknownObjectException as exc:
        if github_token:
            raise ValueError(f"GitHub repository not found: {repo_name}") from exc
        raise ValueError(
            f"GitHub repository not found or is private: {repo_name}. Add GITHUB_TOKEN to backend/.env for private repos."
        ) from exc
    except GithubException as exc:
        raise ValueError(f"GitHub API error while reading {repo_name}: {exc.data}") from exc

    files_data = []
    tree_files = [item for item in tree.tree if item.type == "blob"]

    for item in tree_files:
        if len(files_data) >= max_files:
            break

        ext = os.path.splitext(item.path)[1].lower()
        if ext not in allowed_extensions:
            continue
        if item.size and item.size > max_file_bytes:
            continue

        try:
            file_content = repo.get_contents(item.path, ref=repo.default_branch)
            files_data.append(
                {
                    "path": item.path,
                    "content": file_content.decoded_content.decode("utf-8"),
                }
            )
        except Exception:
            continue

    if not files_data:
        raise ValueError(f"No supported text files were found in GitHub repository: {repo_name}")

    return files_data
