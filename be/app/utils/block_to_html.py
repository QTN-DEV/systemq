"""Utility to convert DocumentBlock[] to HTML string."""

from __future__ import annotations

import html
from typing import Any

from app.models.document import DocumentBlock, TableData


def escape_html(text: str | None) -> str:
    """Escape HTML special characters."""
    if text is None:
        return ""
    return html.escape(str(text))


def block_to_html(block: DocumentBlock) -> str:
    """Convert a single DocumentBlock to HTML string."""
    content = block.content or ""
    alignment = block.alignment or "left"

    match block.type:
        case "paragraph":
            return f'<p style="text-align: {alignment}">{escape_html(content)}</p>'

        case "heading1":
            return f'<h1 style="text-align: {alignment}">{escape_html(content)}</h1>'

        case "heading2":
            return f'<h2 style="text-align: {alignment}">{escape_html(content)}</h2>'

        case "heading3":
            return f'<h3 style="text-align: {alignment}">{escape_html(content)}</h3>'

        case "bulleted-list":
            # Parse list items (assuming newline-separated or single item)
            bullet_items = [item.strip() for item in content.split("\n") if item.strip()]
            if not bullet_items:
                return "<ul><li></li></ul>"
            items_html = "".join(f"<li>{escape_html(item)}</li>" for item in bullet_items)
            return f"<ul>{items_html}</ul>"

        case "numbered-list":
            numbered_items = [item.strip() for item in content.split("\n") if item.strip()]
            if not numbered_items:
                return "<ol><li></li></ol>"
            items_html = "".join(f"<li>{escape_html(item)}</li>" for item in numbered_items)
            return f"<ol>{items_html}</ol>"

        case "quote":
            return f"<blockquote>{escape_html(content)}</blockquote>"

        case "code":
            return f"<pre><code>{escape_html(content)}</code></pre>"

        case "image":
            if block.url:
                alt_text = escape_html(content or "Image")
                url = escape_html(block.url)
                return f'<img src="{url}" alt="{alt_text}" />'
            return f"<p>{escape_html(content or 'Image')}</p>"

        case "file":
            if block.url:
                file_name = block.fileName or content or "File"
                url = escape_html(block.url)
                file_name_escaped = escape_html(file_name)
                return (
                    f'<p><a href="{url}" target="_blank" rel="noopener noreferrer">'
                    f"{file_name_escaped}</a></p>"
                )
            file_name = block.fileName or content or "File"
            return f"<p>{escape_html(file_name)}</p>"

        case "table":
            if block.table:
                table_data: TableData | dict[str, Any] = block.table
                # Handle both TableData object and dict
                if isinstance(table_data, dict):
                    rows = table_data.get("rows", [])
                else:
                    rows = table_data.rows if hasattr(table_data, "rows") else []

                html_parts = ["<table><tbody>"]
                for row in rows:
                    html_parts.append("<tr>")
                    # Handle both dict and object
                    if isinstance(row, dict):
                        cells = row.get("cells", [])
                    else:
                        cells = row.cells if hasattr(row, "cells") else []

                    for cell in cells:
                        # Handle both dict and object
                        if isinstance(cell, dict):
                            cell_content = cell.get("content", "")
                        else:
                            cell_content = cell.content if hasattr(cell, "content") else ""
                        html_parts.append(f"<td>{escape_html(cell_content)}</td>")
                    html_parts.append("</tr>")
                html_parts.append("</tbody></table>")
                return "".join(html_parts)
            return "<table><tbody><tr><td></td></tr></tbody></table>"

        case _:
            return f"<p>{escape_html(content)}</p>"


def migrate_blocks_to_html(blocks: list[DocumentBlock] | None) -> str:
    """Convert an array of DocumentBlocks to a single HTML string."""
    if not blocks or len(blocks) == 0:
        return "<p></p>"

    return "\n".join(block_to_html(block) for block in blocks)

