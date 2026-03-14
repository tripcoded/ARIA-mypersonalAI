"use client"

import { useEffect, useState } from "react"

type Memory = {
  id: string
  text: string
}

export default function MemoriesPage() {

  const [memories, setMemories] = useState<Memory[]>([])

  const fetchMemories = async () => {

    const res = await fetch("http://localhost:8000/memories")
    const data = await res.json()

    if (data.documents && data.ids) {
    const formatted = data.ids.map((id: string, i: number) => ({
      id,
      text: Array.isArray(data.documents[i])
        ? data.documents[i][0]
        : data.documents[i]
    }))

      setMemories(formatted)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  const deleteMemory = async (id: string) => {

    await fetch(`http://localhost:8000/memories/${id}`, {
      method: "DELETE"
    })

    setMemories(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>

      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
        Aria Memories
      </h1>

      {memories.length === 0 && (
        <p>No memories stored yet.</p>
      )}

      {memories.map((memory) => (

        <div
          key={memory.id}
          style={{
            background: "#161616",
            padding: "15px",
            marginTop: "10px",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >

          <span>{memory.text}</span>

          <button
            onClick={() => deleteMemory(memory.id)}
            style={{
              background: "#7f1d1d",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Delete
          </button>

        </div>
      ))}

    </div>
  )
}