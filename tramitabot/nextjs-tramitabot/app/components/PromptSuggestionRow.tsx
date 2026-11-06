"use client"
import PromptSuggestionButton from "./PromptSuggestionButton"

interface PromptSuggestionRowProps {
  onPromptClick: (prompt: string) => void
}

const PromptSuggestionRow = ({ onPromptClick }: PromptSuggestionRowProps) => {
  const prompts = [
    "¿Cómo renuevo el Dni?",
    "¿Qué trámites puedo hacer en la Generalitat Valenciana?",
    "¿Cómo solicito la tarjeta sanitaria?",
    "¿Qué certificado digital necesito para tributos?",
  ]

  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton
          key={`suggestion-${index}`}
          text={prompt}
          onClick={() => onPromptClick(prompt)}
        />
      ))}
    </div>
  )
}

export default PromptSuggestionRow