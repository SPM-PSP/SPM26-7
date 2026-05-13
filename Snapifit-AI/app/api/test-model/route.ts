import { OpenAICompatibleClient } from "@/lib/openai-client"

export async function POST(req: Request) {
  try {
    const { modelConfig, modelType } = await req.json()

    if (!modelConfig || !modelConfig.name || !modelConfig.baseUrl || !modelConfig.apiKey) {
      return Response.json({ error: "Invalid model configuration" }, { status: 400 })
    }

    // 创建客户端
    const client = new OpenAICompatibleClient(modelConfig.baseUrl, modelConfig.apiKey)

    // 根据模型类型选择测试内容
    let testPrompt = "Hello, this is a test message. Please respond with 'Test successful'."

    if (modelType === "visionModel") {
      // 对于视觉模型，我们只测试文本能力，因为测试图片会比较复杂
      testPrompt =
        "This is a test for vision model text capabilities. Please respond with 'Vision model test successful'."
    } else if (modelType === "agentModel") {
      testPrompt = "This is a test for agent model. Please respond with 'Agent model test successful'."
    } else if (modelType === "chatModel") {
      testPrompt = "This is a test for chat model. Please respond with 'Chat model test successful'."
    }

    // 发送测试请求
    const { text } = await client.generateText({
      model: modelConfig.name,
      prompt: testPrompt,
    })

    // 检查响应是否包含预期内容
    if (text && text.toLowerCase().includes("test successful")) {
      return Response.json({ success: true, message: "Model test successful" })
    } else {
      return Response.json({ success: true, message: "Model responded but with unexpected content", response: text })
    }
  } catch (error) {
    console.error("Model test error:", error)
    return Response.json({ error: "Model test failed", details: error.message }, { status: 500 })
  }
}
