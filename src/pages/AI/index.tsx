import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../lib/store'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIAssistant() {
  const { pointsData, projectInfo } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY || 'demo'
    const ctx = projectInfo.initialized ? `\n项目: ${projectInfo.name}, 区域: ${projectInfo.region}, 点位: ${pointsData.length}个` : ''
    try {
      if (apiKey === 'demo') {
        await new Promise((r) => setTimeout(r, 800))
        setMessages((prev) => [...prev, { role: 'assistant', content: `收到："${text}"\n\n这是Demo模式。请在.env.local中配置VITE_SILICONFLOW_API_KEY。${ctx}` }])
      } else {
        const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'Qwen/Qwen2-72B-Instruct', messages: [{ role: 'system', content: '你是OptiBin智配平台的AI分析助手。' + ctx }, ...messages, { role: 'user', content: text }], max_tokens: 1024 }),
        })
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.choices?.[0]?.message?.content || '无响应' }])
      }
    } catch { setMessages((prev) => [...prev, { role: 'assistant', content: '❌ 请求失败' }]) }
    setLoading(false)
  }

  const presets = [
    { label: '分析当前SEI数据', prompt: '请分析当前项目的SEI空间效率指数分布情况。' },
    { label: '生成优化建议', prompt: '基于当前SEI结果，生成优化建议报告。' },
    { label: '解释SEI算法', prompt: '请详细解释SEI算法的四个分项指标。' },
  ]

  return (
    <div className="chat-container">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="header-title" style={{ marginBottom: 6 }}>🤖 OptiBin AI 分析助手</div>
                <div className="header-subtitle">选择一个分析任务或输入你的问题</div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
            </div>
          ))}
          {loading && <div style={{ display: 'flex' }}><div className="chat-bubble assistant">⏳ AI思考中...</div></div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input-bar">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder="输入你的问题..." disabled={loading} />
          <button className="btn btn-primary" onClick={() => send(input)} disabled={loading}>发送</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="card">
          <div className="card-title">📋 快速分析</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {presets.map((item) => <button key={item.label} onClick={() => send(item.prompt)} disabled={loading} className="btn btn-outline" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>{item.label}</button>)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">⚡ 快捷指令</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[{ cmd: '/sei', desc: 'SEI分析' }, { cmd: '/optimize', desc: '优化建议' }, { cmd: '/report', desc: '报告生成' }].map((item) => (
              <button key={item.cmd} onClick={() => send(item.desc)} className="btn btn-outline" style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 11 }}>{item.cmd} → {item.desc}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
