"use client"

import { useState, useEffect, useMemo } from "react"
import { MarkdownRenderer } from "./markdown-renderer"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Brain, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedMessageRendererProps {
  content: string
  reasoningContent?: string
  className?: string
  isMobile?: boolean
  isStreaming?: boolean // 新增：是否正在流式传输
  onMemoryUpdateRequest?: (request: { newContent: string; reason: string }) => void // 记忆更新回调
}

export function EnhancedMessageRenderer({
  content,
  reasoningContent,
  className,
  isMobile = false,
  isStreaming = false,
  onMemoryUpdateRequest
}: EnhancedMessageRendererProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const [showMemoryRequest, setShowMemoryRequest] = useState(true) // 默认展开记忆更新请求
  const [editableMemoryContent, setEditableMemoryContent] = useState("")
  const [editableMemoryReason, setEditableMemoryReason] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // 流式解析内容，实时提取思考过程、主要内容和记忆更新请求
  const parseStreamingContent = useMemo(() => {
    // 检查是否包含思考过程标记
    const thinkMatch = content.match(/<think>([\s\S]*?)(<\/think>|$)/i)
    const reasoningMatch = content.match(/\[思考过程\]([\s\S]*?)(\[\/思考过程\]|$)/i)
    const contentMatch = content.match(/\[回答\]([\s\S]*?)(\[\/回答\]|$)/i)

    // 检查是否包含记忆更新请求
    const memoryMatch = content.match(/\[MEMORY_UPDATE_REQUEST\]([\s\S]*?)(\[\/MEMORY_UPDATE_REQUEST\]|$)/i)
    const memoryContentMatch = content.match(/\[MEMORY_UPDATE_REQUEST\][\s\S]*?新记忆内容[：:]\s*([\s\S]*?)\s*更新原因[：:]\s*([\s\S]*?)\s*\[\/MEMORY_UPDATE_REQUEST\]/i)

    let reasoning = ""
    let mainContent = content
    let hasCompleteReasoning = false
    let hasCompleteContent = false
    let memoryRequest = null
    let hasCompleteMemoryRequest = false
    let contentBeforeMemory = ""
    let contentAfterMemory = ""

    // 处理记忆更新请求
    if (memoryMatch) {
      hasCompleteMemoryRequest = content.includes("[/MEMORY_UPDATE_REQUEST]")

      if (memoryContentMatch && hasCompleteMemoryRequest) {
        const [, newContent, reason] = memoryContentMatch
        memoryRequest = {
          newContent: newContent?.trim() || "",
          reason: reason?.trim() || ""
        }
      }

      // 分割内容：记忆更新请求前后的内容
      const memoryStartIndex = content.indexOf("[MEMORY_UPDATE_REQUEST]")
      const memoryEndIndex = content.indexOf("[/MEMORY_UPDATE_REQUEST]")

      if (memoryStartIndex !== -1) {
        contentBeforeMemory = content.substring(0, memoryStartIndex).trim()
        if (memoryEndIndex !== -1) {
          contentAfterMemory = content.substring(memoryEndIndex + "[/MEMORY_UPDATE_REQUEST]".length).trim()
        }
      }

      // 如果没有找到结束标记，说明还在流式传输中
      if (memoryEndIndex === -1 && memoryStartIndex !== -1) {
        contentBeforeMemory = content.substring(0, memoryStartIndex).trim()
        contentAfterMemory = ""
      }

      // 从分割的内容中移除思考过程标记
      contentBeforeMemory = contentBeforeMemory.replace(/<think>[\s\S]*?(<\/think>|$)/i, "").trim()
      contentAfterMemory = contentAfterMemory.replace(/<think>[\s\S]*?(<\/think>|$)/i, "").trim()
    }

    // 处理 <think> 标签格式（DeepSeek等模型）
    if (thinkMatch) {
      reasoning = thinkMatch[1].trim()
      hasCompleteReasoning = content.includes("</think>")

      // 移除思考过程，获取主要内容
      mainContent = mainContent.replace(/<think>[\s\S]*?(<\/think>|$)/i, "").trim()
    }
    // 处理中文标记格式
    else if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim()
      hasCompleteReasoning = content.includes("[/思考过程]")

      if (contentMatch) {
        mainContent = contentMatch[1].trim()
        hasCompleteContent = content.includes("[/回答]")
      } else {
        // 如果还没有回答部分，显示原始内容
        mainContent = mainContent.replace(/\[思考过程\][\s\S]*?(\[\/思考过程\]|$)/i, "").trim()
      }
    }
    // 处理JSON格式
    else {
      try {
        const parsed = JSON.parse(content)
        if (parsed.reasoning_content && parsed.content) {
          reasoning = parsed.reasoning_content
          mainContent = parsed.content
          hasCompleteReasoning = true
          hasCompleteContent = true
        }
      } catch {
        // 不是JSON格式，保持原样
      }
    }

    return {
      reasoning: reasoning || reasoningContent || "",
      mainContent,
      hasCompleteReasoning,
      hasCompleteContent,
      hasReasoning: !!(reasoning || reasoningContent),
      memoryRequest,
      hasMemoryRequest: !!memoryMatch,
      hasCompleteMemoryRequest,
      contentBeforeMemory,
      contentAfterMemory
    }
  }, [content, reasoningContent])

  // 解析内容，检查是否包含reasoning_content和content字段（保留原有逻辑作为备用）
  const parseStructuredContent = (rawContent: string) => {
    try {
      // 尝试解析JSON格式的结构化内容
      const parsed = JSON.parse(rawContent)
      if (parsed.reasoning_content && parsed.content) {
        return {
          reasoning: parsed.reasoning_content,
          main: parsed.content
        }
      }
    } catch {
      // 如果不是JSON，尝试解析特殊标记格式
      const reasoningMatch = rawContent.match(/\[REASONING\]([\s\S]*?)\[\/REASONING\]/i)
      const contentMatch = rawContent.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/i)
      
      if (reasoningMatch && contentMatch) {
        return {
          reasoning: reasoningMatch[1].trim(),
          main: contentMatch[1].trim()
        }
      }
      
      // 检查是否有思考过程标记
      const thinkingMatch = rawContent.match(/\[思考过程\]([\s\S]*?)\[\/思考过程\]/i)
      const answerMatch = rawContent.match(/\[回答\]([\s\S]*?)\[\/回答\]/i)
      
      if (thinkingMatch && answerMatch) {
        return {
          reasoning: thinkingMatch[1].trim(),
          main: answerMatch[1].trim()
        }
      }
    }
    
    return null
  }

  // 使用流式解析的结果
  const {
    reasoning,
    mainContent,
    hasReasoning,
    hasCompleteReasoning,
    memoryRequest,
    hasMemoryRequest,
    hasCompleteMemoryRequest,
    contentBeforeMemory,
    contentAfterMemory
  } = parseStreamingContent

  // 当记忆请求完成时，设置可编辑内容
  useEffect(() => {
    if (hasCompleteMemoryRequest && memoryRequest) {
      // 确保内容不为空且有效
      const content = memoryRequest.newContent?.trim() || ""
      const reason = memoryRequest.reason?.trim() || ""

      setEditableMemoryContent(content)
      setEditableMemoryReason(reason)
    }
  }, [hasCompleteMemoryRequest, memoryRequest])

  // 验证记忆内容是否有效
  const isMemoryContentValid = editableMemoryContent.trim().length > 0
  const hasSpecialChars = /[<>{}[\]\\|`~!@#$%^&*()+=]/.test(editableMemoryContent)
  const isContentTooLong = editableMemoryContent.length > 500
  const isReasonTooLong = editableMemoryReason.length > 200

  // 渲染记忆更新请求组件
  const renderMemoryUpdateRequest = () => {
    if (!hasMemoryRequest) return null

    return (
      <div className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 my-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMemoryRequest(!showMemoryRequest)}
          className={cn(
            "w-full justify-between p-4 h-auto bg-transparent hover:bg-blue-100/50 dark:hover:bg-blue-900/20 border-0 rounded-none",
            isMobile ? "text-xs" : "text-sm"
          )}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Brain className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-4 w-4" : "h-5 w-5")} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {isStreaming && !hasCompleteMemoryRequest ? "🧠 AI正在整理记忆..." : "🧠 AI记忆更新请求"}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {isStreaming && !hasCompleteMemoryRequest ? "正在生成个性化记忆内容" : "点击查看并确认记忆更新"}
              </div>
            </div>
          </div>
          {showMemoryRequest ? (
            <ChevronUp className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-4 w-4" : "h-5 w-5")} />
          ) : (
            <ChevronDown className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-4 w-4" : "h-5 w-5")} />
          )}
        </Button>

        {showMemoryRequest && (
          <div className="p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 border-t border-blue-200/50 dark:border-blue-800/50">
            {!hasCompleteMemoryRequest ? (
              // 流式渲染中的状态
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 py-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium ml-3">AI正在整理记忆内容...</span>
                </div>
                {memoryRequest && (
                  <div className="bg-white/70 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">记忆内容</span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/30 p-3 rounded-lg">
                          {memoryRequest.newContent}
                        </div>
                      </div>
                      {memoryRequest.reason && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">更新原因</span>
                          </div>
                          <div className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/30 p-3 rounded-lg">
                            {memoryRequest.reason}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 完成状态，精炼的确认界面
              <div className="space-y-3">
                {!isEditing ? (
                  // 只读模式 - 精简卡片设计
                  <div className="space-y-2">
                    <div className="bg-white/70 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <div className="flex items-start justify-between">
                        {/* 动态计算宽度比例 */}
                        {(() => {
                          const contentLength = editableMemoryContent.length
                          const reasonLength = editableMemoryReason?.length || 0
                          const totalLength = contentLength + reasonLength

                          // 如果没有更新原因，记忆内容占满整行
                          if (!editableMemoryReason) {
                            return (
                              <>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-blue-800 dark:text-blue-200">记忆内容</span>
                                  </div>
                                  <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                    {editableMemoryContent}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsEditing(true)}
                                  className="ml-2 p-1 h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </>
                            )
                          }

                          // 有更新原因时，计算宽度比例
                          let contentWidth, reasonWidth
                          if (totalLength === 0) {
                            contentWidth = "w-7/12"
                            reasonWidth = "w-3/12"
                          } else {
                            const ratio = Math.abs(contentLength - reasonLength) / totalLength
                            if (ratio < 0.3) {
                              // 字数相近，使用 5:5
                              contentWidth = "w-5/12"
                              reasonWidth = "w-5/12"
                            } else {
                              // 字数差异较大，使用 7:3
                              contentWidth = "w-7/12"
                              reasonWidth = "w-3/12"
                            }
                          }

                          return (
                            <>
                              <div className={`${contentWidth} pr-3`}>
                                <div className="flex items-center space-x-2 mb-1.5">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-blue-800 dark:text-blue-200">记忆内容</span>
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                  {editableMemoryContent}
                                </div>
                              </div>
                              <div className={`${reasonWidth} pl-3 border-l border-blue-200/50 dark:border-blue-700/50`}>
                                <div className="flex items-center space-x-2 mb-1.5">
                                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-indigo-800 dark:text-indigo-200">更新原因</span>
                                </div>
                                <div className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                  {editableMemoryReason}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditing(true)}
                                className="ml-2 p-1 h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (onMemoryUpdateRequest && editableMemoryContent.trim()) {
                            onMemoryUpdateRequest({
                              newContent: editableMemoryContent.trim(),
                              reason: editableMemoryReason.trim()
                            })
                            setShowMemoryRequest(false)
                          }
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1"
                      >
                        ✓ 确认
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMemoryRequest(false)}
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs py-1"
                      >
                        ✕ 取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 编辑模式
                  <div className="space-y-3">
                    <div className="bg-white/70 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-200">记忆内容</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">({editableMemoryContent.length}/500)</span>
                      </div>
                      <textarea
                        value={editableMemoryContent}
                        onChange={(e) => setEditableMemoryContent(e.target.value)}
                        className="w-full p-2 text-sm border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        maxLength={500}
                        placeholder="请输入要记住的重要信息..."
                      />
                    </div>

                    <div className="bg-white/70 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs font-medium text-indigo-800 dark:text-indigo-200">更新原因</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400">({editableMemoryReason.length}/200)</span>
                      </div>
                      <textarea
                        value={editableMemoryReason}
                        onChange={(e) => setEditableMemoryReason(e.target.value)}
                        className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-700 rounded bg-white dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 resize-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                        rows={2}
                        maxLength={200}
                        placeholder="说明为什么需要记住这些信息..."
                      />
                    </div>

                    {/* 验证提示 */}
                    {(hasSpecialChars || isContentTooLong || isReasonTooLong) && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                        <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                          {hasSpecialChars && <div>• 不能包含特殊符号</div>}
                          {isContentTooLong && <div>• 记忆内容超出500字</div>}
                          {isReasonTooLong && <div>• 更新原因超出200字</div>}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isMemoryContentValid && !hasSpecialChars && !isContentTooLong && !isReasonTooLong) {
                            setIsEditing(false)
                          }
                        }}
                        disabled={!isMemoryContentValid || hasSpecialChars || isContentTooLong || isReasonTooLong}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1 disabled:opacity-50"
                      >
                        ✓ 保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs py-1"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 思考过程部分 */}
      {hasReasoning && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReasoning(!showReasoning)}
            className={cn(
              "w-full justify-between p-3 h-auto bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-0 rounded-none",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            <div className="flex items-center space-x-2">
              <Brain className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                AI思考过程
                {isStreaming && !hasCompleteReasoning && (
                  <span className="ml-2 text-xs text-blue-500 animate-pulse">正在思考...</span>
                )}
              </span>
            </div>
            {showReasoning ? (
              <ChevronUp className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <ChevronDown className={cn("text-blue-600 dark:text-blue-400", isMobile ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </Button>

          {showReasoning && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
              <div className={cn(
                "text-blue-800 dark:text-blue-200",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <MarkdownRenderer
                  content={reasoning}
                  className="prose-blue text-inherit [&_p]:text-blue-800 dark:[&_p]:text-blue-200 [&_strong]:text-blue-900 dark:[&_strong]:text-blue-100"
                />
                {isStreaming && !hasCompleteReasoning && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主要内容部分 - 如果有记忆更新请求，则分段显示 */}
      {hasMemoryRequest ? (
        <div className={cn("", isMobile ? "text-sm" : "")}>
          {/* 记忆更新请求前的内容 */}
          {contentBeforeMemory && (
            <div className="mb-3">
              <MarkdownRenderer content={contentBeforeMemory} className="text-inherit" />
            </div>
          )}

          {/* 记忆更新请求 */}
          {renderMemoryUpdateRequest()}

          {/* 记忆更新请求后的内容 */}
          {contentAfterMemory && (
            <div className="mt-3">
              <MarkdownRenderer content={contentAfterMemory} className="text-inherit" />
            </div>
          )}
        </div>
      ) : (
        /* 没有记忆更新请求时，显示完整内容 */
        <div className={cn("", isMobile ? "text-sm" : "")}>
          <MarkdownRenderer content={mainContent} className="text-inherit" />
        </div>
      )}
    </div>
  )
}
