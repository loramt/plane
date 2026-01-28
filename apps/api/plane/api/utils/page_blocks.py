# Third party imports
from bs4 import BeautifulSoup
import uuid


def insert_block(html: str, block_html: str, after_block_id: str = None, before_block_id: str = None) -> str:
    """
    Insert a new block in the HTML.

    Args:
        html: Current page HTML
        block_html: HTML of the new block to insert
        after_block_id: Insert after this block's data-id (optional)
        before_block_id: Insert before this block's data-id (optional)

    Returns:
        Updated HTML
    """
    soup = BeautifulSoup(html, "html.parser")
    new_block = BeautifulSoup(block_html, "html.parser")

    # Ensure new block has a data-id
    if new_block and not new_block.find(attrs={"data-id": True}):
        # Add data-id to the first element
        first_elem = new_block.find()
        if first_elem:
            first_elem["data-id"] = str(uuid.uuid4())

    if after_block_id:
        # Find the block to insert after
        target = soup.find(attrs={"data-id": after_block_id})
        if target:
            target.insert_after(new_block)
        else:
            raise ValueError(f"Block with data-id '{after_block_id}' not found")
    elif before_block_id:
        # Find the block to insert before
        target = soup.find(attrs={"data-id": before_block_id})
        if target:
            target.insert_before(new_block)
        else:
            raise ValueError(f"Block with data-id '{before_block_id}' not found")
    else:
        # Append at the end
        soup.append(new_block)

    return str(soup)


def update_block(html: str, block_id: str, new_block_html: str) -> str:
    """
    Update an existing block by replacing its content.

    Args:
        html: Current page HTML
        block_id: data-id of the block to update
        new_block_html: New HTML content for the block

    Returns:
        Updated HTML
    """
    soup = BeautifulSoup(html, "html.parser")
    new_block = BeautifulSoup(new_block_html, "html.parser")

    # Find the block to update
    target = soup.find(attrs={"data-id": block_id})
    if not target:
        raise ValueError(f"Block with data-id '{block_id}' not found")

    # Preserve the data-id in the new block
    first_elem = new_block.find()
    if first_elem:
        first_elem["data-id"] = block_id

    # Replace the block
    target.replace_with(new_block)

    return str(soup)


def delete_block(html: str, block_id: str) -> str:
    """
    Delete a block from the HTML.

    Args:
        html: Current page HTML
        block_id: data-id of the block to delete

    Returns:
        Updated HTML
    """
    soup = BeautifulSoup(html, "html.parser")

    # Find the block to delete
    target = soup.find(attrs={"data-id": block_id})
    if not target:
        raise ValueError(f"Block with data-id '{block_id}' not found")

    # Remove the block
    target.decompose()

    return str(soup)


def get_block(html: str, block_id: str) -> str:
    """
    Get a specific block from the HTML.

    Args:
        html: Current page HTML
        block_id: data-id of the block to retrieve

    Returns:
        HTML of the block
    """
    soup = BeautifulSoup(html, "html.parser")

    # Find the block
    target = soup.find(attrs={"data-id": block_id})
    if not target:
        raise ValueError(f"Block with data-id '{block_id}' not found")

    return str(target)


def list_blocks(html: str) -> tuple:
    """
    List all top-level block elements, auto-assigning data-id to any
    element that lacks one (e.g. after the web editor strips them).

    Args:
        html: Current page HTML

    Returns:
        Tuple of (blocks list, updated HTML str, bool changed).
        The caller should persist the HTML when changed is True.
    """
    soup = BeautifulSoup(html, "html.parser")

    BLOCK_TAGS = {
        "p", "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "blockquote", "div", "table",
        "image-component", "callout-component",
    }

    changed = False
    blocks = []
    for elem in soup.children:
        if elem.name and elem.name in BLOCK_TAGS:
            if not elem.get("data-id"):
                elem["data-id"] = str(uuid.uuid4())
                changed = True
            blocks.append({
                "id": elem.get("data-id"),
                "tag": elem.name,
                "class": elem.get("class", []),
                "text_preview": elem.get_text()[:100].strip(),
            })

    return blocks, str(soup), changed
