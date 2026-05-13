// 通用的 OpenAI 兼容客户端
export class OpenAICompatibleClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    // 确保baseUrl格式正确
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    // 如果baseUrl已经包含/v1，不要重复添加
    if (this.baseUrl.endsWith("/v1")) {
      this.baseUrl = this.baseUrl.slice(0, -3)
    }
    this.apiKey = apiKey

    console.log("OpenAI Client initialized:", {
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
    })
  }

  async createChatCompletion(params: {
    model: string
    messages: Array<{ role: string; content: string | Array<any> }>
    response_format?: { type: string }
    stream?: boolean
  }) {
    const url = `${this.baseUrl}/v1/chat/completions`
    console.log("Making request to:", url)
    console.log("Request params:", {
      model: params.model,
      messageCount: params.messages.length,
      stream: params.stream,
      hasResponseFormat: !!params.response_format,
    })

    const requestBody = {
      model: params.model,
      messages: params.messages,
      stream: params.stream || false,
      ...(params.response_format && { response_format: params.response_format }),
    }

    console.log("Request body:", JSON.stringify(requestBody, null, 2))

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      return response
    } catch (error) {
      console.error("Fetch error:", error)
      throw error
    }
  }

  async generateText(params: {
    model: string
    prompt: string
    images?: string[]
    response_format?: { type: string }
  }) {
    console.log("Generating text with params:", {
      model: params.model,
      promptLength: params.prompt.length,
      imageCount: params.images?.length || 0,
      hasResponseFormat: !!params.response_format,
    })

    const messages: Array<{ role: string; content: string | Array<any> }> = []

    if (params.images && params.images.length > 0) {
      // 视觉模型请求
      const content = [
        { type: "text", text: params.prompt },
        ...params.images.map((image) => ({
          type: "image_url",
          image_url: { url: image },
        })),
      ]
      messages.push({ role: "user", content })
    } else {
      // 普通文本请求
      messages.push({ role: "user", content: params.prompt })
    }

    const response = await this.createChatCompletion({
      model: params.model,
      messages,
      response_format: params.response_format,
    })

    const result = await response.json()
    console.log("Generate text result:", {
      hasChoices: !!result.choices,
      choiceCount: result.choices?.length || 0,
      firstChoiceContent: result.choices?.[0]?.message?.content?.substring(0, 100) + "...",
    })

    return {
      text: result.choices[0]?.message?.content || "",
    }
  }

  async streamText(params: {
    model: string
    messages: Array<{ role: string; content: string }>
    system?: string
  }) {
    console.log("Streaming text with params:", {
      model: params.model,
      messageCount: params.messages.length,
      hasSystem: !!params.system,
    })

    const messages = [...params.messages]
    if (params.system) {
      messages.unshift({ role: "system", content: params.system })
    }

    const response = await this.createChatCompletion({
      model: params.model,
      messages,
      stream: true,
    })

    return response
  }

  // 获取可用模型列表
  async listModels() {
    const url = `${this.baseUrl}/v1/models`
    console.log("Listing models from:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    console.log("List models response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("List models error:", errorText)
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Models fetched:", result.data?.length || 0)
    return result
  }
}

// 模型类型接口
export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface OpenAIModelList {
  object: string
  data: OpenAIModel[]
}
