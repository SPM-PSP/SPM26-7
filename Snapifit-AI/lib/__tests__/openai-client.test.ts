import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OpenAICompatibleClient } from '../openai-client'

describe('OpenAICompatibleClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('构造函数', () => {
    it('应移除 baseUrl 末尾斜杠', () => {
      const client = new OpenAICompatibleClient('https://api.openai.com/', 'key-123')
      // 通过发起请求来验证 URL 构造
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: 'hi' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })
      client.generateText({ model: 'gpt-4', prompt: 'hello' })
      const url = mockFetch.mock.calls[0][0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('应移除 baseUrl 末尾 /v1 避免重复', () => {
      const client = new OpenAICompatibleClient('https://api.openai.com/v1', 'key-123')
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: 'hi' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })
      client.generateText({ model: 'gpt-4', prompt: 'hello' })
      const url = mockFetch.mock.calls[0][0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })
  })

  describe('createChatCompletion()', () => {
    it('应正确构造请求：POST /v1/chat/completions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: 'hi' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hello' }],
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.headers['Authorization']).toBe('Bearer key-123')

      const body = JSON.parse(options.body)
      expect(body.model).toBe('gpt-4')
      expect(body.messages).toHaveLength(1)
      expect(body.stream).toBe(false)
    })

    it('非 OK 响应应抛出异常', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{"error": "Invalid API Key"}'),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-bad')
      await expect(
        client.createChatCompletion({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'hello' }],
        })
      ).rejects.toThrow(/401/)
    })
  })

  describe('generateText()', () => {
    it('纯文本模式：messages[0].content 为字符串', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: '你好！' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      const result = await client.generateText({ model: 'gpt-4', prompt: '你好' })

      expect(result.text).toBe('你好！')
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content).toBe('你好')
      expect(Array.isArray(body.messages[0].content)).toBe(false)
    })

    it('视觉模式：传入 images 时应构建 image_url 数组', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: '{"food":[]}' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      await client.generateText({
        model: 'gpt-4-vision',
        prompt: '分析这张图片',
        images: ['data:image/jpeg;base64,/9j/xxx'],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const content = body.messages[0].content
      expect(Array.isArray(content)).toBe(true)
      expect(content[0]).toEqual({ type: 'text', text: '分析这张图片' })
      expect(content[1]).toEqual({
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,/9j/xxx' },
      })
    })

    it('应支持 response_format 参数', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ choices: [{ message: { content: '{"result":"ok"}' } }] }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      await client.generateText({
        model: 'gpt-4',
        prompt: 'hello',
        response_format: { type: 'json_object' },
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.response_format).toEqual({ type: 'json_object' })
    })
  })

  describe('streamText()', () => {
    it('应传入 stream: true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: null,
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      await client.streamText({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hello' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.stream).toBe(true)
    })

    it('有 system 参数时应插入到 messages 头部', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: null,
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      await client.streamText({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hello' }],
        system: '你是一个助手',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages).toHaveLength(2)
      expect(body.messages[0]).toEqual({ role: 'system', content: '你是一个助手' })
      expect(body.messages[1]).toEqual({ role: 'user', content: 'hello' })
    })
  })

  describe('listModels()', () => {
    it('GET 请求返回模型列表', async () => {
      const modelsData = { object: 'list', data: [{ id: 'gpt-4', object: 'model', created: 123, owned_by: 'openai' }] }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(modelsData),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-123')
      const result = await client.listModels()

      expect(result).toEqual(modelsData)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/models')
      expect(options.method).toBe('GET')
    })

    it('非 OK 响应抛出异常', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{"error":"Forbidden"}'),
        headers: new Headers(),
      })

      const client = new OpenAICompatibleClient('https://api.openai.com', 'key-bad')
      await expect(client.listModels()).rejects.toThrow()
    })
  })
})
