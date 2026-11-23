"use client"
import Image from 'next/image'
import tramitabot from './assets/tramitabot.webp' 
import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import Bubble from './components/Bubble'
import LoadingBubble from './components/LoadingBubble'
import PromptSuggestionRow from './components/PromptSuggestionRow'

const Home = () => {
  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat()
  const chatRef = useRef<HTMLElement>(null)

  const noMessage = !messages || messages.length === 0

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handlePrompt =  (promptText: string) => {
    const msg = {
      id: crypto.randomUUID(),
      content: promptText,
      role: 'user' as const,
    }
     append(msg)
  }

  return (
    <main>
      <Image src={tramitabot} width={250} alt="tramitabot Logo" />
      <section ref={chatRef} className={noMessage ? "" : "populated"}>
        {noMessage ? (
          <>
            <p className="starter-text">
              Bienvenido a TramitaBot aquí podrás consultar tus dudas sobre algunos trámites en la Comunidad Valenciana
            </p>
            <br />
            <PromptSuggestionRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <div className="messages">
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </div>
        )}

      </section>
        <form onSubmit={handleSubmit}>
          <input
            className="question-box"
            onChange={handleInputChange}
            value={input}
            placeholder="preguntame algo..."
          />
          <input type="submit" value={"enviar"}/>
        </form>
    </main>
  )
}

export default Home