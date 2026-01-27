import re

from rest_framework import serializers

from plane.api.serializers.base import BaseSerializer
from plane.db.models import Page, FileAsset
from plane.settings.storage import S3Storage


class PageSerializer(BaseSerializer):
    """Page list serializer — metadata only."""

    class Meta:
        model = Page
        fields = [
            "id",
            "name",
            "owned_by",
            "access",
            "is_locked",
            "archived_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PageDetailSerializer(PageSerializer):
    """Page detail serializer — includes description_html with presigned image URLs."""

    description_html = serializers.SerializerMethodField()

    class Meta(PageSerializer.Meta):
        fields = PageSerializer.Meta.fields + ["description_html"]

    # Regex matching <image-component ... src="<uuid>" ...>
    _IMAGE_RE = re.compile(
        r'(<image-component\b[^>]*?\bsrc=")([0-9a-fA-F-]{36})(")',
        re.IGNORECASE,
    )

    def _resolve_image_urls(self, html: str) -> str:
        """Replace asset UUIDs inside image-component src with presigned S3 URLs."""

        # Collect all asset UUIDs referenced in the HTML
        matches = self._IMAGE_RE.findall(html)
        if not matches:
            return html

        uuid_set = {m[1] for m in matches}

        # Query FileAsset to get the S3 object key for each UUID
        assets = FileAsset.objects.filter(
            id__in=uuid_set,
            is_deleted=False,
            is_uploaded=True,
        ).values_list("id", "asset")
        asset_keys = {str(uid): key for uid, key in assets}

        if not asset_keys:
            return html

        # Generate presigned URLs via S3Storage
        request = self.context.get("request")
        storage = S3Storage(request=request)

        signed_urls = {}
        for asset_id, object_key in asset_keys.items():
            url = storage.generate_presigned_url(
                object_name=object_key,
                disposition="inline",
            )
            if url:
                signed_urls[asset_id] = url

        def _replace(match):
            prefix, asset_id, suffix = match.group(1), match.group(2), match.group(3)
            url = signed_urls.get(asset_id)
            if url:
                return f"{prefix}{url}{suffix}"
            return match.group(0)

        return self._IMAGE_RE.sub(_replace, html)

    def get_description_html(self, obj):
        html = obj.description_html or ""
        if html:
            html = self._resolve_image_urls(html)
        return html


class PageBlockOperationSerializer(serializers.Serializer):
    """Serializer for page block operations (insert, update, delete)."""

    OPERATION_INSERT = "insert_block"
    OPERATION_UPDATE = "update_block"
    OPERATION_DELETE = "delete_block"
    OPERATION_GET = "get_block"
    OPERATION_LIST = "list_blocks"

    OPERATION_CHOICES = [
        (OPERATION_INSERT, "Insert Block"),
        (OPERATION_UPDATE, "Update Block"),
        (OPERATION_DELETE, "Delete Block"),
        (OPERATION_GET, "Get Block"),
        (OPERATION_LIST, "List Blocks"),
    ]

    operation = serializers.ChoiceField(choices=OPERATION_CHOICES, required=True)
    block_id = serializers.CharField(required=False, allow_blank=True)
    after_block_id = serializers.CharField(required=False, allow_blank=True)
    before_block_id = serializers.CharField(required=False, allow_blank=True)
    block_html = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        operation = data.get("operation")

        if operation == self.OPERATION_INSERT:
            if not data.get("block_html"):
                raise serializers.ValidationError({"block_html": "Required for insert operation"})

        elif operation == self.OPERATION_UPDATE:
            if not data.get("block_id"):
                raise serializers.ValidationError({"block_id": "Required for update operation"})
            if not data.get("block_html"):
                raise serializers.ValidationError({"block_html": "Required for update operation"})

        elif operation == self.OPERATION_DELETE:
            if not data.get("block_id"):
                raise serializers.ValidationError({"block_id": "Required for delete operation"})

        elif operation == self.OPERATION_GET:
            if not data.get("block_id"):
                raise serializers.ValidationError({"block_id": "Required for get operation"})

        return data
