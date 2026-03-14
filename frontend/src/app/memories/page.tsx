"use client"

import { useEffect, useState } from "react"

export default function MemoriesPage() {
  const [memories, setMemories] = useState<string[]>([])

  useEffect(() => {
    fetch("http://localhost:8000/memories")
      .then(res => res.json())
      .then(data => {
        if (data.documents) {
          setMemories(data.documents)
        }
      })
  }, [])

  return (
    <div style={{padding:"40px", color:"white"}}>
      <h1>Aria Memories</h1>

      {memories.length === 0 && <p>No memories stored yet.</p>}

      {memories.map((memory, index) => (
        <div key={index}
          style={{
            background:"#161616",
            padding:"15px",
            marginTop:"10px",
            borderRadius:"10px"
          }}>
          {memory}
        </div>
      ))}
    </div>
  )
}