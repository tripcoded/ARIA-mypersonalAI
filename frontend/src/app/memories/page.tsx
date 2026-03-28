"use client"

import { useEffect, useState } from "react"

import { useAriaSettings } from "@/components/SettingsProvider"

type Memory = {
  id: string
  text: string
}

export default function MemoriesPage() {
  const {
    settings: { apiBaseUrl },
  } = useAriaSettings();

  const [memories, setMemories] = useState<Memory[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadMemories = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/memories`)
        const data = await res.json()

        if (cancelled) {
          return
        }

        if (!res.ok) {
          setError(data?.detail ?? "Unable to load memories.")
          return
        }

        if (data.documents && data.ids) {
          const formatted = data.ids.map((id: string, i: number) => ({
            id,
            text: Array.isArray(data.documents[i])
              ? data.documents[i][0]
              : data.documents[i]
          }))

          setMemories(formatted)
        }

        setError("")
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load memories.")
        }
      }
    }

    void loadMemories()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  const deleteMemory = async (id: string) => {

    await fetch(`${apiBaseUrl}/memories/${id}`, {
      method: "DELETE"
    })

    setMemories(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>

      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
        Aria Memories
      </h1>

      {error ? (
        <p style={{ color: "#fca5a5", marginBottom: "20px" }}>{error}</p>
      ) : null}

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
