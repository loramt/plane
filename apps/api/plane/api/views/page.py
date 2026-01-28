# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.db.models import Page, Project, ProjectPage
from plane.app.permissions import ProjectEntityPermission
from plane.api.serializers import PageSerializer, PageDetailSerializer, PageCreateSerializer, PageBlockOperationSerializer
from plane.api.utils.page_blocks import (
    insert_block,
    update_block,
    delete_block,
    get_block,
    list_blocks,
)
from .base import BaseAPIView


class PageListAPIEndpoint(BaseAPIView):
    """Paginated list of pages in a project."""

    serializer_class = PageSerializer
    model = Page
    permission_classes = [ProjectEntityPermission]
    use_read_replica = False

    def get_queryset(self):
        return (
            Page.objects.filter(
                projects__id=self.kwargs.get("project_id"),
                projects__workspace__slug=self.kwargs.get("slug"),
            )
            .filter(
                project_pages__project_id=self.kwargs.get("project_id"),
                project_pages__deleted_at__isnull=True,
            )
            .select_related("owned_by")
            .order_by("-created_at")
            .distinct()
        )

    def get(self, request, slug, project_id):
        return self.paginate(
            request=request,
            queryset=self.get_queryset(),
            on_results=lambda pages: PageSerializer(pages, many=True).data,
        )

    def post(self, request, slug, project_id):
        serializer = PageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        project = Project.objects.get(pk=project_id, workspace__slug=slug)

        page = Page.objects.create(
            name=data["name"],
            access=data.get("access", 0),
            description_html=data.get("description_html", "<p></p>"),
            owned_by=request.user,
            workspace_id=project.workspace_id,
        )

        ProjectPage.objects.create(
            project=project,
            page=page,
            workspace_id=project.workspace_id,
        )

        return Response(
            PageSerializer(page).data,
            status=status.HTTP_201_CREATED,
        )


class PageDetailAPIEndpoint(BaseAPIView):
    """Single page detail with description_html and presigned image URLs."""

    serializer_class = PageDetailSerializer
    model = Page
    permission_classes = [ProjectEntityPermission]
    use_read_replica = False  # Write operations need primary DB

    def get(self, request, slug, project_id, page_id):
        page = Page.objects.select_related("owned_by").get(
            pk=page_id,
            projects__id=project_id,
            projects__workspace__slug=slug,
            project_pages__deleted_at__isnull=True,
        )

        serializer = PageDetailSerializer(
            page,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, project_id, page_id):
        """
        Perform block operations on page content.

        Supported operations:
        - insert_block: Insert a new block (after/before another block or at end)
        - update_block: Update an existing block's content
        - delete_block: Delete a block
        - get_block: Get a specific block's HTML
        - list_blocks: List all blocks in the page
        """
        # Validate operation
        serializer = PageBlockOperationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        operation = data.get("operation")

        # Get the page
        page = Page.objects.get(
            pk=page_id,
            projects__id=project_id,
            projects__workspace__slug=slug,
            project_pages__deleted_at__isnull=True,
        )

        # Check if page is locked
        if page.is_locked:
            return Response(
                {"error": "Page is locked and cannot be modified"},
                status=status.HTTP_403_FORBIDDEN,
            )

        current_html = page.description_html or "<p></p>"

        try:
            # Execute operation
            if operation == PageBlockOperationSerializer.OPERATION_INSERT:
                new_html = insert_block(
                    html=current_html,
                    block_html=data.get("block_html"),
                    after_block_id=data.get("after_block_id"),
                    before_block_id=data.get("before_block_id"),
                )
                page.description_html = new_html
                page.save()
                return Response({"success": True, "message": "Block inserted"}, status=status.HTTP_200_OK)

            elif operation == PageBlockOperationSerializer.OPERATION_UPDATE:
                new_html = update_block(
                    html=current_html,
                    block_id=data.get("block_id"),
                    new_block_html=data.get("block_html"),
                )
                page.description_html = new_html
                page.save()
                return Response({"success": True, "message": "Block updated"}, status=status.HTTP_200_OK)

            elif operation == PageBlockOperationSerializer.OPERATION_DELETE:
                new_html = delete_block(
                    html=current_html,
                    block_id=data.get("block_id"),
                )
                page.description_html = new_html
                page.save()
                return Response({"success": True, "message": "Block deleted"}, status=status.HTTP_200_OK)

            elif operation == PageBlockOperationSerializer.OPERATION_GET:
                block_html = get_block(
                    html=current_html,
                    block_id=data.get("block_id"),
                )
                return Response({"block_html": block_html}, status=status.HTTP_200_OK)

            elif operation == PageBlockOperationSerializer.OPERATION_LIST:
                blocks, updated_html, changed = list_blocks(html=current_html)
                if changed:
                    page.description_html = updated_html
                    page.save()
                return Response({"blocks": blocks}, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
