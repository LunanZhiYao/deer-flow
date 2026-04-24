"""Prompt templates for memory update and injection."""

import math
import re
from typing import Any

try:
    import tiktoken

    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

# Prompt template for updating memory based on conversation
MEMORY_UPDATE_PROMPT = """你是一个记忆管理系统。你的任务是分析对话并更新用户记忆画像。

当前记忆状态:
<current_memory>
{current_memory}
</current_memory>

待处理的新对话:
<conversation>
{conversation}
</conversation>

说明:
1. 分析对话中的用户关键信息
2. 提取相关事实、偏好与上下文，并保留具体细节（数字、名称、技术）
3. 按照下方长度与结构要求更新记忆字段
4. 所有 `summary` 与 `newFacts[].content` 默认使用简体中文输出
5. 专有名词、产品名、公司名、技术术语、版本号保持原文（可中英混排）

记忆字段编写规范:

**用户上下文**（当前状态，简洁总结）:
- workContext: 职业角色、公司、关键项目、主要技术（2-3句）
- personalContext: 语言、沟通偏好、关键兴趣（1-2句）
- topOfMind: 正在进行的多个重点与优先事项（3-5句，较详细）

**历史信息**（时间维度，信息完整）:
- recentMonths: 最近活动详细总结（4-6句或1-2段）
- earlierContext: 更早历史模式（3-5句或1段）
- longTermBackground: 稳定背景信息（2-4句）

**事实提取**:
- 提取可量化、可复用的细节（如“16k+ GitHub stars”“200+ datasets”）
- 包含专有名词（公司、项目、技术名称）
- 保留技术术语与版本号
- Categories:
  * preference: 用户偏好（工具、风格、方法）
  * knowledge: 用户知识与专长
  * context: 背景事实（职位、项目、地点、语言）
  * behavior: 行为与工作方式
  * goal: 目标与意图

**字段语义边界**:
- workContext: 当前工作、活跃项目、主技术栈
- personalContext: 语言、个性与非直接工作兴趣
- topOfMind: 近期最关注的3-5个并行主题
- recentMonths: 近几个月技术探索与工作轨迹
- earlierContext: 更早但仍相关的历史模式
- longTermBackground: 相对稳定、长期不变的背景

**多语言处理**:
- 专有名词与公司名保留原文
- 技术术语保留原文（如 DeepSeek、LangGraph）
- 其余描述尽量使用简体中文

输出格式（JSON）:
{{
  "user": {{
    "workContext": {{ "summary": "...", "shouldUpdate": true/false }},
    "personalContext": {{ "summary": "...", "shouldUpdate": true/false }},
    "topOfMind": {{ "summary": "...", "shouldUpdate": true/false }}
  }},
  "history": {{
    "recentMonths": {{ "summary": "...", "shouldUpdate": true/false }},
    "earlierContext": {{ "summary": "...", "shouldUpdate": true/false }},
    "longTermBackground": {{ "summary": "...", "shouldUpdate": true/false }}
  }},
  "newFacts": [
    {{ "content": "...", "category": "preference|knowledge|context|behavior|goal", "confidence": 0.0-1.0 }}
  ],
  "factsToRemove": ["fact_id_1", "fact_id_2"]
}}

重要规则:
- 仅在有实质新信息时将 shouldUpdate 设为 true
- 遵循长度规范：workContext/personalContext 简洁，topOfMind/history 更详细
- 事实中保留具体指标、版本号、专有名词
- 仅添加明确陈述（0.9+）或强相关推断（0.7+）事实
- 删除被新信息否定的事实
- 更新 topOfMind 时保留 3-5 个仍活跃的重点主题
- 历史字段按时间顺序融合新信息
- 保持技术准确性（技术、公司、项目名不改写）
- 仅记录对未来交互有价值的长期信息
- 重要：不要把文件上传事件写入记忆；上传文件是会话级临时信息

仅返回合法 JSON，不要输出解释或 markdown。"""


# Prompt template for extracting facts from a single message
FACT_EXTRACTION_PROMPT = """从以下消息中提取关于用户的事实信息。

消息:
{message}

按以下 JSON 格式输出:
{{
  "facts": [
    {{ "content": "...", "category": "preference|knowledge|context|behavior|goal", "confidence": 0.0-1.0 }}
  ]
}}

Categories:
- preference: 用户偏好（喜好/厌恶、风格、工具）
- knowledge: 用户专业能力或知识领域
- context: 背景信息（地点、工作、项目）
- behavior: 行为模式
- goal: 目标或意图

规则:
- 只提取清晰、具体、可复用的事实
- confidence 反映确定性（明确陈述 = 0.9+，合理推断 = 0.6-0.8）
- 跳过模糊或短期临时信息
- `facts[].content` 默认使用简体中文；专有名词和技术术语保留原文

仅返回合法 JSON。"""


def _count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    """Count tokens in text using tiktoken.

    Args:
        text: The text to count tokens for.
        encoding_name: The encoding to use (default: cl100k_base for GPT-4/3.5).

    Returns:
        The number of tokens in the text.
    """
    if not TIKTOKEN_AVAILABLE:
        # Fallback to character-based estimation if tiktoken is not available
        return len(text) // 4

    try:
        encoding = tiktoken.get_encoding(encoding_name)
        return len(encoding.encode(text))
    except Exception:
        # Fallback to character-based estimation on error
        return len(text) // 4


def _coerce_confidence(value: Any, default: float = 0.0) -> float:
    """Coerce a confidence-like value to a bounded float in [0, 1].

    Non-finite values (NaN, inf, -inf) are treated as invalid and fall back
    to the default before clamping, preventing them from dominating ranking.
    The ``default`` parameter is assumed to be a finite value.
    """
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return max(0.0, min(1.0, default))
    if not math.isfinite(confidence):
        return max(0.0, min(1.0, default))
    return max(0.0, min(1.0, confidence))


def format_memory_for_injection(memory_data: dict[str, Any], max_tokens: int = 2000) -> str:
    """Format memory data for injection into system prompt.

    Args:
        memory_data: The memory data dictionary.
        max_tokens: Maximum tokens to use (counted via tiktoken for accuracy).

    Returns:
        Formatted memory string for system prompt injection.
    """
    if not memory_data:
        return ""

    sections = []

    # Format user context
    user_data = memory_data.get("user", {})
    if user_data:
        user_sections = []

        work_ctx = user_data.get("workContext", {})
        if work_ctx.get("summary"):
            user_sections.append(f"Work: {work_ctx['summary']}")

        personal_ctx = user_data.get("personalContext", {})
        if personal_ctx.get("summary"):
            user_sections.append(f"Personal: {personal_ctx['summary']}")

        top_of_mind = user_data.get("topOfMind", {})
        if top_of_mind.get("summary"):
            user_sections.append(f"Current Focus: {top_of_mind['summary']}")

        if user_sections:
            sections.append("User Context:\n" + "\n".join(f"- {s}" for s in user_sections))

    # Format history
    history_data = memory_data.get("history", {})
    if history_data:
        history_sections = []

        recent = history_data.get("recentMonths", {})
        if recent.get("summary"):
            history_sections.append(f"Recent: {recent['summary']}")

        earlier = history_data.get("earlierContext", {})
        if earlier.get("summary"):
            history_sections.append(f"Earlier: {earlier['summary']}")

        if history_sections:
            sections.append("History:\n" + "\n".join(f"- {s}" for s in history_sections))

    # Format facts (sorted by confidence; include as many as token budget allows)
    facts_data = memory_data.get("facts", [])
    if isinstance(facts_data, list) and facts_data:
        ranked_facts = sorted(
            (f for f in facts_data if isinstance(f, dict) and isinstance(f.get("content"), str) and f.get("content").strip()),
            key=lambda fact: _coerce_confidence(fact.get("confidence"), default=0.0),
            reverse=True,
        )

        # Compute token count for existing sections once, then account
        # incrementally for each fact line to avoid full-string re-tokenization.
        base_text = "\n\n".join(sections)
        base_tokens = _count_tokens(base_text) if base_text else 0
        # Account for the separator between existing sections and the facts section.
        facts_header = "Facts:\n"
        separator_tokens = _count_tokens("\n\n" + facts_header) if base_text else _count_tokens(facts_header)
        running_tokens = base_tokens + separator_tokens

        fact_lines: list[str] = []
        for fact in ranked_facts:
            content_value = fact.get("content")
            if not isinstance(content_value, str):
                continue
            content = content_value.strip()
            if not content:
                continue
            category = str(fact.get("category", "context")).strip() or "context"
            confidence = _coerce_confidence(fact.get("confidence"), default=0.0)
            line = f"- [{category} | {confidence:.2f}] {content}"

            # Each additional line is preceded by a newline (except the first).
            line_text = ("\n" + line) if fact_lines else line
            line_tokens = _count_tokens(line_text)

            if running_tokens + line_tokens <= max_tokens:
                fact_lines.append(line)
                running_tokens += line_tokens
            else:
                break

        if fact_lines:
            sections.append("Facts:\n" + "\n".join(fact_lines))

    if not sections:
        return ""

    result = "\n\n".join(sections)

    # Use accurate token counting with tiktoken
    token_count = _count_tokens(result)
    if token_count > max_tokens:
        # Truncate to fit within token limit
        # Estimate characters to remove based on token ratio
        char_per_token = len(result) / token_count
        target_chars = int(max_tokens * char_per_token * 0.95)  # 95% to leave margin
        result = result[:target_chars] + "\n..."

    return result


def format_conversation_for_update(messages: list[Any]) -> str:
    """Format conversation messages for memory update prompt.

    Args:
        messages: List of conversation messages.

    Returns:
        Formatted conversation string.
    """
    lines = []
    for msg in messages:
        role = getattr(msg, "type", "unknown")
        content = getattr(msg, "content", str(msg))

        # Handle content that might be a list (multimodal)
        if isinstance(content, list):
            text_parts = []
            for p in content:
                if isinstance(p, str):
                    text_parts.append(p)
                elif isinstance(p, dict):
                    text_val = p.get("text")
                    if isinstance(text_val, str):
                        text_parts.append(text_val)
            content = " ".join(text_parts) if text_parts else str(content)

        # Strip uploaded_files tags from human messages to avoid persisting
        # ephemeral file path info into long-term memory.  Skip the turn entirely
        # when nothing remains after stripping (upload-only message).
        if role == "human":
            content = re.sub(r"<uploaded_files>[\s\S]*?</uploaded_files>\n*", "", str(content)).strip()
            if not content:
                continue

        # Truncate very long messages
        if len(str(content)) > 1000:
            content = str(content)[:1000] + "..."

        if role == "human":
            lines.append(f"User: {content}")
        elif role == "ai":
            lines.append(f"Assistant: {content}")

    return "\n\n".join(lines)
