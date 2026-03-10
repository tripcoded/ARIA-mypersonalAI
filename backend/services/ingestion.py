import os
import pdfplumber
from youtube_transcript_api import YouTubeTranscriptApi
from github import Github
from typing import List, Dict

def process_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def process_youtube(url: str) -> str:
    """Extract transcript from a YouTube video URL."""
    # Handle both full and short URLs
    video_id = ""
    if "youtu.be" in url:
        video_id = url.split("/")[-1]
    elif "v=" in url:
        video_id = url.split("v=")[1].split("&")[0]
    
    if not video_id:
        raise ValueError("Invalid YouTube URL")
    
    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
    text = " ".join([t['text'] for t in transcript_list])
    return text

def process_github(repo_url: str, github_token: str = None) -> List[Dict[str, str]]:
    """Fetch all code files from a GitHub repository."""
    # Basic repo url parsing: https://github.com/user/repo
    parts = repo_url.strip("/").split("/")
    repo_name = f"{parts[-2]}/{parts[-1]}"
    
    g = Github(github_token)
    repo = g.get_repo(repo_name)
    
    contents = repo.get_contents("")
    files_data = []
    
    while contents:
        file_content = contents.pop(0)
        if file_content.type == "dir":
            contents.extend(repo.get_contents(file_content.path))
        else:
            # Only index common text-based files
            ext = os.path.splitext(file_content.name)[1].lower()
            if ext in ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.java', '.cpp', '.c']:
                try:
                    files_data.append({
                        "path": file_content.path,
                        "content": file_content.decoded_content.decode("utf-8")
                    })
                except:
                    # Skip binary or non-utf-8 files
                    continue
    return files_data

