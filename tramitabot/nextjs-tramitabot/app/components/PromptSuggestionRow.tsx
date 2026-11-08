"use client"
import PromptSuggestionButton from "./PromptSuggestionButton"



const PromptSuggestionRow = ({ onPromptClick }) => {
  const prompts = [
     "¿Cómo puedo empadronarme en Valencia?",
    "¿Qué trámites puedo hacer en la Generalitat Valenciana?",
    "¿Cómo solicito la tarjeta sanitaria?",
    "¿Qué certificado digital necesito para tributos?",
  ];

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
  );
};

export default PromptSuggestionRow;