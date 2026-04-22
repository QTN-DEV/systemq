"""Dashboard AI chat route — streams Claude responses for layout editing."""

import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile
from app.services.ai import AnthropicPromptRunner, AnthropicPromptRunnerOptions

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DASHBOARD_SYSTEM_PROMPT = """You are a Dashboard Layout AI. Your sole job is to help the user build and modify their personal React dashboard by generating or editing React component source code.

## Available UI Primitives
You have access to these components globally. Do NOT import them.
- **Cards**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`
- **Shadcn Charts**: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`
- **Recharts Primitives**: `BarChart`, `Bar`, `LineChart`, `Line`, `PieChart`, `Pie`, `AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `ResponsiveContainer`, `Cell`
- **Utilities**: `cn` (tailwind merge), and standard React Hooks (`useState`, `useEffect`, `useMemo`).

## Chart Implementation Guide
1. **Data**: Define an array of objects for your data.
2. **Config**: Create a `chartConfig` object to define labels and colors (use `hsl(var(--chart-1))` etc).
3. **Container**: Wrap charts in `<ChartContainer config={chartConfig}>`.
4. **Colors**: Use the syntax `fill="var(--color-key)"` or `stroke="var(--color-key)"` where "key" matches a key in your `chartConfig`.

## Rules
1. The dashboard uses `react-live` with `noInline`. The entry point must call `render(<App />)` at the end.
2. Do NOT include import statements.
3. Respond conversationally with a brief explanation in a single dense line of text (NO newlines).
4. If requesting multiple changes, use sequential tool calls.
5. Always produce a FULL replacement of the source. The JSX code in the tool call must have NO newline characters.
6. Style using Tailwind class strings.

## Example skeleton
```jsx
const chartData = [{ date: "2024-04-01", desktop: 222 }, { date: "2024-04-02", desktop: 150 }];
const chartConfig = { desktop: { label: "Desktop", color: "hsl(var(--chart-1))" } };
function App() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
render(<App />);

Always call `update_dashboard` when you produce new code. Never return raw code without calling the tool.
"""


@router.post("/chat/stream")
async def dashboard_chat_stream(
    request: Request,
    current_user: UserProfile = Depends(get_current_user),
):
    body = await request.json()
    messages = body.get("messages", [])
    current_content = body.get("current_content", "")

    # Build a conversation-style prompt from history
    prompt = ""
    if current_content:
        prompt += f"[Current dashboard source]\n```jsx\n{current_content}\n```\n\n"

    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]
            content = "".join(text_parts)
        prompt += f"{role.capitalize()}: {content}\n"
    prompt += "Assistant: "

    options = AnthropicPromptRunnerOptions(
        prompt_template="{prompt}",
        data={"prompt": prompt},
        working_directory=".",
        system_prompt=DASHBOARD_SYSTEM_PROMPT,
        max_turns=5,
        tools=["update_dashboard"],
    )

    runner = AnthropicPromptRunner(options)

    async def generate():
        async for chunk in runner.run():
            yield f"data: {chunk['data']}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
