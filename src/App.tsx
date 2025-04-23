import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function App() {
  const [model, setModel] = useState('llama3.1:8b')
  const [systemContent, setSystemContent] = useState('Você é um assistente mal humorado e que responde em poucas palavras.')
  const [userContent, setUserContent] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userContent.trim()) return

    const newUserMessage: Message = { role: 'user', content: userContent }
    setMessages(prev => [...prev, newUserMessage])
    setUserContent('')
    setIsTyping(true)
    setCurrentResponse('')

    try {
      const response = await fetch(import.meta.env.VITE_PUBLIC_API_CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            ...messages,
            newUserMessage
          ],
        }),
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let accumulatedResponse = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.message?.content) {
              accumulatedResponse += data.message.content
              setCurrentResponse(accumulatedResponse)
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
          }
        }
      }

      const newAssistantMessage: Message = { role: 'assistant', content: accumulatedResponse }
      setMessages(prev => [...prev, newAssistantMessage])
    } catch (error: any) {
      const errorMessage: Message = { role: 'assistant', content: `Erro: ${error.message}` }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      setCurrentResponse('')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl max-w-2xl w-full h-[80vh] flex flex-col">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-4">Wall AI</h1>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              } max-w-[80%]`}
            >
              {message.content}
            </div>
          ))}
          {isTyping && currentResponse && (
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg max-w-[80%]">
              {currentResponse}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-4">
          <Textarea
            placeholder="System prompt"
            rows={2}
            value={systemContent}
            onChange={(e) => setSystemContent(e.target.value)}
          />

          <div className="flex gap-2">
            <Input
              placeholder="Modelo (ex: llama3)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-1/3"
            />
            <Input
              placeholder="Digite sua mensagem..."
              value={userContent}
              onChange={(e) => setUserContent(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" onClick={handleSubmit} disabled={isTyping}>
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
